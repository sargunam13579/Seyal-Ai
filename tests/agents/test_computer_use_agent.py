"""
Unit and Integration Tests for Module 2: Computer Use Agent (Mouse, Keyboard & UI Automation).

Acceptance Criteria Verified:
- CU-01: Normalized screen coordinates map accurately across different DPI scaling factors (100%, 125%, 150%).
- CU-02: Fail-safe interrupt immediately aborts automation when mouse position enters corner (0, 0).
- CU-03: Click, double-click, drag, and text typing actions execute cleanly via input simulator.
- CU-04: Sensitive password controls and credentials trigger UI masking and prevent plaintext logging.
- CU-05: Pydantic V2 contracts enforce type safety, validation, and recursive immutability.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from seyal_ai.agents.computer_use import (
    AutomationInterruptException,
    ComputerUseAgent,
    ComputerUseRequest,
    ComputerUseResponse,
    ScreenCoordinateScaler,
    SensitiveUIMasker,
    VirtualScreenBounds,
    Win32InputSimulator,
)
from seyal_ai.agents.computer_use.input import INPUT, INPUT_KEYBOARD, INPUT_MOUSE


class TestComputerUseContracts:
    """Verifies CU-05: Pydantic V2 immutability and schema validation."""

    def test_cu05_request_immutability(self):
        """ComputerUseRequest attributes cannot be mutated after creation."""
        req = ComputerUseRequest(
            action_type="click",
            coordinate=(100, 200),
            button="left",
            is_sensitive=False,
        )

        with pytest.raises(ValidationError):
            req.action_type = "double_click"  # type: ignore

        with pytest.raises(ValidationError):
            req.coordinate = (500, 500)  # type: ignore

    def test_cu05_response_immutability(self):
        """ComputerUseResponse attributes cannot be mutated after creation."""
        resp = ComputerUseResponse(
            action_type="click",
            success=True,
            message="Success",
            coordinate=(100, 200),
            duration_ms=15.2,
        )

        with pytest.raises(ValidationError):
            resp.success = False  # type: ignore

    def test_cu05_invalid_action_rejected(self):
        """Unknown action types raise ValidationError."""
        with pytest.raises(ValidationError):
            ComputerUseRequest(action_type="arbitrary_unknown_action")

    def test_cu05_invalid_button_rejected(self):
        """Invalid mouse button names raise ValidationError."""
        with pytest.raises(ValidationError):
            ComputerUseRequest(action_type="click", button="invalid_button")


class TestDpiCoordinateScaler:
    """Verifies CU-01: Accurate DPI scaling across 100%, 125%, 150% and multi-monitor bounds."""

    @pytest.mark.parametrize(
        "scale, logical_x, logical_y, expected_phys_x, expected_phys_y",
        [
            (1.0, 100, 200, 100, 200),     # 100% DPI
            (1.25, 100, 200, 125, 250),    # 125% DPI
            (1.5, 100, 200, 150, 300),     # 150% DPI
            (2.0, 500, 400, 1000, 800),    # 200% 4K DPI
        ],
    )
    def test_cu01_coordinate_scaling_roundtrip(
        self,
        scale: float,
        logical_x: int,
        logical_y: int,
        expected_phys_x: int,
        expected_phys_y: int,
    ):
        scaler = ScreenCoordinateScaler(dpi_scale=scale)

        # Logical -> Physical
        phys_x, phys_y = scaler.denormalize_coordinates(logical_x, logical_y)
        assert phys_x == expected_phys_x
        assert phys_y == expected_phys_y

        # Physical -> Logical (roundtrip)
        norm_x, norm_y = scaler.normalize_coordinates(phys_x, phys_y)
        assert norm_x == logical_x
        assert norm_y == logical_y

    def test_cu01_multi_monitor_negative_coordinates(self):
        """Supports clamping within multi-monitor bounds having secondary screen left of primary."""
        scaler = ScreenCoordinateScaler(dpi_scale=1.0)
        # Mock virtual bounds: secondary monitor is 1920x1080 to the left (min_x = -1920)
        scaler.get_virtual_screen_bounds = lambda: VirtualScreenBounds(-1920, 0, 3840, 1080)  # type: ignore

        # Coordinate on secondary screen
        clamped_x, clamped_y = scaler.clamp_to_virtual_screen(-500, 300)
        assert clamped_x == -500
        assert clamped_y == 300

        # Out-of-bounds coordinate clamped
        clamped_x2, clamped_y2 = scaler.clamp_to_virtual_screen(-2500, 2000)
        assert clamped_x2 == -1920
        assert clamped_y2 == 1079


class TestFailSafeMechanism:
    """Verifies CU-02: Extreme corner abort interrupt."""

    def test_cu02_top_left_corner_aborts(self):
        """Mouse in top-left corner (0, 0) immediately triggers AutomationInterruptException."""
        scaler = ScreenCoordinateScaler(dpi_scale=1.0)
        scaler.get_virtual_screen_bounds = lambda: VirtualScreenBounds(0, 0, 1920, 1080)  # type: ignore
        sim = Win32InputSimulator(scaler=scaler, dry_run=True, corner_threshold=5)

        with pytest.raises(AutomationInterruptException) as exc_info:
            sim.check_failsafe(0, 0)
        assert "Fail-Safe abort triggered" in str(exc_info.value)

    def test_cu02_all_four_corners_abort(self):
        """All 4 corners of virtual screen trigger fail-safe abort."""
        scaler = ScreenCoordinateScaler(dpi_scale=1.0)
        scaler.get_virtual_screen_bounds = lambda: VirtualScreenBounds(0, 0, 1920, 1080)  # type: ignore
        sim = Win32InputSimulator(scaler=scaler, dry_run=True, corner_threshold=5)

        corners = [(0, 0), (1919, 0), (0, 1079), (1919, 1079)]
        for cx, cy in corners:
            with pytest.raises(AutomationInterruptException):
                sim.check_failsafe(cx, cy)

    def test_cu02_safe_central_coordinates_do_not_abort(self):
        """Central coordinates safely pass fail-safe check."""
        scaler = ScreenCoordinateScaler(dpi_scale=1.0)
        sim = Win32InputSimulator(scaler=scaler, dry_run=True, corner_threshold=5)
        # Should not raise
        sim.check_failsafe(960, 540)
        sim.check_failsafe(100, 100)


class TestInputSimulatorWin32Structures:
    """Verifies CU-03: Win32 SendInput data structures and action simulation."""

    def test_cu03_win32_struct_sizes(self):
        """Ensures Win32 ctypes structures match native Windows ABI alignment."""
        import ctypes
        assert ctypes.sizeof(INPUT) in (28, 40)  # 28 bytes on 32-bit, 40 bytes on 64-bit

    def test_cu03_move_and_click_simulation(self):
        """Simulator correctly records cursor positions during dry-run."""
        sim = Win32InputSimulator(dry_run=True)
        sim.move_to(500, 400)
        assert sim.get_cursor_position() == (500, 400)

        sim.click(600, 700, button="right")
        assert sim.get_cursor_position() == (600, 700)

        sim.double_click(200, 300)
        assert sim.get_cursor_position() == (200, 300)


class TestSensitiveUIMasking:
    """Verifies CU-04: Credential and password field protection."""

    @pytest.fixture
    def masker(self):
        return SensitiveUIMasker()

    @pytest.mark.parametrize(
        "sensitive_title",
        [
            "1Password - Unlocked",
            "Bitwarden Vault",
            "KeePass Password Safe",
            "Windows Security - Enter Network Credentials",
            "User Account Control",
            "Sign in to your Microsoft account",
            "Enter Password",
            "PIN Entry Dialog",
        ],
    )
    def test_cu04_detects_sensitive_window_titles(self, masker: SensitiveUIMasker, sensitive_title: str):
        """Detects password managers and authentication dialogs."""
        assert masker.is_sensitive_active_window(sensitive_title) is True

    @pytest.mark.parametrize(
        "safe_title",
        [
            "Visual Studio Code - Seyal AI",
            "Command Prompt",
            "Google Chrome - Documentation",
            "File Explorer",
        ],
    )
    def test_cu04_safe_windows_not_masked(self, masker: SensitiveUIMasker, safe_title: str):
        """Safe productivity applications are not flagged as sensitive."""
        assert masker.is_sensitive_active_window(safe_title) is False

    def test_cu04_sensitive_control_types(self, masker: SensitiveUIMasker):
        """Password text boxes are flagged as sensitive."""
        assert masker.is_sensitive_control("PasswordBox") is True
        assert masker.is_sensitive_control("Edit", class_name="PasswordEdit") is True
        assert masker.is_sensitive_control("TextBox", class_name="NormalEdit") is False

    def test_cu04_redacts_secret_text(self, masker: SensitiveUIMasker):
        """Sensitive strings are replaced with placeholder."""
        assert masker.mask_text("SuperSecretPassword123!") == "[REDACTED_CREDENTIAL]"
        assert masker.mask_text("") == ""


@pytest.mark.asyncio
class TestComputerUseAgentExecution:
    """Verifies integrated ComputerUseAgent execution loop."""

    @pytest.fixture
    def agent(self):
        # Dry-run simulator for reliable CI testing
        sim = Win32InputSimulator(dry_run=True)
        return ComputerUseAgent(input_simulator=sim)

    async def test_agent_executes_click(self, agent: ComputerUseAgent):
        """Agent executes click action and returns valid response."""
        req = ComputerUseRequest(action_type="click", coordinate=(400, 300), button="left")
        resp = await agent.execute(req)

        assert resp.success is True
        assert resp.action_type == "click"
        assert resp.coordinate == (400, 300)
        assert resp.interrupted is False
        assert resp.duration_ms >= 0

    async def test_agent_executes_type_text(self, agent: ComputerUseAgent):
        """Agent executes type_text action."""
        req = ComputerUseRequest(action_type="type_text", text="Hello Seyal AI")
        resp = await agent.execute(req)

        assert resp.success is True
        assert resp.action_type == "type_text"
        assert "Hello Seyal AI" in resp.message
        assert resp.masked is False

    async def test_agent_masks_sensitive_input(self, agent: ComputerUseAgent):
        """CU-04: Credential input marked is_sensitive is masked in logs/message."""
        req = ComputerUseRequest(
            action_type="type_text",
            text="my_secret_password_999",
            is_sensitive=True,
        )
        resp = await agent.execute(req)

        assert resp.success is True
        assert resp.masked is True
        assert "[REDACTED_CREDENTIAL]" in resp.message
        assert "my_secret_password_999" not in resp.message

    async def test_agent_fail_safe_interrupt(self, agent: ComputerUseAgent):
        """CU-02: Target coordinate at (0, 0) triggers fail-safe interrupt in response."""
        req = ComputerUseRequest(action_type="click", coordinate=(0, 0))
        resp = await agent.execute(req)

        assert resp.success is False
        assert resp.interrupted is True
        assert "fail-safe" in resp.message.lower()
        assert resp.error is not None
