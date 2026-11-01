"""Backward-compatibility forwarder for Seyal AI Security Layer.

Canonical location: `seyal_ai.platform.security`.
All submodules and symbols are aliased to the canonical platform security modules
to guarantee 100% object, class, and memory identity.
"""

from __future__ import annotations

import sys
from seyal_ai.platform import security as _canonical_sec
from seyal_ai.platform.security import (
    audit as _canonical_audit,
    auth as _canonical_auth,
    crypto as _canonical_crypto,
    guardrails as _canonical_guardrails,
    pairing as _canonical_pairing,
    permissions as _canonical_permissions,
    red_team as _canonical_red_team,
    redaction as _canonical_redaction,
    supabase_auth as _canonical_supabase_auth,
    terminal_security as _canonical_terminal_security,
)
from seyal_ai.security.approval_token import (
    ApprovalTokenManager,
    ApprovalTokenPayload,
    TokenExpiredError,
    TokenNotYetValidError,
    TokenSecurityError,
    TokenTamperedError,
    compute_target_hash,
    jcs_canonicalize,
)
from seyal_ai.security.nonce_store import (
    NonceAlreadyConsumedError,
    NonceExpiredError,
    NonceNotFoundError,
    NonceStoreError,
    SqliteNonceStore,
)
from seyal_ai.security.policy_engine import (
    PolicyDecision,
    PolicyEngine,
    RiskTier,
)
from seyal_ai.platform.security.audit import AuditLogger
from seyal_ai.platform.security.auth import AuthManager, RateLimitWindow
from seyal_ai.platform.security.crypto import (
    CryptographyUnavailableError,
    KeyManager,
    SecretEntry,
    SecretVault,
    SecurityPermissionError,
    restrict_directory_permissions,
    restrict_file_permissions,
)
from seyal_ai.platform.security.guardrails import (
    SafetyGuardrailsManager,
    SafetySettings,
    SecurityGuardrails,
    get_safety_guardrails,
)
from seyal_ai.platform.security.pairing import (
    DevicePairingManager,
    PairedDevice,
    PairingSession,
)
from seyal_ai.platform.security.permissions import (
    PermissionAction,
    PermissionEngine,
    PermissionScope,
    PermissionScopeManager,
    ScopeStatus,
)
from seyal_ai.platform.security.red_team import (
    AttackCategory,
    DefenseAction,
    DefenseVerdict,
    PromptInjectionClassifier,
    RedTeamGuard,
)
from seyal_ai.platform.security.redaction import REDACTED_STR, sanitize_payload
from seyal_ai.platform.security.supabase_auth import (
    SupabaseUser,
    decode_supabase_jwt,
    get_current_user,
    verify_supabase_token,
)
from seyal_ai.platform.security.terminal_security import (
    CommandAnalysisResult,
    CommandSafetyStatus,
    TerminalSecurityClassifier,
)

# 1. Alias all legacy submodule paths directly to canonical platform module instances
sys.modules["seyal_ai.security"] = _canonical_sec
sys.modules["seyal_ai.security.audit"] = _canonical_audit
sys.modules["seyal_ai.security.auth"] = _canonical_auth
sys.modules["seyal_ai.security.crypto"] = _canonical_crypto
sys.modules["seyal_ai.security.guardrails"] = _canonical_guardrails
sys.modules["seyal_ai.security.pairing"] = _canonical_pairing
sys.modules["seyal_ai.security.permissions"] = _canonical_permissions
sys.modules["seyal_ai.security.red_team"] = _canonical_red_team
sys.modules["seyal_ai.security.redaction"] = _canonical_redaction
sys.modules["seyal_ai.security.supabase_auth"] = _canonical_supabase_auth
sys.modules["seyal_ai.security.terminal_security"] = _canonical_terminal_security

__all__ = [
    "AuditLogger",
    "AuthManager",
    "RateLimitWindow",
    "CryptographyUnavailableError",
    "KeyManager",
    "SecretEntry",
    "SecretVault",
    "SecurityPermissionError",
    "restrict_file_permissions",
    "restrict_directory_permissions",
    "DevicePairingManager",
    "PairedDevice",
    "PairingSession",
    "PermissionAction",
    "PermissionEngine",
    "PermissionScope",
    "PermissionScopeManager",
    "ScopeStatus",
    "CommandAnalysisResult",
    "CommandSafetyStatus",
    "TerminalSecurityClassifier",
    "SafetySettings",
    "SafetyGuardrailsManager",
    "SecurityGuardrails",
    "get_safety_guardrails",
    "PromptInjectionClassifier",
    "RedTeamGuard",
    "AttackCategory",
    "DefenseAction",
    "DefenseVerdict",
    "REDACTED_STR",
    "sanitize_payload",
    "SupabaseUser",
    "decode_supabase_jwt",
    "verify_supabase_token",
    "get_current_user",
    "ApprovalTokenManager",
    "ApprovalTokenPayload",
    "TokenExpiredError",
    "TokenNotYetValidError",
    "TokenSecurityError",
    "TokenTamperedError",
    "compute_target_hash",
    "jcs_canonicalize",
    "SqliteNonceStore",
    "NonceStoreError",
    "NonceAlreadyConsumedError",
    "NonceExpiredError",
    "NonceNotFoundError",
    "PolicyEngine",
    "PolicyDecision",
    "RiskTier",
]
