"""Seyal AI — Autonomous Research Agent: Deep Report Synthesizer."""

from __future__ import annotations

from typing import Any

from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.research.synthesizer")


class ResearchSynthesizer:
    """Synthesizes extracted multi-source content into a comprehensive structured report with citations."""

    def __init__(self, router: ModelRouter | None = None) -> None:
        self._router = router or ModelRouter()

    async def synthesize_report(
        self,
        topic: str,
        plan: dict[str, Any],
        sources: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Generate a complete Markdown research report with executive summary, findings, and citations."""
        sources_summary = "\n".join(
            f"[{idx+1}] {s.get('title', 'Source')}: {s.get('snippet', '')} (URL: {s.get('url', '')})"
            for idx, s in enumerate(sources[:12])
        )

        prompt = (
            f"You are a Senior Autonomous Research Analyst. Write an exhaustive, deeply researched report on:\n"
            f"Topic: {topic}\n\n"
            f"Key Aspects to Cover: {plan.get('key_aspects', [])}\n\n"
            f"Aggregated Sources:\n{sources_summary}\n\n"
            "Formatting Requirements:\n"
            "1. # Executive Summary\n"
            "2. ## Key Discoveries & Technical Insights\n"
            "3. ## Comparative Breakdown & Challenges\n"
            "4. ## Future Outlook & Strategic Recommendations\n"
            "5. ## References & Citations (Include source numbers and links)\n"
            "Write in crisp, authoritative, professional Markdown with inline citations like [1], [2]."
        )

        resp = await self._router.generate(
            messages=[LLMMessage(role="user", content=prompt)],
            tier=ModelTier.PRIMARY,
            temperature=0.3,
        )

        report_md = resp.content or "No synthesis generated."

        return {
            "topic": topic,
            "title": plan.get("title", topic),
            "report_markdown": report_md,
            "sources_count": len(sources),
            "sources": sources,
        }
