"""Seyal AI — Conversation Mutation Handlers."""

from __future__ import annotations

from fastapi import HTTPException, Request

from seyal_ai.api.schemas import (
    ConversationDetail,
    ConversationSummary,
    ConversationUpdateRequest,
    MessageEditRequest,
)
from seyal_ai.database.engine import get_session
from seyal_ai.database.repositories.conversation import ConversationRepository
from seyal_ai.services.title_service import (
    make_unique_title,
    mark_manually_renamed,
    run_periodic_title_update_if_needed,
)
from seyal_ai.utils.logging import get_logger

from .formatters import _format_message_schema

log = get_logger("api.conversations.mutations")


async def update_conversation(
    conversation_id: str,
    body: ConversationUpdateRequest,
) -> ConversationSummary:
    """Update a conversation title manually and protect it from automatic AI overwrites."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            conversation = await repo.get_conversation(conversation_id)

            if conversation is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Conversation '{conversation_id}' not found.",
                )

            # Mark as manually renamed so automatic background updates won't overwrite user's title
            mark_manually_renamed(conversation_id)

            raw_new_summary = body.summary.strip()
            is_computer_use = raw_new_summary.startswith("[Computer-Use]") or (conversation.summary or "").startswith("[Computer-Use]")
            clean_title = raw_new_summary.replace("[Computer-Use]", "").strip()

            # Ensure uniqueness within its category
            all_convs, _ = await repo.list_conversations(offset=0, limit=200)
            existing_titles: set[str] = set()
            for c in all_convs:
                if c.id == conversation_id:
                    continue
                c_sum = c.summary or ""
                c_is_cu = c_sum.startswith("[Computer-Use]")
                if c_is_cu == is_computer_use:
                    clean_t = c_sum.replace("[Computer-Use]", "").strip()
                    if clean_t:
                        existing_titles.add(clean_t.lower())

            unique_title = make_unique_title(clean_title, existing_titles, is_computer_use)
            new_summary = f"[Computer-Use] {unique_title}" if is_computer_use else unique_title

            # 1. Supabase first (when connected; queues outbox if offline)
            try:
                from seyal_ai.database.sync import sync_manager
                await sync_manager.update_conversation_ordered(conversation_id, new_summary)
            except Exception:
                pass

            # 2. Local SQLite second
            conversation.summary = new_summary
            await session.commit()
            msg_count = await repo.count_messages(conversation_id)

            log.info("Renamed conversation %s to '%s'", conversation_id, conversation.summary)
            return ConversationSummary(
                id=conversation.id,
                summary=conversation.summary,
                created_at=conversation.created_at,
                message_count=msg_count,
            )
    except HTTPException:
        raise
    except RuntimeError as e:
        if "not initialized" in str(e).lower():
            raise HTTPException(status_code=503, detail="Database not initialized.") from e
        raise


async def generate_dynamic_conversation_title(
    conversation_id: str,
    request: Request,
    force: bool = False,
) -> ConversationSummary:
    """Generate and apply an intelligent dynamic title for a conversation."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            conv = await repo.get_conversation(conversation_id)
            if conv is None:
                raise HTTPException(status_code=404, detail=f"Conversation '{conversation_id}' not found.")

            brain = getattr(request.app.state, "brain", None)
            is_computer_use = (conv.summary or "").startswith("[Computer-Use]")
            await run_periodic_title_update_if_needed(
                conversation_id=conversation_id,
                session=session,
                repo=repo,
                brain=brain,
                is_computer_use=is_computer_use,
                force=force,
            )
            # Re-fetch conversation to get updated summary
            updated_conv = await repo.get_conversation(conversation_id)
            final_summary = updated_conv.summary if updated_conv else conv.summary
            msg_count = await repo.count_messages(conversation_id)

            return ConversationSummary(
                id=conv.id,
                summary=final_summary,
                created_at=conv.created_at,
                message_count=msg_count,
            )
    except HTTPException:
        raise
    except RuntimeError as e:
        if "not initialized" in str(e).lower():
            raise HTTPException(status_code=503, detail="Database not initialized.") from e
        raise


async def edit_conversation_message(
    conversation_id: str,
    message_id: str,
    body: MessageEditRequest,
    request: Request,
) -> ConversationDetail:
    """Edit an earlier message in a conversation and prune subsequent turns."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            conv = await repo.edit_message_and_truncate_subsequent(
                conversation_id=conversation_id,
                message_id=message_id,
                new_content=body.content.strip(),
            )
            if conv is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Message '{message_id}' not found in conversation '{conversation_id}'.",
                )

            # Invalidate backend RAM context so it re-hydrates the edited branch
            brain = getattr(request.app.state, "brain", None)
            if brain and hasattr(brain, "reset_conversation"):
                brain.reset_conversation(conversation_id)

            messages = [
                _format_message_schema(msg)
                for msg in (conv.messages or [])
            ]

            log.info("Edited message %s in conversation %s and pruned subsequent turns.", message_id, conversation_id)
            return ConversationDetail(
                id=conv.id,
                summary=conv.summary,
                created_at=conv.created_at,
                messages=messages,
            )
    except HTTPException:
        raise
    except Exception as err:
        log.error("Failed to edit message in conversation: %s", err)
        raise HTTPException(status_code=500, detail=str(err)) from err
