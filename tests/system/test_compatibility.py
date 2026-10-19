"""
Seyal AI Compatibility Testing Suite.

Verifies cross-platform, multi-environment, multi-resolution, and multilingual compatibility
across all core subsystems of Seyal AI:
1. COMPAT-01: Multi-Resolution & DPI Display Geometry Compatibility (1080p, 4K, Ultrawide, Laptop).
2. COMPAT-02: Unicode & Script Encoding Compatibility (Tamil, Tanglish, Latin, Emojis).
3. COMPAT-03: Multi-Sample Rate Audio Processing Compatibility (16kHz, 44.1kHz, 48kHz).
4. COMPAT-04: Cross-Platform Path Formatting Compatibility (Windows Backslashes vs POSIX Forward Slashes).
5. COMPAT-05: Multi-Shell Command Dialect Security Compatibility (CMD, PowerShell, Bash).
6. COMPAT-06: Action Primitive Schema Backward & Forward Compatibility.
7. COMPAT-07: Telemetry Hub WebSocket Payload JSON Serialization Compatibility.
8. COMPAT-08: Earcon Sound Subsystem Platform Fallback Compatibility.
9. COMPAT-09: Universal Shortcut Resolution Multi-Language Compatibility.
10. COMPAT-10: Conversational Context Manager Provider Message Schema Compatibility.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

from seyal_ai.accessibility.audio_feedback import AudioFeedbackManager
from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.agents.computer_use.shortcuts import detect_fast_shortcut
from seyal_ai.core.context import ContextManager
from seyal_ai.core.telemetry_hub import TelemetryHub
from seyal_ai.security.terminal_security import CommandSafetyStatus, TerminalSecurityClassifier
from seyal_ai.tools.system.files import CreateFileTool, ReadFileTool
from seyal_ai.voice.vad import VADState, VoiceActivityDetector

# ===========================================================================
# 1. MULTI-RESOLUTION & DISPLAY GEOMETRY COMPATIBILITY
# ===========================================================================


class TestDisplayResolutionCompatibility:
    """Verifies screen geometry and coordinate clamping across diverse resolutions and aspect ratios."""

    def test_compat_screen_coordinate_clamping_across_multiple_resolutions(self):
        """
        COMPAT-01: Screen coordinate clamping must adapt dynamically to standard monitor resolutions:
        1080p (1920x1080), 4K UHD (3840x2160), Ultrawide (3440x1440), Laptop (1366x768), and Portrait (1080x1920).
        """
        resolutions = [
            (1920, 1080, "1080p Standard"),
            (3840, 2160, "4K UHD"),
            (3440, 1440, "Ultrawide 21:9"),
            (1366, 768, "Compact Laptop"),
            (1080, 1920, "Portrait Display"),
        ]

        executor = ComputerActionExecutor()

        for width, height, label in resolutions:
            with patch.object(executor, "_refresh_screen_geometry"):
                executor._screen_width = width
                executor._screen_height = height

                # Test 1: Negative coordinates clamp to origin (0, 0)
                cx_min, cy_min = executor._clamp_coordinates(-100, -250)
                assert cx_min == 0, f"Failed min X on {label}"
                assert cy_min == 0, f"Failed min Y on {label}"

                # Test 2: In-bounds coordinates remain intact
                mid_x, mid_y = width // 2, height // 2
                cx_mid, cy_mid = executor._clamp_coordinates(mid_x, mid_y)
                assert cx_mid == mid_x, f"Failed mid X on {label}"
                assert cy_mid == mid_y, f"Failed mid Y on {label}"

                # Test 3: Oversized coordinates clamp to (width - 1, height - 1)
                cx_max, cy_max = executor._clamp_coordinates(width + 1000, height + 1000)
                assert cx_max == width - 1, f"Failed max X on {label}"
                assert cy_max == height - 1, f"Failed max Y on {label}"


# ===========================================================================
# 2. UNICODE & MULTI-SCRIPT ENCODING COMPATIBILITY
# ===========================================================================


class TestUnicodeScriptCompatibility:
    """Verifies UTF-8 encoding support for pure Tamil script, Tanglish, and emojis."""

    @pytest.mark.asyncio
    async def test_compat_tamil_script_and_emoji_file_io(self, tmp_path: Path):
        """
        COMPAT-02: Filesystem tools and context manager must seamlessly process pure Tamil
        Unicode text and emojis without UnicodeEncodeError or character corruption.
        """
        create_tool = CreateFileTool()
        read_tool = ReadFileTool()

        tamil_file = tmp_path / "செயல்_ai_குறிப்பு.txt"
        tamil_payload = (
            "செயல் AI - செயற்கை நுண்ணறிவு உதவியாளர் 🚀\n"
            "தமிழ் மற்றும் ஆங்கிலம் இரண்டு மொழிகளிலும் செயல்படும்.\n"
            "வணக்கம்! 👋 All systems nominal."
        )

        # Write UTF-8 Tamil text
        write_res = await create_tool.execute(path=str(tamil_file), content=tamil_payload)
        assert write_res.success

        # Read back and verify exact character preservation
        read_res = await read_tool.execute(path=str(tamil_file))
        assert read_res.success
        assert "செயல் AI" in read_res.output
        assert "🚀" in read_res.output
        assert "வணக்கம்!" in read_res.output

        # Context manager Unicode handling
        ctx = ContextManager()
        ctx.set_system_prompt("செயல் AI உதவியாளர்")
        ctx.add_user_message("மவுஸ் வச்சு கிளிக் பண்ணு 👍")
        messages = ctx.get_messages()

        assert "செயல் AI உதவியாளர்" in messages[0].content
        assert "👍" in messages[1].content


# ===========================================================================
# 3. AUDIO MULTI-SAMPLE RATE COMPATIBILITY
# ===========================================================================


class TestAudioSampleRateCompatibility:
    """Verifies VAD compatibility across standard hardware sample rates."""

    def test_compat_vad_across_varying_sample_rates(self):
        """
        COMPAT-03: VAD must process audio chunks reliably across standard microphone
        sample rates: 16,000 Hz, 44,100 Hz, and 48,000 Hz without exceptions.
        """
        sample_rates = [16000, 44100, 48000]

        for sr in sample_rates:
            vad = VoiceActivityDetector(sample_rate=sr, energy_threshold=50)

            # Generate 30ms audio chunk for each sample rate
            chunk_size = int(sr * 0.030)
            t = np.linspace(0, 0.030, chunk_size, endpoint=False)
            speech_chunk = (4000 * np.sin(2 * np.pi * 440 * t)).astype(np.int16)

            state = vad.process_chunk(speech_chunk)
            assert state in (VADState.SPEECH, VADState.IDLE)
            vad.get_speech_segment()
            vad.reset()
            assert vad.state == VADState.IDLE


# ===========================================================================
# 4. CROSS-PLATFORM PATH COMPATIBILITY
# ===========================================================================


class TestPathFormatCompatibility:
    """Verifies compatibility with Windows backslashes, POSIX forward slashes, and mixed paths."""

    @pytest.mark.asyncio
    async def test_compat_mixed_path_separators_normalization(self, tmp_path: Path):
        """
        COMPAT-04: Filesystem operations must normalize both Windows backslash paths
        and POSIX forward slash paths without path resolution failures.
        """
        create_tool = CreateFileTool()
        read_tool = ReadFileTool()

        # Path 1: POSIX forward slashes
        posix_path_str = f"{tmp_path.as_posix()}/posix_compatible_file.txt"
        res_posix = await create_tool.execute(path=posix_path_str, content="POSIX Path Content")
        assert res_posix.success

        read_posix = await read_tool.execute(path=posix_path_str)
        assert read_posix.success
        assert "POSIX Path Content" in read_posix.output

        # Path 2: Windows native backslashes
        win_path_str = str(tmp_path / "windows_native_file.txt")
        res_win = await create_tool.execute(path=win_path_str, content="Windows Native Content")
        assert res_win.success

        read_win = await read_tool.execute(path=win_path_str)
        assert read_win.success
        assert "Windows Native Content" in read_win.output


# ===========================================================================
# 5. MULTI-SHELL COMMAND DIALECT SECURITY COMPATIBILITY
# ===========================================================================


class TestShellDialectSecurityCompatibility:
    """Verifies security firewall intercepts dangerous commands across CMD, PowerShell, and Bash."""

    def test_compat_terminal_security_across_shell_dialects(self):
        """
        COMPAT-05: TerminalSecurityClassifier must recognize and block dangerous patterns
        from Command Prompt (cmd.exe), PowerShell, and Unix/Bash environments.
        """
        guard = TerminalSecurityClassifier()

        dialect_test_matrix = [
            # PowerShell dialect
            ("Remove-Item -Recurse -Force C:\\Windows", CommandSafetyStatus.BLOCKED, "PowerShell"),
            ("Stop-Computer -Force", CommandSafetyStatus.CONFIRM_REQUIRED, "PowerShell"),
            ("Get-Process", CommandSafetyStatus.ALLOWED, "PowerShell"),
            # Command Prompt (CMD) dialect
            ("format C: /fs:NTFS", CommandSafetyStatus.BLOCKED, "CMD"),
            ("rmdir /s /q C:\\Windows", CommandSafetyStatus.BLOCKED, "CMD"),
            ("dir /w", CommandSafetyStatus.ALLOWED, "CMD"),
            # Bash / WSL dialect
            ("rm -rf /", CommandSafetyStatus.BLOCKED, "Bash"),
            ("kill -9 1234", CommandSafetyStatus.CONFIRM_REQUIRED, "Bash"),
            ("ls -la", CommandSafetyStatus.ALLOWED, "Bash"),
        ]

        for command, expected_status, dialect in dialect_test_matrix:
            result = guard.analyze(command)
            assert result.status == expected_status, (
                f"Failed {dialect} command safety check for '{command}': "
                f"expected {expected_status}, got {result.status}"
            )


# ===========================================================================
# 6. ACTION SCHEMA BACKWARD & FORWARD COMPATIBILITY
# ===========================================================================


class TestActionSchemaCompatibility:
    """Verifies ComputerAction handles optional, partial, and extended parameters compatibly."""

    def test_compat_computer_action_optional_parameter_variations(self):
        """
        COMPAT-06: ComputerAction dataclass must deserialize and construct seamlessly
        whether provided minimal required fields or full extended telemetry metadata.
        """
        # Minimal action
        minimal_action = ComputerAction(action_type=ActionType.CLICK)
        assert minimal_action.action_type == ActionType.CLICK
        assert minimal_action.x is None
        assert minimal_action.clicks == 1

        # Fully populated action
        full_action = ComputerAction(
            action_type=ActionType.MOUSE_DRAG,
            x=100,
            y=200,
            end_x=500,
            end_y=600,
            clicks=2,
            seconds=0.5,
            reasoning="Drag item across desktop",
            metadata={"source": "agent_v2", "confidence": 0.98},
        )
        assert full_action.end_x == 500
        assert full_action.metadata["confidence"] == 0.98


# ===========================================================================
# 7. TELEMETRY HUB JSON COMPATIBILITY FOR WEBSOCKETS
# ===========================================================================


class TestTelemetryJSONCompatibility:
    """Verifies all TelemetryHub state representations serialize cleanly into standard JSON."""

    def test_compat_telemetry_hub_json_serialization_for_websockets(self):
        """
        COMPAT-07: TelemetryHub active state, progress metrics, and live narratives
        must serialize into standard JSON without type errors for frontend WebSocket consumers.
        """
        hub = TelemetryHub.get_instance()
        task_id = "compat_websocket_task_01"

        state = hub.register_task(task_id, goal="Synchronize remote files", max_steps=8)
        hub.update_task_progress(task_id, step=4, thought="Scanning directory", action_summary="Comparing hashes")

        narrative = hub.get_live_status_narrative()

        # Build WebSocket message payload
        ws_payload = {
            "type": "telemetry_update",
            "task_id": state.task_id,
            "goal": state.goal,
            "current_step": state.current_step,
            "max_steps": state.max_steps,
            "progress_percent": state.progress_percent,
            "is_active": state.is_active,
            "status_summary": state.status_summary,
            "narrative": narrative,
        }

        # Must serialize cleanly using standard json.dumps
        serialized_json = json.dumps(ws_payload)
        assert serialized_json is not None
        assert "Synchronize remote files" in serialized_json

        # Complete and clean up
        hub.complete_task(task_id, success=True)


# ===========================================================================
# 8. EARCON SOUND SUBSYSTEM PLATFORM FALLBACK COMPATIBILITY
# ===========================================================================


class TestAudioFeedbackPlatformCompatibility:
    """Verifies AudioFeedbackManager operates smoothly in headless and cross-platform environments."""

    def test_compat_audio_feedback_headless_and_driver_fallback(self):
        """
        COMPAT-08: Audio feedback manager must handle execution cleanly whether audio
        drivers are present or disabled, preventing crashes on headless CI runners.
        """
        # Test 1: Enabled mode with mocked system audio
        audio_mgr = AudioFeedbackManager(enabled=True)
        with patch.object(audio_mgr, "_play_tones") as mock_play:
            audio_mgr.on_wake()
            audio_mgr.on_success()
            audio_mgr.on_error()
            assert mock_play.call_count == 3

        # Test 2: Disabled mode -> No-op execution
        disabled_mgr = AudioFeedbackManager(enabled=False)
        with patch.object(disabled_mgr, "_play_tones") as mock_play_disabled:
            disabled_mgr.on_wake()
            assert mock_play_disabled.call_count == 0


# ===========================================================================
# 9. UNIVERSAL SHORTCUT MULTILINGUAL COMPATIBILITY
# ===========================================================================


class TestShortcutMultilingualCompatibility:
    """Verifies shortcut acceleration resolves across English, Tanglish, and Tamil."""

    def test_compat_shortcut_resolution_across_languages(self):
        """
        COMPAT-09: Universal shortcut engine must map desktop actions to proper hotkeys
        consistently across English, Tanglish, and pure Tamil phrases.
        """
        language_shortcut_matrix = [
            ("select all", "ctrl+a", "English"),
            ("ellathaiyum select pannu", "ctrl+a", "Tanglish"),
            ("அனைத்தையும் தேர்ந்தெடு", "ctrl+a", "Tamil"),
            ("save file", "ctrl+s", "English"),
            ("save pannu", "ctrl+s", "Tanglish"),
            ("கோப்பை சேமி", "ctrl+s", "Tamil"),
            ("open new tab", "ctrl+t", "English"),
            ("pudhu tab open pannu", "ctrl+t", "Tanglish"),
        ]

        for phrase, expected_hotkey, lang in language_shortcut_matrix:
            action = detect_fast_shortcut(phrase)
            assert action is not None, f"Failed to match {lang} shortcut: '{phrase}'"
            assert action.key == expected_hotkey, (
                f"Mismatch for {lang} '{phrase}': expected {expected_hotkey}, got {action.key}"
            )


# ===========================================================================
# 10. CONTEXT MANAGER PROVIDER SCHEMA COMPATIBILITY
# ===========================================================================


class TestContextSchemaCompatibility:
    """Verifies ContextManager message formats are compatible with Gemini, Anthropic, and OpenAI."""

    def test_compat_context_manager_message_schema(self):
        """
        COMPAT-10: ContextManager must produce LLMMessage objects with valid roles ('system',
        'user', 'assistant', 'tool') compatible with all supported LLM provider APIs.
        """
        ctx = ContextManager()
        ctx.set_system_prompt("You are Seyal AI, an intelligent desktop assistant.")
        ctx.add_user_message("Summarize system logs")
        ctx.add_assistant_message("Checking system logs...")
        ctx.add_tool_result(tool_call_id="call_001", tool_name="log_reader", result="All systems operational")

        messages = ctx.get_messages()

        valid_roles = {"system", "user", "assistant", "tool"}
        for msg in messages:
            assert msg.role in valid_roles
            assert msg.content is not None
            assert isinstance(msg.content, str)

        # System message is first
        assert messages[0].role == "system"
        # Tool message retains tool_call_id
        tool_msg = next(m for m in messages if m.role == "tool")
        assert tool_msg.tool_call_id == "call_001"
        assert tool_msg.name == "log_reader"
