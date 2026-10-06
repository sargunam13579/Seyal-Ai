"""
Seyal AI Planning & Multi-Step Autonomous Agent Package.

Provides goal decomposition, dynamic tool selection, plan execution, progress tracking,
resilient retries, confirmation management, result verification, and emergency stops.
"""

from seyal_ai.planning.cancellation import (
    CancellationManager,
    CancellationToken,
    CancellationType,
    EmergencyStopError,
    EmergencyStopException,
    TaskCancelledError,
    TaskCancelledException,
)
from seyal_ai.planning.executor import PlanExecutionEngine
from seyal_ai.planning.manager import TaskManager
from seyal_ai.planning.planner import TaskPlanner
from seyal_ai.planning.progress import ProgressTracker
from seyal_ai.planning.retry import ErrorCategory, RetryDecision, RetrySystem
from seyal_ai.planning.tool_selector import ToolSelector
from seyal_ai.planning.types import (
    ExecutionResult,
    Plan,
    PlanStatus,
    PlanStep,
    RiskLevel,
    StepStatus,
    TaskGoal,
    TaskProgress,
    VerificationResult,
)
from seyal_ai.planning.verifier import ResultVerifier

__all__ = [
    "CancellationManager",
    "CancellationToken",
    "CancellationType",
    "EmergencyStopError",
    "EmergencyStopException",
    "TaskCancelledError",
    "TaskCancelledException",
    "PlanExecutionEngine",
    "TaskManager",
    "TaskPlanner",
    "ProgressTracker",
    "ErrorCategory",
    "RetryDecision",
    "RetrySystem",
    "ToolSelector",
    "ExecutionResult",
    "Plan",
    "PlanStatus",
    "PlanStep",
    "RiskLevel",
    "StepStatus",
    "TaskGoal",
    "TaskProgress",
    "VerificationResult",
    "ResultVerifier",
]
