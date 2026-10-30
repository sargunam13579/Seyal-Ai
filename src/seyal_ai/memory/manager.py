"""
Seyal AI Unified Memory Manager — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.memory.manager
"""

from __future__ import annotations

import sys
import seyal_ai.platform.memory.manager as _canonical_manager

sys.modules.setdefault("seyal_ai.memory.manager", _canonical_manager)

MemoryManager = _canonical_manager.MemoryManager
_PREFERENCE_LEARNING_PATTERNS = _canonical_manager._PREFERENCE_LEARNING_PATTERNS

__all__ = ["MemoryManager"]
