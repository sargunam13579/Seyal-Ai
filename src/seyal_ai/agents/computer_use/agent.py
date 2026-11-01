"""
Seyal AI Conversational Computer-Use Agent.

High-level autonomous visual agent that accepts natural language/voice instructions,
perceives screen state via Set-of-Marks and UI automation trees, reasons iteratively,
executes precise OS actions, and supports real-time conversational steering.
"""

from __future__ import annotations

import asyncio
import time

from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.input import Win32InputSimulator
from seyal_ai.agents.computer_use.masking import SensitiveUIMasker
from seyal_ai.agents.computer_use.models import (
    AutomationInterruptException,
    ComputerUseRequest,
    ComputerUseResponse,
)
from seyal_ai.agents.computer_use.screen import ScreenCoordinateScaler
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


class ComputerUseAgent:
    """
    Native OS GUI Automation Agent for Module 2.

    Provides mouse and keyboard input primitives, DPI-aware coordinate scaling,
    corner fail-safe abort boundaries, and sensitive UI credential masking.
    """

    def __init__(
        self,
        input_simulator: Win32InputSimulator | None = None,
        scaler: ScreenCoordinateScaler | None = None,
        masker: SensitiveUIMasker | None = None,
    ) -> None:
        self._scaler = scaler or ScreenCoordinateScaler()
        self._input = input_simulator or Win32InputSimulator(scaler=self._scaler)
        self._masker = masker or SensitiveUIMasker()

    @property
    def scaler(self) -> ScreenCoordinateScaler:
        return self._scaler

    @property
    def input_simulator(self) -> Win32InputSimulator:
        return self._input

    @property
    def masker(self) -> SensitiveUIMasker:
        return self._masker

    async def execute(self, request: ComputerUseRequest) -> ComputerUseResponse:
        """
        Execute an immutable ComputerUseRequest action safely.
        """
        start_time = time.perf_counter()

        # 1. Sensitive UI & Credential Masking Check
        is_masked = self._masker.should_mask(is_sensitive_flag=request.is_sensitive)
        logged_text = self._masker.mask_text(request.text) if is_masked else request.text

        try:
            # 2. Check Physical Fail-Safe Abort Boundary
            if request.coordinate:
                self._input.check_failsafe(request.coordinate[0], request.coordinate[1])
            else:
                self._input.check_failsafe()

            # 3. Dispatch Action Primitive
            act = request.action_type.lower()
            if act == "click":
                coord = request.coordinate
                cx, cy = self._scaler.clamp_to_virtual_screen(coord[0], coord[1]) if coord else (None, None)
                self._input.click(cx, cy, button=request.button)
                msg = f"Clicked {request.button} button at {coord}"
            elif act == "double_click":
                coord = request.coordinate
                cx, cy = self._scaler.clamp_to_virtual_screen(coord[0], coord[1]) if coord else (None, None)
                self._input.double_click(cx, cy)
                msg = f"Double clicked at {coord}"
            elif act == "right_click":
                coord = request.coordinate
                cx, cy = self._scaler.clamp_to_virtual_screen(coord[0], coord[1]) if coord else (None, None)
                self._input.click(cx, cy, button="right")
                msg = f"Right clicked at {coord}"
            elif act == "middle_click":
                coord = request.coordinate
                cx, cy = self._scaler.clamp_to_virtual_screen(coord[0], coord[1]) if coord else (None, None)
                self._input.click(cx, cy, button="middle")
                msg = f"Middle clicked at {coord}"
            elif act == "move_to":
                if not request.coordinate:
                    raise ValueError("Coordinate required for move_to action.")
                cx, cy = self._scaler.clamp_to_virtual_screen(request.coordinate[0], request.coordinate[1])
                self._input.move_to(cx, cy)
                msg = f"Moved cursor to ({cx}, {cy})"
            elif act == "drag":
                if not request.coordinate or not request.target_coordinate:
                    raise ValueError("Both coordinate and target_coordinate required for drag.")
                x1, y1 = self._scaler.clamp_to_virtual_screen(request.coordinate[0], request.coordinate[1])
                x2, y2 = self._scaler.clamp_to_virtual_screen(request.target_coordinate[0], request.target_coordinate[1])
                dur = request.duration_seconds if request.duration_seconds > 0 else 0.2
                self._input.drag(x1, y1, x2, y2, duration=dur)
                msg = f"Dragged from ({x1}, {y1}) to ({x2}, {y2})"
            elif act == "mouse_down":
                self._input.mouse_down(button=request.button)
                msg = f"Mouse button down: {request.button}"
            elif act == "mouse_up":
                self._input.mouse_up(button=request.button)
                msg = f"Mouse button up: {request.button}"
            elif act == "type_text":
                if not request.text:
                    raise ValueError("Text required for type_text action.")
                self._input.type_text(request.text)
                msg = f"Typed text: '{logged_text}'"
            elif act == "key_press":
                if not request.text and not request.keys:
                    raise ValueError("Key required for key_press action.")
                k = request.text or request.keys[0]
                self._input.key_press(k)
                msg = f"Pressed key '{k}'"
            elif act == "key_down":
                k = request.text or (request.keys[0] if request.keys else "")
                self._input.key_down(k)
                msg = f"Key down: '{k}'"
            elif act == "key_up":
                k = request.text or (request.keys[0] if request.keys else "")
                self._input.key_up(k)
                msg = f"Key up: '{k}'"
            elif act == "hotkey":
                if not request.keys:
                    raise ValueError("Keys tuple required for hotkey action.")
                self._input.hotkey(*request.keys)
                msg = f"Triggered hotkey combo: {request.keys}"
            elif act == "wait":
                dur = max(0.0, min(request.duration_seconds, 60.0))
                time.sleep(dur)
                msg = f"Waited for {dur}s"
            elif act == "screenshot":
                msg = "Captured screenshot observation"
            else:
                raise ValueError(f"Unsupported action_type: {act}")

            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return ComputerUseResponse(
                action_type=request.action_type,
                success=True,
                message=msg,
                coordinate=request.coordinate,
                duration_ms=round(elapsed_ms, 2),
                masked=is_masked,
                interrupted=False,
                error=None,
            )

        except AutomationInterruptException as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.critical("ComputerUse execution aborted by fail-safe: %s", e)
            return ComputerUseResponse(
                action_type=request.action_type,
                success=False,
                message="Execution aborted by fail-safe corner interrupt.",
                coordinate=request.coordinate,
                duration_ms=round(elapsed_ms, 2),
                masked=is_masked,
                interrupted=True,
                error=str(e),
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.error("ComputerUse execution failed: %s", e)
            return ComputerUseResponse(
                action_type=request.action_type,
                success=False,
                message=f"Execution error: {e}",
                coordinate=request.coordinate,
                duration_ms=round(elapsed_ms, 2),
                masked=is_masked,
                interrupted=False,
                error=str(e),
            )


# 100% backward-compatible exports
__all__ = [
    "CHATBOT_SYSTEM_PROMPT",
    "COMPUTER_USE_SYSTEM_PROMPT",
    "ConversationalComputerUseAgent",
    "ComputerUseAgent",
    "UNIVERSAL_CONVO_FALLBACK",
    "decompose_user_intents",
    "detect_fast_shortcut",
    "generate_task_acknowledgment",
    "get_universal_convo_fallback",
    "is_explicit_mouse_request",
    "resolve_universal_shortcut",
]
