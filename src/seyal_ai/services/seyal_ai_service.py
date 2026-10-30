"""
Seyal AI Unified Architecture & Live Telemetry Service.

Connects sub-features across Seyal AI into a unified situational awareness hub:
1. Live Desktop Awareness: Active foreground window, running app context.
2. Hardware Power & Telemetry: Battery %, charging state, CPU, RAM.
3. User Knowledge & Reminders: Today's pending reminders, active standing rules, user vault facts.
4. Recent Session & Task Info: Last conversation summary, recent goals.
5. Files & Downloads Telemetry: Recent downloads, file launcher.
6. Network & Connected Displays: Wi-Fi status, multi-monitor configuration.
7. System Control: Screen brightness, audio control, lock screen.
8. Background Task Queue: TelemetryHub active task tracking.
9. 0ms Fast-Path Dispatcher: Instant execution for OS hardware actions and live telemetry queries.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.services.telemetry.fast_path import FastPathTelemetryMixin
from seyal_ai.services.telemetry.hardware import HardwareTelemetryMixin
from seyal_ai.services.telemetry.narration import NarrationTelemetryMixin
from seyal_ai.services.telemetry.settings import SettingsTelemetryMixin
from seyal_ai.services.telemetry.task_control import TaskControlTelemetryMixin
from seyal_ai.utils.logging import get_logger

log = get_logger("services.seyal_ai_service")


class SeyalAiTelemetryService(
    HardwareTelemetryMixin,
    SettingsTelemetryMixin,
    TaskControlTelemetryMixin,
    FastPathTelemetryMixin,
    NarrationTelemetryMixin,
):
    """Aggregates local system telemetry and provides instant 0ms situational awareness."""

    def __init__(self) -> None:
        HardwareTelemetryMixin.__init__(self)
        self._last_active_window: str = ""
        self._cached_wifi: dict[str, Any] = {
            "connected": False,
            "ssid": "",
            "signal": "",
            "status_text": "Disconnected",
        }
        self._cached_wifi_time: float = 0.0
        self._cached_hogs: list[str] = []
        self._cached_hogs_time: float = 0.0


# Global singleton instance
seyal_ai_service = SeyalAiTelemetryService()
SeyalAiService = SeyalAiTelemetryService

__all__ = [
    "SeyalAiService",
    "SeyalAiTelemetryService",
    "seyal_ai_service",
]
