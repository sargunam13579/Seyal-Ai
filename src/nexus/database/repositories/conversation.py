"""
NEXUS Conversation Repository.

Data access layer for conversations, messages, and tool calls.
"""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from nexus.database.models import Conversation, Message, ToolCall, ToolResult


class ConversationRepository:
    """Repository for conversation-related database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_conversation(
        self, session_id: str, summary: str | None = None, conversation_id: str | None = None
    ) -> Conversation:
        """Create a new conversation: Supabase first (when connected), then Local SQLite."""
        conversation = (
            Conversation(id=conversation_id, session_id=session_id, summary=summary)
            if conversation_id
            else Conversation(session_id=session_id, summary=summary)
        )
        # 1. Supabase first (if connected; queues outbox if offline)
        try:
            from nexus.database.sync import sync_manager
            await sync_manager.save_conversation_ordered(
                session_id=session_id,
                summary=summary,
                conversation_id=conversation.id,
            )
        except Exception:
            pass

        # 2. Local SQLite second
        self._session.add(conversation)
        await self._session.flush()
        return conversation

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        """Get a conversation by ID, with messages eagerly loaded."""
        result = await self._session.execute(
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(selectinload(Conversation.messages))
        )
        return result.scalar_one_or_none()

    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
    ) -> Message:
        """Add a message to a conversation: Supabase first (when connected), then Local SQLite."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
        )
        # 1. Supabase first (if connected; queues outbox if offline)
        try:
            from nexus.database.sync import sync_manager
            await sync_manager.save_message_ordered(
                conversation_id=conversation_id,
                role=role,
                content=content,
                message_id=message.id,
            )
        except Exception:
            pass

        # 2. Local SQLite second
        self._session.add(message)
        await self._session.flush()
        return message

    async def get_messages(
        self,
        conversation_id: str,
        limit: int | None = None,
    ) -> list[Message]:
        """Get messages for a conversation, ordered by timestamp."""
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.timestamp.asc())
        )
        if limit:
            query = query.limit(limit)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def add_tool_call(
        self,
        message_id: str,
        tool_name: str,
        parameters: dict,
        risk_level: str = "low",
    ) -> ToolCall:
        """Record a tool call associated with a message."""
        tool_call = ToolCall(
            message_id=message_id,
            tool_name=tool_name,
            parameters=parameters,
            risk_level=risk_level,
            status="pending",
        )
        self._session.add(tool_call)
        await self._session.flush()
        return tool_call

    async def update_tool_call_status(
        self,
        tool_call_id: str,
        status: str,
        completed_at: datetime | None = None,
    ) -> None:
        """Update the status of a tool call."""
        result = await self._session.execute(select(ToolCall).where(ToolCall.id == tool_call_id))
        tool_call = result.scalar_one_or_none()
        if tool_call:
            tool_call.status = status
            if completed_at:
                tool_call.completed_at = completed_at
            elif status in ("success", "error"):
                tool_call.completed_at = datetime.now(UTC).replace(tzinfo=None)

    async def add_tool_result(
        self,
        tool_call_id: str,
        success: bool,
        result_data: dict | None = None,
        error_message: str | None = None,
    ) -> ToolResult:
        """Record the result of a tool call."""
        tool_result = ToolResult(
            tool_call_id=tool_call_id,
            success=success,
            result_data=result_data,
            error_message=error_message,
        )
        self._session.add(tool_result)
        await self._session.flush()
        return tool_result

    async def list_conversations(
        self,
        offset: int = 0,
        limit: int | None = None,
    ) -> tuple[list[Conversation], int]:
        """
        List conversations with optional pagination.
        If limit is None or <= 0, fetches all conversations without restriction.

        Returns:
            A tuple of (conversations, total_count).
        """
        from sqlalchemy import func

        # Get total count
        count_result = await self._session.execute(select(func.count()).select_from(Conversation))
        total = count_result.scalar() or 0

        # Get results with optional limit
        query = select(Conversation).order_by(Conversation.created_at.desc())
        if offset > 0:
            query = query.offset(offset)
        if limit is not None and limit > 0:
            query = query.limit(limit)

        result = await self._session.execute(query)
        conversations = list(result.scalars().all())
        return conversations, total

    async def count_messages(self, conversation_id: str) -> int:
        """Count the number of messages in a conversation."""
        from sqlalchemy import func

        result = await self._session.execute(
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == conversation_id)
        )
        return result.scalar() or 0

    async def delete_conversation(self, conversation_id: str) -> None:
        """Delete a conversation: Supabase first (when connected), then Local SQLite."""
        # 1. Supabase first (if connected; queues outbox if offline)
        try:
            from nexus.database.sync import sync_manager
            await sync_manager.delete_conversation_ordered(conversation_id)
        except Exception:
            pass

        # 2. Local SQLite second
        result = await self._session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        conversation = result.scalar_one_or_none()
        if conversation:
            await self._session.delete(conversation)
            await self._session.flush()

    async def batch_delete_conversations(self, conversation_ids: list[str]) -> list[str]:
        """Delete multiple conversations: Supabase first (one by one), then Local SQLite."""
        if not conversation_ids:
            return []

        # 1. Supabase first (one by one if connected; queues outbox if offline)
        try:
            from nexus.database.sync import sync_manager
            await sync_manager.batch_delete_ordered(conversation_ids)
        except Exception:
            pass

        # 2. Local SQLite second
        result = await self._session.execute(
            select(Conversation).where(Conversation.id.in_(conversation_ids))
        )
        conversations = list(result.scalars().all())
        deleted_ids = []
        for conv in conversations:
            deleted_ids.append(conv.id)
            await self._session.delete(conv)
        await self._session.flush()

        return deleted_ids
