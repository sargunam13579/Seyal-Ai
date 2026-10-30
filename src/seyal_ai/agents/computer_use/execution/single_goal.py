"""
Closed-Loop Single Goal Execution Flow for Computer-Use Agent.
"""

from __future__ import annotations

import asyncio
import re
import sys
import time
from typing import TYPE_CHECKING, Any

from seyal_ai.agents.computer_use.decomposition import generate_task_acknowledgment
from seyal_ai.agents.computer_use.protocol import (
    ActionType,
    AgentStatus,
    ComputerAction,
    ScreenObservation,
    SteeringInstruction,
    StepRecord,
)
from seyal_ai.agents.computer_use.shortcuts import resolve_universal_shortcut
from seyal_ai.llm.prompts.language_guardrail import (
    get_localized_response,
    get_user_language_profile,
)
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.utils.logging import get_logger

if TYPE_CHECKING:
    from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
    from seyal_ai.agents.computer_use.grounding import VisualGroundingEngine
    from seyal_ai.core.config import SeyalAiSettings
    from seyal_ai.core.confirmation import ConfirmationManager
    from seyal_ai.llm.router import ModelRouter
    from seyal_ai.utils.events import EventBus

log = get_logger("agents.computer_use.execution.single_goal")


def _get_agent_attr(name: str, fallback: Any) -> Any:
    mod = sys.modules.get("seyal_ai.agents.computer_use.agent")
    return getattr(mod, name, fallback) if mod else fallback


class SingleGoalExecutionMixin:
    """Closed-loop visual step execution flow for computer-use agent."""

    if TYPE_CHECKING:
        _router: ModelRouter
        _grounding: VisualGroundingEngine
        _executor: ComputerActionExecutor
        _confirmation: ConfirmationManager
        _event_bus: EventBus
        _settings: SeyalAiSettings
        _max_steps: int
        _status: AgentStatus
        _is_task_running: bool
        _steering_queue: asyncio.Queue[SteeringInstruction]
        _history: list[StepRecord]
        _convo_history: list[dict[str, str]]
        _stop_requested: bool
        _pivot_requested: bool
        _pivot_goal: str | None
        _current_task: str

        def _check_action_permission(self, action: ComputerAction) -> tuple[bool, str]: ...
        def _detect_loop(self, next_action: ComputerAction) -> tuple[bool, str]: ...
        async def _classify_intent(self, goal: str) -> str: ...
        def _detect_simple_app_launch(self, goal: str) -> str | None: ...
        def _detect_simple_app_close(self, goal: str) -> str | None: ...
        async def _decide_next_action(
            self,
            goal: str,
            observation: ScreenObservation,
            step_num: int,
            steering: list[str],
        ) -> dict[str, Any]: ...
        async def _handle_conversational_query(self, goal: str) -> dict[str, Any]: ...
        async def _handle_weather_query(self, goal: str) -> dict[str, Any]: ...
        async def _handle_battery_query(self, goal: str) -> dict[str, Any]: ...
        async def run_goal(self, goal: str, auto_confirm: bool = False) -> dict[str, Any]: ...

    async def _execute_single_goal_flow(self, goal: str) -> dict[str, Any]:
        """Execute a single atomic or sequential computer-use goal."""
        self._current_task = goal

        # 0. Emergency Stop Guard (0ms)
        lower_goal = goal.lower().strip()
        lower_clean = re.sub(r"[^\w\s]", "", lower_goal).strip()
        emergency_stops = {
            "stop", "cancel", "pause", "halt", "stop it", "niruthu", "quit", "abort",
            "freeze", "kill", "exit", "rok do", "band karo", "para", "detente", "arret"
        }
        if lower_clean in emergency_stops or any(lower_goal.startswith(s) for s in ("stop ", "cancel ")):
            self._status = AgentStatus.STOPPED
            self._is_task_running = False
            return {"status": "stopped", "intent": "CONTROL", "is_task": False, "reason": "User requested stop", "steps_executed": 0}

        # 0.5 Seyal AI Unified Architecture: Instant 0ms - Sub-20ms Fast-Path Dispatcher
        from seyal_ai.services.seyal_ai_service import seyal_ai_service
        seyal_fast = seyal_ai_service.detect_instant_fast_path(goal)
        if seyal_fast:
            f_type = seyal_fast.get("type")
            if f_type == "ACTION":
                action_key = seyal_fast["action_key"]
                act_type = ActionType.HOTKEY if "+" in action_key else ActionType.KEY_PRESS
                action = ComputerAction(
                    action_type=act_type,
                    key=action_key,
                    reasoning=f"Seyal AI Fast-Path: {seyal_fast.get('description', action_key)}",
                )
                allowed, perm_msg = self._check_action_permission(action)
                if not allowed:
                    self._is_task_running = False
                    self._status = AgentStatus.STOPPED
                    await self._event_bus.emit(
                        "computer_use.narrate",
                        {"narration": perm_msg, "step": 1, "permission_blocked": True}
                    )
                    return {
                        "status": "permission_blocked",
                        "intent": "TASK",
                        "is_task": True,
                        "goal": goal,
                        "narration": perm_msg,
                        "steps_executed": 0,
                        "history": self._history,
                    }

                self._is_task_running = True
                self._status = AgentStatus.ACTING
                start_t = time.perf_counter()
                action_res = await self._executor.execute(action)
                elapsed = time.perf_counter() - start_t
                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="System"),
                        thought=f"Seyal AI Fast-Path: {action.reasoning}",
                        action=action,
                        action_result=action_res,
                        success=action_res.get("success", True),
                        elapsed_seconds=elapsed,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name=action_key,
                    goal=goal,
                    router=self._router,
                    details=seyal_fast.get("description", action_key),
                )

                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type == "ACTION_MEDIA":
                self._is_task_running = True
                self._status = AgentStatus.ACTING
                act_key = seyal_fast.get("action_key", "play_pause")
                success, details = seyal_ai_service.media_control(act_key)
                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="System"),
                        thought=f"Seyal AI Fast-Path: Media {act_key}",
                        action=ComputerAction(action_type=ActionType.HOTKEY, key=f"media_{act_key}"),
                        action_result={"success": success},
                        success=success,
                        elapsed_seconds=0.01,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name=f"media_{act_key}",
                    goal=goal,
                    router=self._router,
                    details=details,
                )
                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type == "ACTION_OPEN_DOWNLOAD":
                self._is_task_running = True
                self._status = AgentStatus.ACTING
                success, details = seyal_ai_service.open_latest_download()
                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="System"),
                        thought="Seyal AI Fast-Path: Open latest downloaded file",
                        action=ComputerAction(action_type=ActionType.OPEN_APP, app_name="latest_download"),
                        action_result={"success": success},
                        success=success,
                        elapsed_seconds=0.01,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name="open_latest_download",
                    goal=goal,
                    router=self._router,
                    details=details,
                )
                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type == "ACTION_SET_BRIGHTNESS":
                self._is_task_running = True
                self._status = AgentStatus.ACTING
                lvl = int(seyal_fast.get("level", 50))
                success, details = seyal_ai_service.set_screen_brightness(lvl)
                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="System"),
                        thought=f"Seyal AI Fast-Path: Set brightness to {lvl}%",
                        action=ComputerAction(action_type=ActionType.HOTKEY, key=f"brightness_{lvl}"),
                        action_result={"success": success},
                        success=success,
                        elapsed_seconds=0.02,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name=f"brightness_{lvl}",
                    goal=goal,
                    router=self._router,
                    details=details,
                )
                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type == "ACTION_CHANGE_VOICE":
                self._is_task_running = True
                self._status = AgentStatus.ACTING
                v_target = seyal_fast.get("voice")
                s_target = seyal_fast.get("speed")
                s_delta = seyal_fast.get("speed_delta")
                if s_delta is not None:
                    curr_speed = float(seyal_ai_service.get_voice_settings().get("speed", 1.0))
                    s_target = curr_speed + s_delta
                l_target = seyal_fast.get("language")
                e_target = seyal_fast.get("enabled")

                success, details = seyal_ai_service.update_voice_settings(
                    voice=v_target,
                    speed=s_target,
                    language=l_target,
                    enabled=e_target,
                )
                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="System Settings"),
                        thought=f"Seyal AI Settings: {details}",
                        action=ComputerAction(action_type=ActionType.HOTKEY, key="voice_config_update"),
                        action_result={"success": success},
                        success=success,
                        elapsed_seconds=0.01,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name="change_voice",
                    goal=goal,
                    router=self._router,
                    details=details,
                )
                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "settings.voice_updated",
                    {"goal": goal, "voice": v_target, "speed": s_target, "details": details},
                )
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type == "ACTION_SET_PERMISSION":
                self._is_task_running = True
                self._status = AgentStatus.ACTING
                scope = seyal_fast.get("scope", "all")
                mode = seyal_fast.get("mode", "allow")
                if scope == "all":
                    success, details = seyal_ai_service.grant_all_permissions()
                else:
                    success, details = seyal_ai_service.modify_permission(scope, mode=mode)

                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="Security Gateway"),
                        thought=f"Seyal AI Permissions: {details}",
                        action=ComputerAction(action_type=ActionType.HOTKEY, key=f"permission_{scope}_{mode}"),
                        action_result={"success": success},
                        success=success,
                        elapsed_seconds=0.01,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name=f"permission_{scope}",
                    goal=goal,
                    router=self._router,
                    details=details,
                )
                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "settings.permissions_updated",
                    {"goal": goal, "scope": scope, "mode": mode, "details": details},
                )
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type == "ACTION_RESET_PERMISSIONS":
                self._is_task_running = True
                self._status = AgentStatus.ACTING
                success, details = seyal_ai_service.reset_permissions()
                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="Security Gateway"),
                        thought=f"Seyal AI Permissions: {details}",
                        action=ComputerAction(action_type=ActionType.HOTKEY, key="permissions_reset"),
                        action_result={"success": success},
                        success=success,
                        elapsed_seconds=0.01,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name="reset_permissions",
                    goal=goal,
                    router=self._router,
                    details=details,
                )
                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "settings.permissions_updated",
                    {"goal": goal, "action": "reset", "details": details},
                )
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type == "ACTION_MANAGE_TASK":
                self._is_task_running = True
                self._status = AgentStatus.ACTING
                t_action = seyal_fast.get("action", "cancel")
                t_id = seyal_fast.get("task_id")
                if t_action == "emergency_stop":
                    success, details = seyal_ai_service.emergency_stop_all()
                    self._status = AgentStatus.STOPPED
                    self._is_task_running = False
                elif t_action == "cancel":
                    success, details = seyal_ai_service.cancel_agent_task(task_id=t_id)
                elif t_action == "clear":
                    success, details = seyal_ai_service.clear_completed_tasks()
                else:
                    success, details = False, f"Unknown task action: {t_action}"

                self._history.append(
                    StepRecord(
                        step_number=1,
                        observation=ScreenObservation(active_window="Agent Task Manager"),
                        thought=f"Seyal AI Task Manager: {details}",
                        action=ComputerAction(action_type=ActionType.HOTKEY, key=f"task_manager_{t_action}"),
                        action_result={"success": success},
                        success=success,
                        elapsed_seconds=0.01,
                    )
                )
                narr = await seyal_ai_service.synthesize_action_narration(
                    action_name=f"task_{t_action}",
                    goal=goal,
                    router=self._router,
                    details=details,
                )
                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "settings.tasks_updated",
                    {"goal": goal, "action": t_action, "details": details},
                )
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 1},
                )
                return {
                    "status": "completed",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 1,
                    "history": self._history,
                }

            elif f_type and str(f_type).startswith("QUERY_"):
                narr = await seyal_ai_service.synthesize_fast_spoken_reply(str(f_type), goal, self._router)
                self._convo_history.append({"role": "user", "content": goal})
                self._convo_history.append({"role": "assistant", "content": narr})
                if len(self._convo_history) > 20:
                    self._convo_history = self._convo_history[-20:]

                self._status = AgentStatus.IDLE
                self._is_task_running = False
                await self._event_bus.emit(
                    "computer_use.finished",
                    {"goal": goal, "narration": narr, "step": 0},
                )
                return {
                    "status": "completed",
                    "intent": "CONVERSATION",
                    "is_task": False,
                    "goal": goal,
                    "narration": narr,
                    "steps_executed": 0,
                    "history": [],
                }

        # 1. First classify intent: Conversation vs Task vs System
        intent = await self._classify_intent(goal)
        log.info("Classified goal intent: '%s' for input: '%s'", intent, goal)

        if intent in ("CONTROL", "STOP"):
            self._status = AgentStatus.STOPPED
            self._is_task_running = False
            return {"status": "stopped", "intent": "CONTROL", "is_task": False, "reason": "User requested stop", "steps_executed": 0}

        if intent in ("CHAT", "CONVERSATION", "CONVERSATION_GREETING"):
            return await self._handle_conversational_query(goal)

        if intent == "SYSTEM_WEATHER":
            return await self._handle_weather_query(goal)

        if intent == "SYSTEM_BATTERY":
            return await self._handle_battery_query(goal)

        # 1.5 Universal Fast-Path: Shortcut-First Acceleration (0ms - Sub-100ms)
        fast_shortcut = await resolve_universal_shortcut(goal, router=self._router)
        if fast_shortcut:
            log.info("Fast-Path: Shortcut-First Acceleration matched: %s (%s)", fast_shortcut.action_type, fast_shortcut.key)
            self._is_task_running = True
            self._status = AgentStatus.ACTING
            start_t = time.perf_counter()
            action_res = await self._executor.execute(fast_shortcut)
            elapsed = time.perf_counter() - start_t
            self._history.append(
                StepRecord(
                    step_number=1,
                    observation=ScreenObservation(active_window="System"),
                    thought=f"Shortcut-First Acceleration: {fast_shortcut.reasoning or fast_shortcut.key}",
                    action=fast_shortcut,
                    action_result=action_res,
                    success=action_res.get("success", True),
                    elapsed_seconds=elapsed,
                )
            )
            self._status = AgentStatus.IDLE
            self._is_task_running = False

            # Instant 0ms spoken confirmation in user's language without secondary LLM delay
            mt, kl = get_user_language_profile()
            fast_narr = get_localized_response(
                "task_done", mt, kl, item=fast_shortcut.key or fast_shortcut.action_type
            )

            await self._event_bus.emit(
                "computer_use.finished",
                {"goal": goal, "narration": fast_narr, "step": 1},
            )
            return {
                "status": "completed",
                "intent": "TASK",
                "is_task": True,
                "goal": goal,
                "narration": fast_narr,
                "history": self._history,
                "total_steps": 1,
                "steps_executed": 1,
            }

        # 1.6 Fast-Path: Direct OS App Launcher (< 200ms without Vision LLM round-trip)
        fast_app = self._detect_simple_app_launch(goal)
        if fast_app:
            log.info("Fast-Path: Direct OS launch for app '%s'", fast_app)
            self._is_task_running = True
            self._status = AgentStatus.ACTING
            start_t = time.perf_counter()
            action_res = await self._executor.execute(
                ComputerAction(action_type=ActionType.OPEN_APP, app_name=fast_app)
            )
            elapsed = time.perf_counter() - start_t
            self._history.append(
                StepRecord(
                    step_number=1,
                    observation=ScreenObservation(active_window=fast_app),
                    thought=f"Fast-path direct application launch: {fast_app}",
                    action=ComputerAction(action_type=ActionType.OPEN_APP, app_name=fast_app),
                    action_result=action_res,
                    success=action_res.get("success", True),
                    elapsed_seconds=elapsed,
                )
            )
            self._status = AgentStatus.IDLE
            self._is_task_running = False

            # Instant 0ms spoken confirmation in user's language without secondary LLM delay
            mt, kl = get_user_language_profile()
            fast_narr = get_localized_response("app_opened", mt, kl, app=fast_app.title())

            await self._event_bus.emit(
                "computer_use.finished",
                {"goal": goal, "narration": fast_narr, "step": 1},
            )
            return {
                "status": "completed",
                "intent": "TASK",
                "is_task": True,
                "goal": goal,
                "narration": fast_narr,
                "steps_executed": 1,
                "history": [
                    {
                        "step": 1,
                        "thought": f"Fast-path launched {fast_app}",
                        "action": "open_app",
                        "coordinates": (None, None),
                        "success": True,
                        "elapsed_seconds": elapsed,
                    }
                ],
            }

        # 1.7 Fast-Path: Direct Native App Close (< 50ms without Vision LLM)
        fast_close_proc = self._detect_simple_app_close(goal)
        if fast_close_proc:
            log.info("Fast-Path: Direct OS termination for process '%s'", fast_close_proc)
            self._is_task_running = True
            self._status = AgentStatus.ACTING
            import subprocess
            subprocess.run(["taskkill", "/F", "/IM", fast_close_proc], capture_output=True)
            self._history.append(
                StepRecord(
                    step_number=1,
                    observation=ScreenObservation(active_window="System"),
                    thought=f"Native App Control: Terminated {fast_close_proc}",
                    action=ComputerAction(action_type=ActionType.WINDOW_CLOSE, app_name=fast_close_proc),
                    action_result={"success": True},
                    success=True,
                    elapsed_seconds=0.01,
                )
            )
            from seyal_ai.services.seyal_ai_service import seyal_ai_service
            narr = await seyal_ai_service.synthesize_action_narration(
                action_name=f"close_{fast_close_proc}",
                goal=goal,
                router=self._router,
                details=f"Closed {fast_close_proc.replace('.exe', '')}",
            )
            self._status = AgentStatus.IDLE
            self._is_task_running = False
            await self._event_bus.emit(
                "computer_use.finished",
                {"goal": goal, "narration": narr, "step": 1},
            )
            return {
                "status": "completed",
                "intent": "TASK",
                "is_task": True,
                "goal": goal,
                "narration": narr,
                "history": self._history,
                "total_steps": 1,
                "steps_executed": 1,
            }

        # 2. Autonomous Task Classifier (Types 1-4 & NOTIFY vs TASK)
        try:
            from seyal_ai.planning.task_classifier import task_semantic_classifier
            from seyal_ai.planning.task_types import TaskIntentType, TaskPermissionState, TaskType
            task_spec = await task_semantic_classifier.classify_instruction(goal)

            # Case A: NOTIFY Intent (Observe and Speak Only, Zero OS action)
            if task_spec.intent_type == TaskIntentType.NOTIFY:
                log.info("Handled as NOTIFY intent: '%s'", goal)
                spoken_alert = await task_semantic_classifier.synthesize_spoken_alert(task_spec, "Event condition registered and active.")
                await self._event_bus.emit(
                    "computer_use.narrate",
                    {"narration": spoken_alert, "step": 1, "intent": "notify"},
                )
                return {
                    "status": "completed",
                    "intent": "NOTIFY",
                    "is_task": False,
                    "goal": goal,
                    "narration": spoken_alert,
                    "task_spec": task_spec.model_dump(),
                    "steps_executed": 0,
                }

            # Case B: Type 2, 3, 4 Permission Protocol Check
            if (
                task_spec.task_type in (TaskType.SCHEDULED, TaskType.CONTINUOUS, TaskType.CONDITIONAL)
                and task_spec.permission_state == TaskPermissionState.PENDING
            ):
                log.info("Type %s task requires explicit user permission: '%s'", task_spec.task_type.value, goal)
                perm_request_voice = await task_semantic_classifier.synthesize_permission_request(task_spec)
                self._status = AgentStatus.WAITING_USER
                await self._event_bus.emit(
                    "computer_use.question",
                    {"question": perm_request_voice, "step": 0, "task_spec": task_spec.model_dump()},
                )
                await self._event_bus.emit(
                    "computer_use.narrate",
                    {"narration": perm_request_voice, "step": 0},
                )
                return {
                    "status": "waiting_permission",
                    "intent": "TASK",
                    "is_task": True,
                    "goal": goal,
                    "narration": perm_request_voice,
                    "question": perm_request_voice,
                    "task_spec": task_spec.model_dump(),
                    "steps_executed": 0,
                }
        except Exception as class_err:
            log.debug("Semantic task classification notice: %s", class_err)

        # 2. TASK INTENT: Computer-Use Execution Engine
        import uuid

        from seyal_ai.core.telemetry_hub import TelemetryHub
        self._current_task_id = f"task_{uuid.uuid4().hex[:6]}"
        self._active_goal = goal
        TelemetryHub.get_instance().register_task(self._current_task_id, goal=goal, max_steps=self._max_steps)
        self._is_task_running = True
        self._status = AgentStatus.OBSERVING
        await self._event_bus.emit(
            "computer_use.started",
            {"goal": goal, "max_steps": self._max_steps},
        )

        # Emit immediate verbal acknowledgment matching user language dynamically in < 800ms
        ack_fn = _get_agent_attr("generate_task_acknowledgment", generate_task_acknowledgment)
        ack_narration = await ack_fn(goal, self._router)
        await self._event_bus.emit(
            "computer_use.narrate",
            {"narration": ack_narration, "step": 0},
        )

        step_num = 0
        final_result: dict[str, Any] = {"status": "completed", "intent": "TASK", "is_task": True, "goal": goal, "steps_executed": 0}
        lower_goal = goal.lower().strip()

        try:
            while step_num < self._max_steps:
                if self._stop_requested:
                    self._status = AgentStatus.STOPPED
                    return {"status": "stopped", "reason": "User triggered emergency stop", "steps_executed": len(self._history)}

                # Check for mid-task pivot to new goal (Case 4)
                if self._pivot_requested and self._pivot_goal:
                    log.info("Mid-task pivot engaged during step loop: %s", self._pivot_goal)
                    self._pivot_requested = False
                    piv_goal = self._pivot_goal
                    self._pivot_goal = None
                    return await self.run_goal(piv_goal)

                step_num += 1
                step_start = time.perf_counter()

                # Check if user injected steering instructions
                active_steering: list[str] = []
                while not self._steering_queue.empty():
                    steer_item = self._steering_queue.get_nowait()
                    active_steering.append(steer_item.instruction)

                # 1. Observe Screen
                self._status = AgentStatus.OBSERVING
                obs = await self._grounding.observe_screen(tag_elements=True)

                # 2. Reason with Vision Multimodal LLM
                self._status = AgentStatus.THINKING
                decision = await self._decide_next_action(
                    goal=goal,
                    observation=obs,
                    step_num=step_num,
                    steering=active_steering,
                )

                thought = decision.get("thought", "")
                narration = decision.get("narration", "")
                action_data = decision.get("action", {})
                action_type_str = action_data.get("action_type", "wait")

                try:
                    from seyal_ai.core.telemetry_hub import TelemetryHub
                    TelemetryHub.get_instance().update_task_progress(
                        getattr(self, "_current_task_id", "default"),
                        step=step_num,
                        thought=thought,
                        action_summary=action_type_str,
                    )
                except Exception:
                    pass

                try:
                    action_type = ActionType(action_type_str)
                except ValueError:
                    action_type = ActionType.WAIT

                # Resolve coordinates from element badge index if provided
                badge_idx = action_data.get("badge_index") or action_data.get("element_index")
                resolved_x = action_data.get("x")
                resolved_y = action_data.get("y")
                if badge_idx and (resolved_x is None or resolved_y is None):
                    matched_el = self._grounding.find_element(obs.detected_elements, badge_idx)
                    if matched_el and "center" in matched_el:
                        resolved_x, resolved_y = matched_el["center"]

                comp_action = ComputerAction(
                    action_type=action_type,
                    x=resolved_x,
                    y=resolved_y,
                    end_x=action_data.get("end_x"),
                    end_y=action_data.get("end_y"),
                    text=action_data.get("text"),
                    app_name=action_data.get("app_name"),
                    key=action_data.get("key"),
                    keys=action_data.get("keys"),
                    direction=action_data.get("direction", "down"),
                    amount=action_data.get("amount", 3),
                    seconds=action_data.get("seconds", 1.0),
                    reasoning=thought,
                )

                # Strict User Permission Guard: NEVER close applications unless user explicitly requested 'close'
                if action_type == ActionType.WINDOW_CLOSE:
                    should_close = False
                    try:
                        verify_res = await self._router.generate(
                            messages=[LLMMessage(role="user", content=f"Did the user explicitly instruct to close, exit, or terminate an application in this request: \"{goal}\"? Answer strictly YES or NO.")],
                            tier=ModelTier.FAST,
                            temperature=0.0,
                        )
                        should_close = "YES" in (verify_res.content or "").upper()
                    except Exception:
                        should_close = any(w in lower_goal for w in ("close", "exit", "quit", "terminate", "kill", "shut"))

                    if not should_close:
                        log.info("Blocked unauthorized WINDOW_CLOSE action; keeping application open.")
                        action_type = ActionType.FINISH

                # Check Dynamic Computer Control Permissions from Settings
                try:
                    from seyal_ai.security.permissions import (
                        PermissionScope,
                        PermissionScopeManager,
                    )
                    perm_mgr = PermissionScopeManager()
                    mt, kl = get_user_language_profile()

                    if action_type in [
                        ActionType.CLICK, ActionType.DOUBLE_CLICK, ActionType.RIGHT_CLICK,
                        ActionType.MIDDLE_CLICK, ActionType.MOUSE_MOVE, ActionType.MOUSE_DRAG, ActionType.MOUSE_SCROLL
                    ]:
                        if not perm_mgr.is_scope_granted(PermissionScope.MOUSE_CONTROL):
                            log.warning("Mouse action blocked: MOUSE_CONTROL permission is disabled in Settings.")
                            action_type = ActionType.FINISH
                            narration = get_localized_response("permission_mouse", mt, kl)

                    elif action_type in [ActionType.TYPE_TEXT, ActionType.KEY_PRESS, ActionType.HOTKEY, ActionType.CLIPBOARD_PASTE]:
                        if not perm_mgr.is_scope_granted(PermissionScope.KEYBOARD_CONTROL):
                            log.warning("Keyboard action blocked: KEYBOARD_CONTROL permission is disabled in Settings.")
                            action_type = ActionType.FINISH
                            narration = get_localized_response("permission_keyboard", mt, kl)

                    elif action_type in [ActionType.OPEN_APP, ActionType.WINDOW_CLOSE] and not perm_mgr.is_scope_granted(PermissionScope.APP_CONTROL):
                        log.warning("App action blocked: APP_CONTROL permission is disabled in Settings.")
                        action_type = ActionType.FINISH
                        narration = get_localized_response("permission_app", mt, kl)
                except Exception as perm_err:
                    log.debug("Permission check notice: %s", perm_err)

                # Loop and cycle protection
                is_loop, loop_reason = self._detect_loop(comp_action)
                if is_loop and action_type != ActionType.FINISH:
                    log.warning("Cycle/Loop prevented: %s. Auto-completing task.", loop_reason)
                    action_type = ActionType.FINISH

                # Check for completion
                if action_type == ActionType.FINISH:
                    # Guard for camera photo task: if user asked for a photo and no shutter was fired yet, auto-trigger space shutter!
                    if "camera" in lower_goal and any(kw in lower_goal for kw in ["pic", "photo", "picture", "snap", "take", "capture"]):
                        photo_taken = any(
                            (r.action.action_type == ActionType.KEY_PRESS and r.action.key in ("space", "enter"))
                            or (r.action.action_type == ActionType.CLICK and "shutter" in (r.thought or "").lower())
                            for r in self._history
                        )
                        if not photo_taken:
                            log.info("Camera photo task guard: photo not taken yet. Auto-triggering Spacebar shutter.")
                            comp_action = ComputerAction(action_type=ActionType.KEY_PRESS, key="space", reasoning="Press Spacebar to capture photo in Windows Camera")
                            mt, kl = get_user_language_profile()
                            narration = get_localized_response("photo_captured", mt, kl)
                            action_res = await self._executor.execute(comp_action)
                            self._history.append(StepRecord(
                                step_number=step_num,
                                observation=obs,
                                thought="Pressed Spacebar to capture photo in Windows Camera",
                                action=comp_action,
                                action_result=action_res,
                                success=True,
                                elapsed_seconds=0.1,
                            ))

                    self._status = AgentStatus.COMPLETED
                    await self._event_bus.emit(
                        "computer_use.finished",
                        {"goal": goal, "narration": narration, "step": step_num},
                    )
                    await self._event_bus.emit(
                        "computer_use.narrate",
                        {"narration": narration, "step": step_num},
                    )
                    final_result["status"] = "completed"
                    final_result["narration"] = narration
                    break

                if action_type == ActionType.ASK_USER:
                    self._status = AgentStatus.WAITING_USER
                    await self._event_bus.emit(
                        "computer_use.question",
                        {"question": action_data.get("text", thought), "step": step_num},
                    )
                    final_result["status"] = "waiting_user"
                    final_result["question"] = action_data.get("text", thought)
                    final_result["narration"] = narration
                    break

                # 3. Execute Action
                self._status = AgentStatus.ACTING
                await self._event_bus.emit(
                    "computer_use.action",
                    {
                        "step": step_num,
                        "action": str(action_type),
                        "thought": thought,
                        "narration": narration,
                        "coordinates": (comp_action.x, comp_action.y),
                    },
                )

                action_res = await self._executor.execute(comp_action)

                step_elapsed = time.perf_counter() - step_start
                step_record = StepRecord(
                    step_number=step_num,
                    observation=obs,
                    thought=thought,
                    action=comp_action,
                    action_result=action_res,
                    success=action_res.get("success", True),
                    elapsed_seconds=round(step_elapsed, 3),
                )
                self._history.append(step_record)

                # Narrate action step to user
                if narration:
                    await self._event_bus.emit(
                        "computer_use.narrate",
                        {"narration": narration, "step": step_num},
                    )

                # Check action success
                if not action_res.get("success", True):
                    log.warning("Action failed at step %d: %s", step_num, action_res.get("error"))

            final_result["steps_executed"] = len(self._history)
            final_result["history"] = self._history
            return final_result

        except Exception as e:
            log.exception("Computer-use loop encountered error: %s", e)
            self._status = AgentStatus.FAILED
            return {"status": "failed", "error": str(e), "steps_executed": len(self._history)}
        finally:
            self._is_task_running = False
            try:
                from seyal_ai.core.telemetry_hub import TelemetryHub
                tid = getattr(self, "_current_task_id", "default")
                if getattr(self, "_stop_requested", False):
                    TelemetryHub.get_instance().cancel_task(tid, reason="User requested stop")
                elif self._status == AgentStatus.FAILED:
                    TelemetryHub.get_instance().complete_task(tid, success=False, final_summary="Task failed")
                else:
                    TelemetryHub.get_instance().complete_task(tid, success=True, final_summary="Completed")
            except Exception:
                pass

            if self._status in (AgentStatus.OBSERVING, AgentStatus.THINKING, AgentStatus.ACTING, AgentStatus.COMPLETED, AgentStatus.STOPPED):
                self._status = AgentStatus.IDLE
