"""
Seyal AI Application Control Tools Package for Windows.

Provides modularized application control capabilities:
- discovery: COMMON_APP_MAP, _find_windows_app_path, _parse_command_arguments
- lifecycle: OpenApplicationTool, CloseApplicationTool, SwitchApplicationTool, WindowStateTool
- query: SearchApplicationsTool, ListApplicationsTool
"""

from __future__ import annotations

from seyal_ai.tools.system.apps.discovery import (
    COMMON_APP_MAP,
    _find_windows_app_path,
    _parse_command_arguments,
)
from seyal_ai.tools.system.apps.lifecycle import (
    CloseApplicationTool,
    OpenApplicationTool,
    SwitchApplicationTool,
    WindowStateTool,
)
from seyal_ai.tools.system.apps.query import (
    ListApplicationsTool,
    SearchApplicationsTool,
)

__all__ = [
    "COMMON_APP_MAP",
    "CloseApplicationTool",
    "ListApplicationsTool",
    "OpenApplicationTool",
    "SearchApplicationsTool",
    "SwitchApplicationTool",
    "WindowStateTool",
    "_find_windows_app_path",
    "_parse_command_arguments",
]
