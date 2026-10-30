"""Seyal AI Voice — Text-to-Speech (TTS) Package.

Provides a provider-abstracted TTS engine with support for:
  - Edge TTS (online, high-quality Microsoft voices — default)
  - pyttsx3 (offline, uses Windows SAPI5 / espeak)

Supports interruption by splitting text into sentences and checking
a stop flag between each sentence.
"""

from __future__ import annotations

from .sentence import _split_sentences, resolve_multilingual_voice
from .engines import (
    BaseTTSProvider,
    TTSError,
    EdgeTTSProvider,
    Pyttsx3TTSProvider,
    TTSEngine,
    _edge_tts_cache,
)

__all__ = [
    "TTSEngine",
    "BaseTTSProvider",
    "TTSError",
    "EdgeTTSProvider",
    "Pyttsx3TTSProvider",
    "_split_sentences",
    "resolve_multilingual_voice",
    "_edge_tts_cache",
]
