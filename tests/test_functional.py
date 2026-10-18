"""
Seyal AI Functional Testing Suite.

Verifies that specific system features and business functions operate
strictly in accordance with functional specifications:
1. Audio & Voice Signal Functionality (PCM processing, energy thresholds, VAD state transitions).
2. Desktop Computer-Use Action Functionality (Screen bounds clamping, click/type action validation).
3. Filesystem Tool Functionality (Safe creation, reading, and confirmed deletion protocols).
4. Earcon & Auditory Feedback Functionality (Tone mapping, sound cues for state changes).
5. Conversational Context & Memory Window Functionality (Turn limits, working memory preservation).
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from seyal_ai.accessibility.audio_feedback import _EARCON_TONES, AudioFeedbackManager, EarconType
from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.core.context import ContextManager
from seyal_ai.tools.system.files import CreateFileTool, DeletePathTool, ReadFileTool
from seyal_ai.voice.vad import VADState, VoiceActivityDetector

# ===========================================================================
# 1. AUDIO & VOICE SIGNAL FUNCTIONALITY
# ===========================================================================


class TestAudioVoiceFunctionality:
    """Tests for audio processing, energy measurement, and voice activity state transitions."""

    def test_functional_vad_silence_stays_idle(self):
        """Functional requirement: Pure silence audio chunks must keep VAD in IDLE state."""
        vad = VoiceActivityDetector(sample_rate=16000, energy_threshold=100)
        silence_chunk = np.zeros(512, dtype=np.int16)

        state = vad.process_chunk(silence_chunk)
        assert state == VADState.IDLE
        assert vad.state == VADState.IDLE

    def test_functional_vad_speech_detection_and_segment_retrieval(self):
        """Functional requirement: Sufficient energy audio chunks trigger SPEECH state and segment buffering."""
        vad = VoiceActivityDetector(sample_rate=16000, energy_threshold=50)

        # Generate loud artificial sine wave chunk (amplitude 5000 -> well above energy threshold)
        t = np.linspace(0, 0.032, 512, endpoint=False)
        loud_chunk = (5000 * np.sin(2 * np.pi * 440 * t)).astype(np.int16)

        state = vad.process_chunk(loud_chunk)
        assert state == VADState.SPEECH

        # Retrieve buffered speech segment
        segment = vad.get_speech_segment()
        assert segment is not None
        assert len(segment) >= 512


# ===========================================================================
# 2. DESKTOP COMPUTER-USE ACTION FUNCTIONALITY
# ===========================================================================


class TestComputerUseActionFunctionality:
    """Tests for coordinate clamping, display safety boundaries, and action schemas."""

    def test_functional_screen_coordinate_clamping(self):
        """Functional requirement: Out-of-bounds coordinates must clamp safely to screen edges."""
        executor = ComputerActionExecutor()
        width, height = executor.screen_dimensions

        # Extreme negative coordinates clamp to (0, 0)
        cx, cy = executor._clamp_coordinates(-500, -999)
        assert cx == 0
        assert cy == 0

        # Beyond screen boundaries clamp to (width - 1, height - 1)
        cx_max, cy_max = executor._clamp_coordinates(width + 1000, height + 2000)
        assert cx_max == width - 1
        assert cy_max == height - 1

        # In-bounds coordinates remain untouched
        normal_x, normal_y = width // 2, height // 2
        norm_cx, norm_cy = executor._clamp_coordinates(normal_x, normal_y)
        assert norm_cx == normal_x
        assert norm_cy == normal_y

    def test_functional_computer_action_schema_validation(self):
        """Functional requirement: ComputerAction schemas must properly serialize action types and parameters."""
        click_action = ComputerAction(
            action_type=ActionType.CLICK,
            x=250,
            y=450,
            clicks=1,
            reasoning="Click primary submit button",
        )
        assert click_action.action_type == ActionType.CLICK
        assert click_action.x == 250
        assert click_action.y == 450
        assert click_action.clicks == 1
        assert click_action.reasoning == "Click primary submit button"

        type_action = ComputerAction(
            action_type=ActionType.TYPE_TEXT,
            text="Hello Seyal AI",
            reasoning="Type user prompt into field",
        )
        assert type_action.action_type == ActionType.TYPE_TEXT
        assert type_action.text == "Hello Seyal AI"
        assert type_action.reasoning == "Type user prompt into field"


# ===========================================================================
# 3. FILESYSTEM TOOLS FUNCTIONALITY
# ===========================================================================


class TestFilesystemToolsFunctionality:
    """Tests for safe filesystem manipulation, confirmation tokens, and reading."""

    @pytest.mark.asyncio
    async def test_functional_create_and_read_file(self, tmp_path: Path):
        """Functional requirement: Files must be created and readable with exact byte integrity."""
        create_tool = CreateFileTool()
        read_tool = ReadFileTool()

        test_file = tmp_path / "functional_spec.txt"
        test_payload = "Functional Verification Content: All operations nominal."

        # Create
        res_create = await create_tool.execute(path=str(test_file), content=test_payload)
        assert res_create.success is True
        assert test_file.exists()

        # Read
        res_read = await read_tool.execute(path=str(test_file))
        assert res_read.success is True
        assert test_payload in res_read.output

    @pytest.mark.asyncio
    async def test_functional_delete_requires_confirmed_flag(self, tmp_path: Path):
        """Functional requirement: Destructive deletions without confirmed=True must be rejected."""
        create_tool = CreateFileTool()
        delete_tool = DeletePathTool()

        test_file = tmp_path / "protected_target.txt"
        await create_tool.execute(path=str(test_file), content="Guardrail safety check")
        assert test_file.exists()

        # Attempt deletion without confirmed=True -> MUST FAIL
        unconfirmed_res = await delete_tool.execute(path=str(test_file), confirmed=False)
        assert unconfirmed_res.success is False
        assert test_file.exists(), "File was deleted without explicit confirmation!"

        # Deletion with confirmed=True -> MUST SUCCEED
        confirmed_res = await delete_tool.execute(path=str(test_file), confirmed=True)
        assert confirmed_res.success is True
        assert not test_file.exists()


# ===========================================================================
# 4. EARCON & AUDITORY FEEDBACK FUNCTIONALITY
# ===========================================================================


class TestAuditoryFeedbackFunctionality:
    """Tests for earcon audio frequency specifications and accessibility cues."""

    def test_functional_earcon_tone_specifications(self):
        """Functional requirement: Every EarconType must have valid frequency and duration tone specifications."""
        for earcon in EarconType:
            assert earcon in _EARCON_TONES, f"EarconType '{earcon}' is missing tone mapping!"
            tones = _EARCON_TONES[earcon]
            assert len(tones) > 0
            for tone in tones:
                assert tone.frequency_hz > 0
                assert tone.duration_ms > 0

    def test_functional_audio_feedback_manager_trigger_no_crash(self):
        """Functional requirement: Feedback manager methods execute cleanly without throwing errors."""
        audio_mgr = AudioFeedbackManager(enabled=False)
        # Should execute safely even without audio hardware
        audio_mgr.on_wake()
        audio_mgr.on_success()
        audio_mgr.on_error()
        audio_mgr.on_confirmation()
        audio_mgr.on_emergency_stop()


# ===========================================================================
# 5. CONVERSATIONAL CONTEXT FUNCTIONALITY
# ===========================================================================


class TestConversationalContextFunctionality:
    """Tests for working memory turn limits, message appending, and system prompt preservation."""

    def test_functional_context_manager_turn_pruning(self):
        """Functional requirement: Messages beyond max_turns must prune cleanly while preserving system prompt."""
        ctx = ContextManager(max_turns=3)
        ctx.set_system_prompt("You are Seyal AI assistant.")

        # Add 5 user and assistant turns
        for i in range(1, 6):
            ctx.add_user_message(f"User message {i}")
            ctx.add_assistant_message(f"Assistant reply {i}")

        messages = ctx.get_messages()

        # System prompt is always message 0
        assert messages[0].role == "system"
        assert "Seyal AI" in messages[0].content

        # Total conversation turns should be bounded by working memory max_turns
        dialog_messages = [m for m in messages if m.role != "system"]
        # 3 turns = 6 messages (3 user + 3 assistant)
        assert len(dialog_messages) <= 6
