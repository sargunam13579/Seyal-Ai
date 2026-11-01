"""Backward-compatibility forwarder for `seyal_ai.security.crypto`.

Canonical location: `seyal_ai.platform.security.crypto`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import crypto as _canonical_module
from seyal_ai.platform.security.crypto import (
    CryptographyUnavailableError,
    KeyManager,
    SecretEntry,
    SecretVault,
    SecurityPermissionError,
    restrict_directory_permissions,
    restrict_file_permissions,
)

sys.modules.setdefault("seyal_ai.security.crypto", _canonical_module)

__all__ = [
    "CryptographyUnavailableError",
    "KeyManager",
    "SecretEntry",
    "SecretVault",
    "SecurityPermissionError",
    "restrict_file_permissions",
    "restrict_directory_permissions",
]
