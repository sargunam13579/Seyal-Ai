"""
Seyal AI File System Utility Functions.
"""

from __future__ import annotations

from pathlib import Path


def _resolve_path(raw_path: str) -> Path:
    """Safely resolve user path with home expansion."""
    return Path(raw_path.strip()).expanduser().resolve()


def _format_size(bytes_size: int | float) -> str:
    """Format byte size into human readable string."""
    size = float(bytes_size)
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"
