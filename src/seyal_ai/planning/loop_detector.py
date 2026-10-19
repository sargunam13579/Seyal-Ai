"""
Seyal AI — Agent Self-Correction & Infinite Loop Prevention Subsystem.

Detects and breaks repetitive action cycles, runaway tool invocations, and oscillation traps:
  1. Consecutive Identical Action Loops (e.g., clicking the same coordinate 3+ times without progress)
  2. Multi-Step Oscillation Cycles (A -> B -> A -> B)
  3. Max Execution Horizon Bounding
  4. Autonomous Self-Reflection & Fallback Triggering
"""

from __future__ import annotations

import hashlib
import json
from collections import deque
from dataclasses import dataclass
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("planning.loop_detector")


class LoopDetectedError(Exception):
    """Raised when an agent action loop is detected and execution is halted."""


LoopDetectedException = LoopDetectedError


@dataclass
class ActionFingerprint:
    tool_name: str
    arguments_hash: str
    raw_args: dict[str, Any]
    timestamp: float


@dataclass
class LoopAnalysisResult:
    is_loop_detected: bool
    loop_type: str | None = None  # "identical_repeat", "oscillation", "horizon_exceeded"
    repeat_count: int = 0
    message: str = "Execution progressing normally."
    suggested_action: str = "proceed"  # "proceed", "reflect", "halt"


class AgentLoopDetector:
    """
    Real-time loop and cycle detection guard for autonomous agents.
    Inspects agent action trajectories to prevent infinite runaway execution.
    """

    def __init__(
        self,
        max_consecutive_repeats: int = 3,
        oscillation_window: int = 8,
        max_step_horizon: int = 30,
    ) -> None:
        self.max_consecutive_repeats = max_consecutive_repeats
        self.oscillation_window = oscillation_window
        self.max_step_horizon = max_step_horizon
        self._history: deque[ActionFingerprint] = deque(maxlen=oscillation_window)
        self._total_steps = 0

    def reset(self) -> None:
        """Resets the detector state for a new task."""
        self._history.clear()
        self._total_steps = 0

    @staticmethod
    def _compute_hash(tool_name: str, args: dict[str, Any]) -> str:
        try:
            serialized = json.dumps(args, sort_keys=True, default=str)
        except Exception:
            serialized = str(args)
        raw = f"{tool_name}:{serialized}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

    def record_and_audit(
        self,
        tool_name: str,
        args: dict[str, Any] | None = None,
        timestamp: float = 0.0,
    ) -> LoopAnalysisResult:
        """
        Records an action and audits the trajectory against cycle patterns.
        """
        self._total_steps += 1
        args_dict = args or {}
        arg_hash = self._compute_hash(tool_name, args_dict)

        fp = ActionFingerprint(
            tool_name=tool_name,
            arguments_hash=arg_hash,
            raw_args=args_dict,
            timestamp=timestamp,
        )

        # 1. Check Max Horizon Bounding
        if self._total_steps > self.max_step_horizon:
            log.warning("Agent exceeded maximum step horizon limit: %d", self.max_step_horizon)
            return LoopAnalysisResult(
                is_loop_detected=True,
                loop_type="horizon_exceeded",
                repeat_count=self._total_steps,
                message=f"Agent exceeded maximum execution step limit ({self.max_step_horizon}).",
                suggested_action="halt",
            )

        # 2. Check Consecutive Identical Repeats (A -> A -> A)
        if len(self._history) >= (self.max_consecutive_repeats - 1):
            recent = list(self._history)[-(self.max_consecutive_repeats - 1) :]
            if all(f.arguments_hash == arg_hash for f in recent):
                self._history.append(fp)
                log.warning(
                    "Detected consecutive identical action loop: %s repeated %d times",
                    tool_name,
                    self.max_consecutive_repeats,
                )
                return LoopAnalysisResult(
                    is_loop_detected=True,
                    loop_type="identical_repeat",
                    repeat_count=self.max_consecutive_repeats,
                    message=f"Action '{tool_name}' was repeated {self.max_consecutive_repeats} times without progress.",
                    suggested_action="reflect",
                )

        # 3. Check Oscillation Cycles (A -> B -> A -> B)
        self._history.append(fp)
        hashes = [f.arguments_hash for f in self._history]
        if (
            len(hashes) >= 4
            and hashes[-1] == hashes[-3]
            and hashes[-2] == hashes[-4]
            and hashes[-1] != hashes[-2]
        ):
            log.warning("Detected 2-step oscillation loop between actions.")
            return LoopAnalysisResult(
                is_loop_detected=True,
                loop_type="oscillation",
                repeat_count=2,
                message="Agent is oscillating between two conflicting actions (A -> B -> A -> B).",
                suggested_action="reflect",
            )

        return LoopAnalysisResult(
            is_loop_detected=False,
            loop_type=None,
            repeat_count=0,
            message="Execution progressing normally.",
            suggested_action="proceed",
        )
