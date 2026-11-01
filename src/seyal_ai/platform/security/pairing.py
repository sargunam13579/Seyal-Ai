"""
Seyal AI Device Pairing & Secure Handshake Subsystem.

Provides PIN-based and shared-secret pairing handshakes, session expiration,
paired device registry, and authorization verification.
"""

from __future__ import annotations

import hmac
import json
import os
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
import secrets
from typing import Any

from seyal_ai.platform.security.crypto import (
    KeyManager,
    SecretVault,
    restrict_directory_permissions,
    restrict_file_permissions,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("security.pairing")

PAIRING_TIMEOUT_SECONDS = 300.0  # 5 minutes
MAX_PIN_ATTEMPTS = 5


@dataclass
class PairingSession:
    """An active, pending pairing request session."""

    session_id: str
    device_name: str
    device_type: str
    pin: str
    created_at: float = field(default_factory=time.time)
    expires_at: float = field(default_factory=lambda: time.time() + PAIRING_TIMEOUT_SECONDS)
    ip_address: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    failed_attempts: int = 0
    max_attempts: int = MAX_PIN_ATTEMPTS

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    @property
    def is_exhausted(self) -> bool:
        return self.failed_attempts >= self.max_attempts


@dataclass
class PairedDevice:
    """An authorized, paired external device (e.g., Android phone, secondary laptop)."""

    device_id: str
    device_name: str
    device_type: str
    device_token: str
    paired_at: float = field(default_factory=time.time)
    last_seen_at: float = field(default_factory=time.time)
    ip_address: str | None = None
    permissions: list[str] = field(default_factory=lambda: ["file_transfer", "notifications", "device_control"])
    is_active: bool = True


class DevicePairingManager:
    """
    Manages pairing handshakes and persistent authorized devices.
    """

    def __init__(
        self,
        storage_path: str | Path | None = None,
        vault: SecretVault | None = None,
    ) -> None:
        if storage_path is None:
            home = Path.home()
            self.storage_path = home / ".seyal_ai" / "paired_devices.json"
        else:
            self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        restrict_directory_permissions(self.storage_path.parent)
        self._vault = vault
        self._pending_sessions: dict[str, PairingSession] = {}
        self._paired_devices: dict[str, PairedDevice] = {}
        if self.storage_path.exists():
            restrict_file_permissions(self.storage_path)
        self._load_devices()

    def _load_devices(self) -> None:
        if not self.storage_path.exists():
            return
        try:
            raw = self.storage_path.read_text(encoding="utf-8")
            if not raw.strip():
                return
            data = json.loads(raw)
            for d in data.get("devices", []):
                device = PairedDevice(**d)
                self._paired_devices[device.device_id] = device
        except Exception as e:
            log.warning("Could not load paired devices: %s", e)
            self._paired_devices = {}

    def _save_devices(self) -> None:
        tmp_storage: Path | None = None
        try:
            payload = {
                "version": "1.0",
                "updated_at": time.time(),
                "devices": [asdict(d) for d in self._paired_devices.values()],
            }
            tmp_storage = self.storage_path.parent / f".tmp_{secrets.token_hex(8)}.json"
            tmp_storage.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            restrict_file_permissions(tmp_storage)
            tmp_storage.replace(self.storage_path)
            restrict_file_permissions(self.storage_path)
        except Exception as e:
            if tmp_storage and tmp_storage.exists():
                tmp_storage.unlink(missing_ok=True)
            log.error("Failed to save paired devices: %s", e)

    def initiate_pairing(
        self,
        device_name: str,
        device_type: str = "phone",
        ip_address: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> PairingSession:
        """
        Start a new pairing handshake and generate a 6-digit verification PIN.
        """
        # Clean expired sessions
        self._cleanup_expired_sessions()

        session_id = KeyManager.generate_token(16)
        pin = KeyManager.generate_pin(6)

        session = PairingSession(
            session_id=session_id,
            device_name=device_name,
            device_type=device_type,
            pin=pin,
            ip_address=ip_address,
            metadata=metadata or {},
        )
        self._pending_sessions[session_id] = session
        log.info(
            "Pairing initiated for %s (%s) (expires in %ds, max attempts: %d)",
            device_name,
            session_id,
            int(PAIRING_TIMEOUT_SECONDS),
            session.max_attempts,
        )
        return session

    def verify_pairing(
        self,
        session_id: str,
        pin: str,
        device_id: str | None = None,
    ) -> PairedDevice | None:
        """
        Validate the PIN and complete pairing.
        Enforces a strict maximum of 5 failed attempts with constant-time comparison.
        """
        self._cleanup_expired_sessions()
        session = self._pending_sessions.get(session_id)
        if not session:
            log.warning("Pairing session %s not found, expired, or previously invalidated", session_id)
            return None

        # Check explicit expiration
        if session.is_expired:
            log.warning("Pairing session %s expired", session_id)
            del self._pending_sessions[session_id]
            return None

        # If already exhausted (defense-in-depth)
        if session.is_exhausted:
            log.warning("Pairing session %s previously exhausted failed attempts", session_id)
            del self._pending_sessions[session_id]
            return None

        def _register_failure(reason: str) -> None:
            session.failed_attempts += 1
            if session.failed_attempts >= session.max_attempts:
                del self._pending_sessions[session_id]
                log.warning(
                    "%s for session %s; reached %d failed attempts, session invalidated",
                    reason,
                    session_id,
                    session.failed_attempts,
                )
            else:
                log.warning(
                    "%s for session %s (attempt %d/%d)",
                    reason,
                    session_id,
                    session.failed_attempts,
                    session.max_attempts,
                )

        # Validate PIN type and format
        if not isinstance(pin, str):
            _register_failure("Invalid PIN type")
            return None

        cleaned_pin = pin.strip()
        if not cleaned_pin:
            _register_failure("Empty PIN provided")
            return None

        # Validate ASCII-only encoding (reject non-ASCII/Unicode without normalization or exceptions)
        if not cleaned_pin.isascii():
            _register_failure("Non-ASCII PIN provided")
            return None

        # Constant-time comparison using hmac.compare_digest
        try:
            is_match = hmac.compare_digest(session.pin, cleaned_pin)
        except Exception as e:
            log.warning("PIN comparison failed with exception for session %s: %s", session_id, e)
            _register_failure("PIN comparison error")
            return None

        if not is_match:
            _register_failure("Incorrect PIN")
            return None

        # Successful verification -> generate device credentials
        dev_id = device_id or f"dev_{KeyManager.generate_token(8)}"
        device_token = KeyManager.generate_token(32)

        paired_device = PairedDevice(
            device_id=dev_id,
            device_name=session.device_name,
            device_type=session.device_type,
            device_token=device_token,
            ip_address=session.ip_address,
        )

        self._paired_devices[dev_id] = paired_device
        self._save_devices()
        del self._pending_sessions[session_id]

        log.info("Device successfully paired: %s (ID: %s)", paired_device.device_name, dev_id)
        return paired_device

    def authenticate_device(self, device_id: str, device_token: str) -> bool:
        """
        Verify if an incoming device connection is authorized.
        """
        device = self._paired_devices.get(device_id)
        if not device or not device.is_active:
            return False
        if device.device_token == device_token:
            device.last_seen_at = time.time()
            return True
        return False

    def list_paired_devices(self) -> list[PairedDevice]:
        """Get all currently authorized devices."""
        return list(self._paired_devices.values())

    def get_paired_device(self, device_id: str) -> PairedDevice | None:
        """Get a paired device by ID."""
        return self._paired_devices.get(device_id)

    def revoke_device(self, device_id: str) -> bool:
        """Revoke pairing and block access for a device."""
        if device_id in self._paired_devices:
            dev = self._paired_devices[device_id]
            dev.is_active = False
            del self._paired_devices[device_id]
            self._save_devices()
            log.info("Revoked paired device: %s (%s)", dev.device_name, device_id)
            return True
        return False

    def clear_all(self) -> None:
        """Revoke all paired devices."""
        self._paired_devices.clear()
        self._save_devices()

    def _cleanup_expired_sessions(self) -> None:
        expired = [sid for sid, s in self._pending_sessions.items() if s.is_expired]
        for sid in expired:
            del self._pending_sessions[sid]
