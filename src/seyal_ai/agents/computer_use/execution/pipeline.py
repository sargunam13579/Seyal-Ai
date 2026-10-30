"""
Goal Pipeline, Macro Expansion, and Compound Multi-Intent Execution.
"""

from __future__ import annotations

import asyncio
import sys
from typing import TYPE_CHECKING, Any

from seyal_ai.agents.computer_use.decomposition import decompose_user_intents
from seyal_ai.agents.computer_use.protocol import AgentStatus, StepRecord
from seyal_ai.utils.logging import get_logger

if TYPE_CHECKING:
    from seyal_ai.llm.router import ModelRouter
    from seyal_ai.utils.events import EventBus

log = get_logger("agents.computer_use.execution.pipeline")


def _get_agent_attr(name: str, fallback: Any) -> Any:
    mod = sys.modules.get("seyal_ai.agents.computer_use.agent")
    return getattr(mod, name, fallback) if mod else fallback


class PipelineExecutionMixin:
    """Provides methods for goal pipeline management, macro expansion, and compound multi-intent execution."""

    if TYPE_CHECKING:
        _router: ModelRouter
        _event_bus: EventBus
        _status: AgentStatus
        _is_task_running: bool
        _stop_requested: bool
        _pivot_requested: bool
        _pivot_goal: str | None
        _current_task: str
        _history: list[StepRecord]

        async def _classify_and_store_memory(self, user_input: str) -> None: ...
        async def _execute_single_goal_flow(self, goal: str) -> dict[str, Any]: ...

    async def run_goal(self, goal: str, auto_confirm: bool = False) -> dict[str, Any]:
        """
        Execute an end-to-end goal as a Unified Dual-Engine (Chatbot + Computer-Use Agent).
        """
        self._stop_requested = False
        self._pivot_requested = False
        self._pivot_goal = None
        self._current_task = goal
        self._history.clear()
        self._is_task_running = False
        self._status = AgentStatus.IDLE

        # Background 3-Tier memory learning (LOW discarded, MEDIUM/HIGH stored)
        asyncio.create_task(self._classify_and_store_memory(goal))

        # 0. Custom Voice Macros & Compound Automations
        try:
            from seyal_ai.accessibility.custom_commands import CustomCommandManager
            cmd_mgr = CustomCommandManager()
            expanded_actions = cmd_mgr.match_and_expand(goal)
            if expanded_actions and len(expanded_actions) > 1:
                log.info("Expanded custom macro '%s' into %d actions: %s", goal, len(expanded_actions), expanded_actions)
                return await self._run_compound_goals(expanded_actions, original_instruction=goal)
        except Exception as macro_err:
            log.debug("Macro expansion notice: %s", macro_err)

        # Case 1: Dynamic Multi-Intent Decomposition (Zero Hardcoding)
        decomp_fn = _get_agent_attr("decompose_user_intents", decompose_user_intents)
        sub_goals = await decomp_fn(goal, self._router)
        if len(sub_goals) > 1:
            log.info("Compound Multi-Intent detected (%d sub-goals): %s", len(sub_goals), sub_goals)
            return await self._run_compound_goals(sub_goals, original_instruction=goal)

        return await self._execute_single_goal_flow(goal)

    async def _run_compound_goals(self, sub_goals: list[str], original_instruction: str) -> dict[str, Any]:
        """
        Executes an ordered pipeline of sub-goals with parallel voice pipelining and interruption handling.
        """
        self._is_task_running = True
        combined_narrations: list[str] = []
        total_steps = 0

        for i, sub_goal in enumerate(sub_goals):
            # Check for live emergency stop or mid-flight pivot (Case 4)
            if self._stop_requested:
                log.info("Compound execution halted by emergency stop.")
                break
            if self._pivot_requested and self._pivot_goal:
                log.info("Mid-task pivot engaged during compound execution: %s", self._pivot_goal)
                self._pivot_requested = False
                piv_goal = self._pivot_goal
                self._pivot_goal = None
                return await self.run_goal(piv_goal)

            log.info("Executing Sub-Goal [%d/%d]: '%s'", i + 1, len(sub_goals), sub_goal)
            res = await self._execute_single_goal_flow(sub_goal)
            narr = res.get("narration") or ""
            if narr:
                combined_narrations.append(narr)
            total_steps += res.get("steps_executed", 0)

            # Case 2: Voice Pipelining: emit narration immediately so user hears feedback
            # while next sub-goal initializes
            if i < len(sub_goals) - 1 and narr:
                await self._event_bus.emit(
                    "computer_use.narrate",
                    {"narration": narr, "step": i + 1, "is_pipelined": True}
                )

        self._is_task_running = False
        final_narr = " ".join(combined_narrations) if combined_narrations else "Completed your requests!"
        return {
            "status": "completed",
            "intent": "TASK",
            "is_task": True,
            "goal": original_instruction,
            "narration": final_narr,
            "sub_goals_executed": len(sub_goals),
            "steps_executed": total_steps,
            "total_steps": total_steps,
            "history": self._history,
        }
