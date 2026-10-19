"""
Seyal AI Reliability Testing Suite.

Verifies system durability, long-running stability, state transition repeatability,
and fault-tolerant recovery under extended multi-turn and high-stress operating conditions:
1. RELIABILITY-01: Voice Activity Detection (VAD) Continuous Cycle Durability (50 Speech/Silence Cycles).
2. RELIABILITY-02: Filesystem Tool Idempotency & Repeatability (20 Repeated Overwrites & Safe Deletion).
3. RELIABILITY-03: Long-Running Conversational Context Memory Stability (500 Dialogue Turns).
4. RELIABILITY-04: Concurrent Cancellation Token Resilience (50 Concurrent Async Workers).
5. RELIABILITY-05: Telemetry Hub Multi-Task Lifecycle & Live State Synchronization.
6. RELIABILITY-06: Steering Intent Routing Determinism Across Repeated Invocations.
7. RELIABILITY-07: Desktop Screen Coordinate Clamping Mathematical Invariant Verification (10,000 Points).
8. RELIABILITY-08: Audio Feedback Subsystem Event Flooding & Thread Stability.
9. RELIABILITY-09: Terminal Security Classifier Adversarial String Resilience (No ReDoS).
10. RELIABILITY-10: ComputerAction Batch Pipeline State Immutability & Consistency.
"""

from __future__ import annotations

import asyncio
import random
import time
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pytest

from seyal_ai.accessibility.audio_feedback import AudioFeedbackManager, EarconType
from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.core.context import ContextManager
from seyal_ai.core.telemetry_hub import TelemetryHub
from seyal_ai.planning.cancellation import CancellationManager
from seyal_ai.planning.steering_router import IntentClassification, SteeringIntentRouter
from seyal_ai.security.terminal_security import TerminalSecurityClassifier
from seyal_ai.tools.system.files import CreateFileTool, DeletePathTool, ReadFileTool
from seyal_ai.voice.vad import VADState, VoiceActivityDetector

# ===========================================================================
# 1. VOICE ACTIVITY DETECTION CONTINUOUS CYCLE DURABILITY
# ===========================================================================


class TestVADReliability:
    """Verifies VAD state machine durability across repeated cycles without buffer leaks."""

    def test_reliability_vad_continuous_speech_silence_cycles(self):
        """
        RELIABILITY-01: Cycling through 50 continuous speech and silence transitions
        must preserve state transitions faithfully without buffer corruption or drift.
        """
        vad = VoiceActivityDetector(sample_rate=16000, energy_threshold=100)
        t = np.linspace(0, 0.032, 512, endpoint=False)
        speech_chunk = (4000 * np.sin(2 * np.pi * 440 * t)).astype(np.int16)
        silence_chunk = np.zeros(512, dtype=np.int16)

        for _cycle_idx in range(50):
            # Silence step
            state_silence = vad.process_chunk(silence_chunk)
            assert state_silence == VADState.IDLE

            # Speech step
            state_speech = vad.process_chunk(speech_chunk)
            assert state_speech == VADState.SPEECH

            # Retrieve and reset
            segment = vad.get_speech_segment()
            assert segment is not None and len(segment) >= 512
            vad.reset()
            assert vad.state == VADState.IDLE

        # Final verification: VAD remains fully operational after 50 cycles
        final_state = vad.process_chunk(silence_chunk)
        assert final_state == VADState.IDLE
        assert vad.state == VADState.IDLE


# ===========================================================================
# 2. FILESYSTEM TOOL IDEMPOTENCY & FAULT-TOLERANCE
# ===========================================================================


class TestFilesystemReliability:
    """Verifies filesystem tool idempotency, repeatable overwrites, and graceful error recovery."""

    @pytest.mark.asyncio
    async def test_reliability_repeated_file_overwrites_and_idempotent_delete(self, tmp_path: Path):
        """
        RELIABILITY-02: Repeatedly overwriting the same target file 20 times must succeed 100%
        of the time with consistent read-back. Deleting the file once succeeds; subsequent
        deletion attempts must fail gracefully without raising unhandled exceptions.
        """
        create_tool = CreateFileTool()
        read_tool = ReadFileTool()
        delete_tool = DeletePathTool()

        target_file = tmp_path / "reliability_test_artifact.txt"

        # 20 repeated sequential writes
        for write_idx in range(20):
            payload = f"Reliability Payload Generation #{write_idx} - Seyal AI Verification."
            write_res = await create_tool.execute(path=str(target_file), content=payload, overwrite=True)
            assert write_res.success is True

            read_res = await read_tool.execute(path=str(target_file))
            assert read_res.success is True
            assert payload in read_res.output

        # First deletion with confirmation -> Must succeed
        del_res_1 = await delete_tool.execute(path=str(target_file), confirmed=True)
        assert del_res_1.success is True
        assert not target_file.exists()

        # Second deletion of now non-existent file -> Must fail gracefully (False), not crash
        del_res_2 = await delete_tool.execute(path=str(target_file), confirmed=True)
        assert del_res_2.success is False
        assert "does not exist" in del_res_2.output


# ===========================================================================
# 3. LONG-RUNNING CONVERSATIONAL CONTEXT STABILITY (500 TURNS)
# ===========================================================================


class TestContextMemoryReliability:
    """Verifies conversational memory window stability across extended multi-hour sessions."""

    def test_reliability_long_running_context_memory_500_turns(self):
        """
        RELIABILITY-03: Simulating a 500-turn conversational session (1,000 messages)
        in ContextManager must:
        1. Maintain bounded message list length (never exceeding max_turns * 2 + 2).
        2. Strictly preserve the original system prompt at index 0.
        3. Continuously distill evicted turns into rolling summary without memory cliffs.
        """
        ctx = ContextManager(max_turns=10)
        system_instruction = "You are Seyal AI, an intelligent desktop pairing assistant."
        ctx.set_system_prompt(system_instruction)

        for turn_idx in range(500):
            ctx.add_user_message(f"User instruction turn #{turn_idx}: Execute automated workflow.")
            ctx.add_assistant_message(f"Seyal AI turn #{turn_idx}: Step executed successfully.")

        messages = ctx.get_messages()

        # 1. Bounded working memory
        assert len(messages) <= 22, f"Expected <= 22 messages, got {len(messages)}"

        # 2. System prompt preserved at index 0
        system_msg = messages[0]
        assert system_msg.role == "system"
        assert system_instruction in system_msg.content

        # 3. Rolling summary successfully injected into context
        assert "[EARLIER CONVERSATION MEMORY" in system_msg.content
        assert "Seyal AI" in system_msg.content


# ===========================================================================
# 4. CONCURRENT CANCELLATION TOKEN RESILIENCE
# ===========================================================================


class TestCancellationReliability:
    """Verifies thread-safe and asyncio-safe cancellation token management under concurrency."""

    @pytest.mark.asyncio
    async def test_reliability_concurrent_cancellation_under_50_workers(self):
        """
        RELIABILITY-04: 50 concurrent async tasks creating, inspecting, and cancelling tokens
        simultaneously must complete without race conditions or state corruption.
        """
        cancellation_mgr = CancellationManager()

        async def worker_task(idx: int) -> bool:
            plan_id = f"plan_concurrent_{idx}"
            token = cancellation_mgr.create_token(plan_id)
            await asyncio.sleep(0.001)

            # Alternate between emergency stop and graceful cancellation
            if idx % 2 == 0:
                token.emergency_stop(reason=f"Emergency trigger from worker {idx}")
            else:
                token.cancel(reason=f"Graceful abort from worker {idx}")

            # Verify token state consistency
            retrieved = cancellation_mgr.get_token(plan_id)
            assert retrieved is not None
            assert retrieved.is_cancelled is True
            if idx % 2 == 0:
                assert retrieved.is_emergency is True
            return True

        # Run 50 concurrent workers
        results = await asyncio.gather(*(worker_task(i) for i in range(50)))
        assert len(results) == 50
        assert all(results)


# ===========================================================================
# 5. TELEMETRY HUB MULTI-TASK LIFECYCLE SYNCHRONIZATION
# ===========================================================================


class TestTelemetryHubReliability:
    """Verifies live task state tracking across sequential and interleaved lifecycles."""

    def test_reliability_telemetry_hub_sequential_task_lifecycles(self):
        """
        RELIABILITY-05: Registering, tracking, and completing 25 sequential tasks in TelemetryHub
        must keep narrative state synchronized and return None when all tasks complete.
        """
        hub = TelemetryHub.get_instance()

        for task_idx in range(25):
            task_id = f"telemetry_task_{task_idx}"
            goal = f"Automated Task Goal #{task_idx}"

            state = hub.register_task(task_id, goal=goal, max_steps=5)
            assert state.is_active is True

            # Progress steps 1 to 5
            for step in range(1, 6):
                hub.update_task_progress(task_id, step=step, action_summary=f"Running step {step}")
                narrative = hub.get_live_status_narrative()
                assert narrative is not None
                assert goal in narrative

            # Complete task
            hub.complete_task(task_id, success=True, final_summary=f"Task #{task_idx} finished.")
            assert not state.is_active

        # Once all tasks complete, primary active narrative must be None
        final_narrative = hub.get_live_status_narrative()
        assert final_narrative is None


# ===========================================================================
# 6. STEERING INTENT ROUTING DETERMINISM
# ===========================================================================


class TestSteeringRouterReliability:
    """Verifies deterministic intent classification across repeated invocations."""

    @pytest.mark.asyncio
    async def test_reliability_steering_intent_classification_determinism(self):
        """
        RELIABILITY-06: Repeatedly evaluating identical steering utterances 30 times
        must yield 100% identical classifications (zero stochastic variance).
        """
        router = SteeringIntentRouter()
        test_cases = [
            ("niruthu, cancel that immediately", IntentClassification.CANCEL),
            ("evalo neram aagum, what is the status?", IntentClassification.STATUS_QUERY),
            ("idhu venaam, open notepad instead", IntentClassification.PIVOT),
        ]

        for utterance, expected_category in test_cases:
            for repetition in range(30):
                result = await router.classify(utterance, active_task_goal="Process document")
                assert result.category == expected_category, (
                    f"Repetition {repetition} failed for '{utterance}': "
                    f"got {result.category}, expected {expected_category}"
                )


# ===========================================================================
# 7. SCREEN COORDINATE CLAMPING INVARIANT VERIFICATION
# ===========================================================================


class TestScreenCoordinateInvariantReliability:
    """Verifies mathematical boundary invariant holds across 10,000 arbitrary coordinates."""

    def test_reliability_screen_coordinate_clamping_invariant_10k_points(self):
        """
        RELIABILITY-07: For 10,000 arbitrary coordinates (including extreme negatives,
        astronomical numbers, and boundary values), clamping must ALWAYS satisfy:
        0 <= cx < screen_width and 0 <= cy < screen_height.
        Invariant violation rate must be strictly 0.00%.
        """
        executor = ComputerActionExecutor()
        width, height = executor.screen_dimensions
        rng = random.Random(42)  # Fixed seed for repeatable determinism

        violation_count = 0
        total_evaluations = 10000

        for _ in range(total_evaluations):
            rx = rng.randint(-50000, 50000)
            ry = rng.randint(-50000, 50000)

            cx, cy = executor._clamp_coordinates(rx, ry)

            # Strict invariant check
            if not (0 <= cx < width and 0 <= cy < height):
                violation_count += 1

        assert violation_count == 0, f"Encountered {violation_count} coordinate invariant violations!"


# ===========================================================================
# 8. AUDIO FEEDBACK EVENT FLOODING & THREAD STABILITY
# ===========================================================================


class TestAudioFeedbackReliability:
    """Verifies audio feedback manager thread stability under high event volumes."""

    def test_reliability_audio_feedback_event_flooding(self):
        """
        RELIABILITY-08: Flooding 100 sequential earcon triggers across all states
        must execute cleanly without thread exhaustion, deadlocks, or unhandled exceptions.
        """
        audio_mgr = AudioFeedbackManager(enabled=True)

        earcon_sequence = [
            EarconType.WAKE,
            EarconType.SUCCESS,
            EarconType.ERROR,
            EarconType.CONFIRMATION_REQUIRED,
            EarconType.EMERGENCY_STOP,
            EarconType.PROCESSING,
        ] * 20  # 120 triggers

        # Mock playback to isolate dispatch thread lifecycle
        with patch.object(audio_mgr, "_play_tones") as mock_play:
            for et in earcon_sequence:
                audio_mgr.play_earcon(et, async_play=False)

            assert mock_play.call_count == 120


# ===========================================================================
# 9. TERMINAL SECURITY CLASSIFIER ADVERSARIAL STRING RESILIENCE
# ===========================================================================


class TestSecurityClassifierReliability:
    """Verifies regex firewall robustness against adversarial and deeply repetitive commands."""

    def test_reliability_terminal_security_adversarial_strings_no_redos(self):
        """
        RELIABILITY-09: Evaluating adversarial shell command inputs (nested parentheses,
        repetitive flags, chained pipes, and long strings) must complete safely without
        catastrophic regex backtracking (ReDoS) or timing out.
        """
        classifier = TerminalSecurityClassifier()

        adversarial_commands = [
            "echo " + ("a" * 500),  # Long argument
            "dir " + ("/s " * 50),   # Repetitive flags
            "((((((((dir))))))))",  # Deeply nested parentheses
            "dir | " * 30 + "echo done",  # Chained pipeline
            "format " + (" " * 100) + "C: /fs:NTFS",  # Spaced dangerous command
            "rmdir" + ("/s /q " * 20) + "C:\\Windows",  # Repeated dangerous flags
            "'; DROP TABLE users; --",  # SQL injection string in CLI
            "&& && && dir",  # Malformed shell syntax
        ]

        for cmd in adversarial_commands:
            start_time = time.perf_counter()
            result = classifier.analyze(cmd)
            elapsed = time.perf_counter() - start_time

            # Each adversarial inspection must finish under 50ms (no ReDoS lockup)
            assert elapsed < 0.050, f"ReDoS suspected: command took {elapsed:.3f}s: {cmd[:40]}..."
            assert result is not None
            assert hasattr(result, "status")


# ===========================================================================
# 10. COMPUTER ACTION BATCH PIPELINE STATE CONSISTENCY
# ===========================================================================


class TestComputerActionPipelineReliability:
    """Verifies dataclass immutability and schema integrity in high-throughput action pipelines."""

    def test_reliability_computer_action_batch_pipeline_consistency(self):
        """
        RELIABILITY-10: Constructing and verifying a pipeline of 200 sequential action primitives
        must preserve all field mappings, action types, and coordinate representations without corruption.
        """
        action_pipeline: list[ComputerAction] = []

        for i in range(200):
            action = ComputerAction(
                action_type=ActionType.CLICK if i % 2 == 0 else ActionType.TYPE_TEXT,
                x=100 + (i % 500),
                y=200 + (i % 300),
                text=f"Sample text input {i}" if i % 2 != 0 else None,
                reasoning=f"Reliability step #{i}",
            )
            action_pipeline.append(action)

        assert len(action_pipeline) == 200

        # Verify integrity of all 200 actions
        for idx, act in enumerate(action_pipeline):
            assert act.action_type in (ActionType.CLICK, ActionType.TYPE_TEXT)
            assert act.x == 100 + (idx % 500)
            assert act.y == 200 + (idx % 300)
            assert f"Reliability step #{idx}" in act.reasoning
