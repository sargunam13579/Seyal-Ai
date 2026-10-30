"""
Seyal AI LLM Prompts — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.prompts
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.prompts as _canonical_prompts

sys.modules.setdefault("seyal_ai.llm.prompts", _canonical_prompts)

get_identity_prompt = _canonical_prompts.get_identity_prompt
build_system_prompt = _canonical_prompts.build_system_prompt
build_language_guardrail_prompt = _canonical_prompts.build_language_guardrail_prompt
resolve_language_signals = _canonical_prompts.resolve_language_signals
resolve_response_language = _canonical_prompts.resolve_response_language
is_tanglish_style = _canonical_prompts.is_tanglish_style
invalidate_user_language_profile_cache = _canonical_prompts.invalidate_user_language_profile_cache

__all__ = _canonical_prompts.__all__
