"""
Unit and Integration Tests for Voice Pipeline Engine (Whisper VAD + Kokoro TTS).

Tests cover:
- Whisper STT Provider (local and API mocking, multi-lingual detection)
- Kokoro TTS Provider (KPipeline and ONNX runtime mocking, audio formatting)
- STTEngine & TTSEngine provider switching and fallbacks
- VoicePipeline integration with acoustic barge-in
"""

from __future__ import annotations

import io
import wave
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from seyal_ai.platform.voice import (
    KokoroTTSProvider,
    STTEngine,
    STTError,
    TTSEngine,
    TTSError,
    VoiceActivityDetector,
    VoicePipeline,
    WhisperSTTProvider,
)


def _make_dummy_audio(duration_s: float = 0.5, sample_rate: int = 16000) -> np.ndarray:
    """Generate simple audio wave for tests."""
    t = np.linspace(0, duration_s, int(sample_rate * duration_s), dtype=np.float32)
    tone = (np.sin(2 * np.pi * 440 * t) * 16000).astype(np.int16)
    return tone


class TestWhisperSTTProvider:
    """Tests for WhisperSTTProvider."""

    def test_provider_name(self):
        provider = WhisperSTTProvider()
        assert "Whisper" in provider.provider_name

    @pytest.mark.asyncio
    async def test_transcribe_local_mock(self):
        provider = WhisperSTTProvider(model_size="tiny")

        mock_model = MagicMock()
        mock_model.transcribe.return_value = {"text": "hello seyal ai", "language": "en"}
        provider._local_model = mock_model

        audio = _make_dummy_audio()
        result = await provider.transcribe(audio, sample_rate=16000)
        assert result == "hello seyal ai"

    @pytest.mark.asyncio
    async def test_transcribe_with_language_tanglish(self):
        provider = WhisperSTTProvider(model_size="base")

        mock_model = MagicMock()
        # Mock faster-whisper style tuple (segments, info)
        seg = MagicMock()
        seg.text = "enna panra seyal"
        info = MagicMock()
        info.language = "ta"
        mock_model.transcribe.return_value = ([seg], info)
        provider._local_model = mock_model

        audio = _make_dummy_audio()
        res = await provider.transcribe_with_language(audio, sample_rate=16000)
        assert "enna panra" in res.text
        assert res.confidence > 0.0

    @pytest.mark.asyncio
    async def test_transcribe_api_mock(self):
        provider = WhisperSTTProvider(api_key="sk-test-key", use_api=True)

        audio = _make_dummy_audio()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"text": "autonomous voice execution"}

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            res = await provider.transcribe(audio, sample_rate=16000)
            assert res == "autonomous voice execution"

    @pytest.mark.asyncio
    async def test_check_availability(self):
        provider = WhisperSTTProvider(api_key="sk-test-mock")
        avail = await provider.check_availability()
        assert isinstance(avail, bool)
        assert avail is True


class TestKokoroTTSProvider:
    """Tests for KokoroTTSProvider."""

    def test_provider_name(self):
        provider = KokoroTTSProvider()
        assert "Kokoro" in provider.provider_name

    @pytest.mark.asyncio
    async def test_list_voices(self):
        provider = KokoroTTSProvider()
        voices = await provider.list_voices()
        assert len(voices) >= 3
        ids = [v["id"] for v in voices]
        assert "af_heart" in ids

    @pytest.mark.asyncio
    async def test_synthesize_mock_pipeline(self):
        provider = KokoroTTSProvider(voice="af_heart")

        # Mock KPipeline returning dummy 24kHz float samples
        mock_pipe = MagicMock()
        fake_audio = np.sin(np.linspace(0, 1, 2400)).astype(np.float32)
        mock_pipe.return_value = [("grapheme", "phoneme", fake_audio)]
        provider._pipeline = mock_pipe

        wav_bytes = await provider.synthesize("Hello world")
        assert len(wav_bytes) > 0
        assert wav_bytes[:4] == b"RIFF"

        # Verify WAV headers
        with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            assert wf.getnchannels() == 1
            assert wf.getsampwidth() == 2
            assert wf.getframerate() == 24000

    @pytest.mark.asyncio
    async def test_synthesize_empty_string(self):
        provider = KokoroTTSProvider()
        wav_bytes = await provider.synthesize("")
        assert wav_bytes == b""

    @pytest.mark.asyncio
    async def test_check_availability(self):
        provider = KokoroTTSProvider()
        avail = await provider.check_availability()
        assert isinstance(avail, bool)


class TestVoiceEnginesIntegration:
    """Tests integrating Whisper and Kokoro into STTEngine and TTSEngine."""

    def test_stt_engine_whisper_init(self):
        engine = STTEngine(provider_name="whisper")
        assert isinstance(engine._provider, WhisperSTTProvider)

    def test_tts_engine_kokoro_init(self):
        engine = TTSEngine(provider_name="kokoro", voice="af_heart")
        assert isinstance(engine._provider, KokoroTTSProvider)
        assert engine._fallback_provider is not None

    @pytest.mark.asyncio
    async def test_tts_engine_kokoro_fallback_on_error(self):
        engine = TTSEngine(provider_name="kokoro")

        # Force Kokoro provider to raise TTSError
        mock_kokoro = MagicMock(spec=KokoroTTSProvider)
        mock_kokoro.synthesize = AsyncMock(side_effect=TTSError("Kokoro model weights not found"))
        engine._provider = mock_kokoro

        # Mock fallback EdgeTTSProvider
        mock_fallback = MagicMock()
        mock_fallback.synthesize = AsyncMock(return_value=b"RIFFfallback_audio_bytes")
        engine._fallback_provider = mock_fallback

        out = await engine.synthesize("Fallback test")
        assert out == b"RIFFfallback_audio_bytes"
        mock_fallback.synthesize.assert_called_once()


class TestVoicePipelineWithWhisperAndKokoro:
    """Tests end-to-end VoicePipeline orchestration with Whisper and Kokoro."""

    @pytest.fixture
    def mock_brain(self):
        brain = MagicMock()
        brain.process = AsyncMock(return_value="Command executed successfully")
        return brain

    def test_pipeline_init_with_whisper_and_kokoro(self, mock_brain):
        pipeline = VoicePipeline(
            brain=mock_brain,
            stt_provider="whisper",
            tts_provider="kokoro",
            interrupt_enabled=True,
        )
        assert isinstance(pipeline._stt._provider, WhisperSTTProvider)
        assert isinstance(pipeline._tts._provider, KokoroTTSProvider)

    @pytest.mark.asyncio
    async def test_acoustic_barge_in_stops_playback(self, mock_brain):
        pipeline = VoicePipeline(
            brain=mock_brain,
            stt_provider="whisper",
            tts_provider="kokoro",
            interrupt_enabled=True,
        )

        # Mock player being active
        pipeline._player = MagicMock()
        pipeline._player.is_playing = MagicMock(return_value=True)

        # Trigger speech start (barge-in interruption)
        interrupted = pipeline.handle_barge_in()
        assert interrupted is True

        # Audio playback must be immediately stopped
        pipeline._player.stop.assert_called_once()
