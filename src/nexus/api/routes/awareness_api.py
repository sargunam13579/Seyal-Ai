"""
NEXUS API — Computer Awareness Endpoints.

Provides REST endpoints to query and trigger live system awareness introspection
for the user's laptop (installed apps, running processes, open windows, files, and system diagnostics).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from nexus.services.awareness import get_awareness_service
from nexus.utils.logging import get_logger

log = get_logger("api.routes.awareness")

router = APIRouter(prefix="/system/awareness", tags=["System Awareness"])


@router.get("", summary="Get current laptop awareness state")
async def get_laptop_awareness() -> dict[str, Any]:
    """Retrieve the cached or live laptop awareness state."""
    service = get_awareness_service()
    data = await run_in_threadpool(service.get_cached_awareness)
    return {"success": True, "data": data}


@router.post("/scan", summary="Trigger immediate laptop awareness scan")
async def scan_laptop_awareness() -> dict[str, Any]:
    """Perform a live scan of the laptop environment and update cache."""
    service = get_awareness_service()
    data = await run_in_threadpool(service.scan_all_awareness)
    return {"success": True, "data": data}


@router.get("/live", summary="Get fast live telemetry snapshot")
async def get_live_telemetry() -> dict[str, Any]:
    """Retrieve lightweight dynamic data (windows, active window, running apps, battery, ram) without blocking event loop."""
    service = get_awareness_service()
    data = await run_in_threadpool(service.get_live_telemetry)
    return {"success": True, "data": data}


@router.get("/active-window", summary="Get currently focused window")
async def get_active_window() -> dict[str, Any]:
    """Retrieve current foreground window title in < 1ms."""
    service = get_awareness_service()
    data = await run_in_threadpool(service.get_active_window)
    return {"success": True, "data": data}

