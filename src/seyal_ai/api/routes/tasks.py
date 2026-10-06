"""
Seyal AI API — Planning & Multi-Step Task Routes.

Endpoints for submitting multi-step tasks, retrieving progress, managing plan steps,
and triggering graceful or emergency cancellations.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from seyal_ai.planning.manager import TaskManager
from seyal_ai.utils.logging import get_logger

log = get_logger("api.routes.tasks")

router = APIRouter(prefix="/tasks", tags=["Tasks & Planning"])

# Module-level singleton
_task_manager = TaskManager()


def get_task_manager() -> TaskManager:
    """Get the task manager instance."""
    return _task_manager


# --- Request & Response Models ---


class SubmitTaskRequest(BaseModel):
    goal: str = Field(..., description="High-level user goal description")
    context: dict[str, Any] = Field(default_factory=dict, description="Context variables")
    execute_now: bool = Field(default=True, description="Whether to execute immediately upon planning")


class CancelTaskRequest(BaseModel):
    reason: str = Field(default="User requested cancellation", description="Reason for cancellation")


class EmergencyStopRequest(BaseModel):
    reason: str = Field(default="EMERGENCY STOP triggered via API", description="Reason for emergency stop")


class TaskPermissionActionRequest(BaseModel):
    action: str = Field(default="grant", description="grant | deny")


class ClassifyTaskRequest(BaseModel):
    instruction: str = Field(..., min_length=1, description="Raw instruction to classify")


# --- Routes ---


@router.post("", response_model=dict[str, Any])
async def submit_task(req: SubmitTaskRequest, request: Request) -> dict[str, Any]:
    """Submit a high-level goal, generate a multi-step plan, and optionally execute it."""
    mgr = _task_manager
    if request and hasattr(request.app.state, "brain"):
        brain = request.app.state.brain
        if hasattr(brain, "task_manager") and brain.task_manager:
            mgr = brain.task_manager

    plan = await mgr.submit_goal(goal_text=req.goal, context=req.context)

    if req.execute_now:
        exec_result = await mgr.execute_task(plan)
        return {
            "plan": plan.to_dict(),
            "execution": exec_result.to_dict(),
        }

    return {
        "plan": plan.to_dict(),
        "execution": None,
    }


@router.get("", response_model=dict[str, Any])
async def list_tasks(request: Request) -> dict[str, Any]:
    """List all tracked plans and their current execution status."""
    mgr = _task_manager
    if hasattr(request.app.state, "brain"):
        brain = request.app.state.brain
        if hasattr(brain, "task_manager") and brain.task_manager:
            mgr = brain.task_manager

    plans = mgr.list_tasks()
    return {
        "count": len(plans),
        "tasks": [p.to_dict() for p in plans],
    }


@router.get("/{task_id}", response_model=dict[str, Any])
async def get_task_details(task_id: str, request: Request) -> dict[str, Any]:
    """Get the full plan and step details for a specific task."""
    mgr = _task_manager
    if hasattr(request.app.state, "brain"):
        brain = request.app.state.brain
        if hasattr(brain, "task_manager") and brain.task_manager:
            mgr = brain.task_manager

    plan = mgr.get_task(task_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    progress = mgr.get_task_progress(task_id)
    return {
        "task": plan.to_dict(),
        "progress": progress.to_dict() if progress else None,
    }


@router.post("/{task_id}/execute", response_model=dict[str, Any])
async def execute_task_by_id(task_id: str, request: Request) -> dict[str, Any]:
    """Execute a previously submitted plan."""
    mgr = _task_manager
    if hasattr(request.app.state, "brain"):
        brain = request.app.state.brain
        if hasattr(brain, "task_manager") and brain.task_manager:
            mgr = brain.task_manager

    plan = mgr.get_task(task_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    result = await mgr.execute_task(plan)
    return {
        "task": plan.to_dict(),
        "result": result.to_dict(),
    }


@router.post("/{task_id}/cancel", response_model=dict[str, Any])
async def cancel_task_by_id(
    task_id: str, req: CancelTaskRequest, request: Request
) -> dict[str, Any]:
    """Gracefully cancel an active task."""
    mgr = _task_manager
    if hasattr(request.app.state, "brain"):
        brain = request.app.state.brain
        if hasattr(brain, "task_manager") and brain.task_manager:
            mgr = brain.task_manager

    success = mgr.cancellation.cancel_task(task_id, reason=req.reason)
    if not success:
        raise HTTPException(status_code=404, detail=f"Active task '{task_id}' not found or already stopped")

    return {
        "success": True,
        "task_id": task_id,
        "reason": req.reason,
    }


@router.post("/emergency/stop", response_model=dict[str, Any])
async def trigger_emergency_stop(
    req: EmergencyStopRequest, request: Request
) -> dict[str, Any]:
    """Immediately halt all active tasks and background operations."""
    mgr = _task_manager
    if hasattr(request.app.state, "brain"):
        brain = request.app.state.brain
        if hasattr(brain, "task_manager") and brain.task_manager:
            mgr = brain.task_manager

    result = mgr.emergency_stop(reason=req.reason)
    return {
        "emergency_stop": True,
        "details": result,
    }


@router.post("/classify", response_model=dict[str, Any])
async def classify_task(req: ClassifyTaskRequest) -> dict[str, Any]:
    """Classify user instruction into intent (notify vs task) and type (1-4)."""
    from seyal_ai.planning.task_classifier import task_semantic_classifier
    spec = await task_semantic_classifier.classify_instruction(req.instruction)
    return spec.model_dump()


@router.post("/{task_id}/permission", response_model=dict[str, Any])
async def update_task_permission(
    task_id: str, req: TaskPermissionActionRequest, request: Request
) -> dict[str, Any]:
    """Grant or deny permission for a pending Type 2, 3, or 4 task."""
    mgr = _task_manager
    if hasattr(request.app.state, "brain"):
        brain = request.app.state.brain
        if hasattr(brain, "task_manager") and brain.task_manager:
            mgr = brain.task_manager

    plan = mgr.get_task(task_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    from seyal_ai.planning.task_types import TaskPermissionState
    if req.action.lower() == "grant":
        setattr(plan, "permission_state", TaskPermissionState.GRANTED.value)
        setattr(plan, "status", "in_progress")
        return {"task_id": task_id, "status": "permission_granted"}
    else:
        setattr(plan, "permission_state", TaskPermissionState.DENIED.value)
        setattr(plan, "status", "cancelled")
        return {"task_id": task_id, "status": "permission_denied"}

