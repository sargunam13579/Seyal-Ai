"""
Seyal AI System Prompts — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.prompts.system
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.prompts.system as _canonical_system

sys.modules.setdefault("seyal_ai.llm.prompts.system", _canonical_system)

get_identity_prompt = _canonical_system.get_identity_prompt
build_system_prompt = _canonical_system.build_system_prompt

__all__ = ["get_identity_prompt", "build_system_prompt"]
