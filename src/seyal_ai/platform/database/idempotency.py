"""
Seyal AI Platform Database — Idempotency & Revision Conflict State Machine.

Implements Section 2A of Database Sync Engine Architecture:
1. Separation of immutable intent identity from revision conflict resolution attempts.
2. Operation ID is defined strictly as sha256(client_id + client_timestamp + intent_payload),
   excluding base_rev_id.
3. State machine transitions:
   NEW -> PENDING -> APPLIED (cached) or CONFLICT_DETECTED -> AWAITING_RETRY -> PENDING -> APPLIED.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from seyal_ai.platform.database.models import IdempotencyRecord
from seyal_ai.utils.logging import get_logger

log = get_logger("database.idempotency")


class IdempotencyError(Exception):
    """Base exception for idempotency state machine violations."""


class StaleRetryError(IdempotencyError):
    """Raised when a retry attempt uses an obsolete base_rev_id that does not match current state."""


class ConcurrentOperationError(IdempotencyError):
    """Raised when an operation is already pending and locked by another worker."""


class IdempotencyManager:
    """
    Manages client operation idempotency and revision conflict resolution.
    """

    @staticmethod
    def generate_operation_id(
        client_id: str,
        client_timestamp: float | str | int,
        original_intent_payload: dict[str, Any],
    ) -> str:
        """
        Generate deterministic sha256 operation_id.
        Excludes 'base_rev_id' and 'attempt_index' so retries preserve identical operation_id.
        """
        clean_intent = {
            k: v for k, v in original_intent_payload.items()
            if k not in ("base_rev_id", "attempt_index", "retry_count")
        }
        canonical_json = json.dumps(
            clean_intent,
            sort_keys=True,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        hasher = hashlib.sha256()
        hasher.update(f"{client_id}:{client_timestamp}:{canonical_json}".encode("utf-8"))
        return hasher.hexdigest()

    @staticmethod
    async def record_intent(
        session: AsyncSession,
        client_id: str,
        operation_id: str,
        base_rev_id: int | None = None,
        attempt_index: int = 1,
        original_intent_payload: dict[str, Any] | None = None,
    ) -> tuple[IdempotencyRecord, bool]:
        """
        Record client intent in idempotency state machine.
        Returns:
            (record, should_execute):
            - If should_execute is True: Caller proceeds to execute operation.
            - If should_execute is False: Operation is already APPLIED; caller returns record.result_payload.
        """
        stmt = select(IdempotencyRecord).where(IdempotencyRecord.operation_id == operation_id)
        result = await session.execute(stmt)
        record = result.scalar_one_or_none()

        # 1. New operation
        if record is None:
            new_record = IdempotencyRecord(
                operation_id=operation_id,
                client_id=client_id,
                attempt_index=attempt_index,
                base_rev_id=base_rev_id,
                status="PENDING",
            )
            session.add(new_record)
            await session.flush()
            return new_record, True

        # 2. Already applied (Return cached result)
        if record.status == "APPLIED":
            log.debug("Idempotency hit: operation %s already applied", operation_id)
            return record, False

        # 3. Revision conflict detected / awaiting retry
        if record.status in ("CONFLICT_DETECTED", "AWAITING_RETRY"):
            # A valid retry must advance the attempt_index or update the base_rev_id
            if attempt_index > record.attempt_index or (base_rev_id is not None and base_rev_id != record.base_rev_id):
                record.attempt_index = max(attempt_index, record.attempt_index + 1)
                record.base_rev_id = base_rev_id
                record.status = "PENDING"
                record.updated_at = datetime.now(UTC).replace(tzinfo=None)
                await session.flush()
                return record, True
            else:
                raise StaleRetryError(
                    f"Retry attempt {attempt_index} rejected for operation {operation_id}: "
                    f"base_rev_id {base_rev_id} was not advanced beyond failed revision {record.base_rev_id}."
                )

        # 4. Currently Pending
        if record.status == "PENDING":
            # Check timeout (e.g. stalled after 60s)
            now = datetime.now(UTC).replace(tzinfo=None)
            delta_seconds = (now - record.updated_at).total_seconds()
            if delta_seconds > 60:
                log.warning("Operation %s pending lock expired after %ss. Re-claiming.", operation_id, delta_seconds)
                record.attempt_index += 1
                record.base_rev_id = base_rev_id
                record.updated_at = now
                await session.flush()
                return record, True
            raise ConcurrentOperationError(f"Operation {operation_id} is currently in progress (attempt {record.attempt_index}).")

        # 5. Failed
        record.status = "PENDING"
        record.attempt_index = attempt_index
        record.base_rev_id = base_rev_id
        await session.flush()
        return record, True

    @staticmethod
    async def mark_applied(
        session: AsyncSession,
        operation_id: str,
        result_payload: dict[str, Any],
    ) -> IdempotencyRecord:
        """Transition operation state to APPLIED and cache the result payload."""
        stmt = select(IdempotencyRecord).where(IdempotencyRecord.operation_id == operation_id)
        result = await session.execute(stmt)
        record = result.scalar_one()
        record.status = "APPLIED"
        record.result_payload = result_payload
        record.updated_at = datetime.now(UTC).replace(tzinfo=None)
        await session.flush()
        return record

    @staticmethod
    async def mark_conflict(
        session: AsyncSession,
        operation_id: str,
        current_rev_id: int,
    ) -> IdempotencyRecord:
        """Transition operation state to CONFLICT_DETECTED with current revision target."""
        stmt = select(IdempotencyRecord).where(IdempotencyRecord.operation_id == operation_id)
        result = await session.execute(stmt)
        record = result.scalar_one()
        record.status = "CONFLICT_DETECTED"
        record.result_payload = {"error": "OptimisticLockConflict", "current_rev_id": current_rev_id}
        record.updated_at = datetime.now(UTC).replace(tzinfo=None)
        await session.flush()
        return record
