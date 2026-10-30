"""
Seyal AI Memory Storage — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.memory.storage
"""

from __future__ import annotations

import sys
import seyal_ai.platform.memory.storage as _canonical_storage

sys.modules.setdefault("seyal_ai.memory.storage", _canonical_storage)

MemoryStorage = _canonical_storage.MemoryStorage

__all__ = ["MemoryStorage"]
