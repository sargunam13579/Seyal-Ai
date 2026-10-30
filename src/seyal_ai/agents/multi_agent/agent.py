"""Seyal AI — Multi-Agent AI Company Coordinator.

Orchestrates multi-role collaborative discussions between Planner, Architect,
Engineer, and QA agents.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.agents.multi_agent.bus import AgentCommunicationBus, AgentMessage
from seyal_ai.agents.multi_agent.roles import DEFAULT_AI_TEAM, AgentRole, TeamMember
from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.events import get_event_bus
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.multi_agent")


class MultiAgentCompanyCoordinator:
    """Coordinates a swarm of specialized AI agents working as a software organization."""

    def __init__(
        self,
        router: ModelRouter | None = None,
        bus: AgentCommunicationBus | None = None,
    ) -> None:
        self._router = router or ModelRouter()
        self._bus = bus or AgentCommunicationBus()
        self._event_bus = get_event_bus()
        self._team: dict[AgentRole, TeamMember] = {m.role: m for m in DEFAULT_AI_TEAM}

    async def execute_team_project(self, project_goal: str) -> dict[str, Any]:
        """Execute collaborative multi-role analysis on a project goal."""
        log.info("Initiating Multi-Agent AI Company project: '%s'", project_goal)
        await self._event_bus.emit("multi_agent.started", {"goal": project_goal})

        # 1. Lead Planner (CEO)
        ceo = self._team[AgentRole.CEO]
        ceo_resp = await self._router.generate(
            messages=[
                LLMMessage(role="system", content=ceo.system_instruction),
                LLMMessage(role="user", content=f"Define project execution plan for: '{project_goal}'"),
            ],
            tier=ModelTier.FAST,
            temperature=0.3,
        )
        self._bus.dispatch_message(
            AgentMessage(from_role=AgentRole.CEO, to_role="broadcast", content=ceo_resp.content or "")
        )

        # 2. Architect
        arch = self._team[AgentRole.ARCHITECT]
        arch_resp = await self._router.generate(
            messages=[
                LLMMessage(role="system", content=arch.system_instruction),
                LLMMessage(
                    role="user",
                    content=f"Plan from CEO:\n{ceo_resp.content}\n\nPropose architectural structure & modular boundaries.",
                ),
            ],
            tier=ModelTier.FAST,
            temperature=0.3,
        )
        self._bus.dispatch_message(
            AgentMessage(from_role=AgentRole.ARCHITECT, to_role="broadcast", content=arch_resp.content or "")
        )

        transcript = self._bus.get_transcript()
        await self._event_bus.emit("multi_agent.completed", {"steps_count": len(transcript)})

        return {
            "status": "success",
            "agent": "multi_agent_company",
            "project_goal": project_goal,
            "transcript": transcript,
        }
