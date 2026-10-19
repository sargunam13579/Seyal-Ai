"""
Seyal AI — AI Evaluation & Automated Quality Judging Subsystem.

Contains Layer 2 (Capability Evals Benchmark) and Layer 3 (LLM-as-a-Judge Evaluation).
"""

from __future__ import annotations

from seyal_ai.evals.evaluator import (
    BenchmarkCategory,
    CapabilityBenchmarkReport,
    CapabilityEvaluator,
    EvalCase,
)
from seyal_ai.evals.judge import (
    EvaluationVerdict,
    JudgeCriteria,
    LLMJudge,
)
from seyal_ai.evals.telemetry_guard import (
    CircuitState,
    ProductionTelemetryGuard,
    TelemetryHealthStatus,
)

__all__ = [
    "BenchmarkCategory",
    "CapabilityBenchmarkReport",
    "CapabilityEvaluator",
    "CircuitState",
    "EvalCase",
    "EvaluationVerdict",
    "JudgeCriteria",
    "LLMJudge",
    "ProductionTelemetryGuard",
    "TelemetryHealthStatus",
]
