"""Seyal AI Voice — Pipeline States and Enums."""

from __future__ import annotations

from enum import StrEnum


class PipelineState(StrEnum):
    """Current state of the voice pipeline."""

    STOPPED = "stopped"
    IDLE = "idle"  # Waiting for speech
    LISTENING = "listening"  # Speech detected, accumulating
    PROCESSING = "processing"  # STT + Brain processing
    SPEAKING = "speaking"  # TTS playback
    ERROR = "error"


class InteractionMode(StrEnum):
    """How the user interacts with Seyal AI."""

    VOICE_AND_TEXT = "voice_and_text"
    VOICE_ONLY = "voice_only"
    TEXT_ONLY = "text_only"


class InputMode(StrEnum):
    """How the current input was received."""

    VOICE = "voice"
    TEXT = "text"
