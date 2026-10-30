"""Seyal AI — Personal Life OS: Habits, Routines, and Goals Tracker."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.life_os.habits")


@dataclass
class HabitItem:
    id: str
    name: str
    category: str  # health, focus, productivity, learning
    streak_days: int = 0
    target_frequency: str = "daily"
    completed_today: bool = False


class HabitTracker:
    """Manages user daily habits, routines, and streaks."""

    def __init__(self, data_file: Path | None = None) -> None:
        self._data_file = data_file or Path("config/habits.json")

    def list_habits(self) -> list[dict[str, Any]]:
        """Return list of current habits."""
        if not self._data_file.exists():
            return [
                asdict(HabitItem("h1", "Morning Focus Session", "productivity", 3)),
                asdict(HabitItem("h2", "Drink 2L Water", "health", 7)),
                asdict(HabitItem("h3", "Daily Reading (15 mins)", "learning", 5)),
            ]
        try:
            with open(self._data_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def toggle_habit(self, habit_id: str) -> dict[str, Any]:
        """Toggle habit completion status for today."""
        habits = self.list_habits()
        for h in habits:
            if h.get("id") == habit_id:
                h["completed_today"] = not h.get("completed_today", False)
                if h["completed_today"]:
                    h["streak_days"] = h.get("streak_days", 0) + 1
                return {"success": True, "habit": h}
        return {"success": False, "error": "Habit not found"}
