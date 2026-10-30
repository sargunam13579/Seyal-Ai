"""
Seyal AI Gemini Provider — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.providers.gemini
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.providers.gemini as _canonical_gemini

sys.modules.setdefault("seyal_ai.llm.providers.gemini", _canonical_gemini)

GeminiProvider = _canonical_gemini.GeminiProvider

__all__ = ["GeminiProvider"]
