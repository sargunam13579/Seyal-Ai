"""Backward-compatibility forwarder for `seyal_ai.security.red_team`.

Canonical location: `seyal_ai.platform.security.red_team`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import red_team as _canonical_module
from seyal_ai.platform.security.red_team import (
    AttackCategory,
    DefenseAction,
    DefenseVerdict,
    PromptInjectionClassifier,
    RedTeamGuard,
)

sys.modules.setdefault("seyal_ai.security.red_team", _canonical_module)

__all__ = [
    "AttackCategory",
    "DefenseAction",
    "DefenseVerdict",
    "PromptInjectionClassifier",
    "RedTeamGuard",
]
