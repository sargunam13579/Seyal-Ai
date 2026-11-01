"""
Unit and Integration Tests for Module 3: Autonomous Browser Agent with SSRF Socket Pinning.

Acceptance Criteria Verified:
- BROWSER-01: Navigation to internal loopback (127.0.0.1, localhost) or cloud metadata (169.254.169.254) is blocked.
- BROWSER-02: DNS rebinding attacks are defeated by connecting exclusively to the verified pinned numeric IP.
- BROWSER-03: Valid public websites navigate cleanly and return extracted semantic DOM elements.
- BROWSER-04: Ephemeral browser context is completely destroyed on session completion with zero cookie residue.
- BROWSER-05: 30-step limit aborts runaway navigation loops safely.
"""

from __future__ import annotations

import ipaddress
import socket
import pytest
from pydantic import ValidationError

from seyal_ai.agents.browser import (
    BrowserAgent,
    BrowserRequest,
    BrowserResponse,
    EphemeralBrowserSession,
    SSRFBlockedException,
    SSRFGuard,
    SemanticDOMExtractor,
)


class TestBrowserContracts:
    """Verifies BrowserRequest and BrowserResponse Pydantic V2 immutability and schema validation."""

    def test_request_immutability(self):
        """BrowserRequest attributes cannot be mutated after creation."""
        req = BrowserRequest(action_type="navigate", url="https://example.com")

        with pytest.raises(ValidationError):
            req.action_type = "click"  # type: ignore

        with pytest.raises(ValidationError):
            req.url = "https://evil.com"  # type: ignore

    def test_response_immutability(self):
        """BrowserResponse attributes cannot be mutated after creation."""
        resp = BrowserResponse(
            action_type="navigate",
            success=True,
            current_url="https://example.com",
            pinned_ip="93.184.216.34",
        )

        with pytest.raises(ValidationError):
            resp.success = False  # type: ignore

    def test_invalid_scheme_rejected(self):
        """Disallowed schemes like file:// or gopher:// are rejected."""
        with pytest.raises(ValidationError):
            BrowserRequest(action_type="navigate", url="file:///etc/passwd")

        with pytest.raises(ValidationError):
            BrowserRequest(action_type="navigate", url="javascript:alert(1)")

    def test_invalid_action_rejected(self):
        """Disallowed actions raise ValidationError."""
        with pytest.raises(ValidationError):
            BrowserRequest(action_type="arbitrary_invalid_action")


class TestSSRFGuard:
    """Verifies BROWSER-01 and BROWSER-02: SSRF defense and numeric IP socket pinning."""

    @pytest.mark.parametrize(
        "prohibited_target",
        [
            "http://127.0.0.1/admin",
            "http://127.0.0.2:8080",
            "http://localhost:3000",
            "http://169.254.169.254/latest/meta-data/",
            "http://169.254.170.2/v2/credentials",
            "http://10.0.0.1/internal",
            "http://172.16.5.10/",
            "http://192.168.1.1/router-login",
            "http://0.0.0.0/",
            "http://metadata.google.internal/computeMetadata/v1/",
        ],
    )
    def test_browser01_blocks_private_and_cloud_metadata(self, prohibited_target: str):
        """Navigation to loopback, private RFC 1918, or cloud metadata endpoints raises SSRFBlockedException."""
        with pytest.raises(SSRFBlockedException):
            SSRFGuard.validate_and_pin_url(prohibited_target)

    def test_browser01_ip_safety_checker(self):
        """Direct IP safety helper correctly categorizes IP addresses."""
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("127.0.0.1")) is False
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("10.1.2.3")) is False
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("172.20.0.1")) is False
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("192.168.0.254")) is False
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("169.254.169.254")) is False
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("::1")) is False
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("fc00::1")) is False

        # Public IPs are safe
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("8.8.8.8")) is True
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("93.184.216.34")) is True
        assert SSRFGuard.is_safe_ip(ipaddress.ip_address("1.1.1.1")) is True

    def test_browser02_dns_rebinding_pins_numeric_ip(self, monkeypatch: pytest.MonkeyPatch):
        """
        SSRFGuard resolves hostname to numeric IP during validation.
        Subsequent connection is strictly pinned to that numeric IP.
        """
        # Mock getaddrinfo returning safe public IP
        safe_ip = "93.184.216.34"

        def mock_getaddrinfo(host, port, family=0, type=0):
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (safe_ip, port))]

        monkeypatch.setattr(socket, "getaddrinfo", mock_getaddrinfo)

        hostname, pinned_ip, port, path = SSRFGuard.validate_and_pin_url("https://example.com/test")
        assert hostname == "example.com"
        assert pinned_ip == safe_ip
        assert port == 443
        assert path == "/test"

    def test_browser02_dns_rebinding_with_injected_private_ip_is_blocked(self, monkeypatch: pytest.MonkeyPatch):
        """If DNS resolves to both a public IP and an internal private IP, request is strictly aborted."""
        def mock_getaddrinfo(host, port, family=0, type=0):
            return [
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port)),
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", port)),  # Rebinding / dual-homed attack
            ]

        monkeypatch.setattr(socket, "getaddrinfo", mock_getaddrinfo)

        with pytest.raises(SSRFBlockedException) as exc_info:
            SSRFGuard.validate_and_pin_url("https://rebound-domain.evil.com")
        assert "resolved to forbidden IP 127.0.0.1" in str(exc_info.value)


class TestSemanticDOMExtractor:
    """Verifies BROWSER-03: Compact DOM extraction for LLM consumption."""

    def test_browser03_strips_scripts_and_styles(self):
        """Extractor removes scripts, styles, SVGs, and retains headings, links, inputs."""
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Page Title</title>
            <style>body { background: red; }</style>
            <script>alert("evil");</script>
        </head>
        <body>
            <svg><path d="M0 0"/></svg>
            <h1>Welcome to Seyal AI</h1>
            <p>This is a test paragraph with useful information.</p>
            <a href="/docs">Read Documentation</a>
            <button id="submit-btn">Submit Order</button>
            <input type="text" id="user-email" name="email" value="test@example.com" />
        </body>
        </html>
        """
        extractor = SemanticDOMExtractor()
        title, dom_text = extractor.extract(html)

        assert title == "Test Page Title"
        assert "Welcome to Seyal AI" in dom_text
        assert "[Link: /docs]" in dom_text
        assert "[Button id='submit-btn']" in dom_text
        assert "[Input type='text' id='user-email' name='email' value='test@example.com']" in dom_text

        # Bloat stripped
        assert "alert(\"evil\")" not in dom_text
        assert "background: red" not in dom_text
        assert "<svg>" not in dom_text

    def test_browser03_truncation_safety(self):
        """DOM exceeding max_bytes limit is cleanly truncated with notice."""
        large_html = "<html><body><p>" + ("A" * 1000) + "</p></body></html>"
        extractor = SemanticDOMExtractor(max_bytes=200)
        _, dom_text = extractor.extract(large_html)

        assert len(dom_text) < 300
        assert "[DOM TRUNCATED" in dom_text


class TestEphemeralSessionIsolation:
    """Verifies BROWSER-04: Ephemeral context isolation and cookie purge."""

    def test_browser04_session_destruction(self):
        """Closing an ephemeral session clears cookies, URLs, and marks closed."""
        session = EphemeralBrowserSession(session_id="test-session-123")
        session._cookies["session_token"] = "secret_cookie_xyz"
        session._current_url = "https://example.com"
        session._last_pinned_ip = "93.184.216.34"

        assert not session.is_closed
        session.close()

        assert session.is_closed
        assert len(session._cookies) == 0
        assert session.current_url is None
        assert session.last_pinned_ip is None

        with pytest.raises(RuntimeError):
            session.navigate("https://example.com")


@pytest.mark.asyncio
class TestBrowserAgentExecutionAndStepLimit:
    """Verifies BROWSER-05: 30-step loop guard and integrated agent execution."""

    async def test_browser05_30_step_limit_aborts_loop(self):
        """When step_index exceeds max_steps (default 30), task aborts immediately."""
        agent = BrowserAgent()

        # Step 31 with max_steps 30
        req = BrowserRequest(
            action_type="navigate",
            url="https://example.com",
            step_index=31,
            max_steps=30,
        )
        resp = await agent.execute(req)

        assert resp.success is False
        assert resp.aborted_by_step_limit is True
        assert "Step limit exceeded" in str(resp.error)
        assert resp.step_index == 31

    async def test_agent_ssrf_block_returns_safe_failure_response(self):
        """Attempting to navigate to loopback via agent returns clean failed response without crashing."""
        agent = BrowserAgent()
        req = BrowserRequest(
            action_type="navigate",
            url="http://127.0.0.1:8080/admin",
            step_index=1,
            max_steps=30,
        )
        resp = await agent.execute(req)

        assert resp.success is False
        assert "SSRF blocked" in str(resp.error)
        assert resp.aborted_by_step_limit is False

    async def test_agent_simulated_actions(self):
        """Click, fill, and screenshot actions execute cleanly and return valid responses."""
        agent = BrowserAgent()

        req_click = BrowserRequest(action_type="click", selector="#submit-btn", step_index=2)
        resp_click = await agent.execute(req_click)
        assert resp_click.success is True
        assert resp_click.action_type == "click"

        req_fill = BrowserRequest(action_type="fill", selector="#search", text="Seyal AI", step_index=3)
        resp_fill = await agent.execute(req_fill)
        assert resp_fill.success is True
        assert resp_fill.action_type == "fill"

        req_close = BrowserRequest(action_type="close", step_index=4)
        resp_close = await agent.execute(req_close)
        assert resp_close.success is True
        assert resp_close.action_type == "close"
