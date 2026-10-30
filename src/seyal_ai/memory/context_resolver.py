"""
Seyal AI Context Resolver — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.memory.context_resolver
"""

from __future__ import annotations

import sys
import seyal_ai.platform.memory.context_resolver as _canonical_context_resolver

sys.modules.setdefault("seyal_ai.memory.context_resolver", _canonical_context_resolver)

ContextResolver = _canonical_context_resolver.ContextResolver
_PRONOUN_PATTERNS = _canonical_context_resolver._PRONOUN_PATTERNS
_PROJECT_PATTERNS = _canonical_context_resolver._PROJECT_PATTERNS

__all__ = ["ContextResolver"]
