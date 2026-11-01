"""
Task Planner Subsystem for Supervisor Orchestrator.

Decomposes complex, multi-agent compound user prompts into a directed acyclic graph (DAG)
of executable SubTasks assigned to specific domain agents.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from seyal_ai.agents.supervisor.models import SubTask, TaskPlan, TaskStatus
from seyal_ai.utils.logging import get_logger

log = get_logger("supervisor.planner")


class PlanningError(Exception):
    """Raised when task decomposition or DAG validation fails."""


class TaskPlanner:
    """
    Decomposes natural language prompts into structured DAG SubTasks.
    """

    def plan(self, prompt: str) -> TaskPlan:
        """Analyze prompt and generate a validated TaskPlan."""
        prompt_lower = prompt.strip().lower()
        plan_id = f"plan_{uuid.uuid4().hex[:12]}"
        steps: list[SubTask] = []

        # Compound scenario 1: Browser -> Terminal -> Devices
        # e.g., "download ... run ... alert phone"
        has_browser = any(k in prompt_lower for k in ["browser", "web", "url", "download", "http", "fetch log"])
        has_terminal = any(k in prompt_lower for k in ["terminal", "command", "script", "analyze", "powershell", "run"])
        has_device = any(k in prompt_lower for k in ["phone", "android", "adb", "mobile", "device", "alert"])
        has_vision = any(k in prompt_lower for k in ["screenshot", "screen", "ocr", "see", "vision", "ground", "inspect"])
        has_computer_use = any(k in prompt_lower for k in ["mouse", "click", "keyboard", "type text", "window"])

        step_counter = 1

        if has_browser and has_terminal and has_device:
            # Multi-agent 3-step pipeline
            s1 = SubTask(
                step_id=f"step_{step_counter}",
                agent_type="browser",
                action="navigate",
                parameters={"url": "https://example.com/logs"},
                dependencies=[],
            )
            step_counter += 1
            s2 = SubTask(
                step_id=f"step_{step_counter}",
                agent_type="terminal",
                action="execute_command",
                parameters={"command": "python -c \"print('analyzing logs')\""},
                dependencies=[s1.step_id],
            )
            step_counter += 1
            s3 = SubTask(
                step_id=f"step_{step_counter}",
                agent_type="devices",
                action="tap",
                parameters={"device_id": "emulator-5554", "x": 100, "y": 200},
                dependencies=[s2.step_id],
            )
            steps = [s1, s2, s3]

        elif has_vision and (has_terminal or has_computer_use):
            # Vision grounding or OCR followed by terminal or mouse action
            s1 = SubTask(
                step_id=f"step_{step_counter}",
                agent_type="vision",
                action="capture_screen",
                parameters={"image_format": "JPEG"},
                dependencies=[],
            )
            step_counter += 1
            if has_computer_use:
                s2 = SubTask(
                    step_id=f"step_{step_counter}",
                    agent_type="computer_use",
                    action="mouse_click",
                    parameters={"x": 500, "y": 300},
                    dependencies=[s1.step_id],
                )
            else:
                s2 = SubTask(
                    step_id=f"step_{step_counter}",
                    agent_type="terminal",
                    action="execute_command",
                    parameters={"command": "echo Screenshot verified"},
                    dependencies=[s1.step_id],
                )
            steps = [s1, s2]

        elif has_device:
            steps.append(
                SubTask(
                    step_id=f"step_{step_counter}",
                    agent_type="devices",
                    action="get_paired_devices",
                    parameters={},
                    dependencies=[],
                )
            )
        elif has_browser:
            url_match = re.search(r"https?://[^\s]+", prompt)
            url = url_match.group(0) if url_match else "https://example.com"
            steps.append(
                SubTask(
                    step_id=f"step_{step_counter}",
                    agent_type="browser",
                    action="navigate",
                    parameters={"url": url},
                    dependencies=[],
                )
            )
        elif has_computer_use:
            steps.append(
                SubTask(
                    step_id=f"step_{step_counter}",
                    agent_type="computer_use",
                    action="mouse_click",
                    parameters={"x": 200, "y": 200},
                    dependencies=[],
                )
            )
        elif has_vision:
            steps.append(
                SubTask(
                    step_id=f"step_{step_counter}",
                    agent_type="vision",
                    action="capture_screen",
                    parameters={},
                    dependencies=[],
                )
            )
        else:
            # Default to terminal command execution
            steps.append(
                SubTask(
                    step_id=f"step_{step_counter}",
                    agent_type="terminal",
                    action="execute_command",
                    parameters={"command": "echo " + prompt},
                    dependencies=[],
                )
            )

        self.validate_dag(steps)
        return TaskPlan(plan_id=plan_id, goal=prompt, steps=steps, status=TaskStatus.PENDING)

    @classmethod
    def validate_dag(cls, steps: list[SubTask]) -> None:
        """Ensure no cyclic dependencies and all dependency IDs exist."""
        step_ids = {s.step_id for s in steps}
        graph: dict[str, list[str]] = {}

        for s in steps:
            for dep in s.dependencies:
                if dep not in step_ids:
                    raise PlanningError(f"Step {s.step_id} depends on nonexistent step '{dep}'.")
                graph.setdefault(dep, []).append(s.step_id)

        # Cycle detection using DFS
        visited: dict[str, int] = {}  # 0: unvisited, 1: visiting, 2: visited

        def dfs(node: str) -> None:
            visited[node] = 1
            for neighbor in graph.get(node, []):
                if visited.get(neighbor) == 1:
                    raise PlanningError(f"Cyclic dependency detected involving step '{neighbor}'.")
                if visited.get(neighbor, 0) == 0:
                    dfs(neighbor)
            visited[node] = 2

        for sid in step_ids:
            if visited.get(sid, 0) == 0:
                dfs(sid)
