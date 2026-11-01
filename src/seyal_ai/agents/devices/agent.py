"""
Android & External Devices Agent (Module 4).

Coordinates connected Android devices, enforcing cryptographic pairing
authorization, touch/gesture interaction, UI automator hierarchy inspection,
and strict command parameter isolation.
"""

from __future__ import annotations

import time
from typing import Any

from seyal_ai.agents.devices.adb_client import ADBClient
from seyal_ai.agents.devices.models import (
    DeviceRequest,
    DeviceResponse,
    DeviceUnauthorizedException,
)
from seyal_ai.agents.devices.pairing_guard import DevicePairingGuard
from seyal_ai.agents.devices.ui_inspector import UIHierarchyInspector
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.devices")


class AndroidDeviceAgent:
    """
    Android & External Devices Agent for Module 4.
    """

    def __init__(
        self,
        adb_client: ADBClient | None = None,
        pairing_guard: DevicePairingGuard | None = None,
    ) -> None:
        self._adb = adb_client or ADBClient()
        self._guard = pairing_guard or DevicePairingGuard()

    @property
    def adb_client(self) -> ADBClient:
        return self._adb

    @property
    def pairing_guard(self) -> DevicePairingGuard:
        return self._guard

    async def execute(self, request: DeviceRequest) -> DeviceResponse:
        """
        Execute an immutable DeviceRequest action.
        """
        start_time = time.perf_counter()
        act = request.action_type.lower()
        dev_id = request.device_id

        try:
            # 1. Authorize device action (unless querying global connected device list)
            if act != "list_devices":
                self._guard.verify_authorization(dev_id, request.device_token)

            # 2. Execute target action
            if act == "list_devices":
                devices = await self._adb.list_devices()
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return DeviceResponse(
                    action_type="list_devices",
                    success=True,
                    device_id=dev_id,
                    output=", ".join(devices) if devices else "No devices connected",
                    duration_ms=round(elapsed_ms, 2),
                )

            elif act == "tap":
                if request.x is None or request.y is None:
                    raise ValueError("Coordinates (x, y) are required for 'tap'.")
                ok = await self._adb.tap(dev_id, request.x, request.y)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return DeviceResponse(
                    action_type="tap",
                    success=ok,
                    device_id=dev_id,
                    output=f"Tapped at ({request.x}, {request.y})",
                    duration_ms=round(elapsed_ms, 2),
                )

            elif act == "swipe":
                if (
                    request.x is None
                    or request.y is None
                    or request.x2 is None
                    or request.y2 is None
                ):
                    raise ValueError("Coordinates (x, y, x2, y2) are required for 'swipe'.")
                ok = await self._adb.swipe(
                    dev_id,
                    request.x,
                    request.y,
                    request.x2,
                    request.y2,
                    request.duration_ms,
                )
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return DeviceResponse(
                    action_type="swipe",
                    success=ok,
                    device_id=dev_id,
                    output=f"Swiped ({request.x},{request.y}) -> ({request.x2},{request.y2})",
                    duration_ms=round(elapsed_ms, 2),
                )

            elif act == "type_text":
                if request.text is None:
                    raise ValueError("Text string is required for 'type_text'.")
                ok = await self._adb.type_text(dev_id, request.text)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return DeviceResponse(
                    action_type="type_text",
                    success=ok,
                    device_id=dev_id,
                    output="Text typed successfully",
                    duration_ms=round(elapsed_ms, 2),
                )

            elif act == "key_event":
                if request.key_code is None:
                    raise ValueError("key_code is required for 'key_event'.")
                ok = await self._adb.key_event(dev_id, request.key_code)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return DeviceResponse(
                    action_type="key_event",
                    success=ok,
                    device_id=dev_id,
                    output=f"Sent KeyEvent code {request.key_code}",
                    duration_ms=round(elapsed_ms, 2),
                )

            elif act == "screencap":
                raw_bytes = await self._adb.screencap(dev_id)
                ok = len(raw_bytes) > 0
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return DeviceResponse(
                    action_type="screencap",
                    success=ok,
                    device_id=dev_id,
                    screenshot_bytes=raw_bytes if ok else None,
                    output=f"Captured screencap ({len(raw_bytes)} bytes)" if ok else "Screencap failed",
                    duration_ms=round(elapsed_ms, 2),
                )

            elif act == "dump_ui":
                xml_data = await self._adb.dump_ui_hierarchy(dev_id)
                nodes = UIHierarchyInspector.parse(xml_data)
                summary = UIHierarchyInspector.to_compact_summary(nodes)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return DeviceResponse(
                    action_type="dump_ui",
                    success=bool(xml_data),
                    device_id=dev_id,
                    ui_hierarchy=summary,
                    output=f"Parsed {len(nodes)} root UI Automator nodes",
                    duration_ms=round(elapsed_ms, 2),
                )

            else:
                raise ValueError(f"Unsupported action_type: {act}")

        except DeviceUnauthorizedException as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.warning("Device action blocked by authorization: %s", e)
            return DeviceResponse(
                action_type=request.action_type,
                success=False,
                device_id=dev_id,
                duration_ms=round(elapsed_ms, 2),
                error=str(e),
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.error("Device action failed: %s", e)
            return DeviceResponse(
                action_type=request.action_type,
                success=False,
                device_id=dev_id,
                duration_ms=round(elapsed_ms, 2),
                error=str(e),
            )
