"""
Situational Snapshot & Spoken Narration Mixin for Seyal AI.

Provides:
- Synchronous live situational snapshot aggregation (`get_live_telemetry_snapshot`)
- Comprehensive situational awareness prompt builder (`build_situational_prompt`)
- Dynamic LLM-synthesized spoken query replies (`synthesize_fast_spoken_reply`)
- Dynamic spoken action confirmation narrations (`synthesize_action_narration`)
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from seyal_ai.utils.logging import get_logger

log = get_logger("services.telemetry.narration")


class NarrationTelemetryMixin:
    """Provides methods for aggregating situational snapshots, situational prompts, and speech synthesis."""

    if TYPE_CHECKING:
        async def get_recent_task_info(self) -> dict[str, Any]: ...
        def get_query_fact(self, query_type: str, snap: dict[str, Any], recent: dict[str, Any]) -> str: ...

    def get_live_telemetry_snapshot(self) -> dict[str, Any]:
        """
        Aggregates full synchronous telemetry in < 10ms:
        - Active Window
        - Battery & Power
        - CPU / RAM Diagnostics
        - Today's Reminders
        - Active Standing Rules
        - User Knowledge Vault
        - Recent Downloads
        - Wi-Fi Network State
        - Display Metrics
        - Disk Storage
        - System Resources
        - Recent Desktop Files
        - Voice Settings, Permissions, Tasks, AI Models
        """
        active_window = getattr(self, "get_active_window", lambda: "Desktop / Windows Shell")()
        battery = getattr(self, "get_battery_telemetry", lambda: {"available": False, "percent": 100, "status_text": "AC Power"})()
        hardware = getattr(self, "get_hardware_diagnostics", lambda: {"cpu_percent": 0.0, "ram_percent": 0.0})()
        hub = getattr(self, "get_user_hub_context", lambda: {"pending_reminders": [], "active_standing_rules": [], "user_knowledge": {}})()
        downloads = getattr(self, "get_recent_downloads", lambda limit=2: [])(limit=2)
        network = getattr(self, "get_network_telemetry", lambda: {"status_text": "Disconnected"})()
        displays = getattr(self, "get_display_telemetry", lambda: {"status_text": "1 display"})()
        storage = getattr(self, "get_storage_telemetry", lambda: [])()
        resources = getattr(self, "get_resource_telemetry", lambda: {"status_text": "Normal"})()
        desktop_files = getattr(self, "get_recent_desktop_files", lambda limit=2: [])(limit=2)

        voice_settings = getattr(self, "get_voice_settings", lambda: {})()
        permissions = getattr(self, "get_permissions_overview", lambda: {})()
        tasks = getattr(self, "get_task_manager_overview", lambda: {})()
        ai_models = getattr(self, "get_ai_models_overview", lambda: {})()

        return {
            "active_window": active_window,
            "battery": battery,
            "hardware": hardware,
            "reminders": hub.get("pending_reminders", []),
            "standing_rules": hub.get("active_standing_rules", []),
            "user_knowledge": hub.get("user_knowledge", {}),
            "recent_downloads": downloads,
            "network": network,
            "displays": displays,
            "storage": storage,
            "resources": resources,
            "recent_desktop_files": desktop_files,
            "voice_settings": voice_settings,
            "permissions": permissions,
            "tasks": tasks,
            "ai_models": ai_models,
        }

    async def build_situational_prompt(self) -> str:
        """
        Builds a comprehensive, verified Situational Awareness block for agent reasoning prompts.
        Universal Multilingual: Verified facts so agent can answer in any language.
        """
        snap = self.get_live_telemetry_snapshot()
        recent = await self.get_recent_task_info() if hasattr(self, "get_recent_task_info") else {}

        blocks = []
        blocks.append(f"- Active Foreground Window: {snap['active_window']}")
        blocks.append(f"- System Battery / Power: {snap['battery']['status_text']}")
        blocks.append(
            f"- Hardware Performance: CPU {snap['hardware']['cpu_percent']}%, RAM {snap['hardware']['ram_percent']}%"
        )
        blocks.append(f"- Network (Wi-Fi): {snap['network']['status_text']}")
        blocks.append(f"- Connected Displays: {snap['displays']['status_text']}")

        # Settings & Permissions Awareness
        v_set = snap.get("voice_settings") or {}
        if v_set.get("description"):
            blocks.append(f"- Active Voice & Speech: {v_set['description']}")

        perms = snap.get("permissions") or {}
        if perms.get("summary_text"):
            blocks.append(f"- Security Permissions: {perms['summary_text']}")

        tasks_ov = snap.get("tasks") or {}
        if tasks_ov.get("summary_text"):
            blocks.append(f"- Agent Tasks Queue: {tasks_ov['summary_text']}")

        models_ov = snap.get("ai_models") or {}
        if models_ov.get("summary_text"):
            blocks.append(f"- AI Models Configuration: {models_ov['summary_text']}")

        # Storage Telemetry
        storage = snap.get("storage") or []
        if storage:
            d_strs = [d.get("status_text", "") for d in storage if d.get("status_text")]
            blocks.append(f"- Disk Storage: {', '.join(d_strs)}")

        # Resource & RAM Telemetry
        res = snap.get("resources") or {}
        if res.get("status_text"):
            blocks.append(f"- System Resources: {res['status_text']}")

        downloads = snap.get("recent_downloads") or []
        if downloads:
            dl_str = ", ".join([f"'{d['name']}' ({d['size_str']})" for d in downloads[:2]])
            blocks.append(f"- Recent Downloads: {dl_str}")

        desktop_files = snap.get("recent_desktop_files") or []
        if desktop_files:
            dt_str = ", ".join([f"'{d['name']}' ({d['size_str']})" for d in desktop_files[:2]])
            blocks.append(f"- Recent Desktop Files: {dt_str}")

        task_narr = getattr(self, "get_background_task_narrative", lambda: None)()
        if task_narr:
            blocks.append(f"- Background Agent Activity: {task_narr}")

        reminders = snap["reminders"]
        if reminders:
            rem_lines = []
            for r in reminders[:5]:
                t = r.get("title", "Reminder")
                target = r.get("target_time")
                time_s = f" (Time: {target})" if target else ""
                rem_lines.append(f"  * {t}{time_s}")
            blocks.append(f"- Today's Pending Reminders ({len(reminders)}):\n" + "\n".join(rem_lines))
        else:
            blocks.append("- Today's Pending Reminders: None scheduled")

        rules = snap["standing_rules"]
        if rules:
            rule_lines = [f"  * {r.get('title', 'Rule')}: {r.get('description', '')}" for r in rules[:5]]
            blocks.append(f"- Active Standing Rules & Watchers ({len(rules)}):\n" + "\n".join(rule_lines))

        uk = snap["user_knowledge"]
        if uk:
            uk_lines = [f"  * {k}: {v}" for k, v in list(uk.items())[:6]]
            blocks.append("- User Knowledge Profile Facts:\n" + "\n".join(uk_lines))

        if recent.get("has_history") and recent.get("summary"):
            blocks.append(
                f"- Most Recent Session / Task: '{recent['summary']}' "
                f"(Total sessions: {recent['total_saved_sessions']})"
            )

        return (
            "\n\n[SEYAL AI LIVE SITUATIONAL AWARENESS & TELEMETRY]\n"
            + "\n".join(blocks)
            + "\n\nSEYAL AI BEHAVIORAL INSTRUCTION:\n"
            "You are Seyal AI: you have instant real-time access to the user's laptop, active window, battery, reminders, network, and files.\n"
            "If the user asks about system state, downloads, Wi-Fi, displays, reminders, active window, storage, or previous task, answer directly with the verified facts above without guessing."
        )

    async def synthesize_fast_spoken_reply(
        self,
        query_type: str,
        goal: str,
        router: Any,
    ) -> str:
        """
        Dynamically synthesize a natural spoken response using the LLM grounded on live facts.
        No hardcoded if-else conversational templates.
        """
        snap = self.get_live_telemetry_snapshot()
        recent = await self.get_recent_task_info() if hasattr(self, "get_recent_task_info") else {}
        data_summary = self.get_query_fact(query_type, snap, recent) if hasattr(self, "get_query_fact") else "Operational"

        factual_fallback = data_summary

        if router:
            try:
                from seyal_ai.llm.providers.base import LLMMessage, ModelTier

                await router.initialize()
                synth_prompt = (
                    "You are Seyal AI, an articulate, friendly, and lightning-fast desktop AI companion.\n"
                    f'User asked: "{goal}"\n'
                    f"Verified Ground Truth: {data_summary}\n\n"
                    "INSTRUCTIONS:\n"
                    "- Synthesize a natural, conversational 1-sentence spoken response informing the user.\n"
                    "- Mirror the user's exact language and dialect (e.g., Tanglish if Tanglish, Tamil if Tamil, English if English, Hindi if Hindi).\n"
                    "- Answer directly using the verified ground truth.\n"
                    "- Keep it brief and friendly for voice text-to-speech.\n"
                    "Output strictly ONLY the spoken sentence."
                )
                synth_res = await asyncio.wait_for(
                    router.generate(
                        messages=[LLMMessage(role="user", content=synth_prompt)],
                        tier=ModelTier.FAST,
                        temperature=0.4,
                    ),
                    timeout=1.2,
                )
                result = (synth_res.content or "").strip().replace('"', "")
                if result and len(result) > 5 and not result.startswith("⚠️"):
                    return result
            except Exception as e:
                log.debug("Dynamic speech synthesis notice: %s", e)

        return factual_fallback

    async def synthesize_action_narration(
        self,
        action_name: str,
        goal: str,
        router: Any,
        details: str = "",
    ) -> str:
        """
        Dynamically synthesize natural spoken confirmation for completed actions.
        No hardcoded if-else scripted strings.
        """
        factual_fallback = details or f"{action_name.replace('_', ' ').title()} completed successfully."
        if "mute" in action_name.lower():
            factual_fallback = "Audio mute toggled."

        if router:
            try:
                from seyal_ai.llm.providers.base import LLMMessage, ModelTier

                await router.initialize()
                synth_prompt = (
                    "You are Seyal AI, an intelligent desktop companion.\n"
                    f'User command: "{goal}"\n'
                    f"Action Completed: {action_name} ({details or 'Success'})\n\n"
                    "INSTRUCTIONS:\n"
                    "- Synthesize a natural, friendly 1-sentence spoken confirmation to the user.\n"
                    "- Mirror the user's exact language and dialect (e.g., Tanglish if Tanglish, Tamil if Tamil, English if English).\n"
                    "- Keep it brief and natural for voice text-to-speech.\n"
                    "Output strictly ONLY the spoken confirmation."
                )
                synth_res = await asyncio.wait_for(
                    router.generate(
                        messages=[LLMMessage(role="user", content=synth_prompt)],
                        tier=ModelTier.FAST,
                        temperature=0.4,
                    ),
                    timeout=1.2,
                )
                result = (synth_res.content or "").strip().replace('"', "")
                if result and len(result) > 4 and not result.startswith("⚠️"):
                    return result
            except Exception as e:
                log.debug("Action narration synthesis notice: %s", e)

        return factual_fallback
