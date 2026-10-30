"""Seyal AI — Universal Personal AI Agent.

Acts as a personalized 24/7 chief-of-staff, fusing personal user knowledge,
standing rules, habits, and conversational assistance.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.llm.providers.base import LLMMessage, ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.memory.manager import MemoryManager
from seyal_ai.services.user_knowledge_service import user_knowledge_service
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.personal")


class UniversalPersonalAgent:
    """Universal Personal AI Agent that knows the user, their rules, and personal preferences."""

    def __init__(
        self,
        router: ModelRouter | None = None,
        memory: MemoryManager | None = None,
    ) -> None:
        self._router = router or ModelRouter()
        self._memory = memory or MemoryManager()

    async def get_user_profile_context(self) -> str:
        """Fetch compiled user profile context, standing rules, and knowledge."""
        knowledge = user_knowledge_service.get_knowledge_context()
        return knowledge or "No prior personal profile stored."

    async def converse(self, user_input: str) -> dict[str, Any]:
        """Converse with deep personal context awareness."""
        profile_ctx = await self.get_user_profile_context()
        sys_prompt = (
            "You are Seyal AI Universal Personal Companion. You act as the user's dedicated personal assistant.\n"
            f"User Personal Context & Standing Rules:\n{profile_ctx}\n"
            "Communicate warmly, concisely, and remember user preferences."
        )

        resp = await self._router.generate(
            messages=[
                LLMMessage(role="system", content=sys_prompt),
                LLMMessage(role="user", content=user_input),
            ],
            tier=ModelTier.FAST,
            temperature=0.7,
        )

        return {
            "status": "success",
            "agent": "personal_agent",
            "response": resp.content or "",
            "context_used": bool(profile_ctx),
        }
