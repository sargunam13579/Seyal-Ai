"""
Seyal AI Browser Tools Package for LLM & Agents.

Provides modularized web browsing capabilities:
- navigation: OpenBrowserTool, NavigateWebTool, WebSearchBrowserTool, ManageWebTabsTool
- interaction: ClickWebElementTool, TypeWebElementTool, ScrollWebTool, FillWebFormTool
- extraction: ReadWebPageTool, DownloadWebFileTool
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from seyal_ai.tools.browser.web_tools.extraction import (
    DownloadWebFileTool,
    ReadWebPageTool,
)
from seyal_ai.tools.browser.web_tools.interaction import (
    ClickWebElementTool,
    FillWebFormTool,
    ScrollWebTool,
    TypeWebElementTool,
)
from seyal_ai.tools.browser.web_tools.navigation import (
    ManageWebTabsTool,
    NavigateWebTool,
    OpenBrowserTool,
    WebSearchBrowserTool,
    _default_browser_ctrl,
)

if TYPE_CHECKING:
    from seyal_ai.browser.controller import BrowserController
    from seyal_ai.tools.base import BaseTool


def get_browser_tools(controller: BrowserController | None = None) -> list[BaseTool]:
    """Return all browser automation tools."""
    ctrl = controller or _default_browser_ctrl
    return [
        OpenBrowserTool(controller=ctrl),
        NavigateWebTool(controller=ctrl),
        WebSearchBrowserTool(controller=ctrl),
        ClickWebElementTool(controller=ctrl),
        TypeWebElementTool(controller=ctrl),
        ScrollWebTool(controller=ctrl),
        ReadWebPageTool(controller=ctrl),
        ManageWebTabsTool(controller=ctrl),
        DownloadWebFileTool(controller=ctrl),
        FillWebFormTool(controller=ctrl),
    ]


__all__ = [
    "ClickWebElementTool",
    "DownloadWebFileTool",
    "FillWebFormTool",
    "ManageWebTabsTool",
    "NavigateWebTool",
    "OpenBrowserTool",
    "ReadWebPageTool",
    "ScrollWebTool",
    "TypeWebElementTool",
    "WebSearchBrowserTool",
    "_default_browser_ctrl",
    "get_browser_tools",
]
