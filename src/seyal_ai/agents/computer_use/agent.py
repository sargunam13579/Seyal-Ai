"""
Seyal AI Conversational Computer-Use Agent.

High-level autonomous visual agent that accepts natural language/voice instructions,
perceives screen state via Set-of-Marks and UI automation trees, reasons iteratively,
executes precise OS actions, and supports real-time conversational steering.
"""

from __future__ import annotations

import asyncio

from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.conversation import ConversationalQueriesMixin
from seyal_ai.agents.computer_use.decomposition import (
    decompose_user_intents,
    generate_task_acknowledgment,
    get_universal_convo_fallback,
)
from seyal_ai.agents.computer_use.execution import ExecutionEngineMixin
from seyal_ai.agents.computer_use.grounding import VisualGroundingEngine
from seyal_ai.agents.computer_use.prompts import (
    CHATBOT_SYSTEM_PROMPT,
    COMPUTER_USE_SYSTEM_PROMPT,
    UNIVERSAL_CONVO_FALLBACK,
    PromptsMixin,
)
from seyal_ai.agents.computer_use.protocol import (
    AgentStatus,
    ScreenObservation,
    SteeringInstruction,
    StepRecord,
)
from seyal_ai.agents.computer_use.safety import SafetyGuardsMixin
from seyal_ai.agents.computer_use.shortcuts import (
    detect_fast_shortcut,
    is_explicit_mouse_request,
    resolve_universal_shortcut,
)
from seyal_ai.core.config import SeyalAiSettings, get_settings
from seyal_ai.core.confirmation import ConfirmationManager
from seyal_ai.llm.router import ModelRouter
from seyal_ai.utils.events import EventBus, get_event_bus
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use")


class ConversationalComputerUseAgent(
    PromptsMixin,
    SafetyGuardsMixin,
    ConversationalQueriesMixin,
    ExecutionEngineMixin,
):
    """
    Conversational Computer-Use Agent with Vision-Action closed loop
    and live human-in-the-loop steering.
    """

    def __init__(
        self,
        router: ModelRouter | None = None,
        grounding: VisualGroundingEngine | None = None,
        executor: ComputerActionExecutor | None = None,
        confirmation: ConfirmationManager | None = None,
        event_bus: EventBus | None = None,
        settings: SeyalAiSettings | None = None,
        max_steps: int = 25,
    ) -> None:
        self._router = router or ModelRouter()
        self._grounding = grounding or VisualGroundingEngine()
        self._executor = executor or ComputerActionExecutor()
        self._confirmation = confirmation or ConfirmationManager()
        self._event_bus = event_bus or get_event_bus()
        self._settings = settings or get_settings()
        self._max_steps = max_steps

        self._status = AgentStatus.IDLE
        self._is_task_running = False
        self._steering_queue: asyncio.Queue[SteeringInstruction] = asyncio.Queue()
        self._history: list[StepRecord] = []
        self._convo_history: list[dict[str, str]] = []
        self._stop_requested = False
        self._pivot_requested = False
        self._pivot_goal: str | None = None
        self._current_task: str = ""
        self._telemetry_cache: tuple[float, str] | None = None
        self._lang_cache: tuple[float, str] | None = None

    @property
    def status(self) -> AgentStatus:
        return self._status

    @property
    def is_task_running(self) -> bool:
        return self._is_task_running

    @property
    def history(self) -> list[StepRecord]:
        return list(self._history)

    def request_stop(self) -> None:
        """Immediately trigger emergency stop for computer-use loop."""
        log.warning("Computer-Use stop requested by user or system kill switch.")
        self._stop_requested = True
        self._status = AgentStatus.STOPPED

    async def steer(self, instruction: str | SteeringInstruction) -> None:
        """Inject conversational steering instruction while agent is operating."""
        if isinstance(instruction, str):
            instruction_text = instruction.strip()
            lower = instruction_text.lower()
            # Emergency Stop Check
            if any(lower == s or lower.startswith(s + " ") for s in ("stop", "cancel", "pause", "halt", "niruthu", "quit")):
                self.request_stop()
                return

            # Detect pivot to new goal (Case 4)
            # Note: "instead of" (e.g. click X instead of Y) is in-task guidance, not a task pivot
            is_instead_of = "instead of" in lower
            pivot_markers = ("actually do", "idhu venaam", "athu venaam", "adhu venaam", "change to", "switch to", "nahi balki", "stop and")
            is_pivot = (any(pm in lower for pm in pivot_markers) or lower.endswith(" instead") or " do instead" in lower) and not is_instead_of
            instruction_obj = SteeringInstruction(
                instruction=instruction_text,
                interrupt_current_action=True,
                is_pivot=is_pivot,
                new_goal=instruction_text if is_pivot else None,
            )
            if is_pivot:
                self._pivot_requested = True
                self._pivot_goal = instruction_text
        else:
            instruction_obj = instruction
            if instruction_obj.is_pivot:
                self._pivot_requested = True
                self._pivot_goal = instruction_obj.new_goal or instruction_obj.instruction

        log.info("Received steering instruction (pivot=%s): %s", self._pivot_requested, instruction_obj.instruction)
        await self._steering_queue.put(instruction_obj)

    async def observe(self, tag_elements: bool = True) -> ScreenObservation:
        """Observe and return current screen state with Set-of-Marks overlay."""
        return await self._grounding.observe_screen(tag_elements=tag_elements)


# 100% backward-compatible exports
__all__ = [
    "CHATBOT_SYSTEM_PROMPT",
    "COMPUTER_USE_SYSTEM_PROMPT",
    "ConversationalComputerUseAgent",
    "UNIVERSAL_CONVO_FALLBACK",
    "decompose_user_intents",
    "detect_fast_shortcut",
    "generate_task_acknowledgment",
    "get_universal_convo_fallback",
    "is_explicit_mouse_request",
    "resolve_universal_shortcut",
]
