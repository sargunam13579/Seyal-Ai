"""Seyal AI — Chat Real-Time Streaming Handler."""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any

from fastapi import File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

from seyal_ai.utils.logging import get_logger

from .extractors import extract_file_content
from .persistence import _persist_chat_turn

log = get_logger("api.chat.stream")


async def chat_stream(
    request: Request,
    message: str = Form(""),
    conversation_id: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
) -> StreamingResponse:
    """Stream response tokens in real-time as they are generated via SSE."""

    brain = request.app.state.brain

    if not message.strip() and not files:
        raise HTTPException(
            status_code=400,
            detail="Please provide a message or at least one file.",
        )

    if not brain.is_initialized:
        try:
            await brain.initialize()
        except Exception as error:
            log.error("Brain initialization failed: %s", error)
            raise HTTPException(
                status_code=503,
                detail=f"Seyal AI Brain failed to initialize: {error}",
            ) from error

    if not brain._router.has_providers:
        raise HTTPException(
            status_code=503,
            detail="No LLM providers available. Please configure at least one API key.",
        )

    extracted_files: list[str] = []
    for uploaded_file in files:
        extracted = await extract_file_content(uploaded_file)
        extracted_files.append(extracted)

    file_context = "\n".join(extracted_files)
    user_message = message.strip()

    if file_context:
        if user_message:
            final_input = f"{user_message}\n\nUploaded file content:\n{file_context}"
        else:
            final_input = f"Analyze the uploaded file and explain its content.\n\nUploaded file content:\n{file_context}"
    else:
        final_input = user_message

    active_conversation_id = conversation_id or str(uuid.uuid4())
    uploaded_filenames = [f.filename or "uploaded_file" for f in files] if files else []

    async def event_generator():
        t0 = asyncio.get_event_loop().time()
        yield f"data: {json.dumps({'type': 'start', 'conversation_id': active_conversation_id})}\n\n"
        full_chunks = []
        try:
            from seyal_ai.core.orchestrator import _requires_tools
            if _requires_tools(final_input):
                # Provide immediate live progress indicator so user doesn't see a blank frozen screen
                init_notice = "Working on your request...\n\n"
                full_chunks.append(init_notice)
                yield f"data: {json.dumps({'type': 'chunk', 'text': init_notice})}\n\n"

                resp = await brain.process(
                    final_input,
                    allow_tools=True,
                    conversation_id=active_conversation_id,
                )
                words = resp.split(" ")
                chunk_size = 4
                for i in range(0, len(words), chunk_size):
                    if await request.is_disconnected():
                        log.info("Client disconnected during tool response SSE streaming.")
                        break
                    chunk_text = " ".join(words[i : i + chunk_size])
                    if i + chunk_size < len(words):
                        chunk_text += " "
                    full_chunks.append(chunk_text)
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk_text})}\n\n"
                    await asyncio.sleep(0.005)
            else:
                async for chunk in brain.process_stream(
                    final_input,
                    allow_tools=False,
                    conversation_id=active_conversation_id,
                ):
                    if await request.is_disconnected():
                        log.info("Client disconnected during stream SSE streaming.")
                        break
                    full_chunks.append(chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
        except Exception as e:
            log.error("Stream generation error: %s", e)
            fallback = "I encountered an error processing your request. Please try again."
            full_chunks.append(fallback)
            yield f"data: {json.dumps({'type': 'chunk', 'text': fallback})}\n\n"

        elapsed_ms = int((asyncio.get_event_loop().time() - t0) * 1000)
        response_text = "".join(full_chunks)
        yield f"data: {json.dumps({'type': 'done', 'conversation_id': active_conversation_id, 'full_response': response_text})}\n\n"

        # Model and tool call information snapshot
        model_used = None
        try:
            tier = brain._classify_tier(final_input)
            _, model_used = brain._router._resolve_provider_and_model(tier)
        except Exception:
            pass

        current_tools: list[dict[str, Any]] = []
        if hasattr(brain, "_orchestrator") and getattr(brain._orchestrator, "last_tool_calls", None):
            current_tools = list(brain._orchestrator.last_tool_calls)

        # Background persistence & title service
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

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
