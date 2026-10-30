"""Seyal AI — Multi-Agent AI Company Module."""

from seyal_ai.agents.multi_agent.agent import MultiAgentCompanyCoordinator
from seyal_ai.agents.multi_agent.bus import AgentCommunicationBus, AgentMessage
from seyal_ai.agents.multi_agent.roles import DEFAULT_AI_TEAM, AgentRole, TeamMember

__all__ = [
    "MultiAgentCompanyCoordinator",
    "AgentCommunicationBus",
    "AgentMessage",
    "AgentRole",
    "TeamMember",
    "DEFAULT_AI_TEAM",
]
