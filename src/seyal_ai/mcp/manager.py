"""
Seyal AI — Model Context Protocol (MCP) Manager.

Coordinates multiple MCP server processes, bridges tools into Seyal AI ToolRegistry,
and manages persistence in ~/.seyal_ai/mcp_servers.json.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

from seyal_ai.core.config import get_settings
from seyal_ai.mcp.client import McpStdioClient
from seyal_ai.mcp.types import McpServerConfig, McpServerStatus, McpToolSpec
from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult
from seyal_ai.tools.registry import ToolRegistry
from seyal_ai.utils.logging import get_logger

log = get_logger("mcp.manager")


class DynamicMcpTool(BaseTool):
    """Dynamic BaseTool wrapper that routes execution through an MCP Client."""

    def __init__(self, spec: McpToolSpec, client: McpStdioClient) -> None:
        self._spec = spec
        self._client = client

    @property
    def name(self) -> str:
        return self._spec.name

    @property
    def description(self) -> str:
        return self._spec.description or f"MCP tool provided by {self._spec.server_id}"

    @property
    def parameters(self) -> dict[str, Any]:
        return self._spec.parameters or {
            "type": "object",
            "properties": {},
        }

    @property
    def category(self) -> str:
        return f"mcp_{self._spec.server_id}"

    @property
    def risk_level(self) -> RiskLevel:
        name_lower = self.name.lower()
        if any(w in name_lower for w in ("delete", "remove", "drop", "destroy", "format", "execute", "write")):
            return RiskLevel.HIGH
        return RiskLevel.LOW

    @property
    def target_device(self) -> TargetDevice:
        return TargetDevice.LAPTOP

    async def execute(self, *args: Any, **kwargs: Any) -> ToolResult:
        try:
            output = await self._client.call_tool(self.name, kwargs)
            return ToolResult.ok(output=output)
        except Exception as e:
            return ToolResult.fail(error=str(e))


class McpManager:
    """Singleton manager for Model Context Protocol servers in Seyal AI."""

    def __init__(self, storage_path: Path | None = None) -> None:
        if storage_path:
            self._path = storage_path
        else:
            settings = get_settings()
            self._path = settings.resolved_data_dir / "mcp_servers.json"

        self._clients: dict[str, McpStdioClient] = {}
        self._lock = asyncio.Lock()
        self._initialized = False

    def _default_configs(self) -> list[McpServerConfig]:
        return [
            McpServerConfig(
                id="brave_search",
                name="Brave Real-Time Web Search",
                description="Enables live internet browsing, webpage scraping, and web fact checking.",
                command="npx -y @modelcontextprotocol/server-brave-search",
                enabled=False,
                status=McpServerStatus.DISCONNECTED,
                tools=["brave_web_search", "brave_local_search"],
            ),
            McpServerConfig(
                id="github_tools",
                name="GitHub Developer Toolkit",
                description="Autonomous repository inspection, pull requests, issue filing, and branch code search.",
                command="npx -y @modelcontextprotocol/server-github",
                enabled=False,
                status=McpServerStatus.DISCONNECTED,
                tools=["search_repositories", "create_issue", "create_pull_request", "get_file_contents"],
            ),
            McpServerConfig(
                id="filesystem_sandbox",
                name="Extended Filesystem Sandbox",
                description="Safe file manipulation, directory listing, and ripgrep search.",
                command=f"npx -y @modelcontextprotocol/server-filesystem {os.path.expanduser('~')}",
                enabled=False,
                status=McpServerStatus.DISCONNECTED,
                tools=["read_file", "write_file", "list_directory"],
            ),
            McpServerConfig(
                id="sqlite_postgres",
                name="Local Database & SQL Explorer",
                description="Query SQLite, PostgreSQL schemas and execute analytical queries.",
                command="npx -y @modelcontextprotocol/server-postgres",
                enabled=False,
                status=McpServerStatus.DISCONNECTED,
                tools=["query_database", "list_tables", "describe_schema"],
            ),
        ]

    def load_configs(self) -> list[McpServerConfig]:
        """Load configs from disk or return defaults."""
        if not self._path.exists():
            defaults = self._default_configs()
            self.save_configs(defaults)
            return defaults

        try:
            with open(self._path, "r", encoding="utf-8") as f:
                data = json.load(f)
            configs = [McpServerConfig(**item) for item in data]
            return configs or self._default_configs()
        except Exception as e:
            log.warning("Could not read MCP configs, loading defaults: %s", e)
            return self._default_configs()

    def save_configs(self, configs: list[McpServerConfig]) -> None:
        """Persist configs to disk."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(self._path, "w", encoding="utf-8") as f:
                json.dump([c.model_dump() for c in configs], f, indent=2)
        except Exception as e:
            log.error("Failed to save MCP configs: %s", e)

    async def initialize(self) -> None:
        """Initialize and start all enabled MCP servers."""
        if self._initialized:
            return

        configs = self.load_configs()
        for cfg in configs:
            client = McpStdioClient(cfg)
            self._clients[cfg.id] = client
            if cfg.enabled:
                asyncio.create_task(client.start())

        self._initialized = True

    async def get_servers(self) -> list[McpServerConfig]:
        """Return real-time state of all configured MCP servers."""
        configs = self.load_configs()
        # Merge active in-memory client statuses
        for cfg in configs:
            if cfg.id in self._clients:
                client = self._clients[cfg.id]
                cfg.status = client.config.status
                cfg.ping_ms = client.config.ping_ms
                cfg.tools = [t.name for t in client._tools] if client._tools else cfg.tools
                cfg.last_error = client.config.last_error
        return configs

    async def toggle_server(self, server_id: str, enabled: bool) -> McpServerConfig | None:
        """Enable or disable an MCP server."""
        configs = self.load_configs()
        target = next((c for c in configs if c.id == server_id), None)
        if not target:
            return None

        target.enabled = enabled
        self.save_configs(configs)

        client = self._clients.get(server_id)
        if not client:
            client = McpStdioClient(target)
            self._clients[server_id] = client

        if enabled:
            await client.start()
        else:
            await client.stop()

        target.status = client.config.status
        target.ping_ms = client.config.ping_ms
        return target

    async def ping_server(self, server_id: str) -> float:
        """Send live ping to an MCP server."""
        client = self._clients.get(server_id)
        if not client:
            configs = self.load_configs()
            cfg = next((c for c in configs if c.id == server_id), None)
            if not cfg:
                return -1.0
            client = McpStdioClient(cfg)
            self._clients[server_id] = client

        latency = await client.ping()
        # Persist updated status
        configs = self.load_configs()
        for c in configs:
            if c.id == server_id:
                c.ping_ms = client.config.ping_ms
                c.status = client.config.status
                c.last_error = client.config.last_error
        self.save_configs(configs)
        return latency

    async def register_tools(self, registry: ToolRegistry) -> int:
        """Register all tools from active MCP servers into Seyal AI ToolRegistry."""
        count = 0
        for server_id, client in self._clients.items():
            if not client.is_running:
                continue
            tools = await client.refresh_tools()
            for spec in tools:
                tool = DynamicMcpTool(spec, client)
                registry.register(tool)
                count += 1
        return count

    async def shutdown(self) -> None:
        """Stop all running MCP servers on app termination."""
        for client in self._clients.values():
            await client.stop()
        self._clients.clear()
        self._initialized = False


# Module-level singleton
_mcp_manager_instance: McpManager | None = None


def get_mcp_manager() -> McpManager:
    global _mcp_manager_instance
    if _mcp_manager_instance is None:
        _mcp_manager_instance = McpManager()
    return _mcp_manager_instance
