"""
Seyal AI Application Discovery, Path Resolution, and Argument Parsing.
"""

from __future__ import annotations

import os
import platform
import shlex
import shutil
from pathlib import Path

# Common application name to executable mappings
COMMON_APP_MAP: dict[str, str] = {
    "notepad": "notepad.exe",
    "notepad++": "notepad++.exe",
    "calc": "calc.exe",
    "calculator": "calc.exe",
    "paint": "mspaint.exe",
    "mspaint": "mspaint.exe",
    "explorer": "explorer.exe",
    "file explorer": "explorer.exe",
    "cmd": "cmd.exe",
    "command prompt": "cmd.exe",
    "terminal": "wt.exe",
    "windows terminal": "wt.exe",
    "powershell": "powershell.exe",
    "task manager": "taskmgr.exe",
    "taskmgr": "taskmgr.exe",
    "settings": "ms-settings:",
    "control panel": "control.exe",
    "chrome": "chrome.exe",
    "google chrome": "chrome.exe",
    "firefox": "firefox.exe",
    "edge": "msedge.exe",
    "microsoft edge": "msedge.exe",
    "brave": "brave.exe",
    "spotify": "spotify.exe",
    "discord": "discord.exe",
    "slack": "slack.exe",
    "code": "code.cmd",
    "vscode": "code.cmd",
    "visual studio code": "code.cmd",
    "word": "winword.exe",
    "excel": "excel.exe",
    "powerpoint": "powerpnt.exe",
    "outlook": "outlook.exe",
    "vlc": "vlc.exe",
    "steam": "steam.exe",
    "obs": "obs64.exe",
}


def _find_windows_app_path(app_name: str) -> str | None:
    """Find executable or shortcut path for a given application name."""
    clean_name = app_name.lower().strip()

    # 1. Exact match in common map
    if clean_name in COMMON_APP_MAP:
        mapped = COMMON_APP_MAP[clean_name]
        if mapped.startswith("ms-") or shutil.which(mapped):
            return mapped

    # 2. Check if on system PATH
    found = shutil.which(app_name)
    if found:
        return found

    # 3. Check Start Menu shortcuts on Windows
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
                    if clean_name in lnk.stem.lower():
                        return str(lnk)

    return None


def _parse_command_arguments(arguments: str | None) -> list[str]:
    """Parse application arguments preserving quoted substrings, spaces, and Windows backslashes."""
    if not arguments or not arguments.strip():
        return []
    is_windows = platform.system() == "Windows"
    try:
        raw_parts = shlex.split(arguments, posix=not is_windows)
        clean_parts: list[str] = []
        for p in raw_parts:
            # Strip enclosing quotes since subprocess / list2cmdline quotes arguments containing spaces automatically
            if len(p) >= 2 and ((p.startswith('"') and p.endswith('"')) or (p.startswith("'") and p.endswith("'"))):
                clean_parts.append(p[1:-1])
            else:
                clean_parts.append(p)
        return clean_parts
    except Exception:
        return arguments.split()
