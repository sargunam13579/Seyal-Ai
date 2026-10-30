"""
Universal Multi-Lingual Intent Classifier and Fast-Path App Detection.
"""

from __future__ import annotations

import asyncio
import re
import sys
from typing import TYPE_CHECKING, Any

from seyal_ai.agents.computer_use.shortcuts import resolve_universal_shortcut
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.utils.logging import get_logger

if TYPE_CHECKING:
    from seyal_ai.llm.router import ModelRouter

log = get_logger("agents.computer_use.execution.classifier")


def _get_agent_attr(name: str, fallback: Any) -> Any:
    mod = sys.modules.get("seyal_ai.agents.computer_use.agent")
    return getattr(mod, name, fallback) if mod else fallback


class IntentClassifierMixin:
    """Provides methods for intent classification and fast-path application launch/close detection."""

    if TYPE_CHECKING:
        _router: ModelRouter

    async def _classify_intent(self, goal: str) -> str:
        """
        Universal Multi-Lingual Intent Classifier (0ms safety stop + structural & semantic single-pass routing).
        Unified into 3 core architectural decisions:
        - CONTROL: urgent stop, cancel, halt, or pause commands.
        - TASK: computer-use, OS operations, app launch/interaction, mouse/keyboard actions, file tasks.
        - CHAT: conversations, explanations, questions, weather, system status, code, empathy.
        """
        lower_goal = goal.lower().strip()
        lower_clean = re.sub(r"[^\w\s]", "", lower_goal).strip()

        # 1. Instant 0ms Emergency Stop Safety Guard
        emergency_stops = {
            "stop", "cancel", "pause", "halt", "stop it", "niruthu", "quit", "abort",
            "freeze", "kill", "exit", "rok do", "band karo", "para", "detente", "arret"
        }
        if lower_clean in emergency_stops or any(lower_goal.startswith(s) for s in ("stop ", "cancel ", "niruthu ")):
            return "CONTROL"

        # 2. Fast 0ms Structural & OS Action Routing (Single-Pass Acceleration)
        # Check if direct application launch:
        if self._detect_simple_app_launch(goal):
            return "TASK"

        # Check if hardware / universal keyboard shortcut:
        try:
            resolve_fn = _get_agent_attr("resolve_universal_shortcut", resolve_universal_shortcut)
            if await resolve_fn(goal, router=self._router):
                return "TASK"
        except Exception:
            pass

        # Direct OS automation & desktop execution commands:
        task_action_words = {
            "click", "double click", "right click", "screenshot", "screen shot",
            "press key", "type into", "scroll down", "scroll up", "drag and drop",
            "minimize window", "maximize window", "reboot", "restart laptop", "shutdown",
            "open app", "close app", "kill process", "take photo", "record screen"
        }
        if any(act in lower_goal for act in task_action_words):
            return "TASK"

        # Inquisitive questions, discussions, creative writing, coding, chit-chat:
        # Route directly to conversational streaming pass in 0.0ms!
        if lower_goal.endswith("?") or any(lower_goal.startswith(q) for q in (
            "who ", "what ", "when ", "where ", "why ", "how ", "can you explain", "explain ", "tell me",
            "is it ", "does it ", "do you ", "are you ", "enna ", "epdi ", "edhukku ", "yaar ", "sollu ",
            "kadhai ", "write a ", "generate a ", "translate ", "code ", "solve ", "give me "
        )):
            return "CHAT"

        # 3. Universal Fast LLM Intent Classifier for edge-case ambiguity
        try:
            await self._router.initialize()
            intent_prompt = (
                "You are an intent classification engine for a desktop AI assistant.\n"
                "Classify the user input into exactly ONE category:\n\n"
                "- CONTROL: user urgently commands the agent to stop, cancel, or halt execution.\n"
                "- TASK: user asks to operate the computer, interact with applications, click, type, automate, take screenshots, open/close software, manage files, or perform actions on Windows.\n"
                "- CHAT: user wants conversation, Q&A, explanations, weather, battery status, coding assistance, creative writing, general knowledge, empathy, or casual chat.\n\n"
                f'User input: "{goal}"\n\n'
                "Output strictly ONLY one word: [CONTROL, TASK, CHAT]. Nothing else."
            )
            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=intent_prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.0,
                ),
                timeout=0.8,
            )
            raw_intent = (res.content or "").strip().upper()
            if "CONTROL" in raw_intent or "STOP" in raw_intent:
                return "CONTROL"
            if "TASK" in raw_intent:
                return "TASK"
            if "CHAT" in raw_intent or "CONVERSATION" in raw_intent:
                return "CHAT"
        except Exception as llm_err:
            log.debug("Universal LLM intent classification notice: %s", llm_err)

        return "CHAT"

    def _detect_simple_app_launch(self, goal: str) -> str | None:
        """
        Fast-Path: Detect if user goal is simply to open/launch an application.
        Bypasses multi-second Vision LLM screenshot loop for direct sub-100ms OS execution.
        """
        lower = goal.lower().strip()
        # Disallow compound tasks that require inner interactions
        compound_words = {" and ", " then ", " type ", " click ", " photo ", " picture ", " write ", " search ", " close ", " delete ", " terminate ", " kill "}
        if any(cw in f" {lower} " for cw in compound_words):
            return None

        # Check launch keywords (English, Tanglish, Tamil, Hindi)
        launch_triggers = ("open", "launch", "start", "run", "open pannu", "open pannunga", "thira", "khol", "chalu")
        has_launch_intent = any(t in lower for t in launch_triggers)
        if not has_launch_intent:
            return None

        known_apps = {
            "notepad": "notepad",
            "calc": "calc",
            "calculator": "calc",
            "chrome": "chrome",
            "google chrome": "chrome",
            "edge": "edge",
            "microsoft edge": "edge",
            "browser": "edge",
            "vs code": "vscode",
            "vscode": "vscode",
            "code": "vscode",
            "terminal": "terminal",
            "powershell": "powershell",
            "cmd": "cmd",
            "command prompt": "cmd",
            "task manager": "task manager",
            "taskmgr": "task manager",
            "camera": "camera",
            "paint": "paint",
            "explorer": "explorer",
            "file explorer": "explorer",
            "files": "explorer",
            "settings": "settings",
        }
        for app_alias, canonical_name in sorted(known_apps.items(), key=lambda x: len(x[0]), reverse=True):
            if app_alias in lower:
                return canonical_name
        return None

    def _detect_simple_app_close(self, goal: str) -> str | None:
        """
        Fast-Path: Detect if user goal is to close/kill an application.
        Direct sub-10ms native process termination.
        """
        lower = goal.lower().strip()
        close_triggers = ("close", "kill", "terminate", "exit", "moodu", "band karo", "close pannu")
        if not any(t in lower for t in close_triggers):
            return None

        known_apps = {
            "notepad": "notepad.exe",
            "calc": "calc.exe",
            "calculator": "calc.exe",
            "chrome": "chrome.exe",
            "google chrome": "chrome.exe",
            "edge": "msedge.exe",
            "microsoft edge": "msedge.exe",
            "vscode": "code.exe",
            "code": "code.exe",
            "paint": "mspaint.exe",
        }
        for app_alias, proc_name in sorted(known_apps.items(), key=lambda x: len(x[0]), reverse=True):
            if app_alias in lower:
                return proc_name
        return None
