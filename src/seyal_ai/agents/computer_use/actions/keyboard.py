"""
Low-Level Keyboard Primitives and Clipboard Pasting for Computer-Use Agent.
"""

from __future__ import annotations

import asyncio
from typing import Any

from seyal_ai.agents.computer_use.protocol import ComputerAction
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.actions.keyboard")

try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


async def execute_clipboard_paste(action: ComputerAction) -> dict[str, Any]:
    """Paste text using system clipboard for rapid and 100% accurate multiline typing."""
    text = action.text or ""
    try:
        import pyperclip

        await asyncio.to_thread(pyperclip.copy, text)
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.hotkey, "ctrl", "v")
        return {"action": "clipboard_paste", "length": len(text), "success": True}
    except Exception as e:
        log.debug("Clipboard paste fallback to direct typing: %s", e)
        if HAS_PYAUTOGUI:
            await asyncio.to_thread(pyautogui.write, text, interval=0.01)
        return {"action": "clipboard_paste", "fallback_typed": True, "length": len(text)}


async def execute_type_text(action: ComputerAction) -> dict[str, Any]:
    text = action.text or ""
    # Unicode / Tamil / multilingual characters or multiline text cannot be typed by pyautogui.write
    has_unicode = any(ord(c) > 127 for c in text) or "\n" in text or "\r" in text
    if has_unicode:
        log.info("Detected Unicode/multilingual text in _type_text. Routing via clipboard paste for perfect fidelity.")
        return await execute_clipboard_paste(action)

    if HAS_PYAUTOGUI and text:
        try:
            # Fast type execution for standard ASCII
            await asyncio.to_thread(pyautogui.write, text, interval=0.005)
        except Exception as e:
            log.warning("Direct typing failed (%s), falling back to clipboard paste.", e)
            return await execute_clipboard_paste(action)
    return {"action": "type_text", "length": len(text)}


async def execute_key_press(action: ComputerAction) -> dict[str, Any]:
    key = (action.key or "").lower().strip()
    if HAS_PYAUTOGUI and key:
        key_map = {
            "spacebar": "space",
            "enter": "enter",
            "return": "enter",
            "esc": "escape",
            "prtscn": "printscreen",
            "printscreen": "printscreen",
            "volume_up": "volumeup",
            "volume_down": "volumedown",
            "volume_mute": "volumemute",
            "del": "delete",
            "plus": "+",
            "minus": "-",
        }
        norm_key = key_map.get(key, key)
        await asyncio.to_thread(pyautogui.press, norm_key)
    return {"action": "key_press", "key": key}


async def execute_hotkey(action: ComputerAction) -> dict[str, Any]:
    keys = action.keys or []
    if not keys and action.key:
        if action.key == "alt+=":
            keys = ["alt", "="]
        elif action.key in ("ctrl++", "ctrl+plus"):
            keys = ["ctrl", "+"]
        elif action.key in ("ctrl+-", "ctrl+minus"):
            keys = ["ctrl", "-"]
        elif action.key in ("win++", "win+plus"):
            keys = ["win", "+"]
        elif action.key in ("win+-", "win+minus"):
            keys = ["win", "-"]
        elif action.key in ("ctrl+shift+:", "ctrl+:"):
            keys = ["ctrl", "shift", ";"]
        elif action.key in ("ctrl+shift+>", "ctrl+>"):
            keys = ["ctrl", "shift", "."]
        elif action.key in ("ctrl+shift+<", "ctrl+<"):
            keys = ["ctrl", "shift", ","]
        else:
            keys = [k.strip() for k in action.key.split("+")]
    if HAS_PYAUTOGUI and keys:
        normalized_keys = []
        for k in keys:
            kl = k.lower()
            if kl in ("win", "windows", "super"):
                normalized_keys.append("win")
            elif kl in ("control", "ctrl"):
                normalized_keys.append("ctrl")
            elif kl in ("alternate", "alt"):
                normalized_keys.append("alt")
            elif kl in ("prtscn", "printscreen"):
                normalized_keys.append("printscreen")
            elif kl in ("del", "delete"):
                normalized_keys.append("delete")
            elif kl in ("esc", "escape"):
                normalized_keys.append("escape")
            elif kl == "plus":
                normalized_keys.append("+")
            elif kl == "minus":
                normalized_keys.append("-")
            elif kl == "volume_up":
                normalized_keys.append("volumeup")
            elif kl == "volume_down":
                normalized_keys.append("volumedown")
            elif kl == "volume_mute":
                normalized_keys.append("volumemute")
            elif kl == "spacebar":
                normalized_keys.append("space")
            else:
                normalized_keys.append(kl)
        await asyncio.to_thread(pyautogui.hotkey, *normalized_keys)
    return {"action": "hotkey", "keys": keys}
