"""
Seyal AI Ollama Provider — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.llm.providers.ollama
"""

from __future__ import annotations

import sys
import seyal_ai.platform.llm.providers.ollama as _canonical_ollama

sys.modules.setdefault("seyal_ai.llm.providers.ollama", _canonical_ollama)

OllamaProvider = _canonical_ollama.OllamaProvider

__all__ = ["OllamaProvider"]
