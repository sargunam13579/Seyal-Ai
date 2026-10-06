"""
Seyal AI Database Engine.

Manages the local SQLite engine for fast local-first access and an optional
cloud engine (Supabase PostgreSQL) for asynchronous background synchronization.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from seyal_ai.utils.logging import get_logger

log = get_logger("database.engine")

# Local SQLite Engine (Primary store for all instant API operations)
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None

# Cloud Engine (Supabase PostgreSQL for background synchronization)
_cloud_engine: AsyncEngine | None = None
_cloud_session_factory: async_sessionmaker[AsyncSession] | None = None


def _resolve_db_url(url: str) -> str:
    """Resolve ~ and env vars in the database URL."""
    if ":///" in url:
        prefix, path = url.rsplit(":///", 1)
        resolved = os.path.expandvars(os.path.expanduser(path))
        # Ensure parent directory exists
        Path(resolved).parent.mkdir(parents=True, exist_ok=True)
        return f"{prefix}:///{resolved}"

    # Auto-encode password if it contains special characters (like '@')
    if "://" in url and "@" in url:
        try:
            from urllib.parse import quote
            # Split by the last '@' to separate credentials from host
            creds, host_part = url.rsplit("@", 1)
            scheme, user_pass = creds.split("://", 1)
            if ":" in user_pass:
                user, password = user_pass.rsplit(":", 1)
                encoded_password = quote(password)
                return f"{scheme}://{user}:{encoded_password}@{host_part}"
        except Exception as e:
            log.warning("Failed to auto-encode database password: %s", e)

    return url


def _auto_migrate_sqlite_schema(sync_conn) -> None:
    """Safe auto-migration for SQLite schema drift without requiring Alembic."""
    try:
        from sqlalchemy import text
        res = sync_conn.execute(text("PRAGMA table_info(users)"))
        existing_cols = {row[1] for row in res.fetchall()}
        if existing_cols:
            if "age" not in existing_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN age INTEGER"))
                log.info("Auto-migrated SQLite column: users.age")
            if "gender" not in existing_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR(20)"))
                log.info("Auto-migrated SQLite column: users.gender")
            if "dob" not in existing_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN dob VARCHAR(50)"))
                log.info("Auto-migrated SQLite column: users.dob")
            if "mother_tongue" not in existing_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN mother_tongue VARCHAR(100)"))
                log.info("Auto-migrated SQLite column: users.mother_tongue")
            if "known_languages" not in existing_cols:
                sync_conn.execute(text("ALTER TABLE users ADD COLUMN known_languages JSON"))
                log.info("Auto-migrated SQLite column: users.known_languages")
    except Exception as err:
        log.debug("SQLite auto-migration notice: %s", err)


async def init_engine(
    db_url: str | None = None,
    cloud_url: str | None = None,
    echo: bool = False,
) -> AsyncEngine:
    """
    Initialize the local SQLite engine and optional cloud engine.

    The local SQLite database serves all UI reads and writes immediately (Local-First).
    If a cloud URL (Supabase) is provided, a cloud engine is configured for background sync.
    """
    global _engine, _session_factory, _cloud_engine, _cloud_session_factory

    # Determine local and cloud database URLs
    data_dir = Path.home() / ".seyal_ai"
    data_dir.mkdir(parents=True, exist_ok=True)
    default_local_url = f"sqlite+aiosqlite:///{data_dir / 'seyal_ai.db'}"

    target_local_url = default_local_url
    target_cloud_url = cloud_url

    if db_url:
        if "sqlite" in db_url:
            target_local_url = db_url
        elif "postgres" in db_url:
            target_cloud_url = db_url

    # 1. Initialize Local SQLite (Primary)
    resolved_local_url = _resolve_db_url(target_local_url)
    log.info("Initializing Local SQLite database: %s", resolved_local_url.split("///")[-1])

    _engine = create_async_engine(
        resolved_local_url,
        echo=echo,
        connect_args={"check_same_thread": False},
    )

    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    from seyal_ai.database.models import Base

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_auto_migrate_sqlite_schema)

    log.info("Local database initialized successfully (Instant Local-First ready)")

    # 2. Configure Cloud Engine (Supabase - Background Sync)
    if target_cloud_url:
        resolved_cloud_url = _resolve_db_url(target_cloud_url)
        log.info("Configuring Cloud Sync engine for Supabase")
        try:
            _cloud_engine = create_async_engine(
                resolved_cloud_url,
                echo=echo,
                pool_pre_ping=True,
                pool_timeout=15,
                connect_args={"statement_cache_size": 0, "timeout": 10},
            )
            _cloud_session_factory = async_sessionmaker(
                bind=_cloud_engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
        except Exception as err:
            log.warning("Could not configure Cloud Sync engine: %s", err)
            _cloud_engine = None
            _cloud_session_factory = None

    return _engine


async def close_engine() -> None:
    """Close both local and cloud database engines."""
    global _engine, _session_factory, _cloud_engine, _cloud_session_factory

    if _engine:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        log.info("Local database engine closed")

    if _cloud_engine:
        await _cloud_engine.dispose()
        _cloud_engine = None
        _cloud_session_factory = None
        log.info("Cloud database engine closed")


def get_engine() -> AsyncEngine:
    """Return the primary local engine, raising if not initialized."""
    if _engine is None:
        raise RuntimeError("Database engine not initialized. Call init_engine() first.")
    return _engine


def get_cloud_engine() -> AsyncEngine | None:
    """Return the cloud engine if configured."""
    return _cloud_engine


def is_cloud_configured() -> bool:
    """Check if cloud synchronization is configured."""
    return _cloud_engine is not None and _cloud_session_factory is not None


@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide an async database session for the local primary database.

    Usage:
        async with get_session() as session:
            result = await session.execute(select(Conversation))
    """
    if _session_factory is None:
        raise RuntimeError("Database engine not initialized. Call init_engine() first.")

    async with _session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@asynccontextmanager
async def get_cloud_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide an async database session for the remote Supabase cloud database."""
    if _cloud_session_factory is None:
        raise RuntimeError("Cloud database engine not configured.")

    async with _cloud_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
