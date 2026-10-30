"""
Seyal AI LLM Provider Base Interface — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.providers.base
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.providers.base as _canonical_base

sys.modules.setdefault("seyal_ai.llm.providers.base", _canonical_base)

ModelTier = _canonical_base.ModelTier
LLMMessage = _canonical_base.LLMMessage
ToolCallRequest = _canonical_base.ToolCallRequest
LLMResponse = _canonical_base.LLMResponse
ToolSchema = _canonical_base.ToolSchema
BaseLLMProvider = _canonical_base.BaseLLMProvider

__all__ = [
    "ModelTier",
    "LLMMessage",
    "ToolCallRequest",
    "LLMResponse",
    "ToolSchema",
    "BaseLLMProvider",
]
