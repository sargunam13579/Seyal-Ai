"""
Seyal AI System Maintenance & Storage Cleanup API.

Provides real endpoints for:
- Calculating live disk storage footprint across vision captures, databases, audio, and logs.
- Executing real storage cleanup (deleting temporary vision frames, audio recordings, log rotation).
- Physical SQLite database optimization via VACUUM.
- Granular data purges (conversation history, user knowledge vault).
- Complete Factory Nuclear Reset restoring initial runtime state.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from seyal_ai.core.config import get_settings
from seyal_ai.database.engine import get_session
from seyal_ai.database.models import (
    AuditLog,
    Conversation,
    Message,
    Session,
    ToolCall,
    ToolResult,
)
from seyal_ai.services.user_knowledge_service import user_knowledge_service
from seyal_ai.utils.logging import get_logger

log = get_logger("api.system_maintenance")

router = APIRouter(prefix="/system", tags=["System Maintenance & Storage"])


class CleanStorageRequest(BaseModel):
    type: str = "all"  # "vision" | "audio" | "logs" | "vacuum" | "all"


class FactoryResetRequest(BaseModel):
    confirm_nuclear: bool = False


def _get_dir_size_mb(path: Path) -> float:
    """Calculate total size of directory in megabytes."""
    if not path.exists():
        return 0.0
    total_bytes = 0
    try:
        if path.is_file():
            total_bytes = path.stat().st_size
        else:
            for root, _, files in os.walk(path):
                for f in files:
                    fp = Path(root) / f
                    try:
                        total_bytes += fp.stat().st_size
                    except OSError:
                        pass
    except OSError:
        pass
    return round(total_bytes / (1024 * 1024), 2)


def _delete_files_in_dir(path: Path, patterns: list[str]) -> float:
    """Delete files matching patterns and return megabytes freed."""
    if not path.exists():
        return 0.0
    freed_bytes = 0
    for pat in patterns:
        for fp in path.glob(pat):
            try:
                if fp.is_file():
                    size = fp.stat().st_size
                    fp.unlink(missing_ok=True)
                    freed_bytes += size
            except OSError:
                pass
    return round(freed_bytes / (1024 * 1024), 2)


@router.get("/storage/stats")
async def get_storage_stats() -> dict[str, Any]:
    """Calculate real live storage footprint across disk directories."""
    settings = get_settings()
    data_dir = settings.resolved_data_dir

    vision_dir = data_dir / "captures"
    audio_dir = data_dir / "audio"
    logs_dir = data_dir / "logs"
    db_file = data_dir / "seyal_ai.db"
    mem_file = data_dir / "seyal_memory.json"

    vision_size = _get_dir_size_mb(vision_dir)
    audio_size = _get_dir_size_mb(audio_dir)
    logs_size = _get_dir_size_mb(logs_dir)
    db_size = _get_dir_size_mb(db_file) + _get_dir_size_mb(mem_file)

    total_used = round(vision_size + audio_size + logs_size + db_size, 2)
    reclaimable = round(vision_size + audio_size + max(0.0, logs_size - 1.0), 2)

    return {
        "storagePath": str(data_dir),
        "visionSize": vision_size,
        "vectorSize": db_size,
        "audioSize": audio_size,
        "logsSize": logs_size,
        "totalUsedMb": total_used,
        "reclaimableMb": reclaimable,
    }


@router.post("/storage/clean")
async def clean_storage(req: CleanStorageRequest) -> dict[str, Any]:
    """Execute real file cleanup and optional SQLite VACUUM."""
    settings = get_settings()
    data_dir = settings.resolved_data_dir
    target = req.type.lower()
    freed_mb = 0.0
    vacuumed = False

    vision_dir = data_dir / "captures"
    audio_dir = data_dir / "audio"
    logs_dir = data_dir / "logs"

    if target in ("vision", "all"):
        freed = _delete_files_in_dir(vision_dir, ["*.png", "*.jpg", "*.jpeg", "*.webp"])
        freed_mb += freed

    if target in ("audio", "all"):
        freed = _delete_files_in_dir(audio_dir, ["*.wav", "*.mp3", "*.ogg"])
        freed_mb += freed

    if target in ("logs", "all"):
        # Truncate logs larger than 50KB to preserve headers while reclaiming space
        if logs_dir.exists():
            for log_file in logs_dir.glob("*.log"):
                try:
                    if log_file.stat().st_size > 50 * 1024:
                        freed_mb += round((log_file.stat().st_size - 20 * 1024) / (1024 * 1024), 2)
                        lines = log_file.read_text(encoding="utf-8", errors="ignore").splitlines()
                        truncated = "\n".join(lines[-200:])  # Keep last 200 lines
                        log_file.write_text(f"[LOG ROTATED & TRUNCATED]\n{truncated}", encoding="utf-8")
                except OSError:
                    pass

    if target in ("vacuum", "all"):
        try:
            async with get_session() as session:
                await session.execute(text("VACUUM"))
            vacuumed = True
            log.info("Executed SQLite VACUUM successfully.")
        except Exception as e:
            log.warning("Notice during SQLite VACUUM: %s", e)

    return {
        "success": True,
        "freedMb": round(freed_mb, 2),
        "vacuumed": vacuumed,
        "target": target,
    }


@router.post("/data/purge-conversations")
async def purge_conversations() -> dict[str, Any]:
    """Purge all conversation history and messages from SQLite database."""
    try:
        async with get_session() as session:
            await session.execute(text("DELETE FROM messages"))
            await session.execute(text("DELETE FROM tool_results"))
            await session.execute(text("DELETE FROM tool_calls"))
            await session.execute(text("DELETE FROM conversations"))
            await session.commit()
            await session.execute(text("VACUUM"))

        log.info("Purged all local conversations and messages.")
        return {"success": True, "message": "All local conversations purged successfully."}
    except Exception as e:
        log.error("Failed to purge conversations: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/data/wipe-knowledge")
async def wipe_knowledge() -> dict[str, Any]:
    """Wipe all user knowledge vault facts and standing rules."""
    try:
        user_knowledge_service.wipe_all()
        log.info("Wiped User Knowledge Vault & Rules.")
        return {"success": True, "message": "User Knowledge Vault wiped successfully."}
    except Exception as e:
        log.error("Failed to wipe knowledge vault: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/data/factory-reset")
async def factory_reset(req: FactoryResetRequest) -> dict[str, Any]:
    """Execute complete factory nuclear wipe, resetting database, memory, and caches."""
    if not req.confirm_nuclear:
        raise HTTPException(status_code=400, detail="Factory reset requires confirm_nuclear=True")

    settings = get_settings()
    data_dir = settings.resolved_data_dir

    try:
        # 1. Purge all tables in SQLite
        async with get_session() as session:
            for tbl in ("tool_results", "tool_calls", "messages", "conversations", "sessions", "audit_logs"):
                try:
                    await session.execute(text(f"DELETE FROM {tbl}"))
                except Exception:
                    pass
            await session.commit()
            try:
                await session.execute(text("VACUUM"))
            except Exception:
                pass

        # 2. Reset Knowledge Hub
        user_knowledge_service.wipe_all()

        # 3. Reset Memory JSON
        mem_file = data_dir / "seyal_memory.json"
        if mem_file.exists():
            mem_file.write_text('{"version": "1.0", "total": 0, "records": []}', encoding="utf-8")

        # 4. Reset Automations JSON
        auto_file = data_dir / "automations.json"
        if auto_file.exists():
            auto_file.write_text('{"routines": []}', encoding="utf-8")

        # 5. Clear media and caches
        _delete_files_in_dir(data_dir / "captures", ["*.*"])
        _delete_files_in_dir(data_dir / "audio", ["*.*"])

        log.warning("FACTORY NUCLEAR RESET EXECUTED: All runtime data restored to initial state.")
        return {"success": True, "message": "Factory reset executed successfully. System restored to clean state."}
    except Exception as e:
        log.error("Factory reset failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
