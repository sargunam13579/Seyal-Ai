"""
Seyal AI OpenAI Provider — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.providers.openai
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.providers.openai as _canonical_openai

sys.modules.setdefault("seyal_ai.llm.providers.openai", _canonical_openai)

OpenAIProvider = _canonical_openai.OpenAIProvider

__all__ = ["OpenAIProvider"]
