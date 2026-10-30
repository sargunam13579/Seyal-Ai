"""Seyal AI — Conversation Deletion Handlers."""

from __future__ import annotations

from typing import Any
from fastapi import HTTPException

from seyal_ai.api.schemas import (
    BatchDeleteRequest,
    BatchDeleteResponse,
    DeleteResponse,
)
from seyal_ai.database.engine import get_session
from seyal_ai.database.repositories.conversation import ConversationRepository
from seyal_ai.utils.logging import get_logger

log = get_logger("api.conversations.deletion")


async def delete_conversation(conversation_id: str) -> DeleteResponse:
    """Delete a conversation by ID."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            conversation = await repo.get_conversation(conversation_id)

            if conversation is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Conversation '{conversation_id}' not found.",
                )

            await repo.delete_conversation(conversation_id)

            log.info("Deleted conversation %s", conversation_id)
            return DeleteResponse(
                message="Conversation deleted successfully.",
                deleted_id=conversation_id,
            )
    except HTTPException:
        raise
    except RuntimeError as e:
        if "not initialized" in str(e).lower():
            raise HTTPException(status_code=503, detail="Database not initialized.") from e
        raise


async def batch_delete_conversations(body: BatchDeleteRequest) -> BatchDeleteResponse:
    """Delete multiple conversations in a single batch operation."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            deleted_ids = await repo.batch_delete_conversations(body.conversation_ids)
            return BatchDeleteResponse(
                message=f"Successfully deleted {len(deleted_ids)} conversations.",
                deleted_count=len(deleted_ids),
                deleted_ids=deleted_ids,
            )
    except RuntimeError as e:
        if "not initialized" in str(e).lower():
            raise HTTPException(status_code=503, detail="Database not initialized.") from e
        raise


async def purge_all_conversations() -> dict[str, Any]:
    """Permanently delete all stored conversations, messages, and tool records from the local database."""
    try:
        from sqlalchemy import delete
        from seyal_ai.database.models import Conversation, Message, ToolCall, ToolResult

        async with get_session() as session:
            await session.execute(delete(ToolResult))
            await session.execute(delete(ToolCall))
            await session.execute(delete(Message))
            await session.execute(delete(Conversation))
            await session.commit()
            log.info("Purged all conversations and messages from local database.")
            return {"success": True, "message": "All conversations purged."}
    except Exception as e:
        log.error("Failed to purge conversations: %s", e)
        return {"success": False, "error": str(e)}
