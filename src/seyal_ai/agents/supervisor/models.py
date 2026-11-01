"""
Immutable Pydantic V2 Models for Supervisor Orchestrator.

Defines the state contracts for task planning, DAG subtask dependencies,
execution status, and supervisor requests/responses.
"""

from __future__ import annotations

import time
from enum import StrEnum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class TaskStatus(StrEnum):
    """Execution status for plans and subtasks."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SubTask(BaseModel):
    """Individual decomposed step assigned to a domain agent."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    step_id: str = Field(..., description="Unique step identifier (e.g., 'step_1').")
    agent_type: str = Field(
        ...,
        description="Target domain agent: 'terminal', 'computer_use', 'browser', 'devices', 'vision'.",
    )
    action: str = Field(..., description="Action name to execute on target agent.")
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters passed to target agent action.",
    )
    dependencies: list[str] = Field(
        default_factory=list,
        description="List of step_ids that must complete before this step runs.",
    )
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    result: Any = Field(default=None)
    error: str | None = Field(default=None)


class TaskPlan(BaseModel):
    """Complete DAG task plan produced by the Supervisor Planner."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    plan_id: str = Field(..., description="Unique plan identifier.")
    goal: str = Field(..., description="Original user prompt or overall goal.")
    steps: list[SubTask] = Field(..., description="Ordered or DAG list of subtasks.")
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    created_at: float = Field(default_factory=time.time)


class SupervisorRequest(BaseModel):
    """Inbound execution request to Supervisor Orchestrator."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    prompt: str = Field(..., min_length=1, description="Natural language user instruction.")
    session_id: str = Field(default="default_session")
    has_user_confirmed: bool = Field(
        default=False,
        description="Whether the user explicitly approved HIGH risk actions.",
    )
    approval_tokens: list[str] = Field(
        default_factory=list,
        description="List of signed RFC 8785 Ed25519 approval tokens for CRITICAL actions.",
    )


class SupervisorResponse(BaseModel):
    """Outbound consolidated execution result from Supervisor Orchestrator."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    plan_id: str
    goal: str
    success: bool
    step_results: dict[str, Any] = Field(
        default_factory=dict,
        description="Map of step_id -> execution result.",
    )
    summary: str = Field(..., description="Natural language summary of overall execution.")
    duration_ms: float = Field(..., ge=0.0)
    error: str | None = Field(default=None)
