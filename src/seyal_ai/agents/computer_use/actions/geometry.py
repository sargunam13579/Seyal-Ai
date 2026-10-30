"""
Screen Geometry, DPI Awareness, and Coordinate Bounds Clamping for Computer Actions.
"""

from __future__ import annotations

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.actions.geometry")

try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


def enable_windows_dpi_awareness() -> None:
    """Ensure Windows process is DPI aware to eliminate coordinate drift on scaled displays."""
    try:
        import ctypes
        import platform

        if platform.system() == "Windows":
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2)  # Per-Monitor V2
            except Exception:
                ctypes.windll.user32.SetProcessDPIAware()
    except Exception:
        pass


def get_screen_bounds() -> tuple[int, int, int, int]:
    """Determine virtual screen bounds on Windows (min_x, min_y, width, height)."""
    enable_windows_dpi_awareness()
    try:
        import platform

        if platform.system() == "Windows":
            try:
                import ctypes

                # SM_XVIRTUALSCREEN = 76, SM_YVIRTUALSCREEN = 77
                # SM_CXVIRTUALSCREEN = 78, SM_CYVIRTUALSCREEN = 79
                vx = ctypes.windll.user32.GetSystemMetrics(76)
                vy = ctypes.windll.user32.GetSystemMetrics(77)
                vw = ctypes.windll.user32.GetSystemMetrics(78)
                vh = ctypes.windll.user32.GetSystemMetrics(79)
                if vw > 0 and vh > 0:
                    return vx, vy, vw, vh
            except Exception:
                pass
        if HAS_PYAUTOGUI:
            w, h = pyautogui.size()
            return 0, 0, w, h
    except Exception as e:
        log.debug("Could not determine screen bounds: %s", e)
    return 0, 0, 1920, 1080


def get_screen_geometry() -> tuple[int, int]:
    """Determine virtual screen dimensions (width, height)."""
    _, _, w, h = get_screen_bounds()
    return w, h


def clamp_coordinates(
    x: int | None,
    y: int | None,
    screen_w: int,
    screen_h: int,
    min_x: int = 0,
    min_y: int = 0,
) -> tuple[int, int]:
    """
    Ensure coordinates fall strictly within screen bounds.

    Supports multi-monitor setups with negative virtual screen coordinates
    when min_x and min_y are specified.
    """
    val_x = min_x if x is None else x
    val_y = min_y if y is None else y
    px = max(min_x, min(val_x, min_x + screen_w - 1))
    py = max(min_y, min(val_y, min_y + screen_h - 1))
    return px, py
