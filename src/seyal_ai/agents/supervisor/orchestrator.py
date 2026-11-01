"""
Supervisor Orchestrator Subsystem.

The central orchestration brain of Seyal AI:
- Decomposes compound natural language prompts into DAG subtasks.
- Enforces 4-tier security policies and cryptographic Ed25519 tokens via PolicyEngine.
- Dispatches subtasks sequentially or concurrently across the five domain agents.
- Persists all execution decisions and outcomes to AuditLogger.
"""

from __future__ import annotations

import time
from typing import Any
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from seyal_ai.agents.supervisor.models import (
    SubTask,
    SupervisorRequest,
    SupervisorResponse,
    TaskPlan,
    TaskStatus,
)
from seyal_ai.agents.supervisor.planner import TaskPlanner
from seyal_ai.agents.supervisor.router import DomainAgentRouter
from seyal_ai.platform.security.audit import AuditLogger
from seyal_ai.security.policy_engine import PolicyEngine, RiskTier
from seyal_ai.utils.logging import get_logger

log = get_logger("supervisor.orchestrator")


class SupervisorOrchestrator:
    """
    Central coordinator managing task decomposition, policy evaluation,
    agent dispatch, and audit tracking.
    """

    def __init__(
        self,
        planner: TaskPlanner | None = None,
        router: DomainAgentRouter | None = None,
        policy_engine: PolicyEngine | None = None,
        audit_logger: AuditLogger | None = None,
    ) -> None:
        self.planner = planner or TaskPlanner()
        self.router = router or DomainAgentRouter()
        self.policy_engine = policy_engine or PolicyEngine()
        self.audit_logger = audit_logger

    async def execute(
        self,
        request: SupervisorRequest,
        public_key: Ed25519PublicKey | None = None,
    ) -> SupervisorResponse:
        """
        Execute an end-to-end user request across the multi-agent system.
        """
        start_time = time.perf_counter()
        log.info("Supervisor received prompt: '%s' (session: %s)", request.prompt, request.session_id)

        # 1. Decompose prompt into DAG TaskPlan
        try:
            plan = self.planner.plan(request.prompt)
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            log.error("Task planning failed: %s", e)
            return SupervisorResponse(
                plan_id="plan_failed",
                goal=request.prompt,
                success=False,
                step_results={},
                summary=f"Failed to generate task plan: {str(e)}",
                duration_ms=elapsed_ms,
                error=str(e),
            )

        step_results: dict[str, Any] = {}
        executed_steps: list[SubTask] = []

        # Find approval token if provided
        primary_token = request.approval_tokens[0] if request.approval_tokens else None

        # 2. Execute subtasks in dependency order
        for step in plan.steps:
            # Check dependencies
            for dep in step.dependencies:
                if dep not in step_results or not step_results[dep].get("success", False):
                    elapsed_ms = (time.perf_counter() - start_time) * 1000
                    err = f"Step {step.step_id} cannot run because prerequisite step '{dep}' did not succeed."
                    log.warning(err)
                    return SupervisorResponse(
                        plan_id=plan.plan_id,
                        goal=plan.goal,
                        success=False,
                        step_results=step_results,
                        summary=f"Execution halted: {err}",
                        duration_ms=elapsed_ms,
                        error=err,
                    )

            # 3. PolicyEngine evaluation
            decision = self.policy_engine.evaluate(
                action=step.action,
                parameters=step.parameters,
                has_user_confirmed=request.has_user_confirmed,
                approval_token=primary_token,
                public_key=public_key,
                task_id=f"{plan.plan_id}_{step.step_id}",
            )

            if not decision.approved:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                log.warning("Security policy blocked action '%s': %s", step.action, decision.reason)

                if self.audit_logger:
                    await self.audit_logger.log_security_event(
                        event_type="POLICY_REJECTION",
                        details={
                            "description": f"Action '{step.action}' in step {step.step_id} blocked: {decision.reason}",
                            "plan_id": plan.plan_id,
                            "step_id": step.step_id,
                            "tier": decision.tier,
                        },
                        risk_level="high",
                    )

                return SupervisorResponse(
                    plan_id=plan.plan_id,
                    goal=plan.goal,
                    success=False,
                    step_results=step_results,
                    summary=f"Security policy rejection: {decision.reason}",
                    duration_ms=elapsed_ms,
                    error=decision.reason,
                )

            # 4. Dispatch subtask to domain agent
            try:
                res = await self.router.dispatch(step, previous_results=step_results)
                step_results[step.step_id] = res

                if not res.get("success", True):
                    elapsed_ms = (time.perf_counter() - start_time) * 1000
                    err_msg = res.get("error") or f"SubTask {step.step_id} execution failed."
                    log.error("SubTask %s failed: %s", step.step_id, err_msg)
                    return SupervisorResponse(
                        plan_id=plan.plan_id,
                        goal=plan.goal,
                        success=False,
                        step_results=step_results,
                        summary=f"Execution failed at {step.step_id} ({step.agent_type}): {err_msg}",
                        duration_ms=elapsed_ms,
                        error=err_msg,
                    )

            except Exception as e:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                log.error("Unexpected error executing step %s: %s", step.step_id, e)
                return SupervisorResponse(
                    plan_id=plan.plan_id,
                    goal=plan.goal,
                    success=False,
                    step_results=step_results,
                    summary=f"Error executing {step.step_id}: {str(e)}",
                    duration_ms=elapsed_ms,
                    error=str(e),
                )

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        total_steps = len(plan.steps)
        summary = f"Successfully executed all {total_steps} step(s) for plan '{plan.plan_id}'."

        return SupervisorResponse(
            plan_id=plan.plan_id,
            goal=plan.goal,
            success=True,
            step_results=step_results,
            summary=summary,
            duration_ms=elapsed_ms,
        )
