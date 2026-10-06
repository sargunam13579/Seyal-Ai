"""
Seyal AI Unified Device System Package.

Provides device registry, presence tracking (ONLINE, OFFLINE, CONNECTING, BUSY),
cross-device command execution, secure file transfer, and task handoff.
"""

from seyal_ai.devices.discovery import DeviceDiscoveryService
from seyal_ai.devices.handoff import TaskHandoffEngine
from seyal_ai.devices.manager import UnifiedDeviceManager
from seyal_ai.devices.transfer import SecureFileTransferBridge
from seyal_ai.devices.types import (
    DeviceNode,
    DeviceStatusEnum,
    DeviceType,
    FileTransferManifest,
    TaskHandoffPayload,
)

__all__ = [
    "DeviceStatusEnum",
    "DeviceType",
    "DeviceNode",
    "TaskHandoffPayload",
    "FileTransferManifest",
    "DeviceDiscoveryService",
    "SecureFileTransferBridge",
    "TaskHandoffEngine",
    "UnifiedDeviceManager",
]
