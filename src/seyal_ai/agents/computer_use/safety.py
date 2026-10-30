"""
Safety Guards & Loop Detection Mixin for Seyal AI Computer-Use Agent.

Provides:
- Normalized action signature computation (`_action_signature`)
- 2-step and 3-step repetition cycle detection (`_detect_loop`)
- Pre-flight permission and guardrail checks (`_check_action_permission`)
- 3-tier memory classification & persistence (`_classify_and_store_memory`)
"""

from __future__ import annotations

import asyncio
import datetime
import json
import re

from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction, StepRecord
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.safety")


class SafetyGuardsMixin:
    """Provides loop detection, permission enforcement, and memory classification."""

    def _action_signature(self, action: ComputerAction) -> str:
        """Compute normalized action signature for loop and cycle detection."""
        parts = [str(action.action_type.value)]
        if action.app_name:
            parts.append(f"app:{action.app_name.lower().strip()}")
        if action.key:
            parts.append(f"key:{action.key.lower().strip()}")
        if action.text:
            parts.append(f"text:{action.text.strip()[:25]}")
        if action.x is not None and action.y is not None:
            parts.append(f"pos:({round(action.x, -1)},{round(action.y, -1)})")
        return "|".join(parts)

    def _detect_loop(self, next_action: ComputerAction) -> tuple[bool, str]:
        """
        Check if executing next_action creates an infinite loop or repeats a completed cycle.

        Returns:
            (is_loop, reason_description)
        """
        history: list[StepRecord] = getattr(self, "_history", [])
        curr_sig = self._action_signature(next_action)
        past_sigs = [self._action_signature(rec.action) for rec in history]
        all_sigs = past_sigs + [curr_sig]

        # 1. Check for 2-step ping-pong cycle: e.g. [A, B, A, B] (e.g. open_app -> close -> open_app -> close)
        if len(all_sigs) >= 4 and all_sigs[-4:-2] == all_sigs[-2:]:
            return True, f"2-step repetition cycle detected: {all_sigs[-2:]}"

        # 2. Check for 3-step cycle: e.g. [A, B, C, A, B, C]
        if len(all_sigs) >= 6 and all_sigs[-6:-3] == all_sigs[-3:]:
            return True, f"3-step repetition cycle detected: {all_sigs[-3:]}"

        # 3. Check for re-opening an app that was already opened and subsequently closed in this session
        if next_action.action_type == ActionType.OPEN_APP:
            app = (next_action.app_name or "").lower().strip()
            if app:
                opened = False
                closed_after = False
                for rec in history:
                    if rec.action.action_type == ActionType.OPEN_APP and (rec.action.app_name or "").lower().strip() == app:
                        opened = True
                    elif opened and rec.action.action_type in (ActionType.WINDOW_CLOSE, ActionType.CLICK):
                        closed_after = True
                if opened and closed_after:
                    return True, f"Application '{app}' was already opened and closed in this task"

        # 4. Check for 3 consecutive identical actions (excluding wait/scroll)
        if (
            len(all_sigs) >= 3
            and all_sigs[-1] == all_sigs[-2] == all_sigs[-3]
            and next_action.action_type not in (ActionType.WAIT, ActionType.MOUSE_SCROLL)
        ):
            return True, f"Repeated identical action 3 times: {curr_sig}"

        return False, ""

    def _check_action_permission(self, action: ComputerAction) -> tuple[bool, str]:
        """
        Pre-flight permission check against user settings in PermissionsTab & SafetyTab.
        Returns (is_allowed, reason).
        """
        try:
            from seyal_ai.security.permissions import PermissionScope, get_permission_engine
            engine = get_permission_engine()
            scope: PermissionScope | None = None

            if action.action_type in (ActionType.KEY_PRESS, ActionType.HOTKEY, ActionType.TYPE_TEXT, ActionType.CLIPBOARD_PASTE):
                scope = PermissionScope.KEYBOARD_CONTROL
            elif action.action_type in (ActionType.CLICK, ActionType.DOUBLE_CLICK, ActionType.RIGHT_CLICK, ActionType.MIDDLE_CLICK, ActionType.MOUSE_MOVE, ActionType.MOUSE_DRAG, ActionType.MOUSE_SCROLL):
                scope = PermissionScope.MOUSE_CONTROL
            elif action.action_type in (ActionType.OPEN_APP, ActionType.WINDOW_CLOSE, ActionType.SWITCH_WINDOW, ActionType.WINDOW_MINIMIZE, ActionType.WINDOW_MAXIMIZE, ActionType.FOCUS_WINDOW):
                scope = PermissionScope.APP_CONTROL

            if scope:
                status = engine.get_scope_status(scope)
                if status:
                    if status.mode == "block" or not status.granted:
                        return False, f"Action blocked: '{scope.value}' capability is blocked in Permissions Tab."
                    engine.record_access(scope, accessor="Seyal AI Agent")
        except Exception as e:
            log.debug("Permission check notice: %s", e)

        # Pre-flight check against Safety Guardrails (Protected apps, sensitive directories, etc.)
        try:
            from seyal_ai.security.guardrails import get_safety_guardrails
            is_safe, safety_reason = get_safety_guardrails().check_action_safety(action)
            if not is_safe:
                return False, safety_reason
        except Exception as guard_err:
            log.debug("Safety guardrail check notice: %s", guard_err)

        return True, "Allowed"

    async def _classify_and_store_memory(self, user_input: str) -> None:
        """
        Extract and store memory according to the 3-Tier Importance System:
        - LOW: Disposable queries (weather, battery, hello, math, single-turn actions) -> Discarded from long-term memory.
        - MEDIUM: Active projects or ongoing work (e.g. timetable generator, python app) -> Stored in CURRENT_TASK.
        - HIGH: Life milestones, future dates, user preferences (e.g. interview, exam, preferences) -> Stored in USER_DEFINED_INFO.
        """
        clean = user_input.strip()
        if len(clean) < 6:
            return

        # 1. Fast local discard for trivial, transient queries
        lower = clean.lower()
        if any(lower.startswith(w) for w in ("what is the weather", "weather in", "how is the weather", "battery", "time in", "calc ", "calculate ")):
            return

        # 2. Fast Universal LLM Extraction
        try:
            router = getattr(self, "_router", None)
            if not router:
                return

            await router.initialize()
            prompt = (
                "Analyze this user message for long-term memory:\n"
                f'"{clean}"\n\n'
                "Classify into ONE of these categories:\n"
                "1. LOW: Disposable single-turn query (weather, time, battery, math calculation, casual greeting 'hi/hello', quick single action). Return category 'LOW'.\n"
                "2. HIGH_EVENT: Future or life event with a target date or milestone (e.g. interview, travel, client meeting, exam, doctor visit, wedding, deadline).\n"
                "3. HIGH_PREFERENCE: Explicit user preference (e.g. preferred language, communication tone, explanation length, personal bio details, alias).\n"
                "4. MEDIUM_PROJECT: Ongoing development project, research work, or multi-day goal the user is actively working on.\n\n"
                "Output STRICTLY valid JSON ONLY in this format, nothing else:\n"
                '{"category": "LOW" | "HIGH_EVENT" | "HIGH_PREFERENCE" | "MEDIUM_PROJECT", "details": "summary of event/preference/project", "event_date": "YYYY-MM-DD or null"}'
            )

            res = await asyncio.wait_for(
                router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.0,
                ),
                timeout=2.0,
            )
            raw = (res.content or "").strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()

            data = json.loads(raw)
            category = data.get("category", "LOW")
            details = data.get("details", "").strip()
            event_date = data.get("event_date")

            if category == "LOW" or not details:
                return

            from seyal_ai.memory.manager import MemoryManager
            from seyal_ai.memory.types import MemoryCategory
            manager = MemoryManager()
            now = datetime.datetime.now()
            slug = re.sub(r'[^a-zA-Z0-9]+', '_', details[:25]).strip('_').lower() or "item"

            if category == "HIGH_PREFERENCE":
                payload = {"text": details, "created_at": now.isoformat()}
                await manager.storage.store(
                    key=f"pref_{slug}",
                    value=payload,
                    category=MemoryCategory.USER_PREFERENCE,
                    tags=["importance:high", "preference"],
                    metadata=payload,
                )
                await manager.storage.store(
                    key="user_preference",
                    value=payload,
                    category=MemoryCategory.USER_PREFERENCE,
                    tags=["importance:high", "preference"],
                    metadata=payload,
                )
                log.info("Saved universal user preference: '%s'", details)

            elif category == "HIGH_EVENT":
                payload = {
                    "text": details,
                    "created_at": now.isoformat(),
                    "event_date": event_date or (now + datetime.timedelta(days=1)).date().isoformat(),
                }
                await manager.storage.store(
                    key=f"event_{slug}",
                    value=payload,
                    category=MemoryCategory.USER_DEFINED_INFO,
                    tags=["importance:high", "milestone"],
                    metadata=payload,
                )
                await manager.storage.store(
                    key="latest_user_milestone",
                    value=payload,
                    category=MemoryCategory.USER_DEFINED_INFO,
                    tags=["importance:high", "milestone"],
                    metadata=payload,
                )
                log.info("Saved universal milestone: '%s' (event_date=%s)", details, payload["event_date"])

            elif category == "MEDIUM_PROJECT":
                payload = {
                    "text": details,
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
                await manager.storage.store(
                    key=f"project_{slug}",
                    value=payload,
                    category=MemoryCategory.CURRENT_TASK,
                    tags=["importance:medium", "project"],
                    metadata=payload,
                )
                await manager.storage.store(
                    key="active_project_context",
                    value=payload,
                    category=MemoryCategory.CURRENT_TASK,
                    tags=["importance:medium", "project"],
                    metadata=payload,
                )
                log.info("Saved universal project context: '%s'", details)

        except Exception as e:
            log.debug("Universal memory extraction notice: %s", e)
