"""Seyal AI — Brain Model Tier Classifier."""

from __future__ import annotations

from seyal_ai.llm.providers.base import ModelTier


COMPLEX_KEYWORDS = [
    "plan",
    "analyze",
    "explain",
    "compare",
    "summarize",
    "write",
    "create",
    "design",
    "debug",
    "help me",
    "step by step",
    "how to",
    "why",
]


def classify_model_tier(user_input: str) -> ModelTier:
    """Simple heuristic to select the model tier based on input keywords.

    In Phase 4, this can be extended with an LLM-based classifier.
    """
    input_lower = user_input.lower()
    if any(kw in input_lower for kw in COMPLEX_KEYWORDS):
        return ModelTier.SMART
    return ModelTier.FAST
