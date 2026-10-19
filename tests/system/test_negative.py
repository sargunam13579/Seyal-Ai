"""
Seyal AI Negative Testing Suite.

Verifies system resilience, defensive programming, and graceful failure handling
when subjected to invalid, malformed, out-of-bounds, or unexpected inputs:
1. NEGATIVE-01: Malformed & Empty Audio Chunks to VAD (Zero-length, silence, truncated).
2. NEGATIVE-02: Non-Existent Files, Directory-as-File & Overwrite Violations.
3. NEGATIVE-03: Out-of-Bounds & Negative Screen Coordinates (Clamping resilience).
4. NEGATIVE-04: Non-Existent & Invalid Task Cancellation Requests.
5. NEGATIVE-05: Malformed & Unparseable JSON Responses from LLM (Fallback resilience).
6. NEGATIVE-06: Null, Empty, and Whitespace-Only Language Inputs.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.llm.prompts.language_guardrail import is_tanglish_style, resolve_language_signals
from seyal_ai.llm.providers.base import LLMResponse
from seyal_ai.planning.cancellation import CancellationManager
from seyal_ai.planning.task_classifier import TaskSemanticClassifier
from seyal_ai.planning.task_types import TaskIntentType, TaskType
from seyal_ai.tools.system.files import CreateFileTool, ReadFileTool
from seyal_ai.voice.vad import VADState, VoiceActivityDetector

# ===========================================================================
# 1. MALFORMED & EMPTY AUDIO NEGATIVE TESTS
# ===========================================================================


class TestAudioNegativeHandling:
    """Verifies that invalid, zero-length, or empty audio buffers do not crash VAD or audio engines."""

    def test_negative_empty_audio_chunk_does_not_crash(self):
        """Negative test: Feeding empty numpy array to VAD must return IDLE without throwing exceptions."""
        vad = VoiceActivityDetector(sample_rate=16000)
        empty_chunk = np.array([], dtype=np.int16)

        state = vad.process_chunk(empty_chunk)
        assert state == VADState.IDLE
        assert vad.state == VADState.IDLE

    def test_negative_get_speech_segment_when_no_speech_recorded(self):
        """Negative test: Requesting speech segment when only silence occurred returns empty/None safely."""
        vad = VoiceActivityDetector(sample_rate=16000)
        vad.reset()

        segment = vad.get_speech_segment()
        # Must return empty ndarray or None, never raise IndexError
        assert segment is None or len(segment) == 0


# ===========================================================================
# 2. FILESYSTEM ERROR-PATH NEGATIVE TESTS
# ===========================================================================


class TestFilesystemNegativeHandling:
    """Verifies that file tool operations handle invalid paths and collisions gracefully."""

    @pytest.mark.asyncio
    async def test_negative_read_non_existent_file(self, tmp_path: Path):
        """Negative test: Reading a non-existent file must return ToolResult.fail without crashing."""
        read_tool = ReadFileTool()
        ghost_path = tmp_path / "this_file_does_not_exist_at_all.log"

        result = await read_tool.execute(path=str(ghost_path))
        assert result.success is False
        assert "not found" in result.output.lower() or "not found" in (result.error or "").lower()

    @pytest.mark.asyncio
    async def test_negative_read_directory_as_file(self, tmp_path: Path):
        """Negative test: Reading a directory path as if it were a text file must fail gracefully."""
        read_tool = ReadFileTool()
        sub_dir = tmp_path / "test_directory"
        sub_dir.mkdir(parents=True, exist_ok=True)

        result = await read_tool.execute(path=str(sub_dir))
        assert result.success is False
        assert "directory" in result.output.lower() or "directory" in (result.error or "").lower()

    @pytest.mark.asyncio
    async def test_negative_create_file_collision_without_overwrite(self, tmp_path: Path):
        """Negative test: Attempting to create a file where one already exists without overwrite=True must fail."""
        create_tool = CreateFileTool()
        existing_file = tmp_path / "existing_manifest.txt"
        existing_file.write_text("Existing data", encoding="utf-8")

        # Second creation without overwrite
        result = await create_tool.execute(
            path=str(existing_file),
            content="New overwriting data",
            overwrite=False,
        )
        assert result.success is False
        assert "already exists" in result.output.lower() or "already exists" in (result.error or "").lower()
        # Ensure original file was NOT overwritten
        assert existing_file.read_text(encoding="utf-8") == "Existing data"


# ===========================================================================
# 3. OUT-OF-BOUNDS COORDINATES NEGATIVE TESTS
# ===========================================================================


class TestCoordinatesNegativeHandling:
    """Verifies that out-of-bounds, negative, or invalid desktop coordinates clamp safely."""

    def test_negative_extreme_negative_coordinates_clamped(self):
        """Negative test: Coordinates far off-screen in the negative range clamp safely to (0, 0)."""
        executor = ComputerActionExecutor()
        cx, cy = executor._clamp_coordinates(-999999, -888888)
        assert cx == 0
        assert cy == 0

    def test_negative_extreme_positive_coordinates_clamped(self):
        """Negative test: Coordinates beyond 4K/8K resolution clamp safely to maximum display bounds."""
        executor = ComputerActionExecutor()
        width, height = executor.screen_dimensions
        cx, cy = executor._clamp_coordinates(999999, 999999)
        assert cx == width - 1
        assert cy == height - 1

    def test_negative_none_coordinates_clamped_to_zero(self):
        """Negative test: Passing None as coordinate values defaults safely to (0, 0)."""
        executor = ComputerActionExecutor()
        cx, cy = executor._clamp_coordinates(None, None)
        assert cx == 0
        assert cy == 0


# ===========================================================================
# 4. TASK CANCELLATION NEGATIVE TESTS
# ===========================================================================


class TestTaskCancellationNegativeHandling:
    """Verifies that cancelling invalid or non-existent tasks does not raise exceptions."""

    def test_negative_cancel_non_existent_plan_returns_false(self):
        """Negative test: Requesting cancellation on an invalid/non-existent plan_id returns False cleanly."""
        cancel_mgr = CancellationManager()
        success = cancel_mgr.cancel_task("ghost_plan_invalid_99999")
        assert success is False

    def test_negative_get_token_non_existent_plan_returns_none(self):
        """Negative test: Retrieving a cancellation token for a non-existent task returns None cleanly."""
        cancel_mgr = CancellationManager()
        token = cancel_mgr.get_token("non_existent_plan_id")
        assert token is None


# ===========================================================================
# 5. CORRUPTED LLM RESPONSE RECOVERY NEGATIVE TESTS
# ===========================================================================


class TestLLMResponseNegativeRecovery:
    """Verifies that corrupted, malformed, or unparseable LLM output falls back gracefully."""

    @pytest.mark.asyncio
    async def test_negative_corrupted_json_classification_fallback(self):
        """Negative test: If LLM returns corrupted non-JSON text, classifier falls back to generic task safely."""
        mock_router = MagicMock()
        mock_router.initialize = AsyncMock()
        mock_router.generate = AsyncMock(return_value=LLMResponse(content="<<<FATAL ERROR: INVALID JSON PARSE 500>>>"))

        classifier = TaskSemanticClassifier(router=mock_router)
        spec = await classifier.classify_instruction("Create backup folder on desktop")

        # Must recover with valid default fallback spec, never crash with JSONDecodeError
        assert spec is not None
        assert spec.intent_type == TaskIntentType.TASK
        assert spec.task_type == TaskType.IMMEDIATE


# ===========================================================================
# 6. NULL & EMPTY LANGUAGE INPUT NEGATIVE TESTS
# ===========================================================================


class TestLanguageInputNegativeHandling:
    """Verifies that null, empty, or whitespace-only inputs do not crash language resolution."""

    def test_negative_null_input_language_resolution(self):
        """Negative test: None or empty input defaults safely to universal English resolution."""
        res_none = resolve_language_signals(current_input=None)
        assert res_none.language_code == "en"
        assert res_none.is_tanglish is False

        res_empty = resolve_language_signals(current_input="")
        assert res_empty.language_code == "en"

        res_spaces = resolve_language_signals(current_input="   \t\n  ")
        assert res_spaces.language_code == "en"

    def test_negative_null_input_tanglish_detection(self):
        """Negative test: is_tanglish_style returns False on None, empty, or whitespace strings."""
        assert is_tanglish_style(None) is False
        assert is_tanglish_style("") is False
        assert is_tanglish_style("    ") is False
