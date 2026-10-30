"""
Vision LLM Decision Engine for Computer-Use Closed Loop.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
from typing import TYPE_CHECKING, Any

from seyal_ai.agents.computer_use.prompts import COMPUTER_USE_SYSTEM_PROMPT
from seyal_ai.agents.computer_use.protocol import ScreenObservation, StepRecord
from seyal_ai.agents.computer_use.shortcuts import is_explicit_mouse_request
from seyal_ai.llm.prompts.language_guardrail import (
    get_localized_response,
    get_user_language_profile,
)
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.utils.logging import get_logger

if TYPE_CHECKING:
    from seyal_ai.llm.router import ModelRouter

log = get_logger("agents.computer_use.execution.vision_decider")


class VisionDeciderMixin:
    """Provides methods for invoking Vision LLM to determine the next computer-use action."""

    if TYPE_CHECKING:
        _router: ModelRouter
        _max_steps: int
        _history: list[StepRecord]

        async def _build_user_language_prompt(self, current_input: str | None = None) -> str: ...

    async def _decide_next_action(
        self,
        goal: str,
        observation: ScreenObservation,
        step_num: int,
        steering: list[str],
    ) -> dict[str, Any]:
        """Invoke Vision LLM to determine the next computer action."""
        await self._router.initialize()

        # Build detailed history context
        history_summary = []
        for rec in self._history[-8:]:
            act_details = []
            if rec.action.app_name:
                act_details.append(f"app='{rec.action.app_name}'")
            if rec.action.text:
                act_details.append(f"text='{rec.action.text}'")
            if rec.action.key:
                act_details.append(f"key='{rec.action.key}'")
            if rec.action.x is not None and rec.action.y is not None:
                act_details.append(f"x={rec.action.x}, y={rec.action.y}")
            detail_str = f" ({', '.join(act_details)})" if act_details else ""
            res_str = rec.action_result.get("status", "ok") if isinstance(rec.action_result, dict) else "ok"
            history_summary.append(
                f"- Step {rec.step_number}: Action={rec.action.action_type.value}{detail_str} | Thought='{rec.thought}' | Result={res_str}"
            )

        steering_text = ""
        if steering:
            steering_text = "\n⚠️ USER MID-TASK GUIDANCE / INSTRUCTIONS:\n" + "\n".join(f"- {s}" for s in steering)

        # Retrieve live battery/system telemetry from Seyal AI Telemetry Service
        system_status_line = ""
        try:
            from seyal_ai.services.seyal_ai_service import seyal_ai_service
            snap = seyal_ai_service.get_live_telemetry_snapshot()
            bat_text = snap["battery"]["status_text"]
            win_text = snap["active_window"]
            cpu_val = snap["hardware"]["cpu_percent"]
            ram_val = snap["hardware"]["ram_percent"]
            system_status_line = f"LIVE SEYAL AI TELEMETRY: Battery {bat_text} | Active Window: '{win_text}' | Load: CPU {cpu_val}%, RAM {ram_val}%\n"
        except Exception:
            pass

        # Task guideline hint
        lower_goal = goal.lower().strip()
        task_category_hint = (
            "STRICT ACTION RULE: NEVER automatically close any application unless the user EXPLICITLY instructed to close it in their goal. "
            "Never close background apps (like Google Chrome, VS Code, or Seyal AI). "
            "When completing any goal, keep apps open and enthusiastically ask what to do next in the user's language."
        )

        if "camera" in lower_goal:
            task_category_hint += (
                "\n📸 CAMERA COMPOUND TASK MANDATE:\n"
                "- If the user requested to open camera and capture a photo/picture:\n"
                "- If Camera app is in the background or not focused: Focus it using switch_window or focus_window.\n"
                "- If Camera app is open on screen: Take the photo by clicking the Camera shutter button OR using key_press 'space' or 'enter'!\n"
                "- DO NOT output 'finish' after merely opening the camera if capturing a photo was part of the goal. You MUST take the photo first!"
            )

        if is_explicit_mouse_request(goal):
            task_category_hint += (
                "\n🖱️ EXPLICIT MOUSE OVERRIDE ACTIVE:\n"
                "- The user specifically instructed to use the mouse/cursor. Prioritize click, double_click, right_click, or mouse_drag with exact pixel coordinates."
            )
        else:
            task_category_hint += (
                "\n⚡ SHORTCUT-FIRST ACCELERATION ACTIVE:\n"
                "- Prioritize keyboard shortcuts (hotkey, key_press) over mouse clicks wherever possible (e.g. ctrl+t for new tab, space for camera shutter, ctrl+s for save, win+a for toggles). "
                "Only fall back to mouse click if no keyboard shortcut exists for the specific action."
            )

        prompt = (
            f"GOAL: {goal}\n"
            f"{task_category_hint}\n"
            f"CURRENT STEP: {step_num} / {self._max_steps}\n"
            f"SCREEN RESOLUTION: {observation.screen_width}x{observation.screen_height}\n"
            f"{system_status_line}"
            f"RECENT HISTORY:\n" + ("\n".join(history_summary) if history_summary else "None (starting task)") +
            f"{steering_text}\n\n"
            f"CLOSED-LOOP VERIFICATION INSTRUCTION:\n"
            f"- Observe the detected elements and screen state.\n"
            f"- Verify if the previous step's sub-task completed successfully.\n"
            f"- Select the next sub-action (e.g., click 3-dots, click delete, take photo, window_close, or finish).\n\n"
            f"DETECTED UI ELEMENTS ON SCREEN ({len(observation.detected_elements)} found):\n"
        )

        for el in observation.detected_elements[:50]:
            prompt += f"  [Badge #{el.get('index')}] {el.get('type')}: '{el.get('name')}' at center=({el['center'][0]}, {el['center'][1]})\n"

        prompt += "\nOutput your decision as a valid JSON object matching the schema."

        # Read screenshot image as base64 if available
        image_base64 = None
        target_img_path = observation.som_screenshot_path or observation.screenshot_path
        if target_img_path and os.path.exists(target_img_path):
            try:
                with open(target_img_path, "rb") as f:
                    image_base64 = base64.b64encode(f.read()).decode("utf-8")
            except Exception as e:
                log.debug("Could not read screenshot image: %s", e)

        lang_prompt = await self._build_user_language_prompt()
        messages = [
            LLMMessage(role="system", content=COMPUTER_USE_SYSTEM_PROMPT + lang_prompt),
            LLMMessage(
                role="user",
                content=prompt,
                images=[image_base64] if image_base64 else None,
            ),
        ]

        try:
            resp = await asyncio.wait_for(
                self._router.generate(
                    messages=messages,
                    tier=ModelTier.VISION,
                    temperature=0.1,
                ),
                timeout=15.0,
            )
            raw_text = resp.content or "{}"

            # Clean possible markdown formatting
            if "```json" in raw_text:
                raw_text = raw_text.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_text:
                raw_text = raw_text.split("```")[1].split("```")[0].strip()

            parsed = json.loads(raw_text)
            return parsed
        except Exception as e:
            log.warning("Vision LLM decision fallback: %s", e)
            mt, kl = get_user_language_profile()
            return {
                "thought": f"Observation complete. Analyzing screen elements ({str(e)}).",
                "narration": get_localized_response("assessing_layout", mt, kl),
                "action": {"action_type": "wait", "seconds": 1.0},
            }
