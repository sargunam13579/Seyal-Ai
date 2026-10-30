"""Seyal AI Platform Database Layer.

Canonical location for all database infrastructure, ORM models,
session management, and data synchronization.
"""

from seyal_ai.platform.database.engine import (
    close_engine,
    get_cloud_engine,
    get_cloud_session,
    get_engine,
    get_session,
    init_engine,
    is_cloud_configured,
)
from seyal_ai.platform.database.models import (
    AuditLog,
    Base,
    Conversation,
    Device,
    DeviceState,
    MemoryEntry,
    Message,
    PermissionRule,
    Preference,
    Session,
    SyncOutbox,
    ToolCall,
    ToolResult,
    User,
)
from seyal_ai.platform.database.sync import DatabaseSyncManager, sync_manager

__all__ = [
    # Engine
    "init_engine",
    "close_engine",
    "get_engine",
    "get_session",
    "is_cloud_configured",
    "get_cloud_engine",
    "get_cloud_session",
    # Models
    "Base",
    "User",
    "Session",
    "Conversation",
    "Message",
    "ToolCall",
    "ToolResult",
    "SyncOutbox",
    "AuditLog",
    "Device",
    "DeviceState",
    "MemoryEntry",
    "PermissionRule",
    "Preference",
    # Sync
    "DatabaseSyncManager",
    "sync_manager",
]
