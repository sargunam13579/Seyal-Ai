"""
Seyal AI Browser Engine Package.

Provides high-performance web browsing, navigation, tab management, DOM interaction,
downloads, and page parsing.
"""

from seyal_ai.browser.controller import BrowserController, TabInfo
from seyal_ai.browser.downloader import BrowserDownloader, DownloadResult
from seyal_ai.browser.interaction import BrowserInteraction
from seyal_ai.browser.navigator import BrowserNavigator
from seyal_ai.browser.page_reader import PageContent, PageLink, PageReader

__all__ = [
    "BrowserController",
    "TabInfo",
    "BrowserNavigator",
    "BrowserInteraction",
    "BrowserDownloader",
    "DownloadResult",
    "PageReader",
    "PageContent",
    "PageLink",
]
