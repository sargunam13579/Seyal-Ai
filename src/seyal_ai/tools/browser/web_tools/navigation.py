"""
Seyal AI Browser Navigation and Tab Management Tools.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.browser.controller import BrowserController
from seyal_ai.browser.navigator import BrowserNavigator
from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.browser.web.navigation")

# Shared default controller instance
_default_browser_ctrl = BrowserController()


class OpenBrowserTool(BaseTool):
    """Open or start the web browser and optionally navigate to a URL."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl

    @property
    def name(self) -> str:
        return "open_browser"

    @property
    def description(self) -> str:
        return "Open the web browser and optionally navigate to a specific URL."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Optional initial URL to navigate to (e.g. 'https://google.com').",
                },
            },
            "required": [],
        }

    @property
    def category(self) -> str:
        return "browser"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, url: str | None = None, **kwargs: Any) -> ToolResult:
        try:
            if not self._controller.is_running:
                await self._controller.start()

            page = await self._controller.get_active_page()
            if url:
                navigator = BrowserNavigator(controller=self._controller)
                nav_res = await navigator.navigate(url)
                msg = (
                    f"Browser opened and navigated to '{nav_res['url']}' "
                    f"(Title: '{nav_res['title']}')."
                )
                return ToolResult.ok(
                    msg,
                    title=nav_res["title"],
                    url=nav_res["url"],
                )

            title = await page.title() or "New Tab"
            return ToolResult.ok("Browser opened successfully.", title=title, url=page.url)
        except Exception as e:
            return ToolResult.fail(f"Failed to open browser: {e}")


class NavigateWebTool(BaseTool):
    """Navigate the active browser tab to a URL."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._navigator = BrowserNavigator(controller=self._controller)

    @property
    def name(self) -> str:
        return "navigate_web"

    @property
    def description(self) -> str:
        return "Navigate active browser page to a specific URL or web address."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Target URL to navigate to (e.g. 'https://github.com').",
                },
            },
            "required": ["url"],
        }

    @property
    def category(self) -> str:
        return "browser"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, url: str = "", **kwargs: Any) -> ToolResult:
        if not url:
            return ToolResult.fail("Parameter 'url' is required.")

        try:
            res = await self._navigator.navigate(url)
            msg = (
                f"Navigated to '{res['url']}' "
                f"(Title: '{res['title']}', Status: {res['status_code']})."
            )
            return ToolResult.ok(
                msg,
                title=res["title"],
                url=res["url"],
                status_code=res["status_code"],
            )
        except Exception as e:
            return ToolResult.fail(f"Navigation failed: {e}")


class WebSearchBrowserTool(BaseTool):
    """Perform a search on DuckDuckGo, Google, or Bing in the browser."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._navigator = BrowserNavigator(controller=self._controller)

    @property
    def name(self) -> str:
        return "web_search_browser"

    @property
    def description(self) -> str:
        return "Search the web using DuckDuckGo, Google, or Bing in the browser."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query keywords or question.",
                },
                "engine": {
                    "type": "string",
                    "enum": ["duckduckgo", "google", "bing"],
                    "description": "Search engine to use (default: duckduckgo).",
                },
            },
            "required": ["query"],
        }

    @property
    def category(self) -> str:
        return "browser"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self, query: str = "", engine: str = "duckduckgo", **kwargs: Any
    ) -> ToolResult:
        if not query:
            return ToolResult.fail("Parameter 'query' is required.")

        try:
            res = await self._navigator.search(query, engine=engine)
            msg = (
                f"Searched '{query}' on {engine.capitalize()}. "
                f"Current page: '{res['title']}' ({res['url']})."
            )
            return ToolResult.ok(
                msg,
                title=res["title"],
                url=res["url"],
            )
        except Exception as e:
            return ToolResult.fail(f"Search failed: {e}")


class ManageWebTabsTool(BaseTool):
    """Manage browser tabs: open new tab, close tab, switch tab, or list tabs."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl

    @property
    def name(self) -> str:
        return "manage_web_tabs"

    @property
    def description(self) -> str:
        return "Manage browser tabs: 'list' tabs, 'new' tab, 'switch' tab, or 'close' tab."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["list", "new", "switch", "close"],
                    "description": "Action to perform on tabs.",
                },
                "index": {
                    "type": "integer",
                    "description": "Tab index for 'switch' or 'close' actions.",
                },
                "url": {
                    "type": "string",
                    "description": "URL to open when creating a 'new' tab.",
                },
            },
            "required": ["action"],
        }

    @property
    def category(self) -> str:
        return "browser"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self,
        action: str = "list",
        index: int | None = None,
        url: str | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        act = action.lower().strip()
        try:
            if act == "list":
                tabs = await self._controller.list_tabs()
                if not tabs:
                    return ToolResult.ok("No browser tabs open.", tabs=[])
                lines = [
                    f"[{t.index}] {'* ' if t.is_active else '  '}{t.title} ({t.url})" for t in tabs
                ]
                return ToolResult.ok(
                    "Open Tabs:\n" + "\n".join(lines),
                    tabs=[
                        {"index": t.index, "title": t.title, "url": t.url, "active": t.is_active}
                        for t in tabs
                    ],
                )

            elif act == "new":
                tab_info = await self._controller.new_tab(url=url)
                return ToolResult.ok(
                    f"Opened new tab [{tab_info.index}]: '{tab_info.title}' ({tab_info.url}).",
                    index=tab_info.index,
                    title=tab_info.title,
                    url=tab_info.url,
                )

            elif act == "switch":
                if index is None:
                    return ToolResult.fail("Parameter 'index' is required for 'switch' action.")
                tab_info = await self._controller.switch_tab(index)
                return ToolResult.ok(
                    f"Switched to tab [{tab_info.index}]: '{tab_info.title}'.",
                    index=tab_info.index,
                    title=tab_info.title,
                    url=tab_info.url,
                )

            elif act == "close":
                closed = await self._controller.close_tab(index)
                if closed:
                    return ToolResult.ok(f"Closed tab {index if index is not None else 'active'}.")
                return ToolResult.fail("Could not close tab.")

            return ToolResult.fail(f"Unknown action '{action}'. Valid: list, new, switch, close.")
        except Exception as e:
            return ToolResult.fail(f"Tab operation failed: {e}")
