"""
Seyal AI Memory Types — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.memory.types
"""

from __future__ import annotations

import sys
import seyal_ai.platform.memory.types as _canonical_types

sys.modules.setdefault("seyal_ai.memory.types", _canonical_types)

MemoryCategory = _canonical_types.MemoryCategory
PrivacyLevel = _canonical_types.PrivacyLevel
MemoryRecord = _canonical_types.MemoryRecord
ContextState = _canonical_types.ContextState
_utcnow_iso = _canonical_types._utcnow_iso
_new_id = _canonical_types._new_id

__all__ = [
    "MemoryCategory",
    "PrivacyLevel",
    "MemoryRecord",
    "ContextState",
]
