"""
Comprehensive test suite verifying Phase 3 - Phase A: Database Canonicalization.

Validates:
1. Canonical location (`seyal_ai.platform.database`) is fully functional.
2. Legacy location (`seyal_ai.database`) forwards 100% transparently.
3. Class identity: `User_legacy is User_canonical` (guarantees single ORM model).
4. Metadata identity: `Base_legacy.metadata is Base_canonical.metadata` (guarantees single metadata registry).
5. Function identity: `init_engine`, `close_engine`, `get_session`.
6. Full CRUD workflow with SQLite: insert through canonical, read through legacy, and vice-versa.
"""

from __future__ import annotations

import pytest
from sqlalchemy import select

# 1. Import from canonical platform location
from seyal_ai.platform.database.engine import (
    close_engine as close_canonical,
    get_session as get_session_canonical,
    init_engine as init_canonical,
)
from seyal_ai.platform.database.models import (
    AuditLog as AuditLogCanonical,
    Base as BaseCanonical,
    Conversation as ConversationCanonical,
    Device as DeviceCanonical,
    Message as MessageCanonical,
    Session as SessionCanonical,
    SyncOutbox as SyncOutboxCanonical,
    User as UserCanonical,
)
from seyal_ai.platform.database.repositories.conversation import (
    ConversationRepository as ConvRepoCanonical,
)
from seyal_ai.platform.database.sync import (
    DatabaseSyncManager as SyncMgrCanonical,
    sync_manager as sync_inst_canonical,
)

# 2. Import from legacy forwarder location
from seyal_ai.database.engine import (
    close_engine as close_legacy,
    get_session as get_session_legacy,
    init_engine as init_legacy,
)
from seyal_ai.database.models import (
    AuditLog as AuditLogLegacy,
    Base as BaseLegacy,
    Conversation as ConversationLegacy,
    Device as DeviceLegacy,
    Message as MessageLegacy,
    Session as SessionLegacy,
    SyncOutbox as SyncOutboxLegacy,
    User as UserLegacy,
)
from seyal_ai.database.repositories.conversation import (
    ConversationRepository as ConvRepoLegacy,
)
from seyal_ai.database.sync import (
    DatabaseSyncManager as SyncMgrLegacy,
    sync_manager as sync_inst_legacy,
)


class TestDatabaseCanonicalization:
    """Rigorous tests ensuring zero duplicate models or metadata registries."""

    def test_model_class_identities(self):
        """Verify that every single model class is the exact same object in memory."""
        assert UserCanonical is UserLegacy
        assert BaseCanonical is BaseLegacy
        assert ConversationCanonical is ConversationLegacy
        assert MessageCanonical is MessageLegacy
        assert SessionCanonical is SessionLegacy
        assert SyncOutboxCanonical is SyncOutboxLegacy
        assert AuditLogCanonical is AuditLogLegacy
        assert DeviceCanonical is DeviceLegacy

    def test_declarative_metadata_identity(self):
        """Verify that only one DeclarativeBase metadata registry exists."""
        assert BaseCanonical.metadata is BaseLegacy.metadata
        # Ensure all tables are bound to the single canonical metadata registry
        table_names = set(BaseCanonical.metadata.tables.keys())
        assert "users" in table_names
        assert "conversations" in table_names
        assert "messages" in table_names
        assert "sync_outbox" in table_names

    def test_engine_and_session_identities(self):
        """Verify that engine initialization and session factories are shared."""
        assert init_canonical is init_legacy
        assert close_canonical is close_legacy
        assert get_session_canonical is get_session_legacy

    def test_repositories_and_sync_identities(self):
        """Verify that repositories and sync managers are shared."""
        assert ConvRepoCanonical is ConvRepoLegacy
        assert SyncMgrCanonical is SyncMgrLegacy
        assert sync_inst_canonical is sync_inst_legacy

    @pytest.mark.asyncio
    async def test_cross_path_crud_and_persistence(self, tmp_path):
        """Test write via Canonical path and read via Legacy path in an active SQLite database."""
        db_file = tmp_path / "canonical_verification.db"
        db_url = f"sqlite+aiosqlite:///{db_file}"

        try:
            # 1. Initialize through canonical engine
            await init_canonical(db_url=db_url)

            # 2. Write record using Canonical models
            async with get_session_canonical() as session:
                user = UserCanonical(id="canonical-user-1", name="Sargunam", age=25)
                session.add(user)
                await session.commit()

            # 3. Read record using Legacy models & session
            async with get_session_legacy() as session:
                result = await session.execute(
                    select(UserLegacy).where(UserLegacy.id == "canonical-user-1")
                )
                fetched_user = result.scalar_one_or_none()
                assert fetched_user is not None
                assert fetched_user.name == "Sargunam"
                assert fetched_user.age == 25

            # 4. Create conversation using Legacy Repository
            async with get_session_legacy() as session:
                repo_legacy = ConvRepoLegacy(session)
                conv = await repo_legacy.create_conversation(
                    session_id="session-test-01",
                    summary="Canonicalization Test Conversation",
                )
                assert conv.id is not None
                conv_id = conv.id

            # 5. Fetch conversation using Canonical Repository
            async with get_session_canonical() as session:
                repo_canonical = ConvRepoCanonical(session)
                fetched_conv = await repo_canonical.get_conversation(conv_id)
                assert fetched_conv is not None
                assert fetched_conv.summary == "Canonicalization Test Conversation"

        finally:
            # Cleanly close engine to release file handle on Windows
            await close_canonical()
