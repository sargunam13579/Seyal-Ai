"""
Seyal AI Model Router — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.router
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.router as _canonical_router

# Ensure module identity and proxying
sys.modules.setdefault("seyal_ai.llm.router", _canonical_router)

ModelRouter = _canonical_router.ModelRouter
PROVIDER_DEFAULT_MODELS = _canonical_router.PROVIDER_DEFAULT_MODELS

__all__ = ["ModelRouter", "PROVIDER_DEFAULT_MODELS"]
