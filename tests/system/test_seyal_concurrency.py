"""
Tests for Seyal AI Multi-Threaded Concurrency, Telemetry Hub, and 3-Way Intent Routing.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from seyal_ai.agents.computer_use.protocol import AgentStatus
from seyal_ai.api.routes.computer_use import RunGoalRequest, run_computer_use_goal
from seyal_ai.core.telemetry_hub import TelemetryHub
from seyal_ai.planning.steering_router import IntentClassification, SteeringIntentRouter


def test_telemetry_hub_lifecycle():
    """Verify TelemetryHub tracks progress, live updates, and status narrative cleanly."""
    hub = TelemetryHub.get_instance()
    task_id = "test_task_001"

    # Register task
    state = hub.register_task(task_id, goal="Download Invoice PDF", max_steps=10)
    assert state.is_active is True
    assert state.goal == "Download Invoice PDF"

    # Update progress
    hub.update_task_progress(task_id, step=4, thought="Scanning folder", action_summary="Reading list")
    assert state.current_step == 4
    assert state.progress_percent == 40

    # Query narrative
    narrative = hub.get_live_status_narrative()
    assert narrative is not None
    assert "Download Invoice PDF" in narrative
    assert "40%" in narrative

    # Complete task
    hub.complete_task(task_id, success=True, final_summary="Downloaded invoice.pdf")
    assert not state.is_active
    assert state.progress_percent == 100


@pytest.mark.asyncio
async def test_steering_intent_router_classifications():
    """Verify 3-way intent routing across various user utterances."""
    router = SteeringIntentRouter()

    # 1. Cancel / Emergency stop
    res_cancel = await router.classify("niruthu, cancel that", active_task_goal="Search files")
    assert res_cancel.category == IntentClassification.CANCEL

    # 2. Status inquiry
    res_status = await router.classify("evalo neram aagum, status enna?", active_task_goal="Search files")
    assert res_status.category == IntentClassification.STATUS_QUERY

    # 3. Pivot
    res_pivot = await router.classify("idhu venaam, open chrome instead", active_task_goal="Search files")
    assert res_pivot.category == IntentClassification.PIVOT

    # 4. In-task Guidance / Steer
    res_steer = await router.classify("click the blue icon instead of red", active_task_goal="Search files")
    assert res_steer.category == IntentClassification.STEER


@pytest.mark.asyncio
async def test_interruption_does_not_cancel_task_for_side_query():
    """Verify that asking a side question while a task is running keeps the task alive and answers concurrently."""
    fake_agent = MagicMock()
    fake_agent.status = AgentStatus.ACTING
    fake_agent.is_task_running = True
    fake_agent._active_goal = "Organize downloads folder"
    fake_agent.history = []
    fake_agent.steer = AsyncMock()

    fake_request = MagicMock()
    fake_brain = MagicMock()
    fake_brain.process = AsyncMock(return_value="Tomorrow is Thursday.")
    fake_request.app.state.brain = fake_brain

    from unittest.mock import patch

    with patch("seyal_ai.api.routes.computer_use.get_agent", return_value=fake_agent):
        req = RunGoalRequest(goal="Tomorrow enna kizhamai?")
        result = await run_computer_use_goal(req=req, background_tasks=MagicMock(), request=fake_request)

        # Verification:
        # 1. Agent was NOT stopped
        fake_agent.request_stop.assert_not_called()
        # 2. Side response was delivered concurrently
        assert result["status"] == "in_progress"
        assert "Thursday" in result["narration"]


@pytest.mark.asyncio
async def test_interruption_status_query_returns_live_telemetry():
    """Verify that inquiring about status while task runs returns live telemetry without aborting."""
    hub = TelemetryHub.get_instance()
    task_id = "test_live_task"
    hub.register_task(task_id, goal="Search Database", max_steps=10)
    hub.update_task_progress(task_id, step=5, action_summary="Reading row 50")

    fake_agent = MagicMock()
    fake_agent.status = AgentStatus.THINKING
    fake_agent.is_task_running = True
    fake_agent._active_goal = "Search Database"
    fake_agent.history = []
    fake_agent.steer = AsyncMock()

    fake_request = MagicMock()

    from unittest.mock import patch

    with patch("seyal_ai.api.routes.computer_use.get_agent", return_value=fake_agent):
        req = RunGoalRequest(goal="How much time left, status enna?")
        result = await run_computer_use_goal(req=req, background_tasks=MagicMock(), request=fake_request)

        # Verification:
        fake_agent.request_stop.assert_not_called()
        assert result["status"] == "in_progress"
        assert "Search Database" in result["narration"]
        assert "50%" in result["narration"]
