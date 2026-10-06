"""
Seyal AI Universal Multilingual Shortcut-First Acceleration & Intent Registry.

Supports 100+ languages (English, Tamil, Tanglish, Hindi, Telugu, Malayalam, Spanish,
French, German, etc.) and arbitrary colloquial phrasing without relying on hardcoded
single-language keywords.

Two-Tier Architecture:
1. Tier 1 (0ms Heuristic Cache): Instant regex & multi-lingual keyword match.
2. Tier 2 (Universal Semantic Resolver): Powered by Gemini Flash to semantically
   map ANY phrasing in ANY language to the correct Windows shortcut or detect explicit
   mouse override requests.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import TYPE_CHECKING, Any

from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.utils.logging import get_logger

if TYPE_CHECKING:
    from seyal_ai.llm.router import ModelRouter

log = get_logger("agents.computer_use.shortcuts")

# Canonical Windows Shortcuts Map
CANONICAL_SHORTCUTS: dict[str, tuple[ActionType, str]] = {
    # System & Core Navigation
    "win": (ActionType.KEY_PRESS, "Open Windows Start Menu"),
    "win+e": (ActionType.HOTKEY, "Open Windows File Explorer"),
    "win+i": (ActionType.HOTKEY, "Open Windows Settings"),
    "win+a": (ActionType.HOTKEY, "Open Quick Settings / Toggles"),
    "win+r": (ActionType.HOTKEY, "Open Run Dialog"),
    "win+s": (ActionType.HOTKEY, "Search Windows"),
    "win+q": (ActionType.HOTKEY, "Search Windows"),
    "win+d": (ActionType.HOTKEY, "Show Desktop / Minimize All"),
    "win+l": (ActionType.HOTKEY, "Lock Computer"),
    "win+v": (ActionType.HOTKEY, "Open Clipboard History"),
    "win+.": (ActionType.HOTKEY, "Open Emoji Panel"),
    "win+;": (ActionType.HOTKEY, "Open Emoji Panel"),
    "win+,": (ActionType.HOTKEY, "Temporarily Peek at Desktop"),
    "win+m": (ActionType.HOTKEY, "Minimize All Windows"),
    "win+shift+m": (ActionType.HOTKEY, "Restore Minimized Windows"),
    "win+shift+s": (ActionType.HOTKEY, "Screen Snip / Snipping Tool"),
    "win+shift+r": (ActionType.HOTKEY, "Record Screen in Snipping Tool"),
    "win+x": (ActionType.HOTKEY, "Open Windows Quick Link Power User Menu"),
    "win+p": (ActionType.HOTKEY, "Open Project Display Menu"),
    "win+k": (ActionType.HOTKEY, "Open Cast and Connect Menu"),
    "win+h": (ActionType.HOTKEY, "Open Windows Voice Dictation"),
    "win+u": (ActionType.HOTKEY, "Open Windows Accessibility Settings"),
    "win+w": (ActionType.HOTKEY, "Open Windows Widgets Board"),
    "win+n": (ActionType.HOTKEY, "Open Notification Center and Calendar"),
    "win+c": (ActionType.HOTKEY, "Open Microsoft Teams Chat or Copilot"),
    "win+f": (ActionType.HOTKEY, "Open Feedback Hub"),
    "win+g": (ActionType.HOTKEY, "Open Xbox Game Bar and Gaming Overlay"),
    "win+alt+b": (ActionType.HOTKEY, "Toggle HDR Display Mode"),
    "win+alt+d": (ActionType.HOTKEY, "Show or Hide Date and Time on Taskbar"),
    "win+alt+r": (ActionType.HOTKEY, "Start or Stop Screen Recording with Game Bar"),
    "win+plus": (ActionType.HOTKEY, "Open Magnifier and Zoom In"),
    "win+minus": (ActionType.HOTKEY, "Magnifier Zoom Out"),
    "win+esc": (ActionType.HOTKEY, "Close Windows Magnifier"),
    "win+ctrl+shift+b": (ActionType.HOTKEY, "Restart Graphics Driver and Reset GPU"),
    "win+ctrl+enter": (ActionType.HOTKEY, "Turn Windows Narrator On or Off"),
    "win+ctrl+c": (ActionType.HOTKEY, "Turn Color Filters On or Off"),
    "win+t": (ActionType.HOTKEY, "Cycle Through Taskbar Apps"),
    "win+b": (ActionType.HOTKEY, "Focus Windows System Tray"),
    "win+pause": (ActionType.HOTKEY, "Open System About and Device Specifications"),
    "win+space": (ActionType.HOTKEY, "Switch Keyboard Input Language or Layout"),
    "win+shift+space": (ActionType.HOTKEY, "Switch to Previous Keyboard Input Language"),
    "prtscn": (ActionType.KEY_PRESS, "Take Full Screen Screenshot"),
    "win+prtscn": (ActionType.HOTKEY, "Capture Fullscreen and Auto-Save to Screenshots"),
    "alt+prtscn": (ActionType.HOTKEY, "Take Screenshot of Active Window"),
    "ctrl+esc": (ActionType.HOTKEY, "Open Windows Start Menu"),
    "ctrl+shift+esc": (ActionType.HOTKEY, "Open Task Manager"),
    "alt+f4": (ActionType.HOTKEY, "Close Window / Application"),
    "alt+tab": (ActionType.HOTKEY, "Switch Window"),
    "ctrl+alt+tab": (ActionType.HOTKEY, "Open Switcher View for All Open Windows"),
    "alt+esc": (ActionType.HOTKEY, "Cycle Through Windows in the Order Opened"),
    "alt+space": (ActionType.HOTKEY, "Open Window System Control Menu"),
    "alt+f8": (ActionType.HOTKEY, "Reveal Password on Sign-In Screen"),
    "alt+pageup": (ActionType.HOTKEY, "Move One Screen Up"),
    "alt+pagedown": (ActionType.HOTKEY, "Move One Screen Down"),
    "win+ctrl+q": (ActionType.HOTKEY, "Open Quick Assist"),
    "win+ctrl+v": (ActionType.HOTKEY, "Open Windows Volume Mixer and Audio Settings"),
    "win+ctrl+f": (ActionType.HOTKEY, "Search for Computers on Network"),
    "win+ctrl+space": (ActionType.HOTKEY, "Change to Previously Selected Input Language"),
    "win+alt+k": (ActionType.HOTKEY, "Toggle Microphone Mute in Calls"),
    "win+alt+h": (ActionType.HOTKEY, "Open Voice Access Help"),
    "win+o": (ActionType.HOTKEY, "Lock Device Screen Orientation"),
    "win+j": (ActionType.HOTKEY, "Focus Windows Suggestion or Tip"),
    "win+shift+v": (ActionType.HOTKEY, "Cycle Through Notifications in Reverse"),
    "win+shift+a": (ActionType.HOTKEY, "Focus First Notification in Action Center"),
    "win+shift+enter": (ActionType.HOTKEY, "Open Selected App with Administrative Privileges"),
    "ctrl+m": (ActionType.HOTKEY, "Toggle Command Prompt Mark Mode"),
    "ctrl+space": (ActionType.HOTKEY, "Toggle Input Method Editor or Control Selection"),

    # Taskbar Direct Slots
    "win+1": (ActionType.HOTKEY, "Open or Switch to 1st Pinned Taskbar App"),
    "win+2": (ActionType.HOTKEY, "Open or Switch to 2nd Pinned Taskbar App"),
    "win+3": (ActionType.HOTKEY, "Open or Switch to 3rd Pinned Taskbar App"),
    "win+4": (ActionType.HOTKEY, "Open or Switch to 4th Pinned Taskbar App"),
    "win+5": (ActionType.HOTKEY, "Open or Switch to 5th Pinned Taskbar App"),
    "win+6": (ActionType.HOTKEY, "Open or Switch to 6th Pinned Taskbar App"),
    "win+7": (ActionType.HOTKEY, "Open or Switch to 7th Pinned Taskbar App"),
    "win+8": (ActionType.HOTKEY, "Open or Switch to 8th Pinned Taskbar App"),
    "win+9": (ActionType.HOTKEY, "Open or Switch to 9th Pinned Taskbar App"),
    "win+shift+1": (ActionType.HOTKEY, "Open New Instance of 1st Taskbar App"),
    "win+shift+2": (ActionType.HOTKEY, "Open New Instance of 2nd Taskbar App"),
    "win+shift+3": (ActionType.HOTKEY, "Open New Instance of 3rd Taskbar App"),
    "win+shift+4": (ActionType.HOTKEY, "Open New Instance of 4th Taskbar App"),
    "win+shift+5": (ActionType.HOTKEY, "Open New Instance of 5th Taskbar App"),
    "win+shift+6": (ActionType.HOTKEY, "Open New Instance of 6th Taskbar App"),
    "win+shift+7": (ActionType.HOTKEY, "Open New Instance of 7th Taskbar App"),
    "win+shift+8": (ActionType.HOTKEY, "Open New Instance of 8th Taskbar App"),
    "win+shift+9": (ActionType.HOTKEY, "Open New Instance of 9th Taskbar App"),

    # Virtual Desktops & Window Snapping
    "win+tab": (ActionType.HOTKEY, "Open Task View and Virtual Desktops"),
    "win+ctrl+d": (ActionType.HOTKEY, "Create New Virtual Desktop"),
    "win+ctrl+right": (ActionType.HOTKEY, "Switch to Next Virtual Desktop"),
    "win+ctrl+left": (ActionType.HOTKEY, "Switch to Previous Virtual Desktop"),
    "win+ctrl+f4": (ActionType.HOTKEY, "Close Current Virtual Desktop"),
    "win+up": (ActionType.HOTKEY, "Maximize Current Window"),
    "win+down": (ActionType.HOTKEY, "Minimize or Restore Window"),
    "win+left": (ActionType.HOTKEY, "Snap Window to Left Half of Screen"),
    "win+right": (ActionType.HOTKEY, "Snap Window to Right Half of Screen"),
    "win+alt+up": (ActionType.HOTKEY, "Snap Active Window to Top Half of Screen"),
    "win+alt+down": (ActionType.HOTKEY, "Snap Active Window to Bottom Half of Screen"),
    "win+home": (ActionType.HOTKEY, "Minimize All Windows Except Active"),
    "win+shift+up": (ActionType.HOTKEY, "Stretch Active Window Vertically to Top and Bottom"),
    "win+shift+down": (ActionType.HOTKEY, "Restore or Minimize Vertically Stretched Window"),
    "win+shift+left": (ActionType.HOTKEY, "Move Window to Left Monitor"),
    "win+shift+right": (ActionType.HOTKEY, "Move Window to Right Monitor"),
    "win+z": (ActionType.HOTKEY, "Open Snap Layouts Menu"),

    # File Explorer & Document Management
    "ctrl+shift+n": (ActionType.HOTKEY, "Create New Folder in File Explorer or Incognito Window"),
    "ctrl+n": (ActionType.HOTKEY, "Open New Window"),
    "f2": (ActionType.KEY_PRESS, "Rename Selected File or Folder"),
    "alt+enter": (ActionType.HOTKEY, "Open Properties of Selected Item"),
    "alt+p": (ActionType.HOTKEY, "Toggle File Explorer Preview Pane"),
    "alt+shift+p": (ActionType.HOTKEY, "Toggle Details Pane in File Explorer"),
    "alt+up": (ActionType.HOTKEY, "Navigate Up to Parent Folder"),
    "alt+left": (ActionType.HOTKEY, "Navigate Back in History"),
    "alt+right": (ActionType.HOTKEY, "Navigate Forward in History"),
    "alt+d": (ActionType.HOTKEY, "Select and Focus Address Bar"),
    "ctrl+e": (ActionType.HOTKEY, "Focus Search Box"),
    "ctrl+shift+e": (ActionType.HOTKEY, "Expand All Folders in Navigation Tree"),
    "f11": (ActionType.KEY_PRESS, "Toggle Fullscreen Mode"),
    "f4": (ActionType.KEY_PRESS, "Open Address Bar Dropdown List"),
    "f3": (ActionType.KEY_PRESS, "Search in File Explorer or Web Page"),
    "f5": (ActionType.KEY_PRESS, "Refresh Active Window or Web Page"),
    "ctrl+f5": (ActionType.HOTKEY, "Hard Refresh Bypassing Cache"),
    "f6": (ActionType.KEY_PRESS, "Cycle Through Screen Elements in Active Window"),
    "f10": (ActionType.KEY_PRESS, "Activate Menu Bar in Active App"),
    "shift+f10": (ActionType.HOTKEY, "Open Context Menu or Right-Click Menu for Selected Item"),

    # Web Browser & Tab Management
    "ctrl+t": (ActionType.HOTKEY, "Open New Browser Tab"),
    "ctrl+w": (ActionType.HOTKEY, "Close Current Tab / Window"),
    "ctrl+f4": (ActionType.HOTKEY, "Close Current Tab / Document Window"),
    "ctrl+shift+t": (ActionType.HOTKEY, "Reopen Recently Closed Tab"),
    "ctrl+tab": (ActionType.HOTKEY, "Switch to Next Tab"),
    "ctrl+shift+tab": (ActionType.HOTKEY, "Switch to Previous Tab"),
    "ctrl+shift+pageup": (ActionType.HOTKEY, "Move Active Tab Left"),
    "ctrl+shift+pagedown": (ActionType.HOTKEY, "Move Active Tab Right"),
    "ctrl+shift+a": (ActionType.HOTKEY, "Search Open Tabs in Web Browser"),
    "ctrl+shift+w": (ActionType.HOTKEY, "Close All Tabs and Browser Window"),
    "ctrl+shift+del": (ActionType.HOTKEY, "Open Clear Browsing Data Dialog"),
    "ctrl+shift+o": (ActionType.HOTKEY, "Open Bookmark Manager"),
    "ctrl+shift+b": (ActionType.HOTKEY, "Toggle Bookmarks Bar Visibility"),
    "ctrl+shift+d": (ActionType.HOTKEY, "Bookmark All Open Tabs in New Folder"),
    "ctrl+k": (ActionType.HOTKEY, "Direct Search in Address Bar or Insert Link"),
    "alt+home": (ActionType.HOTKEY, "Open Browser Home Page"),
    "f12": (ActionType.KEY_PRESS, "Toggle Developer Tools and Inspect Element"),
    "ctrl+l": (ActionType.HOTKEY, "Focus Address / URL Bar"),
    "ctrl+r": (ActionType.HOTKEY, "Refresh Page"),
    "ctrl+shift+r": (ActionType.HOTKEY, "Hard Reload Page Bypassing Cache"),
    "ctrl+shift+g": (ActionType.HOTKEY, "Find Previous Match in Page"),
    "alt+f": (ActionType.HOTKEY, "Open Browser Menu"),
    "ctrl+h": (ActionType.HOTKEY, "Find and Replace or Open History"),
    "ctrl+j": (ActionType.HOTKEY, "Open Downloads"),
    "ctrl+d": (ActionType.HOTKEY, "Bookmark Page"),
    "ctrl+plus": (ActionType.HOTKEY, "Zoom In Page or Document"),
    "ctrl+minus": (ActionType.HOTKEY, "Zoom Out Page or Document"),
    "ctrl+0": (ActionType.HOTKEY, "Reset Page Zoom to 100%"),
    "ctrl+1": (ActionType.HOTKEY, "Switch to First Tab"),
    "ctrl+9": (ActionType.HOTKEY, "Switch to Last Tab"),

    # Editing, Formatting & Alignment
    "ctrl+a": (ActionType.HOTKEY, "Select All Content"),
    "ctrl+c": (ActionType.HOTKEY, "Copy Content"),
    "ctrl+insert": (ActionType.HOTKEY, "Copy Content"),
    "ctrl+x": (ActionType.HOTKEY, "Cut Content"),
    "ctrl+v": (ActionType.HOTKEY, "Paste Content"),
    "shift+insert": (ActionType.HOTKEY, "Paste Content"),
    "ctrl+shift+v": (ActionType.HOTKEY, "Paste as Plain Text"),
    "ctrl+s": (ActionType.HOTKEY, "Save Active Document / File"),
    "ctrl+shift+s": (ActionType.HOTKEY, "Save Document As New File"),
    "ctrl+o": (ActionType.HOTKEY, "Open File or Document Dialog"),
    "ctrl+z": (ActionType.HOTKEY, "Undo Action"),
    "ctrl+y": (ActionType.HOTKEY, "Redo Action"),
    "ctrl+f": (ActionType.HOTKEY, "Find in Page or Document"),
    "ctrl+p": (ActionType.HOTKEY, "Print Document or Save as PDF"),
    "ctrl+b": (ActionType.HOTKEY, "Format Text Bold or Toggle Sidebar"),
    "ctrl+i": (ActionType.HOTKEY, "Format Text Italic"),
    "ctrl+u": (ActionType.HOTKEY, "Format Text Underline or View Page Source"),
    "ctrl+e": (ActionType.HOTKEY, "Center Align Selected Text"),
    "ctrl+l": (ActionType.HOTKEY, "Left Align Selected Text"),
    "ctrl+r": (ActionType.HOTKEY, "Right Align Selected Text"),
    "ctrl+j": (ActionType.HOTKEY, "Justify Selected Text"),
    "ctrl+enter": (ActionType.HOTKEY, "Insert Page Break"),
    "f7": (ActionType.KEY_PRESS, "Run Spelling and Grammar Check"),
    "ctrl+backspace": (ActionType.HOTKEY, "Delete Previous Word"),
    "ctrl+delete": (ActionType.HOTKEY, "Delete Next Word"),
    "shift+delete": (ActionType.HOTKEY, "Permanently Delete Selected Item bypassing Recycle Bin"),
    "shift+f3": (ActionType.HOTKEY, "Cycle Text Case Between Upper Lower and Title"),
    "ctrl+shift+>": (ActionType.HOTKEY, "Increase Selected Text Font Size"),
    "ctrl+shift+<": (ActionType.HOTKEY, "Decrease Selected Text Font Size"),
    "ctrl+2": (ActionType.HOTKEY, "Set Double Line Spacing in Document"),
    "ctrl+5": (ActionType.HOTKEY, "Set 1.5 Line Spacing in Document"),
    "delete": (ActionType.KEY_PRESS, "Delete Selected Item to Recycle Bin"),

    # Excel & Spreadsheets
    "alt+=": (ActionType.HOTKEY, "Insert AutoSum Formula in Spreadsheet"),
    "shift+space": (ActionType.HOTKEY, "Select Entire Row in Spreadsheet"),
    "ctrl+space": (ActionType.HOTKEY, "Select Entire Column in Spreadsheet"),
    "ctrl+shift+%": (ActionType.HOTKEY, "Format Cells as Percentage"),
    "ctrl+;": (ActionType.HOTKEY, "Insert Current Date in Spreadsheet"),
    "ctrl+shift+:": (ActionType.HOTKEY, "Insert Current Time in Spreadsheet"),
    "ctrl+shift+l": (ActionType.HOTKEY, "Toggle AutoFilter in Spreadsheet"),
    "ctrl+pageup": (ActionType.HOTKEY, "Switch to Previous Sheet or Tab"),
    "ctrl+pagedown": (ActionType.HOTKEY, "Switch to Next Sheet or Tab"),

    # Developer & VS Code Workflows
    "ctrl+`": (ActionType.HOTKEY, "Toggle Integrated Terminal"),
    "ctrl+shift+p": (ActionType.HOTKEY, "Open Command Palette"),
    "f1": (ActionType.KEY_PRESS, "Open Command Palette"),
    "ctrl+/": (ActionType.HOTKEY, "Toggle Line Comment in Code"),
    "ctrl+shift+f": (ActionType.HOTKEY, "Global Search Across Files"),
    "ctrl+g": (ActionType.HOTKEY, "Go to Line Number"),
    "alt+down": (ActionType.HOTKEY, "Move Selected Line Down"),
    "shift+alt+up": (ActionType.HOTKEY, "Duplicate Selected Line Up"),
    "shift+alt+down": (ActionType.HOTKEY, "Duplicate Selected Line Down"),
    "ctrl+shift+k": (ActionType.HOTKEY, "Delete Entire Current Line in Code Editor"),
    "alt+z": (ActionType.HOTKEY, "Toggle Word Wrap in Code Editor"),
    "ctrl+shift+x": (ActionType.HOTKEY, "Open Extensions Panel in Code Editor"),
    "f9": (ActionType.KEY_PRESS, "Toggle Breakpoint on Active Line"),
    "alt+shift+d": (ActionType.HOTKEY, "Split Active Terminal Pane"),

    # Presentation & Slideshow Controls
    "shift+f5": (ActionType.HOTKEY, "Start Presentation Slideshow from Current Slide"),
    "n": (ActionType.KEY_PRESS, "Advance to Next Slide in Presentation"),
    "p": (ActionType.KEY_PRESS, "Return to Previous Slide in Presentation"),

    # Cursor Navigation & Text Selection
    "ctrl+left": (ActionType.HOTKEY, "Move Cursor Left by Word"),
    "ctrl+right": (ActionType.HOTKEY, "Move Cursor Right by Word"),
    "ctrl+up": (ActionType.HOTKEY, "Move Cursor Up by Paragraph"),
    "ctrl+down": (ActionType.HOTKEY, "Move Cursor Down by Paragraph"),
    "ctrl+home": (ActionType.HOTKEY, "Move Cursor to Beginning of Document"),
    "ctrl+end": (ActionType.HOTKEY, "Move Cursor to End of Document"),
    "shift+left": (ActionType.HOTKEY, "Select Character to Left"),
    "shift+right": (ActionType.HOTKEY, "Select Character to Right"),
    "shift+up": (ActionType.HOTKEY, "Select Line Above"),
    "shift+down": (ActionType.HOTKEY, "Select Line Below"),
    "shift+home": (ActionType.HOTKEY, "Select to Beginning of Line"),
    "shift+end": (ActionType.HOTKEY, "Select to End of Line"),
    "ctrl+shift+left": (ActionType.HOTKEY, "Select Word to Left"),
    "ctrl+shift+right": (ActionType.HOTKEY, "Select Word to Right"),
    "ctrl+shift+up": (ActionType.HOTKEY, "Select Paragraph Up"),
    "ctrl+shift+down": (ActionType.HOTKEY, "Select Paragraph Down"),
    "ctrl+shift+home": (ActionType.HOTKEY, "Select to Beginning of Document"),
    "ctrl+shift+end": (ActionType.HOTKEY, "Select to End of Document"),
    "shift+pageup": (ActionType.HOTKEY, "Select Screen Up"),
    "shift+pagedown": (ActionType.HOTKEY, "Select Screen Down"),

    # Media, Audio & Video Controls
    "volume_up": (ActionType.KEY_PRESS, "Increase Audio Volume"),
    "volume_down": (ActionType.KEY_PRESS, "Decrease Audio Volume"),
    "volume_mute": (ActionType.KEY_PRESS, "Mute or Unmute Audio"),
    "playpause": (ActionType.KEY_PRESS, "Play or Pause Media Playback"),
    "nexttrack": (ActionType.KEY_PRESS, "Skip to Next Track"),
    "prevtrack": (ActionType.KEY_PRESS, "Go to Previous Track"),
    "shift+.": (ActionType.HOTKEY, "Increase Video Playback Speed"),
    "shift+,": (ActionType.HOTKEY, "Decrease Video Playback Speed"),
    "c": (ActionType.KEY_PRESS, "Toggle Subtitles and Closed Captions in Video"),
    "j": (ActionType.KEY_PRESS, "Rewind Video by 10 Seconds"),
    "l": (ActionType.KEY_PRESS, "Fast Forward Video by 10 Seconds"),
    "m": (ActionType.KEY_PRESS, "Toggle Mute in Video or Audio"),
    "f": (ActionType.KEY_PRESS, "Toggle Video Fullscreen"),
    "k": (ActionType.KEY_PRESS, "Play or Pause Video"),
    "t": (ActionType.KEY_PRESS, "Toggle Theater Mode in Video Player"),
    "i": (ActionType.KEY_PRESS, "Toggle Miniplayer in Video Player"),
    "0": (ActionType.KEY_PRESS, "Restart Video from Beginning"),

    # System & Layout Shortcuts
    "win+ctrl+o": (ActionType.HOTKEY, "Open On-Screen Keyboard"),
    "ctrl+shift+6": (ActionType.HOTKEY, "Switch File Explorer to Details View"),
    "ctrl+shift+2": (ActionType.HOTKEY, "Switch File Explorer to Large Icons View"),

    # General Controls & Navigation
    "space": (ActionType.KEY_PRESS, "Trigger Button or Camera Shutter"),
    "enter": (ActionType.KEY_PRESS, "Confirm Selection or Open File"),
    "esc": (ActionType.KEY_PRESS, "Cancel Action or Close Dialog"),
    "tab": (ActionType.KEY_PRESS, "Move Keyboard Focus to Next Control"),
    "shift+tab": (ActionType.HOTKEY, "Move Keyboard Focus to Previous Control"),
    "backspace": (ActionType.KEY_PRESS, "Delete Character or Navigate Back"),
    "pageup": (ActionType.KEY_PRESS, "Scroll Page Up"),
    "pagedown": (ActionType.KEY_PRESS, "Scroll Page Down"),
    "home": (ActionType.KEY_PRESS, "Move Cursor to Beginning of Line"),
    "end": (ActionType.KEY_PRESS, "Move Cursor to End of Line"),
    "up": (ActionType.KEY_PRESS, "Navigate Up"),
    "down": (ActionType.KEY_PRESS, "Navigate Down"),
    "left": (ActionType.KEY_PRESS, "Navigate Left"),
    "right": (ActionType.KEY_PRESS, "Navigate Right"),
    "/": (ActionType.KEY_PRESS, "Focus Search Input in Web Applications"),

    # Online Meetings & Communication (Zoom, Teams, Meet)
    "alt+a": (ActionType.HOTKEY, "Toggle Audio or Mute in Zoom"),
    "alt+v": (ActionType.HOTKEY, "Toggle Video Camera in Zoom"),
    "alt+s": (ActionType.HOTKEY, "Toggle Screen Share in Zoom"),
    "alt+y": (ActionType.HOTKEY, "Raise or Lower Hand in Meeting"),
    "ctrl+shift+m": (ActionType.HOTKEY, "Toggle Microphone Mute in Teams"),

    # Webmail & Application Preferences
    "ctrl+,": (ActionType.HOTKEY, "Open Application Preferences or Settings"),
    "e": (ActionType.KEY_PRESS, "Archive Selected Email in Webmail"),
    "r": (ActionType.KEY_PRESS, "Reply to Active Email in Webmail"),
    "a": (ActionType.KEY_PRESS, "Reply All to Active Email in Webmail"),
}

# Multi-lingual explicit mouse patterns (English, Tanglish, Tamil, Hindi, Spanish, etc.)
EXPLICIT_MOUSE_PATTERNS = [
    r"\bmouse\b",
    r"\bcursor\b",
    r"\bpointer\b",
    r"\bmouse\s*(vechu|use|vachu|vechi|aal|se|le|se)\b",
    r"\buse\s*mouse\b",
    r"\bmove\s*(the\s*)?(mouse|cursor)\b",
    r"\bclick\s*with\s*(the\s*)?mouse\b",
    r"\bdrag\s*(the\s*)?mouse\b",
    r"\brat[oó]n\b",
    r"\bsouris\b",
    r"மவுஸ்",
    r"கர்சர்",
    r"சுட்டி",
    r"माउस",
    r"कर्सर",
]

# Fast multi-lingual regex cache for Tier 1 0ms matching
FAST_CACHE: list[tuple[re.Pattern[str], str]] = [
    # Start Menu
    (re.compile(r"(start\s*menu|open\s*start|start\s*open|மெனு\s*திற)", re.I), "win"),
    # Select all: English, Tanglish, Tamil, Hindi, French, Spanish
    (re.compile(r"(select\s*all|full\s*select|ellathaiyum\s*select|sara\s*select|sab\s*kuch\s*select|அனைத்தையும்\s*தேர்ந்தெடு|tout\s*sélectionner|seleccionar\s*todo)", re.I), "ctrl+a"),
    # New Tab
    (re.compile(r"(new\s*tab|open\s*tab|tab\s*open|puthu\s*tab|naya\s*tab|nouvel\s*onglet|nueva\s*pestaña|புதிய\s*தத்தல்)", re.I), "ctrl+t"),
    # Close Tab
    (re.compile(r"(close\s*tab|tab\s*close|tab\s*moodu|tab\s*band\s*karo|fermer\s*l'onglet|cerrar\s*pestaña|தத்தலை\s*மூடு)", re.I), "ctrl+w"),
    # Next / Previous Tab
    (re.compile(r"(next\s*tab|switch\s*tab|adutha\s*tab|agla\s*tab|onglet\s*suivant|siguiente\s*pestaña|அடுத்த\s*தத்தல்)", re.I), "ctrl+tab"),
    (re.compile(r"(previous\s*tab|prev\s*tab|munnadi\s*tab|pichla\s*tab|onglet\s*précédent|pestaña\s*anterior|முந்தைய\s*தத்தல்)", re.I), "ctrl+shift+tab"),
    # Move Tab Left / Right
    (re.compile(r"(move\s*tab\s*left|tab\s*left|idathu\s*pakkam\s*move\s*pannu)", re.I), "ctrl+shift+pageup"),
    (re.compile(r"(move\s*tab\s*right|tab\s*right|valathu\s*pakkam\s*move\s*pannu)", re.I), "ctrl+shift+pagedown"),
    # Focus Tab Navigation
    (re.compile(r"(shift\s*tab|previous\s*field|munnadi\s*field|back\s*field)", re.I), "shift+tab"),
    (re.compile(r"(^tab$|tab\s*(key|adi|press|pannu)|next\s*field|adutha\s*field|forward\s*field)", re.I), "tab"),
    # Reopen closed tab
    (re.compile(r"(reopen\s*closed\s*tab|restore\s*tab|moodiya\s*tab)", re.I), "ctrl+shift+t"),
    # Print / Save as PDF
    (re.compile(r"(print\s*page|print\s*document|save\s*as\s*pdf|print\s*pannu|imprimer|imprimir|அச்சிடு)", re.I), "ctrl+p"),
    # Save & Open
    (re.compile(r"(save\s*as|save\s*all|வேறு\s*பெயரில்\s*சேமி)", re.I), "ctrl+shift+s"),
    (re.compile(r"(\bsave\b|save\s*pannu|save\s*it|save\s*karo|sauvegarder|guardar|சேமி)", re.I), "ctrl+s"),
    (re.compile(r"(open\s*file|open\s*document|file\s*open\s*pannu|கோப்பைத்\s*திற)", re.I), "ctrl+o"),
    # Copy
    (re.compile(r"(\bcopy\b|copy\s*pannu|copy\s*it|copy\s*karo|copier|copiar|நகலெடு)", re.I), "ctrl+c"),
    # Paste
    (re.compile(r"(\bpaste\b|paste\s*pannu|paste\s*it|paste\s*karo|coller|pegar|ஒட்டு)", re.I), "ctrl+v"),
    (re.compile(r"(paste\s*plain\s*text|plain\s*text\s*paste|unformatted\s*paste)", re.I), "ctrl+shift+v"),
    # Undo / Redo
    (re.compile(r"(\bundo\b|undo\s*pannu|annuler|deshacer|செயல்தவிர்)", re.I), "ctrl+z"),
    (re.compile(r"(\bredo\b|redo\s*pannu|rétablir|rehacer|மீண்டும்\s*செய்)", re.I), "ctrl+y"),
    # Bold / Italic / Underline
    (re.compile(r"(make\s*bold|bold\s*text|bold\s*pannu|தடிமனாக்கு)", re.I), "ctrl+b"),
    (re.compile(r"(make\s*italic|italic\s*text|italic\s*pannu|சாய்வெழுத்து)", re.I), "ctrl+i"),
    (re.compile(r"(make\s*underline|underline\s*text|underline\s*pannu|அடிக்கோடிடு)", re.I), "ctrl+u"),
    (re.compile(r"(view\s*source|page\s*source|view\s*page\s*source|html\s*source)", re.I), "ctrl+u"),
    (re.compile(r"(increase\s*font\s*size|font\s*perusaaku|font\s*size\s*increase|பெரிய\s*எழுத்துரு)", re.I), "ctrl+shift+>"),
    (re.compile(r"(decrease\s*font\s*size|font\s*chinnathaaku|font\s*size\s*decrease|சிறிய\s*எழுத்துரு)", re.I), "ctrl+shift+<"),
    (re.compile(r"(double\s*line\s*spacing|double\s*spacing)", re.I), "ctrl+2"),
    (re.compile(r"(1\.5\s*line\s*spacing|one\s*and\s*half\s*spacing)", re.I), "ctrl+5"),
    # Delete / Word Delete / Permanent Delete
    (re.compile(r"(permanent\s*delete|permanently\s*delete|shift\s*delete|முழுமையாக\s*நீக்கு)", re.I), "shift+delete"),
    (re.compile(r"(delete\s*line|line\s*delete\s*pannu|remove\s*line|வரியை\s*நீக்கு)", re.I), "ctrl+shift+k"),
    (re.compile(r"(delete\s*word|delete\s*previous\s*word|oru\s*word\s*delete)", re.I), "ctrl+backspace"),
    (re.compile(r"(\bdelete\b|delete\s*pannu|delete\s*it|நீக்கு)", re.I), "delete"),
    # New Folder
    (re.compile(r"(new\s*folder|create\s*folder|puthu\s*folder|folder\s*create|naya\s*folder|nouveau\s*dossier|nueva\s*carpeta|புதிய\s*கோப்புறை)", re.I), "ctrl+shift+n"),
    # Rename
    (re.compile(r"(\brename\b|rename\s*pannu|pera\s*maathu|naam\s*badlo|renommer|renombrar|பெயர்\s*மாற்று)", re.I), "f2"),
    # Refresh / Hard Refresh
    (re.compile(r"(hard\s*reload|bypass\s*cache\s*reload|reload\s*without\s*cache)", re.I), "ctrl+shift+r"),
    (re.compile(r"(hard\s*refresh|force\s*reload|clear\s*cache\s*reload)", re.I), "ctrl+f5"),
    (re.compile(r"(refresh\s*page|reload\s*page|page\s*refresh|refresh\s*pannu|actualiser|recargar|புதுப்பி)", re.I), "ctrl+r"),
    # Window Maximize / Minimize / Snap
    (re.compile(r"(maximize\s*window|maximize\s*screen|maximize\s*pannu|perusaaku|perusu\s*pannu|agrandir\s*la\s*fenêtre|maximizar\s*ventana|பெரிதாக்கு)", re.I), "win+up"),
    (re.compile(r"(minimize\s*window|minimize\s*pannu|chinnathaaku|chota\s*karo|réduire\s*la\s*fenêtre|minimizar\s*ventana|சிறிதாக்கு)", re.I), "win+down"),
    (re.compile(r"(snap\s*left|left\s*snap|left\s*side\s*vai|bayen\s*snap|ajustar\s*a\s*la\s*izquierda|இடதுபுறம்\s*பொருத்து)", re.I), "win+left"),
    (re.compile(r"(snap\s*right|right\s*snap|right\s*side\s*vai|dayen\s*snap|ajustar\s*a\s*la\s*derecha|வலதுபுறம்\s*பொருத்து)", re.I), "win+right"),
    # Fullscreen
    (re.compile(r"(full\s*screen|toggle\s*fullscreen|muzhu\s*thirai|plein\s*écran|pantalla\s*completa|முழுத்திரை)", re.I), "f11"),
    # Virtual Desktops
    (re.compile(r"(new\s*virtual\s*desktop|create\s*desktop|puthu\s*desktop|naya\s*desktop|புதிய\s*மெய்நிகர்\s*டெஸ்க்டாப்)", re.I), "win+ctrl+d"),
    (re.compile(r"(next\s*desktop|switch\s*desktop|adutha\s*desktop|agla\s*desktop|அடுத்த\s*டெஸ்க்டாப்)", re.I), "win+ctrl+right"),
    (re.compile(r"(close\s*desktop|desktop\s*moodu|desktop\s*band\s*karo|டெஸ்க்டாப்பை\s*மூடு)", re.I), "win+ctrl+f4"),
    (re.compile(r"(task\s*view|all\s*windows\s*view|running\s*apps\s*view|open\s*task\s*view|பணிப்\s*பார்வை)", re.I), "win+tab"),
    # Properties & Navigation
    (re.compile(r"(\bproperties\b|file\s*properties|item\s*properties|propriétés|propiedades|பண்புகள்)", re.I), "alt+enter"),
    (re.compile(r"(parent\s*folder|up\s*one\s*folder|folder\s*mela\s*po|go\s*to\s*parent|மேல்\s*கோப்புறை)", re.I), "alt+up"),
    # Zoom
    (re.compile(r"(zoom\s*in|perusa\s*kaatu|zoom\s*pannu|agrandir\s*zoom|ampliar\s*zoom)", re.I), "ctrl+plus"),
    (re.compile(r"(zoom\s*out|chinnatha\s*kaatu|dézoomer|alejar\s*zoom)", re.I), "ctrl+minus"),
    (re.compile(r"(reset\s*zoom|normal\s*zoom|default\s*zoom|actual\s*size)", re.I), "ctrl+0"),
    # Audio & Media Controls
    (re.compile(r"(mute\s*sound|unmute\s*sound|mute\s*audio|sound\s*mute|சத்தத்தை\s*நிறுத்து)", re.I), "volume_mute"),
    (re.compile(r"(volume\s*up|sound\s*increase|sound\s*ethu|increase\s*volume|சத்தத்தை\s*அதிகரி)", re.I), "volume_up"),
    (re.compile(r"(volume\s*down|sound\s*decrease|sound\s*kammi\s*pannu|decrease\s*volume|சத்தத்தை\s*குறை)", re.I), "volume_down"),
    (re.compile(r"(pause\s*music|pause\s*video|play\s*music|play\s*pause|பாடலை\s*நிறுத்து)", re.I), "playpause"),
    (re.compile(r"(next\s*song|next\s*track|adutha\s*paattu|agla\s*gana|அடுத்த\s*பாடல்)", re.I), "nexttrack"),
    (re.compile(r"(previous\s*song|prev\s*track|munnadi\s*paattu|pichla\s*gana|முந்தைய\s*பாடல்)", re.I), "prevtrack"),
    # Screen Recording & Screenshots
    (re.compile(r"(take\s*screenshot|capture\s*screen|screenshot\s*edu|திரைப்பிடிப்பு\s*எடு|स्क्रीनशॉट\s*लो)", re.I), "win+shift+s"),
    (re.compile(r"(full\s*screenshot|save\s*screenshot|print\s*screen)", re.I), "win+prtscn"),
    (re.compile(r"(screen\s*record|record\s*screen|screen\s*recording\s*start|திரை\s*பதிவு)", re.I), "win+alt+r"),
    (re.compile(r"(game\s*bar|xbox\s*bar|gaming\s*overlay)", re.I), "win+g"),
    # GPU & Recovery
    (re.compile(r"(gpu\s*reset|graphics\s*driver\s*restart|restart\s*graphics|screen\s*freeze\s*fix|reset\s*gpu|display\s*driver\s*reset)", re.I), "win+ctrl+shift+b"),
    # Hardware & Tools
    (re.compile(r"(voice\s*dictation|speech\s*typing|voice\s*typing|kural\s*vazhi\s*ezhuthu|குரல்\s*தட்டச்சு)", re.I), "win+h"),
    (re.compile(r"(winx\s*menu|power\s*menu|power\s*user\s*menu|quick\s*link\s*menu)", re.I), "win+x"),
    (re.compile(r"(project\s*display|project\s*screen|extend\s*display|duplicate\s*display|second\s*screen)", re.I), "win+p"),
    (re.compile(r"(cast\s*screen|connect\s*display|wireless\s*display|connect\s*screen)", re.I), "win+k"),
    (re.compile(r"(toggle\s*hdr|hdr\s*toggle|turn\s*on\s*hdr|turn\s*off\s*hdr)", re.I), "win+alt+b"),
    (re.compile(r"(widgets\s*board|open\s*widgets|widgets\s*panel|weather\s*widget)", re.I), "win+w"),
    (re.compile(r"(notification\s*center|open\s*notifications|calendar\s*popup|அறிவிப்புகள்)", re.I), "win+n"),
    (re.compile(r"(clear\s*browsing\s*data|clear\s*history\s*dialog|clear\s*cache)", re.I), "ctrl+shift+del"),
    (re.compile(r"(search\s*tabs|tab\s*search|find\s*tab)", re.I), "ctrl+shift+a"),
    (re.compile(r"(context\s*menu|right\s*click\s*menu|options\s*menu)", re.I), "shift+f10"),
    (re.compile(r"(open\s*narrator|screen\s*reader|narrator\s*on)", re.I), "win+ctrl+enter"),
    # Video & Media Pro
    (re.compile(r"(increase\s*video\s*speed|video\s*speed\s*up|speed\s*ethu|speed\s*aaku)", re.I), "shift+."),
    (re.compile(r"(decrease\s*video\s*speed|video\s*slow\s*down|slow\s*pannu)", re.I), "shift+,"),
    (re.compile(r"(toggle\s*subtitles|subtitles\s*on|subtitles\s*off|captions\s*on|captions\s*off|துணைத்தலைப்பு)", re.I), "c"),
    (re.compile(r"(rewind\s*10\s*s|10\s*seconds\s*back|10\s*sec\s*rewind|pinnadi\s*po)", re.I), "j"),
    (re.compile(r"(forward\s*10\s*s|10\s*seconds\s*forward|10\s*sec\s*forward|munnadi\s*po)", re.I), "l"),
    (re.compile(r"(theater\s*mode|theatre\s*mode|cinema\s*mode)", re.I), "t"),
    (re.compile(r"(miniplayer|picture\s*in\s*picture|pip\s*mode)", re.I), "i"),
    (re.compile(r"(restart\s*video|start\s*from\s*beginning|video\s*mothala\s*irunthu|mothala\s*irunthu)", re.I), "0"),
    (re.compile(r"(youtube\s*play|youtube\s*pause|video\s*pause|video\s*play)", re.I), "k"),
    # Browser Pro
    (re.compile(r"(bookmarks\s*bar|show\s*bookmarks|hide\s*bookmarks|toggle\s*bookmarks)", re.I), "ctrl+shift+b"),
    (re.compile(r"(bookmark\s*all\s*tabs|save\s*all\s*tabs)", re.I), "ctrl+shift+d"),
    (re.compile(r"(developer\s*tools|open\s*devtools|inspect\s*element)", re.I), "f12"),
    (re.compile(r"(browser\s*menu|chrome\s*menu|edge\s*menu|3\s*dots\s*menu|three\s*dots\s*menu)", re.I), "alt+f"),
    (re.compile(r"(find\s*previous|previous\s*match|munnadi\s*thedu|munnadi\s*match)", re.I), "ctrl+shift+g"),
    (re.compile(r"(search\s*bar\s*ku\s*po|focus\s*search\s*bar|focus\s*search\s*box|slash\s*search)", re.I), "/"),
    # Document Formatting & Alignment
    (re.compile(r"(find\s*(and|_)?\s*replace|replace\s*text|replace\s*pannu)", re.I), "ctrl+h"),
    (re.compile(r"(center\s*align|align\s*center|naduvula\s*vai)", re.I), "ctrl+e"),
    (re.compile(r"(left\s*align|align\s*left)", re.I), "ctrl+l"),
    (re.compile(r"(right\s*align|align\s*right)", re.I), "ctrl+r"),
    (re.compile(r"(spell\s*check|check\s*spelling|grammar\s*check)", re.I), "f7"),
    (re.compile(r"(change\s*case|uppercase|lowercase|title\s*case|case\s*maathu|எழுத்து\s*வடிவம்)", re.I), "shift+f3"),
    (re.compile(r"(insert\s*hyperlink|insert\s*link|add\s*link|link\s*podu|இணைப்பை\s*சேர்)", re.I), "ctrl+k"),
    # Developer & VS Code
    (re.compile(r"(toggle\s*terminal|open\s*terminal|terminal\s*open|terminal\s*moodu)", re.I), "ctrl+`"),
    (re.compile(r"(command\s*palette|open\s*command\s*palette)", re.I), "ctrl+shift+p"),
    (re.compile(r"(open\s*extensions|vs\s*code\s*extensions|extensions\s*panel)", re.I), "ctrl+shift+x"),
    (re.compile(r"(split\s*terminal|split\s*pane)", re.I), "alt+shift+d"),
    (re.compile(r"(toggle\s*breakpoint|set\s*breakpoint|remove\s*breakpoint)", re.I), "f9"),
    (re.compile(r"(comment\s*code|comment\s*line|comment\s*pannu|uncomment)", re.I), "ctrl+/"),
    # Presentation & Slideshow
    (re.compile(r"(slideshow\s*from\s*current\s*slide|current\s*slide\s*slideshow)", re.I), "shift+f5"),
    (re.compile(r"(next\s*slide|adutha\s*slide|அடுத்த\s*ஸ்லைடு)", re.I), "n"),
    (re.compile(r"(previous\s*slide|prev\s*slide|munnadi\s*slide|முந்தைய\s*ஸ்லைடு)", re.I), "p"),
    # Meetings & Communication
    (re.compile(r"(zoom\s*mute|mute\s*audio\s*zoom|audio\s*toggle\s*zoom|zoom\s*audio)", re.I), "alt+a"),
    (re.compile(r"(teams\s*mute|mute\s*mic\s*teams|teams\s*mic|mic\s*mute)", re.I), "ctrl+shift+m"),
    (re.compile(r"(zoom\s*video|camera\s*off\s*zoom|video\s*toggle\s*zoom|zoom\s*camera)", re.I), "alt+v"),
    (re.compile(r"(zoom\s*share\s*screen|zoom\s*screen\s*share)", re.I), "alt+s"),
    (re.compile(r"(raise\s*hand|lower\s*hand|kaiya\s*thooku|கையை\s*உயர்த்து)", re.I), "alt+y"),
    (re.compile(r"(open\s*preferences|app\s*preferences|app\s*settings|application\s*settings)", re.I), "ctrl+,"),
    (re.compile(r"(archive\s*email|archive\s*mail|archive\s*pannu)", re.I), "e"),
    (re.compile(r"(reply\s*all|reply\s*all\s*mail|reply\s*all\s*email)", re.I), "a"),
    (re.compile(r"(reply\s*email|reply\s*mail|reply\s*pannu)", re.I), "r"),
    # Windows Tools & Layouts
    (re.compile(r"(on\s*screen\s*keyboard|screen\s*keyboard|virtual\s*keyboard)", re.I), "win+ctrl+o"),
    (re.compile(r"(details\s*view|list\s*view\s*kaami|file\s*details\s*view)", re.I), "ctrl+shift+6"),
    # Excel & Spreadsheets
    (re.compile(r"(auto\s*sum|autosum|total\s*podu|kootu\s*thogai|somme\s*automatique)", re.I), "alt+="),
    (re.compile(r"(select\s*row|select\s*entire\s*row|row\s*select\s*pannu|வரிசையைத்\s*தேர்ந்தெடு)", re.I), "shift+space"),
    (re.compile(r"(select\s*column|select\s*entire\s*column|column\s*select\s*pannu|நெடுவரிசையைத்\s*தேர்ந்தெடு)", re.I), "ctrl+space"),
    (re.compile(r"(insert\s*current\s*date|insert\s*date|today\s*date|innaiku\s*date|inraiya\s*thethi|இன்றைய\s*தேதி)", re.I), "ctrl+;"),
    (re.compile(r"(insert\s*current\s*time|insert\s*time|current\s*time|ippo\s*time|inraiya\s*neram|தற்போதைய\s*நேரம்)", re.I), "ctrl+shift+:"),
    (re.compile(r"(toggle\s*filter|autofilter|auto\s*filter|filter\s*podu|filter\s*pannu|வடிகட்டி)", re.I), "ctrl+shift+l"),
    (re.compile(r"(fill\s*down|keezha\s*fill\s*pannu|down\s*fill)", re.I), "ctrl+d"),
    (re.compile(r"(next\s*sheet|adutha\s*sheet|agla\s*sheet|அடுத்த\s*தாள்)", re.I), "ctrl+pagedown"),
    (re.compile(r"(previous\s*sheet|prev\s*sheet|munnadi\s*sheet|pichla\s*sheet|முந்தைய\s*தாள்)", re.I), "ctrl+pageup"),
    # Code Line Movement & Editing
    (re.compile(r"(move\s*line\s*up|line\s*mela\s*move\s*pannu|line\s*up)", re.I), "alt+up"),
    (re.compile(r"(move\s*line\s*down|line\s*keezha\s*move\s*pannu|line\s*down)", re.I), "alt+down"),
    (re.compile(r"(duplicate\s*line|line\s*copy\s*pannu|duplicate\s*pannu)", re.I), "shift+alt+down"),
    (re.compile(r"(word\s*wrap|toggle\s*wrap|wrap\s*text|toggle\s*word\s*wrap)", re.I), "alt+z"),
    (re.compile(r"(select\s*next\s*occurrence|next\s*match\s*select|adutha\s*match)", re.I), "ctrl+d"),
    (re.compile(r"(go\s*to\s*line|line\s*number\s*ku\s*po)", re.I), "ctrl+g"),
    # File Explorer
    (re.compile(r"(file\s*explorer|open\s*explorer|folder\s*open|files\s*open|explorer\s*thira|файлы|explorador\s*de\s*archivos|கோப்பு\s*உலாவி)", re.I), "win+e"),
    # Settings
    (re.compile(r"(open\s*settings|windows\s*settings|system\s*settings|settings\s*open|settings\s*thira|configuración|paramètres|அமைப்புகள்)", re.I), "win+i"),
    # Quick Settings / Toggles
    (re.compile(r"(quick\s*settings|action\s*center|quick\s*toggles|wifi\s*bluetooth\s*toggles|tray\s*settings)", re.I), "win+a"),
    # Run
    (re.compile(r"(open\s*run|run\s*dialog|run\s*window|run\s*box|ejecutar)", re.I), "win+r"),
    # Search
    (re.compile(r"(search\s*windows|search\s*computer|windows\s*search|desktop\s*search|rechercher|buscar)", re.I), "win+s"),
    # Task Manager
    (re.compile(r"(task\s*manager|open\s*taskmgr|taskmgr|gestionnaire\s*des\s*tâches|administrador\s*de\s*tareas)", re.I), "ctrl+shift+esc"),
    # Minimize / Desktop
    (re.compile(r"(minimize\s*all|show\s*desktop|desktop\s*po|minimize\s*windows|hide\s*windows)", re.I), "win+d"),
    # Lock
    (re.compile(r"(lock\s*computer|lock\s*laptop|lock\s*pc|screen\s*lock|lock\s*pannu|bloquear)", re.I), "win+l"),
    # Bookmark
    (re.compile(r"(bookmark\s*page|save\s*bookmark|bookmark\s*pannu|favoris|marcador)", re.I), "ctrl+d"),
    # Address Bar
    (re.compile(r"(address\s*bar|url\s*bar|go\s*to\s*address\s*bar|type\s*url|barra\s*de\s*direcciones)", re.I), "ctrl+l"),
    # Camera Shutter
    (re.compile(r"(take\s*photo|click\s*photo|capture\s*photo|snap\s*photo|camera\s*photo\s*edu|புகைப்படம்\s*எடு|फोटो\s*खींचो)", re.I), "space"),
]


COMPOUND_DELIMITERS = (
    " and ",
    " then ",
    " and then ",
    " and type ",
    " and click ",
    " after that ",
    " aduthu ",
    " aur ",
    " apparam ",
    " apram ",
    " panni ",
    " pannitu ",
    " pannிட்டு ",
    " seidhu ",
    " seithu ",
    " செய்து ",
    " பண்ணி ",
    " karke ",
    " fir ",
    " phir ",
    " ensuite ",
    " puis ",
    " y luego ",
)


def is_explicit_mouse_request(goal: str) -> bool:
    """
    Check if the user explicitly commanded to use the mouse.
    Returns True if user explicitly asked for mouse/cursor/pointer interaction in any language.
    """
    cleaned = goal.lower().strip()
    for pattern in EXPLICIT_MOUSE_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            log.info("Explicit mouse request detected for goal: '%s'", goal)
            return True
    return False


def detect_fast_shortcut(goal: str) -> ComputerAction | None:
    """
    Tier 1 Fast Heuristic (0ms).
    Matches instant multi-lingual stems. Returns ComputerAction or None.
    """
    if is_explicit_mouse_request(goal):
        return None

    cleaned = goal.lower().strip()

    # Disallow compound tasks that require subsequent deep typing or multi-step workflow
    # Protect atomic terms like "find and replace" from compound false positive
    temp_cleaned = cleaned.replace("find and replace", "find_replace")
    if any(cw in f" {temp_cleaned} " for cw in COMPOUND_DELIMITERS):
        return None

    for pattern, shortcut_key in FAST_CACHE:
        if pattern.search(cleaned):
            if shortcut_key in CANONICAL_SHORTCUTS:
                act_type, desc = CANONICAL_SHORTCUTS[shortcut_key]
                log.info("Tier 1 Fast-Path matched '%s' -> %s (%s)", shortcut_key, act_type, desc)
                return ComputerAction(
                    action_type=act_type,
                    key=shortcut_key,
                    reasoning=f"Shortcut-First Acceleration: {desc}",
                )

    return None


async def resolve_universal_shortcut(
    goal: str,
    router: ModelRouter | None = None,
) -> ComputerAction | None:
    """
    Universal Multilingual Shortcut Resolver (Tier 1 + Tier 2).
    
    1. Runs Tier 1 Fast Regex cache (0ms).
    2. If not matched, runs Tier 2 Universal Semantic Classifier via Gemini Flash (150ms)
       which handles ANY natural language (Pure Tamil, Hindi, Telugu, French, Spanish,
       German, colloquial Tanglish, regional slang, synonyms).
    """
    # 1. Tier 1 Instant Fast Match
    fast_match = detect_fast_shortcut(goal)
    if fast_match:
        return fast_match

    # If explicit mouse was commanded, immediately yield to mouse engine
    if is_explicit_mouse_request(goal):
        return None

    # Check for deep compound commands
    cleaned = goal.lower().strip()
    temp_cleaned = cleaned.replace("find and replace", "find_replace")
    if any(cw in f" {temp_cleaned} " for cw in COMPOUND_DELIMITERS):
        return None

    # 2. Tier 2 Universal Semantic Classifier
    try:
        if router is None:
            from seyal_ai.llm.router import ModelRouter
            r = ModelRouter()
        else:
            r = router
        await r.initialize()

        shortcut_options = "\n".join(f"- \"{k}\": {desc}" for k, (_, desc) in CANONICAL_SHORTCUTS.items())
        prompt = (
            "You are the Windows OS Shortcut Acceleration Engine.\n"
            "Analyze the user's computer command in WHATEVER language it is spoken (English, Tamil, Tanglish, Hindi, Telugu, Malayalam, Spanish, French, German, Japanese, etc.).\n"
            "Determine if this instruction can be executed with 100% precision by a single standard Windows keyboard shortcut or keypress.\n\n"
            f"AVAILABLE SHORTCUTS:\n{shortcut_options}\n"
            "- \"NONE\": If it is a compound/multi-step instruction (e.g. 'open camera and close it', 'do X then Y'), requires mouse navigation, opening a third-party website, drawing, complex workflow, or has no direct single shortcut.\n\n"
            f"User input: \"{goal}\"\n\n"
            "Output strictly valid JSON only:\n"
            "{\"shortcut\": \"<key from list or NONE>\", \"mouse_override\": <true if user explicitly asked to use mouse else false>}"
        )

        res = await asyncio.wait_for(
            r.generate(
                messages=[LLMMessage(role="user", content=prompt)],
                tier=ModelTier.FAST,
                temperature=0.0,
            ),
            timeout=1.5,
        )

        raw_text = (res.content or "").strip()
        # Extract JSON block
        json_match = re.search(r"\{.*?\}", raw_text, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group(0))
            if data.get("mouse_override"):
                log.info("Tier 2 detected explicit mouse override for: '%s'", goal)
                return None

            selected_key = str(data.get("shortcut", "")).lower().strip()
            if selected_key in CANONICAL_SHORTCUTS:
                act_type, desc = CANONICAL_SHORTCUTS[selected_key]
                log.info("Tier 2 Universal Semantic matched '%s' -> %s (%s)", selected_key, act_type, desc)
                return ComputerAction(
                    action_type=act_type,
                    key=selected_key,
                    reasoning=f"Universal Shortcut Acceleration: {desc}",
                )
    except Exception as e:
        log.debug("Universal semantic shortcut classification fallback: %s", e)

    return None
