"""
Seyal AI Language Guardrail — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.prompts.language_guardrail
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.prompts.language_guardrail as _canonical_guardrail

sys.modules.setdefault("seyal_ai.llm.prompts.language_guardrail", _canonical_guardrail)

# Attribute proxying to ensure full compatibility for all exported functions & attributes
build_language_guardrail_prompt = _canonical_guardrail.build_language_guardrail_prompt
resolve_language_signals = _canonical_guardrail.resolve_language_signals
resolve_response_language = _canonical_guardrail.resolve_response_language
is_tanglish_style = _canonical_guardrail.is_tanglish_style
invalidate_user_language_profile_cache = _canonical_guardrail.invalidate_user_language_profile_cache

def __getattr__(name: str):
    return getattr(_canonical_guardrail, name)
