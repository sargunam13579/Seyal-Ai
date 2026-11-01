"""
Comprehensive test suite verifying Phase B3.3: Platform Security Canonicalization.

Validates:
1. Canonical location (`seyal_ai.platform.security`) is fully functional.
2. Legacy location (`seyal_ai.security`) forwards 100% transparently.
3. Class identity: `AuditLogger_legacy is AuditLogger_canonical`, `KeyManager_legacy is KeyManager_canonical`, etc.
4. Cross-namespace interoperability: objects created in legacy namespace are perfectly interchangeable with canonical.
5. All security primitives maintain 100% memory and behavior parity.
"""

from __future__ import annotations

from pathlib import Path

import pytest

# 1. Canonical imports
from seyal_ai.platform.security import (
    AuditLogger as AuditLoggerCanonical,
    AuthManager as AuthManagerCanonical,
    DevicePairingManager as PairingMgrCanonical,
    KeyManager as KeyManagerCanonical,
    PermissionAction as PermActionCanonical,
    PermissionEngine as PermEngineCanonical,
    PermissionScope as PermScopeCanonical,
    RedTeamGuard as RedTeamGuardCanonical,
    SecretVault as SecretVaultCanonical,
    SecurityGuardrails as SecurityGuardrailsCanonical,
    TerminalSecurityClassifier as TermClassifierCanonical,
    restrict_directory_permissions as restrict_dir_canonical,
    restrict_file_permissions as restrict_file_canonical,
    sanitize_payload as sanitize_canonical,
)
from seyal_ai.platform.security.pairing import PairedDevice as PairedDeviceCanonical

# 2. Legacy imports
from seyal_ai.security import (
    AuditLogger as AuditLoggerLegacy,
    AuthManager as AuthManagerLegacy,
    DevicePairingManager as PairingMgrLegacy,
    KeyManager as KeyManagerLegacy,
    PermissionAction as PermActionLegacy,
    PermissionEngine as PermEngineLegacy,
    PermissionScope as PermScopeLegacy,
    SecretVault as SecretVaultLegacy,
    TerminalSecurityClassifier as TermClassifierLegacy,
)
from seyal_ai.security.guardrails import SecurityGuardrails as SecurityGuardrailsLegacy
from seyal_ai.security.pairing import PairedDevice as PairedDeviceLegacy
from seyal_ai.security.red_team import RedTeamGuard as RedTeamGuardLegacy
from seyal_ai.security.redaction import sanitize_payload as sanitize_legacy


class TestSecurityCanonicalization:
    """Verifies class identities, object interoperability, and forwarder transparency."""

    def test_class_identities(self):
        """CANON-01 & CANON-02: Legacy classes are identical objects to canonical platform classes."""
        assert AuditLoggerLegacy is AuditLoggerCanonical
        assert KeyManagerLegacy is KeyManagerCanonical
        assert SecretVaultLegacy is SecretVaultCanonical
        assert PairingMgrLegacy is PairingMgrCanonical
        assert PairedDeviceLegacy is PairedDeviceCanonical
        assert PermEngineLegacy is PermEngineCanonical
        assert PermScopeLegacy is PermScopeCanonical
        assert PermActionLegacy is PermActionCanonical
        assert AuthManagerLegacy is AuthManagerCanonical
        assert TermClassifierLegacy is TermClassifierCanonical
        assert SecurityGuardrailsLegacy is SecurityGuardrailsCanonical
        assert RedTeamGuardLegacy is RedTeamGuardCanonical
        assert sanitize_legacy is sanitize_canonical

    def test_cross_namespace_redaction(self):
        """Redaction function behaves identically across both import paths."""
        payload = {"user": "Alice", "password": "supersecretpassword123"}
        clean_legacy = sanitize_legacy(payload)
        clean_canonical = sanitize_canonical(payload)

        assert clean_legacy == clean_canonical
        assert clean_legacy["password"] == "[REDACTED]"
        assert clean_legacy["user"] == "Alice"

    def test_cross_namespace_crypto_and_vault(self, tmp_path: Path):
        """KeyManager created via legacy works interchangeably with SecretVault from canonical."""
        key_dir = tmp_path / "keys"
        vault_path = tmp_path / "vault.enc"

        # Initialize with legacy
        key_mgr_legacy = KeyManagerLegacy(key_dir=key_dir)
        vault_canonical = SecretVaultCanonical(vault_path=vault_path, key_manager=key_mgr_legacy)

        vault_canonical.set_secret("STRIPE_KEY", "sk_live_123456789")

        # Reload with legacy
        vault_legacy = SecretVaultLegacy(vault_path=vault_path, key_manager=key_mgr_legacy)
        assert vault_legacy.get_secret("STRIPE_KEY") == "sk_live_123456789"

    def test_cross_namespace_device_pairing(self, tmp_path: Path):
        """Device paired via canonical manager is persisted and authenticated via legacy manager."""
        storage = tmp_path / "paired_devices.json"
        mgr_canonical = PairingMgrCanonical(storage_path=storage)

        session = mgr_canonical.initiate_pairing("OnePlus 12", "phone")
        paired = mgr_canonical.verify_pairing(session.session_id, session.pin)
        assert paired is not None
        assert isinstance(paired, PairedDeviceCanonical)
        assert isinstance(paired, PairedDeviceLegacy)

        # Legacy instance loads from disk and authenticates
        mgr_legacy = PairingMgrLegacy(storage_path=storage)
        assert mgr_legacy.authenticate_device(paired.device_id, paired.device_token) is True

