"""
Low-Level Mouse Primitives for Computer-Use Agent.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any, Callable

from seyal_ai.agents.computer_use.protocol import ComputerAction
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.actions.mouse")

try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False

import importlib.util
HAS_PYWINAUTO = importlib.util.find_spec("pywinauto") is not None


async def execute_click(
    action: ComputerAction,
    clamp_fn: Callable[[int | None, int | None], tuple[int, int]],
    smooth_mouse: bool = False,
) -> dict[str, Any]:
    # Semantic UIA targeting (if element name is provided in action metadata or target_element_id)
    element_name = (action.metadata.get("element_name") if action.metadata else None) or action.target_element_id
    if element_name and HAS_PYWINAUTO:
        try:
            from pywinauto import Desktop
            uia_desktop = Desktop(backend="uia")
            elem = uia_desktop.window(title_re=f".*{re.escape(element_name)}.*")
            if elem.exists(timeout=0.3):
                await asyncio.to_thread(elem.click_input)
                return {"action": "click", "element_name": element_name, "semantic_uia": True}
        except Exception as uia_err:
            log.debug("Semantic UIA click fallback to coordinates: %s", uia_err)

    if action.x is not None and action.y is not None:
        cx, cy = clamp_fn(action.x, action.y)
        if HAS_PYAUTOGUI:
            duration = 0.2 if smooth_mouse else 0.0
            await asyncio.to_thread(pyautogui.click, x=cx, y=cy, clicks=action.clicks, duration=duration)
        return {"action": "click", "x": cx, "y": cy, "clicks": action.clicks}
    else:
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.click, clicks=action.clicks)
        return {"action": "click", "current_position": True}


async def execute_double_click(
    action: ComputerAction,
    clamp_fn: Callable[[int | None, int | None], tuple[int, int]],
) -> dict[str, Any]:
    if action.x is not None and action.y is not None:
        cx, cy = clamp_fn(action.x, action.y)
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.doubleClick, x=cx, y=cy)
        return {"action": "double_click", "x": cx, "y": cy}
    else:
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.doubleClick)
        return {"action": "double_click", "current_position": True}


async def execute_right_click(
    action: ComputerAction,
    clamp_fn: Callable[[int | None, int | None], tuple[int, int]],
) -> dict[str, Any]:
    if action.x is not None and action.y is not None:
        cx, cy = clamp_fn(action.x, action.y)
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.rightClick, x=cx, y=cy)
        return {"action": "right_click", "x": cx, "y": cy}
    else:
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.rightClick)
        return {"action": "right_click", "current_position": True}


async def execute_middle_click(
    action: ComputerAction,
    clamp_fn: Callable[[int | None, int | None], tuple[int, int]],
) -> dict[str, Any]:
    if action.x is not None and action.y is not None:
        cx, cy = clamp_fn(action.x, action.y)
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.middleClick, x=cx, y=cy)
        return {"action": "middle_click", "x": cx, "y": cy}
    else:
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.middleClick)
        return {"action": "middle_click", "current_position": True}


async def execute_mouse_move(
    action: ComputerAction,
    clamp_fn: Callable[[int | None, int | None], tuple[int, int]],
    smooth_mouse: bool = False,
) -> dict[str, Any]:
    cx, cy = clamp_fn(action.x, action.y)
    if HAS_PYAUTOGUI:
        duration = 0.2 if smooth_mouse else 0.0
        await asyncio.to_thread(pyautogui.moveTo, cx, cy, duration=duration)
    return {"action": "mouse_move", "x": cx, "y": cy}


async def execute_mouse_drag(
    action: ComputerAction,
    clamp_fn: Callable[[int | None, int | None], tuple[int, int]],
) -> dict[str, Any]:
    start_x, start_y = clamp_fn(action.x, action.y)
    end_x, end_y = clamp_fn(action.end_x, action.end_y)
    if HAS_PYAUTOGUI:
        await asyncio.to_thread(pyautogui.moveTo, start_x, start_y)
        await asyncio.to_thread(pyautogui.dragTo, end_x, end_y, duration=0.5, button="left")
    return {
        "action": "mouse_drag",
        "from": (start_x, start_y),
        "to": (end_x, end_y),
    }


async def execute_mouse_scroll(
    action: ComputerAction,
    clamp_fn: Callable[[int | None, int | None], tuple[int, int]],
) -> dict[str, Any]:
    amount = action.amount if action.direction.lower() in ("up", "top") else -action.amount
    if HAS_PYAUTOGUI:
        if action.x is not None and action.y is not None:
            cx, cy = clamp_fn(action.x, action.y)
            await asyncio.to_thread(pyautogui.scroll, amount * 120, x=cx, y=cy)
        else:
            await asyncio.to_thread(pyautogui.scroll, amount * 120)
    return {"action": "mouse_scroll", "direction": action.direction, "amount": action.amount}
