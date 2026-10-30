"""
Seyal AI — Model Context Protocol (MCP) Integration.
"""

from seyal_ai.mcp.client import McpStdioClient
from seyal_ai.mcp.manager import McpManager, get_mcp_manager
from seyal_ai.mcp.types import McpServerConfig, McpServerStatus, McpToolSpec

__all__ = [
    "McpStdioClient",
    "McpManager",
    "get_mcp_manager",
    "McpServerConfig",
    "McpServerStatus",
    "McpToolSpec",
]
