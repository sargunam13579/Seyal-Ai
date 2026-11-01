"""Platform Voice infrastructure."""
from seyal_ai.voice.vad import VoiceActivityDetector, VADState
from seyal_ai.voice.pipeline.orchestrator import VoicePipeline
from seyal_ai.voice.stt.engines import (
    BaseSTTProvider,
    GeminiMultilingualSTTProvider,
    GoogleWebSTTProvider,
    STTEngine,
    STTError,
    TranscriptionResult,
    VoskSTTProvider,
    WhisperSTTProvider,
)
from seyal_ai.voice.tts.engines import (
    BaseTTSProvider,
    EdgeTTSProvider,
    KokoroTTSProvider,
    Pyttsx3TTSProvider,
    TTSEngine,
    TTSError,
)

__all__ = [
    "VoiceActivityDetector",
    "VADState",
    "VoicePipeline",
    "STTEngine",
    "TTSEngine",
    "STTError",
    "TTSError",
    "BaseSTTProvider",
    "BaseTTSProvider",
    "TranscriptionResult",
    "WhisperSTTProvider",
    "KokoroTTSProvider",
    "GeminiMultilingualSTTProvider",
    "GoogleWebSTTProvider",
    "VoskSTTProvider",
    "EdgeTTSProvider",
    "Pyttsx3TTSProvider",
]
