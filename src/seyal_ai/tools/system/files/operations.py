"""
Seyal AI File and Directory Manipulation Tools (Rename, Copy, Move, Mkdir).
"""

from __future__ import annotations

import shutil
from typing import Any

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.system.files.utils import _resolve_path


class RenameFileTool(BaseTool):
    """Rename a file or folder."""

    @property
    def name(self) -> str:
        return "rename_file"

    @property
    def description(self) -> str:
        return "Rename an existing file or directory."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "source_path": {
                    "type": "string",
                    "description": "Path to the file or directory to rename.",
                },
                "new_name": {
                    "type": "string",
                    "description": "New filename or full destination path.",
                },
            },
            "required": ["source_path", "new_name"],
        }

    @property
    def category(self) -> str:
        return "files"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, source_path: str = "", new_name: str = "", **kwargs: Any) -> ToolResult:
        src = _resolve_path(source_path)
        if not src.exists():
            return ToolResult.fail(f"Source '{src}' does not exist.")

        # Determine target path
        if "/" in new_name or "\\" in new_name:
            dst = _resolve_path(new_name)
        else:
            dst = src.parent / new_name

        if dst.exists():
            return ToolResult.fail(f"Destination '{dst}' already exists.")

        try:
            src.rename(dst)
            return ToolResult.ok(
                f"Successfully renamed '{src.name}' to '{dst.name}'",
                old_path=str(src),
                new_path=str(dst),
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to rename '{src}': {e}")


class CopyFileTool(BaseTool):
    """Copy a file or directory tree."""

    @property
    def name(self) -> str:
        return "copy_file"

    @property
    def description(self) -> str:
        return "Copy a file or directory to a new destination path."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "source_path": {
                    "type": "string",
                    "description": "Path to the file or directory to copy.",
                },
                "destination_path": {
                    "type": "string",
                    "description": "Destination directory or new target file path.",
                },
            },
            "required": ["source_path", "destination_path"],
        }

    @property
    def category(self) -> str:
        return "files"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self, source_path: str = "", destination_path: str = "", **kwargs: Any
    ) -> ToolResult:
        src = _resolve_path(source_path)
        dst = _resolve_path(destination_path)

        if not src.exists():
            return ToolResult.fail(f"Source '{src}' does not exist.")

        try:
            if src.is_dir():
                if dst.exists() and dst.is_dir():
                    dst = dst / src.name
                shutil.copytree(src, dst)
            else:
                if dst.is_dir():
                    dst = dst / src.name
                else:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)

            return ToolResult.ok(
                f"Successfully copied '{src.name}' to '{dst}'",
                source=str(src),
                destination=str(dst),
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to copy '{src}': {e}")


class MoveFileTool(BaseTool):
    """Move a file or directory."""

    @property
    def name(self) -> str:
        return "move_file"

    @property
    def description(self) -> str:
        return "Move a file or folder to a new destination path."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "source_path": {
                    "type": "string",
                    "description": "Path to the file or directory to move.",
                },
                "destination_path": {
                    "type": "string",
                    "description": "Destination directory or new target file path.",
                },
            },
            "required": ["source_path", "destination_path"],
        }

    @property
    def category(self) -> str:
        return "files"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self, source_path: str = "", destination_path: str = "", **kwargs: Any
    ) -> ToolResult:
        src = _resolve_path(source_path)
        dst = _resolve_path(destination_path)

        if not src.exists():
            return ToolResult.fail(f"Source '{src}' does not exist.")

        try:
            shutil.move(str(src), str(dst))
            return ToolResult.ok(
                f"Successfully moved '{src.name}' to '{dst}'", source=str(src), destination=str(dst)
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to move '{src}': {e}")


class CreateFolderTool(BaseTool):
    """Create a new directory."""

    @property
    def name(self) -> str:
        return "create_folder"

    @property
    def description(self) -> str:
        return "Create a new folder or nested directory structure."

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path of the folder to create.",
                },
            },
            "required": ["path"],
        }

    @property
    def category(self) -> str:
        return "files"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, path: str = "", **kwargs: Any) -> ToolResult:
        folder_path = _resolve_path(path)
        if folder_path.exists():
            return ToolResult.ok(f"Folder '{folder_path}' already exists.", path=str(folder_path))

        try:
            folder_path.mkdir(parents=True, exist_ok=True)
            return ToolResult.ok(
                f"Successfully created folder '{folder_path}'", path=str(folder_path)
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to create folder '{path}': {e}")
