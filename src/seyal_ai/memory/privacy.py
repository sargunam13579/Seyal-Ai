"""
Seyal AI Memory Privacy — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.memory.privacy
"""

from __future__ import annotations

import sys
import seyal_ai.platform.memory.privacy as _canonical_privacy

sys.modules.setdefault("seyal_ai.memory.privacy", _canonical_privacy)

MemoryPrivacyFilter = _canonical_privacy.MemoryPrivacyFilter
_SENSITIVE_PATTERNS = _canonical_privacy._SENSITIVE_PATTERNS

__all__ = ["MemoryPrivacyFilter"]
