"""
Seyal AI — Telemetry & Shared State Hub (Thread 4).

Thread-safe registry that bridges background execution workers (Thread 3)
with the conversational brain (Thread 2) and visual HUD WebSockets.
"""

from __future__ import annotations

import time
from typing import Any
from dataclasses import dataclass, field

from seyal_ai.utils.logging import get_logger

log = get_logger("core.telemetry_hub")


@dataclass
class ActiveTaskState:
    task_id: str
    goal: str
    start_time: float = field(default_factory=time.time)
    current_step: int = 0
    max_steps: int = 20
    current_thought: str = ""
    last_action: str = ""
    is_active: bool = True
    progress_percent: int = 0
    status_summary: str = "Starting"


class TelemetryHub:
    """
    Central shared state bus for all running autonomous and background tasks.
    Enables live conversational status querying (e.g. 'How is it going?')
    without disturbing active execution workers.
    """

    _instance: TelemetryHub | None = None

    def __init__(self) -> None:
        self._active_tasks: dict[str, ActiveTaskState] = {}
        self._primary_task_id: str | None = None

    @classmethod
    def get_instance(cls) -> TelemetryHub:
        if cls._instance is None:
            cls._instance = TelemetryHub()
        return cls._instance

    def register_task(self, task_id: str, goal: str, max_steps: int = 20) -> ActiveTaskState:
        state = ActiveTaskState(task_id=task_id, goal=goal, max_steps=max_steps)
        self._active_tasks[task_id] = state
        self._primary_task_id = task_id
        log.info("Registered active task in TelemetryHub: %s ('%s')", task_id, goal)
        return state

    def update_task_progress(
        self,
        task_id: str,
        step: int,
        thought: str = "",
        action_summary: str = "",
        progress_percent: int | None = None,
    ) -> None:
        if task_id in self._active_tasks:
            state = self._active_tasks[task_id]
            state.current_step = step
            if thought:
                state.current_thought = thought
            if action_summary:
                state.last_action = action_summary
            if progress_percent is not None:
                state.progress_percent = progress_percent
            else:
                pct = int((step / max(1, state.max_steps)) * 100)
                state.progress_percent = min(99, max(5, pct))
            state.status_summary = f"Step {step}/{state.max_steps}: {action_summary or thought or 'Working'}"

    def complete_task(self, task_id: str, success: bool = True, final_summary: str = "") -> None:
        if task_id in self._active_tasks:
            state = self._active_tasks[task_id]
            state.is_active = False
            state.progress_percent = 100 if success else state.progress_percent
            state.status_summary = final_summary or ("Completed successfully" if success else "Failed")
            if self._primary_task_id == task_id:
                self._primary_task_id = None
            log.info("Completed task in TelemetryHub: %s (success=%s)", task_id, success)

    def cancel_task(self, task_id: str, reason: str = "User cancelled") -> None:
        if task_id in self._active_tasks:
            state = self._active_tasks[task_id]
            state.is_active = False
            state.status_summary = f"Cancelled: {reason}"
            if self._primary_task_id == task_id:
                self._primary_task_id = None
            log.info("Cancelled task in TelemetryHub: %s", task_id)

    def get_primary_active_task(self) -> ActiveTaskState | None:
        if self._primary_task_id and self._primary_task_id in self._active_tasks:
            state = self._active_tasks[self._primary_task_id]
            if state.is_active:
                return state
        # Find any other active task
        for state in self._active_tasks.values():
            if state.is_active:
                return state
        return None

    def get_live_status_narrative(self) -> str | None:
        """
        Produce a human-like live progress brief for the conversational brain.
        """
        task = self.get_primary_active_task()
        if not task:
            return None
        elapsed = round(time.time() - task.start_time, 1)
        return (
            f"Active Background Task: '{task.goal}'\n"
            f"Progress: {task.progress_percent}% (Step {task.current_step} of {task.max_steps})\n"
            f"Current Activity: {task.last_action or task.current_thought or 'Processing'}\n"
            f"Elapsed Time: {elapsed} seconds"
        )
