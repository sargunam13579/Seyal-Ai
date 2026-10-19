"""
Seyal AI — Comprehensive Accessibility & Voice Navigation Test Suite.

Validates the full accessibility lifecycle:
  - Earcon audio cue types and acoustic tone specifications
  - AudioFeedbackManager state changes, volume scaling, and headless fallback
  - Default accessibility voice macros (morning routine, focus mode, wrap up day)
  - Custom voice shortcut registration and local JSON persistence
  - Shorthand macro expansion (exact phrase and boundary substring matching)
  - Custom command deletion and disabled state interception
  - Screen reader text sanitization (ANSI codes, markdown links, code blocks)
  - Verbal multi-step progress announcements for non-visual operation
  - Natural spoken system diagnostic formatting
  - Hands-free voice macro pipeline integration
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

from seyal_ai.accessibility.audio_feedback import (
    _EARCON_TONES,
    AudioFeedbackManager,
    EarconType,
    ToneSpec,
)
from seyal_ai.accessibility.custom_commands import (
    CustomCommandManager,
)
from seyal_ai.accessibility.voice_navigation import VoiceNavigationEngine

# ===========================================================================
# 1. EARCON SOUND CUE TYPES & ACOUSTIC TONE SPECS (ACC-01)
# ===========================================================================


class TestEarconToneSpecifications:
    """Verifies that all required earcons have distinct acoustic frequency profiles."""

    def test_acc01_all_earcon_types_defined(self):
        """Verifies all 6 mandatory agent state earcons are configured."""
        assert EarconType.WAKE == "wake"
        assert EarconType.SUCCESS == "success"
        assert EarconType.ERROR == "error"
        assert EarconType.CONFIRMATION_REQUIRED == "confirmation"
        assert EarconType.EMERGENCY_STOP == "emergency_stop"
        assert EarconType.PROCESSING == "processing"

    def test_acc01_tone_frequencies_and_durations_contrast(self):
        """Each earcon has valid frequency (Hz) and duration (ms) specifications."""
        for earcon_type in EarconType:
            tones = _EARCON_TONES.get(earcon_type)
            assert tones is not None
            assert len(tones) >= 1
            for tone in tones:
                assert isinstance(tone, ToneSpec)
                assert 200 <= tone.frequency_hz <= 2000
                assert 50 <= tone.duration_ms <= 500

        # Success earcon has ascending pitch (523Hz -> 659Hz -> 784Hz)
        success_tones = _EARCON_TONES[EarconType.SUCCESS]
        assert success_tones[0].frequency_hz < success_tones[1].frequency_hz < success_tones[2].frequency_hz

        # Error earcon has descending pitch (300Hz -> 220Hz)
        error_tones = _EARCON_TONES[EarconType.ERROR]
        assert error_tones[0].frequency_hz > error_tones[1].frequency_hz


# ===========================================================================
# 2. AUDIO FEEDBACK MANAGER PLAYBACK & VOLUME SCALING (ACC-02)
# ===========================================================================


class TestAudioFeedbackManager:
    """Verifies earcon dispatch, volume clamping, and headless fallback."""

    def test_acc02_volume_clamping_and_toggle(self):
        """Volume is clamped to [0.0, 1.0] and disabled manager emits no sounds."""
        mgr_loud = AudioFeedbackManager(enabled=True, volume=1.8)
        assert mgr_loud.volume == 1.0

        mgr_quiet = AudioFeedbackManager(enabled=True, volume=-0.5)
        assert mgr_quiet.volume == 0.0

        mgr_disabled = AudioFeedbackManager(enabled=False)
        with patch.object(mgr_disabled, "_play_tones") as mock_play:
            mgr_disabled.play_earcon(EarconType.WAKE)
            mock_play.assert_not_called()

    def test_acc02_play_earcon_string_and_enum_dispatch(self):
        """Manager accepts both string names and EarconType enums."""
        mgr = AudioFeedbackManager(enabled=True)

        with patch.object(mgr, "_play_tones") as mock_play:
            mgr.play_earcon("success", async_play=False)
            mock_play.assert_called_once()
            tones, earcon = mock_play.call_args[0]
            assert earcon == EarconType.SUCCESS
            assert len(tones) == 3

    def test_acc02_windows_sound_alias_dispatch_headless_safe(self):
        """Internal _play_tones dispatches to winsound or falls back gracefully without crashing."""
        mgr = AudioFeedbackManager(enabled=True)
        tones = [ToneSpec(440, 100)]

        # Should never raise exception regardless of audio driver presence
        mgr._play_tones(tones, EarconType.SUCCESS)
        mgr._play_tones(tones, EarconType.EMERGENCY_STOP)


# ===========================================================================
# 3. DEFAULT ACCESSIBILITY VOICE MACROS (ACC-03)
# ===========================================================================


class TestDefaultVoiceMacros:
    """Verifies built-in accessibility shortcuts for hands-free daily routines."""

    def test_acc03_default_macros_seeded(self, tmp_path: Path):
        """Initializes default accessibility macros: morning routine, focus mode, wrap up day."""
        cmd_file = tmp_path / "custom_commands.json"
        mgr = CustomCommandManager(storage_path=cmd_file)

        commands = mgr.list_commands()
        phrases = [c.phrase for c in commands]

        assert "morning routine" in phrases
        assert "focus mode" in phrases
        assert "wrap up day" in phrases

        # Verify morning routine actions
        morning_cmd = next(c for c in commands if c.phrase == "morning routine")
        assert "check battery status" in morning_cmd.actions
        assert "open browser" in morning_cmd.actions


# ===========================================================================
# 4. CUSTOM VOICE SHORTCUT REGISTRATION & PERSISTENCE (ACC-04)
# ===========================================================================


class TestCustomVoiceCommandPersistence:
    """Verifies creating, modifying, and disk-persisting custom voice macros."""

    def test_acc04_register_command_and_reload_from_disk(self, tmp_path: Path):
        """New commands save atomically to JSON and survive manager re-instantiation."""
        cmd_file = tmp_path / "commands.json"
        mgr1 = CustomCommandManager(storage_path=cmd_file)

        cmd = mgr1.register_command(
            phrase="prepare coding session",
            actions=["open visual studio code", "start local dev server", "set volume to 30 percent"],
            description="Launches IDE and development tools hands-free.",
        )
        assert cmd.phrase == "prepare coding session"
        assert len(cmd.actions) == 3

        # Verify file exists on disk
        assert cmd_file.exists()
        raw_json = json.loads(cmd_file.read_text(encoding="utf-8"))
        saved_phrases = [c["phrase"] for c in raw_json.get("commands", [])]
        assert "prepare coding session" in saved_phrases

        # Reload in new instance
        mgr2 = CustomCommandManager(storage_path=cmd_file)
        reloaded = mgr2.match_and_expand("prepare coding session")
        assert reloaded == ["open visual studio code", "start local dev server", "set volume to 30 percent"]


# ===========================================================================
# 5. SHORTHAND VOICE TRIGGER EXPANSION (ACC-05)
# ===========================================================================


class TestVoiceTriggerMatchingAndExpansion:
    """Verifies macro expansion across exact and conversational utterances."""

    def test_acc05_exact_and_substring_matching(self, tmp_path: Path):
        """Commands match either as standalone triggers or embedded within conversational speech."""
        cmd_file = tmp_path / "expand.json"
        mgr = CustomCommandManager(storage_path=cmd_file)

        mgr.register_command(
            phrase="take a break",
            actions=["lock screen", "mute audio"],
            match_exact=False,
        )

        # 1. Exact match
        res_exact = mgr.match_and_expand("take a break")
        assert res_exact == ["lock screen", "mute audio"]

        # 2. Conversational prefix / suffix substring
        res_conv = mgr.match_and_expand("Hey Seyal, I want to take a break right now")
        assert res_conv == ["lock screen", "mute audio"]

        # 3. Unrelated utterance returns None
        assert mgr.match_and_expand("What is the current weather forecast?") is None

    def test_acc05_match_exact_flag_enforced(self, tmp_path: Path):
        """Commands with match_exact=True ignore embedded substrings."""
        cmd_file = tmp_path / "exact.json"
        mgr = CustomCommandManager(storage_path=cmd_file)

        mgr.register_command(
            phrase="lock",
            actions=["lock workstation"],
            match_exact=True,
        )

        # Embedded mention should NOT trigger
        assert mgr.match_and_expand("check the door lock") is None

        # Exact trigger triggers
        assert mgr.match_and_expand("lock") == ["lock workstation"]


# ===========================================================================
# 6. COMMAND DELETION & DISABLED INTERCEPTION (ACC-06)
# ===========================================================================


class TestCommandDeletionAndDisabling:
    """Verifies deleting and disabling macros."""

    def test_acc06_remove_command_removes_from_disk(self, tmp_path: Path):
        """Removing a command removes it from active list and persists updated JSON."""
        cmd_file = tmp_path / "delete.json"
        mgr = CustomCommandManager(storage_path=cmd_file)

        assert mgr.remove_command("focus mode")
        assert mgr.match_and_expand("focus mode") is None

        # Verify disk updated
        mgr2 = CustomCommandManager(storage_path=cmd_file)
        assert mgr2.match_and_expand("focus mode") is None

        # Removing nonexistent command returns False
        assert not mgr.remove_command("nonexistent macro")

    def test_acc06_disabled_command_does_not_expand(self, tmp_path: Path):
        """Disabled commands are bypassed during expansion."""
        cmd_file = tmp_path / "disable.json"
        mgr = CustomCommandManager(storage_path=cmd_file)

        cmd = mgr.register_command(phrase="quick test", actions=["echo hello"])
        cmd.enabled = False

        assert mgr.match_and_expand("quick test") is None


# ===========================================================================
# 7. SCREEN READER TEXT SANITIZATION (ACC-07)
# ===========================================================================


class TestScreenReaderSanitization:
    """Verifies formatting cleanup for screen readers and speech synthesizers."""

    def test_acc07_strips_ansi_codes_and_markdown(self):
        """Removes ANSI color escapes, markdown links, code blocks, and header hashes."""
        raw_markdown = (
            "\x1b[32mSUCCESS:\x1b[0m\n"
            "# System Report\n"
            "Visit the [Seyal Documentation](https://seyal.ai/docs) for details.\n"
            "Execute the `build` command with **priority**.\n"
            "-------------------"
        )

        clean = VoiceNavigationEngine.format_for_screen_reader(raw_markdown)

        assert "\x1b[32m" not in clean
        assert "#" not in clean
        assert "[Seyal Documentation]" not in clean
        assert "Seyal Documentation" in clean
        assert "https://" not in clean
        assert "`" not in clean
        assert "**" not in clean
        assert "-------------------" not in clean


# ===========================================================================
# 8. VERBAL PROGRESS ANNOUNCEMENTS (ACC-08)
# ===========================================================================


class TestVerbalProgressAnnouncements:
    """Verifies spoken progress feedback for multi-step task execution."""

    def test_acc08_format_plan_for_voice(self):
        """Formats goal, step indices, and step description into clear spoken prose."""
        spoken = VoiceNavigationEngine.format_plan_for_voice(
            plan_goal="Backup user databases",
            total_steps=4,
            current_step_index=1,
            current_step_desc="Compress SQLite database file",
        )

        assert "Goal: Backup user databases." in spoken
        assert "Now executing step 2 of 4:" in spoken
        assert "Compress SQLite database file." in spoken


# ===========================================================================
# 9. SPOKEN SYSTEM DIAGNOSTICS FORMATTING (ACC-09)
# ===========================================================================


class TestSpokenSystemDiagnostics:
    """Verifies converting technical telemetry dictionaries into natural speech."""

    def test_acc09_format_status_for_voice(self):
        """Translates battery, power status, CPU percent, and paired devices into speech."""
        telemetry = {
            "battery": {"percent": 84, "power_plugged": False},
            "cpu_percent": 18.5,
            "paired_devices": ["phone-pixel-01", "tablet-ipad-02"],
        }

        spoken = VoiceNavigationEngine.format_status_for_voice(telemetry)

        assert "Battery is at 84 percent, on battery." in spoken
        assert "CPU utilization is 18.5 percent." in spoken
        assert "2 paired devices connected." in spoken

    def test_acc09_empty_telemetry_defaults_safely(self):
        """Empty status dictionary produces fallback reassurance message."""
        spoken = VoiceNavigationEngine.format_status_for_voice({})
        assert spoken == "All systems operating normally."


# ===========================================================================
# 10. HANDS-FREE VOICE CONTROL PIPELINE INTEGRATION (ACC-10)
# ===========================================================================


class TestHandsFreePipelineIntegration:
    """Verifies macro expansion and earcon emission in a unified workflow."""

    def test_acc10_voice_macro_triggers_earcon_and_expanded_actions(self, tmp_path: Path):
        """Simulates voice input expanding to actions and emitting confirmation earcon."""
        cmd_file = tmp_path / "integration.json"
        cmd_mgr = CustomCommandManager(storage_path=cmd_file)
        audio_mgr = AudioFeedbackManager(enabled=True)

        cmd_mgr.register_command(
            phrase="night mode",
            actions=["set volume to 10 percent", "turn on dark mode"],
        )

        # 1. Voice input received
        user_utterance = "Hey Seyal, please activate night mode"
        expanded_actions = cmd_mgr.match_and_expand(user_utterance)

        assert expanded_actions == ["set volume to 10 percent", "turn on dark mode"]

        # 2. Confirmation earcon emitted
        with patch.object(audio_mgr, "_play_tones") as mock_play:
            audio_mgr.play_earcon(EarconType.SUCCESS, async_play=False)
            mock_play.assert_called_once()
            tones, earcon = mock_play.call_args[0]
            assert earcon == EarconType.SUCCESS
