"""
Seyal AI Audio Volume and Lock Screen Controls.
"""

from __future__ import annotations

import platform
import subprocess
from typing import Any

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.system.os_control.audio_power")

VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF
KEYEVENTF_KEYUP = 0x0002


class VolumeControlTool(BaseTool):
    """Control Windows master volume and mute state."""

    @property
    def name(self) -> str:
        return "volume_control"

    @property
    def description(self) -> str:
        return (
            "Control system volume. Actions: 'get' (read current volume), 'set' (0-100%), "
            "'mute', 'unmute', 'step_up' (raise volume), 'step_down' (lower volume)."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["get", "set", "mute", "unmute", "step_up", "step_down"],
                    "description": "Volume action to perform (default: 'set').",
                },
                "level": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Target volume percentage (0 to 100). Required for 'set' action.",
                },
                "step": {
                    "type": "integer",
                    "description": "Volume increment/decrement percentage for step_up/step_down (default: 5).",
                },
            },
            "required": ["action"],
        }

    @property
    def category(self) -> str:
        return "system"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self,
        action: str = "set",
        level: int | None = None,
        step: int = 5,
        **kwargs: Any,
    ) -> ToolResult:
        if platform.system() != "Windows":
            return ToolResult.ok(
                f"Simulated volume action '{action}' on non-Windows OS.", level=level or 50
            )

        try:
            import ctypes

            user32 = ctypes.windll.user32

            def send_vk(vk: int) -> None:
                user32.keybd_event(vk, 0, 0, 0)
                user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)

            # Action: Set volume
            if action == "set":
                if level is None:
                    return ToolResult.fail(
                        "Parameter 'level' (0-100) is required for 'set' action."
                    )
                target_level = max(0, min(100, level))
                for _ in range(50):
                    send_vk(VK_VOLUME_DOWN)
                for _ in range(target_level // 2):
                    send_vk(VK_VOLUME_UP)
                return ToolResult.ok(f"Volume set to {target_level}%", level=target_level)

            # Action: Mute / Unmute
            elif action in ("mute", "unmute"):
                send_vk(VK_VOLUME_MUTE)
                return ToolResult.ok(f"Volume mute state toggled ({action}).", action=action)

            # Action: Step Up
            elif action == "step_up":
                steps = max(1, step // 2)
                for _ in range(steps):
                    send_vk(VK_VOLUME_UP)
                return ToolResult.ok(f"Volume increased by ~{step}%", step=step)

            # Action: Step Down
            elif action == "step_down":
                steps = max(1, step // 2)
                for _ in range(steps):
                    send_vk(VK_VOLUME_DOWN)
                return ToolResult.ok(f"Volume decreased by ~{step}%", step=step)

            elif action == "get":
                return ToolResult.ok("Volume status queried.", action="get")

            else:
                return ToolResult.fail(f"Unsupported volume action: '{action}'")

        except Exception as e:
            return ToolResult.fail(f"Volume control failed: {e}")


class LockScreenTool(BaseTool):
    """Lock the Windows workstation screen."""

    @property
    def name(self) -> str:
        return "lock_screen"

    @property
    def description(self) -> str:
        return "Lock the laptop screen immediately to secure the device."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    @property
    def category(self) -> str:
        return "system"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, **kwargs: Any) -> ToolResult:
        if platform.system() == "Windows":
            try:
                import ctypes

                result = ctypes.windll.user32.LockWorkStation()
                if result != 0:
                    return ToolResult.ok("Windows screen locked successfully.")
            except Exception as e:
                log.warning("LockWorkStation API call failed: %s, falling back to rundll32", e)

            try:
                subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], check=True)
                return ToolResult.ok("Windows screen locked successfully.")
            except Exception as e:
                return ToolResult.fail(f"Could not lock screen: {e}")

        return ToolResult.ok("Simulated screen lock on non-Windows OS.")
