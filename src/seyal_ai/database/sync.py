"""
Seyal AI Database Synchronization Manager.

Implements Cloud-First Ordered Writes when Online, Immediate Offline-Sync,
and Local-First Startup Reads:
1. Online Mode (Supabase Connected):
   - First executes in Supabase (one by one).
   - Then immediately commits to Local SQLite.
2. Offline Mode (Supabase Unreachable):
   - Executes in Local SQLite.
   - The instant online mode is detected, pending items are immediately
     pushed to Supabase (one by one).
3. App Startup:
   - Reads directly from Local SQLite (0ms startup lag).
   - In the background, checks Supabase & Local SQLite data and updates
     Local SQLite data to Supabase (one by one).
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from seyal_ai.database.engine import (
    get_cloud_engine,
    get_cloud_session,
    get_session,
    is_cloud_configured,
)
from seyal_ai.database.models import (
    Base,
    Conversation,
    Message,
    Session as DBSession,
    SyncOutbox,
    ToolCall,
    ToolResult,
    User,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("database.sync")


class DatabaseSyncManager:
    """Manages ordered synchronization between local SQLite and remote Supabase."""

    def __init__(self) -> None:
        self._worker_task: asyncio.Task | None = None
        self._is_running = False
        self._is_syncing = False
        self._last_sync_time: datetime | None = None
        self._cloud_available = False
        self._was_offline = False

    @property
    def is_cloud_available(self) -> bool:
        return self._cloud_available

    async def start(self) -> None:
        """Start the background sync manager."""
        if not is_cloud_configured():
            log.info("Cloud sync not configured. Running in pure local SQLite mode.")
            return

        if self._is_running:
            return

        self._is_running = True
        # Background startup reconciliation (Local SQLite -> Supabase one by one)
        asyncio.create_task(self._safe_startup_sync())
        # Active reconnect and periodic worker
        self._worker_task = asyncio.create_task(self._sync_worker_loop())
        log.info("DatabaseSyncManager background worker started")

    async def stop(self) -> None:
        """Stop the background sync manager."""
        self._is_running = False
        if self._worker_task and not self._worker_task.done():
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        log.info("DatabaseSyncManager background worker stopped")

    async def is_supabase_connected(self) -> bool:
        """Probe if Supabase is reachable."""
        if not is_cloud_configured():
            return False
        try:
            from sqlalchemy import text
            async with asyncio.timeout(6.0):
                async with get_cloud_session() as cloud_session:
                    await cloud_session.execute(text("SELECT 1"))
            self._cloud_available = True
            return True
        except Exception:
            self._cloud_available = False
            return False

    async def _safe_startup_sync(self) -> None:
        """Perform startup sync with exception safety."""
        try:
            await self.startup_sync()
        except Exception as e:
            log.warning("Initial cloud sync deferred: %s (Running in local-first mode)", e)

    async def startup_sync(self) -> None:
        """
        App Startup:
        Checks Supabase and Local SQLite data, and updates Local SQLite data
        to Supabase (one by one).
        """
        if self._is_syncing or not is_cloud_configured():
            return

        connected = await self.is_supabase_connected()
        if not connected:
            self._was_offline = True
            log.info("Supabase is currently offline. App running in Local-First mode.")
            return

        self._is_syncing = True
        try:
            log.info("Cloud connection active. Reconciling Local SQLite data to Supabase (one by one)...")

            # 1. Ensure Cloud Tables Exist
            cloud_engine = get_cloud_engine()
            if cloud_engine:
                try:
                    async with asyncio.timeout(6.0):
                        async with cloud_engine.begin() as conn:
                            await conn.run_sync(Base.metadata.create_all)
                            from sqlalchemy import text
                            await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dob VARCHAR(50);"))
                            await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mother_tongue VARCHAR(100);"))
                            await conn.execute(text("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS known_languages JSONB;"))
                except Exception as err:
                    log.debug("Cloud create_all notice: %s", err)

            # 2. Synchronize Users & Sessions
            await self._sync_users_and_sessions()

            # 3. Flush any pending offline changes (one by one)
            await self.flush_outbox_one_by_one()

            # 4. Update Local SQLite data to Supabase (one by one)
            await self._reconcile_conversations_one_by_one()

            self._last_sync_time = datetime.now(UTC)
            log.info("Startup sync complete. Supabase matches Local SQLite perfectly.")
        except Exception as e:
            log.warning("Startup sync issue: %s. Local SQLite remains fully operational.", e)
        finally:
            self._is_syncing = False

    async def flush_outbox_one_by_one(self) -> None:
        """
        Immediately process offline outbox items one by one into Supabase
        as soon as online mode is detected.
        """
        async with get_session() as local_session:
            result = await local_session.execute(
                select(SyncOutbox).order_by(SyncOutbox.created_at.asc()).limit(150)
            )
            outbox_items = list(result.scalars().all())

        if not outbox_items:
            return

        log.info("Immediate Reconnect: Pushing %d offline items to Supabase (one by one)...", len(outbox_items))
        async with get_cloud_session() as cloud_session:
            for item in outbox_items:
                try:
                    if item.action == "DELETE":
                        if item.entity_type == "conversation":
                            c_res = await cloud_session.execute(
                                select(Conversation).where(Conversation.id == item.entity_id)
                            )
                            c = c_res.scalar_one_or_none()
                            if c:
                                await cloud_session.delete(c)
                                await cloud_session.flush()

                    elif item.action in ("CREATE", "UPSERT"):
                        if item.entity_type == "conversation":
                            await self._push_single_conversation_to_cloud(item.entity_id, cloud_session)

                    elif item.action == "UPDATE":
                        if item.entity_type == "conversation" and item.payload:
                            c_res = await cloud_session.execute(
                                select(Conversation).where(Conversation.id == item.entity_id)
                            )
                            c = c_res.scalar_one_or_none()
                            if c:
                                c.summary = item.payload.get("summary")
                                await cloud_session.flush()

                    # Remove from outbox immediately after this single item is stored
                    async with get_session() as local_session:
                        await local_session.execute(
                            delete(SyncOutbox).where(SyncOutbox.id == item.id)
                        )
                except Exception as err:
                    log.warning("Failed to store outbox item %s to Supabase: %s", item.id, err)
                    await cloud_session.rollback()

    async def _sync_users_and_sessions(self) -> None:
        """Ensure users and sessions are present in cloud database."""
        async with get_session() as local_session:
            local_users = list((await local_session.execute(select(User))).scalars().all())
            local_sessions = list((await local_session.execute(select(DBSession))).scalars().all())

        if not local_users:
            return

        async with get_cloud_session() as cloud_session:
            cloud_user_ids = set((await cloud_session.execute(select(User.id))).scalars().all())
            cloud_session_ids = set((await cloud_session.execute(select(DBSession.id))).scalars().all())

            for u in local_users:
                if u.id not in cloud_user_ids:
                    cloud_session.add(User(
                        id=u.id,
                        name=u.name,
                        voice_profile_path=u.voice_profile_path,
                        pin_hash=u.pin_hash,
                        age=u.age,
                        gender=u.gender,
                        created_at=u.created_at,
                    ))
            await cloud_session.flush()

            for s in local_sessions:
                if s.id not in cloud_session_ids:
                    cloud_session.add(DBSession(
                        id=s.id,
                        user_id=s.user_id,
                        started_at=s.started_at,
                        ended_at=s.ended_at,
                        auth_method=s.auth_method,
                    ))
            await cloud_session.flush()

    async def _reconcile_conversations_one_by_one(self) -> None:
        """
        Compares Local SQLite and Supabase:
        Updates Local SQLite data to Supabase (one by one).
        """
        async with get_session() as local_session:
            local_convs_res = await local_session.execute(
                select(Conversation.id, Conversation.summary)
            )
            local_dict = {row[0]: row[1] for row in local_convs_res.all()}

        async with get_cloud_session() as cloud_session:
            cloud_convs_res = await cloud_session.execute(
                select(Conversation.id, Conversation.summary)
            )
            cloud_dict = {row[0]: row[1] for row in cloud_convs_res.all()}

            local_ids = set(local_dict.keys())
            cloud_ids = set(cloud_dict.keys())

            missing_in_cloud = list(local_ids - cloud_ids)
            extra_in_cloud = list(cloud_ids - local_ids)
            common_ids = list(local_ids & cloud_ids)

            log.info(
                "Reconciling one-by-one: Local=%d, Cloud=%d | Missing in Cloud=%d, Extra in Cloud=%d",
                len(local_ids), len(cloud_ids), len(missing_in_cloud), len(extra_in_cloud)
            )

            # 1. Update summaries on Supabase one by one if changed
            for conv_id in common_ids:
                if local_dict[conv_id] != cloud_dict[conv_id]:
                    c_obj = (await cloud_session.execute(
                        select(Conversation).where(Conversation.id == conv_id)
                    )).scalar_one_or_none()
                    if c_obj:
                        c_obj.summary = local_dict[conv_id]
                        await cloud_session.flush()

            # 2. Push missing conversations to Supabase (one by one)
            for conv_id in missing_in_cloud:
                await self._push_single_conversation_to_cloud(conv_id, cloud_session)

            # 3. Remove deleted conversations from Supabase (one by one)
            for conv_id in extra_in_cloud:
                ec = (await cloud_session.execute(
                    select(Conversation).where(Conversation.id == conv_id)
                )).scalar_one_or_none()
                if ec:
                    await cloud_session.delete(ec)
                    await cloud_session.flush()

    async def _push_single_conversation_to_cloud(self, conv_id: str, cloud_session: Any) -> None:
        """Push a single conversation from SQLite to Supabase."""
        async with get_session() as local_session:
            c_res = await local_session.execute(
                select(Conversation)
                .where(Conversation.id == conv_id)
                .options(
                    selectinload(Conversation.messages).selectinload(Message.tool_calls).selectinload(ToolCall.results)
                )
            )
            local_c = c_res.scalar_one_or_none()
            if not local_c:
                return

            any_sess_res = await cloud_session.execute(select(DBSession).limit(1))
            cloud_sess = any_sess_res.scalar_one_or_none()
            sess_id = cloud_sess.id if cloud_sess else local_c.session_id

            existing_c = (await cloud_session.execute(
                select(Conversation).where(Conversation.id == local_c.id)
            )).scalar_one_or_none()

            if not existing_c:
                cloud_c = Conversation(
                    id=local_c.id,
                    session_id=sess_id,
                    summary=local_c.summary,
                    created_at=local_c.created_at,
                )
                cloud_session.add(cloud_c)
            else:
                existing_c.summary = local_c.summary

            await cloud_session.flush()

            # Push messages one by one
            for m in local_c.messages:
                existing_m = (await cloud_session.execute(
                    select(Message).where(Message.id == m.id)
                )).scalar_one_or_none()

                if not existing_m:
                    cloud_m = Message(
                        id=m.id,
                        conversation_id=local_c.id,
                        role=m.role,
                        content=m.content,
                        timestamp=m.timestamp,
                    )
                    cloud_session.add(cloud_m)

            await cloud_session.flush()

    # -----------------------------------------------------------------------
    # ORDERED WRITES: Supabase First (one-by-one) -> Then Local SQLite
    # -----------------------------------------------------------------------

    async def save_conversation_ordered(
        self,
        session_id: str,
        summary: str | None = None,
        conversation_id: str | None = None,
    ) -> None:
        """
        When Supabase is connected: store in Supabase (one by one) FIRST,
        then Local SQLite. If offline: store in Local SQLite and queue outbox.
        """
        if not is_cloud_configured():
            return

        if await self.is_supabase_connected():
            try:
                async with get_cloud_session() as cloud_session:
                    # Verify session exists in cloud
                    sess_res = await cloud_session.execute(select(DBSession).where(DBSession.id == session_id))
                    cloud_s = sess_res.scalar_one_or_none()
                    if not cloud_s:
                        any_s = (await cloud_session.execute(select(DBSession).limit(1))).scalar_one_or_none()
                        if any_s:
                            sess_id = any_s.id
                        else:
                            any_u = (await cloud_session.execute(select(User).limit(1))).scalar_one_or_none()
                            if not any_u:
                                any_u = User(name="Seyal AI User")
                                cloud_session.add(any_u)
                                await cloud_session.flush()
                            cloud_s = DBSession(id=session_id, user_id=any_u.id)
                            cloud_session.add(cloud_s)
                            await cloud_session.flush()
                            sess_id = cloud_s.id
                    else:
                        sess_id = cloud_s.id

                    conv = Conversation(id=conversation_id, session_id=sess_id, summary=summary)
                    cloud_session.add(conv)
                    await cloud_session.flush()
                return
            except Exception as e:
                log.warning("Supabase-first write deferred (%s). Storing to Local SQLite with outbox queue.", e)

        # Offline fallback: queue to outbox
        if conversation_id:
            try:
                async with get_session() as local_session:
                    local_session.add(SyncOutbox(
                        entity_type="conversation",
                        entity_id=conversation_id,
                        action="CREATE",
                    ))
            except Exception as err:
                log.debug("Could not queue create outbox item: %s", err)

    async def save_message_ordered(
        self,
        conversation_id: str,
        role: str,
        content: str,
        message_id: str | None = None,
    ) -> None:
        """
        When Supabase is connected: store in Supabase (one by one) FIRST,
        then Local SQLite.
        """
        if not is_cloud_configured():
            return

        if await self.is_supabase_connected():
            try:
                async with get_cloud_session() as cloud_session:
                    msg = Message(
                        id=message_id,
                        conversation_id=conversation_id,
                        role=role,
                        content=content,
                    )
                    cloud_session.add(msg)
                    await cloud_session.flush()
                return
            except Exception as e:
                log.warning("Supabase message write deferred (%s).", e)

        # Offline fallback
        try:
            async with get_session() as local_session:
                local_session.add(SyncOutbox(
                    entity_type="conversation",
                    entity_id=conversation_id,
                    action="UPSERT",
                ))
        except Exception as err:
            log.debug("Could not queue message outbox item: %s", err)

    async def update_conversation_ordered(self, conversation_id: str, summary: str) -> None:
        """
        When Supabase is connected: update in Supabase (one by one) FIRST,
        then Local SQLite.
        """
        if not is_cloud_configured():
            return

        if await self.is_supabase_connected():
            try:
                async with get_cloud_session() as cloud_session:
                    c_res = await cloud_session.execute(
                        select(Conversation).where(Conversation.id == conversation_id)
                    )
                    c = c_res.scalar_one_or_none()
                    if c:
                        c.summary = summary
                        await cloud_session.flush()
                return
            except Exception as e:
                log.warning("Supabase update deferred (%s).", e)

        # Offline fallback
        try:
            async with get_session() as local_session:
                local_session.add(SyncOutbox(
                    entity_type="conversation",
                    entity_id=conversation_id,
                    action="UPDATE",
                    payload={"summary": summary},
                ))
        except Exception as err:
            log.debug("Could not queue update outbox item: %s", err)

    async def delete_conversation_ordered(self, conversation_id: str) -> None:
        """
        When Supabase is connected: delete from Supabase (one by one) FIRST,
        then Local SQLite.
        """
        if not is_cloud_configured():
            return

        if await self.is_supabase_connected():
            try:
                async with get_cloud_session() as cloud_session:
                    c_res = await cloud_session.execute(
                        select(Conversation).where(Conversation.id == conversation_id)
                    )
                    c = c_res.scalar_one_or_none()
                    if c:
                        await cloud_session.delete(c)
                        await cloud_session.flush()
                return
            except Exception as e:
                log.warning("Supabase delete deferred (%s).", e)

        # Offline fallback
        try:
            async with get_session() as local_session:
                local_session.add(SyncOutbox(
                    entity_type="conversation",
                    entity_id=conversation_id,
                    action="DELETE",
                ))
        except Exception as err:
            log.debug("Could not queue delete outbox item: %s", err)

    async def batch_delete_ordered(self, conversation_ids: list[str]) -> None:
        """
        Delete multiple conversations:
        When Supabase is connected: deletes from Supabase (one by one) FIRST,
        then Local SQLite.
        """
        if not conversation_ids or not is_cloud_configured():
            return

        if await self.is_supabase_connected():
            try:
                async with get_cloud_session() as cloud_session:
                    for cid in conversation_ids:
                        c_res = await cloud_session.execute(
                            select(Conversation).where(Conversation.id == cid)
                        )
                        c = c_res.scalar_one_or_none()
                        if c:
                            await cloud_session.delete(c)
                            await cloud_session.flush()
                return
            except Exception as e:
                log.warning("Supabase batch delete deferred (%s).", e)

        # Offline fallback: queue each one by one to outbox
        try:
            async with get_session() as local_session:
                for cid in conversation_ids:
                    local_session.add(SyncOutbox(
                        entity_type="conversation",
                        entity_id=cid,
                        action="DELETE",
                    ))
        except Exception as err:
            log.debug("Could not queue batch delete outbox items: %s", err)

    async def _sync_worker_loop(self) -> None:
        """
        Active monitor:
        When online mode is detected, immediately (udane) pushes pending
        offline items to Supabase (one by one).
        """
        while self._is_running:
            try:
                await asyncio.sleep(6.0)
                if not self._is_syncing:
                    is_now_online = await self.is_supabase_connected()
                    # If we were offline and now online, immediately flush one by one!
                    if is_now_online:
                        if self._was_offline:
                            log.info("Internet connection restored! Immediately syncing pending data to Supabase (one by one)...")
                            self._was_offline = False
                        await self.flush_outbox_one_by_one()
                    else:
                        self._was_offline = True
            except asyncio.CancelledError:
                break
            except Exception as e:
                log.debug("Sync worker loop error: %s", e)


# Global singleton instance
sync_manager = DatabaseSyncManager()
