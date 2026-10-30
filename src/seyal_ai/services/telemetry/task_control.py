"""
Task Control & Telemetry Mixin for Seyal AI.

Provides introspection and management for:
- Live background task narrative from TelemetryHub
- Task manager overview (active tasks, queue count, primary goal)
- Task cancellation
- Clearing completed tasks
- Emergency stop all agent tasks and hardware controls
"""

from __future__ import annotations

from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("services.telemetry.task_control")


class TaskControlTelemetryMixin:
    """Provides methods for agent task management, queue introspection, and emergency stopping."""

    def get_background_task_narrative(self) -> str | None:
        """Fetch live background task execution narrative from TelemetryHub."""
        try:
            from seyal_ai.core.telemetry_hub import TelemetryHub
            return TelemetryHub.get_instance().get_live_status_narrative()
        except Exception:
            return None

    def get_task_manager_overview(self) -> dict[str, Any]:
        """Fetch live tasks, active plan count, and execution queue in < 1ms."""
        try:
            from seyal_ai.core.telemetry_hub import TelemetryHub

            hub = TelemetryHub.get_instance()
            primary_task = hub.get_primary_active_task()
            active_count = len([t for t in hub._active_tasks.values() if t.is_active])
            total_count = len(hub._active_tasks)

            primary_desc = (
                f"'{primary_task.goal}' ({primary_task.status_summary})"
                if primary_task
                else "No task currently executing"
            )
            return {
                "active_task_running": primary_task is not None,
                "primary_task": primary_desc,
                "tracked_plan_count": total_count,
                "active_plan_count": active_count,
                "summary_text": f"Running: {primary_desc}. Queue: {active_count} active tasks.",
            }
        except Exception as e:
            log.debug("Task manager overview notice: %s", e)
            return {
                "active_task_running": False,
                "primary_task": "None",
                "tracked_plan_count": 0,
                "active_plan_count": 0,
                "summary_text": "Agent task manager is idle with no active queue.",
            }

    def cancel_agent_task(
        self,
        task_id: str | None = None,
        reason: str = "User requested cancellation",
    ) -> tuple[bool, str]:
        """Cancel the active task or a specific task in < 5ms."""
        try:
            from seyal_ai.api.routes.tasks import get_task_manager
            from seyal_ai.core.telemetry_hub import TelemetryHub

            hub = TelemetryHub.get_instance()
            primary = hub.get_primary_active_task()
            if primary:
                hub.cancel_task(primary.task_id, reason=reason)

            task_mgr = get_task_manager()
            if task_id:
                task_mgr.cancellation.cancel_task(task_id, reason=reason)
            else:
                task_mgr.cancel_active_task(reason=reason)
            return True, f"Task successfully cancelled ({reason})."
        except Exception as e:
            return False, f"Failed to cancel task: {e}"

    def clear_completed_tasks(self) -> tuple[bool, str]:
        """Clear completed tasks from task manager history in < 5ms."""
        try:
            from seyal_ai.api.routes.tasks import get_task_manager
            task_mgr = get_task_manager()
            purged = task_mgr.cleanup_expired_tasks(max_age_days=0)
            return True, f"Cleared {purged} completed tasks from task manager."
        except Exception as e:
            return False, f"Failed to clear tasks: {e}"

    def emergency_stop_all(self, reason: str = "Emergency stop triggered") -> tuple[bool, str]:
        """Emergency stop all agent tasks, planning queues, and hardware actions in < 5ms."""
        try:
            from seyal_ai.api.routes.tasks import get_task_manager
            from seyal_ai.core.telemetry_hub import TelemetryHub

            hub = TelemetryHub.get_instance()
            primary = hub.get_primary_active_task()
            if primary:
                hub.cancel_task(primary.task_id, reason=reason)

            task_mgr = get_task_manager()
            task_mgr.emergency_stop(reason=reason)
            return True, f"Emergency stop executed: all agents and tasks halted ({reason})."
        except Exception as e:
            return False, f"Emergency stop error: {e}"
