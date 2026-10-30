"""
Seyal AI Browser DOM Interaction Tools (Click, Type, Scroll, Form Fill).
"""

from __future__ import annotations

from typing import Any

from seyal_ai.browser.controller import BrowserController
from seyal_ai.browser.interaction import BrowserInteraction
from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.browser.web_tools.navigation import _default_browser_ctrl
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.browser.web.interaction")


class ClickWebElementTool(BaseTool):
    """Click a button, link, or element on the current web page."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._interaction = BrowserInteraction(controller=self._controller)

    @property
    def name(self) -> str:
        return "click_web_element"

    @property
    def description(self) -> str:
        return "Click a button, link, or element on the current web page by text or CSS selector."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "target": {
                    "type": "string",
                    "description": (
                        "Text, button label, link title, or CSS/XPath selector of element to click."
                    ),
                },
            },
            "required": ["target"],
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

    async def execute(self, target: str = "", **kwargs: Any) -> ToolResult:
        if not target:
            return ToolResult.fail("Parameter 'target' is required.")

        try:
            success = await self._interaction.click(target)
            if success:
                return ToolResult.ok(f"Successfully clicked web element '{target}'.")
            return ToolResult.fail(f"Could not click element matching '{target}'.")
        except Exception as e:
            return ToolResult.fail(f"Click failed: {e}")


class TypeWebElementTool(BaseTool):
    """Type text into an input field or textarea on the current web page."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._interaction = BrowserInteraction(controller=self._controller)

    @property
    def name(self) -> str:
        return "type_web_element"

    @property
    def description(self) -> str:
        return "Type text into a web input field, search box, or form element."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to type.",
                },
                "target": {
                    "type": "string",
                    "description": (
                        "Optional placeholder, label, name, or selector of target input."
                    ),
                },
                "press_enter": {
                    "type": "boolean",
                    "description": "Whether to press Enter after typing (default: false).",
                },
            },
            "required": ["text"],
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
        text: str = "",
        target: str | None = None,
        press_enter: bool = False,
        **kwargs: Any,
    ) -> ToolResult:
        if not text:
            return ToolResult.fail("Parameter 'text' cannot be empty.")

        try:
            success = await self._interaction.type_text(
                target=target, text=text, press_enter=press_enter
            )
            if success:
                return ToolResult.ok(
                    f"Typed {len(text)} characters into '{target or 'active field'}'.",
                    text_length=len(text),
                )
            return ToolResult.fail(f"Could not type into element '{target}'.")
        except Exception as e:
            return ToolResult.fail(f"Typing failed: {e}")


class ScrollWebTool(BaseTool):
    """Scroll the current web page."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._interaction = BrowserInteraction(controller=self._controller)

    @property
    def name(self) -> str:
        return "scroll_web"

    @property
    def description(self) -> str:
        return "Scroll the current webpage up, down, top, or bottom."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "direction": {
                    "type": "string",
                    "enum": ["down", "up", "top", "bottom"],
                    "description": "Scroll direction (default: down).",
                },
                "amount": {
                    "type": "integer",
                    "description": "Pixel amount to scroll (default: 500).",
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

    async def execute(
        self, direction: str = "down", amount: int = 500, **kwargs: Any
    ) -> ToolResult:
        try:
            success = await self._interaction.scroll(direction=direction, amount=amount)
            if success:
                return ToolResult.ok(f"Scrolled page {direction} by {amount}px.")
            return ToolResult.fail("Could not scroll page.")
        except Exception as e:
            return ToolResult.fail(f"Scroll failed: {e}")


class FillWebFormTool(BaseTool):
    """Autofill multiple fields in a web form."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._interaction = BrowserInteraction(controller=self._controller)

    @property
    def name(self) -> str:
        return "fill_web_form"

    @property
    def description(self) -> str:
        return "Fill multiple form fields on current web page using a key-value mapping."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "fields": {
                    "type": "object",
                    "description": (
                        "Key-value mapping of field labels/placeholders to input values."
                    ),
                },
            },
            "required": ["fields"],
        }

    @property
    def category(self) -> str:
        return "browser"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, fields: dict[str, str] | None = None, **kwargs: Any) -> ToolResult:
        if not fields:
            return ToolResult.fail("Parameter 'fields' dictionary is required.")

        try:
            results = await self._interaction.fill_form(fields)
            filled_count = sum(1 for v in results.values() if v)
            return ToolResult.ok(
                f"Filled {filled_count}/{len(fields)} form fields.",
                results=results,
            )
        except Exception as e:
            return ToolResult.fail(f"Form filling failed: {e}")
