"""
Device Authorization Guard for Module 4.

Ensures every action against an Android device is authenticated via
a valid cryptographic pairing token managed by DevicePairingManager.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.agents.devices.models import DeviceUnauthorizedException
from seyal_ai.platform.security.pairing import DevicePairingManager
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.devices.pairing_guard")


class DevicePairingGuard:
    """
    Validates device authorization before executing any ADB action.
    """

    def __init__(self, pairing_manager: DevicePairingManager | None = None) -> None:
        self._pairing_manager = pairing_manager or DevicePairingManager()

    @property
    def pairing_manager(self) -> DevicePairingManager:
        return self._pairing_manager

    def verify_authorization(self, device_id: str, device_token: str | None) -> None:
        """
        Check that device is registered, active, and token matches.
        Raises DeviceUnauthorizedException if unauthorized.
        """
        if not device_id or not device_id.strip():
            raise DeviceUnauthorizedException("Missing or empty device_id.")

        if not device_token or not device_token.strip():
            raise DeviceUnauthorizedException(
                f"Missing device_token for device '{device_id}'. Pairing authorization required."
            )

        # Query pairing manager
        is_authenticated = self._pairing_manager.authenticate_device(device_id, device_token)
        if not is_authenticated:
            log.warning("Device authorization failed for device_id: %s", device_id)
            raise DeviceUnauthorizedException(
                f"Device '{device_id}' is unauthorized or token is invalid/revoked."
            )
