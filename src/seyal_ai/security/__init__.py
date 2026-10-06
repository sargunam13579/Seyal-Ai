"""
Seyal AI Security Package.

Provides authentication, cryptography & secret vault, device pairing,
granular permission scopes, terminal command safety, and audit logging.
"""

from seyal_ai.security.audit import AuditLogger
from seyal_ai.security.auth import AuthManager, RateLimitWindow
from seyal_ai.security.crypto import KeyManager, SecretEntry, SecretVault
from seyal_ai.security.pairing import DevicePairingManager, PairedDevice, PairingSession
from seyal_ai.security.permissions import (
    PermissionAction,
    PermissionEngine,
    PermissionScope,
    PermissionScopeManager,
    ScopeStatus,
)
from seyal_ai.security.terminal_security import (
    CommandAnalysisResult,
    CommandSafetyStatus,
    TerminalSecurityClassifier,
)

__all__ = [
    "AuditLogger",
    "AuthManager",
    "RateLimitWindow",
    "KeyManager",
    "SecretEntry",
    "SecretVault",
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
]
