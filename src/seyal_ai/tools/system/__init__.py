"""
Seyal AI System Tools & Laptop Capabilities.

Collects all application, file, system, and terminal tools for laptop automation.
"""

from seyal_ai.tools.base import BaseTool
from seyal_ai.tools.browser.web_tools import (
    ClickWebElementTool,
    DownloadWebFileTool,
    FillWebFormTool,
    ManageWebTabsTool,
    NavigateWebTool,
    OpenBrowserTool,
    ReadWebPageTool,
    ScrollWebTool,
    TypeWebElementTool,
    WebSearchBrowserTool,
    get_browser_tools,
)
from seyal_ai.tools.desktop.app_tools import (
    InteractAppTool,
    MultiStepTaskTool,
    ReadAppContentTool,
    ScrollAppTool,
    get_desktop_automation_tools,
)
from seyal_ai.tools.devices.device_tools import (
    ExecuteCrossDeviceCommandTool,
    HandoffTaskTool,
    ListDevicesTool,
    ManageDeviceAccessTool,
    TransferFileCrossDeviceTool,
    get_device_tools,
)
from seyal_ai.tools.memory.memory_tools import (
    ClearMemoryTool,
    DeleteMemoryTool,
    ManageMemorySettingsTool,
    RecallMemoryTool,
    SearchMemoryTool,
    StoreMemoryTool,
    get_memory_tools,
)
from seyal_ai.tools.system.apps import (
    CloseApplicationTool,
    ListApplicationsTool,
    OpenApplicationTool,
    SearchApplicationsTool,
    SwitchApplicationTool,
    WindowStateTool,
)
from seyal_ai.tools.system.basic import (
    GetCurrentTimeTool,
    GetSystemInfoTool,
    GetWeatherTool,
    SearchWebTool,
    SetVolumeTool,
    get_starter_tools,
)
from seyal_ai.tools.system.files import (
    CompressFilesTool,
    CopyFileTool,
    CreateFileTool,
    CreateFolderTool,
    DeletePathTool,
    EditFileTool,
    ExtractArchiveTool,
    MoveFileTool,
    ReadFileTool,
    RenameFileTool,
    SearchFilesTool,
)
from seyal_ai.tools.system.os_control import (
    ClipboardTool,
    ExtendedSystemInfoTool,
    LockScreenTool,
    ScreenshotTool,
    VolumeControlTool,
)
from seyal_ai.tools.terminal.command import ExecuteCommandTool
from seyal_ai.tools.vision.screen_tools import (
    ClickElementTool,
    DescribeScreenTool,
    GetActiveWindowTool,
    LocateElementTool,
    ReadScreenTextTool,
    TypeIntoElementTool,
    get_vision_tools,
)


def get_laptop_tools() -> list[BaseTool]:
    """Return all laptop system, vision, browser, and desktop automation tools."""
    return [
        # Application tools
        OpenApplicationTool(),
        CloseApplicationTool(),
        SwitchApplicationTool(),
        SearchApplicationsTool(),
        ListApplicationsTool(),
        WindowStateTool(),
        # File tools
        SearchFilesTool(),
        CreateFileTool(),
        ReadFileTool(),
        EditFileTool(),
        RenameFileTool(),
        CopyFileTool(),
        MoveFileTool(),
        CreateFolderTool(),
        DeletePathTool(),
        CompressFilesTool(),
        ExtractArchiveTool(),
        # System & OS tools
        VolumeControlTool(),
        ScreenshotTool(),
        ClipboardTool(),
        ExtendedSystemInfoTool(),
        LockScreenTool(),
        GetCurrentTimeTool(),
        SearchWebTool(),
        # Terminal command execution
        ExecuteCommandTool(),
        # Vision & Screen tools
        *get_vision_tools(),
        # Browser tools
        *get_browser_tools(),
        # Desktop automation tools
        *get_desktop_automation_tools(),
        # Memory tools
        *get_memory_tools(),
        # Cross-device ecosystem tools
        *get_device_tools(),
    ]


__all__ = [
    # Apps
    "OpenApplicationTool",
    "CloseApplicationTool",
    "SwitchApplicationTool",
    "SearchApplicationsTool",
    "ListApplicationsTool",
    "WindowStateTool",
    # Files
    "SearchFilesTool",
    "CreateFileTool",
    "ReadFileTool",
    "EditFileTool",
    "RenameFileTool",
    "CopyFileTool",
    "MoveFileTool",
    "CreateFolderTool",
    "DeletePathTool",
    "CompressFilesTool",
    "ExtractArchiveTool",
    # OS Control
    "VolumeControlTool",
    "ScreenshotTool",
    "ClipboardTool",
    "ExtendedSystemInfoTool",
    # Terminal
    "ExecuteCommandTool",
    # Vision & Screen
    "DescribeScreenTool",
    "LocateElementTool",
    "ClickElementTool",
    "TypeIntoElementTool",
    "ReadScreenTextTool",
    "GetActiveWindowTool",
    "get_vision_tools",
    # Browser
    "OpenBrowserTool",
    "NavigateWebTool",
    "WebSearchBrowserTool",
    "ClickWebElementTool",
    "TypeWebElementTool",
    "ScrollWebTool",
    "ReadWebPageTool",
    "ManageWebTabsTool",
    "DownloadWebFileTool",
    "FillWebFormTool",
    "get_browser_tools",
    # Desktop Automation
    "InteractAppTool",
    "ScrollAppTool",
    "ReadAppContentTool",
    "MultiStepTaskTool",
    "get_desktop_automation_tools",
    # Memory
    "StoreMemoryTool",
    "RecallMemoryTool",
    "SearchMemoryTool",
    "DeleteMemoryTool",
    "ClearMemoryTool",
    "ManageMemorySettingsTool",
    # Devices
    "ListDevicesTool",
    "ExecuteCrossDeviceCommandTool",
    "TransferFileCrossDeviceTool",
    "HandoffTaskTool",
    "ManageDeviceAccessTool",
    "get_device_tools",
    # Basic
    "GetCurrentTimeTool",
    "GetSystemInfoTool",
    "SetVolumeTool",
    "SearchWebTool",
    "get_starter_tools",
    "get_laptop_tools",
]
