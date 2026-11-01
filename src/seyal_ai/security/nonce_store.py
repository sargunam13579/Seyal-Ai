"""
Atomic SQL Nonce Store Subsystem (Replay Attack Defense).

Provides atomic, single-use nonce validation and consumption within explicit
database transactions to prevent token reuse across malicious or duplicated tasks.
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

from seyal_ai.utils.logging import get_logger

log = get_logger("security.nonce_store")


class NonceStoreError(Exception):
    """Base exception for nonce store failures."""


class NonceNotFoundError(NonceStoreError):
    """Raised when the specified nonce does not exist in the store."""


class NonceAlreadyConsumedError(NonceStoreError):
    """Raised when an attempt is made to replay an already-consumed nonce."""


class NonceExpiredError(NonceStoreError):
    """Raised when the nonce has expired."""


class SqliteNonceStore:
    """
    Manages single-use approval nonces using SQLite with atomic transactions.
    """

    def __init__(self, db_path: Path | str | None = None) -> None:
        if db_path is None:
            default_dir = Path.home() / ".seyal_ai"
            default_dir.mkdir(parents=True, exist_ok=True)
            self._db_path = default_dir / "nonces.db"
        else:
            self._db_path = Path(db_path)
            self._db_path.parent.mkdir(parents=True, exist_ok=True)

        self._init_db()

    @property
    def db_path(self) -> Path:
        return self._db_path

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self._db_path), timeout=10.0, isolation_level=None)
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS approval_nonces (
                    nonce TEXT PRIMARY KEY,
                    task_id TEXT,
                    issued_at REAL NOT NULL,
                    expires_at REAL NOT NULL,
                    consumed_at REAL
                );
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_nonces_status
                ON approval_nonces (consumed_at, expires_at);
                """
            )

    def register_nonce(self, nonce: str, expires_at: float, issued_at: float | None = None) -> None:
        """Register a freshly issued nonce before or alongside token distribution."""
        i_at = issued_at if issued_at is not None else time.time()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO approval_nonces (nonce, task_id, issued_at, expires_at, consumed_at)
                VALUES (?, NULL, ?, ?, NULL);
                """,
                (nonce, i_at, expires_at),
            )

    def consume_nonce(self, nonce: str, task_id: str) -> None:
        """
        Atomically check and consume a single-use nonce for a task.
        Raises NonceAlreadyConsumedError, NonceExpiredError, or NonceNotFoundError.
        """
        now = time.time()
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")

            # 1. Attempt atomic consumption update
            cursor = conn.execute(
                """
                UPDATE approval_nonces
                SET consumed_at = ?, task_id = ?
                WHERE nonce = ? AND consumed_at IS NULL AND expires_at > ?;
                """,
                (now, task_id, nonce, now),
            )

            if cursor.rowcount == 1:
                conn.execute("COMMIT;")
                log.info("Nonce %s successfully consumed for task %s", nonce, task_id)
                return

            # 2. If no rows updated, inspect reason to raise accurate error
            row = conn.execute(
                "SELECT consumed_at, expires_at FROM approval_nonces WHERE nonce = ?;",
                (nonce,),
            ).fetchone()

            conn.execute("ROLLBACK;")

            if not row:
                raise NonceNotFoundError(f"Nonce '{nonce}' not found in registry.")

            consumed_at, expires_at = row
            if consumed_at is not None:
                raise NonceAlreadyConsumedError(
                    f"Nonce '{nonce}' was already consumed at {consumed_at}."
                )
            if expires_at <= now:
                raise NonceExpiredError(
                    f"Nonce '{nonce}' expired at {expires_at} (current time {now})."
                )

            raise NonceStoreError(f"Unable to consume nonce '{nonce}'.")
        finally:
            conn.close()
