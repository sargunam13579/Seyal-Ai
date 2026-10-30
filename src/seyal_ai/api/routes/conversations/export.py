"""Seyal AI — Conversation Export Handler."""

from __future__ import annotations

import json
from fastapi import HTTPException, Query, Response

from seyal_ai.database.engine import get_session
from seyal_ai.database.repositories.conversation import ConversationRepository
from seyal_ai.utils.logging import get_logger

log = get_logger("api.conversations.export")


async def export_conversation(
    conversation_id: str,
    format: str = Query("markdown", description="Export format: markdown, json, or text"),
) -> Response:
    """Export conversation transcript in Markdown, JSON, or Plain Text format."""
    format_clean = format.lower().strip()
    if format_clean not in ("markdown", "json", "text"):
        format_clean = "markdown"

    try:
        async with get_session() as session:
            repo = ConversationRepository(session)
            conv = await repo.get_conversation(conversation_id)
            if not conv:
                raise HTTPException(status_code=404, detail=f"Conversation '{conversation_id}' not found.")

            clean_title = (conv.summary or "Seyal_AI_Conversation").replace("[Computer-Use]", "").strip()
            safe_filename = "".join(c if c.isalnum() or c in "-_" else "_" for c in clean_title) or "conversation"

            if format_clean == "json":
                data = {
                    "id": conv.id,
                    "title": clean_title,
                    "created_at": conv.created_at.isoformat() if conv.created_at else None,
                    "messages": [
                        {
                            "id": m.id,
                            "role": m.role,
                            "content": m.content,
                            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                            "model_used": getattr(m, "model_used", None),
                            "latency_ms": getattr(m, "latency_ms", None),
                            "tool_calls": [
                                {
                                    "name": tc.tool_name,
                                    "parameters": tc.parameters,
                                    "success": tc.results[0].success if getattr(tc, "results", None) else True,
                                    "result": (
                                        tc.results[0].result_data.get("output")
                                        if getattr(tc, "results", None) and isinstance(tc.results[0].result_data, dict)
                                        else None
                                    ),
                                }
                                for tc in (getattr(m, "tool_calls", []) or [])
                            ],
                        }
                        for m in (conv.messages or [])
                    ],
                }
                return Response(
                    content=json.dumps(data, indent=2, ensure_ascii=False),
                    media_type="application/json; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{safe_filename}.json"'},
                )

            if format_clean == "text":
                lines = [
                    f"Seyal AI Conversation: {clean_title}",
                    f"ID: {conv.id}",
                    f"Date: {conv.created_at}",
                    "=" * 60,
                    "",
                ]
                for m in (conv.messages or []):
                    role_label = "User" if m.role == "user" else "Seyal AI"
                    lines.append(f"[{role_label}] - {m.timestamp}")
                    lines.append(m.content)
                    lines.append("")
                    for tc in (getattr(m, "tool_calls", []) or []):
                        lines.append(f"  [Tool Executed]: {tc.tool_name}")
                    lines.append("-" * 40)
                    lines.append("")
                return Response(
                    content="\n".join(lines),
                    media_type="text/plain; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{safe_filename}.txt"'},
                )

            # Default: Markdown
            md_lines = [
                f"# {clean_title}",
                f"> *Exported from Seyal AI*",
                f"> *Session ID*: `{conv.id}` | *Created*: {conv.created_at}",
                "",
                "---",
                "",
            ]
            for m in (conv.messages or []):
                time_str = m.timestamp.strftime("%Y-%m-%d %H:%M:%S") if m.timestamp else ""
                if m.role == "user":
                    md_lines.append(f"### 👤 User (*{time_str}*)\n")
                    md_lines.append(f"{m.content}\n")
                else:
                    model_info = f" | Model: `{m.model_used}`" if getattr(m, "model_used", None) else ""
                    latency_info = f" | Latency: `{m.latency_ms}ms`" if getattr(m, "latency_ms", None) else ""
                    md_lines.append(f"### 🤖 Seyal AI (*{time_str}*{model_info}{latency_info})\n")
                    md_lines.append(f"{m.content}\n")
                    for tc in (getattr(m, "tool_calls", []) or []):
                        md_lines.append(f"> 🛠️ **Tool Executed**: `{tc.tool_name}`")
                        if tc.parameters:
                            md_lines.append(f"> *Arguments*: `{tc.parameters}`")
                        if getattr(tc, "results", None):
                            r = tc.results[0]
                            res_val = r.result_data.get("output") if isinstance(r.result_data, dict) else str(r.result_data)
                            if res_val:
                                snippet = str(res_val)[:300] + ("..." if len(str(res_val)) > 300 else "")
                                md_lines.append(f"> *Result*: `{snippet}`")
                        md_lines.append("")
                md_lines.append("---\n")

            return Response(
                content="\n".join(md_lines),
                media_type="text/markdown; charset=utf-8",
                headers={"Content-Disposition": f'attachment; filename="{safe_filename}.md"'},
            )
    except HTTPException:
        raise
    except Exception as err:
        log.error("Failed to export conversation %s: %s", conversation_id, err)
        raise HTTPException(status_code=500, detail=str(err)) from err
