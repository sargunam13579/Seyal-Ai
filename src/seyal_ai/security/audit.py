"""Backward-compatibility forwarder for `seyal_ai.security.audit`.

Canonical location: `seyal_ai.platform.security.audit`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import audit as _canonical_module
from seyal_ai.platform.security.audit import AuditLogger

sys.modules.setdefault("seyal_ai.security.audit", _canonical_module)

__all__ = ["AuditLogger"]
