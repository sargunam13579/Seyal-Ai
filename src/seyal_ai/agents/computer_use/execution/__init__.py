"""
Seyal AI Computer-Use Execution Engine and Visual Reasoning Package.
"""

from __future__ import annotations

from .classifier import IntentClassifierMixin
from .pipeline import PipelineExecutionMixin
from .single_goal import SingleGoalExecutionMixin
from .vision_decider import VisionDeciderMixin


class ExecutionEngineMixin(
    IntentClassifierMixin,
    VisionDeciderMixin,
    SingleGoalExecutionMixin,
    PipelineExecutionMixin,
):
    """
    Unified Execution Engine Mixin for Seyal AI Computer-Use Agent.
    Combines intent classification, vision action reasoning, single goal flow, and compound pipeline.
    """
    pass


__all__ = [
    "ExecutionEngineMixin",
    "IntentClassifierMixin",
    "VisionDeciderMixin",
    "SingleGoalExecutionMixin",
    "PipelineExecutionMixin",
]
