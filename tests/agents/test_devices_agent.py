"""
Unit and Integration Tests for Module 4: Android & External Devices Agent (ADB Orchestration).

Acceptance Criteria Verified:
- DEV-01: Actions directed to paired, verified devices execute valid ADB input commands.
- DEV-02: Unpaired or expired device tokens are rejected before reaching ADB.
- DEV-03: Shell metacharacters (e.g. text="hello; rm -rf /") are safely sanitized and treated as literal text.
- DEV-04: UI automator XML hierarchy parses cleanly into structured UI element nodes.
- DEV-05: Device screencap returns compressed image bytes with valid headers.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from seyal_ai.agents.devices import (
    ADBClient,
    AndroidDeviceAgent,
    DevicePairingGuard,
    DeviceRequest,
    DeviceResponse,
    DeviceUnauthorizedException,
    UIElementNode,
    UIHierarchyInspector,
)
from seyal_ai.platform.security.pairing import DevicePairingManager, PairedDevice


class MockDevicePairingManager:
    """In-memory mock pairing manager for unit test isolation."""

    def __init__(self) -> None:
        self.devices: dict[str, PairedDevice] = {
            "pixel_8_pro": PairedDevice(
                device_id="pixel_8_pro",
                device_name="Google Pixel 8 Pro",
                device_type="phone",
                device_token="valid_token_secret_12345",
                is_active=True,
            ),
            "revoked_phone": PairedDevice(
                device_id="revoked_phone",
                device_name="Revoked Samsung Phone",
                device_type="phone",
                device_token="revoked_token_secret",
                is_active=False,
            ),
        }

    def authenticate_device(self, device_id: str, device_token: str) -> bool:
        dev = self.devices.get(device_id)
        if not dev or not dev.is_active:
            return False
        return dev.device_token == device_token


class MockADBClient(ADBClient):
    """Mock ADB client that records dispatched arguments without needing a physical phone."""

    def __init__(self) -> None:
        super().__init__(dry_run=True)
        self.history: list[tuple[str, list[str]]] = []

    async def _run_adb_cmd(
        self,
        args: list[str],
        serial: str | None = None,
        timeout: float = 15.0,
    ) -> tuple[int, bytes, bytes]:
        self.history.append((serial or "", args))
        return 0, b"mock_adb_output", b""


class TestDeviceContracts:
    """Verifies Pydantic V2 schema validation and immutability."""

    def test_request_immutability(self):
        """DeviceRequest is strictly frozen."""
        req = DeviceRequest(action_type="tap", device_id="pixel_8_pro", x=100, y=200)

        with pytest.raises(ValidationError):
            req.x = 500  # type: ignore

        with pytest.raises(ValidationError):
            req.device_id = "other_dev"  # type: ignore

    def test_response_immutability(self):
        """DeviceResponse is strictly frozen."""
        resp = DeviceResponse(action_type="tap", success=True, device_id="pixel_8_pro")

        with pytest.raises(ValidationError):
            resp.success = False  # type: ignore

    def test_invalid_action_rejected(self):
        """Disallowed action raises ValidationError."""
        with pytest.raises(ValidationError):
            DeviceRequest(action_type="reboot_bootloader", device_id="pixel_8_pro")


class TestDeviceAuthorization:
    """Verifies DEV-02: Cryptographic pairing guard and token authentication."""

    def test_dev02_authorized_device_passes(self):
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore

        # Valid credentials should not raise
        guard.verify_authorization("pixel_8_pro", "valid_token_secret_12345")

    def test_dev02_unpaired_device_rejected(self):
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore

        with pytest.raises(DeviceUnauthorizedException) as exc_info:
            guard.verify_authorization("unknown_device_99", "random_token")
        assert "unauthorized" in str(exc_info.value).lower()

    def test_dev02_invalid_token_rejected(self):
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore

        with pytest.raises(DeviceUnauthorizedException) as exc_info:
            guard.verify_authorization("pixel_8_pro", "wrong_token_guess")
        assert "unauthorized" in str(exc_info.value).lower()

    def test_dev02_revoked_device_rejected(self):
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore

        with pytest.raises(DeviceUnauthorizedException):
            guard.verify_authorization("revoked_phone", "revoked_token_secret")


class TestShellInjectionDefense:
    """Verifies DEV-03: Shell metacharacter sanitization and parameter isolation."""

    def test_dev03_sanitizes_spaces(self):
        sanitized = ADBClient.sanitize_input_text("Hello Android World")
        assert sanitized == "Hello%sAndroid%sWorld"

    def test_dev03_escapes_shell_chaining_and_destructive_commands(self):
        """Metacharacters like ; && || ` $() rm -rf are escaped to prevent shell interpretation."""
        dangerous_input = "test; rm -rf /; echo evil"
        sanitized = ADBClient.sanitize_input_text(dangerous_input)

        # Semicolons and spaces must be neutralized
        assert "\\;" in sanitized
        assert "%s" in sanitized
        # The raw unescaped command chaining is neutralized
        assert "; rm" not in sanitized

    def test_dev03_escapes_backticks_and_subshells(self):
        payload = "`reboot` and $(su -c id)"
        sanitized = ADBClient.sanitize_input_text(payload)
        assert "\\`" in sanitized
        assert "\\$" in sanitized


class TestUIAutomatorInspector:
    """Verifies DEV-04: Android UI Automator hierarchy parsing and element bounds."""

    def test_dev04_parses_sample_xml_hierarchy(self):
        xml_dump = """<?xml version="1.0" encoding="UTF-8"?>
        <hierarchy rotation="0">
          <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.android.systemui" bounds="[0,0][1080,2400]">
            <node index="0" text="Settings" resource-id="com.android.settings:id/title" class="android.widget.TextView" package="com.android.settings" bounds="[100,200][300,400]" clickable="true" />
            <node index="1" text="Search apps" resource-id="com.google.android.apps.nexuslauncher:id/search_box" class="android.widget.EditText" package="com.google.android.apps.nexuslauncher" bounds="[100,500][980,650]" focusable="true" />
            <node index="2" text="Save" resource-id="com.example.app:id/save_btn" class="android.widget.Button" package="com.example.app" content-desc="Save Changes" bounds="[200,800][600,950]" clickable="true" />
          </node>
        </hierarchy>"""

        nodes = UIHierarchyInspector.parse(xml_dump)
        assert len(nodes) == 1

        root = nodes[0]
        assert len(root.children) == 3

        # Node 0: Settings
        settings_node = root.children[0]
        assert settings_node.text == "Settings"
        assert settings_node.resource_id == "com.android.settings:id/title"
        assert settings_node.bounds == (100, 200, 300, 400)
        assert settings_node.center == (200, 300)  # (100+300)//2, (200+400)//2
        assert settings_node.is_clickable is True

        # Node 1: Search box
        search_node = root.children[1]
        assert search_node.is_editable is True
        assert search_node.center == (540, 575)

    def test_dev04_find_by_text_and_id(self):
        xml_dump = """<hierarchy>
          <node text="Click Here" resource-id="btn_1" bounds="[0,0][100,100]" />
          <node text="" content-desc="Submit Cart" resource-id="btn_submit" bounds="[100,100][200,200]" />
        </hierarchy>"""
        nodes = UIHierarchyInspector.parse(xml_dump)

        matches_text = UIHierarchyInspector.find_by_text(nodes, "click")
        assert len(matches_text) == 1
        assert matches_text[0].resource_id == "btn_1"

        matches_desc = UIHierarchyInspector.find_by_text(nodes, "submit")
        assert len(matches_desc) == 1
        assert matches_desc[0].resource_id == "btn_submit"

        matches_id = UIHierarchyInspector.find_by_id(nodes, "btn_submit")
        assert len(matches_id) == 1


@pytest.mark.asyncio
class TestAndroidDeviceAgentExecution:
    """Verifies DEV-01 and DEV-05: Integrated agent execution and screencap verification."""

    async def test_dev01_executes_tap_and_swipe(self):
        mock_adb = MockADBClient()
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore
        agent = AndroidDeviceAgent(adb_client=mock_adb, pairing_guard=guard)

        # Execute Tap
        tap_req = DeviceRequest(
            action_type="tap",
            device_id="pixel_8_pro",
            device_token="valid_token_secret_12345",
            x=250,
            y=450,
        )
        tap_resp = await agent.execute(tap_req)
        assert tap_resp.success is True
        assert tap_resp.action_type == "tap"

        # Verify ADB command was dispatched
        assert len(mock_adb.history) == 1
        serial, args = mock_adb.history[0]
        assert serial == "pixel_8_pro"
        assert args == ["shell", "input", "tap", "250", "450"]

        # Execute Swipe
        swipe_req = DeviceRequest(
            action_type="swipe",
            device_id="pixel_8_pro",
            device_token="valid_token_secret_12345",
            x=100,
            y=500,
            x2=100,
            y2=100,
            duration_ms=400,
        )
        swipe_resp = await agent.execute(swipe_req)
        assert swipe_resp.success is True
        assert len(mock_adb.history) == 2
        assert mock_adb.history[1][1] == ["shell", "input", "swipe", "100", "500", "100", "100", "400"]

    async def test_dev01_unauthorized_request_fails_cleanly(self):
        mock_adb = MockADBClient()
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore
        agent = AndroidDeviceAgent(adb_client=mock_adb, pairing_guard=guard)

        req = DeviceRequest(
            action_type="tap",
            device_id="unregistered_phone",
            device_token="bogus",
            x=10,
            y=20,
        )
        resp = await agent.execute(req)
        assert resp.success is False
        assert "unauthorized" in str(resp.error).lower()
        # ADB was never called
        assert len(mock_adb.history) == 0

    async def test_dev05_screencap_returns_valid_bytes(self):
        mock_adb = MockADBClient()
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore
        agent = AndroidDeviceAgent(adb_client=mock_adb, pairing_guard=guard)

        req = DeviceRequest(
            action_type="screencap",
            device_id="pixel_8_pro",
            device_token="valid_token_secret_12345",
        )
        resp = await agent.execute(req)
        assert resp.success is True
        assert resp.screenshot_bytes is not None
        # Check PNG magic bytes header: \x89PNG\r\n\x1a\n
        assert resp.screenshot_bytes.startswith(b"\x89PNG")

    async def test_dump_ui_hierarchy_integration(self):
        mock_adb = MockADBClient()
        mock_mgr = MockDevicePairingManager()
        guard = DevicePairingGuard(pairing_manager=mock_mgr)  # type: ignore
        agent = AndroidDeviceAgent(adb_client=mock_adb, pairing_guard=guard)

        req = DeviceRequest(
            action_type="dump_ui",
            device_id="pixel_8_pro",
            device_token="valid_token_secret_12345",
        )
        resp = await agent.execute(req)
        assert resp.success is True
        assert resp.ui_hierarchy is not None
        assert "Home Screen" in resp.ui_hierarchy
        assert "center=" in resp.ui_hierarchy
