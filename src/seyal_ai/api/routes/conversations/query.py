"""Seyal AI — Conversation Query Handlers."""

from __future__ import annotations

import asyncio
from fastapi import HTTPException, Request

from seyal_ai.api.schemas import (
    ConversationDetail,
    ConversationListResponse,
    ConversationSummary,
)
from seyal_ai.database.engine import get_session
from seyal_ai.database.repositories.conversation import ConversationRepository
from seyal_ai.utils.logging import get_logger

from .formatters import _format_message_schema

log = get_logger("api.conversations.query")


async def list_conversations(
    page: int = 1,
    page_size: int = 0,
    query: str | None = None,
) -> ConversationListResponse:
    """List all conversations (unlimited when page_size <= 0, or filtered by search query)."""
    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            limit = page_size if page_size > 0 else None
            offset = ((page - 1) * page_size) if (page_size > 0 and page > 1) else 0
            conversations, total = await repo.list_conversations(
                offset=offset,
                limit=limit,
                query=query,
            )

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
                _format_message_schema(msg)
                for msg in (conversation.messages or [])
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
                    from seyal_ai.llm.providers.base import LLMMessage, ModelTier

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
