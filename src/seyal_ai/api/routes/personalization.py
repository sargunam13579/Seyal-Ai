"""
Seyal AI API — Personalization Routes.

REST endpoints for inspecting and updating user communication tone,
custom prompt instructions, and output preferences.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from seyal_ai.personalization import (
    PersonalizationConfig,
    get_personalization_manager,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("api.personalization")

router = APIRouter(prefix="/personalization", tags=["personalization"])


@router.get("", response_model=PersonalizationConfig, summary="Get personalization settings")
async def get_personalization() -> PersonalizationConfig:
    """Retrieve current personalization configuration including tone and custom instructions."""
    manager = get_personalization_manager()
    return manager.get_config()


@router.put("", response_model=PersonalizationConfig, summary="Update personalization settings")
async def update_personalization(
    config: PersonalizationConfig,
    request: Request,
) -> PersonalizationConfig:
    """Update personalization configuration and dynamically refresh system prompt."""
    manager = get_personalization_manager()
    updated = manager.update_config(config)

    # Dynamically refresh Brain's system prompt if brain is active
    brain = getattr(request.app.state, "brain", None)
    if brain and hasattr(brain, "_refresh_system_prompt"):
        try:
            brain._refresh_system_prompt()
            log.info("Refreshed Brain system prompt with updated personalization.")
        except Exception as err:
            log.warning("Could not refresh system prompt: %s", err)

    return updated
