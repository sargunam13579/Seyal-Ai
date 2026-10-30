"""Seyal AI — Multi-Agent AI Company: Agent Communication Bus."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from seyal_ai.agents.multi_agent.roles import AgentRole
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.multi_agent.bus")


@dataclass
class AgentMessage:
    from_role: AgentRole
    to_role: AgentRole | str  # specific role or 'broadcast'
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class AgentCommunicationBus:
    """Pub/sub and message routing between specialized team agents."""

    def __init__(self) -> None:
        self._history: list[AgentMessage] = []
        self._listeners: list[asyncio.Queue[AgentMessage]] = []

    def dispatch_message(self, message: AgentMessage) -> None:
        """Record and broadcast a message between agents."""
        self._history.append(message)
        for q in self._listeners:
            q.put_nowait(message)

    def get_transcript(self) -> list[dict[str, Any]]:
        """Return chronological discussion transcript."""
        return [
            {
                "from": m.from_role.value,
                "to": m.to_role if isinstance(m.to_role, str) else m.to_role.value,
                "content": m.content,
                "timestamp": m.timestamp,
            }
            for m in self._history
        ]
