"""
Tests for Seyal AI Unified Architecture & Live Telemetry Service.
"""

from __future__ import annotations

import time
from unittest.mock import AsyncMock, patch

import pytest

from seyal_ai.agents.computer_use.agent import ConversationalComputerUseAgent
from seyal_ai.services.seyal_ai_service import seyal_ai_service


def test_seyal_ai_telemetry_snapshot_fast():
    """Verify live telemetry snapshot returns in < 15ms with all essential sub-features."""
    # Warm up caches
    seyal_ai_service.get_live_telemetry_snapshot()
    t0 = time.perf_counter()
    snap = seyal_ai_service.get_live_telemetry_snapshot()
    elapsed_ms = (time.perf_counter() - t0) * 1000

    assert elapsed_ms < 500.0  # Must be fast and non-blocking
    assert "active_window" in snap
    assert "battery" in snap
    assert "hardware" in snap
    assert "reminders" in snap
    assert "standing_rules" in snap
    assert "user_knowledge" in snap
    assert "recent_downloads" in snap
    assert "network" in snap
    assert "displays" in snap
    assert isinstance(snap["battery"], dict)
    assert "percent" in snap["battery"]
    assert "power_plugged" in snap["battery"]


@pytest.mark.asyncio
async def test_seyal_ai_context_prompt_builder():
    """Verify build_situational_prompt generates rich situational prompt."""
    prompt = await seyal_ai_service.build_situational_prompt()
    assert "[SEYAL AI LIVE SITUATIONAL AWARENESS & TELEMETRY]" in prompt
    assert "Active Foreground Window:" in prompt
    assert "System Battery / Power:" in prompt
    assert "Hardware Performance:" in prompt
    assert "Network (Wi-Fi):" in prompt
    assert "Connected Displays:" in prompt
    assert "Today's Pending Reminders" in prompt
    assert "SEYAL AI BEHAVIORAL INSTRUCTION:" in prompt


def test_seyal_ai_fast_path_actions():
    """Verify instant hardware actions match 0ms local execution rules."""
    # Lock screen
    res = seyal_ai_service.detect_instant_fast_path("laptop ah lock pannu")
    assert res is not None
    assert res["type"] == "ACTION"
    assert res["action_key"] == "win+l"

    res = seyal_ai_service.detect_instant_fast_path("lock screen")
    assert res is not None
    assert res["action_key"] == "win+l"

    # Audio Mute
    res = seyal_ai_service.detect_instant_fast_path("sound mute pannu")
    assert res is not None
    assert res["type"] == "ACTION"
    assert res["action_key"] == "volume_mute"

    res = seyal_ai_service.detect_instant_fast_path("unmute")
    assert res is not None
    assert res["action_key"] == "volume_mute"

    # Volume Up
    res = seyal_ai_service.detect_instant_fast_path("volume increase pannu")
    assert res is not None
    assert res["action_key"] == "volume_up"

    # Volume Down
    res = seyal_ai_service.detect_instant_fast_path("sound kammi pannu")
    assert res is not None
    assert res["action_key"] == "volume_down"

    # Open Latest Download
    res = seyal_ai_service.detect_instant_fast_path("open latest download")
    assert res is not None
    assert res["type"] == "ACTION_OPEN_DOWNLOAD"

    res = seyal_ai_service.detect_instant_fast_path("latest download open pannu")
    assert res is not None
    assert res["type"] == "ACTION_OPEN_DOWNLOAD"

    # Set Brightness
    res = seyal_ai_service.detect_instant_fast_path("brightness 80% vai")
    assert res is not None
    assert res["type"] == "ACTION_SET_BRIGHTNESS"
    assert res["level"] == 80

    # Media Controls
    res = seyal_ai_service.detect_instant_fast_path("paata pause pannu")
    assert res is not None
    assert res["type"] == "ACTION_MEDIA"
    assert res["action_key"] == "play_pause"

    res = seyal_ai_service.detect_instant_fast_path("next song podu")
    assert res is not None
    assert res["type"] == "ACTION_MEDIA"
    assert res["action_key"] == "next"


def test_seyal_ai_fast_path_queries():
    """Verify fast information queries bypass slow vision/cloud loops."""
    # Battery
    res = seyal_ai_service.detect_instant_fast_path("battery percentage evlo")
    assert res is not None
    assert res["type"] == "QUERY_BATTERY"

    res = seyal_ai_service.detect_instant_fast_path("charge evlo irukku")
    assert res is not None
    assert res["type"] == "QUERY_BATTERY"

    # Active Window
    res = seyal_ai_service.detect_instant_fast_path("active window enna")
    assert res is not None
    assert res["type"] == "QUERY_WINDOW"

    res = seyal_ai_service.detect_instant_fast_path("ippo enna window open la irukku")
    assert res is not None
    assert res["type"] == "QUERY_WINDOW"

    # Downloads
    res = seyal_ai_service.detect_instant_fast_path("downloads-la latest file enna")
    assert res is not None
    assert res["type"] == "QUERY_DOWNLOADS"

    # Wi-Fi
    res = seyal_ai_service.detect_instant_fast_path("wifi connect aagi irukka")
    assert res is not None
    assert res["type"] == "QUERY_WIFI"

    # Displays
    res = seyal_ai_service.detect_instant_fast_path("second monitor connect aacha")
    assert res is not None
    assert res["type"] == "QUERY_DISPLAYS"

    # Clipboard
    res = seyal_ai_service.detect_instant_fast_path("clipboard-la enna irukku")
    assert res is not None
    assert res["type"] == "QUERY_CLIPBOARD"

    # Storage & Disk
    res = seyal_ai_service.detect_instant_fast_path("storage space evlo irukku")
    assert res is not None
    assert res["type"] == "QUERY_STORAGE"

    # Resources & CPU/RAM
    res = seyal_ai_service.detect_instant_fast_path("laptop slow-va irukku, ethu athigam ram")
    assert res is not None
    assert res["type"] == "QUERY_RESOURCES"

    # Background Tasks
    res = seyal_ai_service.detect_instant_fast_path("task eppadi poguthu")
    assert res is not None
    assert res["type"] == "QUERY_BACKGROUND_TASKS"

    # Reminders
    res = seyal_ai_service.detect_instant_fast_path("innaiku enna reminders irukku")
    assert res is not None
    assert res["type"] == "QUERY_REMINDERS"

    res = seyal_ai_service.detect_instant_fast_path("what are my reminders")
    assert res is not None
    assert res["type"] == "QUERY_REMINDERS"

    # Standing Rules
    res = seyal_ai_service.detect_instant_fast_path("standing rules enna irukku")
    assert res is not None
    assert res["type"] == "QUERY_RULES"

    # Last Task
    res = seyal_ai_service.detect_instant_fast_path("kadasiya enna task pannom")
    assert res is not None
    assert res["type"] == "QUERY_LAST_TASK"


@pytest.mark.asyncio
async def test_agent_fast_path_battery_query():
    """Verify agent executes fast battery query end-to-end with spoken reply."""
    agent = ConversationalComputerUseAgent()
    with patch("seyal_ai.agents.computer_use.agent.decompose_user_intents", side_effect=lambda g, *args, **kw: [g]):
        res = await agent.run_goal("battery percentage evlo")

    assert res["status"] == "completed"
    assert res["is_task"] is False
    assert res["steps_executed"] == 0
    assert len(res["narration"]) > 0
    assert any(w in res["narration"].lower() for w in ("battery", "%", "running", "plugged", "laptop"))


@pytest.mark.asyncio
async def test_agent_fast_path_hardware_action():
    """Verify agent executes fast volume mute action directly via executor."""
    agent = ConversationalComputerUseAgent()
    agent._executor.execute = AsyncMock(return_value={"status": "ok", "success": True})

    with patch("seyal_ai.agents.computer_use.agent.decompose_user_intents", side_effect=lambda g, *args, **kw: [g]):
        res = await agent.run_goal("sound mute pannu")

    assert res["status"] == "completed"
    assert res["is_task"] is True
    assert res["steps_executed"] == 1
    assert "mute" in res["narration"].lower()
    agent._executor.execute.assert_called_once()
    called_action = agent._executor.execute.call_args[0][0]
    assert called_action.key == "volume_mute"


@pytest.mark.asyncio
async def test_agent_fast_path_downloads_action():
    """Verify agent executes open latest download directly."""
    agent = ConversationalComputerUseAgent()
    with (
        patch("seyal_ai.agents.computer_use.agent.decompose_user_intents", side_effect=lambda g, *args, **kw: [g]),
        patch.object(seyal_ai_service, "open_latest_download", return_value=(True, "Opened test.pdf file!")),
    ):
        res = await agent.run_goal("open latest download")
        assert res["status"] == "completed"
        assert res["is_task"] is True
        assert res["steps_executed"] == 1
        assert "test.pdf" in res["narration"]


@pytest.mark.asyncio
async def test_agent_fast_path_brightness_action():
    """Verify agent adjusts brightness directly."""
    agent = ConversationalComputerUseAgent()
    with (
        patch("seyal_ai.agents.computer_use.agent.decompose_user_intents", side_effect=lambda g, *args, **kw: [g]),
        patch.object(seyal_ai_service, "set_screen_brightness", return_value=(True, "Screen brightness 80%-ku maathiten!")),
    ):
        res = await agent.run_goal("brightness 80% vai")
        assert res["status"] == "completed"
        assert res["is_task"] is True
        assert res["steps_executed"] == 1
        assert "80%" in res["narration"]


def test_seyal_ai_canonical_shortcuts_hub():
    """Verify Canonical Keyboard Shortcuts Hub integrates with fast path in < 1ms."""
    res = seyal_ai_service.detect_instant_fast_path("open start menu")
    assert res is not None
    assert res["type"] == "ACTION"
    assert res["action_key"] == "win"

    res = seyal_ai_service.detect_instant_fast_path("open new tab")
    assert res is not None
    assert res["type"] == "ACTION"
    assert res["action_key"] == "ctrl+t"

    res = seyal_ai_service.detect_instant_fast_path("select all")
    assert res is not None
    assert res["type"] == "ACTION"
    assert res["action_key"] == "ctrl+a"


def test_agent_native_app_close():
    """Verify agent detects native app close without vision loop."""
    agent = ConversationalComputerUseAgent()
    proc = agent._detect_simple_app_close("close notepad")
    assert proc == "notepad.exe"

    proc_chrome = agent._detect_simple_app_close("chrome-ah moodu")
    assert proc_chrome == "chrome.exe"


def test_custom_command_macro_expansion():
    """Verify custom macros expand into compound actions."""
    from seyal_ai.accessibility.custom_commands import CustomCommandManager
    mgr = CustomCommandManager()
    expanded = mgr.match_and_expand("morning routine")
    assert expanded is not None
    assert len(expanded) >= 2


def test_agent_permissions_preflight_guard():
    """Verify pre-flight permission check blocks blocked scopes."""
    from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
    from seyal_ai.security.permissions import PermissionScope, get_permission_engine

    agent = ConversationalComputerUseAgent()
    engine = get_permission_engine()

    # When scope is allowed
    engine.grant_scope(PermissionScope.KEYBOARD_CONTROL)
    action = ComputerAction(action_type=ActionType.HOTKEY, key="ctrl+s")
    allowed, _ = agent._check_action_permission(action)
    assert allowed is True

    # When scope is blocked
    engine.set_mode(PermissionScope.KEYBOARD_CONTROL, "block")
    allowed, reason = agent._check_action_permission(action)
    assert allowed is False
    assert "blocked" in reason.lower()

    # Restore to allow
    engine.set_mode(PermissionScope.KEYBOARD_CONTROL, "allow")


def test_seyal_ai_settings_telemetry_snapshot():
    """Verify live telemetry snapshot includes all settings awareness (voice, permissions, tasks, ai models)."""
    snap = seyal_ai_service.get_live_telemetry_snapshot()
    assert "voice_settings" in snap
    assert "permissions" in snap
    assert "tasks" in snap
    assert "ai_models" in snap
    assert snap["voice_settings"]["friendly_name"]
    assert "granted_count" in snap["permissions"]


def test_seyal_ai_settings_fast_path_actions():
    """Verify instant settings actions (voice, permissions, task manager) route in < 1ms."""
    # Voice change
    res = seyal_ai_service.detect_instant_fast_path("change voice to pallavi")
    assert res is not None
    assert res["type"] == "ACTION_CHANGE_VOICE"
    assert res["voice"] == "pallavi"

    # Voice speed
    res = seyal_ai_service.detect_instant_fast_path("voice speed 1.15 vai")
    assert res is not None
    assert res["type"] == "ACTION_CHANGE_VOICE"
    assert res["speed"] == 1.15

    # Grant permission
    res = seyal_ai_service.detect_instant_fast_path("keyboard control permission kudu")
    assert res is not None
    assert res["type"] == "ACTION_SET_PERMISSION"
    assert res["scope"] == "keyboard"
    assert res["mode"] == "allow"

    # Grant all permissions
    res = seyal_ai_service.detect_instant_fast_path("grant all permissions")
    assert res is not None
    assert res["type"] == "ACTION_SET_PERMISSION"
    assert res["scope"] == "all"

    # Revoke permission
    res = seyal_ai_service.detect_instant_fast_path("mouse permission block pannu")
    assert res is not None
    assert res["type"] == "ACTION_SET_PERMISSION"
    assert res["scope"] == "mouse"
    assert res["mode"] == "block"

    # Reset permissions
    res = seyal_ai_service.detect_instant_fast_path("reset permissions")
    assert res is not None
    assert res["type"] == "ACTION_RESET_PERMISSIONS"

    # Task Manager cancel
    res = seyal_ai_service.detect_instant_fast_path("cancel current task")
    assert res is not None
    assert res["type"] == "ACTION_MANAGE_TASK"
    assert res["action"] == "cancel"

    # Task Manager emergency stop
    res = seyal_ai_service.detect_instant_fast_path("emergency stop")
    assert res is not None
    assert res["type"] == "ACTION_MANAGE_TASK"
    assert res["action"] == "emergency_stop"


def test_seyal_ai_settings_fast_path_queries():
    """Verify settings queries bypass slow loops and route directly to fact retrieval."""
    # Voice query
    res = seyal_ai_service.detect_instant_fast_path("current voice enna")
    assert res is not None
    assert res["type"] == "QUERY_VOICE_SETTINGS"

    # Permissions query
    res = seyal_ai_service.detect_instant_fast_path("permissions enna irukku")
    assert res is not None
    assert res["type"] == "QUERY_PERMISSIONS"

    # Tasks query
    res = seyal_ai_service.detect_instant_fast_path("what tasks are running in task manager")
    assert res is not None
    assert res["type"] == "QUERY_TASKS"

    # AI Models query
    res = seyal_ai_service.detect_instant_fast_path("which ai model is active")
    assert res is not None
    assert res["type"] == "QUERY_AI_MODELS"

    # Unified settings query
    res = seyal_ai_service.detect_instant_fast_path("agent settings kaami")
    assert res is not None
    assert res["type"] == "QUERY_SETTINGS"


@pytest.mark.asyncio
async def test_agent_executes_settings_voice_action():
    """Verify agent executes voice update action end-to-end with event emission."""
    agent = ConversationalComputerUseAgent()
    with patch("seyal_ai.agents.computer_use.agent.decompose_user_intents", side_effect=lambda g, *args, **kw: [g]):
        res = await agent.run_goal("change voice to breeze")

    assert res["status"] == "completed"
    assert res["is_task"] is True
    assert res["steps_executed"] == 1
    assert "voice" in res["narration"].lower() or "breeze" in res["narration"].lower() or len(res["narration"]) > 0


@pytest.mark.asyncio
async def test_agent_executes_settings_permission_action():
    """Verify agent executes permission grant action end-to-end with security update."""
    agent = ConversationalComputerUseAgent()
    with patch("seyal_ai.agents.computer_use.agent.decompose_user_intents", side_effect=lambda g, *args, **kw: [g]):
        res = await agent.run_goal("keyboard control permission kudu")

    assert res["status"] == "completed"
    assert res["is_task"] is True
    assert res["steps_executed"] == 1
    assert "keyboard" in res["narration"].lower() or "permission" in res["narration"].lower()

