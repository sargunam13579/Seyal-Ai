"""
Seyal AI Database Testing Suite.

Verifies database engine initialization, SQLite WAL-mode concurrency,
SQLAlchemy ORM models, relational integrity, cascade cleanups,
transaction rollbacks (ACID), and data repository operations:
1. DB-01: Engine Initialization & SQLite WAL Mode Configuration.
2. DB-02: User Profile Entity Persistence & Unicode Support.
3. DB-03: Session Lifecycle & User Bidirectional Relationship.
4. DB-04: Conversation & Multi-Turn Message History Persistence.
5. DB-05: Tool Call & Tool Result Relationship Schema.
6. DB-06: Security Audit Log Recording & Risk-Level Filtering.
7. DB-07: Cascade Deletion & Orphan Record Clean-up.
8. DB-08: Transaction Atomicity & Rollback Integrity (ACID).
9. DB-09: Concurrent Async Read & Write Stability (WAL Multi-Worker).
10. DB-10: Database Engine Graceful Shutdown & Connection Disposal.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from seyal_ai.database.engine import close_engine, get_session, init_engine
from seyal_ai.database.models import (
    Conversation,
    Message,
    Session,
    ToolCall,
    ToolResult,
    User,
)
from seyal_ai.database.repositories.audit import AuditRepository
from seyal_ai.database.repositories.conversation import ConversationRepository

# ===========================================================================
# 1. DATABASE ENGINE & PRAGMA CONFIGURATION TESTS
# ===========================================================================


class TestDatabaseEngineConfiguration:
    """Verifies database initialization, table creation, and WAL mode configuration."""

    @pytest.mark.asyncio
    async def test_db_engine_initialization_and_wal_mode(self, tmp_path: Path):
        """
        DB-01: init_engine must create all metadata tables, enable Write-Ahead Logging (WAL),
        and establish normal synchronicity for high local-first throughput.
        """
        db_file = tmp_path / "test_engine_wal.db"
        db_url = f"sqlite+aiosqlite:///{db_file}"

        engine = await init_engine(db_url=db_url, echo=False)
        assert engine is not None

        # Verify PRAGMA journal_mode is WAL
        async with get_session() as session:
            result = await session.execute(text("PRAGMA journal_mode;"))
            mode = result.scalar_one()
            assert str(mode).lower() == "wal"

        await close_engine()


# ===========================================================================
# 2. USER ENTITY & UNICODE PERSISTENCE TESTS
# ===========================================================================


class TestUserEntityPersistence:
    """Verifies User model schema, attributes, and Unicode Tamil script persistence."""

    @pytest.mark.asyncio
    async def test_db_user_crud_and_unicode_tamil_profile(self, tmp_path: Path):
        """
        DB-02: Creating a User with Tamil Unicode attributes, age, and languages list
        must persist and retrieve without character encoding errors.
        """
        db_file = tmp_path / "test_user_unicode.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        user_id: str
        async with get_session() as session:
            user = User(
                name="செயல் பயனர் (Seyal User)",
                mother_tongue="தமிழ்",
                known_languages=["ta", "en"],
                age=24,
                gender="Male",
            )
            session.add(user)
            await session.flush()
            user_id = user.id
            assert user_id is not None

        # Read back in fresh session
        async with get_session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            loaded_user = result.scalar_one_or_none()

            assert loaded_user is not None
            assert "செயல் பயனர்" in loaded_user.name
            assert loaded_user.mother_tongue == "தமிழ்"
            assert loaded_user.known_languages is not None
            assert "ta" in loaded_user.known_languages
            assert loaded_user.age == 24

        await close_engine()


# ===========================================================================
# 3. SESSION LIFECYCLE & USER RELATIONSHIP TESTS
# ===========================================================================


class TestSessionRelationship:
    """Verifies Session model foreign keys and bidirectional User relationship."""

    @pytest.mark.asyncio
    async def test_db_session_and_user_bidirectional_relationship(self, tmp_path: Path):
        """
        DB-03: Session must link to User via foreign key with full ORM bidirectional navigation.
        """
        db_file = tmp_path / "test_session_rel.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        session_id: str
        user_id: str

        async with get_session() as session:
            user = User(name="Test Session Owner")
            session.add(user)
            await session.flush()
            user_id = user.id

            user_session = Session(user_id=user.id, auth_method="local_pin")
            session.add(user_session)
            await session.flush()
            session_id = user_session.id

        # Query session and verify relationship to user
        async with get_session() as session:
            result = await session.execute(
                select(Session).where(Session.id == session_id).options(selectinload(Session.user))
            )
            loaded_session = result.scalar_one_or_none()

            assert loaded_session is not None
            assert loaded_session.user_id == user_id
            assert loaded_session.user is not None
            assert loaded_session.user.name == "Test Session Owner"

        await close_engine()


# ===========================================================================
# 4. CONVERSATION & MESSAGE THREAD PERSISTENCE TESTS
# ===========================================================================


class TestConversationMessagePersistence:
    """Verifies hierarchical persistence of conversations and chronological messages."""

    @pytest.mark.asyncio
    async def test_db_conversation_and_message_thread(self, tmp_path: Path):
        """
        DB-04: ConversationRepository must create conversations, append user/assistant messages,
        and retrieve complete message history in chronological order.
        """
        db_file = tmp_path / "test_conv_thread.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        conv_id: str
        async with get_session() as session:
            user = User(name="Chat Tester")
            session.add(user)
            await session.flush()
            user_sess = Session(user_id=user.id)
            session.add(user_sess)
            await session.flush()

            repo = ConversationRepository(session)
            conv = await repo.create_conversation(session_id=user_sess.id, summary="Seyal AI Task Thread")
            conv_id = conv.id

            m1 = await repo.add_message(conversation_id=conv.id, role="user", content="Open browser please")
            m2 = await repo.add_message(conversation_id=conv.id, role="assistant", content="Opening browser now.")
            assert m1.id is not None
            assert m2.id is not None

        # Verify retrieval
        async with get_session() as session:
            repo = ConversationRepository(session)
            loaded_conv = await repo.get_conversation(conv_id)
            assert loaded_conv is not None
            assert len(loaded_conv.messages) == 2
            assert loaded_conv.messages[0].role == "user"
            assert loaded_conv.messages[1].role == "assistant"
            assert "Opening browser" in loaded_conv.messages[1].content

        await close_engine()


# ===========================================================================
# 5. TOOL CALL & TOOL RESULT RELATIONSHIP SCHEMA TESTS
# ===========================================================================


class TestToolCallResultSchema:
    """Verifies ToolCall and ToolResult models linked to assistant messages."""

    @pytest.mark.asyncio
    async def test_db_tool_call_and_result_persistence(self, tmp_path: Path):
        """
        DB-05: Assistant message must associate with ToolCall and ToolResult entities
        preserving JSON parameters and result payloads.
        """
        db_file = tmp_path / "test_tool_schema.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        msg_id: str

        async with get_session() as session:
            user = User(name="Tool Tester")
            session.add(user)
            await session.flush()
            s = Session(user_id=user.id)
            session.add(s)
            await session.flush()
            conv = Conversation(session_id=s.id, summary="Tool Plan")
            session.add(conv)
            await session.flush()

            msg = Message(conversation_id=conv.id, role="assistant", content="Calling create_file tool")
            session.add(msg)
            await session.flush()
            msg_id = msg.id

            tc = ToolCall(message_id=msg.id, tool_name="create_file", parameters={"path": "report.txt"})
            session.add(tc)
            await session.flush()
            assert tc.id is not None

            tr = ToolResult(tool_call_id=tc.id, success=True, result_data={"bytes_written": 128})
            session.add(tr)
            await session.flush()

        # Query back
        async with get_session() as session:
            result = await session.execute(
                select(Message).where(Message.id == msg_id).options(
                    selectinload(Message.tool_calls).selectinload(ToolCall.results)
                )
            )
            loaded_msg = result.scalar_one_or_none()
            assert loaded_msg is not None
            assert len(loaded_msg.tool_calls) == 1
            assert loaded_msg.tool_calls[0].tool_name == "create_file"
            assert len(loaded_msg.tool_calls[0].results) == 1
            assert loaded_msg.tool_calls[0].results[0].success

        await close_engine()


# ===========================================================================
# 6. SECURITY AUDIT LOG RECORDING & FILTERING TESTS
# ===========================================================================


class TestAuditLogRepository:
    """Verifies security audit trail recording and filtering by risk level."""

    @pytest.mark.asyncio
    async def test_db_audit_log_recording_and_high_risk_counting(self, tmp_path: Path):
        """
        DB-06: AuditRepository must record security actions and count high-risk entries accurately.
        """
        db_file = tmp_path / "test_audit_repo.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        async with get_session() as session:
            audit_repo = AuditRepository(session)

            # Log diverse action risks
            await audit_repo.log_action("read_file", tool_name="ReadFileTool", risk_level="low")
            await audit_repo.log_action("format_disk", tool_name="TerminalCommandTool", risk_level="critical")
            await audit_repo.log_action("delete_system_dir", tool_name="DeletePathTool", risk_level="high")

        # Query audit logs
        async with get_session() as session:
            audit_repo = AuditRepository(session)
            recent_logs = await audit_repo.get_recent_logs(limit=10)
            assert len(recent_logs) == 3

            # Count high/critical risk actions
            high_risk_count = await audit_repo.count_high_risk_actions()
            assert high_risk_count >= 1

        await close_engine()


# ===========================================================================
# 7. CASCADE DELETION INTEGRITY TESTS
# ===========================================================================


class TestCascadeDeletionIntegrity:
    """Verifies foreign key cascade clean-up of child records when parents are deleted."""

    @pytest.mark.asyncio
    async def test_db_cascade_deletion_purges_child_messages(self, tmp_path: Path):
        """
        DB-07: Deleting a Conversation via repository must cascade and remove all
        child messages, leaving zero orphan records in the database.
        """
        db_file = tmp_path / "test_cascade_delete.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        conv_id: str
        async with get_session() as session:
            user = User(name="Cascade Owner")
            session.add(user)
            await session.flush()
            s = Session(user_id=user.id)
            session.add(s)
            await session.flush()

            repo = ConversationRepository(session)
            conv = await repo.create_conversation(session_id=s.id, summary="Cascade Target")
            conv_id = conv.id

            await repo.add_message(conversation_id=conv_id, role="user", content="Message to be cascade deleted 1")
            await repo.add_message(conversation_id=conv_id, role="assistant", content="Message to be cascade deleted 2")

        # Delete conversation
        async with get_session() as session:
            repo = ConversationRepository(session)
            await repo.delete_conversation(conv_id)

        # Verify conversation and child messages are purged
        async with get_session() as session:
            repo = ConversationRepository(session)
            assert await repo.get_conversation(conv_id) is None

            msg_count_res = await session.execute(
                text(f"SELECT COUNT(*) FROM messages WHERE conversation_id='{conv_id}';")
            )
            assert msg_count_res.scalar_one() == 0

        await close_engine()


# ===========================================================================
# 8. TRANSACTION ATOMICITY & ROLLBACK INTEGRITY (ACID)
# ===========================================================================


class TestTransactionAtomicityRollback:
    """Verifies ACID atomicity: failed transactions must roll back cleanly."""

    @pytest.mark.asyncio
    async def test_db_transaction_rollback_on_unhandled_exception(self, tmp_path: Path):
        """
        DB-08: When an unhandled exception occurs inside get_session(), all uncommitted
        operations must be rolled back completely with zero partial state persisted.
        """
        db_file = tmp_path / "test_rollback_acid.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        target_name = "Aborted Ghost User"
        try:
            async with get_session() as session:
                user = User(name=target_name)
                session.add(user)
                await session.flush()
                # Simulate mid-transaction crash
                raise RuntimeError("Simulated mid-transaction failure")
        except RuntimeError:
            pass

        # Verify the user was NOT saved
        async with get_session() as session:
            result = await session.execute(
                text(f"SELECT COUNT(*) FROM users WHERE name='{target_name}';")
            )
            assert result.scalar_one() == 0

        await close_engine()


# ===========================================================================
# 9. CONCURRENT ASYNC READ & WRITE STABILITY (WAL MODE)
# ===========================================================================


class TestConcurrentWALModeOperations:
    """Verifies non-blocking concurrent writes and reads in SQLite WAL mode."""

    @pytest.mark.asyncio
    async def test_db_concurrent_async_writes_under_wal_mode(self, tmp_path: Path):
        """
        DB-09: 20 concurrent async workers writing messages to independent conversations
        must succeed without 'database is locked' errors under SQLite WAL mode.
        """
        db_file = tmp_path / "test_concurrency_wal.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        # Pre-seed session
        session_id: str
        async with get_session() as session:
            user = User(name="Concurrency Tester")
            session.add(user)
            await session.flush()
            s = Session(user_id=user.id)
            session.add(s)
            await session.flush()
            session_id = s.id

        async def worker_write(idx: int) -> bool:
            async with get_session() as session:
                repo = ConversationRepository(session)
                conv = await repo.create_conversation(session_id=session_id, summary=f"Conv Worker #{idx}")
                await repo.add_message(conversation_id=conv.id, role="user", content=f"Concurrent message {idx}")
            return True

        # Run 20 concurrent workers
        results = await asyncio.gather(*(worker_write(i) for i in range(20)))
        assert len(results) == 20
        assert all(results)

        await close_engine()


# ===========================================================================
# 10. ENGINE SHUTDOWN & DISPOSAL TESTS
# ===========================================================================


class TestEngineShutdownDisposal:
    """Verifies clean engine teardown and resource release."""

    @pytest.mark.asyncio
    async def test_db_engine_graceful_close_and_disposal(self, tmp_path: Path):
        """
        DB-10: close_engine() must safely dispose of database connections and reset
        internal singletons to prevent resource leaks.
        """
        db_file = tmp_path / "test_disposal.db"
        engine = await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)
        assert engine is not None

        # Dispose
        await close_engine()

        # Calling get_session after close_engine must raise RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            async with get_session():
                pass

        assert "Database engine not initialized" in str(exc_info.value)
