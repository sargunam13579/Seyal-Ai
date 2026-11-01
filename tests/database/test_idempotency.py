"""
Seyal AI Platform Database — Idempotency & Revision Conflict State Machine Tests.

Validates:
- SYNC-06: Idempotency state machine caches results; identical operation_id returns cached response.
- SYNC-07: Base revision conflict cleanly transitions operation to CONFLICT_DETECTED.
- SYNC-08: Retry attempt with same operation_id and updated base_rev_id applies successfully.
- SYNC-09: Stale retry attempt with old base_rev_id is rejected with StaleRetryError.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from seyal_ai.platform.database.engine import close_engine, get_session, init_engine
from seyal_ai.platform.database.idempotency import (
    ConcurrentOperationError,
    IdempotencyManager,
    StaleRetryError,
)


@pytest.fixture
async def db_session(tmp_path: Path):
    """Initializes a clean SQLite database for idempotency testing."""
    db_file = tmp_path / "test_idempotency.db"
    await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)
    async with get_session() as session:
        yield session
    await close_engine()


def test_operation_id_excludes_base_rev_and_attempt():
    """Verify operation_id is strictly invariant across retry attempts and base revision changes."""
    intent_1 = {"action": "send_message", "content": "Hello Seyal", "base_rev_id": 10, "attempt_index": 1}
    intent_2 = {"action": "send_message", "content": "Hello Seyal", "base_rev_id": 12, "attempt_index": 2}

    op_id_1 = IdempotencyManager.generate_operation_id("client_abc", 1700000000, intent_1)
    op_id_2 = IdempotencyManager.generate_operation_id("client_abc", 1700000000, intent_2)

    assert op_id_1 == op_id_2
    assert len(op_id_1) == 64


@pytest.mark.asyncio
async def test_sync06_idempotency_caches_applied_result(db_session: AsyncSession):
    """SYNC-06: Idempotency state machine caches results: identical operation_id returns cached response."""
    client_id = "client_mobile_1"
    op_id = IdempotencyManager.generate_operation_id(client_id, 10001, {"text": "Process order"})

    # First attempt: should execute
    record, should_execute = await IdempotencyManager.record_intent(
        db_session, client_id, op_id, base_rev_id=1, attempt_index=1
    )
    assert should_execute is True
    assert record.status == "PENDING"

    # Mark as applied
    cached_result = {"status": "SUCCESS", "order_id": "ORD-999"}
    await IdempotencyManager.mark_applied(db_session, op_id, cached_result)

    # Second attempt with same operation_id: should NOT execute and return cached result
    record2, should_execute2 = await IdempotencyManager.record_intent(
        db_session, client_id, op_id, base_rev_id=1, attempt_index=1
    )
    assert should_execute2 is False
    assert record2.status == "APPLIED"
    assert record2.result_payload == cached_result


@pytest.mark.asyncio
async def test_sync07_sync08_conflict_detected_and_valid_retry(db_session: AsyncSession):
    """SYNC-07 & SYNC-08: Conflict transitions to CONFLICT_DETECTED, retry with advanced base_rev succeeds."""
    client_id = "client_web_1"
    op_id = IdempotencyManager.generate_operation_id(client_id, 20002, {"task": "update_profile"})

    # Attempt 1
    record, should_execute = await IdempotencyManager.record_intent(
        db_session, client_id, op_id, base_rev_id=5, attempt_index=1
    )
    assert should_execute is True

    # Simulate conflict detection (server detected current_rev is 7, not 5)
    await IdempotencyManager.mark_conflict(db_session, op_id, current_rev_id=7)

    # Attempt 2 (Client advances to base_rev_id=7 and attempt_index=2)
    record_retry, should_execute_retry = await IdempotencyManager.record_intent(
        db_session, client_id, op_id, base_rev_id=7, attempt_index=2
    )
    assert should_execute_retry is True
    assert record_retry.status == "PENDING"
    assert record_retry.base_rev_id == 7
    assert record_retry.attempt_index == 2

    # Now apply the retry successfully
    await IdempotencyManager.mark_applied(db_session, op_id, {"status": "UPDATED"})

    # Re-submission returns cached result
    record_final, should_execute_final = await IdempotencyManager.record_intent(
        db_session, client_id, op_id, base_rev_id=7, attempt_index=2
    )
    assert should_execute_final is False
    assert record_final.status == "APPLIED"


@pytest.mark.asyncio
async def test_sync09_stale_retry_rejected(db_session: AsyncSession):
    """SYNC-09: Stale retry attempt with old base_rev_id is rejected."""
    client_id = "client_desktop_1"
    op_id = IdempotencyManager.generate_operation_id(client_id, 30003, {"doc": "budget.xlsx"})

    # Attempt 1
    await IdempotencyManager.record_intent(db_session, client_id, op_id, base_rev_id=10, attempt_index=1)
    await IdempotencyManager.mark_conflict(db_session, op_id, current_rev_id=12)

    # Stale retry (still using base_rev_id=10 and attempt_index=1)
    with pytest.raises(StaleRetryError):
        await IdempotencyManager.record_intent(
            db_session, client_id, op_id, base_rev_id=10, attempt_index=1
        )


@pytest.mark.asyncio
async def test_concurrent_pending_operation_rejected(db_session: AsyncSession):
    """Concurrent client re-request on active PENDING operation raises ConcurrentOperationError."""
    client_id = "client_agent_1"
    op_id = IdempotencyManager.generate_operation_id(client_id, 40004, {"job": "long_calculation"})

    # First worker locks it
    await IdempotencyManager.record_intent(db_session, client_id, op_id, base_rev_id=1, attempt_index=1)

    # Second worker immediately tries before first worker completes
    with pytest.raises(ConcurrentOperationError):
        await IdempotencyManager.record_intent(db_session, client_id, op_id, base_rev_id=1, attempt_index=1)
