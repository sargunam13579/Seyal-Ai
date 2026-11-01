"""
Screen Coordinate Scaler, DPI Normalization, and Multi-Monitor Geometry for Computer Use.

Ensures reliable coordinate mapping across high-DPI displays (100%, 125%, 150%)
and multi-monitor virtual screen topologies.
"""

from __future__ import annotations

import platform
from typing import NamedTuple

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.screen")


class VirtualScreenBounds(NamedTuple):
    min_x: int
    min_y: int
    width: int
    height: int


def enable_windows_dpi_awareness() -> None:
    """
    Ensure the process is DPI-aware to eliminate coordinate drift on scaled displays.
    Uses Per-Monitor V2 awareness on Windows 10/11 with fallback to System DPI.
    """
    if platform.system() != "Windows":
        return

    try:
        import ctypes
        # DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = -4
        try:
            ctypes.windll.user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
        except Exception:
            try:
                # PROCESS_PER_MONITOR_DPI_AWARE = 2
                ctypes.windll.shcore.SetProcessDpiAwareness(2)
            except Exception:
                ctypes.windll.user32.SetProcessDPIAware()
    except Exception as e:
        log.debug("DPI awareness initialization skipped: %s", e)


class ScreenCoordinateScaler:
    """
    Normalizes and scales screen coordinates between standard logical pixels
    and physical DPI-scaled screen coordinates.
    """

    def __init__(self, dpi_scale: float = 1.0) -> None:
        self._dpi_scale = max(0.5, min(dpi_scale, 4.0))
        enable_windows_dpi_awareness()

    @property
    def dpi_scale(self) -> float:
        return self._dpi_scale

    def set_dpi_scale(self, scale: float) -> None:
        self._dpi_scale = max(0.5, min(scale, 4.0))

    def get_virtual_screen_bounds(self) -> VirtualScreenBounds:
        """
        Query the Windows virtual desktop metrics covering all connected monitors.
        SM_XVIRTUALSCREEN = 76, SM_YVIRTUALSCREEN = 77
        SM_CXVIRTUALSCREEN = 78, SM_CYVIRTUALSCREEN = 79
        """
        if platform.system() == "Windows":
            try:
                import ctypes
                vx = int(ctypes.windll.user32.GetSystemMetrics(76))
                vy = int(ctypes.windll.user32.GetSystemMetrics(77))
                vw = int(ctypes.windll.user32.GetSystemMetrics(78))
                vh = int(ctypes.windll.user32.GetSystemMetrics(79))
                if vw > 0 and vh > 0:
                    return VirtualScreenBounds(vx, vy, vw, vh)
            except Exception as e:
                log.debug("GetSystemMetrics call failed: %s", e)

        # Fallback to standard 1080p single monitor
        return VirtualScreenBounds(0, 0, 1920, 1080)

    def normalize_coordinates(self, x: int, y: int, custom_scale: float | None = None) -> tuple[int, int]:
        """
        Scale physical coordinates down to logical 100% normalized coordinates.
        Logical = Physical / Scale
        """
        scale = custom_scale if custom_scale is not None else self._dpi_scale
        if scale <= 0:
            scale = 1.0
        return round(x / scale), round(y / scale)

    def denormalize_coordinates(self, x: int, y: int, custom_scale: float | None = None) -> tuple[int, int]:
        """
        Scale normalized logical coordinates up to physical DPI screen coordinates.
        Physical = Logical * Scale
        """
        scale = custom_scale if custom_scale is not None else self._dpi_scale
        if scale <= 0:
            scale = 1.0
        return round(x * scale), round(y * scale)

    def clamp_to_virtual_screen(self, x: int, y: int) -> tuple[int, int]:
        """
        Clamp coordinates within the virtual screen bounds, supporting negative
        coordinates for secondary displays located to the left or top of primary monitor.
        """
        bounds = self.get_virtual_screen_bounds()
        max_x = bounds.min_x + bounds.width - 1
        max_y = bounds.min_y + bounds.height - 1

        clamped_x = max(bounds.min_x, min(x, max_x))
        clamped_y = max(bounds.min_y, min(y, max_y))
        return clamped_x, clamped_y
