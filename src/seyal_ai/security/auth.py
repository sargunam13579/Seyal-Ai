"""Backward-compatibility forwarder for `seyal_ai.security.auth`.

Canonical location: `seyal_ai.platform.security.auth`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import auth as _canonical_module
from seyal_ai.platform.security.auth import AuthManager, RateLimitWindow

sys.modules.setdefault("seyal_ai.security.auth", _canonical_module)

__all__ = ["AuthManager", "RateLimitWindow"]
