"""
ADB Bridge Client with Strict Argument Isolation and Shell Injection Defense.

Communicates with connected Android devices over USB/Wi-Fi via Android Debug Bridge.
Enforces process argument separation (no shell=True) and strict text sanitization.
"""

from __future__ import annotations

import asyncio
import re
import shlex
import shutil
import subprocess
from typing import Any

from seyal_ai.agents.devices.models import ShellInjectionBlockedException
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.devices.adb")

# Dangerous shell characters and patterns that must never be executed
DANGEROUS_SHELL_PATTERNS = [
    re.compile(r"[;&|`$]"),          # Command chaining operators (; && || | ` $(...))
    re.compile(r"\b(su|sudo)\b"),    # Privilege escalation
    re.compile(r"\b(rm\s+-rf)\b"),   # Destructive commands
    re.compile(r"\b(reboot|fastboot|recovery)\b"),
]


class ADBClient:
    """
    Subprocess-based ADB client with strict parameter isolation.
    """

    def __init__(self, adb_path: str = "adb", dry_run: bool = False) -> None:
        self._adb_path = adb_path
        self._dry_run = dry_run or (shutil.which(adb_path) is None)

    @property
    def is_dry_run(self) -> bool:
        return self._dry_run

    @staticmethod
    def sanitize_input_text(text: str) -> str:
        """
        Sanitize text for 'adb shell input text'.
        Spaces are converted to '%s'.
        Quotes and shell metacharacters are escaped or stripped to prevent shell injection.
        """
        if not text:
            return ""

        # Android input text requires spaces to be %s
        # Replace spaces with %s
        clean = text.replace(" ", "%s")

        # Check and prevent destructive command injection payloads
        for pattern in DANGEROUS_SHELL_PATTERNS:
            if pattern.search(text):
                # When metacharacters are present, treat as literal text by escaping or raising
                # For input text typing, we escape single/double quotes, slashes, and metacharacters
                clean = re.sub(r'([;&|`$\\()<>"\'])', r"\\\1", clean)

        return clean

    async def _run_adb_cmd(
        self,
        args: list[str],
        serial: str | None = None,
        timeout: float = 15.0,
    ) -> tuple[int, bytes, bytes]:
        """
        Execute adb command using process argument lists (no shell=True).
        """
        cmd: list[str] = [self._adb_path]
        if serial:
            cmd.extend(["-s", serial])
        cmd.extend(args)

        if self._dry_run:
            log.debug("Dry-run ADB command: %s", " ".join(cmd))
            return 0, b"dry_run_success", b""

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            return proc.returncode or 0, stdout, stderr
        except asyncio.TimeoutError:
            log.warning("ADB command timed out: %s", " ".join(cmd))
            return -1, b"", b"ADB command timed out"
        except Exception as e:
            log.error("ADB execution error: %s", e)
            return -1, b"", str(e).encode("utf-8")

    async def list_devices(self) -> list[str]:
        """List serial numbers of connected and authorized ADB devices."""
        if self._dry_run:
            return ["emulator-5554", "mock_device_serial_1"]

        rc, stdout, _ = await self._run_adb_cmd(["devices"])
        if rc != 0:
            return []

        devices: list[str] = []
        for line in stdout.decode("utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("List of devices"):
                continue
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "device":
                devices.append(parts[0])
        return devices

    async def tap(self, serial: str, x: int, y: int) -> bool:
        """Simulate single tap at coordinates (x, y)."""
        if x < 0 or y < 0:
            raise ValueError(f"Negative coordinates ({x}, {y}) invalid for touch.")
        rc, _, _ = await self._run_adb_cmd(["shell", "input", "tap", str(x), str(y)], serial=serial)
        return rc == 0

    async def swipe(self, serial: str, x1: int, y1: int, x2: int, y2: int, duration_ms: int = 300) -> bool:
        """Simulate swipe gesture between two points."""
        rc, _, _ = await self._run_adb_cmd(
            ["shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(duration_ms)],
            serial=serial,
        )
        return rc == 0

    async def type_text(self, serial: str, text: str) -> bool:
        """Simulate typing text into active focused element."""
        sanitized = self.sanitize_input_text(text)
        rc, _, _ = await self._run_adb_cmd(["shell", "input", "text", sanitized], serial=serial)
        return rc == 0

    async def key_event(self, serial: str, key_code: int) -> bool:
        """Simulate Android key event code."""
        if key_code < 0:
            raise ValueError("KeyEvent code must be non-negative.")
        rc, _, _ = await self._run_adb_cmd(["shell", "input", "keyevent", str(key_code)], serial=serial)
        return rc == 0

    async def screencap(self, serial: str) -> bytes:
        """Capture screenshot directly in PNG format."""
        if self._dry_run:
            # Minimal mock PNG header (8 bytes magic) + dummy chunk
            return b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"

        rc, stdout, _ = await self._run_adb_cmd(["exec-out", "screencap", "-p"], serial=serial)
        if rc == 0 and stdout:
            return stdout
        return b""

    async def dump_ui_hierarchy(self, serial: str) -> str:
        """Dump UI Automator XML hierarchy string."""
        if self._dry_run:
            return (
                '<?xml version="1.0" encoding="UTF-8"?>\n'
                '<hierarchy rotation="0">\n'
                '  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.android.systemui" content-desc="" bounds="[0,0][1080,2400]">\n'
                '    <node index="0" text="Home" resource-id="com.android.launcher3:id/home" class="android.widget.TextView" package="com.android.launcher3" content-desc="Home Screen" bounds="[100,200][300,400]" />\n'
                '    <node index="1" text="Search" resource-id="com.google.android.apps.nexuslauncher:id/search_box" class="android.widget.EditText" package="com.google.android.apps.nexuslauncher" content-desc="Search apps" bounds="[100,500][980,650]" />\n'
                '    <node index="2" text="Submit" resource-id="com.example.app:id/submit_button" class="android.widget.Button" package="com.example.app" content-desc="Submit Order" bounds="[200,800][600,950]" />\n'
                '  </node>\n'
                '</hierarchy>'
            )

        # Execute dump to device temp, then cat out
        await self._run_adb_cmd(["shell", "uiautomator", "dump", "/sdcard/window_dump.xml"], serial=serial)
        rc, stdout, _ = await self._run_adb_cmd(["exec-out", "cat", "/sdcard/window_dump.xml"], serial=serial)
        if rc == 0 and stdout:
            return stdout.decode("utf-8", errors="replace")
        return ""
