"""
Unit and Integration Tests for Supervisor Orchestrator, Planner, Router, and Fallback.
"""

import asyncio
import time
import pytest
from unittest.mock import AsyncMock, MagicMock

from seyal_ai.agents.browser.models import BrowserResponse
from seyal_ai.agents.computer_use.models import ComputerUseResponse
from seyal_ai.agents.devices.models import DeviceResponse
from seyal_ai.agents.supervisor.fallback import FallbackError, LLMFallbackHandler
from seyal_ai.agents.supervisor.models import SubTask, SupervisorRequest, TaskPlan, TaskStatus
from seyal_ai.agents.supervisor.orchestrator import SupervisorOrchestrator
from seyal_ai.agents.supervisor.planner import PlanningError, TaskPlanner
from seyal_ai.agents.supervisor.router import DomainAgentRouter
from seyal_ai.agents.terminal.models import TerminalResponse
from seyal_ai.agents.vision.models import VisionResponse
from seyal_ai.security.approval_token import (
    ApprovalTokenManager,
    ApprovalTokenPayload,
    compute_target_hash,
)
from seyal_ai.security.nonce_store import SqliteNonceStore
from seyal_ai.security.policy_engine import PolicyEngine


class TestTaskPlanner:
    """Tests natural language task decomposition into DAG plans."""

    def test_plan_compound_pipeline(self):
        planner = TaskPlanner()
        prompt = "Fetch log from browser, run analysis in terminal, and alert phone"
        plan = planner.plan(prompt)

        assert len(plan.steps) == 3
        s1, s2, s3 = plan.steps
        assert s1.agent_type == "browser"
        assert s2.agent_type == "terminal"
        assert s3.agent_type == "devices"
        assert s2.dependencies == [s1.step_id]
        assert s3.dependencies == [s2.step_id]

    def test_plan_vision_computer_use(self):
        planner = TaskPlanner()
        prompt = "Look at the screen, find the button and click mouse"
        plan = planner.plan(prompt)

        assert len(plan.steps) == 2
        assert plan.steps[0].agent_type == "vision"
        assert plan.steps[1].agent_type == "computer_use"
        assert plan.steps[1].dependencies == [plan.steps[0].step_id]

    def test_cycle_detection(self):
        s1 = SubTask(step_id="step_1", agent_type="terminal", action="echo", dependencies=["step_2"])
        s2 = SubTask(step_id="step_2", agent_type="terminal", action="echo", dependencies=["step_1"])

        with pytest.raises(PlanningError, match="Cyclic dependency"):
            TaskPlanner.validate_dag([s1, s2])


class TestSupervisorOrchestrator:
    """Tests end-to-end multi-agent orchestration and security gates."""

    @pytest.fixture
    def mock_router(self):
        router = DomainAgentRouter(
            terminal_agent=MagicMock(),
            computer_use_agent=MagicMock(),
            browser_agent=MagicMock(),
            devices_agent=MagicMock(),
            vision_agent=MagicMock(),
        )
        router.terminal.execute = AsyncMock(
            return_value=TerminalResponse(
                command="echo ok",
                stdout="analysis done\n",
                stderr="",
                exit_code=0,
                duration_ms=10.0,
                safety_status="safe",
            )
        )
        router.browser.execute = AsyncMock(
            return_value=BrowserResponse(
                action_type="navigate",
                success=True,
                current_url="https://example.com/logs",
                title="Log View",
                duration_ms=50.0,
            )
        )
        router.devices.execute = AsyncMock(
            return_value=DeviceResponse(
                action_type="tap",
                success=True,
                device_id="emulator-5554",
                duration_ms=15.0,
            )
        )
        router.vision.execute = AsyncMock(
            return_value=VisionResponse(
                action_type="capture",
                success=True,
                ocr_text="Login Screen",
                duration_ms=25.0,
            )
        )
        return router

    @pytest.fixture
    def orchestrator(self, mock_router, tmp_path):
        db_file = tmp_path / "orchestrator_nonces.db"
        policy_engine = PolicyEngine(nonce_store=SqliteNonceStore(db_file))
        return SupervisorOrchestrator(
            planner=TaskPlanner(),
            router=mock_router,
            policy_engine=policy_engine,
        )

    @pytest.mark.asyncio
    async def test_end_to_end_compound_execution_with_user_confirmation(self, orchestrator):
        # Compound prompt requires user confirmation for terminal execution
        req = SupervisorRequest(
            prompt="Fetch log from browser, run analysis in terminal, and alert phone",
            has_user_confirmed=True,
        )
        resp = await orchestrator.execute(req)

        assert resp.success is True
        assert len(resp.step_results) == 3
        assert "step_1" in resp.step_results
        assert "step_2" in resp.step_results
        assert "step_3" in resp.step_results
        assert resp.duration_ms > 0

    @pytest.mark.asyncio
    async def test_high_risk_blocked_without_user_confirmation(self, orchestrator):
        req = SupervisorRequest(
            prompt="Fetch log from browser, run analysis in terminal, and alert phone",
            has_user_confirmed=False,  # High risk terminal step will be blocked
        )
        resp = await orchestrator.execute(req)

        # Step 1 (browser) succeeds, but step 2 (terminal) is rejected by policy engine
        assert resp.success is False
        assert "HIGH risk action requires active user session confirmation" in resp.summary

    @pytest.mark.asyncio
    async def test_upstream_failure_halts_downstream_steps(self, orchestrator, mock_router):
        # Configure browser step to fail
        mock_router.browser.execute = AsyncMock(
            return_value=BrowserResponse(
                action_type="navigate",
                success=False,
                current_url="https://example.com/logs",
                title="",
                duration_ms=50.0,
                error="DNS resolution failed",
            )
        )
        req = SupervisorRequest(
            prompt="Fetch log from browser, run analysis in terminal, and alert phone",
            has_user_confirmed=True,
        )
        resp = await orchestrator.execute(req)

        assert resp.success is False
        assert "DNS resolution failed" in resp.summary
        # Downstream terminal and phone steps should not have run
        assert "step_2" not in resp.step_results
        assert "step_3" not in resp.step_results


class TestLLMFallbackHandler:
    """Tests sequential LLM failover, timeouts, and billing uncertainty logging."""

    @pytest.mark.asyncio
    async def test_primary_succeeds_fast(self):
        handler = LLMFallbackHandler(primary_provider="primary-ai", secondary_provider="secondary-ai")

        async def fast_primary():
            return "Primary result"

        async def secondary():
            return "Secondary result"

        result, provider = await handler.execute_with_fallback("test prompt", fast_primary, secondary)
        assert result == "Primary result"
        assert provider == "primary-ai"

    @pytest.mark.asyncio
    async def test_primary_timeout_triggers_clean_secondary(self):
        audit_mock = MagicMock()
        audit_mock.log_security_event = AsyncMock()
        handler = LLMFallbackHandler(
            primary_provider="primary-ai",
            secondary_provider="secondary-provider",
            first_token_timeout=0.05,  # 50ms timeout for test speed
            audit_logger=audit_mock,
        )

        async def slow_primary():
            await asyncio.sleep(0.5)  # Longer than 50ms
            return "Slow primary result"

        async def secondary():
            return "Fresh secondary result"

        result, provider = await handler.execute_with_fallback("test prompt", slow_primary, secondary)
        assert result == "Fresh secondary result"
        assert provider == "secondary-provider"

        # Check audit logger was notified of uncertain billing
        audit_mock.log_security_event.assert_called_once()
        call_kwargs = audit_mock.log_security_event.call_args[1]
        assert call_kwargs["event_type"] == "PROVIDER_BILLING_UNCERTAIN"
