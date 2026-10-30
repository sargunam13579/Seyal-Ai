"""
Seyal AI Application Lifecycle Control Tools (Launch, Close, Switch, Window State).
"""

from __future__ import annotations

import os
import platform
import subprocess
from pathlib import Path
from typing import Any

import psutil

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.system.apps.discovery import (
    _find_windows_app_path,
    _parse_command_arguments,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.system.apps.lifecycle")


class OpenApplicationTool(BaseTool):
    """Open or launch an application on the laptop."""

    @property
    def name(self) -> str:
        return "open_application"

    @property
    def description(self) -> str:
        return (
            "Open or launch an application on the laptop. Specify the application name "
            "(e.g., 'notepad', 'code', 'chrome', 'calc') and optional launch arguments or working directory."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "app_name": {
                    "type": "string",
                    "description": "Name or executable of the application (e.g. 'notepad', 'chrome', 'code', 'calculator').",
                },
                "arguments": {
                    "type": "string",
                    "description": "Optional command-line arguments to pass to the application.",
                },
                "working_dir": {
                    "type": "string",
                    "description": "Optional working directory in which to start the application.",
                },
            },
            "required": ["app_name"],
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

    async def execute(
        self,
        app_name: str = "",
        arguments: str | None = None,
        working_dir: str | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        app_clean = app_name.strip()
        if not app_clean:
            return ToolResult.fail("Application name cannot be empty.")

        target = _find_windows_app_path(app_clean) or app_clean
        log.info("Launching application '%s' (resolved target: '%s')", app_clean, target)

        try:
            cwd = working_dir if working_dir and Path(working_dir).exists() else None

            if target.startswith("ms-"):
                subprocess.Popen(f"start {target}", shell=True, cwd=cwd)
            elif target.endswith(".lnk"):
                os.startfile(target) if hasattr(os, "startfile") else subprocess.Popen(
                    ["start", "", target], shell=True, cwd=cwd
                )
            else:
                cmd_parts = [target]
                if arguments:
                    cmd_parts.extend(_parse_command_arguments(arguments))
                subprocess.Popen(cmd_parts, shell=True, cwd=cwd)

            return ToolResult.ok(
                f"Successfully opened {app_clean}",
                app_name=app_clean,
                resolved_target=target,
                arguments=arguments,
            )
        except Exception as e:
            log.error("Failed to launch application '%s': %s", app_clean, e)
            return ToolResult.fail(f"Could not open application '{app_clean}': {e}")


class CloseApplicationTool(BaseTool):
    """Close a running application by name, window title, or PID."""

    @property
    def name(self) -> str:
        return "close_application"

    @property
    def description(self) -> str:
        return (
            "Close a running application on the laptop by process name (e.g. 'notepad', 'chrome.exe'), "
            "window title, or process ID (PID). Gracefully closes by default."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "app_name": {
                    "type": "string",
                    "description": "Name or executable of the application to close (e.g. 'notepad', 'calc').",
                },
                "pid": {
                    "type": "integer",
                    "description": "Optional specific process ID (PID) to close.",
                },
                "force": {
                    "type": "boolean",
                    "description": "Whether to force kill the process immediately (default: false).",
                },
            },
            "required": [],
        }

    @property
    def category(self) -> str:
        return "application"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self,
        app_name: str | None = None,
        pid: int | None = None,
        force: bool = False,
        **kwargs: Any,
    ) -> ToolResult:
        if not app_name and pid is None:
            return ToolResult.fail("Please provide either 'app_name' or 'pid' to close.")

        closed_pids: list[int] = []
        app_target = app_name.lower().strip() if app_name else ""
        clean_target = app_target[:-4] if app_target.endswith(".exe") else app_target

        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                proc_pid = proc.info["pid"]
                proc_name = (proc.info["name"] or "").lower()
                clean_proc_name = proc_name[:-4] if proc_name.endswith(".exe") else proc_name

                match = False
                if (
                    pid is not None
                    and proc_pid == pid
                    or app_target
                    and (
                        clean_proc_name == clean_target
                        or clean_target in clean_proc_name
                        or (
                            proc.info.get("cmdline")
                            and any(clean_target in arg.lower() for arg in proc.info["cmdline"])
                        )
                    )
                ):
                    match = True

                if match:
                    p = psutil.Process(proc_pid)
                    if force:
                        p.kill()
                    else:
                        p.terminate()
                    closed_pids.append(proc_pid)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        if closed_pids:
            mode_str = "force-closed" if force else "closed"
            return ToolResult.ok(
                f"Successfully {mode_str} {len(closed_pids)} process(es) for '{app_name or pid}'.",
                closed_pids=closed_pids,
            )
        return ToolResult.fail(f"No running processes found matching '{app_name or pid}'.")


class SwitchApplicationTool(BaseTool):
    """Switch to an application and bring its window to the foreground."""

    @property
    def name(self) -> str:
        return "switch_application"

    @property
    def description(self) -> str:
        return "Bring a running application window to the foreground by application name or window title."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "app_name": {
                    "type": "string",
                    "description": "Application name or window title to bring to front (e.g. 'notepad', 'chrome', 'Visual Studio Code').",
                },
            },
            "required": ["app_name"],
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

    async def execute(self, app_name: str = "", **kwargs: Any) -> ToolResult:
        clean_name = app_name.strip()
        if not clean_name:
            return ToolResult.fail("Application name cannot be empty.")

        if platform.system() == "Windows":
            try:
                import ctypes

                user32 = ctypes.windll.user32
                matched_hwnd = None
                matched_title = ""

                def enum_windows_callback(hwnd: int, extra: Any) -> bool:
                    nonlocal matched_hwnd, matched_title
                    if user32.IsWindowVisible(hwnd):
                        length = user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            buff = ctypes.create_unicode_buffer(length + 1)
                            user32.GetWindowTextW(hwnd, buff, length + 1)
                            title = buff.value
                            if clean_name.lower() in title.lower():
                                matched_hwnd = hwnd
                                matched_title = title
                                return False
                    return True

                enum_windows_proc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
                user32.EnumWindows(enum_windows_proc(enum_windows_callback), 0)

                if matched_hwnd:
                    user32.ShowWindow(matched_hwnd, 9)
                    user32.SetForegroundWindow(matched_hwnd)
                    return ToolResult.ok(
                        f"Switched to '{matched_title}'",
                        window_title=matched_title,
                        hwnd=matched_hwnd,
                    )
            except Exception as e:
                log.warning("Win32 switch failed: %s, falling back to powershell", e)

            # PowerShell fallback
            ps_script = f"""
            $proc = Get-Process | Where-Object {{ $_.MainWindowTitle -match '{clean_name}' -or $_.ProcessName -match '{clean_name}' }} | Select-Object -First 1
            if ($proc -and $proc.MainWindowHandle -ne 0) {{
                $wsh = New-Object -ComObject WScript.Shell
                $wsh.AppActivate($proc.Id)
                Write-Output "OK:$($proc.MainWindowTitle)"
            }} else {{
                Write-Output "NOT_FOUND"
            }}
            """
            try:
                res = subprocess.run(
                    ["powershell", "-Command", ps_script],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                output = res.stdout.strip()
                if "OK:" in output:
                    title = output.replace("OK:", "").strip()
                    return ToolResult.ok(
                        f"Switched to application '{title or clean_name}'", window_title=title
                    )
            except Exception as e:
                log.error("PowerShell switch failed: %s", e)

        return ToolResult.fail(f"Could not find an active window matching '{clean_name}'.")


class WindowStateTool(BaseTool):
    """Minimize, maximize, restore, or hide an application window on the laptop."""

    @property
    def name(self) -> str:
        return "window_state"

    @property
    def description(self) -> str:
        return (
            "Control application window states (minimize, maximize, restore, normal, hide) "
            "by application name or window title."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "app_name": {
                    "type": "string",
                    "description": "Application name or window title (e.g. 'notepad', 'chrome', 'Visual Studio Code').",
                },
                "action": {
                    "type": "string",
                    "enum": ["minimize", "maximize", "restore", "hide"],
                    "description": "Window action to perform: 'minimize', 'maximize', 'restore', or 'hide'.",
                },
            },
            "required": ["app_name", "action"],
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

    async def execute(
        self,
        app_name: str = "",
        action: str = "minimize",
        **kwargs: Any,
    ) -> ToolResult:
        clean_name = app_name.strip().lower()
        if not clean_name:
            return ToolResult.fail("Application name cannot be empty.")

        action_clean = action.strip().lower()
        cmd_map = {
            "hide": 0,
            "maximize": 3,
            "minimize": 6,
            "restore": 9,
            "normal": 1,
        }
        cmd_flag = cmd_map.get(action_clean, 6)

        if platform.system() == "Windows":
            try:
                import ctypes

                user32 = ctypes.windll.user32
                matched_hwnd = None
                matched_title = ""

                def enum_windows_callback(hwnd: int, extra: Any) -> bool:
                    nonlocal matched_hwnd, matched_title
                    if user32.IsWindowVisible(hwnd):
                        length = user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            buff = ctypes.create_unicode_buffer(length + 1)
                            user32.GetWindowTextW(hwnd, buff, length + 1)
                            title = buff.value
                            if clean_name in title.lower():
                                matched_hwnd = hwnd
                                matched_title = title
                                return False
                    return True

                enum_windows_proc = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
                user32.EnumWindows(enum_windows_proc(enum_windows_callback), 0)

                if matched_hwnd:
                    user32.ShowWindow(matched_hwnd, cmd_flag)
                    if action_clean in ("maximize", "restore"):
                        user32.SetForegroundWindow(matched_hwnd)
                    return ToolResult.ok(
                        f"Successfully performed '{action_clean}' on '{matched_title}'.",
                        app_name=app_name,
                        window_title=matched_title,
                        action=action_clean,
                    )
            except Exception as e:
                log.warning("Win32 window state control failed: %s", e)

        return ToolResult.fail(f"Could not find an active window matching '{app_name}' to {action_clean}.")
