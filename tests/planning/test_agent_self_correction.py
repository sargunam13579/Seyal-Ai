"""
Seyal AI — Agent Self-Correction & Infinite Loop Prevention Test Suite.

Verifies:
  - Normal linear action trajectory progression
  - Consecutive identical action repeat detection
  - Multi-step oscillation cycle detection (A -> B -> A -> B)
  - Maximum step horizon bound enforcement
  - Self-reflection & halt recommendations
"""

from __future__ import annotations

import pytest

from seyal_ai.planning.loop_detector import (
    AgentLoopDetector,
)


class TestAgentLoopDetector:
    """Verifies autonomous loop prevention and trajectory auditing."""

    @pytest.fixture
    def detector(self) -> AgentLoopDetector:
        return AgentLoopDetector(
            max_consecutive_repeats=3,
            oscillation_window=8,
            max_step_horizon=10,
        )

    def test_normal_progression_allowed(self, detector: AgentLoopDetector):
        actions = [
            ("click", {"x": 100, "y": 200}),
            ("type", {"text": "Hello"}),
            ("press_key", {"key": "enter"}),
            ("scroll", {"direction": "down"}),
        ]

        for tool, args in actions:
            result = detector.record_and_audit(tool, args)
            assert result.is_loop_detected is False
            assert result.suggested_action == "proceed"

    def test_consecutive_identical_action_loop_detected(self, detector: AgentLoopDetector):
        # 1st click: OK
        res1 = detector.record_and_audit("click", {"x": 500, "y": 300})
        assert res1.is_loop_detected is False

        # 2nd click: OK
        res2 = detector.record_and_audit("click", {"x": 500, "y": 300})
        assert res2.is_loop_detected is False

        # 3rd click: Loop triggered!
        res3 = detector.record_and_audit("click", {"x": 500, "y": 300})
        assert res3.is_loop_detected is True
        assert res3.loop_type == "identical_repeat"
        assert res3.repeat_count == 3
        assert res3.suggested_action == "reflect"
        assert "repeated 3 times" in res3.message

    def test_oscillation_loop_detected(self, detector: AgentLoopDetector):
        # A -> B -> A -> B
        action_a = ("switch_window", {"window": "Chrome"})
        action_b = ("switch_window", {"window": "VSCode"})

        detector.record_and_audit(*action_a)
        detector.record_and_audit(*action_b)
        detector.record_and_audit(*action_a)

        # 4th action completes oscillation
        res4 = detector.record_and_audit(*action_b)
        assert res4.is_loop_detected is True
        assert res4.loop_type == "oscillation"
        assert res4.suggested_action == "reflect"
        assert "oscillating" in res4.message

    def test_max_step_horizon_exceeded(self, detector: AgentLoopDetector):
        # Horizon limit is 10
        for i in range(10):
            res = detector.record_and_audit("action", {"step": i})
            assert res.is_loop_detected is False

        # 11th step exceeds limit
        res11 = detector.record_and_audit("action", {"step": 11})
        assert res11.is_loop_detected is True
        assert res11.loop_type == "horizon_exceeded"
        assert res11.suggested_action == "halt"
        assert "maximum execution step limit" in res11.message

    def test_detector_reset(self, detector: AgentLoopDetector):
        detector.record_and_audit("click", {"x": 100, "y": 100})
        detector.record_and_audit("click", {"x": 100, "y": 100})

        detector.reset()

        # After reset, counter starts fresh
        res = detector.record_and_audit("click", {"x": 100, "y": 100})
        assert res.is_loop_detected is False
        assert res.repeat_count == 0
