"""
Seyal AI Computer-Use Action Executor.
Dispatches atomic computer actions on Windows OS with safety boundaries.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.utils.logging import get_logger

from .geometry import (
    clamp_coordinates,
    enable_windows_dpi_awareness,
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

log = get_logger("agents.computer_use.actions.executor")


class ComputerActionExecutor:
    """Executes atomic computer actions on Windows OS with safety boundaries."""

    def __init__(self, smooth_mouse: bool = False) -> None:
        self._smooth_mouse = smooth_mouse
        self._screen_min_x = 0
        self._screen_min_y = 0
        self._screen_width = 1920
        self._screen_height = 1080
        enable_windows_dpi_awareness()
        self._refresh_screen_geometry()

    def _refresh_screen_geometry(self) -> None:
        """Update cached screen dimensions, supporting virtual desktop bounds on Windows."""
        vx, vy, w, h = get_screen_bounds()
        self._screen_min_x = vx
        self._screen_min_y = vy
        self._screen_width = w
        self._screen_height = h

    @property
    def screen_dimensions(self) -> tuple[int, int]:
        return (self._screen_width, self._screen_height)

    @property
    def virtual_screen_bounds(self) -> tuple[int, int, int, int]:
        return (self._screen_min_x, self._screen_min_y, self._screen_width, self._screen_height)

    def _clamp_coordinates(
        self,
        x: int | None,
        y: int | None,
        min_x: int | None = None,
        min_y: int | None = None,
    ) -> tuple[int, int]:
        """Ensure coordinates fall strictly within screen bounds."""
        self._refresh_screen_geometry()
        effective_min_x = (
            min_x
            if min_x is not None
            else (self._screen_min_x if (x is not None and x < 0 and self._screen_min_x < 0) else 0)
        )
        effective_min_y = (
            min_y
            if min_y is not None
            else (self._screen_min_y if (y is not None and y < 0 and self._screen_min_y < 0) else 0)
        )
        return clamp_coordinates(
            x, y, self._screen_width, self._screen_height, min_x=effective_min_x, min_y=effective_min_y
        )

    async def execute(self, action: ComputerAction) -> dict[str, Any]:
        """Execute a ComputerAction asynchronously."""
        log.info("Executing computer action: %s", action.action_type)
        start_time = time.perf_counter()
        res: dict[str, Any]

        try:
            # Enforce Safety Guardrails (Protected apps, blacklisted paths, self-kill prevention)
            from seyal_ai.security.guardrails import get_safety_guardrails
            is_safe, safety_reason = get_safety_guardrails().check_action_safety(action)
            if not is_safe:
                log.warning("Action '%s' blocked by safety guardrail: %s", action.action_type, safety_reason)
                return {
                    "success": False,
                    "error": safety_reason,
                    "action": str(action.action_type),
                    "blocked_by_safety": True,
                    "elapsed_seconds": 0.0,
                }

            match action.action_type:
                case ActionType.CLICK:
                    res = await self._click(action)
                case ActionType.DOUBLE_CLICK:
                    res = await self._double_click(action)
                case ActionType.RIGHT_CLICK:
                    res = await self._right_click(action)
                case ActionType.MIDDLE_CLICK:
                    res = await self._middle_click(action)
                case ActionType.MOUSE_MOVE:
                    res = await self._mouse_move(action)
                case ActionType.MOUSE_DRAG:
                    res = await self._mouse_drag(action)
                case ActionType.MOUSE_SCROLL:
                    res = await self._mouse_scroll(action)
                case ActionType.TYPE_TEXT:
                    res = await self._type_text(action)
                case ActionType.CLIPBOARD_PASTE:
                    res = await self._clipboard_paste(action)
                case ActionType.KEY_PRESS:
                    res = await self._key_press(action)
                case ActionType.HOTKEY:
                    res = await self._hotkey(action)
                case ActionType.OPEN_APP:
                    res = await self._open_app(action)
                case ActionType.FOCUS_WINDOW:
                    res = await self._focus_window(action)
                case ActionType.SWITCH_WINDOW:
                    res = await self._switch_window(action)
                case ActionType.WINDOW_MINIMIZE:
                    res = await self._window_minimize(action)
                case ActionType.WINDOW_MAXIMIZE:
                    res = await self._window_maximize(action)
                case ActionType.WINDOW_CLOSE:
                    res = await self._window_close(action)
                case ActionType.WAIT:
                    await asyncio.sleep(max(0.1, min(action.seconds, 30.0)))
                    res = {"status": "waited", "seconds": action.seconds}
                case ActionType.INSPECT_SCREEN | ActionType.SCREENSHOT:
                    res = await self._screenshot(action)
                case ActionType.ASK_USER | ActionType.FINISH:
                    res = {"status": str(action.action_type)}
                case _:
                    res = {"status": "unsupported", "action": str(action.action_type)}

            elapsed = time.perf_counter() - start_time
            res["elapsed_seconds"] = round(elapsed, 3)
            res["success"] = True
            return res

        except Exception as err:
            log.exception("Failed executing action %s: %s", action.action_type, err)
            elapsed = time.perf_counter() - start_time
            return {
                "success": False,
                "error": str(err),
                "action": str(action.action_type),
                "elapsed_seconds": round(elapsed, 3),
            }

    # Backward-compatible convenience delegates
    async def _click(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_click(action, self._clamp_coordinates, self._smooth_mouse)

    async def _double_click(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_double_click(action, self._clamp_coordinates)

    async def _right_click(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_right_click(action, self._clamp_coordinates)

    async def _middle_click(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_middle_click(action, self._clamp_coordinates)

    async def _mouse_move(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_mouse_move(action, self._clamp_coordinates, self._smooth_mouse)

    async def _mouse_drag(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_mouse_drag(action, self._clamp_coordinates)

    async def _mouse_scroll(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_mouse_scroll(action, self._clamp_coordinates)

    async def _type_text(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_type_text(action)

    async def _key_press(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_key_press(action)

    async def _hotkey(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_hotkey(action)

    async def _clipboard_paste(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_clipboard_paste(action)

    async def _open_app(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_open_app(action)

    async def _bring_window_to_foreground(self, query: str) -> bool:
        return await bring_window_to_foreground(query)

    async def _focus_window(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_focus_window(action)

    async def _switch_window(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_switch_window(action)

    async def _window_minimize(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_window_minimize(action)

    async def _window_maximize(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_window_maximize(action)

    async def _window_close(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_window_close(action)

    async def _screenshot(self, action: ComputerAction) -> dict[str, Any]:
        return await execute_screenshot(action)
