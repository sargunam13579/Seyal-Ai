"""
Seyal AI Computer-Use Low-Level OS Action Primitives Package.
"""

from __future__ import annotations

import importlib.util

from .executor import ComputerActionExecutor
from .geometry import (
    clamp_coordinates,
    enable_windows_dpi_awareness,
    enable_windows_dpi_awareness as _enable_windows_dpi_awareness,
    get_screen_bounds,
    get_screen_geometry,
)
from .keyboard import (
    execute_clipboard_paste,
    execute_hotkey,
    execute_key_press,
    execute_type_text,
)
from .mouse import (
    execute_click,
    execute_double_click,
    execute_middle_click,
    execute_mouse_drag,
    execute_mouse_move,
    execute_mouse_scroll,
    execute_right_click,
)
from .windows import (
    bring_window_to_foreground,
    execute_focus_window,
    execute_open_app,
    execute_screenshot,
    execute_switch_window,
    execute_window_close,
    execute_window_maximize,
    execute_window_minimize,
)

try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False

HAS_PYWINAUTO = importlib.util.find_spec("pywinauto") is not None

__all__ = [
    "ComputerActionExecutor",
    "enable_windows_dpi_awareness",
    "_enable_windows_dpi_awareness",
    "get_screen_geometry",
    "get_screen_bounds",
    "clamp_coordinates",
    "bring_window_to_foreground",
    "HAS_PYAUTOGUI",
    "HAS_PYWINAUTO",
    "execute_click",
    "execute_double_click",
    "execute_right_click",
    "execute_middle_click",
    "execute_mouse_move",
    "execute_mouse_drag",
    "execute_mouse_scroll",
    "execute_type_text",
    "execute_key_press",
    "execute_hotkey",
    "execute_clipboard_paste",
    "execute_open_app",
    "execute_focus_window",
    "execute_switch_window",
    "execute_window_minimize",
    "execute_window_maximize",
    "execute_window_close",
    "execute_screenshot",
]
