"""
Seyal AI Recovery Testing Suite.

Verifies the system's ability to gracefully recover from abrupt cancellations,
transient failures, tool execution errors, corrupted outputs, buffer disruptions,
and oversized payloads without crashing or corrupting persistent state:
1. RECOVERY-01: Agent Mid-Flight Emergency Stop & Immediate Fresh Plan Execution Recovery.
2. RECOVERY-02: Transient Step Failure & Exponential Backoff Retry Recovery.
3. RECOVERY-03: Fatal Tool Exhaustion & Alternative Tool Fallback Recovery.
4. RECOVERY-04: Non-Recoverable Fatal Error Graceful Plan Halt (No Infinite Loops).
5. RECOVERY-05: VAD Audio Stream Disruption & Buffer Reset Recovery.
6. RECOVERY-06: Telemetry Hub Worker Crash & Narrative State Recovery.
7. RECOVERY-07: Context Window Oversized Payload Truncation Recovery.
8. RECOVERY-08: LLM Malformed JSON Semantic Classifier Recovery.
9. RECOVERY-09: Filesystem File Collision Overwrite Recovery.
10. RECOVERY-10: Multi-Plan Consecutive Emergency Kill Recovery.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import numpy as np
import pytest

from seyal_ai.core.context import ContextManager
from seyal_ai.core.telemetry_hub import TelemetryHub
from seyal_ai.llm.providers.base import LLMResponse
from seyal_ai.planning.cancellation import (
    CancellationManager,
    EmergencyStopError,
)
from seyal_ai.planning.retry import ErrorCategory, RetrySystem
from seyal_ai.planning.task_classifier import TaskSemanticClassifier
from seyal_ai.planning.task_types import TaskIntentType
from seyal_ai.planning.types import (
    PlanStep,
)
from seyal_ai.tools.system.files import CreateFileTool, ReadFileTool
from seyal_ai.voice.vad import VADState, VoiceActivityDetector

# ===========================================================================
# 1. EMERGENCY STOP & IMMEDIATE RE-EXECUTION RECOVERY
# ===========================================================================


class TestEmergencyStopRecovery:
    """Verifies that an abrupt emergency stop halts cleanly and subsequent plans run normally."""

    def test_recovery_midflight_emergency_stop_and_subsequent_plan_execution(self):
        """
        RECOVERY-01: Triggering an emergency stop halts the active plan immediately with
        EmergencyStopError. A subsequent plan launched immediately afterwards must receive
        a fresh, uncancelled token and execute without any residual state bleed.
        """
        cancellation_mgr = CancellationManager()

        # Phase 1: Abruptly halted plan
        aborted_plan_id = "plan_aborted_001"
        token_1 = cancellation_mgr.create_token(aborted_plan_id)
        token_1.emergency_stop(reason="User triggered kill switch")

        assert token_1.is_cancelled
        assert token_1.is_emergency

        with pytest.raises(EmergencyStopError):
            token_1.check()

        # Phase 2: Fresh subsequent plan launched after emergency recovery
        fresh_plan_id = "plan_fresh_002"
        token_2 = cancellation_mgr.create_token(fresh_plan_id)

        assert not token_2.is_cancelled
        assert not token_2.is_emergency
        # Must execute cleanly without raising exceptions
        token_2.check()


# ===========================================================================
# 2. TRANSIENT FAILURE & EXPONENTIAL BACKOFF RETRY RECOVERY
# ===========================================================================


class TestTransientErrorRetryRecovery:
    """Verifies retry classification and exponential backoff on transient errors."""

    def test_recovery_transient_error_backoff_and_retry(self):
        """
        RECOVERY-02: Transient network/lock errors must be classified as TRANSIENT,
        recommending should_retry=True with exponential backoff delay.
        """
        retry_system = RetrySystem(base_delay_seconds=0.5, backoff_multiplier=2.0)
        step = PlanStep(
            order=1,
            description="Fetch external document",
            tool_name="network_fetch",
            retry_count=0,
            max_retries=3,
        )

        transient_errors = [
            "Connection timeout after 3000ms",
            "Resource is temporarily unavailable",
            "Database file is busy / locked",
            "Rate limit exceeded (HTTP 429), try again later",
        ]

        for err in transient_errors:
            decision = retry_system.evaluate_retry(step, err)
            assert decision.should_retry is True
            assert decision.category == ErrorCategory.TRANSIENT
            assert decision.delay_seconds >= 0.5


# ===========================================================================
# 3. TOOL EXHAUSTION & ALTERNATIVE TOOL FALLBACK RECOVERY
# ===========================================================================


class TestToolFallbackRecovery:
    """Verifies graceful switching to fallback tools when a primary tool exhausts retries."""

    def test_recovery_primary_tool_exhaustion_switches_to_fallback(self):
        """
        RECOVERY-03: When primary tool 'convert_document' exhausts all retries,
        RetrySystem must recommend fallback tool 'print_to_pdf' rather than failing the plan.
        """
        retry_system = RetrySystem()
        step = PlanStep(
            order=2,
            description="Convert report to PDF",
            tool_name="convert_document",
            retry_count=2,  # Max retries reached
            max_retries=2,
        )

        decision = retry_system.evaluate_retry(step, "Rendering engine internal crash")

        assert decision.should_retry is True
        assert decision.category == ErrorCategory.TOOL_FALLBACK
        assert decision.fallback_tool == "print_to_pdf"
        assert "Switching to fallback tool" in decision.reason


# ===========================================================================
# 4. FATAL ERROR GRACEFUL HALT (PREVENTS INFINITE RETRY LOOPS)
# ===========================================================================


class TestFatalErrorHaltRecovery:
    """Verifies non-recoverable errors halt immediately without infinite loops."""

    def test_recovery_fatal_error_halts_immediately_without_retries(self):
        """
        RECOVERY-04: Fatal errors (e.g. Permission Denied) must immediately classify as FATAL
        with should_retry=False, preventing wasteful execution or infinite retry loops.
        """
        retry_system = RetrySystem()
        step = PlanStep(
            order=1,
            description="Access restricted system directory",
            tool_name="secure_file_access",
            retry_count=0,
            max_retries=3,
        )

        decision = retry_system.evaluate_retry(step, "Permission denied: access strictly prohibited")

        assert decision.should_retry is False
        assert decision.category == ErrorCategory.FATAL


# ===========================================================================
# 5. VAD AUDIO STREAM DISRUPTION & RESET RECOVERY
# ===========================================================================


class TestVADDisruptionRecovery:
    """Verifies VAD resets cleanly and resumes accurate speech detection after stream disruption."""

    def test_recovery_vad_after_stream_disruption_and_reset(self):
        """
        RECOVERY-05: When audio input experiences corrupt/disrupted frames followed by reset(),
        the VAD state machine must restore cleanly to IDLE and resume normal speech detection.
        """
        vad = VoiceActivityDetector(sample_rate=16000, energy_threshold=100)

        # Feed corrupted/extreme input
        corrupted_chunk = np.full(512, 32767, dtype=np.int16)
        _ = vad.process_chunk(corrupted_chunk)

        # Call emergency recovery reset
        vad.reset()
        assert vad.state == VADState.IDLE

        # Feed regular silence -> Must remain IDLE
        silence_chunk = np.zeros(512, dtype=np.int16)
        state_idle = vad.process_chunk(silence_chunk)
        assert state_idle == VADState.IDLE

        # Feed clean voice waveform -> Must detect SPEECH
        t = np.linspace(0, 0.032, 512, endpoint=False)
        speech_chunk = (5000 * np.sin(2 * np.pi * 440 * t)).astype(np.int16)
        state_speech = vad.process_chunk(speech_chunk)
        assert state_speech == VADState.SPEECH


# ===========================================================================
# 6. TELEMETRY HUB WORKER CRASH STATE RECOVERY
# ===========================================================================


class TestTelemetryCrashRecovery:
    """Verifies TelemetryHub recovers cleanly when background workers fail unexpectedly."""

    def test_recovery_telemetry_hub_worker_crash_state_cleanup(self):
        """
        RECOVERY-06: When a background worker crashes with an unhandled exception,
        calling cancel_task() or complete_task(success=False) cleans up active task slots
        and resets narrative so the conversational brain is not stuck in a hanging state.
        """
        hub = TelemetryHub.get_instance()
        task_id = "crashed_worker_task_01"

        state = hub.register_task(task_id, goal="Extract database backup", max_steps=10)
        assert state.is_active
        assert hub.get_primary_active_task() is not None

        # Simulate worker crash and recovery cleanup
        hub.cancel_task(task_id, reason="Worker process terminated abruptly")

        assert not state.is_active
        assert "Cancelled" in state.status_summary
        assert hub.get_primary_active_task() is None
        assert hub.get_live_status_narrative() is None


# ===========================================================================
# 7. CONTEXT WINDOW OVERSIZED PAYLOAD TRUNCATION RECOVERY
# ===========================================================================


class TestContextOverflowRecovery:
    """Verifies ContextManager protects against HTTP 400 context overflow crashes."""

    def test_recovery_context_manager_oversized_payload_truncation(self):
        """
        RECOVERY-07: Excessively large inputs (> 36,000 chars) must be safely truncated
        with descriptive markers, preventing downstream LLM context overflow exceptions.
        """
        ctx = ContextManager()

        # Inject 50,000 char user message
        oversized_user_input = "Seyal AI input payload: " + ("A" * 50000)
        ctx.add_user_message(oversized_user_input)

        # Inject 50,000 char tool output
        oversized_tool_output = "Log output: " + ("B" * 50000)
        ctx.add_tool_result(tool_call_id="call_99", tool_name="system_logs", result=oversized_tool_output)

        messages = ctx.get_messages()
        user_msg = next(m for m in messages if m.role == "user")
        tool_msg = next(m for m in messages if m.role == "tool")

        # Must be truncated to <= 36,000 characters
        assert len(user_msg.content) < 40000
        assert "[... Uploaded content truncated to avoid model context overflow ...]" in user_msg.content

        assert len(tool_msg.content) < 40000
        assert "[... Tool output truncated to avoid model context overflow ...]" in tool_msg.content


# ===========================================================================
# 8. LLM MALFORMED JSON CLASSIFIER RECOVERY
# ===========================================================================


class TestMalformedJSONRecovery:
    """Verifies graceful recovery when LLM returns invalid or truncated JSON."""

    @pytest.mark.asyncio
    async def test_recovery_malformed_llm_json_fallback_classification(self):
        """
        RECOVERY-08: When the LLM outputs malformed, truncated JSON, the classifier must
        recover via rule-based fast heuristics or default to safe task fallback, never crashing.
        """
        mock_router = MagicMock()
        mock_router.initialize = AsyncMock()
        mock_router.generate = AsyncMock(
            return_value=LLMResponse(
                content="```json\n{\"intent\": \"action\", \"confidence\": 0.95, \"missing_close\n",
            )
        )

        classifier = TaskSemanticClassifier(router=mock_router)

        # Classification must recover gracefully with default fallback spec, never crash with JSONDecodeError
        spec = await classifier.classify_instruction("take a screenshot now")
        assert spec is not None
        assert spec.intent_type in (TaskIntentType.TASK, TaskIntentType.NOTIFY)

        # General text query also recovers safely
        spec_convo = await classifier.classify_instruction("explain how quantum computing works")
        assert spec_convo is not None
        assert spec_convo.intent_type in (TaskIntentType.TASK, TaskIntentType.NOTIFY)


# ===========================================================================
# 9. FILESYSTEM COLLISION OVERWRITE RECOVERY
# ===========================================================================


class TestFilesystemCollisionRecovery:
    """Verifies recovery when writing to an existing file without overwrite flag."""

    @pytest.mark.asyncio
    async def test_recovery_filesystem_collision_and_explicit_overwrite(self, tmp_path: Path):
        """
        RECOVERY-09: Attempting to create an existing file without overwrite=True safely fails.
        Re-executing with overwrite=True immediately recovers and updates content cleanly.
        """
        create_tool = CreateFileTool()
        read_tool = ReadFileTool()

        target = tmp_path / "protected_manifest.json"
        initial_content = '{"version": "1.0", "name": "Seyal AI"}'
        updated_content = '{"version": "2.0", "name": "Seyal AI Updated"}'

        # Initial write
        res_1 = await create_tool.execute(path=str(target), content=initial_content)
        assert res_1.success

        # Second write without overwrite flag -> Fails safely
        res_collision = await create_tool.execute(path=str(target), content=updated_content, overwrite=False)
        assert not res_collision.success
        assert "already exists" in res_collision.output

        # Recovery write with overwrite=True -> Succeeds cleanly
        res_recovered = await create_tool.execute(path=str(target), content=updated_content, overwrite=True)
        assert res_recovered.success

        # Verify updated content is present
        read_res = await read_tool.execute(path=str(target))
        assert read_res.success
        assert updated_content in read_res.output


# ===========================================================================
# 10. MULTI-PLAN CONSECUTIVE EMERGENCY KILL RECOVERY
# ===========================================================================


class TestConsecutiveEmergencyKillRecovery:
    """Verifies that consecutive emergency stops do not leak state into new executions."""

    def test_recovery_consecutive_emergency_stops_does_not_corrupt_new_plans(self):
        """
        RECOVERY-10: Triggering emergency stops back-to-back across 3 consecutive plans
        must not leak cancellation state into subsequent plans. Plan 4 must execute cleanly.
        """
        cancellation_mgr = CancellationManager()

        # Abort 3 plans consecutively
        for i in range(1, 4):
            plan_id = f"consecutive_aborted_plan_{i}"
            token = cancellation_mgr.create_token(plan_id)
            cancellation_mgr.emergency_stop(plan_id=plan_id, reason=f"Aborting plan #{i}")
            assert token.is_cancelled
            assert token.is_emergency

        # Plan 4: Fresh launch must be completely unaffected
        fresh_token = cancellation_mgr.create_token("plan_recovered_normal_004")
        assert not fresh_token.is_cancelled
        assert not fresh_token.is_emergency

        # Should not raise any exceptions
        fresh_token.check()
