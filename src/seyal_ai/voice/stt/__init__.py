"""Seyal AI Voice — Speech-to-Text (STT) Package.

Provides a provider-abstracted Multilingual STT engine with support for:
  - Gemini Multilingual Audio Transcriber (native code-switching, Tamil, Tanglish, Hindi, English)
  - Google Web Speech API (free, online fallback)
  - Vosk (offline, requires model download)

Supports automatic language detection and code-switching out of the box.
"""

from __future__ import annotations

from .markers import _TANGLISH_MARKERS, _HINDI_MARKERS, detect_text_language
from .sanitizer import sanitize_transcribed_text, _audio_to_wav_bytes
from .engines import (
    TranscriptionResult,
    STTError,
    BaseSTTProvider,
    GeminiMultilingualSTTProvider,
    GoogleWebSTTProvider,
    VoskSTTProvider,
    WhisperSTTProvider,
    STTEngine,
)

__all__ = [
    "STTEngine",
    "TranscriptionResult",
    "STTError",
    "BaseSTTProvider",
    "GeminiMultilingualSTTProvider",
    "GoogleWebSTTProvider",
    "VoskSTTProvider",
    "WhisperSTTProvider",
    "detect_text_language",
    "sanitize_transcribed_text",
    "_TANGLISH_MARKERS",
    "_HINDI_MARKERS",
    "_audio_to_wav_bytes",
]
