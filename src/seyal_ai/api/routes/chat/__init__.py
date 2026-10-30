"""Seyal AI API — Chat Endpoint Package.

Supports:
- Normal text chat
- Conversation continuity
- File upload
- File content extraction
- AI file analysis
"""

from __future__ import annotations

from fastapi import APIRouter

from seyal_ai.api.schemas import ChatResetResponse, ChatResponse
from .extractors import TEXT_EXTENSIONS, extract_file_content
from .persistence import _persist_chat_turn
from .handlers import chat, reset_chat
from .stream import chat_stream

router = APIRouter(tags=["chat"])

router.add_api_route(
    "/chat",
    chat,
    methods=["POST"],
    response_model=ChatResponse,
    summary="Send a message to Seyal AI",
    description="Send a user message with optional file attachments.",
)

router.add_api_route(
    "/chat/stream",
    chat_stream,
    methods=["POST"],
    summary="Send a message to Seyal AI with real-time SSE streaming",
    description="Stream response tokens in real-time as they are generated.",
)

router.add_api_route(
    "/chat/reset",
    reset_chat,
    methods=["POST"],
    response_model=ChatResetResponse,
    summary="Reset conversation",
    description="Clear the current conversation context and start fresh.",
)

__all__ = [
    "router",
    "chat",
    "chat_stream",
    "reset_chat",
    "extract_file_content",
    "_persist_chat_turn",
    "TEXT_EXTENSIONS",
]
