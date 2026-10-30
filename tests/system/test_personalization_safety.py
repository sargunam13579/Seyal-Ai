"""
Integration Tests for Priority 1: Personalization System Prompt Injection & Safety Guardrails Enforcement.
"""

import json
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.api.app import create_app
from seyal_ai.core.brain import SeyalAiBrain
from seyal_ai.core.config import get_settings
from seyal_ai.llm.prompts.system import build_system_prompt
from seyal_ai.personalization.manager import (
    PersonalizationConfig,
    PersonalizationManager,
    get_personalization_manager,
)
from seyal_ai.security.guardrails import (
    SafetyGuardrailsManager,
    SafetySettings,
    get_safety_guardrails,
)


@pytest.mark.asyncio
async def test_personalization_persistence_and_system_prompt(tmp_path: Path):
    """Test PersonalizationManager persists to JSON and produces correct system prompt directives."""
    storage_file = tmp_path / "personalization.json"
    mgr = PersonalizationManager(storage_path=storage_file)

    # Initial default
    assert mgr.config.communication_tone == "action"

    # Update with custom instructions and mentor tone
    custom_text = "Always reply in a mix of Tamil and English. Prefer functional Python."
    updated = mgr.update_config(
        PersonalizationConfig(
            communication_tone="mentor",
            custom_instructions=custom_text,
            concise_code_only=True,
        )
    )

    assert updated.communication_tone == "mentor"
    assert updated.custom_instructions == custom_text
    assert storage_file.exists()

    # Verify JSON content
    data = json.loads(storage_file.read_text(encoding="utf-8"))
    assert data["communicationTone"] == "mentor"
    assert data["customInstructions"] == custom_text

    # Verify prompt snippet formatting
    snippet = mgr.get_system_prompt_snippet()
    assert "Detailed Mentor" in snippet
    assert custom_text in snippet
    assert "Concise Code Only" in snippet

    # Verify integration into build_system_prompt
    prompt = build_system_prompt(
        assistant_name="Seyal AI",
        user_name="Karthik",
        personalization_snippet=snippet,
    )
    assert custom_text in prompt
    assert "Detailed Mentor" in prompt


@pytest.mark.asyncio
async def test_brain_refreshes_system_prompt_with_personalization():
    """Test that SeyalAiBrain dynamically injects user personalization into context system prompt."""
    settings = get_settings()
    brain = SeyalAiBrain(settings)
    
    # Configure custom personal prompt
    personal_mgr = get_personalization_manager()
    personal_mgr.update_config(
        PersonalizationConfig(
            communication_tone="copilot",
            custom_instructions="Act as a senior software architect.",
        )
    )

    brain._refresh_system_prompt()
    system_prompt = brain._context.system_prompt

    assert "senior software architect" in system_prompt
    assert "Pair-Programmer & Co-Pilot" in system_prompt


@pytest.mark.asyncio
async def test_safety_guardrails_blocks_protected_apps_and_paths(tmp_path: Path):
    """Test SafetyGuardrailsManager blocks launching blacklisted applications and sensitive paths."""
    storage_file = tmp_path / "safety.json"
    guard = SafetyGuardrailsManager(storage_path=storage_file)

    guard.update_settings(
        SafetySettings(
            blocked_applications=["Bitwarden", "1Password", "Personal Banking Tab"],
            blacklist_paths=["C:\\Windows\\System32"],
            prevent_self_kill=True,
        )
    )

    # 1. Blocked application launch
    action_open_bitwarden = ComputerAction(
        action_type=ActionType.OPEN_APP,
        app_name="Bitwarden",
    )
    is_safe, reason = guard.check_action_safety(action_open_bitwarden)
    assert not is_safe
    assert "Bitwarden" in reason

    # 2. Blacklisted system directory launch
    action_open_sys32 = ComputerAction(
        action_type=ActionType.OPEN_APP,
        app_name="C:\\Windows\\System32\\cmd.exe",
    )
    is_safe_sys32, reason_sys32 = guard.check_action_safety(action_open_sys32)
    assert not is_safe_sys32
    assert "System32" in reason_sys32

    # 3. Allowed application
    action_open_notepad = ComputerAction(
        action_type=ActionType.OPEN_APP,
        app_name="notepad",
    )
    is_safe_notepad, _ = guard.check_action_safety(action_open_notepad)
    assert is_safe_notepad

    # 4. Self-preservation check
    action_close_seyal = ComputerAction(
        action_type=ActionType.WINDOW_CLOSE,
        app_name="seyal_ai",
    )
    is_safe_close, reason_close = guard.check_action_safety(action_close_seyal)
    assert not is_safe_close
    assert "self-preservation" in reason_close

    # 5. Active foreground window boundary check
    action_click = ComputerAction(
        action_type=ActionType.CLICK,
        x=200,
        y=300,
    )
    # Simulate active window being Bitwarden
    is_safe_click, reason_click = guard.check_action_safety(
        action_click,
        active_window_title="Bitwarden - Password Vault",
    )
    assert not is_safe_click
    assert "protected" in reason_click.lower()


@pytest.mark.asyncio
async def test_action_executor_enforces_safety_guardrails():
    """Test ComputerActionExecutor aborts execution when safety guardrail triggers."""
    guard = get_safety_guardrails()
    guard.update_settings(
        SafetySettings(
            blocked_applications=["KeePassVault"],
        )
    )

    executor = ComputerActionExecutor()
    blocked_action = ComputerAction(
        action_type=ActionType.OPEN_APP,
        app_name="KeePassVault",
    )

    result = await executor.execute(blocked_action)
    assert result["success"] is False
    assert result["blocked_by_safety"] is True
    assert "KeePassVault" in result["error"]


@pytest.mark.asyncio
async def test_personalization_and_safety_api_routes():
    """Test REST endpoints for /api/personalization and /api/safety."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. GET /api/personalization
        res_get_p = await client.get("/api/personalization")
        assert res_get_p.status_code == 200
        p_data = res_get_p.json()
        assert "communicationTone" in p_data

        # 2. PUT /api/personalization
        res_put_p = await client.put(
            "/api/personalization",
            json={
                "communicationTone": "executive",
                "customInstructions": "Provide brief bullet points only.",
                "conciseCodeOnly": True,
            },
        )
        assert res_put_p.status_code == 200
        assert res_put_p.json()["communicationTone"] == "executive"

        # 3. GET /api/safety
        res_get_s = await client.get("/api/safety")
        assert res_get_s.status_code == 200
        s_data = res_get_s.json()
        assert "blockedApplications" in s_data
        assert "profile" in s_data

        # 4. PUT /api/safety
        res_put_s = await client.put(
            "/api/safety",
            json={
                "profile": "zero_trust",
                "requireConfirmDelete": True,
                "requireConfirmTerminal": True,
                "blockPaymentGateways": True,
                "preventSelfKill": True,
                "credentialProtection": True,
                "maskApiKeys": True,
                "maskCreditCards": True,
                "maskPasswords": True,
                "confirmationTimeoutSec": 15,
                "blacklistPaths": ["C:\\Windows\\System32"],
                "safeWorkspaces": ["D:\\projects"],
                "blockedApplications": ["Bitwarden", "1Password", "CustomSecretVault"],
            },
        )
        assert res_put_s.status_code == 200
        assert res_put_s.json()["profile"] == "zero_trust"
        assert "CustomSecretVault" in res_put_s.json()["blockedApplications"]
