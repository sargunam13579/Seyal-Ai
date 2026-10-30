"""
Seyal AI Browser Content Extraction and Download Tools.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.browser.controller import BrowserController
from seyal_ai.browser.downloader import BrowserDownloader
from seyal_ai.browser.page_reader import PageReader
from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.browser.web_tools.navigation import _default_browser_ctrl
from seyal_ai.utils.logging import get_logger

log = get_logger("tools.browser.web.extraction")


class ReadWebPageTool(BaseTool):
    """Extract and read structured text content and links from the current web page."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._reader = PageReader(controller=self._controller)

    @property
    def name(self) -> str:
        return "read_web_page"

    @property
    def description(self) -> str:
        return "Extract readable text content, headings, and links from the active web page."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "max_words": {
                    "type": "integer",
                    "description": "Max number of words to return (default: 600).",
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

    async def execute(self, max_words: int = 600, **kwargs: Any) -> ToolResult:
        try:
            content = await self._reader.read(max_length=max_words * 6)
            summary = (
                f"Page Title: {content.title}\n"
                f"URL: {content.url}\n"
                f"Word Count: {content.total_words}\n\n"
                f"--- Content ---\n{content.text_content}"
            )
            return ToolResult.ok(
                summary,
                title=content.title,
                url=content.url,
                headings=content.headings,
                total_words=content.total_words,
            )
        except Exception as e:
            return ToolResult.fail(f"Reading page content failed: {e}")


class DownloadWebFileTool(BaseTool):
    """Download a file from a URL or web element and save to destination folder."""

    def __init__(self, controller: BrowserController | None = None) -> None:
        self._controller = controller or _default_browser_ctrl
        self._downloader = BrowserDownloader(controller=self._controller)

    @property
    def name(self) -> str:
        return "download_web_file"

    @property
    def description(self) -> str:
        return (
            "Download a file (PDF, archive, document) from a URL or web link "
            "and save it to Documents or Downloads."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "target": {
                    "type": "string",
                    "description": "Download URL or element label/selector to click for download.",
                },
                "destination_folder": {
                    "type": "string",
                    "description": (
                        "Target folder name (e.g. 'Documents', 'Downloads') or custom path."
                    ),
                },
                "filename": {
                    "type": "string",
                    "description": "Optional custom filename to save as.",
                },
            },
            "required": ["target"],
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

    async def execute(
        self,
        target: str = "",
        destination_folder: str | None = "Documents",
        filename: str | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        if not target:
            return ToolResult.fail("Parameter 'target' is required.")

        try:
            res = await self._downloader.download(
                url_or_click_target=target,
                destination_folder=destination_folder,
                filename=filename,
            )
            if not res.success:
                return ToolResult.fail(res.error or "Download failed")

            msg = (
                f"Successfully downloaded '{res.filename}' "
                f"({res.file_size_bytes} bytes) to {res.file_path}."
            )
            return ToolResult.ok(
                msg,
                file_path=res.file_path,
                filename=res.filename,
                size_bytes=res.file_size_bytes,
                sha256=res.sha256_hash,
            )
        except Exception as e:
            return ToolResult.fail(f"Download failed: {e}")
