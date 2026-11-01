"""
Seyal AI Android & External Devices Agent Package.

Provides secure orchestration of connected Android smartphones and external
devices via ADB, pairing authorization, and UI Automator hierarchy parsing.
"""

from seyal_ai.agents.devices.adb_client import ADBClient
from seyal_ai.agents.devices.agent import AndroidDeviceAgent
from seyal_ai.agents.devices.models import (
    DeviceRequest,
    DeviceResponse,
    DeviceUnauthorizedException,
    ShellInjectionBlockedException,
)
from seyal_ai.agents.devices.pairing_guard import DevicePairingGuard
from seyal_ai.agents.devices.ui_inspector import UIElementNode, UIHierarchyInspector

__all__ = [
    "AndroidDeviceAgent",
    "DeviceRequest",
    "DeviceResponse",
    "DeviceUnauthorizedException",
    "ShellInjectionBlockedException",
    "DevicePairingGuard",
    "ADBClient",
    "UIHierarchyInspector",
    "UIElementNode",
]
