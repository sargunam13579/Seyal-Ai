"""
Seyal AI — Intelligent 3-Way Conversational Steering & Intent Router.

Dispatches mid-flight interruptions and user utterances into:
1. CANCEL: Cleanly abort the active background task.
2. PIVOT: Cancel current goal and start a new goal immediately.
3. STEER: Inject live parameter adjustments into the running worker.
4. STATUS_QUERY: Live telemetry progress inquiry (e.g. "How much is left?").
5. SIDE_QUERY: Non-blocking conversational question answered concurrently while task continues.
"""

from __future__ import annotations

import asyncio
from enum import StrEnum
import json
import re
from typing import Any

from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.logging import get_logger

log = get_logger("planning.steering_router")


class IntentClassification(StrEnum):
    CANCEL = "cancel"
    PIVOT = "pivot"
    STEER = "steer"
    STATUS_QUERY = "status_query"
    SIDE_QUERY = "side_query"
    NEW_TASK = "new_task"


class SteeringIntentResult:
    def __init__(
        self,
        category: IntentClassification,
        clean_text: str,
        pivot_goal: str | None = None,
        reasoning: str = "",
    ) -> None:
        self.category = category
        self.clean_text = clean_text
        self.pivot_goal = pivot_goal
        self.reasoning = reasoning

    def __repr__(self) -> str:
        return f"SteeringIntentResult(category={self.category.value}, clean_text='{self.clean_text}', pivot_goal='{self.pivot_goal}')"


class SteeringIntentRouter:
    """
    Classifies user inputs received while background tasks or audio are active.
    Combines high-speed semantic matching with Fast LLM fallback for zero-keyword robustness.
    """

    def __init__(self, router: ModelRouter | None = None) -> None:
        self._router = router or ModelRouter()

    async def classify(
        self,
        user_input: str,
        active_task_goal: str | None = None,
    ) -> SteeringIntentResult:
        """
        Classify input into CANCEL, PIVOT, STEER, STATUS_QUERY, or SIDE_QUERY.
        """
        text = user_input.strip()
        lower = text.lower()

        # 1. Fast Path: Status Queries about running task
        status_markers = (
            "status", "progress", "how much time", "evalo neram", "mudinjitha", "mudinjatha",
            "did it finish", "finished yet", "kya chal raha", "completed yet", "epdi poguthu",
        )
        if any(sm in lower for sm in status_markers):
            return SteeringIntentResult(
                category=IntentClassification.STATUS_QUERY,
                clean_text=text,
                reasoning="Matched live status inquiry",
            )

        # 2. Fast Path: Task Pivot (e.g. "idhu venaam, do X", "stop and do X", "do Y instead")
        is_instead_of = "instead of" in lower or "bathila" in lower or "badle" in lower
        pivot_markers = (
            "actually do", "idhu venaam", "athu venaam", "adhu venaam", "change to",
            "switch to", "nahi balki", "stop and", "leave that", "forget that",
        )
        has_pivot = (any(pm in lower for pm in pivot_markers) or lower.endswith(" instead") or " do instead" in lower) and not is_instead_of
        if has_pivot:
            new_goal = text
            for pm in pivot_markers:
                if pm in lower:
                    parts = re.split(re.escape(pm), text, flags=re.IGNORECASE)
                    if len(parts) > 1 and parts[1].strip():
                        new_goal = parts[1].strip().lstrip(",:;- ")
                    break
            if (new_goal and new_goal.lower() != text.lower()) or "instead" in lower:
                return SteeringIntentResult(
                    category=IntentClassification.PIVOT,
                    clean_text=text,
                    pivot_goal=new_goal,
                    reasoning="Matched task pivot directive",
                )

        # 3. High-speed Fast Path: Emergency Stop (standalone cancel / halt)
        if re.search(r"\b(stop|cancel|pause|halt|niruthu|quit|exit|vendaam|venaam|ruk jao|chhod do)\b", lower):
            return SteeringIntentResult(
                category=IntentClassification.CANCEL,
                clean_text=text,
                reasoning="Matched emergency stop directive",
            )

        # 4. Fast Path: Conversational Questions & Side Queries
        side_markers = (
            "kizhamai", "weather", "mazhai", "temperature", "time", "neram", "date",
            "what is", "who is", "why", "how to", "puriyala", "explain", "meaning",
            "solren", "solla", "epdi irukku", "enna vishesham",
        )
        if any(sm in lower for sm in side_markers) and not any(m in lower for m in ("click", "type", "open", "scroll", "press")):
            return SteeringIntentResult(
                category=IntentClassification.SIDE_QUERY,
                clean_text=text,
                reasoning="Matched conversational side inquiry",
            )

        # 4. LLM Semantic Classification (for complex multilingual/code-switched inputs)
        try:
            await self._router.initialize()
            prompt = f"""You are a Seyal AI conversational steering router.
An autonomous task is currently RUNNING on the computer: "{active_task_goal or 'Autonomous Computer Task'}".
The user just interrupted or spoke: "{text}".

Classify the user's intent into EXACTLY ONE of these categories:
- "cancel": The user wants to cancel or stop the running task.
- "pivot": The user wants to abandon the current task and do a different task instead.
- "steer": The user is giving advice, correction, or guidance for the currently running task (e.g. click another button, search PDF).
- "status_query": The user is asking about the progress or status of the running task.
- "side_query": The user is asking an unrelated conversational question, chit-chat, or knowledge query (e.g. weather, time, explanation, "puriyala").
- "new_task": A completely new independent request.

Output strictly valid JSON:
{{
  "category": "cancel" | "pivot" | "steer" | "status_query" | "side_query" | "new_task",
  "pivot_goal": "new goal if pivot or new_task else null"
}}"""

            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.0,
                ),
                timeout=1.5,
            )

            raw = (res.content or "").strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()
            data = json.loads(raw)
            cat_str = str(data.get("category", "steer")).lower()
            try:
                category = IntentClassification(cat_str)
            except ValueError:
                category = IntentClassification.STEER

            return SteeringIntentResult(
                category=category,
                clean_text=text,
                pivot_goal=data.get("pivot_goal"),
                reasoning="LLM semantic classification",
            )
        except Exception as e:
            log.debug("Fallback to heuristic classification: %s", e)
            return SteeringIntentResult(
                category=IntentClassification.STEER,
                clean_text=text,
                reasoning="Fallback default",
            )
