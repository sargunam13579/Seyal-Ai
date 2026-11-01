"""Seyal AI Platform Security Layer.

Canonical location for all platform security infrastructure:
- Audit logging & recursive parameter redaction
- Cryptography, key management, and NTFS/POSIX ACLs
- Device pairing and session protection
- Permissions & scope evaluation
- Authentication & rate limiting
- Supabase JWT authentication
- Terminal dangerous command classification
- Guardrails & red team prompt injection defenses
"""

from __future__ import annotations

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
from seyal_ai.platform.security.guardrails import SecurityGuardrails
from seyal_ai.platform.security.pairing import DevicePairingManager, PairedDevice, PairingSession
from seyal_ai.platform.security.permissions import (
    PermissionAction,
    PermissionEngine,
    PermissionScope,
    PermissionScopeManager,
    ScopeStatus,
)
from seyal_ai.platform.security.red_team import PromptInjectionClassifier, RedTeamGuard
from seyal_ai.platform.security.redaction import sanitize_payload
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

__all__ = [
    # Audit & Redaction
    "AuditLogger",
    "sanitize_payload",
    # Auth
    "AuthManager",
    "RateLimitWindow",
    "SupabaseUser",
    "decode_supabase_jwt",
    "verify_supabase_token",
    "get_current_user",
    # Crypto & ACLs
    "CryptographyUnavailableError",
    "KeyManager",
    "SecretEntry",
    "SecretVault",
    "SecurityPermissionError",
    "restrict_file_permissions",
    "restrict_directory_permissions",
    # Pairing
    "DevicePairingManager",
    "PairedDevice",
    "PairingSession",
    # Permissions
    "PermissionAction",
    "PermissionEngine",
    "PermissionScope",
    "PermissionScopeManager",
    "ScopeStatus",
    # Terminal Security
    "CommandAnalysisResult",
    "CommandSafetyStatus",
    "TerminalSecurityClassifier",
    # Guardrails & Red Team
    "SecurityGuardrails",
    "PromptInjectionClassifier",
    "RedTeamGuard",
]
