"""Backward-compatibility forwarder for `seyal_ai.security.terminal_security`.

Canonical location: `seyal_ai.platform.security.terminal_security`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import terminal_security as _canonical_module
from seyal_ai.platform.security.terminal_security import (
    CommandAnalysisResult,
    CommandSafetyStatus,
    TerminalSecurityClassifier,
)

sys.modules.setdefault("seyal_ai.security.terminal_security", _canonical_module)

__all__ = [
    "CommandAnalysisResult",
    "CommandSafetyStatus",
    "TerminalSecurityClassifier",
]
