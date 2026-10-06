"""
Seyal AI Accessibility Package.

Provides hands-free voice-first navigation, earcons & audio feedback,
custom voice shortcuts & macros, and screen reader verbal formatters.
"""

from seyal_ai.accessibility.audio_feedback import AudioFeedbackManager, EarconType
from seyal_ai.accessibility.custom_commands import CustomCommand, CustomCommandManager
from seyal_ai.accessibility.voice_navigation import VoiceNavigationEngine

__all__ = [
    "AudioFeedbackManager",
    "EarconType",
    "CustomCommand",
    "CustomCommandManager",
    "VoiceNavigationEngine",
]
