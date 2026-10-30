"""Seyal AI — Multi-Agent AI Company: Specialized Agent Roles."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class AgentRole(str, Enum):
    CEO = "ceo_planner"
    PRODUCT_MANAGER = "product_manager"
    ARCHITECT = "system_architect"
    CODER = "software_engineer"
    QA = "quality_assurance"


@dataclass
class TeamMember:
    role: AgentRole
    name: str
    description: str
    system_instruction: str


DEFAULT_AI_TEAM: list[TeamMember] = [
    TeamMember(
        role=AgentRole.CEO,
        name="Chief Planner",
        description="Breaks down goals into milestones and allocates tasks.",
        system_instruction="You are the Executive Lead. Define scope, deliverables, and assign work.",
    ),
    TeamMember(
        role=AgentRole.ARCHITECT,
        name="System Architect",
        description="Designs modular structures, schemas, and API contracts.",
        system_instruction="You are the Lead Architect. Design clean, robust system structures.",
    ),
    TeamMember(
        role=AgentRole.CODER,
        name="Lead Engineer",
        description="Implements clean, production-ready code solutions.",
        system_instruction="You are the Lead Engineer. Write precise, bug-free implementations.",
    ),
    TeamMember(
        role=AgentRole.QA,
        name="Quality Assurance",
        description="Audits edge cases, security, and verifies functionality.",
        system_instruction="You are the QA Reviewer. Challenge assumptions and catch defects.",
    ),
]
