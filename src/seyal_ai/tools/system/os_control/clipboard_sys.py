"""
Seyal AI Clipboard and System Diagnostics Tools.
"""

from __future__ import annotations

import ctypes
import datetime
import platform
import re
import subprocess
import time
from typing import Any

import psutil

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.system.os_control.clipboard_sys")

_NO_WINDOW_FLAG = 0x08000000 if platform.system() == "Windows" else 0

SENSITIVE_CLIPBOARD_PATTERNS: list[tuple[re.Pattern, str]] = [
    (
        re.compile(r"-----BEGIN [A-Z0-9 ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]+PRIVATE KEY-----"),
        "[REDACTED_PRIVATE_KEY]",
    ),
    (re.compile(r"(?:sk-ant-|sk-)[a-zA-Z0-9_\-]{20,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"AIza[0-9A-Za-z\-_]{35}"), "[REDACTED_GOOGLE_API_KEY]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED_AWS_KEY]"),
    (
        re.compile(r"(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{40,})"),
        "[REDACTED_GITHUB_TOKEN]",
    ),
    (re.compile(r"(?i)\bBearer\s+[a-zA-Z0-9_\-\.]{25,}"), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"), "[REDACTED_CARD_NUMBER]"),
    (
        re.compile(r"(?i)\b(password|passwd|secret|api_key|token)\s*[:=]\s*([^\s,;]+)"),
        r"\1: [REDACTED_SECRET]",
    ),
]


def _mask_sensitive_text(text: str) -> tuple[str, bool]:
    """Mask sensitive tokens, API keys, passwords, and private keys from text."""
    masked = text
    changed = False
    for pattern, replacement in SENSITIVE_CLIPBOARD_PATTERNS:
        new_text, count = pattern.subn(replacement, masked)
        if count > 0:
            masked = new_text
            changed = True
    return masked, changed


def _win32_get_clipboard() -> str | None:
    """Read clipboard text using native Win32 API for sub-millisecond latency."""
    if platform.system() != "Windows":
        return None
    try:
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        user32.OpenClipboard.argtypes = [ctypes.c_void_p]
        user32.OpenClipboard.restype = ctypes.c_bool
        user32.CloseClipboard.restype = ctypes.c_bool
        user32.GetClipboardData.restype = ctypes.c_void_p
        kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
        kernel32.GlobalLock.restype = ctypes.c_void_p
        kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]

        for _ in range(5):
            if user32.OpenClipboard(None):
                break
            time.sleep(0.01)
        else:
            return None

        try:
            # CF_UNICODETEXT = 13
            if not user32.IsClipboardFormatAvailable(13):
                return ""
            h_data = user32.GetClipboardData(13)
            if not h_data:
                return ""
            p_data = kernel32.GlobalLock(h_data)
            if not p_data:
                return ""
            try:
                return ctypes.c_wchar_p(p_data).value or ""
            finally:
                kernel32.GlobalUnlock(h_data)
        finally:
            user32.CloseClipboard()
    except Exception as e:
        log.debug("Native Win32 clipboard read failed, falling back: %s", e)
        return None


def _win32_set_clipboard(text: str) -> bool:
    """Write text to clipboard using native Win32 API."""
    if platform.system() != "Windows":
        return False
    try:
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        user32.OpenClipboard.argtypes = [ctypes.c_void_p]
        user32.OpenClipboard.restype = ctypes.c_bool
        user32.CloseClipboard.restype = ctypes.c_bool
        user32.EmptyClipboard.restype = ctypes.c_bool
        user32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]
        user32.SetClipboardData.restype = ctypes.c_void_p
        kernel32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
        kernel32.GlobalAlloc.restype = ctypes.c_void_p
        kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
        kernel32.GlobalLock.restype = ctypes.c_void_p
        kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]

        for _ in range(5):
            if user32.OpenClipboard(None):
                break
            time.sleep(0.01)
        else:
            return False

        try:
            user32.EmptyClipboard()
            encoded = text.encode("utf-16le") + b"\x00\x00"
            # GMEM_MOVEABLE = 0x0002
            h_mem = kernel32.GlobalAlloc(2, len(encoded))
            if not h_mem:
                return False
            p_mem = kernel32.GlobalLock(h_mem)
            if not p_mem:
                return False
            ctypes.memmove(p_mem, encoded, len(encoded))
            kernel32.GlobalUnlock(h_mem)
            user32.SetClipboardData(13, h_mem)
            return True
        finally:
            user32.CloseClipboard()
    except Exception as e:
        log.debug("Native Win32 clipboard write failed, falling back: %s", e)
        return False


def _win32_clear_clipboard() -> bool:
    """Clear clipboard using native Win32 API."""
    if platform.system() != "Windows":
        return False
    try:
        user32 = ctypes.windll.user32
        user32.OpenClipboard.argtypes = [ctypes.c_void_p]
        user32.OpenClipboard.restype = ctypes.c_bool
        user32.CloseClipboard.restype = ctypes.c_bool
        user32.EmptyClipboard.restype = ctypes.c_bool

        for _ in range(5):
            if user32.OpenClipboard(None):
                break
            time.sleep(0.01)
        else:
            return False
        try:
            user32.EmptyClipboard()
            return True
        finally:
            user32.CloseClipboard()
    except Exception as e:
        log.debug("Native Win32 clipboard clear failed, falling back: %s", e)
        return False


class ClipboardTool(BaseTool):
    """Read or write text to the system clipboard."""

    @property
    def name(self) -> str:
        return "clipboard"

    @property
    def description(self) -> str:
        return "Access the laptop clipboard: 'get' (read text), 'set' (copy text to clipboard), or 'clear'."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["get", "set", "clear"],
                    "description": "Clipboard action to perform ('get', 'set', or 'clear').",
                },
                "text": {
                    "type": "string",
                    "description": "Text to write to the clipboard (required when action is 'set').",
                },
                "allow_secrets": {
                    "type": "boolean",
                    "description": "If true, do not mask detected sensitive credentials or tokens. Defaults to false.",
                },
            },
            "required": ["action"],
        }

    @property
    def category(self) -> str:
        return "system"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self,
        action: str = "get",
        text: str | None = None,
        allow_secrets: bool = False,
        **kwargs: Any,
    ) -> ToolResult:
        try:
            if action == "get":
                clip_text = _win32_get_clipboard()
                if clip_text is None:
                    res = subprocess.run(
                        ["powershell", "-Command", "Get-Clipboard"],
                        capture_output=True,
                        text=True,
                        timeout=5,
                        creationflags=_NO_WINDOW_FLAG,
                    )
                    clip_text = res.stdout.rstrip("\r\n")

                was_masked = False
                if not allow_secrets:
                    clip_text, was_masked = _mask_sensitive_text(clip_text)

                warning = "\n⚠️ [Security Notice: Sensitive credentials/keys detected and masked]" if was_masked else ""
                return ToolResult.ok(
                    f"Clipboard content ({len(clip_text)} chars):{warning}\n{clip_text}",
                    content=clip_text,
                    length=len(clip_text),
                    masked=was_masked,
                )

            elif action == "set":
                if text is None:
                    return ToolResult.fail("Parameter 'text' is required when action is 'set'.")
                if not _win32_set_clipboard(text):
                    p = subprocess.Popen(
                        ["powershell", "-Command", "$input | Set-Clipboard"],
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        creationflags=_NO_WINDOW_FLAG,
                    )
                    p.communicate(input=text, timeout=5)
                return ToolResult.ok("Text successfully copied to clipboard.", length=len(text))

            elif action == "clear":
                if not _win32_clear_clipboard():
                    subprocess.run(
                        ["powershell", "-Command", "Set-Clipboard -Value ''"],
                        capture_output=True,
                        timeout=5,
                        creationflags=_NO_WINDOW_FLAG,
                    )
                return ToolResult.ok("Clipboard cleared.")

            return ToolResult.fail(f"Unknown clipboard action: '{action}'")

        except Exception as e:
            return ToolResult.fail(f"Clipboard operation failed: {e}")


class ExtendedSystemInfoTool(BaseTool):
    """Get detailed hardware, OS, storage, battery, and network status."""

    @property
    def name(self) -> str:
        return "system_info"

    @property
    def description(self) -> str:
        return "Get comprehensive laptop system diagnostics: OS, CPU, RAM, Disks, Battery, Uptime, and Network."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {},
            "required": [],
        }

    @property
    def category(self) -> str:
        return "system"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, **kwargs: Any) -> ToolResult:
        try:
            # OS & Host
            os_info = f"{platform.system()} {platform.release()} ({platform.version()})"
            hostname = platform.node()
            arch = platform.machine()
            cpu_name = platform.processor()

            # CPU
            cpu_count_logical = psutil.cpu_count(logical=True)
            cpu_count_phys = psutil.cpu_count(logical=False)
            cpu_pct = psutil.cpu_percent(interval=0.2)

            # RAM
            mem = psutil.virtual_memory()
            ram_total_gb = mem.total / (1024**3)
            ram_used_gb = mem.used / (1024**3)
            ram_pct = mem.percent

            # Disks
            disks = []
            for part in psutil.disk_partitions(all=False):
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    disks.append(
                        {
                            "mount": part.mountpoint,
                            "fstype": part.fstype,
                            "total_gb": f"{usage.total / (1024**3):.1f} GB",
                            "free_gb": f"{usage.free / (1024**3):.1f} GB",
                            "percent": usage.percent,
                        }
                    )
                except OSError:
                    continue

            # Battery
            battery_str = "N/A"
            battery = psutil.sensors_battery()
            if battery:
                status = "Plugged in (Charging)" if battery.power_plugged else "On Battery"
                battery_str = f"{battery.percent}% ({status})"

            # Boot time / Uptime
            boot_time = datetime.datetime.fromtimestamp(psutil.boot_time())
            uptime = datetime.datetime.now() - boot_time
            uptime_str = (
                f"{uptime.days}d {uptime.seconds // 3600}h {(uptime.seconds % 3600) // 60}m"
            )

            # Network IPs
            ips = []
            for net_name, addrs in psutil.net_if_addrs().items():
                for a in addrs:
                    if a.family.name == "AF_INET" and not a.address.startswith("127."):
                        ips.append(f"{net_name}: {a.address}")

            summary = (
                f"💻 Computer: {hostname} ({arch})\n"
                f"🪟 OS: {os_info}\n"
                f"⏱️ Uptime: {uptime_str} (Booted: {boot_time.strftime('%Y-%m-%d %H:%M')})\n"
                f"⚡ CPU: {cpu_name} ({cpu_count_phys} cores, {cpu_count_logical} threads) — {cpu_pct}% utilization\n"
                f"🧠 Memory: {ram_used_gb:.1f} GB / {ram_total_gb:.1f} GB ({ram_pct}% used)\n"
                f"🔋 Battery: {battery_str}\n"
                f"💾 Storage:\n"
                + "\n".join(
                    f"   • {d['mount']} ({d['fstype']}): {d['free_gb']} free of {d['total_gb']} ({d['percent']}% used)"
                    for d in disks
                )
                + "\n"
                f"🌐 Network: {', '.join(ips) if ips else 'Local'}"
            )

            return ToolResult.ok(
                summary,
                os=os_info,
                hostname=hostname,
                cpu_percent=cpu_pct,
                ram_percent=ram_pct,
                uptime=uptime_str,
                battery=battery_str,
                disks=disks,
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to gather system diagnostics: {e}")
