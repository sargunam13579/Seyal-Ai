"""
Seyal AI API — Model Context Protocol (MCP) Endpoints.

REST API for configuring, pinging, toggling, and inspecting MCP servers.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from seyal_ai.mcp.manager import get_mcp_manager
from seyal_ai.mcp.types import McpServerConfig

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol"])


class ToggleRequest(BaseModel):
    enabled: bool


@router.get("/servers", summary="List all configured MCP servers")
async def list_mcp_servers() -> dict[str, Any]:
    """Retrieve all MCP servers with their current connection status and tool count."""
    mgr = get_mcp_manager()
    servers = await mgr.get_servers()
    return {
        "success": True,
        "servers": [s.model_dump() for s in servers],
    }


@router.post("/servers/{server_id}/toggle", summary="Enable or disable an MCP server")
async def toggle_mcp_server(server_id: str, req: ToggleRequest) -> dict[str, Any]:
    """Toggle an MCP server's enabled status, launching or stopping the process."""
    mgr = get_mcp_manager()
    updated = await mgr.toggle_server(server_id, req.enabled)
    if not updated:
        raise HTTPException(status_code=404, detail=f"MCP server '{server_id}' not found")
    return {
        "success": True,
        "server": updated.model_dump(),
    }


@router.post("/servers/{server_id}/ping", summary="Ping an MCP server")
async def ping_mcp_server(server_id: str) -> dict[str, Any]:
    """Send a live ping to test MCP connection latency."""
    mgr = get_mcp_manager()
    latency = await mgr.ping_server(server_id)
    return {
        "success": latency >= 0,
        "server_id": server_id,
        "ping_ms": latency,
    }


@router.post("/servers", summary="Add or update an MCP server configuration")
async def save_mcp_server(config: McpServerConfig) -> dict[str, Any]:
    """Save custom or updated MCP server configuration."""
    mgr = get_mcp_manager()
    configs = mgr.load_configs()
    existing_idx = next((i for i, c in enumerate(configs) if c.id == config.id), None)
    if existing_idx is not None:
        configs[existing_idx] = config
    else:
        configs.append(config)
    mgr.save_configs(configs)
    return {
        "success": True,
        "server": config.model_dump(),
    }
