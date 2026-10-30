"""Seyal AI Brain Package.

The central intelligence hub that wires together:
  - LLM Router (model selection)
  - Tool Registry + Executor (actions)
  - Context Manager (conversation memory)
  - Orchestrator (agentic loop)
  - Voice Pipeline (voice I/O)
  - Identity & Wake Word Manager
  - Security Confirmation Manager
"""

from __future__ import annotations

from .name_change import _NAME_CHANGE_PATTERNS, detect_name_change_intent
from .tier_classifier import COMPLEX_KEYWORDS, classify_model_tier
from .coordinator import SeyalAiBrain

# Alias for convenience
Brain = SeyalAiBrain

__all__ = [
    "SeyalAiBrain",
    "Brain",
    "_NAME_CHANGE_PATTERNS",
    "detect_name_change_intent",
    "COMPLEX_KEYWORDS",
    "classify_model_tier",
]
