"""
Seyal AI Notification & Webhook Dispatcher.

Handles outbound webhook notifications (Discord, Telegram, Slack, custom HTTP endpoints),
mobile push forwarding, and local notification event history persistence.
"""

from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
import uuid

import httpx

from seyal_ai.core.config import get_settings
from seyal_ai.utils.logging import get_logger

log = get_logger("notifications.dispatcher")


def _get_history_file() -> Path:
    settings = get_settings()
    return settings.resolved_data_dir / "notification_history.json"


def load_notification_history(limit: int = 50) -> list[dict[str, Any]]:
    """Load recent notification events from local persistent storage."""
    fp = _get_history_file()
    if not fp.exists():
        return []
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        items = data.get("items", [])
        return items[-limit:]
    except Exception as e:
        log.debug("Notice reading notification history: %s", e)
        return []


def save_notification_event(event: dict[str, Any]) -> None:
    """Save a notification event to persistent history (keeps last 100)."""
    fp = _get_history_file()
    fp.parent.mkdir(parents=True, exist_ok=True)
    history = load_notification_history(100)
    history.append(event)
    history = history[-100:]  # Keep latest 100
    try:
        fp.write_text(json.dumps({"items": history}, indent=2), encoding="utf-8")
    except Exception as e:
        log.debug("Notice saving notification event: %s", e)


def clear_notification_history() -> None:
    """Clear local notification history."""
    fp = _get_history_file()
    if fp.exists():
        try:
            fp.write_text('{"items": []}', encoding="utf-8")
        except Exception:
            pass


async def send_webhook_payload(webhook_url: str, payload: dict[str, Any]) -> tuple[bool, int, float, str]:
    """
    POST notification payload to external webhook URL.
    Returns (success, status_code, latency_ms, error_message).
    """
    t0 = time.perf_counter()
    try:
        # Determine format based on destination service
        body: dict[str, Any]
        if "discord.com" in webhook_url:
            body = {
                "content": f"**[Seyal AI]** {payload.get('title', 'Notification')}\n{payload.get('detail', '')}",
            }
        elif "telegram.org" in webhook_url:
            body = {
                "text": f"🤖 *Seyal AI Notification*\n\n*{payload.get('title')}*\n{payload.get('detail')}",
                "parse_mode": "Markdown",
            }
        elif "slack.com" in webhook_url:
            body = {
                "text": f"*:robot_face: Seyal AI:* *{payload.get('title')}*\n{payload.get('detail')}",
            }
        else:
            body = payload

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.post(webhook_url, json=body)
            latency_ms = round((time.perf_counter() - t0) * 1000, 1)
            if 200 <= resp.status_code < 300:
                return True, resp.status_code, latency_ms, ""
            return False, resp.status_code, latency_ms, f"HTTP Error {resp.status_code}: {resp.text[:150]}"
    except Exception as e:
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        return False, 0, latency_ms, str(e)


async def dispatch_notification(
    title: str,
    detail: str,
    status: str = "info",  # "success" | "warning" | "error" | "info"
    webhook_url: str | None = None,
) -> dict[str, Any]:
    """Record event in local history and forward to webhook if provided."""
    now_iso = datetime.now(UTC).strftime("%H:%M:%S")
    event_id = str(uuid.uuid4())[:8]

    event = {
        "id": event_id,
        "title": title,
        "detail": detail,
        "timestamp": now_iso,
        "status": status,
    }

    save_notification_event(event)

    webhook_result = None
    if webhook_url and webhook_url.strip():
        payload = {
            "app": "Seyal AI Desktop",
            "event_id": event_id,
            "title": title,
            "detail": detail,
            "status": status,
            "timestamp": now_iso,
        }
        success, code, lat, err = await send_webhook_payload(webhook_url.strip(), payload)
        webhook_result = {"delivered": success, "status_code": code, "latency_ms": lat, "error": err}

    return {
        "event": event,
        "webhook": webhook_result,
    }
