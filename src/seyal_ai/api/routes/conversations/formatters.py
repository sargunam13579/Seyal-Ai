"""Seyal AI — Conversation Message Formatters."""

from __future__ import annotations

from typing import Any
from seyal_ai.api.schemas import MessageSchema, ToolCallInfo


def _format_message_schema(msg: Any) -> MessageSchema:
    """Helper to convert ORM Message with ToolCalls to MessageSchema."""
    t_calls = []
    for tc in getattr(msg, "tool_calls", []) or []:
        res_str = None
        suc = True
        if getattr(tc, "results", None):
            r = tc.results[0]
            suc = r.success
            res_str = (
                r.result_data.get("output")
                if isinstance(r.result_data, dict)
                else str(r.result_data)
            )
        t_calls.append(
            ToolCallInfo(
                name=tc.tool_name,
                arguments=tc.parameters or {},
                result=res_str,
                success=suc,
            )
        )
    return MessageSchema(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        timestamp=msg.timestamp,
        model_used=getattr(msg, "model_used", None),
        latency_ms=getattr(msg, "latency_ms", None),
        tool_calls=t_calls,
    )
