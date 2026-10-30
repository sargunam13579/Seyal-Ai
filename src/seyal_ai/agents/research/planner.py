"""Seyal AI — Autonomous Research Agent: Research Planner."""

from __future__ import annotations

import json
from typing import Any

from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.research.planner")


class ResearchPlanner:
    """Decomposes a broad research topic into targeted search queries and sub-questions."""

    def __init__(self, router: ModelRouter | None = None) -> None:
        self._router = router or ModelRouter()

    async def generate_research_plan(self, topic: str) -> dict[str, Any]:
        """Generate a structured search plan and sub-questions for a topic."""
        prompt = (
            f"You are an expert Autonomous Research Agent. The user wants to research:\n\"{topic}\"\n\n"
            "Generate a structured research plan as valid JSON with keys:\n"
            "- 'title': concise research title\n"
            "- 'queries': list of 3-5 distinct, targeted search queries\n"
            "- 'key_aspects': list of 3-4 sub-questions to investigate\n"
            "Return strictly valid JSON without code fences."
        )

        resp = await self._router.generate(
            messages=[LLMMessage(role="user", content=prompt)],
            tier=ModelTier.FAST,
            temperature=0.2,
        )

        text = (resp.content or "").strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        try:
            plan = json.loads(text)
        except Exception:
            plan = {
                "title": topic,
                "queries": [topic, f"{topic} latest developments", f"{topic} analysis"],
                "key_aspects": ["Core definition", "Key trends", "Challenges"],
            }

        return plan
