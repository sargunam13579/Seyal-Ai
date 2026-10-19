"""
Seyal AI — Comprehensive Voice Activity Detection (VAD) & Barge-in Test Suite.

Validates acoustic speech detection, callback lifecycle, speech interruption,
echo rejection, and websocket barge-in emission.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest
from fastapi import WebSocketDisconnect

from seyal_ai.api.routes.voice import voice_websocket_stream
from seyal_ai.voice.vad import VADState, VoiceActivityDetector

# ===========================================================================
# ACOUSTIC AUDIO GENERATION HELPERS
# ===========================================================================


def _generate_speech_chunk(length: int = 512, offset_i: int = 0) -> np.ndarray:
    """Generate multi-harmonic modulated acoustic waveform simulating human voice phonemes."""
    t = np.linspace(offset_i * length / 16000, (offset_i + 1) * length / 16000, length, endpoint=False)
    mod = 0.5 * (1 + np.sin(2 * np.pi * 5 * t))
    wave = (
        mod
        * (
            12000 * np.sin(2 * np.pi * 220 * t)
            + 8000 * np.sin(2 * np.pi * 440 * t)
            + 4000 * np.sin(2 * np.pi * 880 * t)
        )
    ).astype(np.int16)
    return wave


def _generate_silence_chunk(length: int = 512) -> np.ndarray:
    """Generate zero-energy PCM chunk simulating silence."""
    return np.zeros(length, dtype=np.int16)


def _generate_low_echo_leak_chunk(length: int = 512) -> np.ndarray:
    """Generate low-amplitude residual echo chunk (e.g. speaker leakage < 100 RMS)."""
    t = np.linspace(0, length / 16000, length, endpoint=False)
    return (80 * np.sin(2 * np.pi * 1000 * t)).astype(np.int16)


# ===========================================================================
# 1. VAD CORE & CALLBACK LIFECYCLE TESTS
# ===========================================================================


class TestVADCallbackLifecycle:
    """Verifies VoiceActivityDetector callback triggers, suppression, and error resilience."""

    def test_vad_acoustic_barge_in_callback_triggers_instantly(self):
        """Verify that voice sound transitions to SPEECH and triggers callback."""
        callback_fired = False

        def on_barge_in():
            nonlocal callback_fired
            callback_fired = True

        vad = VoiceActivityDetector(
            sample_rate=16000,
            energy_threshold=100,
            on_speech_start=on_barge_in,
        )
        # Feed silent chunk: should stay idle and NOT fire callback
        state_idle = vad.process_chunk(_generate_silence_chunk())
        assert state_idle == VADState.IDLE
        assert not callback_fired

        # Feed voice acoustic sound: must transition to SPEECH and trigger callback
        state_speech = vad.process_chunk(_generate_speech_chunk(length=512))
        assert state_speech == VADState.SPEECH
        assert callback_fired

    def test_is_assistant_speaking_flag_no_effect_when_idle(self):
        """When the assistant is idle, the flag should be ignored and speech still detected."""
        vad = VoiceActivityDetector(energy_threshold=100)
        assert vad.process_chunk(_generate_silence_chunk()) == VADState.IDLE
        # Feed speech with flag True - should still be detected as SPEECH
        state = vad.process_chunk(_generate_speech_chunk(), is_assistant_speaking=True)
        assert state == VADState.SPEECH

    def test_on_speech_start_fires_once_per_utterance(self):
        """Callback triggers once at utterance onset, not repeatedly on each frame."""
        calls = []

        def callback():
            calls.append(True)

        vad = VoiceActivityDetector(energy_threshold=100, on_speech_start=callback)
        # First utterance triggers callback
        vad.process_chunk(_generate_speech_chunk())
        assert len(calls) == 1

        # Additional speech chunks while still SPEECH should not fire again
        for _ in range(3):
            vad.process_chunk(_generate_speech_chunk())
        assert len(calls) == 1

        # End utterance with sufficient silence so VAD returns to IDLE
        for _ in range(6):
            vad.process_chunk(_generate_silence_chunk())

        # Second utterance triggers callback again
        vad.process_chunk(_generate_speech_chunk())
        assert len(calls) == 2

    def test_on_speech_start_suppressed_when_assistant_speaking(self):
        """While assistant is speaking, callback is suppressed until assistant stops."""
        calls = []

        def callback():
            calls.append(True)

        vad = VoiceActivityDetector(energy_threshold=100, on_speech_start=callback)
        # Assistant speaking - flag True, callback should NOT fire
        vad.process_chunk(_generate_speech_chunk(), is_assistant_speaking=True)
        assert len(calls) == 0

        # Assistant stops - flag False, callback should fire on transition
        vad.process_chunk(_generate_speech_chunk(), is_assistant_speaking=False)
        assert len(calls) == 1

    def test_on_speech_start_exception_is_handled(self):
        """Exceptions raised inside on_speech_start callback do not crash the detector."""

        def bad_callback():
            raise RuntimeError("callback failure")

        vad = VoiceActivityDetector(energy_threshold=100, on_speech_start=bad_callback)
        state = vad.process_chunk(_generate_speech_chunk())
        assert state == VADState.SPEECH

    def test_existing_caller_without_new_params_works(self):
        """Backward compatibility: chunk-only invocation works cleanly."""
        vad = VoiceActivityDetector(energy_threshold=100)
        state = vad.process_chunk(_generate_speech_chunk())
        assert state == VADState.SPEECH


# ===========================================================================
# 2. WEBSOCKET BARGE-IN & ECHO REJECTION TESTS
# ===========================================================================


class TestWebsocketBargeIn:
    """Verifies acoustic interruption and echo suppression over WebSocket streams."""

    @pytest.mark.asyncio
    async def test_websocket_barge_in_event_emitted(self):
        """Acoustic speech while assistant_speaking emits barge_in event and preserves turn."""
        sent_events = []
        fake_websocket = MagicMock()
        fake_websocket.accept = AsyncMock()

        async def mock_send_text(text: str):
            sent_events.append(json.loads(text))

        fake_websocket.send_text = AsyncMock(side_effect=mock_send_text)

        # Feed 2 consecutive speech chunks (satisfies 64ms streak verification for barge-in)
        speech_chunk1 = _generate_speech_chunk(length=512, offset_i=0).tobytes()
        speech_chunk2 = _generate_speech_chunk(length=512, offset_i=1).tobytes()

        messages = [
            {"text": json.dumps({"type": "assistant_speaking", "status": True})},
            {"bytes": speech_chunk1},
            {"bytes": speech_chunk2},
        ]

        async def mock_receive():
            if messages:
                return messages.pop(0)
            raise WebSocketDisconnect()

        fake_websocket.receive = AsyncMock(side_effect=mock_receive)

        await voice_websocket_stream(fake_websocket)

        barge_in_events = [e for e in sent_events if e.get("event") == "barge_in"]
        assert len(barge_in_events) >= 1
        assert "Acoustic interruption" in barge_in_events[0]["message"]

    @pytest.mark.asyncio
    async def test_low_energy_echo_leak_does_not_trigger_barge_in(self):
        """Residual low-energy speaker echo does not falsely trigger barge_in."""
        sent_events = []
        fake_websocket = MagicMock()
        fake_websocket.accept = AsyncMock()

        async def mock_send_text(text: str):
            sent_events.append(json.loads(text))

        fake_websocket.send_text = AsyncMock(side_effect=mock_send_text)

        echo_chunk1 = _generate_low_echo_leak_chunk(length=512).tobytes()
        echo_chunk2 = _generate_low_echo_leak_chunk(length=512).tobytes()

        messages = [
            {"text": json.dumps({"type": "assistant_speaking", "status": True})},
            {"bytes": echo_chunk1},
            {"bytes": echo_chunk2},
        ]

        async def mock_receive():
            if messages:
                return messages.pop(0)
            raise WebSocketDisconnect()

        fake_websocket.receive = AsyncMock(side_effect=mock_receive)

        await voice_websocket_stream(fake_websocket)

        barge_in_events = [e for e in sent_events if e.get("event") == "barge_in"]
        assert len(barge_in_events) == 0, "Low-energy echo should not trigger barge-in!"
