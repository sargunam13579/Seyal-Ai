"""Seyal AI — Personal Life OS: Daily Morning & Evening Briefings."""

from __future__ import annotations

import datetime
from typing import Any

from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.services.user_knowledge_service import user_knowledge_service
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.life_os.briefing")


class LifeBriefingCoordinator:
    """Coordinates daily morning kickoffs, schedule overviews, and evening reflection briefings."""

    def __init__(self, router: ModelRouter | None = None) -> None:
        self._router = router or ModelRouter()

    async def generate_morning_briefing(self, habits: list[dict[str, Any]]) -> str:
        """Synthesize a personalized morning executive kickoff."""
        now_str = datetime.datetime.now().strftime("%A, %B %d, %Y")
        knowledge_ctx = user_knowledge_service.get_knowledge_context() or "Focus on productivity."

        prompt = (
            f"You are the Seyal AI Life OS Personal Coach. Today is {now_str}.\n"
            f"User Standing Knowledge & Focus:\n{knowledge_ctx}\n"
            f"Today's Habits to Track:\n{habits}\n\n"
            "Generate an inspiring, concise morning executive briefing (under 120 words).\n"
            "Include a quick greeting, top 2 priorities for the day, and habit encouragement."
        )

        resp = await self._router.generate(
            messages=[LLMMessage(role="user", content=prompt)],
            tier=ModelTier.FAST,
            temperature=0.7,
        )

        return resp.content or f"Good morning! Ready to tackle {now_str}."
