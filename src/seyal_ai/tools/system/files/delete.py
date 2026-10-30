"""
Seyal AI File and Directory Deletion Tool (HIGH RISK).
"""

from __future__ import annotations

import contextlib
import os
import shutil
from pathlib import Path
from typing import Any

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.system.files.utils import _format_size, _resolve_path


class DeletePathTool(BaseTool):
    """
    Delete a file or folder.

    HIGH RISK ACTION. Calculates target stats (size and child file count)
    and requires explicit confirmation.
    """

    @property
    def name(self) -> str:
        return "delete_path"

    @property
    def description(self) -> str:
        return (
            "Delete a file or folder on the laptop. HIGH RISK ACTION: Shows what will be deleted "
            "and requires explicit user confirmation before executing."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path of the file or folder to delete.",
                },
                "confirmed": {
                    "type": "boolean",
                    "description": "Confirmation flag. If false, returns summary of target items to confirm.",
                },
            },
            "required": ["path"],
        }

    @property
    def category(self) -> str:
        return "files"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.HIGH

    @property
    def requires_confirmation(self) -> bool:
        return True

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    def calculate_target_info(self, target: Path) -> dict[str, Any]:
        """Calculate statistics of what will be deleted."""
        if not target.exists():
            return {"exists": False}

        if (
            target.parent == target
            or str(target).rstrip("\\/").lower() in ("c:", "c:\\", "c:/", "/", "\\")
            or target == Path(target.anchor)
        ):
            return {
                "exists": True,
                "is_dir": True,
                "name": str(target),
                "path": str(target),
                "is_root": True,
                "total_files": 0,
                "total_subdirs": 0,
                "total_bytes": 0,
                "formatted_size": "unknown",
                "sample_files": [],
            }

        if target.is_file():
            size = target.stat().st_size
            return {
                "exists": True,
                "is_dir": False,
                "name": target.name,
                "path": str(target),
                "total_files": 1,
                "total_bytes": size,
                "formatted_size": _format_size(size),
            }

        # Directory calculation
        total_files = 0
        total_dirs = 0
        total_bytes = 0
        preview_files: list[str] = []

        for root, dirs, files in os.walk(target):
            total_dirs += len(dirs)
            total_files += len(files)
            for f in files:
                fp = Path(root) / f
                with contextlib.suppress(OSError):
                    total_bytes += fp.stat().st_size
                if len(preview_files) < 5:
                    preview_files.append(f)

        return {
            "exists": True,
            "is_dir": True,
            "name": target.name,
            "path": str(target),
            "total_files": total_files,
            "total_subdirs": total_dirs,
            "total_bytes": total_bytes,
            "formatted_size": _format_size(total_bytes),
            "sample_files": preview_files,
        }

    async def execute(self, path: str = "", confirmed: bool = False, **kwargs: Any) -> ToolResult:
        target = _resolve_path(path)
        if not target.exists():
            return ToolResult.fail(f"Target '{target}' does not exist.")

        # Safety boundary: never allow deleting system root or drive root
        if (
            target.parent == target
            or str(target).rstrip("\\/").lower() in ("c:", "c:\\", "c:/", "/", "\\")
            or target == Path(target.anchor)
        ):
            return ToolResult.fail(f"Safety violation: Refusing to delete root drive '{target}'.")

        info = self.calculate_target_info(target)

        if not confirmed:
            return ToolResult.fail(
                f"Deletion of '{target}' requires explicit confirmation (confirmed=True). "
                f"Target contains {info.get('total_files', 1)} files ({info.get('formatted_size', 'unknown')}).",
                requires_confirmation=True,
                **info,
            )

        try:
            moved_to_recycle_bin = False
            try:
                import importlib

                s2t: Any = importlib.import_module("send2trash")
                s2t.send2trash(str(target))
                moved_to_recycle_bin = True
            except Exception:
                import platform

                if platform.system() == "Windows":
                    try:
                        import subprocess

                        escaped_p = str(target).replace("'", "''")
                        action_type = "DeleteDirectory" if target.is_dir() else "DeleteFile"
                        ps_cmd = (
                            f"Add-Type -AssemblyName Microsoft.VisualBasic; "
                            f"[Microsoft.VisualBasic.FileIO.FileSystem]::{action_type}('{escaped_p}', 'OnlyErrorDialogs', 'SendToRecycleBin')"
                        )
                        res = subprocess.run(
                            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
                            capture_output=True,
                            timeout=10,
                        )
                        if res.returncode == 0 and not target.exists():
                            moved_to_recycle_bin = True
                    except Exception:
                        pass

            if not moved_to_recycle_bin:
                if target.is_dir():
                    shutil.rmtree(target)
                else:
                    target.unlink()

            bin_status = "moved to Windows Recycle Bin" if moved_to_recycle_bin else "permanently deleted"
            target_type = "folder" if info.get("is_dir") else "file"
            return ToolResult.ok(
                f"Successfully {bin_status}: {target_type} '{target.name}' ({info.get('formatted_size')}).",
                deleted_path=str(target),
                recycled=moved_to_recycle_bin,
                **info,
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to delete '{target}': {e}")
