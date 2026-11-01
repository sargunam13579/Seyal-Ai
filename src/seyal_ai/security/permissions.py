"""Backward-compatibility forwarder for `seyal_ai.security.permissions`.

Canonical location: `seyal_ai.platform.security.permissions`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import permissions as _canonical_module
from seyal_ai.platform.security.permissions import (
    PermissionAction,
    PermissionEngine,
    PermissionScope,
    PermissionScopeManager,
    ScopeStatus,
)

sys.modules.setdefault("seyal_ai.security.permissions", _canonical_module)

__all__ = [
    "PermissionAction",
    "PermissionEngine",
    "PermissionScope",
    "PermissionScopeManager",
    "ScopeStatus",
]
