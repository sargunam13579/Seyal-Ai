"""Seyal AI API — User Knowledge & Rules Hub Endpoints.

Provides endpoints for:
1. User Knowledge Vault (Key-Values)
2. One-Time Reminders (Add, Fetch, Auto-remove on Complete)
3. Standing Rules & Watchers (Add, Fetch, Toggle, Delete)
"""

from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from seyal_ai.services.user_knowledge_service import user_knowledge_service

router = APIRouter(prefix="/user-hub", tags=["User Knowledge & Rules Hub"])


class KnowledgeItemRequest(BaseModel):
    key: str = Field(..., min_length=1)
    value: str


class AddReminderRequest(BaseModel):
    title: str = Field(..., min_length=1)
    target_time: Optional[str] = None
    notes: Optional[str] = ""


class StandingRuleRequest(BaseModel):
    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    description: Optional[str] = ""
    trigger_type: Optional[str] = "custom"
    active: bool = True


class ToggleRuleRequest(BaseModel):
    active: Optional[bool] = None


@router.get("")
async def get_full_hub() -> Dict[str, Any]:
    """Fetch the complete User Knowledge Hub state."""
    return user_knowledge_service.get_full_hub()


# -------------------------------------------------------------
# 1. User Knowledge Vault
# -------------------------------------------------------------
@router.get("/knowledge")
async def get_knowledge() -> Dict[str, str]:
    return user_knowledge_service.get_user_knowledge()


@router.post("/knowledge")
async def set_knowledge(req: KnowledgeItemRequest) -> Dict[str, str]:
    return user_knowledge_service.set_user_knowledge_item(req.key, req.value)


@router.delete("/knowledge/{key}")
async def delete_knowledge(key: str) -> Dict[str, str]:
    return user_knowledge_service.delete_user_knowledge_item(key)


# -------------------------------------------------------------
# 2. One-Time Reminders
# -------------------------------------------------------------
@router.get("/reminders")
async def get_reminders() -> list[Dict[str, Any]]:
    return user_knowledge_service.get_reminders()


@router.post("/reminders")
async def add_reminder(req: AddReminderRequest) -> Dict[str, Any]:
    return user_knowledge_service.add_reminder(
        title=req.title,
        target_time=req.target_time,
        notes=req.notes or "",
    )


@router.delete("/reminders/{reminder_id}")
async def complete_and_remove_reminder(reminder_id: str) -> Dict[str, Any]:
    removed = user_knowledge_service.complete_and_remove_reminder(reminder_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"status": "success", "removed_id": reminder_id}


# -------------------------------------------------------------
# 3. Standing Rules & Watchers
# -------------------------------------------------------------
@router.get("/standing-rules")
async def get_standing_rules() -> Dict[str, Dict[str, Any]]:
    return user_knowledge_service.get_standing_rules()


@router.post("/standing-rules")
async def add_or_update_standing_rule(req: StandingRuleRequest) -> Dict[str, Any]:
    return user_knowledge_service.add_or_update_standing_rule(
        rule_id=req.id,
        title=req.title,
        description=req.description or "",
        trigger_type=req.trigger_type or "custom",
        active=req.active,
    )


@router.put("/standing-rules/{rule_id}/toggle")
async def toggle_standing_rule(rule_id: str, req: Optional[ToggleRuleRequest] = None) -> Dict[str, Any]:
    active = req.active if req else None
    updated = user_knowledge_service.toggle_standing_rule(rule_id, active)
    if not updated:
        raise HTTPException(status_code=404, detail="Standing rule not found")
    return updated


@router.delete("/standing-rules/{rule_id}")
async def delete_standing_rule(rule_id: str) -> Dict[str, Any]:
    deleted = user_knowledge_service.delete_standing_rule(rule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Standing rule not found")
    return {"status": "success", "deleted_id": rule_id}
