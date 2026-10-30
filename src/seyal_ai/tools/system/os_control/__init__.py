"""
Seyal AI OS & Hardware Control Tools Package for Windows.

Provides modularized system control capabilities:
- audio_power: VolumeControlTool, LockScreenTool
- screenshot: ScreenshotTool
- clipboard_sys: ClipboardTool, ExtendedSystemInfoTool
"""

from __future__ import annotations

from seyal_ai.tools.system.os_control.audio_power import (
    KEYEVENTF_KEYUP,
    VK_VOLUME_DOWN,
    VK_VOLUME_MUTE,
    VK_VOLUME_UP,
    LockScreenTool,
    VolumeControlTool,
)
from seyal_ai.tools.system.os_control.clipboard_sys import (
    SENSITIVE_CLIPBOARD_PATTERNS,
    ClipboardTool,
    ExtendedSystemInfoTool,
    _mask_sensitive_text,
    _win32_clear_clipboard,
    _win32_get_clipboard,
    _win32_set_clipboard,
)
from seyal_ai.tools.system.os_control.screenshot import ScreenshotTool

__all__ = [
    "KEYEVENTF_KEYUP",
    "SENSITIVE_CLIPBOARD_PATTERNS",
    "VK_VOLUME_DOWN",
    "VK_VOLUME_MUTE",
    "VK_VOLUME_UP",
    "ClipboardTool",
    "ExtendedSystemInfoTool",
    "LockScreenTool",
    "ScreenshotTool",
    "VolumeControlTool",
    "_mask_sensitive_text",
    "_win32_clear_clipboard",
    "_win32_get_clipboard",
    "_win32_set_clipboard",
]
