"""
Seyal AI — Model Context Protocol (MCP) Data Types.
Defines server configs, transport types, tool specifications, and runtime states.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any
from pydantic import BaseModel, Field


class McpTransportType(StrEnum):
    STDIO = "stdio"
    SSE = "sse"


class McpServerStatus(StrEnum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class McpServerConfig(BaseModel):
    """Configuration for an external MCP server."""

    id: str
    name: str
    description: str
    command: str
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    transport: McpTransportType = McpTransportType.STDIO
    enabled: bool = True
    status: McpServerStatus = McpServerStatus.DISCONNECTED
    ping_ms: float = 0.0
    tools: list[str] = Field(default_factory=list)
    last_error: str | None = None


@dataclass
class McpToolSpec:
    """Specification of a tool exported by an MCP server."""

    server_id: str
    name: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)
