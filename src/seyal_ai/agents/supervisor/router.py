"""
Domain Agent Router Subsystem.

Dispatches decomposed SubTasks to their respective domain agent modules
(Terminal, Computer Use, Browser, Android Devices, Vision) using immutable contracts.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.agents.browser.agent import BrowserAgent
from seyal_ai.agents.browser.models import BrowserRequest
from seyal_ai.agents.computer_use.agent import ConversationalComputerUseAgent
from seyal_ai.agents.computer_use.models import ComputerUseRequest
from seyal_ai.agents.devices.agent import AndroidDeviceAgent
from seyal_ai.agents.devices.models import DeviceRequest
from seyal_ai.agents.supervisor.models import SubTask
from seyal_ai.agents.terminal.agent import TerminalAgent
from seyal_ai.agents.terminal.models import TerminalRequest
from seyal_ai.agents.vision.agent import VisionAgent
from seyal_ai.agents.vision.models import VisionRequest
from seyal_ai.utils.logging import get_logger

log = get_logger("supervisor.router")


class AgentRoutingError(Exception):
    """Raised when routing to a domain agent fails."""


class DomainAgentRouter:
    """
    Registry and dispatcher for all Seyal AI domain agents.
    """

    def __init__(
        self,
        terminal_agent: TerminalAgent | None = None,
        computer_use_agent: ConversationalComputerUseAgent | Any | None = None,
        browser_agent: BrowserAgent | None = None,
        devices_agent: AndroidDeviceAgent | None = None,
        vision_agent: VisionAgent | None = None,
    ) -> None:
        self.terminal = terminal_agent or TerminalAgent()
        self.computer_use = computer_use_agent or ConversationalComputerUseAgent()
        self.browser = browser_agent or BrowserAgent()
        self.devices = devices_agent or AndroidDeviceAgent()
        self.vision = vision_agent or VisionAgent()

    async def dispatch(self, subtask: SubTask, previous_results: dict[str, Any] | None = None) -> Any:
        """
        Dispatch a SubTask to the appropriate domain agent and return its result.
        """
        agent_type = subtask.agent_type.lower()
        log.info("Dispatching %s to %s agent with action '%s'", subtask.step_id, agent_type, subtask.action)

        params = dict(subtask.parameters)

        if agent_type == "terminal":
            command = params.get("command", "echo default")
            working_dir = params.get("working_dir")
            timeout_seconds = params.get("timeout_seconds", 30.0)
            req = TerminalRequest(
                command=command,
                working_dir=working_dir,
                timeout_seconds=timeout_seconds,
            )
            res = await self.terminal.execute(req)
            return {
                "success": res.exit_code == 0 and res.error is None,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "exit_code": res.exit_code,
                "safety_status": res.safety_status,
                "duration_ms": res.duration_ms,
                "error": res.error,
            }

        elif agent_type == "computer_use":
            action = subtask.action
            coord = (params["x"], params["y"]) if "x" in params and "y" in params else None
            req = ComputerUseRequest(
                action_type=action,
                coordinate=coord,
                text=params.get("text"),
            )
            # Execute on computer use agent or executor
            cu: Any = self.computer_use
            if hasattr(cu, "execute") and callable(getattr(cu, "execute", None)):
                res: Any = await cu.execute(req)
                return {
                    "success": getattr(res, "success", True),
                    "action_type": getattr(res, "action_type", action),
                    "duration_ms": getattr(res, "duration_ms", 0.0),
                    "error": getattr(res, "error", None),
                }
            return {"success": True, "action_type": action}

        elif agent_type == "browser":
            action = subtask.action
            req = BrowserRequest(
                action_type=action,
                url=params.get("url"),
                selector=params.get("selector"),
                text=params.get("text"),
            )
            res = await self.browser.execute(req)
            return {
                "success": res.success,
                "url": res.current_url,
                "title": res.title,
                "duration_ms": res.duration_ms,
                "error": res.error,
            }

        elif agent_type == "devices":
            action = subtask.action
            req = DeviceRequest(
                action_type=action,
                device_id=params.get("device_id", "emulator-5554"),
                device_token=params.get("device_token"),
                x=params.get("x"),
                y=params.get("y"),
                text=params.get("text"),
            )
            res = await self.devices.execute(req)
            return {
                "success": res.success,
                "action_type": res.action_type,
                "device_id": res.device_id,
                "duration_ms": res.duration_ms,
                "error": res.error,
            }

        elif agent_type == "vision":
            action = subtask.action
            req = VisionRequest(
                action_type=action,
                image_bytes=params.get("image_bytes"),
                target_label=params.get("target_label"),
                image_format=params.get("image_format", "JPEG"),
            )
            res = await self.vision.execute(req)
            return {
                "success": res.success,
                "action_type": res.action_type,
                "ocr_text": res.ocr_text,
                "elements_count": len(res.elements),
                "duration_ms": res.duration_ms,
                "error": res.error,
            }

        else:
            raise AgentRoutingError(f"Unknown domain agent type: '{subtask.agent_type}'")
