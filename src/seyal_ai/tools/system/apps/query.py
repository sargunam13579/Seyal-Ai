"""
Seyal AI Application Query Tools (Search Installed, List Running).
"""

from __future__ import annotations

import os
import platform
import shutil
from pathlib import Path
from typing import Any

import psutil

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.system.apps.discovery import COMMON_APP_MAP
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.system.apps.query")


class SearchApplicationsTool(BaseTool):
    """Search for installed applications on the computer."""

    @property
    def name(self) -> str:
        return "search_applications"

    @property
    def description(self) -> str:
        return (
            "Search for installed applications on the computer by keyword or name. "
            "Returns matching applications and their executable paths."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Keyword or name of the application to search for.",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default: 10).",
                },
            },
            "required": ["query"],
        }

    @property
    def category(self) -> str:
        return "application"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, query: str = "", max_results: int = 10, **kwargs: Any) -> ToolResult:
        query_clean = query.lower().strip()
        results: list[dict[str, str]] = []
        seen_names: set[str] = set()

        # 1. Search common map
        for name, exe in COMMON_APP_MAP.items():
            if query_clean in name:
                results.append({"name": name.title(), "executable": exe, "source": "known_apps"})
                seen_names.add(name.lower())

        # 2. Search Windows Start Menu
        if platform.system() == "Windows":
            start_menu_dirs = [
                Path(os.environ.get("APPDATA", ""))
                / "Microsoft"
                / "Windows"
                / "Start Menu"
                / "Programs",
                Path(os.environ.get("PROGRAMDATA", "C:\\ProgramData"))
                / "Microsoft"
                / "Windows"
                / "Start Menu"
                / "Programs",
            ]
            for base_dir in start_menu_dirs:
                if base_dir.exists():
                    for lnk in base_dir.rglob("*.lnk"):
                        stem = lnk.stem
                        if query_clean in stem.lower() and stem.lower() not in seen_names:
                            results.append(
                                {
                                    "name": stem,
                                    "path": str(lnk),
                                    "source": "start_menu",
                                }
                            )
                            seen_names.add(stem.lower())
                            if len(results) >= max_results:
                                break

        # 3. Check system PATH
        for name in [query_clean, f"{query_clean}.exe", f"{query_clean}.cmd"]:
            path = shutil.which(name)
            if path and query_clean not in seen_names:
                results.append({"name": query_clean, "path": path, "source": "path"})
                seen_names.add(query_clean)

        results = results[:max_results]
        if not results:
            return ToolResult.ok(f"No installed applications found matching '{query}'.", apps=[])

        summary_lines = [f"Found {len(results)} application(s) matching '{query}':"]
        for item in results:
            summary_lines.append(
                f"  • {item['name']} ({item.get('path') or item.get('executable')})"
            )

        return ToolResult.ok("\n".join(summary_lines), apps=results, count=len(results))


class ListApplicationsTool(BaseTool):
    """List currently running applications and windows."""

    @property
    def name(self) -> str:
        return "list_applications"

    @property
    def description(self) -> str:
        return "List currently running GUI applications and active windows on the laptop."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of applications to list (default: 20).",
                },
            },
            "required": [],
        }

    @property
    def category(self) -> str:
        return "application"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, limit: int = 20, **kwargs: Any) -> ToolResult:
        running_apps: list[dict[str, Any]] = []

        if platform.system() == "Windows":
            try:
                import ctypes

                user32 = ctypes.windll.user32

                def enum_windows_callback(hwnd: int, extra: Any) -> bool:
                    if user32.IsWindowVisible(hwnd):
                        length = user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            buff = ctypes.create_unicode_buffer(length + 1)
                            user32.GetWindowTextW(hwnd, buff, length + 1)
                            title = buff.value.strip()
                            if title and title not in (
                                "Program Manager",
                                "Settings",
                                "NVIDIA GeForce Overlay",
                            ):
                                pid = ctypes.c_ulong()
                                user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                                try:
                                    pname = psutil.Process(pid.value).name()
                                except Exception:
                                    pname = "unknown"
                                running_apps.append(
                                    {
                                        "title": title,
                                        "pid": pid.value,
                                        "process": pname,
                                        "hwnd": hwnd,
                                    }
                                )
                    return True

                enum_windows_proc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
                user32.EnumWindows(enum_windows_proc(enum_windows_callback), 0)
            except Exception as e:
                log.warning("Win32 window list failed: %s", e)

        # Fallback to psutil process list if no GUI windows detected
        if not running_apps:
            for proc in psutil.process_iter(["pid", "name", "cpu_percent"]):
                try:
                    if proc.info["name"] and not proc.info["name"].startswith("System"):
                        running_apps.append(
                            {
                                "title": proc.info["name"],
                                "pid": proc.info["pid"],
                                "process": proc.info["name"],
                            }
                        )
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

        running_apps = running_apps[:limit]
        summary = [f"Active applications ({len(running_apps)}):"]
        for app in running_apps:
            summary.append(f"  • [PID {app['pid']}] {app['title']} ({app.get('process', '')})")

        return ToolResult.ok("\n".join(summary), applications=running_apps, count=len(running_apps))
