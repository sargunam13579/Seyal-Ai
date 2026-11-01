"""Backward-compatibility forwarder for `seyal_ai.security.guardrails`.

Canonical location: `seyal_ai.platform.security.guardrails`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import guardrails as _canonical_module
from seyal_ai.platform.security.guardrails import (
    SafetyGuardrailsManager,
    SafetySettings,
    SecurityGuardrails,
    get_safety_guardrails,
)

sys.modules.setdefault("seyal_ai.security.guardrails", _canonical_module)

__all__ = [
    "SafetyGuardrailsManager",
    "SafetySettings",
    "SecurityGuardrails",
    "get_safety_guardrails",
]
