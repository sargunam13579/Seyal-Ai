"""
Seyal AI Archive Compression and Extraction Tools.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path
from typing import Any

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.system.files.utils import _format_size, _resolve_path


class CompressFilesTool(BaseTool):
    """Compress files or folders into a zip or tar archive."""

    @property
    def name(self) -> str:
        return "compress_files"

    @property
    def description(self) -> str:
        return (
            "Compress one or more files/folders into an archive (e.g. .zip, .tar, .tar.gz). "
            "Specify the source paths and output destination archive path."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "sources": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of file or directory paths to compress.",
                },
                "destination_archive": {
                    "type": "string",
                    "description": "Path of the output archive file (e.g. 'C:/Users/.../backup.zip').",
                },
                "archive_format": {
                    "type": "string",
                    "enum": ["zip", "tar", "gztar", "bztar"],
                    "description": "Archive format ('zip', 'tar', 'gztar', 'bztar'). Default is 'zip'.",
                },
            },
            "required": ["sources", "destination_archive"],
        }

    @property
    def category(self) -> str:
        return "file"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self,
        sources: list[str] | str,
        destination_archive: str = "",
        archive_format: str = "zip",
        **kwargs: Any,
    ) -> ToolResult:
        if isinstance(sources, str):
            sources = [sources]

        if not sources:
            return ToolResult.fail("At least one source file or directory must be provided.")
        if not destination_archive:
            return ToolResult.fail("Destination archive path cannot be empty.")

        dest_path = _resolve_path(destination_archive)
        dest_path.parent.mkdir(parents=True, exist_ok=True)

        added_count = 0
        total_uncompressed_bytes = 0

        try:
            if archive_format == "zip" or dest_path.suffix.lower() == ".zip":
                import zipfile

                with zipfile.ZipFile(dest_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    for src in sources:
                        sp = _resolve_path(src)
                        if not sp.exists():
                            continue
                        if sp.is_file():
                            zf.write(sp, arcname=sp.name)
                            added_count += 1
                            total_uncompressed_bytes += sp.stat().st_size
                        elif sp.is_dir():
                            for root, _, files in os.walk(sp):
                                for f in files:
                                    file_p = Path(root) / f
                                    arcname = file_p.relative_to(sp.parent)
                                    zf.write(file_p, arcname=str(arcname))
                                    added_count += 1
                                    total_uncompressed_bytes += file_p.stat().st_size
            else:
                import tarfile

                mode = "w:gz" if (archive_format == "gztar" or str(dest_path).endswith(".tar.gz")) else "w"
                with tarfile.open(dest_path, mode) as tf:
                    for src in sources:
                        sp = _resolve_path(src)
                        if not sp.exists():
                            continue
                        tf.add(sp, arcname=sp.name)
                        added_count += 1
                        if sp.is_file():
                            total_uncompressed_bytes += sp.stat().st_size

            if added_count == 0:
                return ToolResult.fail("None of the specified source files exist to compress.")

            archive_size = dest_path.stat().st_size if dest_path.exists() else 0
            return ToolResult.ok(
                f"Successfully compressed {added_count} items into '{dest_path.name}' ({_format_size(archive_size)}).",
                archive_path=str(dest_path),
                items_compressed=added_count,
                archive_size=_format_size(archive_size),
                uncompressed_size=_format_size(total_uncompressed_bytes),
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to create archive '{dest_path}': {e}")


class ExtractArchiveTool(BaseTool):
    """Extract an archive file (.zip, .tar, .tar.gz, etc.) into a target directory."""

    @property
    def name(self) -> str:
        return "extract_archive"

    @property
    def description(self) -> str:
        return (
            "Extract files from an archive (.zip, .tar, .tar.gz, .tgz, .zip, etc.) into a destination directory."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "archive_path": {
                    "type": "string",
                    "description": "Path to the archive file to extract.",
                },
                "destination_dir": {
                    "type": "string",
                    "description": "Optional destination directory. Defaults to a folder named after the archive in the same directory.",
                },
            },
            "required": ["archive_path"],
        }

    @property
    def category(self) -> str:
        return "file"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.MEDIUM

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self,
        archive_path: str = "",
        destination_dir: str | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        src = _resolve_path(archive_path)
        if not src.exists():
            return ToolResult.fail(f"Archive '{src}' does not exist.")

        if not destination_dir:
            out_dir = src.parent / (src.stem if not src.name.endswith(".tar.gz") else src.name[:-7])
        else:
            out_dir = _resolve_path(destination_dir)

        out_dir.mkdir(parents=True, exist_ok=True)

        try:
            shutil.unpack_archive(str(src), str(out_dir))
            extracted_files = [f.name for f in out_dir.iterdir()][:10]
            return ToolResult.ok(
                f"Successfully extracted '{src.name}' into '{out_dir}'.",
                destination=str(out_dir),
                preview_files=extracted_files,
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to extract '{src}': {e}")
