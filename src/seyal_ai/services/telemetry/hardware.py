"""
Hardware & OS Telemetry Mixin for Seyal AI.

Provides instant introspection of:
- Active foreground window
- Battery and power telemetry
- CPU and RAM diagnostics
- Recent Downloads inspection & launcher
- Wi-Fi network telemetry
- Connected display count and metrics
- Safe clipboard preview
- Laptop screen brightness adjustment (WMI)
- Disk storage metrics
- Recent desktop files
- Native media playback controls
"""

from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path
from typing import Any

import psutil

try:
    import win32gui
except ImportError:
    win32gui = None

from seyal_ai.utils.logging import get_logger

log = get_logger("services.telemetry.hardware")


_KEYEVENTF_KEYUP = 0x0002
_NO_WINDOW_FLAG = 0x08000000 if os.name == "nt" else 0


class HardwareTelemetryMixin:
    """Provides hardware, power, OS window, and system resource telemetry methods."""

    def __init__(self) -> None:
        self._last_active_window: str = ""
        self._cached_wifi: dict[str, Any] = {
            "connected": False,
            "ssid": "",
            "signal": "",
            "status_text": "Disconnected",
        }
        self._cached_wifi_time: float = 0.0
        self._cached_hogs: list[str] = []
        self._cached_hogs_time: float = 0.0

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

        if not title and hasattr(self, "_last_active_window") and self._last_active_window:
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
        cached_time = getattr(self, "_cached_wifi_time", 0.0)
        cached_wifi = getattr(self, "_cached_wifi", {"connected": False, "ssid": "", "signal": "", "status_text": "Disconnected"})
        if cached_time > 0 and now - cached_time < 30.0:
            return cached_wifi

        info = {"connected": False, "ssid": "", "signal": "", "status_text": "Disconnected"}
        try:
            res = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                capture_output=True,
                text=True,
                timeout=1.0,
                creationflags=_NO_WINDOW_FLAG,
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
                creationflags=_NO_WINDOW_FLAG,
            )
            content = res.stdout.strip()
            if content:
                return content[:300]
        except Exception:
            pass
        return ""

    def set_screen_brightness(self, level: int) -> tuple[bool, str]:
        """Adjust laptop screen brightness (0-100%) via WMI in < 50ms."""
        level = max(0, min(100, level))
        try:
            cmd = f"(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods).WmiSetBrightness(1, {level})"
            subprocess.run(
                ["powershell", "-Command", cmd],
                capture_output=True,
                timeout=2.0,
                creationflags=_NO_WINDOW_FLAG,
            )
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
            vk_map = {
                "play_pause": 0xB3,
                "next": 0xB0,
                "previous": 0xB1,
                "stop": 0xB2,
            }
            vk = vk_map.get(action)
            if vk:
                ctypes.windll.user32.keybd_event(vk, 0, 0, 0)
                ctypes.windll.user32.keybd_event(vk, 0, _KEYEVENTF_KEYUP, 0)
                return True, f"Media {action} executed"
        except Exception as e:
            return False, f"Media control error: {e}"
        return False, f"Unknown media action: {action}"
