"""
Seyal AI — Layer 5: Production Telemetry & Real-Time Drift Guardrail Subsystem.

Provides enterprise-grade live production monitoring, SLA tracking, error budget calculations,
and automated circuit breaking:
  1. Percentile Latency SLA Monitoring (p50, p95, p99)
  2. Error Budget & Burn Rate Tracking
  3. Automated Self-Healing Circuit Breaker (CLOSED -> OPEN -> HALF-OPEN)
  4. Model Output Drift & Quality Degradation Alerting
"""

from __future__ import annotations

import math
import time
from collections import deque
from dataclasses import dataclass, field
from enum import StrEnum

from seyal_ai.utils.logging import get_logger

log = get_logger("evals.telemetry_guard")


class CircuitState(StrEnum):
    CLOSED = "closed"  # Normal healthy operation
    OPEN = "open"  # Tripped due to failures or SLA breach
    HALF_OPEN = "half_open"  # Probing recovery


@dataclass
class TelemetryEvent:
    timestamp: float
    latency_ms: float
    is_error: bool
    model_name: str = "gemini-2.5"
    hallucination_score: float = 0.0  # 0.0 = grounded, 1.0 = full hallucination
    error_message: str | None = None


@dataclass
class TelemetryHealthStatus:
    is_healthy: bool
    circuit_state: CircuitState
    sample_count: int
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    error_rate_percent: float
    burn_rate: float
    alerts: list[str] = field(default_factory=list)


class ProductionTelemetryGuard:
    """
    Automated Layer 5 Production Telemetry & Quality Guardrail.
    Monitors live runtime metrics, enforces SLAs, and trips circuit breakers when degradation occurs.
    """

    def __init__(
        self,
        window_size: int = 100,
        target_p95_ms: float = 1500.0,
        max_error_rate_percent: float = 5.0,
        trip_threshold_failures: int = 4,
        cooldown_seconds: float = 10.0,
    ) -> None:
        self.window_size = window_size
        self.target_p95_ms = target_p95_ms
        self.max_error_rate_percent = max_error_rate_percent
        self.trip_threshold_failures = trip_threshold_failures
        self.cooldown_seconds = cooldown_seconds

        self._events: deque[TelemetryEvent] = deque(maxlen=window_size)
        self._circuit_state = CircuitState.CLOSED
        self._state_changed_at = time.time()
        self._consecutive_failures = 0
        self._half_open_success_count = 0

    @property
    def circuit_state(self) -> CircuitState:
        # Check if cooldown expired to transition from OPEN to HALF_OPEN
        if self._circuit_state == CircuitState.OPEN and (
            time.time() - self._state_changed_at >= self.cooldown_seconds
        ):
            log.info("Circuit breaker cooldown expired; switching to HALF_OPEN probe state.")
            self._circuit_state = CircuitState.HALF_OPEN
            self._state_changed_at = time.time()
            self._half_open_success_count = 0
        return self._circuit_state

    def record_event(
        self,
        latency_ms: float,
        is_error: bool = False,
        model_name: str = "gemini-2.5",
        hallucination_score: float = 0.0,
        error_message: str | None = None,
    ) -> None:
        """Records a runtime completion or failure event."""
        event = TelemetryEvent(
            timestamp=time.time(),
            latency_ms=latency_ms,
            is_error=is_error,
            model_name=model_name,
            hallucination_score=hallucination_score,
            error_message=error_message,
        )
        self._events.append(event)

        current_state = self.circuit_state

        if is_error:
            self._consecutive_failures += 1
            if current_state == CircuitState.HALF_OPEN:
                log.warning("Probe failure in HALF_OPEN state; tripping back to OPEN.")
                self._trip_circuit("Probe failed in HALF_OPEN state.")
            elif self._consecutive_failures >= self.trip_threshold_failures:
                self._trip_circuit(f"{self._consecutive_failures} consecutive execution failures.")
        else:
            self._consecutive_failures = 0
            if current_state == CircuitState.HALF_OPEN:
                self._half_open_success_count += 1
                if self._half_open_success_count >= 2:
                    log.info("Probe succeeded; recovering circuit state to CLOSED.")
                    self._circuit_state = CircuitState.CLOSED
                    self._state_changed_at = time.time()
                    self._half_open_success_count = 0

    def _trip_circuit(self, reason: str) -> None:
        log.warning("Tripping circuit breaker: %s", reason)
        self._circuit_state = CircuitState.OPEN
        self._state_changed_at = time.time()

    def get_health_status(self) -> TelemetryHealthStatus:
        """Calculates current telemetry percentiles, error budget burn rate, and health status."""
        alerts: list[str] = []
        if not self._events:
            return TelemetryHealthStatus(
                is_healthy=True,
                circuit_state=self.circuit_state,
                sample_count=0,
                p50_latency_ms=0.0,
                p95_latency_ms=0.0,
                p99_latency_ms=0.0,
                error_rate_percent=0.0,
                burn_rate=0.0,
                alerts=[],
            )

        latencies = sorted([e.latency_ms for e in self._events])
        count = len(latencies)

        def percentile(data: list[float], p: float) -> float:
            if not data:
                return 0.0
            k = (len(data) - 1) * p
            f = math.floor(k)
            c = math.ceil(k)
            if f == c:
                return data[f]
            d0 = data[f] * (c - k)
            d1 = data[c] * (k - f)
            return d0 + d1

        p50 = percentile(latencies, 0.50)
        p95 = percentile(latencies, 0.95)
        p99 = percentile(latencies, 0.99)

        error_count = sum(1 for e in self._events if e.is_error)
        error_rate = (error_count / count) * 100.0

        # Burn rate: current error rate divided by allowed error rate
        burn_rate = (
            error_rate / self.max_error_rate_percent
            if self.max_error_rate_percent > 0
            else error_rate
        )

        # Check SLAs
        if p95 > self.target_p95_ms:
            alerts.append(
                f"Latency SLA breach: p95 is {p95:.1f}ms (target < {self.target_p95_ms:.1f}ms)"
            )

        if error_rate > self.max_error_rate_percent:
            alerts.append(
                f"Error budget exhausted: error rate is {error_rate:.1f}% (max {self.max_error_rate_percent:.1f}%)"
            )

        # Hallucination score drift
        avg_hallucination = sum(e.hallucination_score for e in self._events) / count
        if avg_hallucination > 0.15:
            alerts.append(
                f"Hallucination drift alert: average hallucination index is {avg_hallucination:.2f}"
            )

        is_healthy = self.circuit_state == CircuitState.CLOSED and len(alerts) == 0

        return TelemetryHealthStatus(
            is_healthy=is_healthy,
            circuit_state=self.circuit_state,
            sample_count=count,
            p50_latency_ms=round(p50, 1),
            p95_latency_ms=round(p95, 1),
            p99_latency_ms=round(p99, 1),
            error_rate_percent=round(error_rate, 2),
            burn_rate=round(burn_rate, 2),
            alerts=alerts,
        )

    def allow_request(self) -> bool:
        """Determines if new requests should be allowed through to primary models."""
        return self.circuit_state in (CircuitState.CLOSED, CircuitState.HALF_OPEN)
