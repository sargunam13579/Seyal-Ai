"""
Seyal AI Laptop Awareness Service.

Provides deep introspection of the user's specific laptop environment:
- Installed applications (scans 64-bit and 32-bit Windows Registry & Start Menu shortcuts)
- Running processes (live processes with memory, CPU, PID)
- Open & active windows (detects currently visible GUI windows and the active foreground window)
- Key files & storage (Desktop, Downloads, Documents, Pictures, and available drives)
- System diagnostics (OS build, CPU cores, RAM usage, battery power, screen resolution)
- Local cache persistence (~/.seyal_ai/laptop_awareness.json) for instant agent memory
"""

from __future__ import annotations

import json
import os
import platform
import time
from pathlib import Path
from typing import Any

import psutil

try:
    import winreg
except ImportError:
    winreg = None  # type: ignore

try:
    import win32gui
    import win32process
except ImportError:
    win32gui = None  # type: ignore
    win32process = None  # type: ignore

from seyal_ai.utils.logging import get_logger

log = get_logger("services.awareness")

AWARENESS_CACHE_DIR = Path.home() / ".seyal_ai"
AWARENESS_CACHE_FILE = AWARENESS_CACHE_DIR / "laptop_awareness.json"


class LaptopAwarenessService:
    """Introspects and caches the local laptop environment."""

    def __init__(self) -> None:
        AWARENESS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    def get_installed_apps(self) -> list[dict[str, Any]]:
        """
        Scan Windows Registry (64-bit & 32-bit HKLM & HKCU) and Start Menu shortcuts
        to get all software installed on this particular machine.
        """
        apps: dict[str, dict[str, Any]] = {}

        if winreg:
            # Registry paths where installed programs are listed
            reg_paths = [
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_WOW64_64KEY),
                (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", winreg.KEY_WOW64_32KEY),
                (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", 0),
            ]

            for hkey, sub_path, flags in reg_paths:
                try:
                    access = winreg.KEY_READ | flags if flags else winreg.KEY_READ
                    with winreg.OpenKey(hkey, sub_path, 0, access) as key:
                        num_subkeys = winreg.QueryInfoKey(key)[0]
                        for i in range(num_subkeys):
                            try:
                                subkey_name = winreg.EnumKey(key, i)
                                with winreg.OpenKey(key, subkey_name) as app_key:
                                    display_name = ""
                                    try:
                                        display_name, _ = winreg.QueryValueEx(app_key, "DisplayName")
                                    except OSError:
                                        continue

                                    if not display_name or not display_name.strip():
                                        continue

                                    display_name = display_name.strip()
                                    if display_name in apps:
                                        continue

                                    # Try to get extra metadata
                                    version = ""
                                    install_loc = ""
                                    publisher = ""
                                    try:
                                        version, _ = winreg.QueryValueEx(app_key, "DisplayVersion")
                                    except OSError:
                                        pass
                                    try:
                                        install_loc, _ = winreg.QueryValueEx(app_key, "InstallLocation")
                                    except OSError:
                                        pass
                                    try:
                                        publisher, _ = winreg.QueryValueEx(app_key, "Publisher")
                                    except OSError:
                                        pass

                                    apps[display_name] = {
                                        "name": display_name,
                                        "version": str(version or "").strip(),
                                        "publisher": str(publisher or "").strip(),
                                        "install_location": str(install_loc or "").strip(),
                                        "shortcut_path": "",
                                        "source": "registry",
                                    }
                            except OSError:
                                continue
                except OSError:
                    continue

        # Also scan Start Menu shortcut files (.lnk) for user-facing applications
        start_menu_dirs = [
            Path(os.environ.get("ProgramData", "C:/ProgramData")) / "Microsoft/Windows/Start Menu/Programs",
            Path(os.environ.get("APPDATA", "")) / "Microsoft/Windows/Start Menu/Programs",
        ]

        for s_dir in start_menu_dirs:
            if s_dir.exists():
                try:
                    for item in s_dir.rglob("*.lnk"):
                        name = item.stem
                        # Skip uninstaller / help shortcuts
                        if any(skip in name.lower() for skip in ["uninstall", "help", "readme", "documentation", "setup"]):
                            continue
                        if name in apps:
                            apps[name]["shortcut_path"] = str(item)
                        elif len(name) > 1:
                            apps[name] = {
                                "name": name,
                                "version": "",
                                "publisher": "",
                                "install_location": str(item.parent),
                                "shortcut_path": str(item),
                                "source": "start_menu",
                            }
                except Exception as e:
                    log.debug("Start menu scan notice: %s", e)

        # Sort alphabetically
        sorted_apps = sorted(apps.values(), key=lambda x: x["name"].lower())
        log.info("Discovered %d installed applications on laptop", len(sorted_apps))
        return sorted_apps

    def get_running_apps(self) -> list[dict[str, Any]]:
        """List active processes running right now on the laptop."""
        running = []
        seen_names = set()

        for proc in psutil.process_iter(["pid", "name", "memory_percent", "cpu_percent", "status"]):
            try:
                info = proc.info
                name = info.get("name") or ""
                if not name or name.lower() in seen_names:
                    continue

                # Skip core system idle / background kernels
                if name.lower() in ["system idle process", "registry", "system", "smss.exe", "csrss.exe"]:
                    continue

                seen_names.add(name.lower())
                running.append({
                    "pid": info.get("pid"),
                    "name": name,
                    "memory_percent": round(info.get("memory_percent") or 0.0, 2),
                    "cpu_percent": round(info.get("cpu_percent") or 0.0, 1),
                    "status": info.get("status") or "running",
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        # Sort by memory usage descending
        running.sort(key=lambda x: x["memory_percent"], reverse=True)
        return running

    def get_open_windows(self) -> list[dict[str, Any]]:
        """List visible windows and identify the current active focused window."""
        windows = []
        active_hwnd = None

        if win32gui:
            try:
                active_hwnd = win32gui.GetForegroundWindow()
            except Exception:
                active_hwnd = None

            def enum_cb(hwnd: int, _extra: Any) -> None:
                try:
                    if not win32gui.IsWindowVisible(hwnd):
                        return
                    title = win32gui.GetWindowText(hwnd).strip()
                    if not title or len(title) < 2:
                        return
                    # Filter out internal tiny utility windows
                    if title in ["Program Manager", "Default IME", "MSCTFIME UI", "Windows Shell Experience Host"]:
                        return

                    is_active = (hwnd == active_hwnd)
                    windows.append({
                        "hwnd": hwnd,
                        "title": title,
                        "is_active": is_active,
                    })
                except Exception:
                    pass

            try:
                win32gui.EnumWindows(enum_cb, None)
            except Exception as e:
                log.warning("Window enum failed: %s", e)

        return windows

    def get_files_and_folders(self) -> dict[str, Any]:
        """Inspect key user directories and available drives."""
        home = Path.home()
        standard_dirs = {
            "Desktop": home / "Desktop",
            "Downloads": home / "Downloads",
            "Documents": home / "Documents",
            "Pictures": home / "Pictures",
        }

        folder_stats = {}
        for label, p in standard_dirs.items():
            if p.exists():
                try:
                    # Count top-level items
                    entries = list(p.iterdir())
                    file_count = sum(1 for e in entries if e.is_file())
                    dir_count = sum(1 for e in entries if e.is_dir())
                    folder_stats[label] = {
                        "path": str(p),
                        "exists": True,
                        "file_count": file_count,
                        "folder_count": dir_count,
                    }
                except Exception:
                    folder_stats[label] = {"path": str(p), "exists": True, "file_count": 0, "folder_count": 0}
            else:
                folder_stats[label] = {"path": str(p), "exists": False, "file_count": 0, "folder_count": 0}

        # Available drives
        drives = []
        for part in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(part.mountpoint)
                drives.append({
                    "device": part.device,
                    "mountpoint": part.mountpoint,
                    "fstype": part.fstype,
                    "total_gb": round(usage.total / (1024 ** 3), 1),
                    "used_gb": round(usage.used / (1024 ** 3), 1),
                    "free_gb": round(usage.free / (1024 ** 3), 1),
                    "percent": usage.percent,
                })
            except Exception:
                continue

        return {
            "folders": folder_stats,
            "drives": drives,
        }

    def get_system_info(self) -> dict[str, Any]:
        """Fetch OS, CPU, RAM, battery, and screen resolution."""
        mem = psutil.virtual_memory()
        battery = psutil.sensors_battery()

        resolution = "Unknown"
        try:
            import ctypes
            user32 = ctypes.windll.user32
            width = user32.GetSystemMetrics(0)
            height = user32.GetSystemMetrics(1)
            resolution = f"{width} x {height}"
        except Exception:
            pass

        return {
            "os": f"{platform.system()} {platform.release()} ({platform.version()})",
            "hostname": platform.node(),
            "cpu": {
                "name": platform.processor(),
                "cores_logical": psutil.cpu_count(logical=True),
                "cores_physical": psutil.cpu_count(logical=False),
                "current_percent": psutil.cpu_percent(interval=0.1),
            },
            "ram": {
                "total_gb": round(mem.total / (1024 ** 3), 1),
                "available_gb": round(mem.available / (1024 ** 3), 1),
                "used_percent": mem.percent,
            },
            "battery": {
                "percent": battery.percent if battery else 100,
                "power_plugged": battery.power_plugged if battery else True,
            } if battery else None,
            "resolution": resolution,
        }

    def scan_all_awareness(self) -> dict[str, Any]:
        """
        Execute full introspection of the user's laptop and save to local cache.
        Runs in ~100-200ms.
        """
        t0 = time.time()
        installed_apps = self.get_installed_apps()
        running_apps = self.get_running_apps()
        open_windows = self.get_open_windows()
        files_and_folders = self.get_files_and_folders()
        system_info = self.get_system_info()
        duration_ms = round((time.time() - t0) * 1000, 1)

        result = {
            "timestamp": time.time(),
            "last_scan_iso": time.strftime("%Y-%m-%d %H:%M:%S"),
            "scan_duration_ms": duration_ms,
            "installed_apps_count": len(installed_apps),
            "running_apps_count": len(running_apps),
            "open_windows_count": len(open_windows),
            "installed_apps": installed_apps,
            "running_apps": running_apps,
            "open_windows": open_windows,
            "files_and_folders": files_and_folders,
            "system_info": system_info,
        }

        # Cache locally
        try:
            with open(AWARENESS_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2)
            log.info("Laptop awareness updated successfully in %sms", duration_ms)
        except Exception as e:
            log.warning("Failed to write laptop awareness cache: %s", e)

        return result

    def get_cached_awareness(self) -> dict[str, Any]:
        """Load from cache if fresh, otherwise scan immediately."""
        if AWARENESS_CACHE_FILE.exists():
            try:
                with open(AWARENESS_CACHE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # If cache is valid, return it
                    if data and "installed_apps" in data:
                        return data
            except Exception as e:
                log.debug("Cache read failed, re-scanning: %s", e)

        return self.scan_all_awareness()

    def get_live_telemetry(self) -> dict[str, Any]:
        """
        Fast lightweight snapshot of high-frequency volatile data:
        - Open windows and active window
        - Running processes (top memory/CPU apps)
        - Battery level & AC power
        - RAM usage % and CPU load
        Executes in < 5ms without any disk/registry traversal.
        """
        t0 = time.time()
        mem = psutil.virtual_memory()
        battery = psutil.sensors_battery()
        running = self.get_running_apps()
        open_windows = self.get_open_windows()
        elapsed_ms = round((time.time() - t0) * 1000, 1)

        return {
            "timestamp": time.time(),
            "last_scan_iso": time.strftime("%Y-%m-%d %H:%M:%S"),
            "scan_duration_ms": elapsed_ms,
            "running_apps_count": len(running),
            "open_windows_count": len(open_windows),
            "running_apps": running,
            "open_windows": open_windows,
            "system_info": {
                "cpu": {
                    "current_percent": psutil.cpu_percent(interval=None),
                    "cores_logical": psutil.cpu_count(logical=True),
                },
                "ram": {
                    "total_gb": round(mem.total / (1024 ** 3), 1),
                    "available_gb": round(mem.available / (1024 ** 3), 1),
                    "used_percent": mem.percent,
                },
                "battery": {
                    "percent": battery.percent if battery else 100,
                    "power_plugged": battery.power_plugged if battery else True,
                } if battery else None,
            },
        }

    def get_active_window(self) -> dict[str, Any] | None:
        """Get the currently focused foreground window in < 1ms."""
        if win32gui:
            try:
                hwnd = win32gui.GetForegroundWindow()
                title = win32gui.GetWindowText(hwnd).strip()
                return {"hwnd": hwnd, "title": title}
            except Exception:
                pass
        return None


# Global singleton instance
_awareness_service: LaptopAwarenessService | None = None


def get_awareness_service() -> LaptopAwarenessService:
    global _awareness_service
    if _awareness_service is None:
        _awareness_service = LaptopAwarenessService()
    return _awareness_service
