"""
NEXUS API — Health Endpoint.

Provides system status, version, uptime, and subsystem health information.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Request

from nexus.api.schemas import HealthResponse
from nexus.utils.logging import get_logger

log = get_logger("api.health")

router = APIRouter(tags=["health"])


_last_db_check_time: float = 0.0
_last_db_status: str = "unknown"


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Local process liveness check",
    description="Instantaneous sub-millisecond local process check. Verifies the FastAPI server is running with zero DB/cloud blocking.",
)
async def health_check(request: Request) -> HealthResponse:
    """Return instantaneous local liveness status of NEXUS."""
    app = request.app
    start_time = getattr(app.state, "start_time", None) or time.time()
    uptime = time.time() - start_time

    brain = getattr(app.state, "brain", None)
    providers: list[str] = []
    tool_count = 0
    if brain is not None and getattr(brain, "is_initialized", False):
        router = getattr(brain, "_router", None)
        if router is not None:
            providers = list(getattr(router, "available_providers", []))
        tools = getattr(brain, "available_tools", [])
        tool_count = len(tools)

    settings = app.state.settings

    return HealthResponse(
        status="ok",
        version=settings.version,
        uptime_seconds=round(uptime, 2),
        llm_providers=providers,
        tool_count=tool_count,
        database_status=_last_db_status,
        environment=settings.log_level,
    )


@router.get(
    "/ready",
    summary="Subsystem readiness check",
    description="Inspects background subsystems (database, LLM, tools, memory) and returns detailed readiness status.",
)
async def ready_check(request: Request) -> dict:
    """Check deep subsystem readiness without blocking basic liveness."""
    global _last_db_check_time, _last_db_status
    app = request.app
    now = time.time()

    # Cached DB probe (max once every 30s)
    if now - _last_db_check_time > 30.0 or _last_db_status == "unknown":
        try:
            from nexus.database.engine import get_engine
            engine = get_engine()
            async with engine.connect() as conn:
                await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            _last_db_status = "connected"
        except Exception as e:
            _last_db_status = f"degraded: {e}"
        _last_db_check_time = now

    brain = getattr(app.state, "brain", None)
    brain_ready = False
    llm_providers: list[str] = []
    tools_count = 0

    if brain is not None and getattr(brain, "is_initialized", False):
        brain_ready = True
        router = getattr(brain, "_router", None)
        if router is not None:
            llm_providers = list(getattr(router, "available_providers", []))
        tools = getattr(brain, "available_tools", [])
        tools_count = len(tools)

    is_all_ready = _last_db_status == "connected" and brain_ready and len(llm_providers) > 0

    return {
        "status": "ready" if is_all_ready else "degraded",
        "subsystems": {
            "api_server": "ok",
            "database": _last_db_status,
            "brain": "ready" if brain_ready else "initializing",
            "llm_providers": llm_providers,
            "tools_count": tools_count,
        },
    }

