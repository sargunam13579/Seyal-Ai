"""Seyal AI — Personal Life Operating System Agent.

Orchestrates daily life tracking, habit loops, morning executive briefings,
and wellness balance.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.agents.life_os.briefing import LifeBriefingCoordinator
from seyal_ai.agents.life_os.habits import HabitTracker
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.life_os")


class PersonalLifeOsAgent:
    """Personal Life Operating System Agent."""

    def __init__(
        self,
        router: ModelRouter | None = None,
        habits: HabitTracker | None = None,
        briefing: LifeBriefingCoordinator | None = None,
    ) -> None:
        self._router = router or ModelRouter()
        self._habits = habits or HabitTracker()
        self._briefing = briefing or LifeBriefingCoordinator(self._router)

    async def get_daily_status(self) -> dict[str, Any]:
        """Fetch daily overview and briefing."""
        habits_list = self._habits.list_habits()
        briefing_text = await self._briefing.generate_morning_briefing(habits_list)

        return {
            "status": "success",
            "agent": "life_os",
            "briefing": briefing_text,
            "habits": habits_list,
        }
