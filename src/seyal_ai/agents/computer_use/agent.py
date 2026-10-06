"""
Seyal AI Conversational Computer-Use Agent.

High-level autonomous visual agent that accepts natural language/voice instructions,
perceives screen state via Set-of-Marks and UI automation trees, reasons iteratively,
executes precise OS actions, and supports real-time conversational steering.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import time
from typing import Any

from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.grounding import VisualGroundingEngine
from seyal_ai.agents.computer_use.protocol import (
    ActionType,
    AgentStatus,
    ComputerAction,
    ScreenObservation,
    SteeringInstruction,
    StepRecord,
)
from seyal_ai.agents.computer_use.shortcuts import (
    detect_fast_shortcut,
    is_explicit_mouse_request,
    resolve_universal_shortcut,
)
from seyal_ai.core.config import SeyalAiSettings, get_settings
from seyal_ai.core.confirmation import ConfirmationManager
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.llm.prompts.language_guardrail import (
    build_language_guardrail_prompt,
    get_localized_response,
    get_user_language_profile,
    is_user_tamil_preferred,
)
from seyal_ai.utils.events import EventBus, get_event_bus
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use")

COMPUTER_USE_SYSTEM_PROMPT = """You are Seyal AI Conversational Computer-Use Agent, a friendly, warm, and highly skilled AI companion that operates a Windows PC for the user.

PERSONA & CONVERSATIONAL TONE:
- Talk in a warm, cheerful, friendly, and natural conversational tone (like a trusted tech partner / pair programmer).
- Avoid stiff, robotic, or overly formal corporate responses.
- When narrating what you are doing, be encouraging, precise, and friendly.
- UNIVERSAL MULTILINGUAL ADAPTATION & STRICT LANGUAGE MIRRORING:
  * If the user speaks/types in pure Tamil (e.g. "Chrome ஐ open பண்ணு"), you MUST respond strictly in pure Tamil.
  * If the user speaks/types in Tanglish (casual Tamil written in English letters, e.g. "Chrome ah open pannu", "YouTube po"), you MUST respond strictly in natural Tanglish (e.g. "Sari-nga, Chrome open panren!").
  * If the user speaks/types in English (e.g. "Open Chrome"), you MUST respond strictly in English.
  * If the user speaks/types in Hindi (e.g. "Chrome kholo"), you MUST respond strictly in Hindi.
  * Seamlessly mirror whatever language and dialect the user communicated in.

TASK & CLOSED-LOOP VISION REASONING:
You are given the user's high-level goal, the current screenshot (with Set-of-Marks numerical badges on interactive UI elements), detected element coordinates, live system status, and previous action history.
Your task is to iteratively reason and output the NEXT atomic computer action using the CLOSED-LOOP PROCESS:
`Access Screen (Observe) -> Action (Sub-task) -> Access Screen (Verify) -> Next Action`

Available action types:
- open_app: {"action_type": "open_app", "app_name": "camera | notepad | calc | chrome | edge | vscode | explorer | terminal | taskmgr | settings | paint"}
- click: {"action_type": "click", "x": <px>, "y": <px>, "clicks": 1} OR by element index / badge index
- double_click: {"action_type": "double_click", "x": <px>, "y": <px>}
- right_click: {"action_type": "right_click", "x": <px>, "y": <px>}
- middle_click: {"action_type": "middle_click", "x": <px>, "y": <px>}
- type_text: {"action_type": "type_text", "text": "string to type"}
- clipboard_paste: {"action_type": "clipboard_paste", "text": "string to paste"}
- hotkey: {"action_type": "hotkey", "key": "win+a | win+e | ctrl+s | enter | space | alt+f4"}
- key_press: {"action_type": "key_press", "key": "enter | space | esc"}
- mouse_scroll: {"action_type": "mouse_scroll", "direction": "down", "amount": 3}
- mouse_drag: {"action_type": "mouse_drag", "x": <start_x>, "y": <start_y>, "end_x": <end_x>, "end_y": <end_y>}
- focus_window: {"action_type": "focus_window", "text": "window title"}
- switch_window: {"action_type": "switch_window"}
- window_minimize: {"action_type": "window_minimize"}
- window_maximize: {"action_type": "window_maximize"}
- window_close: {"action_type": "window_close", "app_name": "camera | notepad | chrome | etc"}
- wait: {"action_type": "wait", "seconds": 2.0}
- ask_user: {"action_type": "ask_user", "text": "friendly question to ask the user"}
- finish: {"action_type": "finish", "reasoning": "Friendly summary of what was completed"}

🎯 CORE LIFECYCLE RULE 1: APP LIFECYCLE & NO UNWANTED AUTO-CLOSE (CRITICAL):
1. **NO UNWANTED AUTO-CLOSE**:
   - NEVER automatically close external applications (Camera, VS Code, Google Chrome, Folders, Notepad) upon task completion unless the user EXPLICITLY told you to close it!
   - NEVER touch or close unrelated background applications (such as user's open Google Chrome, VS Code, or Explorer windows).
   - Keep applications open so the user can continue their workflow seamlessly.

2. **ALWAYS ASK WHAT TO DO NEXT**:
   - Whenever you complete the user's requested task, you MUST enthusiastically confirm completion and ask what to do next in your spoken narration:
     * Respond in the EXACT SAME LANGUAGE and dialect the user communicated in (e.g. English, Tamil, Tanglish, Hindi, Spanish, French, German, Japanese, etc.).
     * Confirm what action was performed and invite their next instruction.

3. **INNER TASKS PROTECTION (Seyal AI APPLICATION)**:
   - STRICT PROHIBITION: NEVER output `window_close` or press Alt+F4 for tasks inside Seyal AI (like deleting chat items or settings)!

🎯 CORE LIFECYCLE RULE 2: CONVERSATIONAL DATA QUERIES VS COMPUTER ACTIONS:
1. **Direct Data Answers**:
   - If the user asks for data, questions, weather, battery percentage, system info, calculations, or chat:
   - Answer DIRECTLY in "narration" using live telemetry or knowledge!
   - STRICT PROHIBITION: NEVER open a browser, Google Chrome, or search windows unless the user explicitly requested: "Google search", "search on browser", "open chrome".
2. **Perform Actions Strictly on User Need**:
   - Only open, click, type, or close what the user explicitly asked for.

🎯 CORE LIFECYCLE RULE 3: HIERARCHICAL SUB-TASK SPLITTING & CLOSED-LOOP SCREEN VERIFICATION:
When given compound or multi-item requests:
1. **Split into ordered sub-tasks**:
   - Plan and execute each sub-task sequentially with screen verification after each step.
2. **STRICT VERIFICATION & STEP ROLLBACK**:
   - Inspect screen after each sub-task to verify execution.
   - If a click missed or dropdown didn't appear, immediately roll back to previous sub-task and re-target coordinates accurately.
3. **COMPOUND TASKS & MUST-COMPLETE MANDATE (CRITICAL)**:
   - When user gives a compound instruction (e.g. open camera and take photo, open notepad and type notes):
     * Clause 1: Open the app.
     * Clause 2: Perform the inner action (Take photo, type text, click button).
     * STRICT PROHIBITION: NEVER output `finish` after merely opening the app! You MUST execute the requested action inside the app before finishing!
   - Camera Photo Capture:
     * In Windows Camera: Once camera is open and focused, capture a photo using the shutter button or space/enter key, then finish with spoken confirmation.

🎯 CORE LIFECYCLE RULE 4: UNIVERSAL MULTILINGUAL COMPREHENSION & NATURAL SPOKEN REPLAY:
1. **Multilingual Understanding**:
   - Fluently understand user instructions in any language: English, Tamil, Tanglish, Hindi, Spanish, French, etc.
2. **Fast & Attractive Spoken Narration**:
   - Deliver enthusiastic, charming, and snappy spoken narration in the user's natural language and tone.
   - Always confirm completed work and ask what to do next.

⚡ SHORTCUT-FIRST ACCELERATION & INTELLIGENT MOUSE FALLBACK MANDATE:
1. SHORTCUT-FIRST ACCELERATION (PRIMARY ENGINE):
   - For ANY task (simple or heavy), ALWAYS prefer keyboard shortcuts, hotkeys, key combinations, or direct commands before mouse clicks.
   - Shortcuts are instant (sub-100ms), 100% accurate, and never miss pixel targets!
   - Examples:
     * New tab -> hotkey: "ctrl+t" (NOT clicking the '+' icon)
     * Address bar -> hotkey: "ctrl+l" (NOT clicking URL bar)
     * Save document -> hotkey: "ctrl+s" (NOT clicking File -> Save)
     * Close window/tab -> hotkey: "ctrl+w" or "alt+f4"
     * File Explorer -> hotkey: "win+e"
     * Windows Settings -> hotkey: "win+i"
     * Quick Settings -> hotkey: "win+a"
     * Search Windows -> hotkey: "win+s"
     * Shutter in Camera -> key_press: "space" or "enter"
2. INTELLIGENT MOUSE FALLBACK (SECONDARY ENGINE):
   - Use mouse actions (click, double_click, mouse_drag, mouse_scroll) ONLY IF:
     a) A keyboard shortcut or hotkey is IMPOSSIBLE for that specific task (e.g. canvas drawing in Paint, clicking a specific dynamic web link, selecting arbitrary non-focusable UI items).
     b) OR the user EXPLICITLY requested mouse usage (e.g., "mouse use panni click pannu", "use the mouse", "move mouse cursor").
   - Otherwise, strictly accelerate via shortcuts!

⚡ EFFICIENCY, SHORTEST PATH & QUICK ACTIONS RULES:
1. QUICK SETTINGS & SYSTEM TOGGLES (Energy Saver, Battery Saver, Wi-Fi, Bluetooth, Airplane Mode, Night Light, Volume, Brightness):
   - Open Windows Quick Settings using `{"action_type": "hotkey", "key": "win+a"}`.
   - Click the appropriate toggle and output `finish`.
2. SYSTEM STATUS QUERIES:
   - Answer directly using live system status telemetry provided in the prompt.
3. DISTINGUISHING COMPUTER ACTIONS VS CONVERSATIONAL QUESTIONS:
   - NEVER click or type into the active Seyal AI chat input box on screen!
   - If user asks a conversational or factual question, answer directly in "narration" and output `finish`.

Output format (strictly JSON object only):
{
  "thought": "Step-by-step reasoning explaining which sub-task is being executed and verified",
  "narration": "Friendly conversational sentence in user's natural language spoken to the user",
  "action": {
    "action_type": "open_app | click | double_click | right_click | middle_click | type_text | clipboard_paste | hotkey | key_press | mouse_scroll | mouse_drag | focus_window | switch_window | window_minimize | window_maximize | window_close | wait | ask_user | finish",
    "x": 500,
    "y": 320,
    "badge_index": 3,
    "text": "text if applicable",
    "app_name": "app name if open_app or window_close",
    "key": "shortcut if applicable",
    "reasoning": "why"
  }
}
"""

CHATBOT_SYSTEM_PROMPT = """You are Seyal AI, an intelligent, empathetic, warm, and highly capable AI companion on Windows.
You excel at both deep conversation (answering any question, coding, math, science, creative writing, empathy, daily life) and desktop computing.

UNIVERSAL MULTILINGUAL COMMUNICATION:
- Always adapt and reply in the EXACT SAME LANGUAGE and style the user speaks to you:
  * English: fluent, natural, engaging English.
  * Tamil / Tanglish: natural, warm Tamil or Tanglish.
  * Hindi: natural, polite, engaging Hindi.
  * Any other language (Spanish, French, Telugu, Malayalam, German, etc.): respond fluently in that respective language.
- Speak naturally, warmly, and intelligently. Never sound stiff, robotic, or repetitive.
- Keep answers concise, clear, and engaging.

FACTUAL INTEGRITY & SIDEBAR AWARENESS:
- Always base factual statements about user data, saved sessions, and sidebar chat history STRICTLY on the verified facts provided below.
- NEVER fabricate, approximate, or hallucinate numbers or topics.
- When the user asks about chats or search filters, report the EXACT verified counts and titles from context.
"""


async def get_universal_convo_fallback() -> str:
    """Dynamic conversation fallback respecting user's mother tongue and known languages."""
    mt, kl = get_user_language_profile()
    return get_localized_response("convo_fallback", mt, kl)


UNIVERSAL_CONVO_FALLBACK = "I'm listening! How can I help you today? 😊✨"


async def generate_task_acknowledgment(goal: str, router: ModelRouter | None = None) -> str:
    """
    Generate an instantaneous, natural spoken task acknowledgment in the user's EXACT language.
    True Universal Architecture: Powered by Gemini Flash across 100+ languages (English, Tamil,
    Tanglish, Hindi, Telugu, Malayalam, Spanish, French, German, Japanese, Arabic, etc.).
    Zero hardcoded if/else language checks.
    """
    clean_name = goal[:35].strip()
    try:
        r = router or ModelRouter()
        await r.initialize()
        prompt = (
            f"The user gave a computer command: \"{goal}\".\n"
            "Generate a natural, enthusiastic spoken acknowledgment (3 to 6 words) stating that you are starting this task right now.\n"
            "MANDATORY: You MUST reply in the EXACT SAME LANGUAGE and dialect that the user used.\n"
            "Output strictly ONLY the spoken sentence (no quotes, no preamble)."
        )
        res = await asyncio.wait_for(
            r.generate(
                messages=[LLMMessage(role="user", content=prompt)],
                tier=ModelTier.FAST,
                temperature=0.3,
            ),
            timeout=1.5,
        )
        ack = (res.content or "").strip().replace('"', '')
        if ack and len(ack) < 100:
            return ack
    except Exception as e:
        log.warning("Dynamic task acknowledgment notice: %s", e)

    mt, kl = get_user_language_profile()
    return get_localized_response("task_ack", mt, kl, item=clean_name)


async def decompose_user_intents(instruction: str, router: ModelRouter | None = None) -> list[str]:
    """
    Dynamically decomposes compound user requests into ordered sub-goals in ANY language.
    Zero hardcoding: Powered by Gemini Flash semantic reasoning.
    """
    cleaned = instruction.strip()
    if not cleaned:
        return []

    # Quick 0ms check: If there are no compound conjunctions/delimiters, it's a single goal
    conjunction_markers = (",", " and ", " then ", " apram ", " aduthu ", " aur ", " phir ", " y ", " et ", " und ")
    if not any(cm in f" {cleaned.lower()} " for cm in conjunction_markers):
        return [cleaned]

    try:
        r = router or ModelRouter()
        await r.initialize()
        prompt = (
            "You are an intelligent task planner for a computer assistant.\n"
            "The user gave an instruction that may contain one or multiple distinct goals/requests:\n"
            f'User instruction: "{instruction}"\n\n'
            "Analyze the sentence in whatever language it is spoken (English, Tamil, Tanglish, Hindi, Spanish, etc.).\n"
            "If it contains multiple distinct actions or questions (e.g. asking a question AND requesting a computer task), "
            "split them into an ordered list of clear, standalone sub-goals.\n"
            "If it is just a single goal with descriptive words, return a list with just that one goal.\n\n"
            "Output strictly valid JSON array of strings only:\n"
            '["sub-goal 1", "sub-goal 2", ...]'
        )
        res = await asyncio.wait_for(
            r.generate(
                messages=[LLMMessage(role="user", content=prompt)],
                tier=ModelTier.FAST,
                temperature=0.0,
            ),
            timeout=1.5,
        )
        content = (res.content or "").strip()
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            sub_goals = json.loads(match.group(0))
            if isinstance(sub_goals, list) and sub_goals:
                return [str(g).strip() for g in sub_goals if str(g).strip()]
    except Exception as e:
        log.debug("Dynamic intent decomposition notice: %s", e)

    return [cleaned]


class ConversationalComputerUseAgent:
    """
    Conversational Computer-Use Agent with Vision-Action closed loop
    and live human-in-the-loop steering.
    """

    def __init__(
        self,
        router: ModelRouter | None = None,
        grounding: VisualGroundingEngine | None = None,
        executor: ComputerActionExecutor | None = None,
        confirmation: ConfirmationManager | None = None,
        event_bus: EventBus | None = None,
        settings: SeyalAiSettings | None = None,
        max_steps: int = 25,
    ) -> None:
        self._router = router or ModelRouter()
        self._grounding = grounding or VisualGroundingEngine()
        self._executor = executor or ComputerActionExecutor()
        self._confirmation = confirmation or ConfirmationManager()
        self._event_bus = event_bus or get_event_bus()
        self._settings = settings or get_settings()
        self._max_steps = max_steps

        self._status = AgentStatus.IDLE
        self._is_task_running = False
        self._steering_queue: asyncio.Queue[SteeringInstruction] = asyncio.Queue()
        self._history: list[StepRecord] = []
        self._convo_history: list[dict[str, str]] = []
        self._stop_requested = False
        self._pivot_requested = False
        self._pivot_goal: str | None = None
        self._current_task: str = ""

    @property
    def status(self) -> AgentStatus:
        return self._status

    @property
    def is_task_running(self) -> bool:
        return self._is_task_running

    @property
    def history(self) -> list[StepRecord]:
        return list(self._history)

    def request_stop(self) -> None:
        """Immediately trigger emergency stop for computer-use loop."""
        log.warning("Computer-Use stop requested by user or system kill switch.")
        self._stop_requested = True
        self._status = AgentStatus.STOPPED

    async def steer(self, instruction: str | SteeringInstruction) -> None:
        """Inject conversational steering instruction while agent is operating."""
        if isinstance(instruction, str):
            instruction_text = instruction.strip()
            lower = instruction_text.lower()
            # Emergency Stop Check
            if any(lower == s or lower.startswith(s + " ") for s in ("stop", "cancel", "pause", "halt", "niruthu", "quit")):
                self.request_stop()
                return

            # Detect pivot to new goal (Case 4)
            # Note: "instead of" (e.g. click X instead of Y) is in-task guidance, not a task pivot
            is_instead_of = "instead of" in lower
            pivot_markers = ("actually do", "idhu venaam", "athu venaam", "adhu venaam", "change to", "switch to", "nahi balki", "stop and")
            is_pivot = (any(pm in lower for pm in pivot_markers) or lower.endswith(" instead") or " do instead" in lower) and not is_instead_of
            instruction_obj = SteeringInstruction(
                instruction=instruction_text,
                interrupt_current_action=True,
                is_pivot=is_pivot,
                new_goal=instruction_text if is_pivot else None,
            )
            if is_pivot:
                self._pivot_requested = True
                self._pivot_goal = instruction_text
        else:
            instruction_obj = instruction
            if instruction_obj.is_pivot:
                self._pivot_requested = True
                self._pivot_goal = instruction_obj.new_goal or instruction_obj.instruction

        log.info("Received steering instruction (pivot=%s): %s", self._pivot_requested, instruction_obj.instruction)
        await self._steering_queue.put(instruction_obj)

    async def observe(self, tag_elements: bool = True) -> ScreenObservation:
        """Observe and return current screen state with Set-of-Marks overlay."""
        return await self._grounding.observe_screen(tag_elements=tag_elements)

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
        curr_sig = self._action_signature(next_action)
        past_sigs = [self._action_signature(rec.action) for rec in self._history]
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
                for rec in self._history:
                    if rec.action.action_type == ActionType.OPEN_APP and (rec.action.app_name or "").lower().strip() == app:
                        opened = True
                    elif opened and rec.action.action_type in (ActionType.WINDOW_CLOSE, ActionType.CLICK):
                        closed_after = True
                if opened and closed_after:
                    return True, f"Application '{app}' was already opened and closed in this task"

        # 4. Check for 3 consecutive identical actions (excluding wait/scroll)
        if len(all_sigs) >= 3 and all_sigs[-1] == all_sigs[-2] == all_sigs[-3]:
            if next_action.action_type not in (ActionType.WAIT, ActionType.MOUSE_SCROLL):
                return True, f"Repeated identical action 3 times: {curr_sig}"

        return False, ""

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
            await self._router.initialize()
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

            data = json.loads(raw)
            category = data.get("category", "LOW")
            details = data.get("details", "").strip()
            event_date = data.get("event_date")

            if category == "LOW" or not details:
                return

            import datetime
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

    async def generate_welcome_greeting(self, user_name: str = "Friend") -> str:
        """
        Universal Context-Driven Proactive Conversational Opener (ChatGPT-Style).
        Dynamically synthesizes a warm, proactive conversational starter tailored to the
        user's role, recent conversation history, milestones, and natural language.
        """
        import datetime
        now = datetime.datetime.now()
        today = now.date()
        hour = now.hour

        if 5 <= hour < 12:
            time_greeting = "Good morning"
            time_period = "morning"
        elif 12 <= hour < 17:
            time_greeting = "Good afternoon"
            time_period = "afternoon"
        elif 17 <= hour < 22:
            time_greeting = "Good evening"
            time_period = "evening"
        else:
            time_greeting = "Hey"
            time_period = "late night"

        # Check stored memories dynamically across all categories
        milestones = []
        projects = []
        preferences = []
        try:
            from seyal_ai.services.user_knowledge_service import user_knowledge_service
            uk = user_knowledge_service.get_user_knowledge()
            if uk:
                if "name" in uk and user_name in ("Friend", "User", ""):
                    user_name = uk["name"]
                for k, v in uk.items():
                    preferences.append(f"{k}: {v}")
        except Exception:
            pass
        try:
            from seyal_ai.memory.manager import MemoryManager
            manager = MemoryManager()
            all_recs = await asyncio.wait_for(manager.storage.search(limit=25), timeout=0.8)
            for rec in all_recs:
                val = rec.value if isinstance(rec.value, dict) else {"text": str(rec.value)}
                t = val.get("text", str(rec.value))
                if not t:
                    continue
                m_date = val.get("event_date")
                if m_date:
                    try:
                        ed = datetime.date.fromisoformat(m_date)
                        diff = (today - ed).days
                        rel = "tomorrow" if diff == -1 else ("today" if diff == 0 else ("yesterday" if diff == 1 else f"{diff} days ago"))
                        milestones.append(f"{t} (Scheduled for: {rel})")
                    except Exception:
                        milestones.append(t)
                elif "project" in rec.tags or rec.category.value == "current_task" or "project" in rec.key:
                    projects.append(t)
                elif "preference" in rec.tags or rec.category.value in ("user_preference", "app_preference") or "pref" in rec.key:
                    preferences.append(t)
                elif rec.key in ("latest_user_milestone", "active_project_context", "user_preference"):
                    if "milestone" in rec.key:
                        milestones.append(t)
                    elif "project" in rec.key:
                        projects.append(t)
                    else:
                        preferences.append(t)
        except Exception as e:
            log.debug("Dynamic memory retrieval notice for welcome greeting: %s", e)

        # Collect recent conversation summaries across all history
        recent_topics: list[str] = []
        try:
            from seyal_ai.database.engine import get_session
            from seyal_ai.database.repositories.conversation import ConversationRepository
            async with get_session() as db_session:
                repo = ConversationRepository(db_session)
                recent_convs, _ = await asyncio.wait_for(repo.list_conversations(offset=0, limit=10), timeout=0.8)
                for conv in recent_convs:
                    if conv.summary and conv.summary.strip():
                        raw_s = conv.summary.strip()
                        s = re.sub(r"^\[.*?\]\s*", "", raw_s).strip()
                        if not s:
                            s = raw_s
                        lower_s = s.lower()
                        if not any(g in lower_s for g in ("new chat", "untitled", "conversation", "test chat")):
                            conv_date = conv.created_at.date() if hasattr(conv.created_at, 'date') else None
                            if conv_date:
                                days_ago = (today - conv_date).days
                                time_desc = "today" if days_ago == 0 else ("yesterday" if days_ago == 1 else f"{days_ago} days ago")
                                recent_topics.append(f"'{s}' ({time_desc})")
                            else:
                                recent_topics.append(f"'{s}'")
                            if len(recent_topics) >= 3:
                                break
        except Exception as e:
            log.debug("Conversation title history check notice: %s", e)

        # Dynamic, Universal, Context-Aware Proactive Greeting via Fast LLM (Zero-Hang Timeout)
        try:
            await self._router.initialize()
            context_items = []
            if milestones:
                context_items.append(f"Upcoming Milestones/Events: {', '.join(milestones[:2])}")
            if projects:
                context_items.append(f"Ongoing Projects: {', '.join(projects[:2])}")
            if recent_topics:
                context_items.append(f"Recent Topics: {', '.join(recent_topics[:3])}")
            if preferences:
                context_items.append(f"User Preferences: {', '.join(preferences[:2])}")

            context_block = "\n".join(f"- {c}" for c in context_items) if context_items else "No specific prior task context."
            mt, kl = get_user_language_profile()
            lang_guardrail = build_language_guardrail_prompt(mt, kl)

            prompt = (
                "You are Seyal AI, an intelligent autonomous conversational computer-use assistant for Windows PC.\n"
                f"User Name: {user_name}\n"
                f"Current Time & Period: {now.strftime('%I:%M %p')}, {now.strftime('%A, %B %d, %Y')} ({time_period})\n"
                f"User Context & Preferences:\n{context_block}\n\n"
                "Task: Generate a single, warm, natural 1-2 sentence PROACTIVE conversational greeting.\n"
                "Guidelines:\n"
                "1. TIME AWARENESS: Be realistic about the current time! If it is late night (10 PM to 5 AM), do NOT ask if they want to build entire apps 'today' or say 'putting finishing touches today' unless acknowledging working late.\n"
                "2. NO AWKWARD COMBINATIONS: Never mash up multiple unrelated memories into an awkward either/or question (e.g. 'All set for X or doing Y?'). If referencing an active project, naturally mention it and ask how to help on the PC.\n"
                "3. COMPUTER-USE FOCUS: You are an autonomous computer-use agent. Always invite a task, command, or action to perform on their laptop/computer.\n"
                f"4. LANGUAGE MANDATE:\n{lang_guardrail}\n"
                "5. Keep it concise (1 to 2 sentences max).\n"
                "6. Output ONLY the raw greeting sentence. Do not include markdown, quotes, or conversational preamble."
            )

            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.7,
                ),
                timeout=2.0,
            )
            greeting = (res.content or "").strip().replace('"', '')
            if greeting and len(greeting) > 10:
                return greeting
        except Exception as llm_err:
            log.warning("Dynamic LLM greeting generation notice: %s", llm_err)

        # Universal Fallback adhering to user mother tongue and known languages (if LLM is temporarily unreachable)
        mt, kl = get_user_language_profile()
        return get_localized_response("welcome", mt, kl, user=user_name, time_greeting=time_greeting)

    async def _classify_intent(self, goal: str) -> str:
        """
        Universal Multi-Lingual Intent Classifier (0ms safety stop + zero-shot fast LLM).
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
        if lower_clean in emergency_stops or any(lower_goal.startswith(s) for s in ("stop ", "cancel ")):
            return "CONTROL"

        # 2. Universal Fast LLM Intent Classifier
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
                timeout=1.5,
            )
            raw_intent = (res.content or "").strip().upper()
            if "CONTROL" in raw_intent or "STOP" in raw_intent:
                return "CONTROL"
            if "TASK" in raw_intent:
                return "TASK"
            if "CHAT" in raw_intent or "CONVERSATION" in raw_intent:
                return "CHAT"
        except Exception as llm_err:
            log.warning("Universal LLM intent classification notice: %s", llm_err)

        # 3. Fast Fallback Heuristic
        task_action_words = {"open", "launch", "close", "kill", "click", "type", "screenshot", "camera", "calc", "calculator", "notepad", "chrome", "vscode", "explorer", "folder"}
        words = set(re.findall(r"\w+", lower_clean))
        if words.intersection(task_action_words):
            return "TASK"

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

    async def _build_conversational_telemetry_prompt(self) -> str:
        """
        Build verified local desktop telemetry (sidebar chats + installed apps) for conversational queries.
        Universal Multilingual Design: No regex or keyword parsing. Gives the LLM verified ground truth so
        it can accurately answer questions in ANY language (English, Tamil, Tanglish, Hindi, Spanish, etc.).
        """
        blocks = []
        try:
            from seyal_ai.database.engine import get_session
            from seyal_ai.database.repositories.conversation import ConversationRepository
            async with get_session() as db_session:
                repo = ConversationRepository(db_session)
                all_convs, _ = await repo.list_conversations(offset=0, limit=200)
                if all_convs:
                    agent_convs = [c for c in all_convs if (c.summary or "").startswith("[Computer-Use]")]
                    simple_convs = [c for c in all_convs if not (c.summary or "").startswith("[Computer-Use]")]

                    agent_titles = [c.summary.replace("[Computer-Use]", "").strip() for c in agent_convs if c.summary]
                    simple_titles = [c.summary.strip() for c in simple_convs if c.summary]

                    blocks.append(
                        f"SAVED SESSIONS IN USER'S SIDEBAR:\n"
                        f"- Active Mode (Conversational Computer-Use Agent): {len(agent_titles)} total chats.\n"
                        f"  Recent titles: {json.dumps(agent_titles[:35], ensure_ascii=False)}\n"
                        f"- Secondary Mode (Simple Chatbot): {len(simple_titles)} total chats.\n"
                        f"  Recent titles: {json.dumps(simple_titles[:20], ensure_ascii=False)}"
                    )
        except Exception as db_err:
            log.debug("Session list retrieval notice: %s", db_err)

        try:
            from seyal_ai.services.awareness import get_awareness_service
            awareness = get_awareness_service().get_cached_awareness()
            installed = awareness.get("installed_apps", [])
            if installed:
                app_names = [a.get("name") for a in installed if a.get("name")]
                blocks.append(
                    f"INSTALLED SOFTWARE ON USER'S LAPTOP:\n"
                    f"- Total Installed Applications: {len(installed)}\n"
                    f"- Application Names: {json.dumps(app_names[:60], ensure_ascii=False)}"
                )
        except Exception as aware_err:
            log.debug("Awareness telemetry notice: %s", aware_err)

        try:
            from seyal_ai.memory.manager import MemoryManager
            mem_mgr = MemoryManager()
            mem_items = []
            all_recs = await asyncio.wait_for(mem_mgr.storage.search(limit=25), timeout=0.8)
            for rec in all_recs:
                val = rec.value if isinstance(rec.value, dict) else {"text": str(rec.value)}
                t = val.get("text", str(rec.value))
                if not t:
                    continue
                if val.get("event_date"):
                    mem_items.append(f"- Event: {t} (Target Date: {val.get('event_date')})")
                elif "project" in rec.tags or rec.category.value == "current_task" or "project" in rec.key:
                    mem_items.append(f"- Ongoing Project: {t}")
                elif "preference" in rec.tags or rec.category.value in ("user_preference", "app_preference") or "pref" in rec.key:
                    mem_items.append(f"- Preference: {t}")
                else:
                    mem_items.append(f"- Note/Fact: {t}")
            if mem_items:
                blocks.append(
                    "USER PROFILE & MEMORY CONTEXT:\n" + "\n".join(mem_items[:15])
                )
        except Exception as mem_err:
            log.debug("Memory telemetry notice: %s", mem_err)

        try:
            from seyal_ai.services.user_knowledge_service import user_knowledge_service
            uk = user_knowledge_service.get_user_knowledge()
            if uk:
                facts = [f"- {k}: {v}" for k, v in uk.items()]
                blocks.append(
                    "USER KNOWLEDGE VAULT (EXPLICIT USER PROFILE FACTS):\n"
                    + "\n".join(facts)
                )
        except Exception as uk_err:
            log.debug("User knowledge retrieval notice: %s", uk_err)

        if blocks:
            return (
                "\n\nVERIFIED SYSTEM & SIDEBAR TELEMETRY FACTS:\n"
                + "\n\n".join(blocks)
                + "\n\nCRITICAL INSTRUCTIONS FOR SYSTEM TELEMETRY:\n"
                "- When user asks about saved chats, search filters, chat count, or installed software in ANY language:\n"
                "  * Answer strictly using the verified facts above.\n"
                "  * Never fabricate numbers or invent imaginary software.\n"
                "  * Answer naturally and fluently in the user's language."
            )
        return ""

    async def _build_user_language_prompt(self) -> str:
        """Fetch user profile language preferences and build strict language guardrail."""
        try:
            from sqlalchemy import select
            from seyal_ai.database.engine import get_session
            from seyal_ai.database.models import User
            from seyal_ai.llm.prompts.language_guardrail import build_language_guardrail_prompt

            async with get_session() as session:
                stmt = select(User).order_by(User.created_at.desc()).limit(1)
                res = await session.execute(stmt)
                user = res.scalar_one_or_none()
                if user and (user.mother_tongue or user.known_languages):
                    return build_language_guardrail_prompt(
                        mother_tongue=user.mother_tongue,
                        known_languages=user.known_languages,
                    )
        except Exception as err:
            log.debug("User language prompt lookup notice: %s", err)

        from seyal_ai.llm.prompts.language_guardrail import build_language_guardrail_prompt
        return build_language_guardrail_prompt()

    async def _handle_conversational_query(self, goal: str) -> dict[str, Any]:
        """Process conversational chit-chat, Q&A, and discussion using the Full Chatbot Engine."""
        self._status = AgentStatus.THINKING
        await self._router.initialize()

        lang_prompt = await self._build_user_language_prompt()
        system_content = CHATBOT_SYSTEM_PROMPT + lang_prompt + await self._build_conversational_telemetry_prompt()

        messages = [LLMMessage(role="system", content=system_content)]
        for msg in self._convo_history[-10:]:
            messages.append(LLMMessage(role=msg["role"], content=msg["content"]))
        messages.append(LLMMessage(role="user", content=goal))

        try:
            resp = await self._router.generate(
                messages=messages,
                tier=ModelTier.FAST,
                temperature=0.7,
            )
            reply_text = (resp.content or "").strip()
        except Exception as e:
            log.warning("Chatbot generation notice: %s", e)
            reply_text = await get_universal_convo_fallback()

        if not reply_text:
            reply_text = await get_universal_convo_fallback()

        # Update persistent conversational working memory
        self._convo_history.append({"role": "user", "content": goal})
        self._convo_history.append({"role": "assistant", "content": reply_text})
        if len(self._convo_history) > 20:
            self._convo_history = self._convo_history[-20:]

        self._status = AgentStatus.IDLE
        self._is_task_running = False
        await self._event_bus.emit(
            "computer_use.finished",
            {"goal": goal, "narration": reply_text, "step": 0},
        )
        return {
            "status": "completed",
            "intent": "CONVERSATION",
            "is_task": False,
            "goal": goal,
            "narration": reply_text,
            "steps_executed": 0,
            "history": [],
        }

    async def stream_conversational_query(self, goal: str):
        """Stream conversational response token-by-token directly from Gemini."""
        self._status = AgentStatus.THINKING
        await self._router.initialize()

        lang_prompt = await self._build_user_language_prompt()
        system_content = CHATBOT_SYSTEM_PROMPT + lang_prompt + await self._build_conversational_telemetry_prompt()

        messages = [LLMMessage(role="system", content=system_content)]
        for msg in self._convo_history[-10:]:
            messages.append(LLMMessage(role=msg["role"], content=msg["content"]))
        messages.append(LLMMessage(role="user", content=goal))

        full_reply = []
        try:
            async for chunk in self._router.generate_stream(
                messages=messages,
                tier=ModelTier.FAST,
                temperature=0.7,
            ):
                full_reply.append(chunk)
                yield chunk
        except Exception as e:
            log.warning("Stream generation notice: %s", e)
            full_reply.append(UNIVERSAL_CONVO_FALLBACK)
            yield UNIVERSAL_CONVO_FALLBACK

        reply_text = "".join(full_reply).strip() or UNIVERSAL_CONVO_FALLBACK

        self._convo_history.append({"role": "user", "content": goal})
        self._convo_history.append({"role": "assistant", "content": reply_text})
        if len(self._convo_history) > 20:
            self._convo_history = self._convo_history[-20:]

        self._status = AgentStatus.IDLE
        self._is_task_running = False
        await self._event_bus.emit(
            "computer_use.finished",
            {"goal": goal, "narration": reply_text, "step": 0},
        )

    async def _extract_weather_details(self, goal: str) -> tuple[str | None, str]:
        """
        Extract city/town name and target timeframe dynamically via LLM across ANY language.
        Zero hardcoded regexes or language keywords.
        """
        try:
            await self._router.initialize()
            prompt = (
                f"Analyze this user weather query: \"{goal}\".\n"
                "Extract two fields separated by a vertical bar (|):\n"
                "1. Official standardized English city/town name (or NONE if no location is mentioned).\n"
                "2. Target timeframe: either 'tomorrow' if asking about future/tomorrow, or 'current'.\n\n"
                "Example format: Tokyo | current\n"
                "Example format: Chennai | tomorrow\n"
                "Example format: NONE | current\n\n"
                "Output strictly ONLY in the format 'LOCATION | TIMEFRAME', nothing else."
            )
            res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.0,
                ),
                timeout=1.8,
            )
            val = (res.content or "").strip()
            if "|" in val:
                loc_part, time_part = val.split("|", 1)
                loc = loc_part.strip().replace("'", "").replace('"', "")
                target_day = "tomorrow" if "tomorrow" in time_part.lower() else "current"
                return (None if loc.upper() == "NONE" or len(loc) > 50 else loc, target_day)
        except Exception as e:
            log.warning("Weather detail extraction notice: %s", e)

        return (None, "current")

    async def _handle_weather_query(self, goal: str) -> dict[str, Any]:
        """Fetch live weather or forecast dynamically for any city/town and synthesize voice reply in user's language."""
        target_city, target_day = await self._extract_weather_details(goal)

        weather_summary = ""
        if not target_city:
            target_city = "your area"
            weather_summary = "Location not specified by user."
        else:
            try:
                from seyal_ai.tools.system.basic import GetWeatherTool
                weather_tool = GetWeatherTool()
                w_res = await weather_tool.execute(location=target_city, target_day=target_day)
                if hasattr(w_res, "success") and not w_res.success:
                    weather_summary = f"Weather lookup failed: {w_res.error if hasattr(w_res, 'error') else 'service unavailable'}"
                else:
                    weather_summary = w_res.output if hasattr(w_res, "output") else str(w_res)
            except Exception as w_err:
                log.warning("Weather lookup notice for %s: %s", target_city, w_err)
                weather_summary = f"Weather service error: {w_err}"

        # Dynamically synthesize spoken voice reply in user's exact language & dialect
        try:
            await self._router.initialize()
            synth_prompt = (
                "You are an articulate, warm AI companion on Windows.\n"
                f"User asked: \"{goal}\"\n"
                f"Live Weather Data for {target_city}: {weather_summary}\n\n"
                "INSTRUCTIONS:\n"
                "- Synthesize a 1-2 sentence spoken reply providing this weather information.\n"
                "- If location was not specified, politely ask which city or location they would like the weather for.\n"
                "- Respond in the EXACT SAME LANGUAGE and style the user asked in (English, Tamil, Tanglish, Hindi, Spanish, French, German, etc.).\n"
                "- Keep it natural, concise for text-to-speech, and warmly invite the next action or question.\n"
                "Output strictly ONLY the spoken sentence."
            )
            synth_res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=synth_prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.4,
                ),
                timeout=2.0,
            )
            narration = (synth_res.content or "").strip().replace('"', '')
        except Exception as synth_err:
            log.warning("Dynamic weather voice synthesis notice: %s", synth_err)
            mt, kl = get_user_language_profile()
            narration = (
                f"{target_city}-la weather: {weather_summary}."
                if is_user_tamil_preferred(mt, kl)
                else f"The weather in {target_city} is {weather_summary}."
            )

        self._convo_history.append({"role": "user", "content": goal})
        self._convo_history.append({"role": "assistant", "content": narration})

        self._status = AgentStatus.IDLE
        self._is_task_running = False
        await self._event_bus.emit(
            "computer_use.finished",
            {"goal": goal, "narration": narration, "step": 0},
        )
        return {
            "status": "completed",
            "intent": "CONVERSATION",
            "is_task": False,
            "goal": goal,
            "narration": narration,
            "steps_executed": 0,
            "history": [],
        }

    async def _handle_battery_query(self, goal: str) -> dict[str, Any]:
        """Fetch system battery status and respond conversationally in user's language."""
        battery_info = ""
        try:
            import psutil
            battery = psutil.sensors_battery()
            if battery:
                plugged = "charger connected" if battery.power_plugged else "running on battery"
                percent = round(battery.percent)
                battery_info = f"Battery is at {percent}%, {plugged}."
            else:
                battery_info = "Battery sensor is not accessible or device is a desktop PC."
        except Exception as b_err:
            log.warning("Battery status notice: %s", b_err)
            battery_info = "Unable to retrieve battery status."

        # Dynamically synthesize spoken voice reply in user's exact language & dialect
        try:
            await self._router.initialize()
            synth_prompt = (
                "You are an articulate AI desktop companion.\n"
                f"User asked: \"{goal}\"\n"
                f"System Battery Data: {battery_info}\n\n"
                "INSTRUCTIONS:\n"
                "- Synthesize a friendly 1-sentence spoken reply informing the user about their battery status.\n"
                "- Respond in the EXACT SAME LANGUAGE and style the user asked in (English if English, Tamil/Tanglish if Tamil, Hindi if Hindi, etc.).\n"
                "- Keep it brief, natural, and clear for voice text-to-speech.\n"
                "Output strictly ONLY the spoken sentence."
            )
            synth_res = await asyncio.wait_for(
                self._router.generate(
                    messages=[LLMMessage(role="user", content=synth_prompt)],
                    tier=ModelTier.FAST,
                    temperature=0.4,
                ),
                timeout=2.0,
            )
            narration = (synth_res.content or "").strip().replace('"', '')
        except Exception as synth_err:
            log.warning("Dynamic battery voice synthesis notice: %s", synth_err)
            mt, kl = get_user_language_profile()
            narration = (
                f"Laptop battery nilavaram: {battery_info}."
                if is_user_tamil_preferred(mt, kl)
                else f"Your laptop battery status: {battery_info}."
            )

        self._convo_history.append({"role": "user", "content": goal})
        self._convo_history.append({"role": "assistant", "content": narration})

        self._status = AgentStatus.IDLE
        self._is_task_running = False
        await self._event_bus.emit(
            "computer_use.finished",
            {"goal": goal, "narration": narration, "step": 0},
        )
        return {
            "status": "completed",
            "intent": "CONVERSATION",
            "is_task": False,
            "goal": goal,
            "narration": narration,
            "steps_executed": 0,
            "history": [],
        }

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

        # Case 1: Dynamic Multi-Intent Decomposition (Zero Hardcoding)
        sub_goals = await decompose_user_intents(goal, self._router)
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

    async def _execute_single_goal_flow(self, goal: str) -> dict[str, Any]:
        """Execute a single atomic or sequential computer-use goal."""
        self._current_task = goal

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
            if task_spec.task_type in (TaskType.SCHEDULED, TaskType.CONTINUOUS, TaskType.CONDITIONAL):
                if task_spec.permission_state == TaskPermissionState.PENDING:
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

        # Universal Fast-Path: Shortcut-First Acceleration across ANY language/phrasing
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

            # Synthesize natural spoken confirmation in user's language
            try:
                synth_res = await self._router.generate(
                    messages=[
                        LLMMessage(
                            role="user",
                            content=(
                                f"User instruction: \"{goal}\"\n"
                                f"Action performed: Successfully executed shortcut {fast_shortcut.key or fast_shortcut.action_type}.\n"
                                "Synthesize a 1-sentence enthusiastic, natural spoken confirmation in the user's exact language and dialect (e.g. English, Tamil, Tanglish, etc.), warmly asking what to do next.\n"
                                "Output strictly ONLY the spoken sentence."
                            ),
                        )
                    ],
                    tier=ModelTier.FAST,
                    temperature=0.3,
                )
                fast_narr = (synth_res.content or "").strip().replace('"', '')
            except Exception:
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

        # Fast-Path: Direct OS App Launcher (< 200ms without Vision LLM round-trip)
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

            # Synthesize natural spoken confirmation in user's language
            try:
                synth_res = await self._router.generate(
                    messages=[
                        LLMMessage(
                            role="user",
                            content=(
                                f"User instruction: \"{goal}\"\n"
                                f"Action performed: Successfully launched {fast_app.title()}.\n"
                                "Synthesize a 1-sentence enthusiastic, natural spoken confirmation in the user's exact language and dialect (e.g. English, Tamil, Tanglish, etc.), warmly asking what to do next.\n"
                                "Output strictly ONLY the spoken sentence."
                            ),
                        )
                    ],
                    tier=ModelTier.FAST,
                    temperature=0.3,
                )
                fast_narr = (synth_res.content or "").strip().replace('"', '')
            except Exception:
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

        # 2. TASK INTENT: Computer-Use Execution Engine
        self._is_task_running = True
        self._status = AgentStatus.OBSERVING
        await self._event_bus.emit(
            "computer_use.started",
            {"goal": goal, "max_steps": self._max_steps},
        )

        # Emit immediate verbal acknowledgment matching user language dynamically in < 800ms
        ack_narration = await generate_task_acknowledgment(goal, self._router)
        await self._event_bus.emit(
            "computer_use.narrate",
            {"narration": ack_narration, "step": 0},
        )

        step_num = 0
        final_result: dict[str, Any] = {"status": "completed", "intent": "TASK", "is_task": True, "goal": goal, "steps_executed": 0}
        opened_external_apps: list[str] = []
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
                    from seyal_ai.security.permissions import PermissionScope, PermissionScopeManager
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

                    elif action_type in [ActionType.OPEN_APP, ActionType.WINDOW_CLOSE]:
                        if not perm_mgr.is_scope_granted(PermissionScope.APP_CONTROL):
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

                # Snappy UI redraw delay
                await asyncio.sleep(0.01)

            final_result["steps_executed"] = len(self._history)
            final_result["history"] = [
                {
                    "step": s.step_number,
                    "thought": s.thought,
                    "action": str(s.action.action_type),
                    "coordinates": (s.action.x, s.action.y),
                    "success": s.success,
                    "elapsed_seconds": s.elapsed_seconds,
                }
                for s in self._history
            ]
            return final_result

        except Exception as e:
            log.exception("Computer-use loop encountered error: %s", e)
            self._status = AgentStatus.FAILED
            return {"status": "failed", "error": str(e), "steps_executed": len(self._history)}
        finally:
            self._is_task_running = False
            if self._status in (AgentStatus.OBSERVING, AgentStatus.THINKING, AgentStatus.ACTING, AgentStatus.COMPLETED, AgentStatus.STOPPED):
                self._status = AgentStatus.IDLE

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

        # Retrieve live battery/system state if available
        system_status_line = ""
        try:
            import psutil
            battery = psutil.sensors_battery()
            if battery:
                plug_str = "Plugged In (Charging)" if battery.power_plugged else "On Battery"
                system_status_line = f"LIVE SYSTEM STATUS: Battery {battery.percent}%, {plug_str}\n"
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
