"""Seyal AI — Chat Persistence Service."""

from __future__ import annotations

from typing import Any
from seyal_ai.utils.logging import get_logger

log = get_logger("api.chat.persistence")


async def _persist_chat_turn(
    target_conv_id: str,
    user_message: str,
    file_names: list[str],
    response_text: str,
    brain: Any | None = None,
    file_context: str | None = None,
    model_used: str | None = None,
    executed_tools: list[dict[str, Any]] | None = None,
    latency_ms: int | None = None,
) -> None:
    """Non-blocking background helper to persist chat conversation and messages to Supabase database."""
    try:
        from sqlalchemy import select
        from seyal_ai.database.engine import get_session
        from seyal_ai.database.models import Session as DBSession, User
        from seyal_ai.database.repositories.conversation import ConversationRepository

        async with get_session() as session:
            repo = ConversationRepository(session)
            conv = await repo.get_conversation(target_conv_id)

            if conv is None:
                user_res = await session.execute(select(User).limit(1))
                db_user = user_res.scalar_one_or_none()
                if db_user is None:
                    db_user = User(name="User")
                    session.add(db_user)
                    await session.flush()

                sess_res = await session.execute(
                    select(DBSession).where(DBSession.user_id == db_user.id).limit(1)
                )
                db_session = sess_res.scalar_one_or_none()
                if db_session is None:
                    db_session = DBSession(user_id=db_user.id)
                    session.add(db_session)
                    await session.flush()

                summary_source = user_message or (file_names[0] if file_names else "File Analysis")
                # Gather existing titles in simple chat category for strict uniqueness
                all_convs, _ = await repo.list_conversations(offset=0, limit=200)
                existing_titles = {
                    (c.summary or "").strip().lower()
                    for c in all_convs
                    if not (c.summary or "").startswith("[Computer-Use]")
                }
                from seyal_ai.services.title_service import generate_ai_title_for_first_turn
                clean_initial_title = await generate_ai_title_for_first_turn(
                    first_message=summary_source,
                    existing_category_titles=existing_titles,
                    brain=brain,
                    is_computer_use=False,
                )

                conv = await repo.create_conversation(
                    session_id=db_session.id,
                    summary=clean_initial_title,
                    conversation_id=target_conv_id,
                )

            database_user_content = user_message if user_message else "Analyze uploaded file."
            if file_context:
                database_user_content = f"{database_user_content}\n\nUploaded file content:\n{file_context}"
            elif file_names:
                database_user_content = f"{database_user_content}\n[Attached files: {', '.join(file_names)}]"

            await repo.add_message(
                conversation_id=conv.id,
                role="user",
                content=database_user_content,
            )
            asst_msg = await repo.add_message(
                conversation_id=conv.id,
                role="assistant",
                content=response_text,
                model_used=model_used,
                latency_ms=latency_ms,
            )

            # Persist executed tool calls and results to audit log
            tools_to_save = executed_tools
            if tools_to_save is None:
                orchestrator = getattr(brain, "_orchestrator", None) if brain is not None else None
                tools_to_save = getattr(orchestrator, "last_tool_calls", []) if orchestrator is not None else []

            for t in tools_to_save:
                try:
                    tool_call = await repo.add_tool_call(
                        message_id=asst_msg.id,
                        tool_name=t.get("name", "unknown_tool"),
                        parameters=t.get("arguments", {}) if isinstance(t.get("arguments"), dict) else {},
                        risk_level=t.get("risk_level", "low"),
                    )
                    await repo.add_tool_result(
                        tool_call_id=tool_call.id,
                        success=t.get("success", True),
                        result_data={"output": str(t.get("result", ""))[:2000]},
                    )
                except Exception as t_err:
                    log.debug("Notice recording tool call audit: %s", t_err)

            await session.commit()

            # Trigger periodic dynamic title evaluation in background if due
            from seyal_ai.services.title_service import run_periodic_title_update_if_needed
            await run_periodic_title_update_if_needed(
                conversation_id=conv.id,
                session=session,
                repo=repo,
                brain=brain,
                is_computer_use=False,
            )
    except Exception as db_error:
        log.warning("Non-blocking background database persistence notice: %s", db_error)
