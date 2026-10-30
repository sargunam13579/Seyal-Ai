"""Seyal AI — Shared Platform & Foundation Layer.

Provides unified, shared infrastructure services across all 5 Agent domains:
- llm       — ModelRouter and multimodal LLM providers (Gemini, Claude, OpenAI, Ollama)
- memory    — SQLite storage, vector database, and context resolution
- voice     — WebSocket streaming, VAD, STT, and natural Edge-TTS engines
- vision    — Screen capture, Set-of-Marks grounding, OCR, and UI element detection
- tools     — Operating system, browser automation, and desktop tools
- security  — Guardrails, permission scopes, authentication, and audits
- database  — Core ORM models, migrations, and repositories
"""

from __future__ import annotations

import sys

from seyal_ai.platform import database
from seyal_ai import llm, memory, security, tools, vision, voice

__all__ = [
    "llm",
    "memory",
    "voice",
    "vision",
    "tools",
    "security",
    "database",
]
