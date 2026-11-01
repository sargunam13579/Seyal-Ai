"""
SSRF Defense Engine with Numeric IP Socket Pinning and Cloud Metadata Rejection.

Defeats DNS rebinding and internal network reconnaissance attacks by:
1. Resolving DNS records before socket creation.
2. Checking all resolved IPs against strict private, loopback, link-local, and cloud metadata blocklists.
3. Pinning TCP sockets directly to verified numeric IP addresses while passing original Host/SNI.
"""

from __future__ import annotations

import ipaddress
import socket
import ssl
from typing import Any
from urllib.parse import urlparse

from seyal_ai.agents.browser.models import SSRFBlockedException
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.browser.ssrf")

# Cloud metadata endpoints and forbidden specific IPs
CLOUD_METADATA_IPS = {
    ipaddress.ip_address("169.254.169.254"),  # AWS, Azure, GCP, OpenStack
    ipaddress.ip_address("169.254.170.2"),    # AWS Task Metadata
    ipaddress.ip_address("fd00:ec2::254"),    # AWS IPv6 metadata
}

# Forbidden network blocks
FORBIDDEN_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),       # CGNAT
    ipaddress.ip_network("127.0.0.0/8"),         # Loopback
    ipaddress.ip_network("169.254.0.0/16"),       # Link-Local / Cloud Metadata
    ipaddress.ip_network("172.16.0.0/12"),       # RFC 1918 Private
    ipaddress.ip_network("192.0.0.0/24"),         # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),         # TEST-NET-1
    ipaddress.ip_network("192.168.0.0/16"),      # RFC 1918 Private
    ipaddress.ip_network("198.18.0.0/15"),       # Benchmark Testing
    ipaddress.ip_network("198.51.100.0/24"),     # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),      # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),         # Multicast
    ipaddress.ip_network("240.0.0.0/4"),         # Reserved / Future use
    ipaddress.ip_network("255.255.255.255/32"),  # Broadcast
    # IPv6 Networks
    ipaddress.ip_network("::/128"),              # Unspecified
    ipaddress.ip_network("::1/128"),             # Loopback
    ipaddress.ip_network("fc00::/7"),            # Unique Local (ULA)
    ipaddress.ip_network("fe80::/10"),           # Link-Local
    ipaddress.ip_network("ff00::/8"),            # Multicast
]


class SSRFGuard:
    """
    Validates URLs and produces pinned numeric IP network connections.
    """

    @staticmethod
    def is_safe_ip(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
        """
        Check if an IP address is a publicly routable, safe destination.
        Returns False if private, loopback, link-local, multicast, or cloud metadata.
        """
        # Specific cloud metadata check
        if ip_obj in CLOUD_METADATA_IPS:
            return False

        # General property checks
        if (
            ip_obj.is_loopback
            or ip_obj.is_private
            or ip_obj.is_link_local
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_unspecified
        ):
            return False

        # Explicit subnet checks
        for net in FORBIDDEN_NETWORKS:
            if ip_obj in net:
                return False

        return True

    @classmethod
    def resolve_and_verify(cls, hostname: str, port: int = 443) -> str:
        """
        Resolve hostname to numeric IP address and strictly verify safety.
        Returns verified numeric IP address string.
        Raises SSRFBlockedException if any resolved IP belongs to a forbidden range.
        """
        clean_host = hostname.strip().lower()
        if clean_host in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
            raise SSRFBlockedException(f"SSRF blocked: forbidden hostname '{hostname}'.")

        # Check if already a numeric IP literal
        try:
            direct_ip = ipaddress.ip_address(clean_host)
            if not cls.is_safe_ip(direct_ip):
                raise SSRFBlockedException(f"SSRF blocked: direct IP {direct_ip} is in a forbidden range.")
            return str(direct_ip)
        except ValueError:
            # Not a direct IP literal, proceed to DNS resolution
            pass

        # Resolve DNS addresses
        try:
            addr_info = socket.getaddrinfo(
                clean_host,
                port,
                family=socket.AF_UNSPEC,
                type=socket.SOCK_STREAM,
            )
        except socket.gaierror as e:
            raise SSRFBlockedException(f"DNS resolution failed for '{hostname}': {e}") from e

        if not addr_info:
            raise SSRFBlockedException(f"No DNS records found for '{hostname}'.")

        verified_ip: str | None = None
        for item in addr_info:
            sockaddr = item[4]
            ip_str = str(sockaddr[0])
            try:
                ip_obj = ipaddress.ip_address(ip_str)
            except ValueError:
                raise SSRFBlockedException(f"Invalid resolved IP '{ip_str}' from '{hostname}'.")

            if not cls.is_safe_ip(ip_obj):
                log.warning("SSRF blocked: '%s' resolved to forbidden IP %s", hostname, ip_str)
                raise SSRFBlockedException(
                    f"SSRF blocked: '{hostname}' resolved to forbidden IP {ip_str}."
                )

            if verified_ip is None:
                verified_ip = ip_str

        if verified_ip is None:
            raise SSRFBlockedException(f"Failed to verify any safe IP for '{hostname}'.")

        return verified_ip

    @classmethod
    def validate_and_pin_url(cls, url: str) -> tuple[str, str, int, str]:
        """
        Parse URL, validate scheme, resolve and pin numeric IP.
        Returns tuple: (original_hostname, pinned_numeric_ip, port, path_and_query)
        """
        parsed = urlparse(url)
        scheme = (parsed.scheme or "").lower()
        if scheme not in ("http", "https"):
            raise SSRFBlockedException(f"Prohibited URL scheme '{scheme}'. Only http and https allowed.")

        hostname = parsed.hostname
        if not hostname:
            raise SSRFBlockedException(f"Missing hostname in URL: '{url}'.")

        port = parsed.port or (443 if scheme == "https" else 80)
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"

        pinned_ip = cls.resolve_and_verify(hostname, port)
        return hostname, pinned_ip, port, path

    @classmethod
    def connect_pinned_socket(
        cls,
        url: str,
        timeout: float = 10.0,
    ) -> tuple[socket.socket, str, str]:
        """
        Establish a TCP socket connected DIRECTLY to the verified pinned numeric IP,
        wrapping with TLS if HTTPS while preserving SNI extension for certificate verification.

        Returns tuple: (connected_socket, original_hostname, pinned_ip)
        """
        hostname, pinned_ip, port, _ = cls.validate_and_pin_url(url)
        parsed = urlparse(url)
        is_https = (parsed.scheme or "").lower() == "https"

        # Determine address family (IPv4 vs IPv6)
        ip_obj = ipaddress.ip_address(pinned_ip)
        family = socket.AF_INET6 if ip_obj.version == 6 else socket.AF_INET

        raw_sock = socket.socket(family, socket.SOCK_STREAM)
        raw_sock.settimeout(timeout)

        try:
            # Connect directly to PINNED NUMERIC IP
            raw_sock.connect((pinned_ip, port))

            if is_https:
                context = ssl.create_default_context()
                # Wrap socket with TLS; server_hostname guarantees correct SNI and cert validation
                tls_sock = context.wrap_socket(raw_sock, server_hostname=hostname)
                return tls_sock, hostname, pinned_ip

            return raw_sock, hostname, pinned_ip

        except Exception as e:
            raw_sock.close()
            raise SSRFBlockedException(f"Failed to connect to pinned IP {pinned_ip} ({hostname}): {e}") from e
