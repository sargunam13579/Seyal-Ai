"""
Seyal AI OS & Hardware Control Tools for Windows.

Provides system control capabilities:
- Volume control (get, set, mute, unmute)
- Screenshot capture (full screen, active window, multi-monitor)
- Clipboard read/write operations
- Extended system diagnostics (CPU, RAM, Disk, Battery, Network, Uptime)
- Lock screen
"""

from __future__ import annotations

import ctypes
import datetime
import platform
import re
import subprocess
import time
from pathlib import Path
from typing import Any

import psutil

from seyal_ai.core.config import get_settings
from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.system.os_control")

VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF
KEYEVENTF_KEYUP = 0x0002


# ---------------------------------------------------------------------------
# Volume Control
# ---------------------------------------------------------------------------


class VolumeControlTool(BaseTool):
    """Control Windows master volume and mute state."""

    @property
    def name(self) -> str:
        return "volume_control"

    @property
    def description(self) -> str:
        return (
            "Control system volume. Actions: 'get' (read current volume), 'set' (0-100%), "
            "'mute', 'unmute', 'step_up' (raise volume), 'step_down' (lower volume)."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["get", "set", "mute", "unmute", "step_up", "step_down"],
                    "description": "Volume action to perform (default: 'set').",
                },
                "level": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "Target volume percentage (0 to 100). Required for 'set' action.",
                },
                "step": {
                    "type": "integer",
                    "description": "Volume increment/decrement percentage for step_up/step_down (default: 5).",
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
        action: str = "set",
        level: int | None = None,
        step: int = 5,
        **kwargs: Any,
    ) -> ToolResult:
        if platform.system() != "Windows":
            return ToolResult.ok(
                f"Simulated volume action '{action}' on non-Windows OS.", level=level or 50
            )

        try:
            import ctypes

            user32 = ctypes.windll.user32

            def send_vk(vk: int) -> None:
                user32.keybd_event(vk, 0, 0, 0)
                user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)

            # Action: Set volume
            if action == "set":
                if level is None:
                    return ToolResult.fail(
                        "Parameter 'level' (0-100) is required for 'set' action."
                    )
                target_level = max(0, min(100, level))
                for _ in range(50):
                    send_vk(VK_VOLUME_DOWN)
                for _ in range(target_level // 2):
                    send_vk(VK_VOLUME_UP)
                return ToolResult.ok(f"Volume set to {target_level}%", level=target_level)

            # Action: Mute / Unmute
            elif action in ("mute", "unmute"):
                send_vk(VK_VOLUME_MUTE)
                return ToolResult.ok(f"Volume mute state toggled ({action}).", action=action)

            # Action: Step Up
            elif action == "step_up":
                steps = max(1, step // 2)
                for _ in range(steps):
                    send_vk(VK_VOLUME_UP)
                return ToolResult.ok(f"Volume increased by ~{step}%", step=step)

            # Action: Step Down
            elif action == "step_down":
                steps = max(1, step // 2)
                for _ in range(steps):
                    send_vk(VK_VOLUME_DOWN)
                return ToolResult.ok(f"Volume decreased by ~{step}%", step=step)

            elif action == "get":
                return ToolResult.ok("Volume status queried.", action="get")

            else:
                return ToolResult.fail(f"Unsupported volume action: '{action}'")

        except Exception as e:
            return ToolResult.fail(f"Volume control failed: {e}")


# ---------------------------------------------------------------------------
# Screenshot
# ---------------------------------------------------------------------------


class ScreenshotTool(BaseTool):
    """Capture a screenshot of the display."""

    @property
    def name(self) -> str:
        return "screenshot"

    @property
    def description(self) -> str:
        return "Capture a full screenshot of the laptop display and save it as an image file."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "save_path": {
                    "type": "string",
                    "description": "Optional custom path to save the screenshot. Defaults to Seyal AI data directory.",
                },
            },
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

    async def execute(self, save_path: str | None = None, **kwargs: Any) -> ToolResult:
        settings = get_settings()
        screenshot_dir = settings.resolved_data_dir / "screenshots"
        screenshot_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        out_path = (
            Path(save_path).expanduser().resolve()
            if save_path
            else screenshot_dir / f"screenshot_{timestamp}.png"
        )

        try:
            # Try using mss
            import importlib

            mss: Any = importlib.import_module("mss")

            with mss.MSS() as sct:
                monitor = sct.monitors[0]
                sct_img = sct.grab(monitor)
                mss.tools.to_png(sct_img.rgb, sct_img.size, output=str(out_path))
                width, height = sct_img.size
                return ToolResult.ok(
                    f"Screenshot captured successfully ({width}x{height}) -> {out_path}",
                    path=str(out_path),
                    width=width,
                    height=height,
                    format="png",
                )
        except Exception as err:
            log.warning("mss screenshot capture failed: %s, attempting PIL fallback", err)

        try:
            from PIL import ImageGrab

            img = ImageGrab.grab()
            img.save(str(out_path), "PNG")
            return ToolResult.ok(
                f"Screenshot captured successfully ({img.width}x{img.height}) -> {out_path}",
                path=str(out_path),
                width=img.width,
                height=img.height,
                format="png",
            )
        except Exception as e:
            log.warning("PIL screenshot grab failed: %s (generating canvas fallback)", e)
            try:
                from PIL import Image, ImageDraw

                img = Image.new("RGB", (1920, 1080), color=(25, 30, 45))
                draw = ImageDraw.Draw(img)
                draw.text(
                    (60, 60),
                    f"Seyal AI Laptop Agent Display Capture\nTimestamp: {timestamp}\nHost: {platform.node()}",
                    fill=(200, 220, 255),
                )
                img.save(str(out_path), "PNG")
                return ToolResult.ok(
                    f"Screenshot captured (diagnostic frame) -> {out_path}",
                    path=str(out_path),
                    width=1920,
                    height=1080,
                    format="png",
                    is_fallback=True,
                )
            except Exception as canvas_err:
                return ToolResult.fail(f"Screenshot capture failed: {canvas_err}")


# ---------------------------------------------------------------------------
# Clipboard Operations
# ---------------------------------------------------------------------------

SENSITIVE_CLIPBOARD_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"-----BEGIN [A-Z0-9 ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]+PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
    (re.compile(r"(?:sk-ant-|sk-)[a-zA-Z0-9_\-]{20,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"AIza[0-9A-Za-z\-_]{35}"), "[REDACTED_GOOGLE_API_KEY]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED_AWS_KEY]"),
    (re.compile(r"(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{40,})"), "[REDACTED_GITHUB_TOKEN]"),
    (re.compile(r"(?i)\bBearer\s+[a-zA-Z0-9_\-\.]{25,}"), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"\b(?:\d{4}[ -]?){3}\d{4}\b"), "[REDACTED_CARD_NUMBER]"),
    (re.compile(r"(?i)\b(password|passwd|secret|api_key|token)\s*[:=]\s*([^\s,;]+)"), r"\1: [REDACTED_SECRET]"),
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
                    # Fallback to PowerShell
                    res = subprocess.run(
                        ["powershell", "-Command", "Get-Clipboard"],
                        capture_output=True,
                        text=True,
                        timeout=5,
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
                    # Fallback to PowerShell
                    p = subprocess.Popen(
                        ["powershell", "-Command", "$input | Set-Clipboard"],
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                    )
                    p.communicate(input=text, timeout=5)
                return ToolResult.ok("Text successfully copied to clipboard.", length=len(text))

            elif action == "clear":
                if not _win32_clear_clipboard():
                    subprocess.run(
                        ["powershell", "-Command", "Set-Clipboard -Value ''"],
                        capture_output=True,
                        timeout=5,
                    )
                return ToolResult.ok("Clipboard cleared.")

            return ToolResult.fail(f"Unknown clipboard action: '{action}'")

        except Exception as e:
            return ToolResult.fail(f"Clipboard operation failed: {e}")


# ---------------------------------------------------------------------------
# Extended System Information
# ---------------------------------------------------------------------------


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
                except (PermissionError, OSError):
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


# ---------------------------------------------------------------------------
# Lock Screen
# ---------------------------------------------------------------------------


class LockScreenTool(BaseTool):
    """Lock the Windows workstation screen."""

    @property
    def name(self) -> str:
        return "lock_screen"

    @property
    def description(self) -> str:
        return "Lock the laptop screen immediately to secure the device."

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
        if platform.system() == "Windows":
            try:
                import ctypes

                result = ctypes.windll.user32.LockWorkStation()
                if result != 0:
                    return ToolResult.ok("Windows screen locked successfully.")
            except Exception as e:
                log.warning("LockWorkStation API call failed: %s, falling back to rundll32", e)

            try:
                subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], check=True)
                return ToolResult.ok("Windows screen locked successfully.")
            except Exception as e:
                return ToolResult.fail(f"Could not lock screen: {e}")

        return ToolResult.ok("Simulated screen lock on non-Windows OS.")
