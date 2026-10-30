"""
Seyal AI Notification Endpoints.

Provides REST endpoints for:
- Fetching and clearing persistent in-app notification history.
- Real outbound webhook testing (Discord, Telegram, Slack, custom webhook).
- Event broadcasting from agents and automation schedules.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from seyal_ai.notifications.dispatcher import (
    clear_notification_history,
    dispatch_notification,
    load_notification_history,
    send_webhook_payload,
)

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


class TestWebhookRequest(BaseModel):
    webhook_url: str


class BroadcastNotificationRequest(BaseModel):
    title: str
    detail: str
    status: str = "info"  # "success" | "warning" | "error" | "info"
    webhook_url: str | None = None


@router.get("/history")
async def get_history(limit: int = 50) -> dict[str, Any]:
    """Retrieve recent notification events from local persistent history."""
    items = load_notification_history(limit=limit)
    return {"items": items}


@router.delete("/history")
async def delete_history() -> dict[str, Any]:
    """Clear all stored notification events."""
    clear_notification_history()
    return {"success": True, "message": "Notification history cleared."}


@router.post("/test-webhook")
async def test_webhook(req: TestWebhookRequest) -> dict[str, Any]:
    """Send an immediate test notification to an external webhook URL."""
    url = req.webhook_url.strip()
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid webhook URL. Must start with http:// or https://")

    payload = {
        "event": "test_notification",
        "app": "Seyal AI Autonomous Agent",
        "title": "Webhook Relay Connected",
        "detail": "Test notification verified from Seyal AI desktop engine.",
        "status": "success",
    }

    success, code, latency_ms, error = await send_webhook_payload(url, payload)
    return {
        "success": success,
        "statusCode": code,
        "latencyMs": latency_ms,
        "error": error,
        "message": "Webhook ping delivered successfully!" if success else f"Webhook delivery failed: {error}",
    }


@router.post("/broadcast")
async def broadcast_notification(req: BroadcastNotificationRequest) -> dict[str, Any]:
    """Dispatch an alert to local history and optional remote webhook."""
    result = await dispatch_notification(
        title=req.title,
        detail=req.detail,
        status=req.status,
        webhook_url=req.webhook_url,
    )
    return {"success": True, **result}
