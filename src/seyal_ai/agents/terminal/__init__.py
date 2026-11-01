"""
Seyal AI Terminal Agent Module.

Provides sandboxed terminal execution on Windows, strictly enforcing dangerous
command interception, process-tree termination on timeouts, and buffer limits.
"""

from __future__ import annotations

from seyal_ai.agents.terminal.agent import TerminalAgent
from seyal_ai.agents.terminal.classifier import (
    TerminalAgentSecurityClassifier,
    TerminalClassification,
)
from seyal_ai.agents.terminal.executor import (
    TerminalSubprocessExecutor,
    kill_process_tree,
)
from seyal_ai.agents.terminal.models import TerminalRequest, TerminalResponse

__all__ = [
    "TerminalAgent",
    "TerminalAgentSecurityClassifier",
    "TerminalClassification",
    "TerminalSubprocessExecutor",
    "kill_process_tree",
    "TerminalRequest",
    "TerminalResponse",
]
