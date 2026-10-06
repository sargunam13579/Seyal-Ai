"""
Seyal AI — Application Entry Point.

Initializes all subsystems and starts the appropriate interface:
  - API mode (default): FastAPI server with REST endpoints
  - CLI mode: Interactive terminal chat interface
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from seyal_ai.core.config import load_settings
from seyal_ai.database.engine import close_engine, init_engine
from seyal_ai.utils.logging import get_logger, setup_logging


async def _startup() -> None:
    """Initialize all Seyal AI subsystems."""
    # Load configuration
    settings = load_settings()

    # Setup logging
    log_file = settings.resolved_data_dir / "logs" / settings.log_file
    setup_logging(level=settings.log_level, log_file=log_file)

    log = get_logger("main")
    log.info("Starting Seyal AI v%s", settings.version)

    # Initialize database
    actual_db_url = f"sqlite+aiosqlite:///{settings.resolved_data_dir / 'seyal_ai.db'}"
    await init_engine(actual_db_url, echo=settings.database.echo)


async def _shutdown() -> None:
    """Clean up all Seyal AI subsystems."""
    log = get_logger("main")
    log.info("Shutting down Seyal AI...")
    await close_engine()
    log.info("Seyal AI stopped")


async def async_main_cli() -> None:
    """Async entry point for CLI mode."""
    try:
        await _startup()

        # Run the CLI interface
        from seyal_ai.cli import run_cli

        await run_cli()

    except KeyboardInterrupt:
        pass
    finally:
        await _shutdown()


def run_api_server() -> None:
    """Start the FastAPI server using uvicorn."""
    import uvicorn

    from seyal_ai.core.config import load_settings

    settings = load_settings()

    uvicorn.run(
        "seyal_ai.api.app:create_app",
        factory=True,
        host=settings.api.host,
        port=settings.api.port,
        log_level=settings.log_level.lower(),
        reload=False,
    )


def main() -> None:
    """Synchronous entry point (called from `seyal_ai` command)."""
    parser = argparse.ArgumentParser(
        prog="seyal_ai",
        description="Seyal AI — Voice-first, cross-device personal AI agent",
    )
    parser.add_argument(
        "--mode",
        choices=["api", "cli"],
        default="api",
        help="Run mode: 'api' starts the REST API server (default), 'cli' starts the interactive terminal.",
    )
    parser.add_argument(
        "--host",
        type=str,
        default=None,
        help="Override the API server host (e.g., '0.0.0.0').",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=None,
        help="Override the API server port (e.g., 8080).",
    )

    args = parser.parse_args()

    if args.mode == "cli":
        try:
            asyncio.run(async_main_cli())
        except KeyboardInterrupt:
            print("\nGoodbye!")
            sys.exit(0)
    else:
        # API mode
        import uvicorn

        from seyal_ai.core.config import load_settings

        settings = load_settings()

        host = args.host or settings.api.host
        port = args.port or settings.api.port

        from seyal_ai.api.app import create_app
        app = create_app()

        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level=settings.log_level.lower(),
            reload=False,
        )


if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    main()
