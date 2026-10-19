"""
Seyal AI — Layer 2: Automated AI Capability & Benchmark Evaluator.

Provides systematic evaluation across core AI capabilities:
  1. Multilingual Shortcut-First Fast Path Accuracy
  2. Language Identification & Code-Switching Precision
  3. Conversational Steering & Intent Classification
  4. Terminal Security Command Guarding
  5. Long-term Memory Preference Extraction
  6. Screen Reader Voice Output Sanitization
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from seyal_ai.accessibility.voice_navigation import VoiceNavigationEngine
from seyal_ai.agents.computer_use.shortcuts import detect_fast_shortcut
from seyal_ai.llm.prompts.language_guardrail import resolve_language_signals
from seyal_ai.planning.steering_router import IntentClassification, SteeringIntentRouter
from seyal_ai.security.terminal_security import (
    CommandSafetyStatus,
    TerminalSecurityClassifier,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("evals.evaluator")


class BenchmarkCategory(StrEnum):
    SHORTCUTS = "shortcut_acceleration"
    LANGUAGE = "language_resolution"
    STEERING = "conversational_steering"
    SECURITY = "terminal_security"
    MEMORY = "memory_learning"
    VOICE_SANITIZATION = "voice_sanitization"


@dataclass
class EvalCase:
    """A single evaluation benchmark test case."""

    id: str
    category: BenchmarkCategory
    input_text: str
    expected_output: Any
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvalResult:
    """The result of running a single benchmark case."""

    case: EvalCase
    passed: bool
    actual_output: Any
    latency_ms: float
    error_message: str | None = None


@dataclass
class CapabilityBenchmarkReport:
    """Aggregated report of benchmark evaluation."""

    total_cases: int
    passed_cases: int
    failed_cases: int
    accuracy_percent: float
    duration_seconds: float
    category_accuracies: dict[str, float]
    results: list[EvalResult]

    def is_passed(self, min_threshold_percent: float = 95.0) -> bool:
        """Determines if the benchmark meets the enterprise quality threshold."""
        return self.accuracy_percent >= min_threshold_percent


class CapabilityEvaluator:
    """
    Automated Capability & Quality Benchmark Runner for Seyal AI.
    Runs standardized evals across all core capabilities and generates reports.
    """

    def __init__(self) -> None:
        self.terminal_classifier = TerminalSecurityClassifier()
        self.steering_router = SteeringIntentRouter()
        self._dataset: list[EvalCase] = self._build_default_benchmark_dataset()

    def _build_default_benchmark_dataset(self) -> list[EvalCase]:
        """Seeds the standard benchmark dataset."""
        cases: list[EvalCase] = [
            # --- 1. SHORTCUT ACCELERATION BENCHMARKS ---
            EvalCase("sc_01", BenchmarkCategory.SHORTCUTS, "select all", "ctrl+a"),
            EvalCase("sc_02", BenchmarkCategory.SHORTCUTS, "ellathaiyum select pannu", "ctrl+a"),
            EvalCase(
                "sc_03", BenchmarkCategory.SHORTCUTS, "chrome la new tab open pannu", "ctrl+t"
            ),
            EvalCase("sc_04", BenchmarkCategory.SHORTCUTS, "sound kammi pannu", "volume_down"),
            EvalCase("sc_05", BenchmarkCategory.SHORTCUTS, "volume up pannu", "volume_up"),
            EvalCase("sc_06", BenchmarkCategory.SHORTCUTS, "mute sound", "volume_mute"),
            EvalCase("sc_07", BenchmarkCategory.SHORTCUTS, "file explorer open pannu", "win+e"),
            EvalCase("sc_08", BenchmarkCategory.SHORTCUTS, "maximize window", "win+up"),
            EvalCase("sc_09", BenchmarkCategory.SHORTCUTS, "perusaaku", "win+up"),
            EvalCase("sc_10", BenchmarkCategory.SHORTCUTS, "screenshot edu", "win+shift+s"),
            # --- 2. LANGUAGE RESOLUTION BENCHMARKS ---
            EvalCase(
                "lang_01",
                BenchmarkCategory.LANGUAGE,
                "வணக்கம், எப்படி இருக்கீங்க?",
                ("ta", "tamil", False),
            ),
            EvalCase(
                "lang_02",
                BenchmarkCategory.LANGUAGE,
                "Chrome open pannu Seyal AI",
                ("ta", "latin", True),
            ),
            EvalCase("lang_03", BenchmarkCategory.LANGUAGE, "Puriyala", ("ta", "latin", True)),
            EvalCase(
                "lang_04", BenchmarkCategory.LANGUAGE, "Simple-ah sollu", ("ta", "latin", True)
            ),
            EvalCase(
                "lang_05",
                BenchmarkCategory.LANGUAGE,
                "Please check the battery status",
                ("en", "latin", False),
            ),
            EvalCase(
                "lang_06",
                BenchmarkCategory.LANGUAGE,
                "Explain completely in English",
                ("en", "latin", False),
            ),
            # --- 3. CONVERSATIONAL STEERING BENCHMARKS ---
            EvalCase(
                "steer_01",
                BenchmarkCategory.STEERING,
                "niruthu, cancel that",
                IntentClassification.CANCEL,
            ),
            EvalCase(
                "steer_02",
                BenchmarkCategory.STEERING,
                "stop immediately",
                IntentClassification.CANCEL,
            ),
            EvalCase(
                "steer_03",
                BenchmarkCategory.STEERING,
                "status enna?",
                IntentClassification.STATUS_QUERY,
            ),
            EvalCase(
                "steer_04",
                BenchmarkCategory.STEERING,
                "how much time remaining?",
                IntentClassification.STATUS_QUERY,
            ),
            EvalCase(
                "steer_05",
                BenchmarkCategory.STEERING,
                "idhu venaam, open chrome instead",
                IntentClassification.PIVOT,
            ),
            EvalCase(
                "steer_06",
                BenchmarkCategory.STEERING,
                "switch to downloads folder",
                IntentClassification.PIVOT,
            ),
            EvalCase(
                "steer_07",
                BenchmarkCategory.STEERING,
                "click the blue button",
                IntentClassification.STEER,
            ),
            # --- 4. TERMINAL SECURITY BENCHMARKS ---
            EvalCase(
                "sec_01",
                BenchmarkCategory.SECURITY,
                "format C: /fs:NTFS",
                CommandSafetyStatus.BLOCKED,
            ),
            EvalCase(
                "sec_02",
                BenchmarkCategory.SECURITY,
                "del /f /s /q C:\\",
                CommandSafetyStatus.BLOCKED,
            ),
            EvalCase(
                "sec_03",
                BenchmarkCategory.SECURITY,
                "powershell -EncodedCommand JABhAD0AMQA=",
                CommandSafetyStatus.CONFIRM_REQUIRED,
            ),
            EvalCase(
                "sec_04",
                BenchmarkCategory.SECURITY,
                "dir D:\\Projects",
                CommandSafetyStatus.ALLOWED,
            ),
            EvalCase(
                "sec_05",
                BenchmarkCategory.SECURITY,
                "echo Hello World",
                CommandSafetyStatus.ALLOWED,
            ),
            # --- 5. VOICE OUTPUT SANITIZATION BENCHMARKS ---
            EvalCase(
                "voice_01",
                BenchmarkCategory.VOICE_SANITIZATION,
                "\x1b[32mSUCCESS:\x1b[0m Visit [Seyal AI](https://seyal.ai) for `docs`.",
                "SUCCESS: Visit Seyal AI for docs.",
            ),
        ]
        return cases

    async def evaluate_single_case(self, case: EvalCase) -> EvalResult:
        """Executes a single eval case and returns the result with timing."""
        start = time.perf_counter()
        actual: Any = None
        passed = False
        error_msg: str | None = None

        try:
            if case.category == BenchmarkCategory.SHORTCUTS:
                action = detect_fast_shortcut(case.input_text)
                actual = action.key if action else None
                passed = actual == case.expected_output

            elif case.category == BenchmarkCategory.LANGUAGE:
                sig = resolve_language_signals(case.input_text)
                actual = (sig.language_code, sig.script, sig.is_tanglish)
                passed = actual == case.expected_output

            elif case.category == BenchmarkCategory.STEERING:
                res = await self.steering_router.classify(case.input_text)
                actual = res.category
                passed = actual == case.expected_output

            elif case.category == BenchmarkCategory.SECURITY:
                sec_res = self.terminal_classifier.classify_command(case.input_text)
                actual = sec_res.status
                passed = actual == case.expected_output

            elif case.category == BenchmarkCategory.VOICE_SANITIZATION:
                actual = VoiceNavigationEngine.format_for_screen_reader(case.input_text)
                # Verify stripped elements
                passed = (
                    "\x1b" not in actual
                    and "https://" not in actual
                    and "`" not in actual
                    and "[" not in actual
                    and "Seyal AI" in actual
                )

        except Exception as e:
            error_msg = str(e)
            passed = False

        duration_ms = (time.perf_counter() - start) * 1000.0
        return EvalResult(
            case=case,
            passed=passed,
            actual_output=actual,
            latency_ms=duration_ms,
            error_message=error_msg,
        )

    async def evaluate_all(
        self, dataset: list[EvalCase] | None = None
    ) -> CapabilityBenchmarkReport:
        """Runs the entire benchmark dataset asynchronously and compiles the report."""
        cases = dataset or self._dataset
        start_time = time.perf_counter()
        results: list[EvalResult] = []

        for case in cases:
            res = await self.evaluate_single_case(case)
            results.append(res)

        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = total - passed
        acc = (passed / total * 100.0) if total > 0 else 0.0
        elapsed = time.perf_counter() - start_time

        # Calculate category accuracies
        cat_counts: dict[str, int] = {}
        cat_passed: dict[str, int] = {}
        for r in results:
            cat_name = r.case.category.value
            cat_counts[cat_name] = cat_counts.get(cat_name, 0) + 1
            if r.passed:
                cat_passed[cat_name] = cat_passed.get(cat_name, 0) + 1

        cat_accuracies: dict[str, float] = {}
        for cat_name, cnt in cat_counts.items():
            pass_cnt = cat_passed.get(cat_name, 0)
            cat_accuracies[cat_name] = (pass_cnt / cnt * 100.0) if cnt > 0 else 0.0

        return CapabilityBenchmarkReport(
            total_cases=total,
            passed_cases=passed,
            failed_cases=failed,
            accuracy_percent=acc,
            duration_seconds=elapsed,
            category_accuracies=cat_accuracies,
            results=results,
        )
