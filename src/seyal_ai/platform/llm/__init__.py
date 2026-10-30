"""
Seyal AI — Canonical Platform LLM Layer.

Provides unified LLM routing, multimodal providers (Gemini, OpenAI, Anthropic, Ollama),
prompts, system guardrails, and standardized message structures across all agents.
"""

from __future__ import annotations

from seyal_ai.platform.llm.prompts import (
    build_language_guardrail_prompt,
    build_system_prompt,
    get_identity_prompt,
    invalidate_user_language_profile_cache,
    is_tanglish_style,
    resolve_language_signals,
    resolve_response_language,
)
from seyal_ai.platform.llm.providers.anthropic import AnthropicProvider
from seyal_ai.platform.llm.providers.base import (
    BaseLLMProvider,
    LLMMessage,
    LLMResponse,
    ModelTier,
    ToolCallRequest,
    ToolSchema,
)
from seyal_ai.platform.llm.providers.gemini import GeminiProvider
from seyal_ai.platform.llm.providers.ollama import OllamaProvider
from seyal_ai.platform.llm.providers.openai import OpenAIProvider
from seyal_ai.platform.llm.router import PROVIDER_DEFAULT_MODELS, ModelRouter

__all__ = [
    # Router
    "ModelRouter",
    "PROVIDER_DEFAULT_MODELS",
    # Providers & Protocol
    "BaseLLMProvider",
    "ModelTier",
    "LLMMessage",
    "LLMResponse",
    "ToolCallRequest",
    "ToolSchema",
    "GeminiProvider",
    "OpenAIProvider",
    "AnthropicProvider",
    "OllamaProvider",
    # Prompts & Language
    "get_identity_prompt",
    "build_system_prompt",
    "build_language_guardrail_prompt",
    "resolve_language_signals",
    "resolve_response_language",
    "is_tanglish_style",
    "invalidate_user_language_profile_cache",
]
