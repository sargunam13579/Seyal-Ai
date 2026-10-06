"""Seyal AI Laptop Agent — Windows OS control, apps, files, browser, screen."""

from seyal_ai.agents.laptop.agent import LaptopAgent, LaptopAgentClient
from seyal_ai.agents.laptop.protocol import (
    AgentHeartbeat,
    DeviceRegistration,
    DeviceStatus,
    ToolExecutionRequest,
    ToolExecutionResponse,
)

__all__ = [
    "LaptopAgent",
    "LaptopAgentClient",
    "DeviceRegistration",
    "DeviceStatus",
    "AgentHeartbeat",
    "ToolExecutionRequest",
    "ToolExecutionResponse",
]
