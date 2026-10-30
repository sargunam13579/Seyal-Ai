"""Seyal AI — Chat Request Handlers."""

from __future__ import annotations

import asyncio
import uuid
from typing import Any

from fastapi import File, Form, HTTPException, Request, UploadFile

from seyal_ai.api.schemas import ChatResetResponse, ChatResponse, ToolCallInfo
from seyal_ai.utils.logging import get_logger

from .extractors import extract_file_content
from .persistence import _persist_chat_turn

log = get_logger("api.chat.handlers")


async def chat(
    request: Request,
    message: str = Form(""),
    conversation_id: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
) -> ChatResponse:
    """Process a user message and optional files through the Seyal AI Brain."""

    brain = request.app.state.brain

    # ----------------------------------------------
    # VALIDATION
    # ----------------------------------------------
    if not message.strip() and not files:
        raise HTTPException(
            status_code=400,
            detail="Please provide a message or at least one file.",
        )

    # ----------------------------------------------
    # INITIALIZE BRAIN
    # ----------------------------------------------
    if not brain.is_initialized:
        try:
            await brain.initialize()
        except Exception as error:
            log.error("Brain initialization failed: %s", error)
            raise HTTPException(
                status_code=503,
                detail=f"Seyal AI Brain failed to initialize: {error}",
            ) from error

    # ----------------------------------------------
    # CHECK LLM
    # ----------------------------------------------
    if not brain._router.has_providers:
        raise HTTPException(
            status_code=503,
            detail="No LLM providers available. Please configure at least one API key.",
        )

    # ----------------------------------------------
    # EXTRACT FILE CONTENT
    # ----------------------------------------------
    extracted_files: list[str] = []
    for uploaded_file in files:
        log.info("Analyzing uploaded file: %s", uploaded_file.filename)
        extracted = await extract_file_content(uploaded_file)
        extracted_files.append(extracted)

    file_context = "\n".join(extracted_files)

    # ----------------------------------------------
    # BUILD AI INPUT
    # ----------------------------------------------
    user_message = message.strip()
    if file_context:
        if user_message:
            final_input = f"{user_message}\n\nUploaded file content:\n{file_context}"
        else:
            final_input = (
                "Analyze the uploaded file and explain its content.\n\n"
                f"Uploaded file content:\n{file_context}"
            )
    else:
        final_input = user_message

    log.info(
        "[BACKEND CHAT REQUEST] message='%.80s' files=%d",
        user_message,
        len(files),
    )

    active_conversation_id = conversation_id or str(uuid.uuid4())
    uploaded_filenames = [f.filename or "uploaded_file" for f in files] if files else []

    # ----------------------------------------------
    # AI PROCESSING
    # ----------------------------------------------
    t0 = asyncio.get_event_loop().time()
    try:
        response_text = await brain.process(
            final_input,
            allow_tools=True,
            conversation_id=active_conversation_id,
        )
    except Exception as error:
        log.error("Brain processing error: %s", error, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing message: {error}",
        ) from error

    elapsed_ms = int((asyncio.get_event_loop().time() - t0) * 1000)

    # ----------------------------------------------
    # MODEL INFORMATION
    # ----------------------------------------------
    model_used = None
    try:
        tier = brain._classify_tier(final_input)
        _, model_name = brain._router._resolve_provider_and_model(tier)
        model_used = model_name
    except Exception:
        pass

    # Snapshot executed tools synchronously to prevent race condition
    current_tools: list[dict[str, Any]] = []
    if hasattr(brain, "_orchestrator") and getattr(brain._orchestrator, "last_tool_calls", None):
        current_tools = list(brain._orchestrator.last_tool_calls)

    # ----------------------------------------------
    # NON-BLOCKING BACKGROUND DATABASE PERSISTENCE
    # ----------------------------------------------
    asyncio.create_task(
        _persist_chat_turn(
            target_conv_id=active_conversation_id,
            user_message=user_message,
            file_names=uploaded_filenames,
            response_text=response_text,
            brain=brain,
            file_context=file_context,
            model_used=model_used,
            executed_tools=current_tools,
            latency_ms=elapsed_ms,
        )
    )

    conversation_id = active_conversation_id

    # ----------------------------------------------
    # TOOL CALL INFORMATION
    # ----------------------------------------------
    tool_calls: list[ToolCallInfo] = []
    if hasattr(brain, "_orchestrator") and hasattr(brain._orchestrator, "last_tool_calls"):
        raw_tools = brain._orchestrator.last_tool_calls or []
        for tool in raw_tools:
            if isinstance(tool, ToolCallInfo):
                tool_calls.append(tool)
            elif isinstance(tool, dict):
                tool_calls.append(
                    ToolCallInfo(
                        name=str(tool.get("name", "unknown")),
                        arguments=(
                            tool.get("arguments", {})
                            if isinstance(tool.get("arguments"), dict)
                            else {}
                        ),
                        result=(
                            str(tool.get("result"))
                            if tool.get("result") is not None
                            else None
                        ),
                        success=bool(tool.get("success", True)),
                    )
                )

    final_conv_id = conversation_id if conversation_id is not None else "default"

    return ChatResponse(
        response=response_text,
        conversation_id=final_conv_id,
        model_used=model_used,
        tool_calls=tool_calls,
    )


async def reset_chat(
    request: Request,
    conversation_id: str | None = None,
) -> ChatResetResponse:
    """Reset the conversation context."""

    brain = request.app.state.brain
    if brain.is_initialized:
        brain.reset_conversation(conversation_id)

    log.info(
        "Conversation reset via API (conversation_id=%s)",
        conversation_id,
    )

    return ChatResetResponse(
        message="Conversation reset successfully."
    )
