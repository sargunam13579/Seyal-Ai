"""
Seyal AI Platform Database — Distributed Worker Fencing & Advisory Lock Coordinator.

Implements Section 2B of Database Sync Engine Architecture:
1. PostgreSQL transaction-level advisory locks (pg_try_advisory_xact_lock).
2. Monotonically increasing fencing tokens (FencingTokenRecord).
3. Split-brain defense: reject writes from stale or partitioned workers.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from seyal_ai.platform.database.models import FencingTokenRecord
from seyal_ai.utils.logging import get_logger

log = get_logger("database.fencing")

# In-memory lock for SQLite and single-process concurrent worker competition testing
_LOCAL_ADVISORY_LOCKS: dict[str, asyncio.Lock] = {}


class StaleWorkerFencingError(Exception):
    """Raised when a partitioned or stale worker attempts a write with an obsolete fencing token."""


class WorkerFencingManager:
    """
    Coordinates distributed advisory locks and monotonic fencing tokens.
    """

    @staticmethod
    async def acquire_advisory_lock(
        session: AsyncSession,
        lock_name: str = "seyal_sync_worker_lock",
    ) -> bool:
        """
        Attempt to acquire an advisory lock for the duration of the current transaction.
        - On PostgreSQL: invokes `SELECT pg_try_advisory_xact_lock(hashtext(:lock_name))`.
        - On SQLite / Mock: uses cooperative in-memory asyncio lock.
        """
        bind = session.bind
        dialect_name = bind.dialect.name if bind else "sqlite"

        if dialect_name == "postgresql":
            try:
                stmt = text("SELECT pg_try_advisory_xact_lock(hashtext(:lock_name))")
                result = await session.execute(stmt, {"lock_name": lock_name})
                acquired = bool(result.scalar())
                log.debug("PostgreSQL advisory lock %s acquired=%s", lock_name, acquired)
                return acquired
            except Exception as e:
                log.warning("PostgreSQL advisory lock error: %s", e)
                return False
        else:
            # Cooperative local lock for SQLite / in-memory development
            if lock_name not in _LOCAL_ADVISORY_LOCKS:
                _LOCAL_ADVISORY_LOCKS[lock_name] = asyncio.Lock()
            lock = _LOCAL_ADVISORY_LOCKS[lock_name]
            if lock.locked():
                return False
            # Acquire without blocking
            try:
                await asyncio.wait_for(lock.acquire(), timeout=0.01)
                return True
            except TimeoutError:
                return False

    @staticmethod
    def release_local_advisory_lock(lock_name: str = "seyal_sync_worker_lock") -> None:
        """Release cooperative local lock if held."""
        if lock_name in _LOCAL_ADVISORY_LOCKS:
            lock = _LOCAL_ADVISORY_LOCKS[lock_name]
            if lock.locked():
                lock.release()

    @staticmethod
    async def acquire_fencing_token(
        session: AsyncSession,
        scope: str = "cloud_sync",
        worker_id: str = "worker_1",
    ) -> int:
        """
        Acquire or increment a monotonic fencing token for a distributed scope.
        Guarantees that a newer leader always supersedes any previous leader.
        """
        stmt = select(FencingTokenRecord).where(FencingTokenRecord.scope == scope).with_for_update()
        try:
            result = await session.execute(stmt)
            record = result.scalar_one_or_none()
        except Exception:
            # Fallback for SQLite without FOR UPDATE
            stmt = select(FencingTokenRecord).where(FencingTokenRecord.scope == scope)
            result = await session.execute(stmt)
            record = result.scalar_one_or_none()

        if record is None:
            record = FencingTokenRecord(
                scope=scope,
                current_token=1,
                holder_id=worker_id,
            )
            session.add(record)
            await session.flush()
            log.info("Initialized fencing token for scope %s: token=1, holder=%s", scope, worker_id)
            return 1

        record.current_token += 1
        record.holder_id = worker_id
        record.updated_at = datetime.now(UTC).replace(tzinfo=None)
        await session.flush()
        log.info("Advanced fencing token for scope %s: token=%d, holder=%s", scope, record.current_token, worker_id)
        return record.current_token

    @staticmethod
    async def validate_fencing_token(
        session: AsyncSession,
        scope: str,
        worker_token: int,
    ) -> bool:
        """
        Verify whether the worker's fencing token is still active and valid.
        Returns True if worker_token >= current_token.
        Raises StaleWorkerFencingError if worker_token has been superseded.
        """
        stmt = select(FencingTokenRecord).where(FencingTokenRecord.scope == scope)
        result = await session.execute(stmt)
        record = result.scalar_one_or_none()

        if record is None:
            return True

        if worker_token < record.current_token:
            log.error(
                "Stale worker rejected! Worker token %d is lower than current token %d in scope %s",
                worker_token,
                record.current_token,
                scope,
            )
            raise StaleWorkerFencingError(
                f"Worker fenced out: token {worker_token} has been superseded by token {record.current_token} (holder: {record.holder_id})"
            )

        return True
