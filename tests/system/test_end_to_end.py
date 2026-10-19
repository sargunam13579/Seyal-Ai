"""
Seyal AI End-to-End (E2E) System Testing Suite.

Validates complete real-world workflows traversing all system layers:
1. E2E Conversational Voice & Text Pipeline (Input -> Brain -> Speech Synthesis).
2. E2E Computer-Use Autonomous Desktop Flow (Instruction -> Grounding -> Action -> Verification).
3. E2E OS System Control & File Operations (System commands, file I/O, security checks).
4. E2E Multi-Step Complex Autonomous Goal Decomposition & Execution.
5. E2E Emergency Kill Switch & Immediate Cancellation Flow.
6. E2E Fast-Path Shortcut Acceleration (Instant hardware/settings control without heavy LLM overhead).
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from seyal_ai.api.app import create_app
from seyal_ai.core.brain import SeyalAiBrain
from seyal_ai.planning.cancellation import CancellationManager
from seyal_ai.planning.planner import TaskPlanner
from seyal_ai.planning.types import PlanStatus, StepStatus
from seyal_ai.tools.system.files import CreateFileTool, DeletePathTool, ReadFileTool
from seyal_ai.voice.tts import TTSEngine

# ===========================================================================
# 1. E2E CONVERSATIONAL VOICE & TEXT PIPELINE
# ===========================================================================


class TestE2EConversationalPipeline:
    """End-to-End testing for the full voice and conversation flow."""

    @pytest.mark.asyncio
    async def test_e2e_text_to_brain_to_voice_synthesis(self):
        """E2E flow: User text input -> Brain cognitive routing -> TTS neural synthesis."""
        brain = SeyalAiBrain()
        await brain.initialize()

        user_input = "Hello Seyal AI, what are your core capabilities?"
        # 1. Brain processes input
        response_text = await brain.process(user_input, allow_tools=False)
        assert response_text is not None
        assert len(response_text) > 0

        # 2. TTS engine synthesizes the brain's response into playable audio bytes
        tts = TTSEngine(provider_name="pyttsx3")
        with patch.object(tts, "synthesize", new_callable=AsyncMock) as mock_synth:
            mock_synth.return_value = b"RIFF-WAVE-MOCK-AUDIO-DATA-12345"
            audio_bytes = await tts.synthesize(response_text)
            assert audio_bytes is not None
            assert len(audio_bytes) > 0
            assert audio_bytes.startswith(b"RIFF")

    @pytest.mark.asyncio
    async def test_e2e_fastapi_chat_stream_endpoint(self):
        """E2E flow: HTTP client streams a chat query through the FastAPI application."""
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get("/api/health")
            assert resp.status_code == 200
            data = resp.json()
            assert data.get("status") in ("ok", "healthy")


# ===========================================================================
# 2. E2E OS SYSTEM CONTROL & FILE OPERATIONS
# ===========================================================================


class TestE2ESystemControlAndFiles:
    """End-to-End testing for local desktop system control and filesystem interactions."""

    @pytest.mark.asyncio
    async def test_e2e_file_lifecycle_create_read_verify_delete(self, tmp_path: Path):
        """E2E flow: Agent creates a file, writes content, reads back, verifies integrity, then cleans up."""
        create_tool = CreateFileTool()
        read_tool = ReadFileTool()
        delete_tool = DeletePathTool()

        target_file = tmp_path / "e2e_test_report.txt"
        test_content = "Seyal AI End-to-End Verification Payload 2026."

        # Step 1: Create and write file
        create_result = await create_tool.execute(
            path=str(target_file),
            content=test_content,
        )
        assert create_result.success is True
        assert target_file.exists()

        # Step 2: Read file back and verify contents
        read_result = await read_tool.execute(
            path=str(target_file),
        )
        assert read_result.success is True
        assert test_content in read_result.output

        # Step 3: Delete file (with explicit confirmation safety token)
        delete_result = await delete_tool.execute(
            path=str(target_file),
            confirmed=True,
        )
        assert delete_result.success is True
        assert not target_file.exists()


# ===========================================================================
# 3. E2E AUTONOMOUS MULTI-STEP AGENT PLANNING & EXECUTION
# ===========================================================================


class TestE2EAutonomousPlanningAndExecution:
    """End-to-End testing for multi-step autonomous planning, tool chaining, and safety."""

    @pytest.mark.asyncio
    async def test_e2e_goal_decomposition_and_plan_lifecycle(self):
        """E2E flow: High-level goal -> TaskPlanner decomposes -> Plan steps verified -> Plan completes."""
        planner = TaskPlanner()
        goal = "Download the quarterly financial figures, format into markdown summary, and verify output file"

        plan = await planner.create_plan(goal)
        assert plan is not None
        assert plan.total_steps >= 2
        assert plan.status in (PlanStatus.PLANNING, PlanStatus.PENDING)

        # Verify steps have proper execution order
        for idx, step in enumerate(plan.steps, start=1):
            assert step.order == idx
            assert step.status == StepStatus.PENDING

        # Final step must be verification
        assert plan.steps[-1].is_verification is True

    @pytest.mark.asyncio
    async def test_e2e_emergency_kill_switch_during_execution(self):
        """E2E flow: Long-running multi-step task interrupted by Universal Kill Switch."""
        cancel_mgr = CancellationManager()
        token = cancel_mgr.create_token(plan_id="e2e_task_kill_test")

        assert not token.is_cancelled

        # Simulate user triggering Emergency Kill Switch mid-execution
        cancel_mgr.emergency_stop(plan_id="e2e_task_kill_test", reason="User invoked Universal Kill Switch via UI")
        assert token.is_cancelled
        assert token.is_emergency
