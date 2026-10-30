"""
Seyal AI File Search Tool.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.system.files.utils import _format_size, _resolve_path


class SearchFilesTool(BaseTool):
    """Search for files in a directory matching patterns or extensions."""

    @property
    def name(self) -> str:
        return "search_files"

    @property
    def description(self) -> str:
        return (
            "Search for files on the laptop by filename, glob pattern (e.g. '*.pdf', '*report*'), "
            "or extension. Specify a starting directory (defaults to user home or current dir)."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Filename keyword or glob pattern to search for (e.g., 'notes.txt', '*.pdf', 'budget').",
                },
                "directory": {
                    "type": "string",
                    "description": "Base directory to search in. Defaults to user home directory.",
                },
                "max_depth": {
                    "type": "integer",
                    "description": "Maximum directory depth to search (default: 4).",
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results to return (default: 20).",
                },
            },
            "required": ["query"],
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
        query: str = "",
        directory: str | None = None,
        max_depth: int = 4,
        max_results: int = 20,
        **kwargs: Any,
    ) -> ToolResult:
        base_dir = _resolve_path(directory) if directory else Path.home()
        if not base_dir.exists() or not base_dir.is_dir():
            return ToolResult.fail(f"Search directory '{base_dir}' does not exist.")

        pattern = query.strip()
        is_glob = any(char in pattern for char in "*?[]")
        regex = None if is_glob else re.compile(re.escape(pattern), re.IGNORECASE)

        results: list[dict[str, Any]] = []
        base_parts_len = len(base_dir.parts)

        try:
            for root, dirs, files in os.walk(base_dir):
                curr_path = Path(root)
                depth = len(curr_path.parts) - base_parts_len
                if depth > max_depth:
                    dirs.clear()  # Do not recurse deeper
                    continue

                # Skip hidden/system directories for speed
                dirs[:] = [
                    d
                    for d in dirs
                    if not d.startswith(".")
                    and d not in ("node_modules", "$Recycle.Bin", "AppData")
                ]

                for fname in files:
                    match = False
                    if is_glob:
                        if Path(fname).match(pattern):
                            match = True
                    elif regex and regex.search(fname):
                        match = True

                    if match:
                        fpath = curr_path / fname
                        try:
                            st = fpath.stat()
                            results.append(
                                {
                                    "name": fname,
                                    "path": str(fpath),
                                    "size_bytes": st.st_size,
                                    "size": _format_size(st.st_size),
                                    "is_dir": False,
                                }
                            )
                        except OSError:
                            results.append({"name": fname, "path": str(fpath), "is_dir": False})

                        if len(results) >= max_results:
                            break
                if len(results) >= max_results:
                    break

            if not results:
                return ToolResult.ok(
                    f"No files matching '{query}' found in '{base_dir}'.", files=[]
                )

            lines = [f"Found {len(results)} file(s) matching '{query}' in '{base_dir}':"]
            for f in results:
                lines.append(f"  • {f['name']} ({f.get('size', 'unknown')}) -> {f['path']}")

            return ToolResult.ok("\n".join(lines), files=results, count=len(results))
        except Exception as e:
            return ToolResult.fail(f"File search failed: {e}")
