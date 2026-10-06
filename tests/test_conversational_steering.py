"""
Unit tests for Universal Real-Time Conversational Steering, Interruption & Multi-Intent Architecture.
Tests all 4 dynamic interaction cases with zero hardcoded task names.
"""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from seyal_ai.agents.computer_use.agent import (
    ConversationalComputerUseAgent,
    decompose_user_intents,
)
from seyal_ai.agents.computer_use.protocol import (
    ActionType,
    AgentStatus,
    ComputerAction,
    ScreenObservation,
    SteeringInstruction,
)
from seyal_ai.llm.providers.base import LLMResponse


@pytest.mark.asyncio
async def test_case1_dynamic_multi_intent_decomposition():
    """Case 1: Decompose compound instructions dynamically in any language."""
    # Single intent: returns as-is without extra calls
    single = await decompose_user_intents("open camera")
    assert single == ["open camera"]

    # Compound intent via Gemini Flash decomposition
    mock_router = MagicMock()
    mock_router.initialize = AsyncMock()
    mock_router.generate = AsyncMock(
        return_value=LLMResponse(
            content='["check current weather", "show route from chennai to avadi", "check for any new emails"]'
        )
    )

    compound_prompt = "today weather eppadi irukku, chennai to avadi ku route kaami, mail edhavadhu vandhirukka"
    sub_goals = await decompose_user_intents(compound_prompt, router=mock_router)
    assert len(sub_goals) == 3
    assert "weather" in sub_goals[0]
    assert "route" in sub_goals[1]
    assert "emails" in sub_goals[2]


@pytest.mark.asyncio
async def test_case2_voice_pipelining_compound_execution():
    """Case 2: Pipelined voice narration while subsequent sub-goals initialize."""
    agent = ConversationalComputerUseAgent()
    events_emitted = []

    async def mock_emit(event_name: str, payload: dict):
        events_emitted.append((event_name, payload))

    agent._event_bus.emit = AsyncMock(side_effect=mock_emit)

    # Mock single goal executions
    async def mock_exec_flow(goal: str):
        return {"status": "completed", "narration": f"Done with {goal}", "steps_executed": 1}

    agent._execute_single_goal_flow = AsyncMock(side_effect=mock_exec_flow)

    res = await agent._run_compound_goals(["Subtask 1", "Subtask 2"], original_instruction="Subtask 1 and 2")
    assert res["status"] == "completed"
    assert res["sub_goals_executed"] == 2
    # Verify pipelined narration event was emitted
    pipelined_events = [e for e in events_emitted if e[0] == "computer_use.narrate" and e[1].get("is_pipelined")]
    assert len(pipelined_events) >= 1


@pytest.mark.asyncio
async def test_case3_mid_task_live_steering_guidance():
    """Case 3: Live guidance injected into the active loop steers the next decision."""
    agent = ConversationalComputerUseAgent()
    await agent.steer("click the blue icon instead of red")

    assert not agent._steering_queue.empty()
    item = agent._steering_queue.get_nowait()
    assert "blue icon" in item.instruction
    assert item.interrupt_current_action is True
    assert item.is_pivot is False


@pytest.mark.asyncio
async def test_case4_instant_live_interruption_and_pivot():
    """Case 4: Mid-flight interruption instantly halts execution and pivots to new task."""
    agent = ConversationalComputerUseAgent()

    # User speaks mid-flight: "stop and open downloads instead"
    await agent.steer("idhu venaam, downloads open pannu")

    assert agent._pivot_requested is True
    assert agent._pivot_goal is not None
    assert "downloads" in agent._pivot_goal


@pytest.mark.asyncio
async def test_emergency_stop_halts_loop():
    """Emergency stop instantly triggers halt."""
    agent = ConversationalComputerUseAgent()
    await agent.steer("niruthu")
    assert agent._stop_requested is True
    assert agent.status == AgentStatus.STOPPED
