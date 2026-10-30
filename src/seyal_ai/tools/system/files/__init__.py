"""
Seyal AI File Operations Tools Package.

Provides modularized file management capabilities:
- search: SearchFilesTool
- read_write: CreateFileTool, ReadFileTool, EditFileTool
- operations: RenameFileTool, CopyFileTool, MoveFileTool, CreateFolderTool
- delete: DeletePathTool
- archive: CompressFilesTool, ExtractArchiveTool
- utils: _resolve_path, _format_size
"""

from __future__ import annotations

from seyal_ai.tools.system.files.archive import CompressFilesTool, ExtractArchiveTool
from seyal_ai.tools.system.files.delete import DeletePathTool
from seyal_ai.tools.system.files.operations import (
    CopyFileTool,
    CreateFolderTool,
    MoveFileTool,
    RenameFileTool,
)
from seyal_ai.tools.system.files.read_write import (
    CreateFileTool,
    EditFileTool,
    ReadFileTool,
)
from seyal_ai.tools.system.files.search import SearchFilesTool
from seyal_ai.tools.system.files.utils import _format_size, _resolve_path

__all__ = [
    "CompressFilesTool",
    "CopyFileTool",
    "CreateFileTool",
    "CreateFolderTool",
    "DeletePathTool",
    "EditFileTool",
    "ExtractArchiveTool",
    "MoveFileTool",
    "ReadFileTool",
    "RenameFileTool",
    "SearchFilesTool",
    "_format_size",
    "_resolve_path",
]
