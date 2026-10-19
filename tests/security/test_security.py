"""
Seyal AI — Comprehensive Security, Cryptography, Permissions & Device Pairing Test Suite.

Validates:
  - Cryptographic secret vault encryption on disk and key management
  - Terminal dangerous command classification and protection (e.g. format C:)
  - Master API authentication and API key lifecycle
  - Granular permission scopes (grant, revoke, tool execution allow/deny)
  - Android ADB device permission boundaries
  - Hardware device pairing handshakes, 6-digit PIN verification, and token revocation
  - Device pairing REST API endpoints (/api/pairing/*)
  - Connection recovery manager with exponential backoff
  - Assistant identity customization and confirmation flow
"""

from __future__ import annotations

from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from seyal_ai.api.app import create_app
from seyal_ai.core.brain import SeyalAiBrain
from seyal_ai.reliability.connection_recovery import ConnectionRecoveryManager
from seyal_ai.security.auth import AuthManager
from seyal_ai.security.crypto import KeyManager, SecretVault
from seyal_ai.security.pairing import DevicePairingManager
from seyal_ai.security.permissions import (
    PermissionAction,
    PermissionEngine,
    PermissionScope,
    PermissionScopeManager,
)
from seyal_ai.security.terminal_security import (
    CommandSafetyStatus,
    TerminalSecurityClassifier,
)
from seyal_ai.tools.base import RiskLevel

# ===========================================================================
# 1. CRYPTOGRAPHIC SECRET VAULT & KEY MANAGEMENT (SEC-01)
# ===========================================================================


class TestSecretVaultAndEncryption:
    """Verifies cryptographic vault encryption and disk safety."""

    def test_sec01_secret_vault_encryption(self, tmp_path: Path):
        """Secrets are encrypted on disk and never stored as plain text."""
        vault_path = tmp_path / "vault.enc"
        key_mgr = KeyManager(tmp_path / "keys")
        vault = SecretVault(vault_path=vault_path, key_manager=key_mgr)

        vault.set_secret("GEMINI_API_KEY", "sk-secret-key-12345")
        assert vault.get_secret("GEMINI_API_KEY") == "sk-secret-key-12345"

        # Ensure disk payload is encrypted and does not expose plain text
        raw_disk = vault_path.read_text(encoding="utf-8")
        assert "sk-secret-key-12345" not in raw_disk


# ===========================================================================
# 2. TERMINAL DANGEROUS COMMAND PROTECTION (SEC-02)
# ===========================================================================


class TestTerminalCommandProtection:
    """Verifies interception of high-risk / destructive system commands."""

    def test_sec02_dangerous_command_protection(self):
        """Destructive shell commands (e.g. format disk) are strictly BLOCKED."""
        guard = TerminalSecurityClassifier()
        blocked_cmd = "format C: /fs:NTFS"
        res = guard.classify_command(blocked_cmd)
        assert res.status == CommandSafetyStatus.BLOCKED


# ===========================================================================
# 3. API AUTHENTICATION & KEY LIFECYCLE (SEC-03)
# ===========================================================================


class TestApiAuthManager:
    """Verifies master key and granular API key validation."""

    def test_sec03_api_auth_lifecycle(self):
        """Master keys validate, new keys are created and can be revoked."""
        auth = AuthManager(master_api_key="nx_master_test_key")
        assert auth.validate_api_key("nx_master_test_key") is True
        assert auth.validate_api_key("nx_invalid_key") is False

        new_key = auth.create_api_key()
        assert auth.validate_api_key(new_key) is True
        auth.revoke_api_key(new_key)
        assert auth.validate_api_key(new_key) is False


# ===========================================================================
# 4. GRANULAR PERMISSION SCOPE MANAGEMENT (SEC-04)
# ===========================================================================


class TestPermissionScopeManagement:
    """Verifies granting, revoking, and persisting permission scopes."""

    def test_sec04_permission_grant_and_revocation(self, tmp_path: Path):
        """Dynamic scope changes immediately gate tool execution."""
        storage = tmp_path / "perms.json"
        mgr = PermissionScopeManager(storage_path=storage)

        # Explicitly grant scopes
        mgr.grant_scope(PermissionScope.CAMERA)
        mgr.grant_scope(PermissionScope.MICROPHONE)
        assert mgr.is_scope_granted(PermissionScope.CAMERA) is True
        assert mgr.is_scope_granted(PermissionScope.MICROPHONE) is True

        # Revoke camera
        mgr.revoke_scope(PermissionScope.CAMERA)
        assert mgr.is_scope_granted(PermissionScope.CAMERA) is False
        assert mgr.is_tool_allowed("capture_camera") is False

        # Grant back
        mgr.grant_scope(PermissionScope.CAMERA)
        assert mgr.is_scope_granted(PermissionScope.CAMERA) is True
        assert mgr.is_tool_allowed("capture_camera") is True


# ===========================================================================
# 5. ANDROID & DEVICE PERMISSION ENGINE (SEC-05)
# ===========================================================================


class TestDevicePermissionBoundaries:
    """Verifies device-specific tool gating."""

    def test_sec05_android_device_scope_check(self):
        """Android ADB requires DEVICE_CONTROL scope, denied otherwise."""
        engine = PermissionEngine()
        engine.scope_manager.grant_scope(PermissionScope.DEVICE_CONTROL)
        assert engine.scope_manager.is_tool_allowed("android_adb") is True

        engine.scope_manager.revoke_scope(PermissionScope.DEVICE_CONTROL)
        assert engine.scope_manager.is_tool_allowed("android_adb") is False
        assert engine.check_permission("android_adb", RiskLevel.MEDIUM) == PermissionAction.DENY


# ===========================================================================
# 6. HARDWARE DEVICE PAIRING LIFECYCLE (SEC-06)
# ===========================================================================


class TestDevicePairingHandshake:
    """Verifies 6-digit PIN pairing handshakes and token validation."""

    def test_sec06_pairing_handshake_lifecycle(self, tmp_path: Path):
        """Full pairing lifecycle: session initiation -> PIN check -> token auth -> revocation."""
        storage = tmp_path / "paired.json"
        mgr = DevicePairingManager(storage_path=storage)

        # 1. Initiate pairing
        session = mgr.initiate_pairing(device_name="Pixel 8 Pro", device_type="phone")
        assert len(session.pin) == 6
        assert session.is_expired is False

        # 2. Verify with wrong PIN
        bad_verify = mgr.verify_pairing(session.session_id, "000000")
        assert bad_verify is None

        # 3. Verify with correct PIN
        device = mgr.verify_pairing(session.session_id, session.pin)
        assert device is not None
        assert device.device_name == "Pixel 8 Pro"
        assert mgr.authenticate_device(device.device_id, device.device_token) is True

        # 4. Revoke device
        assert mgr.revoke_device(device.device_id) is True
        assert mgr.authenticate_device(device.device_id, device.device_token) is False


# ===========================================================================
# 7. DEVICE PAIRING REST API (SEC-07)
# ===========================================================================


class TestPairingRestEndpoints:
    """Verifies /api/pairing/* endpoint workflows."""

    @pytest.mark.asyncio
    async def test_sec07_pairing_api_lifecycle(self):
        """Tests initiate, verify, and list devices over HTTP."""
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Initiate pairing
            r1 = await client.post(
                "/api/pairing/initiate",
                json={"device_name": "Galaxy S24", "device_type": "phone"},
            )
            assert r1.status_code == 200
            data = r1.json()
            session_id = data["session_id"]
            pin = data["pin"]

            # 2. Verify pairing
            r2 = await client.post(
                "/api/pairing/verify",
                json={"session_id": session_id, "pin": pin},
            )
            assert r2.status_code == 200
            assert r2.json()["success"] is True

            # 3. List devices
            r3 = await client.get("/api/pairing/devices")
            assert r3.status_code == 200
            assert r3.json()["count"] >= 1


# ===========================================================================
# 8. CONNECTION RECOVERY WITH BACKOFF (SEC-08)
# ===========================================================================


class TestConnectionRecoveryBackoff:
    """Verifies resilient reconnection logic for peripheral targets."""

    @pytest.mark.asyncio
    async def test_sec08_reconnect_manager_backoff(self):
        """Recovery manager backs off exponentially and updates connection state."""
        mgr = ConnectionRecoveryManager(base_backoff_seconds=0.1, max_backoff_seconds=1.0)
        attempts = 0

        async def fake_reconnect():
            nonlocal attempts
            attempts += 1
            return attempts >= 2

        mgr.register_target("phone_adb", "android_adb", reconnect_coro=fake_reconnect)
        mgr.mark_disconnected("phone_adb", "Device unplugged")

        # First attempt fails
        assert await mgr.attempt_reconnect("phone_adb") is False
        # Second attempt succeeds
        assert await mgr.attempt_reconnect("phone_adb") is True
        st = mgr.get_state("phone_adb")
        assert st is not None
        assert st.is_connected is True


# ===========================================================================
# 9. ASSISTANT IDENTITY CUSTOMIZATION & CONFIRMATION (SEC-09)
# ===========================================================================


class TestAssistantIdentitySecurity:
    """Verifies that sensitive configuration changes require explicit user confirmation."""

    @pytest.mark.asyncio
    async def test_sec09_request_and_confirm_name_change(self):
        """Changing assistant identity requires two-turn confirmation."""
        brain = SeyalAiBrain()
        await brain.initialize()
        brain._identity.set_name("Seyal AI", sync_wake_word=True)

        prompt = await brain.process("Call yourself Aria from now on")
        assert "Aria" in prompt
        assert brain.confirmation.has_pending is True

        confirm_resp = await brain.process("yes")
        assert "Aria" in brain.name
        assert "Aria" in confirm_resp
