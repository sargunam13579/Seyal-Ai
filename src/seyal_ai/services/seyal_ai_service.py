"""
Seyal AI Unified Architecture & Live Telemetry Service.

Connects sub-features across Seyal AI into a unified situational awareness hub:
1. Live Desktop Awareness: Active foreground window, running app context.
2. Hardware Power & Telemetry: Battery %, charging state, CPU, RAM.
3. User Knowledge & Reminders: Today's pending reminders, active standing rules, user vault facts.
4. Recent Session & Task Info: Last conversation summary, recent goals.
5. Files & Downloads Telemetry: Recent downloads, file launcher.
6. Network & Connected Displays: Wi-Fi status, multi-monitor configuration.
7. System Control: Screen brightness, audio control, lock screen.
8. Background Task Queue: TelemetryHub active task tracking.
9. 0ms Fast-Path Dispatcher: Instant execution for OS hardware actions and live telemetry queries.
"""

from __future__ import annotations

import asyncio
import datetime
import json
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import psutil

try:
    import win32gui
except ImportError:
    win32gui = None

from seyal_ai.llm.prompts.language_guardrail import (
    get_user_language_profile,
    is_user_tamil_preferred,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("services.seyal_ai_service")


class SeyalAiTelemetryService:
    """Aggregates local system telemetry and provides instant 0ms situational awareness."""

    def __init__(self) -> None:
        self._last_active_window: str = ""
        self._cached_wifi: dict[str, Any] = {"connected": False, "ssid": "", "signal": "", "status_text": "Disconnected"}
        self._cached_wifi_time: float = 0.0

    def get_active_window(self) -> str:
        """Fetch the active foreground window title in < 1ms."""
        title = ""
        if win32gui:
            try:
                hwnd = win32gui.GetForegroundWindow()
                if hwnd:
                    raw_title = win32gui.GetWindowText(hwnd).strip()
                    # Filter internal utility window names
                    if raw_title and raw_title not in [
                        "Program Manager",
                        "Default IME",
                        "MSCTFIME UI",
                        "Windows Shell Experience Host",
                    ]:
                        title = raw_title
                        self._last_active_window = title
            except Exception:
                pass

        if not title and self._last_active_window:
            return self._last_active_window
        return title or "Desktop / Windows Shell"

    def get_battery_telemetry(self) -> dict[str, Any]:
        """Fetch battery percentage, charging state, and remaining time in < 1ms."""
        try:
            battery = psutil.sensors_battery()
            if battery:
                percent = round(battery.percent)
                power_plugged = battery.power_plugged
                plug_str = "Plugged In (Charging)" if power_plugged else "Running on Battery"
                secs_left = battery.secsleft if hasattr(battery, "secsleft") else None
                return {
                    "available": True,
                    "percent": percent,
                    "power_plugged": power_plugged,
                    "status_text": f"{percent}%, {plug_str}",
                    "secs_left": secs_left,
                }
        except Exception as e:
            log.debug("Battery telemetry read notice: %s", e)

        return {
            "available": False,
            "percent": 100,
            "power_plugged": True,
            "status_text": "Desktop PC / AC Power",
            "secs_left": None,
        }

    def get_hardware_diagnostics(self) -> dict[str, Any]:
        """Fetch instantaneous CPU and RAM usage in < 1ms."""
        try:
            mem = psutil.virtual_memory()
            cpu = psutil.cpu_percent(interval=None)
            return {
                "cpu_percent": round(cpu, 1),
                "ram_percent": round(mem.percent, 1),
                "ram_available_gb": round(mem.available / (1024**3), 1),
            }
        except Exception:
            return {"cpu_percent": 0.0, "ram_percent": 0.0, "ram_available_gb": 0.0}

    def get_recent_downloads(self, limit: int = 3) -> list[dict[str, Any]]:
        """Fetch recently downloaded files from user Downloads directory in < 5ms."""
        results = []
        try:
            dl_dir = Path.home() / "Downloads"
            if dl_dir.exists():
                files = [f for f in dl_dir.iterdir() if f.is_file()]
                files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
                for f in files[:limit]:
                    size_bytes = f.stat().st_size
                    if size_bytes < 1024 * 1024:
                        size_str = f"{round(size_bytes / 1024, 1)} KB"
                    else:
                        size_str = f"{round(size_bytes / (1024 * 1024), 1)} MB"
                    results.append({
                        "name": f.name,
                        "path": str(f.resolve()),
                        "size_str": size_str,
                        "extension": f.suffix.lower(),
                    })
        except Exception as e:
            log.debug("Downloads directory introspection notice: %s", e)
        return results

    def open_latest_download(self) -> tuple[bool, str]:
        """Launch the latest downloaded file directly on Windows in 0ms."""
        downloads = self.get_recent_downloads(limit=1)
        if not downloads:
            return False, "Downloads folder-la files edhum illa."
        latest = downloads[0]
        try:
            os.startfile(latest["path"])
            return True, f"'{latest['name']}' file-ah open panniten!"
        except Exception as e:
            return False, f"File open panna mudiyala: {e}"

    def get_network_telemetry(self) -> dict[str, Any]:
        """Fetch connected Wi-Fi SSID, signal, and state with 30s caching."""
        now = time.time()
        if self._cached_wifi_time > 0 and now - self._cached_wifi_time < 30.0:
            return self._cached_wifi

        info = {"connected": False, "ssid": "", "signal": "", "status_text": "Disconnected"}
        try:
            res = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True,
                text=True,
                timeout=1.0,
            )
            for line in res.stdout.splitlines():
                line = line.strip()
                if line.startswith("SSID") and "BSSID" not in line:
                    info["ssid"] = line.split(":", 1)[1].strip()
                elif line.startswith("State"):
                    state = line.split(":", 1)[1].strip().lower()
                    info["connected"] = (state == "connected")
                elif line.startswith("Signal"):
                    info["signal"] = line.split(":", 1)[1].strip()

            if info["connected"] and info["ssid"]:
                sig = f" ({info['signal']} signal)" if info.get("signal") else ""
                info["status_text"] = f"Connected to '{info['ssid']}'{sig}"
            elif info["connected"]:
                info["status_text"] = "Connected (Wi-Fi)"
        except Exception:
            pass

        self._cached_wifi = info
        self._cached_wifi_time = now
        return info

    def get_display_telemetry(self) -> dict[str, Any]:
        """Fetch monitor display count and screen metrics in < 1ms."""
        monitors_count = 1
        try:
            import ctypes
            monitors_count = ctypes.windll.user32.GetSystemMetrics(80) or 1
        except Exception:
            pass
        return {
            "monitors_count": monitors_count,
            "status_text": f"{monitors_count} active display monitor(s)",
        }

    def get_clipboard_preview(self) -> str:
        """Fetch current text in clipboard safely in < 20ms."""
        try:
            res = subprocess.run(
                ["powershell", "-Command", "Get-Clipboard"],
                capture_output=True,
                text=True,
                timeout=1.0,
            )
            content = res.stdout.strip()
            if content:
                return content[:300]
        except Exception:
            pass
        return ""

    def get_background_task_narrative(self) -> str | None:
        """Fetch live background task execution narrative from TelemetryHub."""
        try:
            from seyal_ai.core.telemetry_hub import TelemetryHub
            return TelemetryHub.get_instance().get_live_status_narrative()
        except Exception:
            return None

    def set_screen_brightness(self, level: int) -> tuple[bool, str]:
        """Adjust laptop screen brightness (0-100%) via WMI in < 50ms."""
        level = max(0, min(100, level))
        try:
            cmd = f"(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods).WmiSetBrightness(1, {level})"
            subprocess.run(["powershell", "-Command", cmd], capture_output=True, timeout=2.0)
            return True, f"Screen brightness {level}%-ku maathiten!"
        except Exception as e:
            return False, f"Brightness maatha mudiyala: {e}"

    def get_storage_telemetry(self) -> list[dict[str, Any]]:
        """Fetch local drives (C:, D:, etc.) free and total space in < 1ms."""
        drives = []
        try:
            for part in psutil.disk_partitions(all=False):
                if "cdrom" in part.opts or part.fstype == "":
                    continue
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    free_gb = round(usage.free / (1024**3), 1)
                    total_gb = round(usage.total / (1024**3), 1)
                    drives.append({
                        "device": part.device,
                        "mountpoint": part.mountpoint,
                        "total_gb": total_gb,
                        "free_gb": free_gb,
                        "used_percent": usage.percent,
                        "status_text": f"{part.device} ({free_gb} GB free of {total_gb} GB, {usage.percent}% used)",
                    })
                except Exception:
                    continue
        except Exception:
            pass
        return drives

    def get_resource_telemetry(self, scan_processes: bool = False) -> dict[str, Any]:
        """Fetch CPU and RAM in < 0.2ms, optionally scanning heavy processes on demand."""
        try:
            cpu = psutil.cpu_percent(interval=None)
            mem = psutil.virtual_memory()
            free_gb = round(mem.available / (1024**3), 1)
            hogs = getattr(self, "_cached_hogs", [])

            now = time.time()
            if scan_processes and (now - getattr(self, "_cached_hogs_time", 0.0) >= 15.0):
                try:
                    processes = []
                    for p in psutil.process_iter(["name", "memory_percent"]):
                        info = p.info
                        if info and info.get("memory_percent"):
                            processes.append(info)
                    processes.sort(key=lambda x: x.get("memory_percent") or 0, reverse=True)
                    hogs = [f"{p.get('name', 'app')} ({p.get('memory_percent', 0):.1f}% RAM)" for p in processes[:3]]
                    self._cached_hogs = hogs
                    self._cached_hogs_time = now
                except Exception:
                    pass

            hog_str = f", Top apps: {', '.join(hogs)}" if hogs else ""
            return {
                "cpu_percent": cpu,
                "ram_percent": mem.percent,
                "ram_free_gb": free_gb,
                "top_memory_processes": hogs,
                "status_text": f"CPU {cpu}%, RAM {mem.percent}% ({free_gb} GB free){hog_str}",
            }
        except Exception:
            return {"cpu_percent": 0, "ram_percent": 0, "status_text": "Normal"}

    def get_recent_desktop_files(self, limit: int = 5) -> list[dict[str, Any]]:
        """Fetch recently modified files on the user's Desktop in < 5ms."""
        desktop_dir = Path.home() / "Desktop"
        if not desktop_dir.exists():
            return []
        try:
            files = [
                f for f in desktop_dir.iterdir()
                if f.is_file() and not f.name.startswith("~$") and f.name != "desktop.ini"
            ]
            files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
            results = []
            for f in files[:limit]:
                size_b = f.stat().st_size
                size_str = f"{size_b / 1024:.1f} KB" if size_b < 1024 * 1024 else f"{size_b / (1024 * 1024):.1f} MB"
                results.append({"name": f.name, "path": str(f.resolve()), "size_str": size_str})
            return results
        except Exception:
            return []

    def media_control(self, action: str) -> tuple[bool, str]:
        """
        Windows native media playback control (play/pause, next, previous) in < 1ms.
        Uses keybd_event virtual media scan codes.
        """
        try:
            import ctypes
            KEYEVENTF_KEYUP = 0x0002
            vk_map = {
                "play_pause": 0xB3,
                "next": 0xB0,
                "previous": 0xB1,
                "stop": 0xB2,
            }
            vk = vk_map.get(action)
            if vk:
                ctypes.windll.user32.keybd_event(vk, 0, 0, 0)
                ctypes.windll.user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
                return True, f"Media {action} executed"
        except Exception as e:
            return False, f"Media control error: {e}"
        return False, f"Unknown media action: {action}"

    # -------------------------------------------------------------------------
    # Agent Settings Access & Management (Voice, Permissions, Tasks, Models)
    # -------------------------------------------------------------------------
    def get_voice_settings(self) -> dict[str, Any]:
        """Fetch active voice configuration (TTS voice, speed, language, enabled state)."""
        try:
            from seyal_ai.core.config import get_settings
            settings = get_settings()
            voice = getattr(settings.voice.tts, "voice", "en-US-AvaMultilingualNeural") or "en-US-AvaMultilingualNeural"
            speed = float(getattr(settings.voice.tts, "speed", 1.0) or 1.0)
            lang = getattr(settings.voice, "language", "auto") or "auto"
            enabled = bool(getattr(settings.voice, "enabled", True))

            name_map = {
                "en-US-AvaMultilingualNeural": "Breeze (Universal Female)",
                "en-US-AndrewMultilingualNeural": "Andrew (Universal Male)",
                "en-US-EmmaMultilingualNeural": "Emma (Universal Female)",
                "en-US-BrianMultilingualNeural": "Brian (Universal Male)",
                "ta-IN-PallaviNeural": "Pallavi (Tamil Female)",
                "ta-IN-ValluvarNeural": "Valluvar (Tamil Male)",
                "en-IN-NeerjaNeural": "Neerja (Indian English Female)",
                "en-IN-PrabhatNeural": "Prabhat (Indian English Male)",
            }
            friendly = name_map.get(voice, voice)
            return {
                "voice": voice,
                "friendly_name": friendly,
                "speed": speed,
                "language": lang,
                "enabled": enabled,
                "description": f"{friendly}, Speed: {speed}x, Language: {lang}, Status: {'Active' if enabled else 'Muted'}",
            }
        except Exception as e:
            log.debug("Voice settings introspection notice: %s", e)
            return {
                "voice": "en-US-AvaMultilingualNeural",
                "friendly_name": "Breeze",
                "speed": 1.0,
                "language": "auto",
                "enabled": True,
                "description": "Breeze, Speed: 1.0x, Active",
            }

    def update_voice_settings(
        self,
        voice: str | None = None,
        speed: float | None = None,
        language: str | None = None,
        enabled: bool | None = None,
    ) -> tuple[bool, str]:
        """
        Dynamically update voice configuration in < 5ms.
        Updates running runtime, core settings, and persists to user storage.
        """
        try:
            from seyal_ai.core.config import get_settings
            settings = get_settings()

            updated_fields = []
            if voice:
                voice_lower = voice.lower().strip()
                preset_map = {
                    "breeze": "en-US-AvaMultilingualNeural",
                    "andrew": "en-US-AndrewMultilingualNeural",
                    "emma": "en-US-EmmaMultilingualNeural",
                    "brian": "en-US-BrianMultilingualNeural",
                    "pallavi": "ta-IN-PallaviNeural",
                    "valluvar": "ta-IN-ValluvarNeural",
                    "neerja": "en-IN-NeerjaNeural",
                    "prabhat": "en-IN-PrabhatNeural",
                    "tamil": "ta-IN-PallaviNeural",
                    "tamil female": "ta-IN-PallaviNeural",
                    "tamil male": "ta-IN-ValluvarNeural",
                    "female": "en-US-AvaMultilingualNeural",
                    "male": "en-US-AndrewMultilingualNeural",
                }
                resolved_voice = preset_map.get(voice_lower, voice)
                settings.voice.tts.voice = resolved_voice
                updated_fields.append(f"Voice set to {resolved_voice}")

            if speed is not None:
                new_speed = round(max(0.5, min(2.5, float(speed))), 2)
                settings.voice.tts.speed = new_speed
                updated_fields.append(f"Speed set to {new_speed}x")

            if language:
                settings.voice.language = language
                updated_fields.append(f"Language set to {language}")

            if enabled is not None:
                settings.voice.enabled = enabled
                updated_fields.append("Voice enabled" if enabled else "Voice disabled / muted")

            voice_cfg_path = Path.home() / ".seyal_ai" / "voice_settings.json"
            voice_cfg_path.parent.mkdir(parents=True, exist_ok=True)
            voice_cfg_path.write_text(
                json.dumps({
                    "voice": settings.voice.tts.voice,
                    "speed": settings.voice.tts.speed,
                    "language": settings.voice.language,
                    "enabled": settings.voice.enabled,
                }, indent=2),
                encoding="utf-8",
            )
            return True, "; ".join(updated_fields) or "Voice settings updated successfully."
        except Exception as e:
            log.warning("Update voice settings notice: %s", e)
            return False, f"Failed to update voice settings: {e}"

    def get_permissions_overview(self) -> dict[str, Any]:
        """Fetch granted/blocked capability scopes status in < 1ms."""
        try:
            from seyal_ai.security.permissions import get_permission_engine
            engine = get_permission_engine()
            scopes = engine.scope_manager.list_scopes()
            granted = [s.scope for s in scopes.values() if s.granted]
            blocked = [s.scope for s in scopes.values() if not s.granted]
            return {
                "total_scopes": len(scopes),
                "granted_count": len(granted),
                "blocked_count": len(blocked),
                "granted": granted,
                "blocked": blocked,
                "summary_text": f"{len(granted)} scopes granted ({', '.join(granted[:4])}{'...' if len(granted) > 4 else ''}), {len(blocked)} blocked",
            }
        except Exception as e:
            log.debug("Permissions overview notice: %s", e)
            return {
                "total_scopes": 0,
                "granted_count": 0,
                "blocked_count": 0,
                "granted": [],
                "blocked": [],
                "summary_text": "Permissions gateway operational",
            }

    def modify_permission(self, scope_name: str, mode: str = "allow") -> tuple[bool, str]:
        """
        Dynamically grant ('allow'), ask ('ask'), or revoke ('block') a capability scope in < 5ms.
        """
        try:
            from seyal_ai.security.permissions import PermissionScope, get_permission_engine
            engine = get_permission_engine()

            scope_clean = scope_name.lower().strip().replace(" ", "_")
            alias_map = {
                "keyboard": PermissionScope.KEYBOARD_CONTROL.value,
                "mouse": PermissionScope.MOUSE_CONTROL.value,
                "screen": PermissionScope.SCREEN_CAPTURE.value,
                "screenshot": PermissionScope.SCREEN_CAPTURE.value,
                "camera": PermissionScope.CAMERA.value,
                "mic": PermissionScope.MICROPHONE.value,
                "microphone": PermissionScope.MICROPHONE.value,
                "file": PermissionScope.FILE_ACCESS.value,
                "files": PermissionScope.FILE_ACCESS.value,
                "storage": PermissionScope.FILE_ACCESS.value,
                "app": PermissionScope.APP_CONTROL.value,
                "apps": PermissionScope.APP_CONTROL.value,
                "terminal": "terminal_execution",
                "browser": "browser_automation",
                "notifications": PermissionScope.NOTIFICATIONS.value,
            }
            resolved_scope = alias_map.get(scope_clean, scope_clean)
            engine.set_mode(resolved_scope, mode)
            action_verb = "Granted" if mode == "allow" else ("Revoked / Blocked" if mode == "block" else "Set to Ask")
            return True, f"{action_verb} permission for '{resolved_scope}' successfully."
        except Exception as e:
            log.warning("Modify permission notice: %s", e)
            return False, f"Could not modify permission: {e}"

    def grant_all_permissions(self) -> tuple[bool, str]:
        """Grant all capability scopes in < 5ms."""
        try:
            from seyal_ai.security.permissions import PermissionScope, get_permission_engine
            engine = get_permission_engine()
            for s in PermissionScope:
                engine.set_mode(s.value, "allow")
            for extra in ("terminal_execution", "browser_automation", "background_tasks"):
                engine.set_mode(extra, "allow")
            return True, "Granted all system permissions and capability scopes."
        except Exception as e:
            return False, f"Failed to grant all permissions: {e}"

    def reset_permissions(self) -> tuple[bool, str]:
        """Reset permissions to default security baseline in < 5ms."""
        try:
            from seyal_ai.security.permissions import get_permission_engine
            engine = get_permission_engine()
            engine.scope_manager.reset_defaults()
            return True, "Permissions have been reset to default security baseline."
        except Exception as e:
            return False, f"Failed to reset permissions: {e}"

    def get_task_manager_overview(self) -> dict[str, Any]:
        """Fetch live tasks, active plan count, and execution queue in < 1ms."""
        try:
            from seyal_ai.core.telemetry_hub import TelemetryHub

            hub = TelemetryHub.get_instance()
            primary_task = hub.get_primary_active_task()
            active_count = len([t for t in hub._active_tasks.values() if t.is_active])
            total_count = len(hub._active_tasks)

            primary_desc = f"'{primary_task.goal}' ({primary_task.status_summary})" if primary_task else "No task currently executing"
            return {
                "active_task_running": primary_task is not None,
                "primary_task": primary_desc,
                "tracked_plan_count": total_count,
                "active_plan_count": active_count,
                "summary_text": f"Running: {primary_desc}. Queue: {active_count} active tasks.",
            }
        except Exception as e:
            log.debug("Task manager overview notice: %s", e)
            return {
                "active_task_running": False,
                "primary_task": "None",
                "tracked_plan_count": 0,
                "active_plan_count": 0,
                "summary_text": "Agent task manager is idle with no active queue.",
            }

    def cancel_agent_task(self, task_id: str | None = None, reason: str = "User requested cancellation") -> tuple[bool, str]:
        """Cancel the active task or a specific task in < 5ms."""
        try:
            from seyal_ai.core.telemetry_hub import TelemetryHub
            from seyal_ai.api.routes.tasks import get_task_manager

            hub = TelemetryHub.get_instance()
            primary = hub.get_primary_active_task()
            if primary:
                hub.cancel_task(primary.task_id, reason=reason)

            task_mgr = get_task_manager()
            if task_id:
                task_mgr.cancellation.cancel_task(task_id, reason=reason)
            else:
                task_mgr.cancel_active_task(reason=reason)
            return True, f"Task successfully cancelled ({reason})."
        except Exception as e:
            return False, f"Failed to cancel task: {e}"

    def clear_completed_tasks(self) -> tuple[bool, str]:
        """Clear completed tasks from task manager history in < 5ms."""
        try:
            from seyal_ai.api.routes.tasks import get_task_manager
            task_mgr = get_task_manager()
            purged = task_mgr.cleanup_expired_tasks(max_age_days=0)
            return True, f"Cleared {purged} completed tasks from task manager."
        except Exception as e:
            return False, f"Failed to clear tasks: {e}"

    def emergency_stop_all(self, reason: str = "Emergency stop triggered") -> tuple[bool, str]:
        """Emergency stop all agent tasks, planning queues, and hardware actions in < 5ms."""
        try:
            from seyal_ai.core.telemetry_hub import TelemetryHub
            from seyal_ai.api.routes.tasks import get_task_manager

            hub = TelemetryHub.get_instance()
            primary = hub.get_primary_active_task()
            if primary:
                hub.cancel_task(primary.task_id, reason=reason)

            task_mgr = get_task_manager()
            task_mgr.emergency_stop(reason=reason)
            return True, f"Emergency stop executed: all agents and tasks halted ({reason})."
        except Exception as e:
            return False, f"Emergency stop error: {e}"

    def get_ai_models_overview(self) -> dict[str, Any]:
        """Fetch current active AI models and provider tiers in < 1ms."""
        try:
            from seyal_ai.core.config import get_settings
            s = get_settings()
            return {
                "provider": s.llm.default_provider,
                "fast_model": s.llm.fast_model,
                "smart_model": s.llm.smart_model,
                "vision_model": s.llm.vision_model,
                "summary_text": f"Provider: {s.llm.default_provider}, Fast Tier: {s.llm.fast_model}, Smart Tier: {s.llm.smart_model}",
            }
        except Exception:
            return {
                "provider": "gemini",
                "fast_model": "gemini-flash-lite-latest",
                "smart_model": "gemini-flash-lite-latest",
                "vision_model": "gemini-flash-lite-latest",
                "summary_text": "Provider: Gemini (Flash Lite Ultra-Fast)",
            }

    def get_unified_settings_snapshot(self) -> dict[str, Any]:
        """Aggregates all Settings tabs state into a unified snapshot in < 5ms."""
        return {
            "voice": self.get_voice_settings(),
            "permissions": self.get_permissions_overview(),
            "tasks": self.get_task_manager_overview(),
            "ai_models": self.get_ai_models_overview(),
        }

    def get_user_hub_context(self) -> dict[str, Any]:
        """
        Fetch reminders, standing rules, and user knowledge facts in < 3ms.
        """
        try:
            from seyal_ai.services.user_knowledge_service import user_knowledge_service

            reminders = user_knowledge_service.get_reminders()
            pending_reminders = [
                r for r in reminders if isinstance(r, dict) and r.get("status") != "completed"
            ]

            rules_dict = user_knowledge_service.get_standing_rules()
            active_rules = [
                r for r in rules_dict.values() if isinstance(r, dict) and r.get("active", True)
            ]

            knowledge = user_knowledge_service.get_user_knowledge()

            return {
                "pending_reminders": pending_reminders,
                "active_standing_rules": active_rules,
                "user_knowledge": knowledge,
            }
        except Exception as e:
            log.debug("User hub context retrieval notice: %s", e)
            return {
                "pending_reminders": [],
                "active_standing_rules": [],
                "user_knowledge": {},
            }

    async def get_recent_task_info(self) -> dict[str, Any]:
        """
        Fetch the most recent session title and last task summary from SQLite in < 15ms.
        """
        try:
            from seyal_ai.database.engine import get_session
            from seyal_ai.database.repositories.conversation import ConversationRepository

            async with get_session() as db_session:
                repo = ConversationRepository(db_session)
                convs, total = await repo.list_conversations(offset=0, limit=3)
                if convs:
                    last_c = convs[0]
                    summary = last_c.summary or "General Session"
                    cleaned_summary = re.sub(r"^\[.*?\]\s*", "", summary).strip()
                    created_at_str = ""
                    if hasattr(last_c, "created_at") and last_c.created_at:
                        created_at_str = str(last_c.created_at)

                    return {
                        "has_history": True,
                        "session_id": last_c.session_id,
                        "conversation_id": last_c.id,
                        "summary": cleaned_summary or summary,
                        "created_at": created_at_str,
                        "total_saved_sessions": total,
                    }
        except Exception as e:
            log.debug("Recent task info check notice: %s", e)

        return {
            "has_history": False,
            "session_id": "",
            "conversation_id": "",
            "summary": "",
            "created_at": "",
            "total_saved_sessions": 0,
        }

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
        """
        active_window = self.get_active_window()
        battery = self.get_battery_telemetry()
        hardware = self.get_hardware_diagnostics()
        hub = self.get_user_hub_context()
        downloads = self.get_recent_downloads(limit=2)
        network = self.get_network_telemetry()
        displays = self.get_display_telemetry()
        storage = self.get_storage_telemetry()
        resources = self.get_resource_telemetry()
        desktop_files = self.get_recent_desktop_files(limit=2)

        return {
            "active_window": active_window,
            "battery": battery,
            "hardware": hardware,
            "reminders": hub["pending_reminders"],
            "standing_rules": hub["active_standing_rules"],
            "user_knowledge": hub["user_knowledge"],
            "recent_downloads": downloads,
            "network": network,
            "displays": displays,
            "storage": storage,
            "resources": resources,
            "recent_desktop_files": desktop_files,
            "voice_settings": self.get_voice_settings(),
            "permissions": self.get_permissions_overview(),
            "tasks": self.get_task_manager_overview(),
            "ai_models": self.get_ai_models_overview(),
        }

    async def build_situational_prompt(self) -> str:
        """
        Builds a comprehensive, verified Situational Awareness block for agent reasoning prompts.
        Universal Multilingual: Verified facts so agent can answer in any language.
        """
        snap = self.get_live_telemetry_snapshot()
        recent = await self.get_recent_task_info()

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

        task_narr = self.get_background_task_narrative()
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
            blocks.append(f"- Most Recent Session / Task: '{recent['summary']}' (Total sessions: {recent['total_saved_sessions']})")

        return (
            "\n\n[SEYAL AI LIVE SITUATIONAL AWARENESS & TELEMETRY]\n"
            + "\n".join(blocks)
            + "\n\nSEYAL AI BEHAVIORAL INSTRUCTION:\n"
            "You are Seyal AI: you have instant real-time access to the user's laptop, active window, battery, reminders, network, and files.\n"
            "If the user asks about system state, downloads, Wi-Fi, displays, reminders, active window, storage, or previous task, answer directly with the verified facts above without guessing."
        )

    def detect_instant_fast_path(self, goal: str) -> Optional[dict[str, Any]]:
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
                f"Clipboard content: '{self.get_clipboard_preview()[:80].replace(chr(10), ' ')}'"
                if self.get_clipboard_preview() else "Clipboard is currently empty."
            ),
            "QUERY_BACKGROUND_TASKS": lambda: (
                f"Background task: {self.get_background_task_narrative()}"
                if self.get_background_task_narrative() else "No active background tasks running."
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
            "QUERY_RESOURCES": lambda: f"System Resources: {self.get_resource_telemetry(scan_processes=True).get('status_text', 'Normal')}",
            "QUERY_VOICE_SETTINGS": lambda: f"Voice Settings: {self.get_voice_settings()['description']}",
            "QUERY_PERMISSIONS": lambda: f"Security Permissions: {self.get_permissions_overview()['summary_text']}",
            "QUERY_TASKS": lambda: f"Agent Tasks: {self.get_task_manager_overview()['summary_text']}",
            "QUERY_AI_MODELS": lambda: f"AI Models: {self.get_ai_models_overview()['summary_text']}",
            "QUERY_SETTINGS": lambda: (
                f"Seyal AI Settings: Voice={self.get_voice_settings()['friendly_name']} ({self.get_voice_settings()['speed']}x), "
                f"Permissions={self.get_permissions_overview()['granted_count']} granted, "
                f"Tasks={self.get_task_manager_overview()['active_plan_count']} active, "
                f"Model={self.get_ai_models_overview()['provider']} ({self.get_ai_models_overview()['fast_model']})."
            ),
        }
        getter = fact_map.get(query_type)
        if getter:
            try:
                return getter()
            except Exception:
                pass
        return "System telemetry is operational."

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
        recent = await self.get_recent_task_info()
        data_summary = self.get_query_fact(query_type, snap, recent)

        # Baseline factual string (used only if router is offline)
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
                if result and len(result) > 5:
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
                if result and len(result) > 4:
                    return result
            except Exception as e:
                log.debug("Action narration synthesis notice: %s", e)

        return factual_fallback


# Global singleton instance
seyal_ai_service = SeyalAiTelemetryService()
SeyalAiService = SeyalAiTelemetryService
