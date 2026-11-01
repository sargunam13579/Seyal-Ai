"""
Seyal AI Autonomous Browser Agent Package.

Provides secure web navigation with SSRF numeric IP socket pinning,
ephemeral context isolation, and compact semantic DOM extraction.
"""

from seyal_ai.agents.browser.agent import BrowserAgent
from seyal_ai.agents.browser.dom import SemanticDOMExtractor
from seyal_ai.agents.browser.driver import EphemeralBrowserSession
from seyal_ai.agents.browser.models import (
    BrowserRequest,
    BrowserResponse,
    SSRFBlockedException,
)
from seyal_ai.agents.browser.ssrf import SSRFGuard

__all__ = [
    "BrowserAgent",
    "BrowserRequest",
    "BrowserResponse",
    "SSRFBlockedException",
    "SSRFGuard",
    "SemanticDOMExtractor",
    "EphemeralBrowserSession",
]
