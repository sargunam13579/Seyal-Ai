"""
Prompts & Language Guardrail Mixin for Seyal AI Conversational Computer-Use Agent.

Defines:
- COMPUTER_USE_SYSTEM_PROMPT: Complete autonomous visual agent persona, action schemas, and strict closed-loop rules.
- CHATBOT_SYSTEM_PROMPT: Warm, articulate conversational persona for chit-chat, Q&A, and discussion.
- UNIVERSAL_CONVO_FALLBACK: Multilingual conversational fallback string.
- PromptsMixin: Dynamic telemetry and language prompt builder methods.
"""

from __future__ import annotations

import asyncio
import json
import time

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.prompts")

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
   - NEVER close the host assistant window.
   - For UI actions inside apps or Seyal AI, click the specific buttons (e.g. confirm, delete, trash icon) directly.

🎯 CORE LIFECYCLE RULE 2: SHORTCUT-FIRST & FAST-PATH EXECUTION (0.1ms vs 2.5s):
1. ALWAYS prioritize Windows keyboard shortcuts and fast hotkeys over pixel hunting whenever applicable:
   - To open Windows Start: key_press `win`
   - To open Settings: hotkey `win+i`
   - To open File Explorer: hotkey `win+e`
   - To open Task Manager: hotkey `ctrl+shift+esc`
   - To open Action Center / Quick Settings: hotkey `win+a`
   - To open Notifications: hotkey `win+n`
   - To take photo in Camera app: key_press `space` or `enter`
   - To open new tab in Browser: hotkey `ctrl+t`
   - To close current tab in Browser: hotkey `ctrl+w`
   - To save: hotkey `ctrl+s`
2. Only use Set-of-Marks coordinate clicks when keyboard shortcuts are insufficient for the specific task.

CRITICAL CLOSED-LOOP VERIFICATION RULES:
1. Always output strict JSON only.
2. In each step, verify the outcome of your prior action before deciding the next step.
3. If an action fails or does not change screen state, try an alternative action or shortcut.
4. Output your decision in this JSON format:
{
  "thought": "Friendly internal reasoning about current screen state and verification",
  "narration": "Cheerful, natural spoken narration to the user in their language explaining the next step",
  "action": {
    "action_type": "open_app | click | double_click | right_click | type_text | hotkey | key_press | mouse_scroll | wait | finish",
    "x": 500,
    "y": 300,
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

UNIVERSAL_CONVO_FALLBACK = "I'm listening! How can I help you today? 😊✨"


class PromptsMixin:
    """Provides methods for constructing verified conversational telemetry and language guardrail prompts."""

    _telemetry_cache: tuple[float, str] | None = None
    _lang_cache: tuple[float, str] | None = None

    async def _build_conversational_telemetry_prompt(self) -> str:
        """
        Build verified local desktop telemetry (sidebar chats + installed apps) for conversational queries.
        Universal Multilingual Design: Cached for 60s in RAM to eliminate database/disk roundtrips.
        """
        now = time.time()
        cached = getattr(self, "_telemetry_cache", None)
        if cached and (now - cached[0] < 60.0):
            return cached[1]

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

        try:
            from seyal_ai.services.seyal_ai_service import seyal_ai_service
            situational_prompt = await seyal_ai_service.build_situational_prompt()
            if situational_prompt:
                blocks.append(situational_prompt.strip())
        except Exception as seyal_err:
            log.debug("Seyal AI telemetry notice: %s", seyal_err)

        res = ""
        if blocks:
            res = (
                "\n\nVERIFIED SYSTEM & SIDEBAR TELEMETRY FACTS:\n"
                + "\n\n".join(blocks)
                + "\n\nCRITICAL INSTRUCTIONS FOR SYSTEM TELEMETRY:\n"
                "- When user asks about saved chats, search filters, chat count, or installed software in ANY language:\n"
                "  * Answer strictly using the verified facts above.\n"
                "  * Never fabricate numbers or invent imaginary software.\n"
                "  * Answer naturally and fluently in the user's language."
            )
        self._telemetry_cache = (now, res)
        return res

    async def _build_user_language_prompt(self, current_input: str | None = None) -> str:
        """Fetch user profile language preferences and build strict language guardrail (cached in RAM)."""
        now = time.time()
        cached = getattr(self, "_lang_cache", None)
        if cached and (now - cached[0] < 60.0) and not current_input:
            return cached[1]

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
                    prompt = build_language_guardrail_prompt(
                        mother_tongue=user.mother_tongue,
                        known_languages=user.known_languages,
                        current_input=current_input,
                    )
                    if not current_input:
                        self._lang_cache = (now, prompt)
                    return prompt
        except Exception as err:
            log.debug("User language prompt lookup notice: %s", err)

        from seyal_ai.llm.prompts.language_guardrail import build_language_guardrail_prompt
        return build_language_guardrail_prompt(current_input=current_input)
