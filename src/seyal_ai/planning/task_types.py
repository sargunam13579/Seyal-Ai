"""Seyal AI Autonomous Task Types & Protocol Definitions.

Defines:
- TaskIntentType: NOTIFY (observe & speak only) vs TASK (autonomous execution)
- TaskType:
    - IMMEDIATE (Type 1: runs right now)
    - SCHEDULED (Type 2: runs after specified time/delay)
    - CONTINUOUS (Type 3: permanent continuous watcher/worker)
    - CONDITIONAL (Type 4: if-else event/trigger driven)
- TaskPermissionState: tracks permission grants/overrides
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class TaskIntentType(str, Enum):
    NOTIFY = "notify"  # Observe & speak only, zero OS modification
    TASK = "task"      # Autonomous computer-use action execution


class TaskType(str, Enum):
    IMMEDIATE = "immediate"      # Type 1: Execute now
    SCHEDULED = "scheduled"      # Type 2: Time/date delay
    CONTINUOUS = "continuous"    # Type 3: Permanent ongoing loop
    CONDITIONAL = "conditional"  # Type 4: If-else condition triggered


class TaskPermissionState(str, Enum):
    NOT_REQUIRED = "not_required"       # Type 1 tasks do not require permission
    AUTO_GRANTED = "auto_granted"       # User explicitly said "permission venam" / "do it directly"
    PENDING = "pending"                 # Default for Types 2, 3, 4 awaiting confirmation
    GRANTED = "granted"                 # User granted permission via voice or UI
    DENIED = "denied"                   # User denied permission


class AutonomousTaskSpec(BaseModel):
    """Normalized specification for any autonomous task or notification."""
    id: str = Field(..., description="Unique task identifier")
    title: str = Field(..., description="User-facing task summary")
    original_instruction: str = Field(..., description="Exact raw prompt given by the user")
    intent_type: TaskIntentType = Field(default=TaskIntentType.TASK)
    task_type: TaskType = Field(default=TaskType.IMMEDIATE)
    permission_state: TaskPermissionState = Field(default=TaskPermissionState.NOT_REQUIRED)
    condition: Optional[str] = Field(default=None, description="Event or condition to evaluate for Type 4")
    scheduled_time: Optional[str] = Field(default=None, description="Timestamp or time descriptor for Type 2")
    recurring_interval: Optional[str] = Field(default=None, description="Cron or interval descriptor for Type 3")
    status: str = Field(default="pending", description="pending | waiting_permission | in_progress | completed | failed | cancelled")
    created_at: float = Field(default_factory=lambda: 0.0)
    completion_narration: Optional[str] = Field(default=None, description="Spoken completion summary")
    metadata: Dict[str, Any] = Field(default_factory=dict)
