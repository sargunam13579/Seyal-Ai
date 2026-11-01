"""
Windows Win32 SendInput Simulator and Fail-Safe Abort Guard for Computer Use.

Provides native OS GUI automation via ctypes SendInput, multi-monitor coordinate
clamping, and physical corner fail-safe detection.
"""

from __future__ import annotations

import ctypes
import platform
import time
from ctypes import wintypes
from typing import Any

from seyal_ai.agents.computer_use.models import AutomationInterruptException
from seyal_ai.agents.computer_use.screen import (
    ScreenCoordinateScaler,
    VirtualScreenBounds,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.input")

# Win32 Constants
INPUT_MOUSE = 0
INPUT_KEYBOARD = 1
INPUT_HARDWARE = 2

MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_ABSOLUTE = 0x8000
MOUSEEVENTF_VIRTUALDESK = 0x4000

KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP = 0x0002
KEYEVENTF_UNICODE = 0x0004
KEYEVENTF_SCANCODE = 0x0008

# Win32 Virtual Key Codes
VK_MAP: dict[str, int] = {
    "enter": 0x0D,
    "return": 0x0D,
    "tab": 0x09,
    "space": 0x20,
    "backspace": 0x08,
    "delete": 0x2E,
    "escape": 0x1B,
    "esc": 0x1B,
    "shift": 0x10,
    "ctrl": 0x11,
    "control": 0x11,
    "alt": 0x12,
    "win": 0x5B,
    "windows": 0x5B,
    "cmd": 0x5B,
    "up": 0x26,
    "down": 0x28,
    "left": 0x25,
    "right": 0x27,
    "home": 0x24,
    "end": 0x23,
    "pageup": 0x21,
    "pagedown": 0x22,
    "f1": 0x70,
    "f2": 0x71,
    "f3": 0x72,
    "f4": 0x73,
    "f5": 0x74,
    "f6": 0x75,
    "f7": 0x76,
    "f8": 0x77,
    "f9": 0x78,
    "f10": 0x79,
    "f11": 0x7A,
    "f12": 0x7B,
}


# Win32 Struct definitions for SendInput
class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_size_t),
    ]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_size_t),
    ]


class HARDWAREINPUT(ctypes.Structure):
    _fields_ = [
        ("uMsg", wintypes.DWORD),
        ("wParamL", wintypes.WORD),
        ("wParamH", wintypes.WORD),
    ]


class INPUT_UNION(ctypes.Union):
    _fields_ = [
        ("mi", MOUSEINPUT),
        ("ki", KEYBDINPUT),
        ("hi", HARDWAREINPUT),
    ]


class INPUT(ctypes.Structure):
    _fields_ = [
        ("type", wintypes.DWORD),
        ("u", INPUT_UNION),
    ]


class Win32InputSimulator:
    """
    Simulates mouse and keyboard input on Windows using SendInput.
    Includes fail-safe abort boundaries and headless simulation support.
    """

    def __init__(
        self,
        scaler: ScreenCoordinateScaler | None = None,
        dry_run: bool = False,
        corner_threshold: int = 5,
    ) -> None:
        self._scaler = scaler or ScreenCoordinateScaler()
        self._dry_run = dry_run or (platform.system() != "Windows")
        self._corner_threshold = corner_threshold
        self._last_simulated_pos: tuple[int, int] = (100, 100)

    @property
    def dry_run(self) -> bool:
        return self._dry_run

    def get_cursor_position(self) -> tuple[int, int]:
        """Query actual physical mouse cursor position from Windows."""
        if self._dry_run or platform.system() != "Windows":
            return self._last_simulated_pos

        try:
            pt = wintypes.POINT()
            if ctypes.windll.user32.GetCursorPos(ctypes.byref(pt)):
                return pt.x, pt.y
        except Exception as e:
            log.debug("GetCursorPos failed: %s", e)
        return self._last_simulated_pos

    def check_failsafe(self, x: int | None = None, y: int | None = None) -> None:
        """
        CU-02: Check if mouse cursor is in any extreme corner of the screen.
        If triggered, immediately raises AutomationInterruptException.
        """
        cur_x, cur_y = (x, y) if (x is not None and y is not None) else self.get_cursor_position()
        bounds: VirtualScreenBounds = self._scaler.get_virtual_screen_bounds()

        # Four corners of virtual desktop
        top_left = (bounds.min_x, bounds.min_y)
        top_right = (bounds.min_x + bounds.width - 1, bounds.min_y)
        bottom_left = (bounds.min_x, bounds.min_y + bounds.height - 1)
        bottom_right = (bounds.min_x + bounds.width - 1, bounds.min_y + bounds.height - 1)

        corners = [top_left, top_right, bottom_left, bottom_right]
        for cx, cy in corners:
            if abs(cur_x - cx) <= self._corner_threshold and abs(cur_y - cy) <= self._corner_threshold:
                log.critical("Physical Fail-Safe triggered at corner (%d, %d)! Aborting automation.", cur_x, cur_y)
                raise AutomationInterruptException(
                    f"Fail-Safe abort triggered: cursor at corner ({cur_x}, {cur_y})."
                )

    def _to_normalized_absolute(self, x: int, y: int) -> tuple[int, int]:
        """Convert pixel coordinates to Win32 0..65535 normalized coordinates."""
        bounds = self._scaler.get_virtual_screen_bounds()
        norm_x = int(((x - bounds.min_x) * 65536) / bounds.width)
        norm_y = int(((y - bounds.min_y) * 65536) / bounds.height)
        return norm_x, norm_y

    def _send_inputs(self, inputs: list[INPUT]) -> bool:
        """Dispatch input events via Win32 SendInput."""
        if not inputs or self._dry_run or platform.system() != "Windows":
            return True

        n = len(inputs)
        arr = (INPUT * n)(*inputs)
        cb_size = ctypes.sizeof(INPUT)
        res = ctypes.windll.user32.SendInput(n, arr, cb_size)
        return res == n

    def move_to(self, x: int, y: int) -> None:
        """Move cursor to specified coordinates."""
        self.check_failsafe(x, y)
        self._last_simulated_pos = (x, y)

        if self._dry_run or platform.system() != "Windows":
            return

        norm_x, norm_y = self._to_normalized_absolute(x, y)
        inp = INPUT(
            type=INPUT_MOUSE,
            u=INPUT_UNION(
                mi=MOUSEINPUT(
                    dx=norm_x,
                    dy=norm_y,
                    mouseData=0,
                    dwFlags=MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_VIRTUALDESK,
                    time=0,
                    dwExtraInfo=0,
                )
            ),
        )
        self._send_inputs([inp])

    def click(self, x: int | None = None, y: int | None = None, button: str = "left") -> None:
        """Click at current or target position."""
        if x is not None and y is not None:
            self.move_to(x, y)
        else:
            self.check_failsafe()

        btn = button.lower()
        if btn == "right":
            down_flag, up_flag = MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP
        elif btn == "middle":
            down_flag, up_flag = MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP
        else:
            down_flag, up_flag = MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP

        if self._dry_run or platform.system() != "Windows":
            return

        inp_down = INPUT(type=INPUT_MOUSE, u=INPUT_UNION(mi=MOUSEINPUT(dwFlags=down_flag)))
        inp_up = INPUT(type=INPUT_MOUSE, u=INPUT_UNION(mi=MOUSEINPUT(dwFlags=up_flag)))
        self._send_inputs([inp_down, inp_up])

    def double_click(self, x: int | None = None, y: int | None = None) -> None:
        """Perform a double click with short inter-click delay."""
        self.click(x, y, button="left")
        time.sleep(0.05)
        self.click(x, y, button="left")

    def mouse_down(self, button: str = "left") -> None:
        """Hold down specified mouse button."""
        self.check_failsafe()
        btn = button.lower()
        down_flag = MOUSEEVENTF_RIGHTDOWN if btn == "right" else MOUSEEVENTF_LEFTDOWN
        if not self._dry_run and platform.system() == "Windows":
            self._send_inputs([INPUT(type=INPUT_MOUSE, u=INPUT_UNION(mi=MOUSEINPUT(dwFlags=down_flag)))])

    def mouse_up(self, button: str = "left") -> None:
        """Release specified mouse button."""
        self.check_failsafe()
        btn = button.lower()
        up_flag = MOUSEEVENTF_RIGHTUP if btn == "right" else MOUSEEVENTF_LEFTUP
        if not self._dry_run and platform.system() == "Windows":
            self._send_inputs([INPUT(type=INPUT_MOUSE, u=INPUT_UNION(mi=MOUSEINPUT(dwFlags=up_flag)))])

    def drag(self, x1: int, y1: int, x2: int, y2: int, duration: float = 0.2) -> None:
        """Click and drag from (x1, y1) to (x2, y2)."""
        self.move_to(x1, y1)
        time.sleep(0.02)
        self.mouse_down(button="left")
        steps = max(5, int(duration * 20))
        for i in range(1, steps + 1):
            curr_x = int(x1 + (x2 - x1) * (i / steps))
            curr_y = int(y1 + (y2 - y1) * (i / steps))
            self.move_to(curr_x, curr_y)
            time.sleep(duration / steps)
        self.mouse_up(button="left")

    def type_text(self, text: str) -> None:
        """Type unicode characters using SendInput unicode events."""
        self.check_failsafe()
        if not text:
            return

        if self._dry_run or platform.system() != "Windows":
            return

        inputs: list[INPUT] = []
        for char in text:
            code = ord(char)
            # Unicode key down
            inputs.append(
                INPUT(
                    type=INPUT_KEYBOARD,
                    u=INPUT_UNION(ki=KEYBDINPUT(wVk=0, wScan=code, dwFlags=KEYEVENTF_UNICODE, time=0, dwExtraInfo=0)),
                )
            )
            # Unicode key up
            inputs.append(
                INPUT(
                    type=INPUT_KEYBOARD,
                    u=INPUT_UNION(
                        ki=KEYBDINPUT(
                            wVk=0, wScan=code, dwFlags=KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, time=0, dwExtraInfo=0
                        )
                    ),
                )
            )
        self._send_inputs(inputs)

    def key_down(self, key: str) -> None:
        """Press down a virtual key."""
        self.check_failsafe()
        vk = VK_MAP.get(key.lower(), 0)
        if vk and not self._dry_run and platform.system() == "Windows":
            self._send_inputs([INPUT(type=INPUT_KEYBOARD, u=INPUT_UNION(ki=KEYBDINPUT(wVk=vk, dwFlags=0)))])

    def key_up(self, key: str) -> None:
        """Release a virtual key."""
        self.check_failsafe()
        vk = VK_MAP.get(key.lower(), 0)
        if vk and not self._dry_run and platform.system() == "Windows":
            self._send_inputs([INPUT(type=INPUT_KEYBOARD, u=INPUT_UNION(ki=KEYBDINPUT(wVk=vk, dwFlags=KEYEVENTF_KEYUP)))])

    def key_press(self, key: str) -> None:
        """Press and release a key."""
        self.key_down(key)
        time.sleep(0.01)
        self.key_up(key)

    def hotkey(self, *keys: str) -> None:
        """Press a combination of keys simultaneously in order, then release in reverse."""
        self.check_failsafe()
        for k in keys:
            self.key_down(k)
            time.sleep(0.01)
        time.sleep(0.02)
        for k in reversed(keys):
            self.key_up(k)
            time.sleep(0.01)
