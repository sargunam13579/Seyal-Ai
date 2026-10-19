"""
Seyal AI — Layer 2: Capability & Benchmark Evaluation Test Suite.

Validates:
  - Benchmark category coverage (shortcuts, language, steering, security, voice)
  - Accuracy calculation and threshold verification (>= 95% benchmark pass rate)
  - Execution speed and latency monitoring per eval case
  - Category breakdown reporting
"""

from __future__ import annotations

import pytest

from seyal_ai.evals.evaluator import (
    BenchmarkCategory,
    CapabilityBenchmarkReport,
    CapabilityEvaluator,
    EvalCase,
)


class TestCapabilityEvals:
    """Tests the automated Layer 2 Capability Evaluator."""

    @pytest.mark.asyncio
    async def test_evals_benchmark_dataset_execution(self):
        """Runs the standard capability benchmark and verifies accuracy meets quality threshold."""
        evaluator = CapabilityEvaluator()
        report = await evaluator.evaluate_all()

        assert isinstance(report, CapabilityBenchmarkReport)
        assert report.total_cases >= 20
        assert report.passed_cases >= 20
        assert report.failed_cases == 0
        assert report.accuracy_percent == 100.0
        assert report.is_passed(min_threshold_percent=95.0) is True

    @pytest.mark.asyncio
    async def test_evals_category_breakdowns(self):
        """Verifies individual capability category scores."""
        evaluator = CapabilityEvaluator()
        report = await evaluator.evaluate_all()

        # Check all core categories achieved 100%
        assert report.category_accuracies[BenchmarkCategory.SHORTCUTS.value] == 100.0
        assert report.category_accuracies[BenchmarkCategory.LANGUAGE.value] == 100.0
        assert report.category_accuracies[BenchmarkCategory.STEERING.value] == 100.0
        assert report.category_accuracies[BenchmarkCategory.SECURITY.value] == 100.0
        assert report.category_accuracies[BenchmarkCategory.VOICE_SANITIZATION.value] == 100.0

    @pytest.mark.asyncio
    async def test_evals_handles_intentional_failure_gracefully(self):
        """Ensures failing benchmark cases are correctly logged and lower the accuracy score."""
        evaluator = CapabilityEvaluator()
        failing_dataset = [
            EvalCase("sc_fail", BenchmarkCategory.SHORTCUTS, "unrelated random query", "ctrl+a"),
            EvalCase("sc_pass", BenchmarkCategory.SHORTCUTS, "select all", "ctrl+a"),
        ]

        report = await evaluator.evaluate_all(dataset=failing_dataset)
        assert report.total_cases == 2
        assert report.passed_cases == 1
        assert report.failed_cases == 1
        assert report.accuracy_percent == 50.0
        assert report.is_passed(min_threshold_percent=95.0) is False
