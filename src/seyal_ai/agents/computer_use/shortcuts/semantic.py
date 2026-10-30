"""
Tier 2 Universal Semantic Shortcut Classifier via LLM.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import TYPE_CHECKING

from seyal_ai.agents.computer_use.protocol import ComputerAction
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.utils.logging import get_logger

from .catalog import CANONICAL_SHORTCUTS, COMPOUND_DELIMITERS
from .heuristic import detect_fast_shortcut, is_explicit_mouse_request

if TYPE_CHECKING:
    from seyal_ai.llm.router import ModelRouter

log = get_logger("agents.computer_use.shortcuts.semantic")


async def resolve_universal_shortcut(
    goal: str,
    router: ModelRouter | None = None,
) -> ComputerAction | None:
    """
    Universal Multilingual Shortcut Resolver (Tier 1 + Tier 2).
    
    1. Runs Tier 1 Fast Regex cache (0ms).
    2. If not matched, runs Tier 2 Universal Semantic Classifier via Gemini Flash (150ms)
       which handles ANY natural language (Pure Tamil, Hindi, Telugu, French, Spanish,
       German, colloquial Tanglish, regional slang, synonyms).
    """
    # 1. Tier 1 Instant Fast Match
    fast_match = detect_fast_shortcut(goal)
    if fast_match:
        return fast_match

    # If explicit mouse was commanded, immediately yield to mouse engine
    if is_explicit_mouse_request(goal):
        return None

    # Check for deep compound commands
    cleaned = goal.lower().strip()
    temp_cleaned = cleaned.replace("find and replace", "find_replace")
    if any(cw in f" {temp_cleaned} " for cw in COMPOUND_DELIMITERS):
        return None

    # 2. Tier 2 Universal Semantic Classifier
    try:
        if router is None:
            from seyal_ai.llm.router import ModelRouter
            r = ModelRouter()
        else:
            r = router
        await r.initialize()

        shortcut_options = "\n".join(f"- \"{k}\": {desc}" for k, (_, desc) in CANONICAL_SHORTCUTS.items())
        prompt = (
            "You are the Windows OS Shortcut Acceleration Engine.\n"
            "Analyze the user's computer command in WHATEVER language it is spoken (English, Tamil, Tanglish, Hindi, Telugu, Malayalam, Spanish, French, German, Japanese, etc.).\n"
            "Determine if this instruction can be executed with 100% precision by a single standard Windows keyboard shortcut or keypress.\n\n"
            f"AVAILABLE SHORTCUTS:\n{shortcut_options}\n"
            "- \"NONE\": If it is a compound/multi-step instruction (e.g. 'open camera and close it', 'do X then Y'), requires mouse navigation, opening a third-party website, drawing, complex workflow, or has no direct single shortcut.\n\n"
            f"User input: \"{goal}\"\n\n"
            "Output strictly valid JSON only:\n"
            "{\"shortcut\": \"<key from list or NONE>\", \"mouse_override\": <true if user explicitly asked to use mouse else false>}"
        )

        res = await asyncio.wait_for(
            r.generate(
                messages=[LLMMessage(role="user", content=prompt)],
                tier=ModelTier.FAST,
                temperature=0.0,
            ),
            timeout=1.5,
        )

        raw_text = (res.content or "").strip()
        # Extract JSON block
        json_match = re.search(r"\{.*?\}", raw_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            if data.get("mouse_override"):
                log.info("Tier 2 detected explicit mouse override for: '%s'", goal)
                return None

            selected_key = str(data.get("shortcut", "")).lower().strip()
            if selected_key in CANONICAL_SHORTCUTS:
                act_type, desc = CANONICAL_SHORTCUTS[selected_key]
                log.info("Tier 2 Universal Semantic matched '%s' -> %s (%s)", selected_key, act_type, desc)
                return ComputerAction(
                    action_type=act_type,
                    key=selected_key,
                    reasoning=f"Universal Shortcut Acceleration: {desc}",
                )
    except Exception as e:
        log.debug("Universal semantic shortcut classification fallback: %s", e)

    return None
