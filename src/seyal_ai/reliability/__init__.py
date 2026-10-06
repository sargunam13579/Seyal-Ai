"""
Seyal AI Reliability Package.

Provides offline fallback mode, deterministic local command processing,
and automatic connection recovery with exponential backoff.
"""

from seyal_ai.reliability.connection_recovery import ConnectionRecoveryManager, ConnectionState
from seyal_ai.reliability.offline import LocalCommandResult, OfflineModeManager

__all__ = [
    "OfflineModeManager",
    "LocalCommandResult",
    "ConnectionRecoveryManager",
    "ConnectionState",
]
