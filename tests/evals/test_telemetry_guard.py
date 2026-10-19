"""
Seyal AI — Layer 5: Production Telemetry & Real-Time Drift Guardrail Test Suite.

Verifies:
  - Latency SLA Percentile calculations (p50, p95, p99)
  - Error budget burn rate tracking & alerting
  - Automated circuit breaker state machine (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
  - Model hallucination drift alerting
  - Request throttling / allowance gating
"""

from __future__ import annotations

import time

from seyal_ai.evals.telemetry_guard import (
    CircuitState,
    ProductionTelemetryGuard,
)


class TestProductionTelemetryGuard:
    """Verifies Layer 5 telemetry, SLAs, and circuit breaker protection."""

    def test_healthy_telemetry_baseline(self):
        guard = ProductionTelemetryGuard(window_size=50, target_p95_ms=1000.0)

        # Record 40 fast healthy events (100ms - 300ms)
        for i in range(40):
            guard.record_event(latency_ms=100.0 + (i * 5.0), is_error=False)

        status = guard.get_health_status()
        assert status.is_healthy is True
        assert status.circuit_state == CircuitState.CLOSED
        assert status.sample_count == 40
        assert 150.0 <= status.p50_latency_ms <= 250.0
        assert status.p95_latency_ms < 1000.0
        assert status.error_rate_percent == 0.0
        assert guard.allow_request() is True
        assert len(status.alerts) == 0

    def test_latency_sla_breach_alert(self):
        guard = ProductionTelemetryGuard(window_size=20, target_p95_ms=500.0)

        for _ in range(15):
            guard.record_event(latency_ms=200.0)
        # Spike last 5 events above target
        for _ in range(5):
            guard.record_event(latency_ms=1200.0)

        status = guard.get_health_status()
        assert status.is_healthy is False
        assert any("Latency SLA breach" in a for a in status.alerts)
        assert status.p95_latency_ms > 500.0

    def test_error_budget_burn_rate_alert(self):
        guard = ProductionTelemetryGuard(window_size=20, max_error_rate_percent=10.0)

        # 14 successes, 6 errors (30% error rate vs 10% allowed)
        for _ in range(14):
            guard.record_event(latency_ms=150.0, is_error=False)
        for _ in range(6):
            guard.record_event(latency_ms=150.0, is_error=True)

        status = guard.get_health_status()
        assert status.is_healthy is False
        assert status.error_rate_percent >= 25.0
        assert status.burn_rate > 1.0
        assert any("Error budget exhausted" in a for a in status.alerts)

    def test_circuit_breaker_tripping_and_recovery(self):
        guard = ProductionTelemetryGuard(
            window_size=20,
            trip_threshold_failures=3,
            cooldown_seconds=0.1,  # Short cooldown for test speed
        )

        assert guard.circuit_state == CircuitState.CLOSED
        assert guard.allow_request() is True

        # Trigger 3 consecutive errors
        guard.record_event(latency_ms=100.0, is_error=True)
        guard.record_event(latency_ms=100.0, is_error=True)
        assert guard.circuit_state == CircuitState.CLOSED

        guard.record_event(latency_ms=100.0, is_error=True)
        # Breaker should now be OPEN
        assert guard.circuit_state == CircuitState.OPEN
        assert guard.allow_request() is False

        # Wait for cooldown to expire
        time.sleep(0.15)
        # Reading circuit_state transitions it to HALF_OPEN
        assert guard.circuit_state == CircuitState.HALF_OPEN
        assert guard.allow_request() is True

        # Send 2 successful probes in HALF_OPEN state
        guard.record_event(latency_ms=120.0, is_error=False)
        assert guard.circuit_state == CircuitState.HALF_OPEN

        guard.record_event(latency_ms=120.0, is_error=False)
        # Breaker recovers to CLOSED
        assert guard.circuit_state == CircuitState.CLOSED
        assert guard.allow_request() is True

    def test_hallucination_drift_alert(self):
        guard = ProductionTelemetryGuard(window_size=10)

        # Record events with high hallucination scores
        for _ in range(10):
            guard.record_event(latency_ms=200.0, hallucination_score=0.4)

        status = guard.get_health_status()
        assert status.is_healthy is False
        assert any("Hallucination drift alert" in a for a in status.alerts)
