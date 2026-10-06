"""
Seyal AI Computer-Use Tools Package.
"""

from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from seyal_ai.tools.base import BaseTool

def get_computer_use_tools() -> list[BaseTool]:
    """Conversational Computer-Use Agent operates directly via actions.py; no registry wrappers needed."""
    return []

__all__ = ["get_computer_use_tools"]
