"""Seyal AI — Autonomous Deep Research Agent.

Orchestrates multi-query web search, source extraction, fact verification,
and structured research report synthesis.
"""

from __future__ import annotations

import time
from typing import Any

from seyal_ai.agents.research.planner import ResearchPlanner
from seyal_ai.agents.research.searcher import ResearchSearcher
from seyal_ai.agents.research.synthesizer import ResearchSynthesizer
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.events import get_event_bus
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.research")


class AutonomousResearchAgent:
    """Autonomous Deep Research Agent for multi-hop topic investigation."""

    def __init__(
        self,
        router: ModelRouter | None = None,
        planner: ResearchPlanner | None = None,
        searcher: ResearchSearcher | None = None,
        synthesizer: ResearchSynthesizer | None = None,
    ) -> None:
        self._router = router or ModelRouter()
        self._planner = planner or ResearchPlanner(self._router)
        self._searcher = searcher or ResearchSearcher()
        self._synthesizer = synthesizer or ResearchSynthesizer(self._router)
        self._event_bus = get_event_bus()

    async def execute_research(self, topic: str) -> dict[str, Any]:
        """Execute full autonomous research pipeline for a given topic."""
        start_time = time.perf_counter()
        log.info("Starting autonomous research on topic: '%s'", topic)

        await self._event_bus.emit("research.started", {"topic": topic})

        # 1. Plan
        plan = await self._planner.generate_research_plan(topic)
        queries = plan.get("queries", [topic])
        await self._event_bus.emit("research.planned", {"queries": queries})

        # 2. Search & Scrape
        sources = await self._searcher.search_and_extract(queries)
        await self._event_bus.emit("research.sources_gathered", {"count": len(sources)})

        # 3. Synthesize
        result = await self._synthesizer.synthesize_report(topic, plan, sources)
        result["elapsed_seconds"] = round(time.perf_counter() - start_time, 2)

        await self._event_bus.emit("research.completed", {"topic": topic, "sources_count": len(sources)})

        return result
