"""
Seyal AI LLM — Backward Compatibility Forwarding Layer.

Routes legacy imports from `seyal_ai.llm.*` to the single canonical platform
implementation under `seyal_ai.platform.llm.*`.
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm as _canonical_llm
import seyal_ai.platform.llm.router as _canonical_router
import seyal_ai.platform.llm.providers as _canonical_providers
import seyal_ai.platform.llm.providers.base as _canonical_base
import seyal_ai.platform.llm.providers.gemini as _canonical_gemini
import seyal_ai.platform.llm.providers.openai as _canonical_openai
import seyal_ai.platform.llm.providers.anthropic as _canonical_anthropic
import seyal_ai.platform.llm.providers.ollama as _canonical_ollama
import seyal_ai.platform.llm.prompts as _canonical_prompts
import seyal_ai.platform.llm.prompts.system as _canonical_system
import seyal_ai.platform.llm.prompts.language_guardrail as _canonical_guardrail

# Alias all legacy module paths to canonical platform instances
sys.modules.setdefault("seyal_ai.llm", _canonical_llm)
sys.modules.setdefault("seyal_ai.llm.router", _canonical_router)
sys.modules.setdefault("seyal_ai.llm.providers", _canonical_providers)
sys.modules.setdefault("seyal_ai.llm.providers.base", _canonical_base)
sys.modules.setdefault("seyal_ai.llm.providers.gemini", _canonical_gemini)
sys.modules.setdefault("seyal_ai.llm.providers.openai", _canonical_openai)
sys.modules.setdefault("seyal_ai.llm.providers.anthropic", _canonical_anthropic)
sys.modules.setdefault("seyal_ai.llm.providers.ollama", _canonical_ollama)
sys.modules.setdefault("seyal_ai.llm.prompts", _canonical_prompts)
sys.modules.setdefault("seyal_ai.llm.prompts.system", _canonical_system)
sys.modules.setdefault("seyal_ai.llm.prompts.language_guardrail", _canonical_guardrail)

# Direct submodules
router = _canonical_router
providers = _canonical_providers
prompts = _canonical_prompts

def __getattr__(name: str):
    return getattr(_canonical_llm, name)

__all__ = _canonical_llm.__all__
