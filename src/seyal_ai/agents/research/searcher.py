"""Seyal AI — Autonomous Research Agent: Multi-Source Searcher & Scraper."""

from __future__ import annotations

from typing import Any

from seyal_ai.tools.browser.web_tools.navigation import WebSearchBrowserTool
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.research.searcher")


class ResearchSearcher:
    """Executes multi-query web searches and extracts content from top results."""

    def __init__(self, search_tool: WebSearchBrowserTool | None = None) -> None:
        self._search_tool = search_tool or WebSearchBrowserTool()

    async def search_and_extract(
        self, queries: list[str], max_results_per_query: int = 3
    ) -> list[dict[str, Any]]:
        """Run web searches for all queries and aggregate distinct sources."""
        sources: list[dict[str, Any]] = []
        seen_urls: set[str] = set()

        for query in queries:
            try:
                res = await self._search_tool.execute(query=query)
                if res.success:
                    url = res.metadata.get("url") or f"https://duckduckgo.com/?q={query}"
                    title = res.metadata.get("title") or query
                    if url not in seen_urls:
                        seen_urls.add(url)
                        sources.append({
                            "title": title,
                            "url": url,
                            "snippet": res.message,
                            "query": query,
                        })
            except Exception as e:
                log.warning("Search query '%s' failed: %s", query, e)

        return sources
