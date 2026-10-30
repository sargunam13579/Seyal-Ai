"""Seyal AI API — Conversation History Package.

List, view, update, delete, and export stored conversations and their messages.
"""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter

from seyal_ai.api.schemas import (
    BatchDeleteResponse,
    ConversationDetail,
    ConversationListResponse,
    ConversationSummary,
    DeleteResponse,
)

from .formatters import _format_message_schema
from .query import (
    list_conversations,
    get_conversation,
    get_conversation_overview,
)
from .mutations import (
    update_conversation,
    generate_dynamic_conversation_title,
    edit_conversation_message,
)
from .deletion import (
    delete_conversation,
    batch_delete_conversations,
    purge_all_conversations,
)
from .export import export_conversation

router = APIRouter(tags=["conversations"])

router.add_api_route(
    "/conversations",
    list_conversations,
    methods=["GET"],
    response_model=ConversationListResponse,
    summary="List conversations",
    description="Retrieve a paginated list of all conversations.",
)

router.add_api_route(
    "/conversations/{conversation_id}",
    get_conversation,
    methods=["GET"],
    response_model=ConversationDetail,
    summary="Get conversation details",
    description="Retrieve a conversation and all its messages.",
)

router.add_api_route(
    "/conversations/{conversation_id}/overview",
    get_conversation_overview,
    methods=["GET"],
    summary="Get conversation overview paragraph",
    description="Generate a concise overview paragraph describing the total conversation history.",
)

router.add_api_route(
    "/conversations/{conversation_id}",
    update_conversation,
    methods=["PATCH"],
    response_model=ConversationSummary,
    summary="Update conversation",
    description="Update a conversation summary/title.",
)

router.add_api_route(
    "/conversations/{conversation_id}/dynamic-title",
    generate_dynamic_conversation_title,
    methods=["POST"],
    response_model=ConversationSummary,
    summary="Generate dynamic conversation title",
    description="Analyze conversation messages and generate a concise, unique dynamic title.",
)

router.add_api_route(
    "/conversations/{conversation_id}/messages/{message_id}",
    edit_conversation_message,
    methods=["PUT"],
    response_model=ConversationDetail,
    summary="Edit message and branch conversation",
    description="Update an earlier message's text and prune subsequent turns to allow branching or regenerating.",
)

router.add_api_route(
    "/conversations/{conversation_id}",
    delete_conversation,
    methods=["DELETE"],
    response_model=DeleteResponse,
    summary="Delete a conversation",
    description="Delete a conversation and all its messages.",
)

router.add_api_route(
    "/conversations/batch-delete",
    batch_delete_conversations,
    methods=["POST"],
    response_model=BatchDeleteResponse,
    summary="Batch delete conversations",
    description="Delete multiple conversations in a single request.",
)

router.add_api_route(
    "/conversations",
    purge_all_conversations,
    methods=["DELETE"],
    summary="Purge all conversations",
    description="Permanently delete all stored conversations, messages, and tool records from the local database.",
)

router.add_api_route(
    "/conversations/{conversation_id}/export",
    export_conversation,
    methods=["GET"],
    summary="Export conversation transcript",
    description="Export full conversation transcript in Markdown, JSON, or Plain Text format.",
)

__all__ = [
    "router",
    "_format_message_schema",
    "list_conversations",
    "get_conversation",
    "get_conversation_overview",
    "update_conversation",
    "generate_dynamic_conversation_title",
    "edit_conversation_message",
    "delete_conversation",
    "batch_delete_conversations",
    "purge_all_conversations",
    "export_conversation",
]
