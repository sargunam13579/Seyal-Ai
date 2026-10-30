"""
Multi-Intent Decomposition & Greeting Helpers for Seyal AI Computer-Use Agent.

Defines:
- decompose_user_intents: Dynamically decomposes compound user requests into ordered sub-goals in ANY language.
- get_universal_convo_fallback: Dynamic conversational fallback respecting user's mother tongue and known languages.
- generate_task_acknowledgment: Instantaneous, natural spoken task acknowledgment in the user's EXACT language.
"""

from __future__ import annotations

import asyncio
import json
import re

from seyal_ai.llm.prompts.language_guardrail import (
    get_localized_response,
    get_user_language_profile,
)
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.decomposition")


async def get_universal_convo_fallback() -> str:
    """Dynamic conversation fallback respecting user's mother tongue and known languages."""
    mt, kl = get_user_language_profile()
    return get_localized_response("convo_fallback", mt, kl)


async def generate_task_acknowledgment(goal: str, router: ModelRouter | None = None) -> str:
    """
    Generate an instantaneous, natural spoken task acknowledgment in the user's EXACT language.
    Zero-delay local fast-path using universal language profile (0ms instead of 1.5s cloud LLM roundtrip).
    """
    clean_name = goal[:35].strip()
    mt, kl = get_user_language_profile()
    return get_localized_response("task_ack", mt, kl, item=clean_name)


async def decompose_user_intents(instruction: str, router: ModelRouter | None = None) -> list[str]:
    """
    Dynamically decomposes compound user requests into ordered sub-goals in ANY language.
    Zero hardcoding: Powered by Gemini Flash semantic reasoning.
    """
    cleaned = instruction.strip()
    if not cleaned:
        return []

    # Quick 0ms check: If there are no compound conjunctions/delimiters, it's a single goal
    conjunction_markers = (",", " and ", " then ", " apram ", " aduthu ", " aur ", " phir ", " y ", " et ", " und ")
    if not any(cm in f" {cleaned.lower()} " for cm in conjunction_markers):
        return [cleaned]

    try:
        r = router or ModelRouter()
        await r.initialize()
        prompt = (
            "You are an intelligent task planner for a computer assistant.\n"
            "The user gave an instruction that may contain one or multiple distinct goals/requests:\n"
            f'User instruction: "{instruction}"\n\n'
            "Analyze the sentence in whatever language it is spoken (English, Tamil, Tanglish, Hindi, Spanish, etc.).\n"
            "If it contains multiple distinct actions or questions (e.g. asking a question AND requesting a computer task), "
            "split them into an ordered list of clear, standalone sub-goals.\n"
            "If it is just a single goal with descriptive words, return a list with just that one goal.\n\n"
            "Output strictly valid JSON array of strings only:\n"
            '["sub-goal 1", "sub-goal 2", ...]'
        )
        res = await asyncio.wait_for(
            r.generate(
                messages=[LLMMessage(role="user", content=prompt)],
                tier=ModelTier.FAST,
                temperature=0.0,
            ),
            timeout=1.5,
        )
        content = (res.content or "").strip()
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            sub_goals = json.loads(match.group(0))
            if isinstance(sub_goals, list) and sub_goals:
                return [str(g).strip() for g in sub_goals if str(g).strip()]
    except Exception as e:
        log.debug("Dynamic intent decomposition notice: %s", e)

    return [cleaned]
