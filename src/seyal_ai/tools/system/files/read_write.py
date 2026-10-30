"""
Seyal AI File Read, Create, and Edit Tools.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.system.files.utils import _resolve_path


class CreateFileTool(BaseTool):
    """Create a new file with specified text content."""

    @property
    def name(self) -> str:
        return "create_file"

    @property
    def description(self) -> str:
        return (
            "Create a new file with text content. Will create parent folders if they do not exist."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path where the new file should be created.",
                },
                "content": {
                    "type": "string",
                    "description": "Text content to write into the file (defaults to empty).",
                },
                "overwrite": {
                    "type": "boolean",
                    "description": "Whether to overwrite if the file already exists (default: false).",
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

    async def execute(
        self,
        path: str = "",
        content: str = "",
        overwrite: bool = False,
        **kwargs: Any,
    ) -> ToolResult:
        file_path = _resolve_path(path)
        if file_path.exists() and not overwrite:
            return ToolResult.fail(
                f"File '{file_path}' already exists. Set overwrite=True to replace."
            )

        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding="utf-8")
            return ToolResult.ok(
                f"Successfully created file '{file_path}' ({len(content)} characters written).",
                path=str(file_path),
                size_bytes=len(content.encode("utf-8")),
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to create file '{path}': {e}")


class ReadFileTool(BaseTool):
    """Read text content from a file safely."""

    @property
    def name(self) -> str:
        return "read_file"

    @property
    def description(self) -> str:
        return (
            "Read text content from a file on the laptop, with support for line limits and offsets."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path of the file to read.",
                },
                "max_lines": {
                    "type": "integer",
                    "description": "Maximum lines to return (default: 200).",
                },
                "start_line": {
                    "type": "integer",
                    "description": "Starting line number (1-indexed, default: 1).",
                },
            },
            "required": ["path"],
        }

    @property
    def category(self) -> str:
        return "files"

    @property
    def risk_level(self) -> RiskLevel:
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(
        self,
        path: str = "",
        max_lines: int = 200,
        start_line: int = 1,
        **kwargs: Any,
    ) -> ToolResult:
        file_path = _resolve_path(path)
        if not file_path.exists():
            return ToolResult.fail(f"File not found: '{file_path}'")
        if file_path.is_dir():
            return ToolResult.fail(f"Target '{file_path}' is a directory, not a file.")

        try:
            # Try reading UTF-8, fall back to latin-1
            try:
                text = file_path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                text = file_path.read_text(encoding="latin-1")

            lines = text.splitlines()
            total_lines = len(lines)

            start_idx = max(0, start_line - 1)
            end_idx = min(total_lines, start_idx + max_lines)
            selected_lines = lines[start_idx:end_idx]

            output_content = "\n".join(selected_lines)
            header = f"=== File: {file_path.name} (Lines {start_idx + 1}-{end_idx} of {total_lines}) ===\n"
            return ToolResult.ok(
                f"{header}{output_content}",
                path=str(file_path),
                total_lines=total_lines,
                returned_lines=len(selected_lines),
            )
        except Exception as e:
            return ToolResult.fail(f"Failed to read file '{path}': {e}")


class EditFileTool(BaseTool):
    """Edit an existing file by appending, overwriting, or replacing text."""

    @property
    def name(self) -> str:
        return "edit_file"

    @property
    def description(self) -> str:
        return (
            "Edit an existing file on the laptop. Supported modes: 'append' (add text to end), "
            "'overwrite' (replace entire file), or 'replace' (replace target string with new text)."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path of the file to edit.",
                },
                "mode": {
                    "type": "string",
                    "enum": ["append", "overwrite", "replace"],
                    "description": "Edit mode: 'append', 'overwrite', or 'replace'.",
                },
                "content": {
                    "type": "string",
                    "description": "Text content to write or append (for 'append' or 'overwrite' mode), or replacement text (for 'replace' mode).",
                },
                "target_text": {
                    "type": "string",
                    "description": "The exact target text to be replaced (required if mode is 'replace').",
                },
            },
            "required": ["path", "mode"],
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
        self,
        path: str = "",
        mode: str = "append",
        content: str = "",
        target_text: str | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        file_path = _resolve_path(path)
        if not file_path.exists():
            return ToolResult.fail(f"File not found: '{file_path}'")

        try:
            current_content = file_path.read_text(encoding="utf-8")

            if mode == "append":
                new_content = (
                    current_content
                    + ("\n" if current_content and not current_content.endswith("\n") else "")
                    + content
                )
                file_path.write_text(new_content, encoding="utf-8")
                return ToolResult.ok(
                    f"Successfully appended content to '{file_path}'.", path=str(file_path)
                )

            elif mode == "overwrite":
                file_path.write_text(content, encoding="utf-8")
                return ToolResult.ok(
                    f"Successfully overwrote file '{file_path}'.", path=str(file_path)
                )

            elif mode == "replace":
                if not target_text:
                    return ToolResult.fail(
                        "Parameter 'target_text' is required when mode is 'replace'."
                    )
                if target_text not in current_content:
                    return ToolResult.fail(f"Target text was not found in '{file_path}'.")
                new_content = current_content.replace(target_text, content)
                file_path.write_text(new_content, encoding="utf-8")
                return ToolResult.ok(
                    f"Successfully replaced target text in '{file_path}'.", path=str(file_path)
                )

            else:
                return ToolResult.fail(
                    f"Unknown edit mode: '{mode}'. Choose append, overwrite, or replace."
                )
        except Exception as e:
            return ToolResult.fail(f"Failed to edit file '{path}': {e}")
