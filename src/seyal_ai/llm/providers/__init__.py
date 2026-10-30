"""
Seyal AI LLM Providers — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.providers
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.providers as _canonical_providers

sys.modules.setdefault("seyal_ai.llm.providers", _canonical_providers)

BaseLLMProvider = _canonical_providers.BaseLLMProvider
ModelTier = _canonical_providers.ModelTier
LLMMessage = _canonical_providers.LLMMessage
LLMResponse = _canonical_providers.LLMResponse
ToolCallRequest = _canonical_providers.ToolCallRequest
ToolSchema = _canonical_providers.ToolSchema
GeminiProvider = _canonical_providers.GeminiProvider
OpenAIProvider = _canonical_providers.OpenAIProvider
AnthropicProvider = _canonical_providers.AnthropicProvider
OllamaProvider = _canonical_providers.OllamaProvider

__all__ = _canonical_providers.__all__
