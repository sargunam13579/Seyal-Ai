"""Unit tests for Autonomous Task & Notification Classifier.

Verifies:
1. Clear division between NOTIFY (alert & voice only) vs TASK (autonomous execution)
2. Four task types: IMMEDIATE (1), SCHEDULED (2), CONTINUOUS (3), CONDITIONAL (4)
3. Permission Protocol: Types 2, 3, 4 require permission UNLESS explicitly bypassed
4. Dynamic multilingual voice synthesis
Zero hardcoding of specific personal or user example strings.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from seyal_ai.llm.providers.base import LLMResponse
from seyal_ai.planning.task_classifier import TaskSemanticClassifier
from seyal_ai.planning.task_types import TaskIntentType, TaskPermissionState, TaskType


@pytest.fixture
def mock_classifier():
    mock_router = MagicMock()
    mock_router.initialize = AsyncMock()
    return TaskSemanticClassifier(router=mock_router)


@pytest.mark.asyncio
async def test_notify_vs_task_intent(mock_classifier):
    """Test semantic distinction between NOTIFY vs TASK using generic input queries."""
    # Test 1: Inform / Notify intent -> NOTIFY
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Generic Status Alert", "intent_type": "notify", "task_type": "conditional", "auto_permission_granted": false}'
        )
    )
    spec1 = await mock_classifier.classify_instruction("alert me when status change occurs")
    assert spec1.intent_type == TaskIntentType.NOTIFY

    # Test 2: Autonomous execution intent -> TASK
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Auto Action Execution", "intent_type": "task", "task_type": "conditional", "auto_permission_granted": false}'
        )
    )
    spec2 = await mock_classifier.classify_instruction("when status change occurs execute backup action")
    assert spec2.intent_type == TaskIntentType.TASK

    # Test 3: Event monitoring: notify vs action
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Incoming Notification Observer", "intent_type": "notify", "task_type": "conditional", "auto_permission_granted": false}'
        )
    )
    spec3 = await mock_classifier.classify_instruction("tell me if an incoming packet arrives")
    assert spec3.intent_type == TaskIntentType.NOTIFY

    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Incoming Packet Filter", "intent_type": "task", "task_type": "conditional", "auto_permission_granted": false}'
        )
    )
    spec4 = await mock_classifier.classify_instruction("if an incoming packet arrives filter and archive it")
    assert spec4.intent_type == TaskIntentType.TASK


@pytest.mark.asyncio
async def test_task_types_1_to_4(mock_classifier):
    """Verify generic classification of Type 1 (Immediate), 2 (Scheduled), 3 (Continuous), 4 (Conditional)."""
    # Type 1: Immediate
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Instant Action", "intent_type": "task", "task_type": "immediate", "auto_permission_granted": false}'
        )
    )
    t1 = await mock_classifier.classify_instruction("execute data export now")
    assert t1.task_type == TaskType.IMMEDIATE
    assert t1.permission_state == TaskPermissionState.NOT_REQUIRED

    # Type 2: Scheduled
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Scheduled Operation", "intent_type": "task", "task_type": "scheduled", "auto_permission_granted": false, "scheduled_time": "target_future_timestamp"}'
        )
    )
    t2 = await mock_classifier.classify_instruction("execute this operation after the specified scheduled delay")
    assert t2.task_type == TaskType.SCHEDULED
    assert t2.permission_state == TaskPermissionState.PENDING

    # Type 3: Continuous
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Continuous Monitor", "intent_type": "task", "task_type": "continuous", "auto_permission_granted": false, "recurring_interval": "every hour"}'
        )
    )
    t3 = await mock_classifier.classify_instruction("monitor system metrics every hour indefinitely")
    assert t3.task_type == TaskType.CONTINUOUS
    assert t3.permission_state == TaskPermissionState.PENDING

    # Type 4: Conditional
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Conditional Action", "intent_type": "task", "task_type": "conditional", "auto_permission_granted": false, "condition": "error rate exceeds threshold"}'
        )
    )
    t4 = await mock_classifier.classify_instruction("if error rate exceeds threshold restart the process")
    assert t4.task_type == TaskType.CONDITIONAL
    assert t4.permission_state == TaskPermissionState.PENDING


@pytest.mark.asyncio
async def test_permission_override_protocol(mock_classifier):
    """Verify that if user explicitly indicates auto-grant bypass, permission_state is AUTO_GRANTED."""
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(
            content='{"title": "Auto Continuous Worker", "intent_type": "task", "task_type": "continuous", "auto_permission_granted": true}'
        )
    )
    t = await mock_classifier.classify_instruction("run continuous cleanup routine execute directly without asking permission")
    assert t.task_type == TaskType.CONTINUOUS
    assert t.permission_state == TaskPermissionState.AUTO_GRANTED


@pytest.mark.asyncio
async def test_universal_spoken_synthesis(mock_classifier):
    """Verify dynamic voice synthesis calls for permission and completion."""
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(content="Should I proceed with executing this task?")
    )
    mock_classifier._router.initialize = AsyncMock()

    from seyal_ai.planning.task_types import AutonomousTaskSpec
    spec = AutonomousTaskSpec(
        id="t1",
        title="Scheduled Action",
        original_instruction="execute task after scheduled duration",
        task_type=TaskType.SCHEDULED,
    )
    perm_voice = await mock_classifier.synthesize_permission_request(spec)
    assert len(perm_voice) > 0
    assert "proceed" in perm_voice.lower()

    # Completion synthesis
    mock_classifier._router.generate = AsyncMock(
        return_value=LLMResponse(content="Task operation has been completed successfully.")
    )
    comp_voice = await mock_classifier.synthesize_completion_report(spec, success=True)
    assert len(comp_voice) > 0
    assert "completed" in comp_voice.lower()
