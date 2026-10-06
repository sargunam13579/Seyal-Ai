"""
Seyal AI API — FastAPI Application Factory.

Creates and configures the FastAPI application with all middleware, routes,
and lifespan management (startup/shutdown).
"""

from __future__ import annotations

import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from seyal_ai.api.middleware import ErrorHandlerMiddleware, RequestIdMiddleware
from seyal_ai.api.routes import (
    accessibility_api,
    auth,
    automation,
    awareness_api,
    browser,
    chat,
    computer_use,
    conversations,
    devices,
    health,
    identity,
    laptop,
    memory,
    pairing_api,
    permissions_api,
    profile,
    tasks,
    user_hub,
    vision,
    voice,
)
from seyal_ai.core.brain import SeyalAiBrain
from seyal_ai.core.config import SeyalAiSettings, load_settings
from seyal_ai.database.engine import close_engine, init_engine
from seyal_ai.utils.logging import get_logger, setup_logging

log = get_logger("api.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Manage application startup and shutdown.

    On startup:
      1. Load settings
      2. Set up logging
      3. Initialize the database
      4. Initialize the AI Brain

    On shutdown:
      1. Close the database engine
    """
    # --- STARTUP ---
    settings: SeyalAiSettings = app.state.settings
    app.state.start_time = time.time()

    # Setup logging
    log_file = settings.resolved_data_dir / "logs" / settings.log_file
    setup_logging(level=settings.log_level, log_file=log_file)

    log.info("Starting Seyal AI API v%s", settings.version)

    # Initialize database
    local_db_url = f"sqlite+aiosqlite:///{settings.resolved_data_dir / 'seyal_ai.db'}"
    cloud_db_url = settings.database_url if ("postgres" in (settings.database_url or "")) else None
    await init_engine(db_url=local_db_url, cloud_url=cloud_db_url, echo=settings.database.echo)

    # Start background database sync manager
    from seyal_ai.database.sync import sync_manager
    await sync_manager.start()

    # Initialize the AI Brain
    brain = SeyalAiBrain(settings)
    app.state.brain = brain

    try:
        await brain.initialize()
        log.info(
            "Seyal AI Brain ready — %d tools, providers: %s",
            len(brain.available_tools),
            ", ".join(brain._router.available_providers) or "none",
        )
    except Exception as e:
        log.warning(
            "Brain initialization incomplete: %s. API will run with limited capabilities.",
            e,
        )

    log.info(
        "Seyal AI API listening on http://%s:%d",
        settings.api.host,
        settings.api.port,
    )

    yield

    # --- SHUTDOWN ---
    log.info("Shutting down Seyal AI API...")
    from seyal_ai.database.sync import sync_manager
    await sync_manager.stop()
    await close_engine()
    log.info("Seyal AI API stopped")


def create_app(settings: SeyalAiSettings | None = None) -> FastAPI:
    """
    Create and configure the FastAPI application.

    Args:
        settings: Optional pre-loaded settings. If None, loads from config files.

    Returns:
        A fully configured FastAPI application.
    """
    if settings is None:
        settings = load_settings()

    # Ensure data directories exist
    settings.ensure_data_dirs()

    app = FastAPI(
        title="Seyal AI API",
        description="Voice-first, cross-device personal AI agent — REST API",
        version=settings.version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Store settings on app state for access in routes
    app.state.settings = settings
    app.state.debug = settings.log_level.upper() == "DEBUG"

    # --- Middleware (order matters: last added = first executed) ---
    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.api.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Error handler
    app.add_middleware(ErrorHandlerMiddleware)

    # Request ID and timing
    app.add_middleware(RequestIdMiddleware)

    # --- Routes ---
    prefix = settings.api.api_prefix

    app.include_router(health.router, prefix=prefix)
    app.include_router(auth.router, prefix=prefix)
    app.include_router(profile.router, prefix=prefix)
    app.include_router(chat.router, prefix=prefix)
    app.include_router(conversations.router, prefix=prefix)
    app.include_router(voice.router, prefix=prefix)
    app.include_router(identity.router, prefix=prefix)
    app.include_router(identity.wake_router, prefix=prefix)
    app.include_router(laptop.router, prefix=prefix)
    app.include_router(vision.router, prefix=prefix)
    app.include_router(browser.router, prefix=prefix)
    app.include_router(automation.router, prefix=prefix)
    app.include_router(memory.router, prefix=prefix)
    app.include_router(devices.router, prefix=prefix)
    app.include_router(tasks.router, prefix=prefix)
    app.include_router(permissions_api.router, prefix=prefix)
    app.include_router(pairing_api.router, prefix=prefix)
    app.include_router(accessibility_api.router, prefix=prefix)
    app.include_router(computer_use.router, prefix=prefix)
    app.include_router(awareness_api.router, prefix=prefix)
    app.include_router(user_hub.router, prefix=prefix)

    # Root redirect to docs
    @app.get("/", include_in_schema=False)
    async def root() -> JSONResponse:
        return JSONResponse(
            content={
                "name": "Seyal AI API",
                "version": settings.version,
                "docs": "/docs",
                "health": f"{prefix}/health",
            }
        )

    return app
