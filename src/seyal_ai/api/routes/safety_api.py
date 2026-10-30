"""
Seyal AI API — Safety Guardrails Routes.

REST endpoints for inspecting and configuring safety policies,
blacklisted directories, safe workspaces, and protected applications.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from seyal_ai.security.guardrails import (
    SafetySettings,
    get_safety_guardrails,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("api.safety")

router = APIRouter(prefix="/safety", tags=["safety"])


@router.get("", response_model=SafetySettings, summary="Get safety guardrails settings")
async def get_safety_settings() -> SafetySettings:
    """Retrieve current safety guardrails configuration."""
    guardrails = get_safety_guardrails()
    return guardrails.get_settings()


@router.put("", response_model=SafetySettings, summary="Update safety guardrails settings")
async def update_safety_settings(settings: SafetySettings) -> SafetySettings:
    """Update safety guardrails configuration and boundaries."""
    guardrails = get_safety_guardrails()
    updated = guardrails.update_settings(settings)
    log.info("Updated safety settings via API: profile=%s", updated.profile)
    return updated
