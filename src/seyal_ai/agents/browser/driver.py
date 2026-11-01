"""
Ephemeral Browser Driver with SSRF Socket Pinning and Context Isolation.

Provides fast, secure web navigation using direct numeric IP pinned sockets
and ephemeral per-session state isolation.
"""

from __future__ import annotations

import uuid
from typing import Any
from urllib.parse import urlparse

from seyal_ai.agents.browser.dom import SemanticDOMExtractor
from seyal_ai.agents.browser.models import SSRFBlockedException
from seyal_ai.agents.browser.ssrf import SSRFGuard
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.browser.driver")


class EphemeralBrowserSession:
    """
    Isolated per-task browser session. All cookies, cache, and history
    are strictly isolated and destroyed when the session closes.
    """

    def __init__(
        self,
        session_id: str | None = None,
        dom_extractor: SemanticDOMExtractor | None = None,
    ) -> None:
        self._session_id = session_id or str(uuid.uuid4())
        self._dom_extractor = dom_extractor or SemanticDOMExtractor()
        self._current_url: str | None = None
        self._current_title: str | None = None
        self._last_pinned_ip: str | None = None
        self._cookies: dict[str, str] = {}
        self._is_closed: bool = False

    @property
    def session_id(self) -> str:
        return self._session_id

    @property
    def current_url(self) -> str | None:
        return self._current_url

    @property
    def current_title(self) -> str | None:
        return self._current_title

    @property
    def last_pinned_ip(self) -> str | None:
        return self._last_pinned_ip

    @property
    def is_closed(self) -> bool:
        return self._is_closed

    def navigate(self, url: str) -> tuple[str, str, str, str]:
        """
        Navigate to target URL via SSRF-pinned socket connection.
        Returns: (current_url, page_title, dom_summary, pinned_ip)
        """
        if self._is_closed:
            raise RuntimeError("Cannot navigate in a closed browser session.")

        # 1. Establish direct connection to verified pinned numeric IP
        sock, original_host, pinned_ip = SSRFGuard.connect_pinned_socket(url, timeout=10.0)
        parsed = urlparse(url)
        path = parsed.path or "/"
        if parsed.query:
            path = f"{path}?{parsed.query}"

        # 2. Formulate HTTP/1.1 Request with explicit Host header
        cookie_header = ""
        if self._cookies:
            cookie_str = "; ".join(f"{k}={v}" for k, v in self._cookies.items())
            cookie_header = f"Cookie: {cookie_str}\r\n"

        request_data = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {original_host}\r\n"
            f"User-Agent: SeyalAI-AutonomousBrowser/1.0 (Security-SSRF-Pinned)\r\n"
            f"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n"
            f"Connection: close\r\n"
            f"{cookie_header}"
            f"\r\n"
        ).encode("utf-8")

        # 3. Transmit request and read response
        response_bytes = bytearray()
        try:
            sock.sendall(request_data)
            while True:
                chunk = sock.recv(8192)
                if not chunk:
                    break
                response_bytes.extend(chunk)
                # Protect against massive response bombs (max 5 MB)
                if len(response_bytes) > 5 * 1024 * 1024:
                    break
        finally:
            sock.close()

        # 4. Parse HTTP response headers and body
        raw_text = response_bytes.decode("utf-8", errors="replace")
        header_body_split = raw_text.split("\r\n\r\n", 1)
        headers_str = header_body_split[0] if header_body_split else ""
        body_html = header_body_split[1] if len(header_body_split) > 1 else ""

        # Extract set-cookie headers into ephemeral session
        for line in headers_str.split("\r\n"):
            if line.lower().startswith("set-cookie:"):
                cookie_val = line[11:].split(";")[0].strip()
                if "=" in cookie_val:
                    cname, cval = cookie_val.split("=", 1)
                    self._cookies[cname.strip()] = cval.strip()

        # 5. Extract semantic DOM
        title, dom_summary = self._dom_extractor.extract(body_html)
        self._current_url = url
        self._current_title = title or original_host
        self._last_pinned_ip = pinned_ip

        return self._current_url, self._current_title, dom_summary, pinned_ip

    def close(self) -> None:
        """
        Destroy session and purge all ephemeral state (cookies, history, credentials).
        """
        self._cookies.clear()
        self._current_url = None
        self._current_title = None
        self._last_pinned_ip = None
        self._is_closed = True
        log.debug("Ephemeral browser session %s closed and purged.", self._session_id)
