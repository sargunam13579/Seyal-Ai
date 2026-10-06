"""
Seyal AI Automation Package.

Provides active application tracking, native UI interaction, error recovery,
and multi-step workflow execution.
"""

from seyal_ai.automation.app_controller import ActiveAppInfo, DesktopAppController
from seyal_ai.automation.error_recovery import ErrorRecoveryManager, with_retry
from seyal_ai.automation.ui_interaction import DesktopUIInteraction
from seyal_ai.automation.workflow import (
    MultiStepWorkflowEngine,
    WorkflowResult,
    WorkflowStep,
)

__all__ = [
    "DesktopAppController",
    "ActiveAppInfo",
    "DesktopUIInteraction",
    "ErrorRecoveryManager",
    "with_retry",
    "MultiStepWorkflowEngine",
    "WorkflowStep",
    "WorkflowResult",
]
