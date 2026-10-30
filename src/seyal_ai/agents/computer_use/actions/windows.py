"""
Windows Application Lifecycle, Window Focusing, and State Management Primitives.
"""

from __future__ import annotations

import asyncio
from typing import Any

from seyal_ai.agents.computer_use.protocol import ComputerAction
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.actions.windows")

try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


async def bring_window_to_foreground(query: str) -> bool:
    """Force bring a matching window to the top foreground without resizing/shrinking maximized windows."""
    def _force_front() -> bool:
        try:
            import ctypes
            import win32gui
            import win32process

            q = query.lower().strip()
            user32 = ctypes.windll.user32

            # Ensure thread is attached to interactive desktop
            try:
                hdesk_default = user32.OpenDesktopW("Default", 0, False, 0x01FF)
                if hdesk_default:
                    user32.SetThreadDesktop(hdesk_default)
            except Exception:
                pass

            matched_hwnds: list[int] = []

            def enum_cb(hwnd: int, _: Any) -> bool:
                if user32.IsWindowVisible(hwnd):
                    raw_t = win32gui.GetWindowText(hwnd) or ""
                    t = raw_t.lower().strip()
                    if not t:
                        return True  # Never match empty window titles
                    if q in t or (t and t in q):
                        matched_hwnds.append(hwnd)
                    elif ("camera" in q or "webcam" in q) and "camera" in t:
                        matched_hwnds.append(hwnd)
                return True

            win32gui.EnumWindows(enum_cb, None)

            # Fallback to pygetwindow if win32gui found none
            if not matched_hwnds:
                try:
                    import pygetwindow as gw
                    windows = gw.getAllWindows()
                    for w in windows:
                        w_title = (w.title or "").lower().strip()
                        if not w_title:
                            continue
                        if q in w_title or (w_title and w_title in q):
                            matched_hwnds.append(w._hWnd)
                        elif ("camera" in q or "webcam" in q) and "camera" in w_title:
                            matched_hwnds.append(w._hWnd)
                except Exception:
                    pass

            if matched_hwnds:
                hwnd = matched_hwnds[0]
                # Restore if minimized
                if user32.IsIconic(hwnd):
                    user32.ShowWindow(hwnd, 9)  # SW_RESTORE
                else:
                    user32.ShowWindow(hwnd, 5)  # SW_SHOW

                # Force HWND_TOPMOST then HWND_NOTOPMOST to punch through maximized Electron
                HWND_TOPMOST = -1
                HWND_NOTOPMOST = -2
                SWP_NOMOVE = 0x0002
                SWP_NOSIZE = 0x0001
                SWP_SHOWWINDOW = 0x0040

                user32.SetWindowPos(hwnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW)
                user32.BringWindowToTop(hwnd)
                user32.SetForegroundWindow(hwnd)
                user32.SetWindowPos(hwnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW)

                fore_hwnd = user32.GetForegroundWindow()
                if fore_hwnd and fore_hwnd != hwnd:
                    try:
                        fore_tid, _ = win32process.GetWindowThreadProcessId(fore_hwnd)
                        target_tid, _ = win32process.GetWindowThreadProcessId(hwnd)
                        if fore_tid != target_tid:
                            user32.AttachThreadInput(fore_tid, target_tid, True)
                            user32.BringWindowToTop(hwnd)
                            user32.SetForegroundWindow(hwnd)
                            user32.AttachThreadInput(fore_tid, target_tid, False)
                    except Exception:
                        pass

                # Simulate ALT key to bypass Windows SetForegroundWindow restrictions
                user32.keybd_event(0x12, 0, 0, 0)
                user32.SetForegroundWindow(hwnd)
                user32.keybd_event(0x12, 0, 2, 0)
                return True
        except Exception as e:
            log.debug("Foreground activation notice: %s", e)
        return False

    return await asyncio.to_thread(_force_front)


async def execute_open_app(action: ComputerAction) -> dict[str, Any]:
    """Directly launch a Windows application or executable by name or common alias."""
    import subprocess

    target = (action.app_name or action.text or "").strip().lower()
    if not target:
        return {"action": "open_app", "success": False, "error": "No app name provided"}

    app_map = {
        "notepad": "notepad.exe",
        "calc": "calc.exe",
        "calculator": "calc.exe",
        "chrome": "chrome.exe",
        "google chrome": "chrome.exe",
        "edge": "msedge.exe",
        "microsoft edge": "msedge.exe",
        "browser": "msedge.exe",
        "explorer": "explorer.exe",
        "file explorer": "explorer.exe",
        "files": "explorer.exe",
        "terminal": "powershell.exe",
        "powershell": "powershell.exe",
        "cmd": "cmd.exe",
        "command prompt": "cmd.exe",
        "vscode": "code",
        "vs code": "code",
        "code": "code",
        "task manager": "taskmgr.exe",
        "taskmgr": "taskmgr.exe",
        "settings": "ms-settings:",
        "battery saver": "ms-settings:batterysaver",
        "energy saver": "ms-settings:batterysaver",
        "battery": "ms-settings:batterysaver",
        "wifi": "ms-settings:network-wifi",
        "bluetooth": "ms-settings:bluetooth",
        "sound": "ms-settings:sound",
        "volume": "ms-settings:sound",
        "display": "ms-settings:display",
        "camera": "microsoft.windows.camera:",
        "webcam": "microsoft.windows.camera:",
        "photos": "ms-photos:",
        "paint": "mspaint.exe",
        "snipping tool": "snippingtool.exe",
        "word": "winword.exe",
        "excel": "excel.exe",
        "powerpoint": "powerpnt.exe",
        "spotify": "spotify.exe",
        "slack": "slack.exe",
        "discord": "discord.exe",
    }

    # 1. Direct Web Search / URL launch
    if target.startswith("http://") or target.startswith("https://") or target.startswith("www."):
        import webbrowser
        url = target if target.startswith("http") else f"https://{target}"
        webbrowser.open(url)
        await asyncio.sleep(0.3)
        return {"action": "open_app", "target": url, "success": True}

    # 2. Check App Map for Built-in Protocols & Fast Aliases first
    cmd = app_map.get(target)

    # 3. Explicit Web Search Intent
    import re
    search_match = re.match(
        r"^(?:google\s*search(?:\s*for)?|search\s*(?:the\s*web\s*for|on\s*google\s*for|for)?|web\s*search(?:\s*for)?)\s*(.*)$",
        target,
        flags=re.IGNORECASE,
    )
    if search_match and not cmd:
        import urllib.parse
        import webbrowser
        query = search_match.group(1).strip()
        if not query:
            url = "https://www.google.com"
        else:
            url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}"
        webbrowser.open(url)
        await asyncio.sleep(0.3)
        return {"action": "open_app", "target": url, "success": True}

    # 4. Dynamic Computer Awareness Search (Runtime Installed Apps on this Laptop)
    awareness_app = None
    t_clean = target.lower().strip()
    if not cmd:
        try:
            from seyal_ai.services.awareness import get_awareness_service
            awareness = get_awareness_service().get_cached_awareness()
            installed_apps = awareness.get("installed_apps", [])

            # Exact match first
            for app in installed_apps:
                aname = (app.get("name") or "").lower().strip()
                if t_clean == aname:
                    awareness_app = app
                    break

            # Substring match if exact match not found
            if not awareness_app:
                for app in installed_apps:
                    aname = (app.get("name") or "").lower().strip()
                    if any(h in aname for h in ["uninstall", "helper", "updater", "crashpad", "setup", "license", "help"]):
                        continue
                    if t_clean in aname or aname in t_clean:
                        awareness_app = app
                        break
        except Exception as aware_err:
            log.debug("Dynamic Computer Awareness lookup notice: %s", aware_err)

    try:
        import os
        if awareness_app:
            shortcut = awareness_app.get("shortcut_path")
            loc = awareness_app.get("install_location")
            aname = awareness_app.get("name") or target
            if shortcut and os.path.exists(shortcut):
                log.info("Launching '%s' via Computer Awareness shortcut: %s", aname, shortcut)
                os.startfile(shortcut)
                cmd = shortcut
            elif loc and os.path.isdir(loc):
                exe_found = None
                try:
                    for f in os.listdir(loc):
                        if f.lower().endswith(".exe") and t_clean in f.lower():
                            exe_found = os.path.join(loc, f)
                            break
                except Exception:
                    pass
                if exe_found:
                    log.info("Launching '%s' via Computer Awareness exe: %s", aname, exe_found)
                    subprocess.Popen(f'"{exe_found}"', shell=True)
                    cmd = exe_found
                else:
                    subprocess.Popen(aname, shell=True)
                    cmd = aname
            else:
                subprocess.Popen(aname, shell=True)
                cmd = aname
        elif cmd:
            if ":" in cmd and not cmd.endswith(".exe"):
                os.startfile(cmd)
            else:
                subprocess.Popen(cmd, shell=True)
        else:
            # Direct OS Shell Fallback
            cmd = target
            subprocess.Popen(cmd, shell=True)
        
        # Wait for app window to appear and bring it to foreground without shrinking
        brought = await bring_window_to_foreground(target)
        if not brought:
            for _ in range(8):
                await asyncio.sleep(0.2)
                brought = await bring_window_to_foreground(target)
                if brought:
                    break

        if HAS_PYAUTOGUI and target in ("camera", "webcam") and not brought:
            # UWP camera protocol helper: cycle if Windows system dialog holds focus
            try:
                pyautogui.hotkey("alt", "tab")
            except Exception:
                pass
            await asyncio.sleep(0.3)

        return {"action": "open_app", "target": cmd, "success": True}
    except Exception as err:
        log.warning("Could not launch app %s: %s", cmd, err)
        return {"action": "open_app", "target": cmd, "success": False, "error": str(err)}


async def execute_focus_window(action: ComputerAction) -> dict[str, Any]:
    """Focus an existing window by title match and bring to foreground."""
    target_title = (action.text or action.app_name or "").strip().lower()
    if not target_title:
        return {"action": "focus_window", "success": False}

    brought = await bring_window_to_foreground(target_title)
    if brought:
        return {"action": "focus_window", "target": target_title, "success": True}

    try:
        import pygetwindow as gw
        windows = gw.getAllWindows()
        matched = [w for w in windows if target_title in w.title.lower()]
        if matched:
            win = matched[0]
            if win.isMinimized:
                win.restore()
            win.activate()
            return {"action": "focus_window", "title": win.title, "success": True}
    except Exception as e:
        log.debug("Window focus notice: %s", e)

    return {"action": "focus_window", "target": target_title, "success": False}


async def execute_switch_window(action: ComputerAction) -> dict[str, Any]:
    """Switch window using Alt+Tab."""
    if HAS_PYAUTOGUI:
        await asyncio.to_thread(pyautogui.hotkey, "alt", "tab")
    return {"action": "switch_window", "success": True}


async def execute_window_minimize(action: ComputerAction) -> dict[str, Any]:
    """Minimize the active window or target window."""
    try:
        import pygetwindow as gw
        win = gw.getActiveWindow()
        if win:
            win.minimize()
            return {"action": "window_minimize", "title": win.title, "success": True}
    except Exception as e:
        log.debug("Window minimize notice: %s", e)
    if HAS_PYAUTOGUI:
        await asyncio.to_thread(pyautogui.hotkey, "win", "down")
    return {"action": "window_minimize", "success": True}


async def execute_window_maximize(action: ComputerAction) -> dict[str, Any]:
    """Maximize the active window or target window."""
    try:
        import pygetwindow as gw
        win = gw.getActiveWindow()
        if win:
            win.maximize()
            return {"action": "window_maximize", "title": win.title, "success": True}
    except Exception as e:
        log.debug("Window maximize notice: %s", e)
    if HAS_PYAUTOGUI:
        await asyncio.to_thread(pyautogui.hotkey, "win", "up")
    return {"action": "window_maximize", "success": True}


async def execute_window_close(action: ComputerAction) -> dict[str, Any]:
    """Close target application window or active window safely."""
    target_app = (action.app_name or action.text or "").strip().lower()

    # If a specific app was targeted (e.g. camera, notepad, chrome)
    if target_app:
        try:
            import pygetwindow as gw
            windows = gw.getAllWindows()
            matched = [w for w in windows if (target_app in w.title.lower() or w.title.lower() in target_app) and w.title.strip()]
            if matched:
                win = matched[0]
                # Focus first then close
                win.activate()
                await asyncio.sleep(0.2)
                win.close()
                return {"action": "window_close", "target": target_app, "title": win.title, "success": True}
        except Exception as e:
            log.debug("Targeted window close fallback: %s", e)

    # Active window close
    try:
        import pygetwindow as gw
        win = gw.getActiveWindow()
        if win:
            title = win.title.lower()
            # Safety protection: never close Seyal AI app unless explicitly forced
            if "seyal_ai" in title and not target_app:
                log.warning("Protected active Seyal AI window from accidental window_close.")
                return {"action": "window_close", "skipped": True, "reason": "Protected Seyal AI window"}
            win.close()
            return {"action": "window_close", "title": win.title, "success": True}
    except Exception as e:
        log.debug("Active window close notice: %s", e)

    if HAS_PYAUTOGUI:
        await asyncio.to_thread(pyautogui.hotkey, "alt", "f4")
    return {"action": "window_close", "success": True}


async def execute_screenshot(action: ComputerAction) -> dict[str, Any]:
    """Capture live screen state."""
    from seyal_ai.vision.capture import ScreenCaptureController
    cap = ScreenCaptureController()
    shot = await cap.capture()
    return {"action": "screenshot", "path": shot.image_path, "success": True}
