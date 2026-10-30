"""
Conversational Queries & Spoken System Status Mixin for Seyal AI Computer-Use Agent.

Provides:
- ChatGPT-style proactive, personalized welcome greeting (`generate_welcome_greeting`)
- Full conversational chatbot query handler (`_handle_conversational_query`)
- Streaming conversational query generator (`stream_conversational_query`)
- Dynamic weather detail extraction & query handling (`_extract_weather_details`, `_handle_weather_query`)
- System battery status query handling (`_handle_battery_query`)
"""

from __future__ import annotations

import asyncio
import datetime
import re
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from seyal_ai.llm.router import ModelRouter
    from seyal_ai.utils.events import EventBus

from seyal_ai.agents.computer_use.decomposition import get_universal_convo_fallback
from seyal_ai.agents.computer_use.prompts import CHATBOT_SYSTEM_PROMPT, UNIVERSAL_CONVO_FALLBACK
from seyal_ai.agents.computer_use.protocol import AgentStatus
from seyal_ai.llm.prompts.language_guardrail import (
    build_language_guardrail_prompt,
    get_localized_response,
    get_user_language_profile,
    is_user_tamil_preferred,
)
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.conversation")


class ConversationalQueriesMixin:
    """Provides methods for conversational interactions, welcome greetings, and conversational system status."""

    if TYPE_CHECKING:
        _router: ModelRouter
        _event_bus: EventBus
        _status: AgentStatus
        _is_task_running: bool
        _convo_history: list[dict[str, str]]

        async def _build_user_language_prompt(self, current_input: str | None = None) -> str: ...
        async def _build_conversational_telemetry_prompt(self) -> str: ...

    async def generate_welcome_greeting(self, user_name: str = "Friend") -> str:
        """
        Universal Context-Driven Proactive Conversational Opener (ChatGPT-Style).
        Dynamically synthesizes a warm, proactive conversational starter tailored to the
        user's role, recent conversation history, milestones, and natural language.
        """
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

        try:
            router = self._router
            await router.initialize()
            context_items = []

            try:
                from seyal_ai.services.seyal_ai_service import seyal_ai_service
                snap = seyal_ai_service.get_live_telemetry_snapshot()
                if snap.get("active_window") and snap["active_window"] != "Desktop / Windows Shell":
                    context_items.append(f"Active App Currently on Screen: '{snap['active_window']}'")
                rems = snap.get("reminders") or []
                if rems:
                    rem_titles = [r.get("title", "") for r in rems[:2] if r.get("title")]
                    context_items.append(f"Pending Reminders for Today: {', '.join(rem_titles)}")
                bat = snap.get("battery") or {}
                if bat.get("available") and not bat.get("power_plugged") and bat.get("percent", 100) <= 25:
                    context_items.append(f"Battery Alert: Low battery ({bat.get('percent')}%)")
            except Exception as j_err:
                log.debug("Seyal AI telemetry for greeting notice: %s", j_err)

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
                router.generate(
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

        mt, kl = get_user_language_profile()
        return get_localized_response("welcome", mt, kl, user=user_name, time_greeting=time_greeting)

    async def _handle_conversational_query(self, goal: str) -> dict[str, Any]:
        """Process conversational chit-chat, Q&A, and discussion using the Full Chatbot Engine."""
        self._status = AgentStatus.THINKING
        router = self._router
        await router.initialize()

        lang_prompt = await self._build_user_language_prompt(current_input=goal)
        system_content = CHATBOT_SYSTEM_PROMPT + lang_prompt + await self._build_conversational_telemetry_prompt()

        messages = [LLMMessage(role="system", content=system_content)]
        for msg in self._convo_history[-10:]:
            messages.append(LLMMessage(role=msg["role"], content=msg["content"]))
        messages.append(LLMMessage(role="user", content=goal))

        try:
            resp = await router.generate(
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

        self._convo_history.append({"role": "user", "content": goal})
        self._convo_history.append({"role": "assistant", "content": reply_text})
        if len(self._convo_history) > 20:
            self._convo_history = self._convo_history[-20:]

        self._status = AgentStatus.IDLE
        self._is_task_running = False
        event_bus = self._event_bus
        await event_bus.emit(
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
        router = self._router
        await router.initialize()

        lang_prompt = await self._build_user_language_prompt()
        system_content = CHATBOT_SYSTEM_PROMPT + lang_prompt + await self._build_conversational_telemetry_prompt()

        messages = [LLMMessage(role="system", content=system_content)]
        for msg in self._convo_history[-10:]:
            messages.append(LLMMessage(role=msg["role"], content=msg["content"]))
        messages.append(LLMMessage(role="user", content=goal))

        full_reply = []
        try:
            async for chunk in router.generate_stream(
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
        event_bus = self._event_bus
        await event_bus.emit(
            "computer_use.finished",
            {"goal": goal, "narration": reply_text, "step": 0},
        )

    async def _extract_weather_details(self, goal: str) -> tuple[str | None, str]:
        """
        Extract city/town name and target timeframe dynamically via LLM across ANY language.
        Zero hardcoded regexes or language keywords.
        """
        try:
            router = self._router
            await router.initialize()
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
                router.generate(
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

        try:
            router = self._router
            await router.initialize()
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
                router.generate(
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
        event_bus = self._event_bus
        await event_bus.emit(
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

        try:
            router = self._router
            await router.initialize()
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
                router.generate(
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
        event_bus = self._event_bus
        await event_bus.emit(
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
