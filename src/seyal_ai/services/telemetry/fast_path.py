"""
Fast-Path Intent Router & Telemetry Fact Extractor for Seyal AI.

Provides:
- 0ms instant local hardware action router (`detect_instant_fast_path`)
- Ground-truth telemetry fact extractor (`get_query_fact`)
"""

from __future__ import annotations

import re
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("services.telemetry.fast_path")


class FastPathTelemetryMixin:
    """Provides instant 0ms command detection and dynamic telemetry query fact formatting."""

    def detect_instant_fast_path(self, goal: str) -> dict[str, Any] | None:
        """
        Fast-Path Router: Identifies queries that can be answered or executed locally in < 15ms.
        Returns a dict with query_type, or None if not an instant fast-path.
        """
        lower = goal.lower().strip()
        cleaned = re.sub(r"[^\w\s]", "", lower).strip()

        # 1. Hardware Actions
        # Lock Screen / Computer (Win+L)
        if any(re.search(rf"\b{re.escape(w)}\b", cleaned) for w in ("lock screen", "lock laptop", "lock computer", "laptop ah lock", "screen lock", "lock pannu")):
            return {"type": "ACTION", "action_key": "win+l", "description": "Lock Computer"}

        # Volume Mute (volume_mute)
        if any(w in cleaned for w in ("mute sound", "sound mute", "mute pannu", "audio mute", "unmute sound", "unmute pannu")) or cleaned in ("mute", "unmute"):
            return {"type": "ACTION", "action_key": "volume_mute", "description": "Toggle Audio Mute"}

        # Volume Up
        if any(w in cleaned for w in ("volume up", "sound increase", "volume increase", "sound athigam", "sound perusa", "increase volume", "raise volume", "volume perusu", "sound raise")):
            return {"type": "ACTION", "action_key": "volume_up", "description": "Increase Audio Volume"}

        # Volume Down
        if any(w in cleaned for w in ("volume down", "sound decrease", "volume decrease", "sound kammi", "sound kura", "decrease volume", "lower volume", "volume kammi", "volume kura")):
            return {"type": "ACTION", "action_key": "volume_down", "description": "Decrease Audio Volume"}

        # Open Latest Download File Action
        if any(w in cleaned for w in ("open latest download", "open recent download", "open last download", "latest downloaded file open", "kadasiya download panna file open", "latest download open")):
            return {"type": "ACTION_OPEN_DOWNLOAD"}

        # Set Brightness Action (e.g., "brightness 80% vai", "brightness 50% podu", "set brightness to 70")
        bright_match = re.search(r"brightness\s*(?:to\s*|level\s*)?(\d{1,3})\s*%?", cleaned)
        if bright_match:
            try:
                val = int(bright_match.group(1))
                if 0 <= val <= 100:
                    return {"type": "ACTION_SET_BRIGHTNESS", "level": val}
            except ValueError:
                pass

        # Media Controls (play/pause, next, previous)
        if any(w in cleaned for w in ("play music", "pause music", "pause song", "paata pause", "resume music", "resume song", "paata play", "music pause", "music play")) or cleaned in ("pause", "resume", "play"):
            return {"type": "ACTION_MEDIA", "action_key": "play_pause", "description": "Play/Pause Media"}
        if any(w in cleaned for w in ("next song", "next track", "adutha paattu", "next music", "skip song")):
            return {"type": "ACTION_MEDIA", "action_key": "next", "description": "Next Track"}
        if any(w in cleaned for w in ("previous song", "previous track", "munnadi paattu", "prev track", "prev song")):
            return {"type": "ACTION_MEDIA", "action_key": "previous", "description": "Previous Track"}

        # Settings Action 1: Voice Settings Actions (change voice, voice speed, mute voice, enable voice)
        if ("voice" in cleaned or "kural" in cleaned or "குரல்" in cleaned) and any(w in cleaned for w in ("change", "maathu", "set", "vai", "speed", "rate", "mute", "disable", "off", "stop", "enable", "on", "breeze", "pallavi", "valluvar", "andrew", "emma", "brian", "neerja", "prabhat", "female", "male", "tamil", "thamizh")):
            # Check for Mute / Disable voice
            if any(w in cleaned for w in ("mute voice", "disable voice", "voice disable", "voice off", "voice stop", "text only")):
                return {"type": "ACTION_CHANGE_VOICE", "enabled": False, "description": "Disable voice output (text-only mode)"}
            # Check for Enable voice
            if any(w in cleaned for w in ("enable voice", "voice on", "voice enable", "turn on voice")):
                return {"type": "ACTION_CHANGE_VOICE", "enabled": True, "description": "Enable voice output"}

            # Check for Speed changes
            speed_match = re.search(r"(?:speed|rate)\s*(?:to\s*|level\s*)?(\d+(?:\.\d+)?)\s*x?", lower)
            if speed_match:
                try:
                    s_val = float(speed_match.group(1))
                    if 0.5 <= s_val <= 2.5:
                        return {"type": "ACTION_CHANGE_VOICE", "speed": s_val, "description": f"Set voice speed to {s_val}x"}
                except ValueError:
                    pass
            if any(w in cleaned for w in ("voice speed increase", "faster voice", "voice fast", "pesura speed athigam")):
                return {"type": "ACTION_CHANGE_VOICE", "speed_delta": 0.15, "description": "Increase voice speaking speed"}
            if any(w in cleaned for w in ("voice speed decrease", "slower voice", "voice slow", "pesura speed kammi", "voice speed kura")):
                return {"type": "ACTION_CHANGE_VOICE", "speed_delta": -0.15, "description": "Decrease voice speaking speed"}

            # Check for Voice name change
            for v_name in ("pallavi", "valluvar", "breeze", "andrew", "emma", "brian", "neerja", "prabhat"):
                if v_name in cleaned:
                    return {"type": "ACTION_CHANGE_VOICE", "voice": v_name, "description": f"Switch voice to {v_name.title()}"}
            if any(w in cleaned for w in ("tamil voice", "thamizh voice", "தமிழ் குரல்")):
                return {"type": "ACTION_CHANGE_VOICE", "voice": "pallavi", "language": "ta-IN", "description": "Switch to Tamil voice (Pallavi)"}
            if any(w in cleaned for w in ("female voice", "lady voice", "pen kural")):
                return {"type": "ACTION_CHANGE_VOICE", "voice": "breeze", "description": "Switch to female voice (Breeze)"}
            if any(w in cleaned for w in ("male voice", "man voice", "aan kural")):
                return {"type": "ACTION_CHANGE_VOICE", "voice": "andrew", "description": "Switch to male voice (Andrew)"}

        # Settings Action 2: Permissions Actions (grant, revoke, reset permissions)
        if any(w in cleaned for w in ("permission", "permissions", "அனுமதி")):
            if any(w in cleaned for w in ("grant all", "allow all", "ellathukum", "full permission")):
                return {"type": "ACTION_SET_PERMISSION", "scope": "all", "mode": "allow", "description": "Grant all system capability scopes"}
            if any(w in cleaned for w in ("reset permissions", "reset permission", "default permissions")):
                return {"type": "ACTION_RESET_PERMISSIONS", "description": "Reset permissions to default security baseline"}

            is_revoke = any(w in cleaned for w in ("revoke", "block", "deny", "disable", "thadukku")) or any(re.search(rf"\b{re.escape(w)}\b", cleaned) for w in ("off", "cut"))
            is_grant = any(w in cleaned for w in ("grant", "allow", "kudu", "enable", "tharu")) or any(re.search(rf"\b{re.escape(w)}\b", cleaned) for w in ("on",))

            target_scope = None
            if any(w in cleaned for w in ("keyboard", "typing", "keys")):
                target_scope = "keyboard"
            elif any(w in cleaned for w in ("mouse", "click", "clicks")):
                target_scope = "mouse"
            elif any(w in cleaned for w in ("screen", "screenshot", "capture")):
                target_scope = "screen"
            elif any(w in cleaned for w in ("camera", "webcam")):
                target_scope = "camera"
            elif any(w in cleaned for w in ("mic", "microphone", "audio")):
                target_scope = "mic"
            elif any(w in cleaned for w in ("file", "files", "storage", "folder")):
                target_scope = "file"
            elif any(w in cleaned for w in ("app", "apps", "application")):
                target_scope = "app"
            elif any(w in cleaned for w in ("terminal", "command", "powershell")):
                target_scope = "terminal"

            if target_scope and (is_grant or is_revoke):
                mode = "block" if is_revoke else "allow"
                return {
                    "type": "ACTION_SET_PERMISSION",
                    "scope": target_scope,
                    "mode": mode,
                    "description": f"{'Revoke' if mode == 'block' else 'Grant'} {target_scope} permission",
                }

        # Settings Action 3: Agent Task Manager Actions (cancel task, emergency stop, clear tasks)
        if any(w in cleaned for w in ("emergency stop", "emergency halt", "kill all tasks", "halt everything")):
            return {"type": "ACTION_MANAGE_TASK", "action": "emergency_stop", "description": "Emergency stop all agent tasks"}
        if any(w in cleaned for w in ("cancel task", "stop task", "task ah stop", "cancel current task", "running task ah niruthu", "stop active task", "task niruthu")):
            return {"type": "ACTION_MANAGE_TASK", "action": "cancel", "description": "Cancel active agent task"}
        if any(w in cleaned for w in ("clear tasks", "clear completed tasks", "task history clear", "clear task queue")):
            return {"type": "ACTION_MANAGE_TASK", "action": "clear", "description": "Clear completed tasks in task manager"}

        # 2. Fast Information Queries
        # Battery Query
        battery_triggers = (
            "battery", "charge", "percentage", "battery status", "charge evlo",
            "battery evvalavu", "charge ethana", "battery nilavaram", "battery percent",
            "is laptop charging", "battery level"
        )
        if any(t in cleaned for t in battery_triggers) and not any(cw in cleaned for cw in ("save", "mode", "settings", "buy", "replace")):
            return {"type": "QUERY_BATTERY"}

        # Active Window Query
        window_triggers = (
            "active window", "what window", "current window", "which window",
            "enna window", "active app", "what app is open", "screen la enna",
            "thiranthirukkum window", "current app"
        )
        if any(t in cleaned for t in window_triggers):
            return {"type": "QUERY_WINDOW"}

        # Recent Downloads Query
        if ("download" in cleaned or "downloads" in cleaned) and any(w in cleaned for w in ("latest", "recent", "kadasiya", "enna", "file", "status", "list", "open")):
            # If not an open action, treat as query
            if not any(w in cleaned for w in ("open", "thira")):
                return {"type": "QUERY_DOWNLOADS"}
            return {"type": "ACTION_OPEN_DOWNLOAD"}

        # Network & Wi-Fi Query
        wifi_triggers = (
            "wi-fi status", "wifi status", "wifi connect aagi irukka", "which wifi",
            "wifi signal", "enna wifi", "internet connect", "internet status",
            "network status", "wifi network"
        )
        if any(t in cleaned for t in wifi_triggers):
            return {"type": "QUERY_WIFI"}

        # Connected Displays / Monitors Query
        display_triggers = (
            "second monitor", "monitors evlo", "how many monitors", "screen count",
            "external monitor", "displays evlo", "display count", "display setup"
        )
        if any(t in cleaned for t in display_triggers):
            return {"type": "QUERY_DISPLAYS"}

        # Clipboard Query
        if "clipboard" in cleaned and any(w in cleaned for w in ("enna", "content", "what", "read", "preview", "text", "sollu", "irukku", "copy", "show")):
            return {"type": "QUERY_CLIPBOARD"}

        # Running Background Task Query
        bg_task_triggers = (
            "task eppadi poguthu", "how is task going", "enna task run aaguthu",
            "any task running", "running tasks", "task status enna", "task progress"
        )
        if any(t in cleaned for t in bg_task_triggers):
            return {"type": "QUERY_BACKGROUND_TASKS"}

        # Reminders Query
        reminder_triggers = (
            "what are my reminders", "reminders enna", "innaiku enna reminders",
            "reminders list", "show reminders", "any reminders", "reminders irukka",
            "pending reminders", "remind pannu", "today reminders", "gnyabagam"
        )
        if any(t in cleaned for t in reminder_triggers) and not any(cw in cleaned for cw in ("add", "create", "set reminder", "delete", "remove")):
            return {"type": "QUERY_REMINDERS"}

        # Standing Rules Query
        rule_triggers = (
            "standing rules", "active rules", "what are my rules", "rules enna",
            "standing rules list", "watchers list", "active watchers"
        )
        if any(t in cleaned for t in rule_triggers) and not any(cw in cleaned for cw in ("add", "create", "set", "delete", "remove")):
            return {"type": "QUERY_RULES"}

        # Storage & Disk Query
        storage_triggers = ("storage", "disk space", "c drive", "d drive", "free space", "hard disk", "evlo space", "space irukka", "drive space")
        if any(t in cleaned for t in storage_triggers):
            return {"type": "QUERY_STORAGE"}

        # CPU / RAM Resources Query
        resource_triggers = ("ram", "cpu", "heavy apps", "memory usage", "laptop slow", "resource usage", "heavy process", "ethu athigam ram")
        if any(t in cleaned for t in resource_triggers):
            return {"type": "QUERY_RESOURCES"}

        # Last Task / Recent Session Query
        last_task_triggers = (
            "last task", "previous task", "last chat", "previous chat",
            "kadasiya enna", "munnadi enna", "last ah enna",
            "what did we do", "recent task", "last session", "previous session"
        )
        if any(t in cleaned for t in last_task_triggers):
            return {"type": "QUERY_LAST_TASK"}

        # Voice Settings Query
        if ("voice" in cleaned or "kural" in cleaned or "குரல்" in cleaned) and any(w in cleaned for w in ("what", "enna", "current", "active", "status", "settings", "profile", "kaami", "show", "pesura")):
            return {"type": "QUERY_VOICE_SETTINGS"}

        # Permissions Query
        if ("permission" in cleaned or "permissions" in cleaned or "அனுமதி" in cleaned) and any(w in cleaned for w in ("what", "enna", "status", "list", "check", "irukka", "kaami", "show", "active")):
            return {"type": "QUERY_PERMISSIONS"}

        # Agent Task Manager Query
        if ("task manager" in cleaned or "active tasks" in cleaned or "running tasks" in cleaned or "tasks list" in cleaned) and any(w in cleaned for w in ("what", "enna", "list", "running", "status", "queue", "kaami", "show", "open", "view")):
            return {"type": "QUERY_TASKS"}

        # AI Models Query
        if any(w in cleaned for w in ("ai model", "ai models", "which model", "current model", "what model", "model enna")):
            return {"type": "QUERY_AI_MODELS"}

        # Unified Settings Query
        if any(w in cleaned for w in ("agent settings", "all settings", "settings enna", "what are my settings", "show settings", "settings kaami", "settings summary")):
            return {"type": "QUERY_SETTINGS"}

        # Canonical Keyboard Shortcuts Engine (< 1ms fallback before LLM)
        try:
            from seyal_ai.agents.computer_use.shortcuts import detect_fast_shortcut
            shortcut_act = detect_fast_shortcut(goal)
            if shortcut_act:
                return {
                    "type": "ACTION",
                    "action_key": shortcut_act.key,
                    "description": shortcut_act.reasoning or f"Execute {shortcut_act.key}",
                }
        except Exception:
            pass

        return None

    def get_query_fact(self, query_type: str, snap: dict[str, Any], recent: dict[str, Any]) -> str:
        """Dynamically extract verified telemetry facts for any query type without canned strings."""
        get_clip = getattr(self, "get_clipboard_preview", lambda: "")
        get_narr = getattr(self, "get_background_task_narrative", lambda: None)
        get_res = getattr(self, "get_resource_telemetry", lambda scan_processes=True: {})
        get_v_set = getattr(self, "get_voice_settings", lambda: {"description": "", "friendly_name": "", "speed": 1.0})
        get_perms = getattr(self, "get_permissions_overview", lambda: {"summary_text": "", "granted_count": 0})
        get_tasks = getattr(self, "get_task_manager_overview", lambda: {"summary_text": "", "active_plan_count": 0})
        get_models = getattr(self, "get_ai_models_overview", lambda: {"summary_text": "", "provider": "gemini", "fast_model": "gemini-flash-lite-latest"})

        fact_map = {
            "QUERY_BATTERY": lambda: f"Battery: {snap['battery']['status_text']}",
            "QUERY_WINDOW": lambda: f"Active foreground window: '{snap['active_window']}'",
            "QUERY_DOWNLOADS": lambda: (
                f"Recent download: '{snap['recent_downloads'][0]['name']}' ({snap['recent_downloads'][0]['size_str']})"
                if snap.get("recent_downloads") else "Downloads directory is currently empty."
            ),
            "QUERY_WIFI": lambda: f"Network Wi-Fi status: {snap.get('network', {}).get('status_text', 'Disconnected')}",
            "QUERY_DISPLAYS": lambda: f"Monitors: {snap.get('displays', {}).get('status_text', '1 display')}",
            "QUERY_CLIPBOARD": lambda: (
                f"Clipboard content: '{get_clip()[:80].replace(chr(10), ' ')}'"
                if get_clip() else "Clipboard is currently empty."
            ),
            "QUERY_BACKGROUND_TASKS": lambda: (
                f"Background task: {get_narr()}"
                if get_narr() else "No active background tasks running."
            ),
            "QUERY_REMINDERS": lambda: (
                f"Today's pending reminders ({len(snap['reminders'])}): " + ", ".join([r.get("title", "") for r in snap["reminders"][:3]])
                if snap.get("reminders") else "No pending reminders for today."
            ),
            "QUERY_RULES": lambda: (
                f"Active standing rules ({len(snap['standing_rules'])}): " + ", ".join([r.get("title", "") for r in snap["standing_rules"][:3]])
                if snap.get("standing_rules") else "No active standing rules configured."
            ),
            "QUERY_LAST_TASK": lambda: (
                f"Previous task: '{recent.get('summary')}'"
                if recent.get("summary") else "No prior tasks found."
            ),
            "QUERY_STORAGE": lambda: (
                f"Disk Storage: {', '.join([d['status_text'] for d in snap.get('storage', [])])}"
                if snap.get("storage") else "Disk storage information unavailable."
            ),
            "QUERY_RESOURCES": lambda: f"System Resources: {get_res(scan_processes=True).get('status_text', 'Normal')}",
            "QUERY_VOICE_SETTINGS": lambda: f"Voice Settings: {get_v_set()['description']}",
            "QUERY_PERMISSIONS": lambda: f"Security Permissions: {get_perms()['summary_text']}",
            "QUERY_TASKS": lambda: f"Agent Tasks: {get_tasks()['summary_text']}",
            "QUERY_AI_MODELS": lambda: f"AI Models: {get_models()['summary_text']}",
            "QUERY_SETTINGS": lambda: (
                f"Seyal AI Settings: Voice={get_v_set()['friendly_name']} ({get_v_set()['speed']}x), "
                f"Permissions={get_perms()['granted_count']} granted, "
                f"Tasks={get_tasks()['active_plan_count']} active, "
                f"Model={get_models()['provider']} ({get_models()['fast_model']})."
            ),
        }
        getter = fact_map.get(query_type)
        if getter:
            try:
                return getter()
            except Exception:
                pass
        return "System telemetry is operational."
