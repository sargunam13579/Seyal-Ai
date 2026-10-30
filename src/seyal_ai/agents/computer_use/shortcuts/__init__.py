"""
Seyal AI Universal Multilingual Shortcut-First Acceleration Package.
"""

from __future__ import annotations

from .catalog import (
    CANONICAL_SHORTCUTS,
    COMPOUND_DELIMITERS,
    EXPLICIT_MOUSE_PATTERNS,
)
from .heuristic import (
    FAST_CACHE,
    detect_fast_shortcut,
    is_explicit_mouse_request,
)
from .semantic import resolve_universal_shortcut

__all__ = [
    "CANONICAL_SHORTCUTS",
    "COMPOUND_DELIMITERS",
    "EXPLICIT_MOUSE_PATTERNS",
    "FAST_CACHE",
    "is_explicit_mouse_request",
    "detect_fast_shortcut",
    "resolve_universal_shortcut",
]
