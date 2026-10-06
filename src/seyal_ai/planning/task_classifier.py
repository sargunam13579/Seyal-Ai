"""Seyal AI Universal Semantic Task Classifier & Multilingual Voice Synthesis.

Zero Hardcoding: Powered by Gemini Flash across 100+ languages.
Accurately categorizes instructions into:
1. Intent: NOTIFY vs TASK
2. Type: IMMEDIATE (Type 1), SCHEDULED (Type 2), CONTINUOUS (Type 3), CONDITIONAL (Type 4)
3. Auto Permission: Detects if user bypassed permission (e.g. "permission venam", "do it directly without asking")
4. Generates dynamic spoken voice responses (Permission requests, Alerts, Completion reports)
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
import uuid
from typing import Any, Dict, Optional

from seyal_ai.llm.prompts.language_guardrail import (
    get_localized_response,
    get_user_language_profile,
)
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.planning.task_types import (
    AutonomousTaskSpec,
    TaskIntentType,
    TaskPermissionState,
    TaskType,
)

logger = logging.getLogger(__name__)


class TaskSemanticClassifier:
    def __init__(self, router: Optional[ModelRouter] = None) -> None:
        self._router = router or ModelRouter()

    async def classify_instruction(self, instruction: str) -> AutonomousTaskSpec:
        """
        Classifies an instruction in ANY language into an AutonomousTaskSpec.
        """
        clean = instruction.strip()
        task_id = f"task_{int(time.time())}_{uuid.uuid4().hex[:6]}"

        try:
            await self._router.initialize()
            prompt = (
                "You are an intelligent task architecture classifier for an autonomous computer AI assistant.\n"
                f'User instruction: "{clean}"\n\n'
                "Analyze the user's intent in whatever language they used (English, Tamil, Tanglish, Hindi, etc.):\n\n"
                "1. INTENT TYPE:\n"
                "   - 'notify': The user only wants to be alerted/notified/informed (e.g. 'mail vantha sollu', 'tell me if message arrives', 'inform me'). The assistant takes NO autonomous OS action.\n"
                "   - 'task': The user wants the assistant to execute an action on the computer (e.g. 'mail vantha reply pannu', 'block the number', 'show the route', 'send a wish').\n\n"
                "2. TASK TYPE:\n"
                "   - 'immediate' (Type 1): User wants it executed RIGHT NOW (e.g. 'reply to last mail now', 'show route from Chennai to Avadi').\n"
                "   - 'scheduled' (Type 2): Action to be performed after a specified time, duration, or date (e.g. 'at 9 PM send message', 'tomorrow wish birthday').\n"
                "   - 'continuous' (Type 3): Permanent, recurring, or always-on continuous routine/watcher (e.g. 'daily morning wish friend', 'always reply if mail arrives').\n"
                "   - 'conditional' (Type 4): If-else or condition-triggered event (e.g. 'if code fails to execute delete it', 'if mail is placement related reply').\n\n"
                "3. PERMISSION OVERRIDE:\n"
                "   - 'auto_granted': Set to true ONLY if the user explicitly indicated NOT to ask permission (e.g. 'permission venam', 'neeye pannidu', 'without asking me', 'no need to ask', 'directly execute'). Otherwise false.\n\n"
                "Output strictly a JSON object with this exact structure:\n"
                "{\n"
                '  "title": "short concise summary of the task in English",\n'
                '  "intent_type": "notify" | "task",\n'
                '  "task_type": "immediate" | "scheduled" | "continuous" | "conditional",\n'
                '  "auto_permission_granted": true | false,\n'
                '  "condition": "the condition text if conditional, else null",\n'
                '  "scheduled_time": "the time/date text if scheduled, else null",\n'
                '  "recurring_interval": "the frequency text if continuous, else null"\n'
                "}"
            )

            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.0,
                ),
                timeout=2.0,
            )

            raw = (res.content or "").strip()
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw).strip()

            parsed = json.loads(raw)

            # Map intent
            intent_str = str(parsed.get("intent_type", "task")).lower()
            intent_type = TaskIntentType.NOTIFY if intent_str == "notify" else TaskIntentType.TASK

            # Map type
            type_str = str(parsed.get("task_type", "immediate")).lower()
            if type_str == "scheduled":
                task_type = TaskType.SCHEDULED
            elif type_str == "continuous":
                task_type = TaskType.CONTINUOUS
            elif type_str == "conditional":
                task_type = TaskType.CONDITIONAL
            else:
                task_type = TaskType.IMMEDIATE

            # Determine Permission State
            auto_granted = bool(parsed.get("auto_permission_granted", False))
            if task_type == TaskType.IMMEDIATE:
                permission_state = TaskPermissionState.NOT_REQUIRED
            elif auto_granted:
                permission_state = TaskPermissionState.AUTO_GRANTED
            else:
                permission_state = TaskPermissionState.PENDING

            title = parsed.get("title") or clean[:50]

            return AutonomousTaskSpec(
                id=task_id,
                title=title,
                original_instruction=clean,
                intent_type=intent_type,
                task_type=task_type,
                permission_state=permission_state,
                condition=parsed.get("condition"),
                scheduled_time=parsed.get("scheduled_time"),
                recurring_interval=parsed.get("recurring_interval"),
                status="waiting_permission" if permission_state == TaskPermissionState.PENDING else "in_progress",
                created_at=time.time(),
            )

        except Exception as e:
            logger.warning("Dynamic task classification fallback: %s", e)
            # Safe generic fallback
            return AutonomousTaskSpec(
                id=task_id,
                title=clean[:50],
                original_instruction=clean,
                intent_type=TaskIntentType.TASK,
                task_type=TaskType.IMMEDIATE,
                permission_state=TaskPermissionState.NOT_REQUIRED,
                status="in_progress",
                created_at=time.time(),
            )

    async def synthesize_permission_request(self, task: AutonomousTaskSpec) -> str:
        """
        Synthesizes a warm, natural spoken permission request in the user's EXACT tongue and dialect.
        Zero hardcoded strings.
        """
        try:
            await self._router.initialize()
            prompt = (
                f'The user requested a task: "{task.original_instruction}".\n'
                f"Task Type: {task.task_type.value}.\n"
                "The task is ready to begin, but needs the user's permission first.\n"
                "Synthesize a natural, polite 1-sentence question asking the user if you should proceed and start this task.\n"
                "MANDATORY: You MUST speak in the EXACT SAME LANGUAGE and dialect the user used (e.g. Tanglish, Tamil, English, Hindi, etc.).\n"
                "Output strictly ONLY the spoken sentence (no quotes, no preamble)."
            )
            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.3,
                ),
                timeout=1.5,
            )
            spoken = (res.content or "").strip().replace('"', "")
            if spoken:
                return spoken
        except Exception as e:
            logger.debug("Voice permission synthesis notice: %s", e)

        mt, kl = get_user_language_profile()
        return get_localized_response("ask_permission", mt, kl, item=task.title)

    async def synthesize_completion_report(self, task: AutonomousTaskSpec, success: bool = True) -> str:
        """
        Synthesizes an enthusiastic, natural spoken completion report in the user's EXACT tongue.
        Zero hardcoded strings.
        """
        try:
            await self._router.initialize()
            prompt = (
                f'The user instructed: "{task.original_instruction}".\n'
                f"Status: {'Successfully completed' if success else 'Failed to complete'}.\n"
                "Synthesize a natural 1-sentence spoken voice report informing the user of the final status.\n"
                "MANDATORY: You MUST speak in the EXACT SAME LANGUAGE and dialect the user used (e.g. Tanglish, Tamil, English, Hindi, etc.).\n"
                "Output strictly ONLY the spoken sentence (no quotes, no preamble)."
            )
            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.3,
                ),
                timeout=1.5,
            )
            spoken = (res.content or "").strip().replace('"', "")
            if spoken:
                return spoken
        except Exception as e:
            logger.debug("Voice completion synthesis notice: %s", e)

        mt, kl = get_user_language_profile()
        return get_localized_response("task_completed_report", mt, kl, item=task.title)

    async def synthesize_spoken_alert(self, task: AutonomousTaskSpec, event_details: str) -> str:
        """
        Synthesizes a spoken notification alert (for NOTIFY intents) in user's tongue.
        Zero OS action performed.
        """
        try:
            await self._router.initialize()
            prompt = (
                f'User had requested notification: "{task.original_instruction}".\n'
                f"Event occurred: {event_details}.\n"
                "Synthesize a friendly 1-sentence spoken alert informing the user that this event just happened.\n"
                "MANDATORY: You MUST speak in the EXACT SAME LANGUAGE and dialect the user used.\n"
                "Output strictly ONLY the spoken alert (no quotes, no preamble)."
            )
            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.3,
                ),
                timeout=1.5,
            )
            spoken = (res.content or "").strip().replace('"', "")
            if spoken:
                return spoken
        except Exception as e:
            logger.debug("Voice alert synthesis notice: %s", e)

        mt, kl = get_user_language_profile()
        return get_localized_response("alert_notification", mt, kl, item=task.title, details=event_details)


# Singleton
task_semantic_classifier = TaskSemanticClassifier()
