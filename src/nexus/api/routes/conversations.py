"""
NEXUS API — Conversation History Endpoints.

List, view, and delete stored conversations and their messages.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from nexus.api.schemas import (
    BatchDeleteRequest,
    BatchDeleteResponse,
    ConversationDetail,
    ConversationListResponse,
    ConversationSummary,
    ConversationUpdateRequest,
    DeleteResponse,
    MessageSchema,
)
from nexus.database.engine import get_session
from nexus.database.repositories.conversation import ConversationRepository
from nexus.services.title_service import (
    is_conv_manually_renamed,
    make_unique_title,
    mark_manually_renamed,
    run_periodic_title_update_if_needed,
)
from nexus.utils.logging import get_logger

log = get_logger("api.conversations")

router = APIRouter(tags=["conversations"])


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List conversations",
    description="Retrieve a paginated list of all conversations.",
)
async def list_conversations(
    page: int = 1,
    page_size: int = 0,
) -> ConversationListResponse:
    """List all conversations (unlimited when page_size <= 0)."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            limit = page_size if page_size > 0 else None
            offset = ((page - 1) * page_size) if (page_size > 0 and page > 1) else 0
            conversations, total = await repo.list_conversations(
                offset=offset,
                limit=limit,
            )

            # Build summaries without a per-conversation count_messages call.
            # The frontend Sidebar does not display message_count, so the previous
            # N+1 loop (one DB SELECT per conversation) was causing up to 3s of
            # unnecessary latency when 50 conversations are loaded.
            summaries = [
                ConversationSummary(
                    id=conv.id,
                    summary=conv.summary,
                    created_at=conv.created_at,
                    message_count=0,
                )
                for conv in conversations
            ]


            return ConversationListResponse(
                conversations=summaries,
                total=total,
                page=page,
                page_size=page_size,
            )
    except RuntimeError as e:
        if "not initialized" in str(e).lower():
            return ConversationListResponse(
                conversations=[],
                total=0,
                page=page,
                page_size=page_size,
            )
        raise


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    summary="Get conversation details",
    description="Retrieve a conversation and all its messages.",
)
async def get_conversation(conversation_id: str) -> ConversationDetail:
    """Get a conversation with its full message history."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            conversation = await repo.get_conversation(conversation_id)

            if conversation is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Conversation '{conversation_id}' not found.",
                )

            messages = [
                MessageSchema(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.timestamp,
                )
                for msg in conversation.messages
            ]

            return ConversationDetail(
                id=conversation.id,
                summary=conversation.summary,
                created_at=conversation.created_at,
                messages=messages,
            )
    except HTTPException:
        raise
    except RuntimeError as e:
        if "not initialized" in str(e).lower():
            raise HTTPException(status_code=503, detail="Database not initialized.") from e
        raise


@router.get(
    "/conversations/{conversation_id}/overview",
    summary="Get conversation overview paragraph",
    description="Generate a concise overview paragraph describing the total conversation history.",
)
async def get_conversation_overview(
    conversation_id: str,
    request: Request,
) -> dict[str, str]:
    """Generate or retrieve a concise narrative overview paragraph of the conversation."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            conversation = await repo.get_conversation(conversation_id)

            if conversation is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Conversation '{conversation_id}' not found.",
                )

            msgs = conversation.messages or []
            if not msgs:
                clean_title = (conversation.summary or "Agent Task").replace("[Computer-Use]", "").strip()
                return {
                    "overview": f"This task was initialized for '{clean_title}'. No messages were exchanged during this session."
                }

            # Attempt AI LLM summarization if router is available
            brain = getattr(request.app.state, "brain", None)
            if brain and hasattr(brain, "_router") and brain._router.has_providers:
                try:
                    import asyncio
                    from nexus.llm.providers.base import LLMMessage, ModelTier

                    transcript_lines = []
                    for m in msgs[:12]:
                        content = (m.content or "").strip()
                        if len(content) > 160:
                            content = content[:155] + "..."
                        transcript_lines.append(f"{m.role.capitalize()}: {content}")
                    transcript_str = "\n".join(transcript_lines)

                    system_prompt = (
                        "You are an AI assistant specialized in writing high-level conversation overviews. "
                        "Given the conversation transcript, write a single concise narrative overview paragraph (2 to 3 sentences maximum) "
                        "that explains what the user asked or commanded, how the assistant executed or responded, and the final outcome. "
                        "Do NOT use bullet points, list items, quotes, or headers. "
                        "Write in a smooth narrative paragraph so the user and agent can immediately identify what this conversation was about."
                    )

                    llm_resp = await asyncio.wait_for(
                        brain._router.generate(
                            messages=[
                                LLMMessage(role="system", content=system_prompt),
                                LLMMessage(role="user", content=f"Transcript:\n{transcript_str}"),
                            ],
                            tier=ModelTier.FAST,
                            temperature=0.3,
                            max_tokens=200,
                        ),
                        timeout=3.5,
                    )

                    if llm_resp and llm_resp.content and llm_resp.content.strip():
                        clean_text = " ".join(llm_resp.content.strip().split())
                        return {"overview": clean_text}
                except Exception as e:
                    log.debug("LLM conversation overview fallback: %s", e)

            # Heuristic paragraph generation
            user_msgs = [m for m in msgs if m.role == "user"]
            assistant_msgs = [m for m in msgs if m.role == "assistant"]

            first_req = user_msgs[0].content.strip()[:90] if user_msgs else "General Task"
            last_resp = assistant_msgs[-1].content.strip()[:120] if assistant_msgs else ""

            if len(user_msgs) <= 1:
                overview = f"In this session, the user initiated the request '{first_req}'."
                if last_resp:
                    overview += f" The assistant processed the task and responded: {last_resp}"
                else:
                    overview += " The assistant acknowledged and executed the task."
            else:
                last_req = user_msgs[-1].content.strip()[:80]
                overview = (
                    f"This {len(user_msgs)}-turn session began with the inquiry '{first_req}', "
                    f"followed by follow-up discussion regarding '{last_req}'."
                )
                if last_resp:
                    overview += f" The assistant concluded with: {last_resp}"

            return {"overview": overview}
    except HTTPException:
        raise
    except Exception as err:
        log.warning("Failed to generate overview for %s: %s", conversation_id, err)
        return {"overview": "No overview description available for this conversation."}


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationSummary,
    summary="Update conversation",
    description="Update a conversation summary/title.",
)
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
                from nexus.database.sync import sync_manager
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


@router.post(
    "/conversations/{conversation_id}/dynamic-title",
    response_model=ConversationSummary,
    summary="Generate dynamic conversation title",
    description="Analyze conversation messages and generate a concise, unique dynamic title.",
)
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


@router.delete(
    "/conversations/{conversation_id}",
    response_model=DeleteResponse,
    summary="Delete a conversation",
    description="Delete a conversation and all its messages.",
)
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


@router.post(
    "/conversations/batch-delete",
    response_model=BatchDeleteResponse,
    summary="Batch delete conversations",
    description="Delete multiple conversations in a single request.",
)
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


@router.delete(
    "/conversations",
    summary="Purge all conversations",
    description="Permanently delete all stored conversations, messages, and tool records from the local database.",
)
async def purge_all_conversations() -> dict[str, Any]:
    """Purge all conversations."""
    try:
        from sqlalchemy import delete
        from nexus.database.models import Conversation, Message, ToolCall, ToolResult
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


