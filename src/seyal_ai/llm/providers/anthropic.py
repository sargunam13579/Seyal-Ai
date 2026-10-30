"""
Seyal AI Anthropic Provider — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.providers.anthropic
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.providers.anthropic as _canonical_anthropic

sys.modules.setdefault("seyal_ai.llm.providers.anthropic", _canonical_anthropic)

AnthropicProvider = _canonical_anthropic.AnthropicProvider

__all__ = ["AnthropicProvider"]
