"""
Seyal AI API — Desktop Application Automation Endpoints.

Provides REST endpoints for:
- Active desktop application detection
- Desktop element interaction & hotkeys
- Window scrolling
- Multi-step workflow execution (e.g. search + download + file)
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from seyal_ai.automation.app_controller import DesktopAppController
from seyal_ai.automation.ui_interaction import DesktopUIInteraction
from seyal_ai.automation.workflow import MultiStepWorkflowEngine
from seyal_ai.vision.ui_detector import UIElementDetector

router = APIRouter(prefix="/automation", tags=["Desktop Automation"])

_app_ctrl = DesktopAppController()
_ui_interact = DesktopUIInteraction(app_controller=_app_ctrl)
_detector = UIElementDetector()
_workflow_engine = MultiStepWorkflowEngine()


class InteractAppRequest(BaseModel):
    element_name: str | None = None
    hotkey: str | None = None
    app_name: str | None = None


class ScrollAppRequest(BaseModel):
    direction: str = "down"
    clicks: int = 5


class WorkflowExecutionRequest(BaseModel):
    task_type: str = Field(description="'search_and_read' or 'search_and_download'")
    query: str
    file_extension: str = "pdf"
    destination_folder: str = "Documents"


@router.get("/app/active")
async def get_active_app() -> dict[str, Any]:
    """Get metadata about current active desktop application."""
    active = _app_ctrl.get_active_app()
    if not active:
        return {"active": False, "message": "No active window detected"}
    return {
        "active": True,
        "name": active.name,
        "window_title": active.window_title,
        "pid": active.pid,
        "bounds": {
            "x": active.x,
            "y": active.y,
            "width": active.width,
            "height": active.height,
        },
    }


@router.post("/app/interact")
async def interact_app(req: InteractAppRequest) -> dict[str, Any]:
    """Interact with active desktop app via element click or hotkey."""
    if req.app_name:
        _app_ctrl.focus_app(req.app_name)

    if req.element_name:
        success = _ui_interact.click_element(req.element_name)
        if not success:
            raise HTTPException(
                status_code=400, detail=f"Could not click element '{req.element_name}'"
            )
        return {"success": True, "action": "click", "target": req.element_name}

    if req.hotkey:
        keys = [k.strip().lower() for k in req.hotkey.split("+")]
        success = _ui_interact.send_hotkey(*keys)
        if not success:
            raise HTTPException(status_code=400, detail=f"Could not send hotkey '{req.hotkey}'")
        return {"success": True, "action": "hotkey", "hotkey": req.hotkey}

    raise HTTPException(
        status_code=400, detail="Must provide 'element_name', 'hotkey', or 'app_name'"
    )


@router.post("/app/scroll")
async def scroll_app(req: ScrollAppRequest) -> dict[str, Any]:
    """Scroll active desktop application."""
    success = _ui_interact.scroll(direction=req.direction, clicks=req.clicks)
    return {"success": success, "direction": req.direction, "clicks": req.clicks}


@router.post("/workflow/execute")
async def execute_workflow(req: WorkflowExecutionRequest) -> dict[str, Any]:
    """Execute end-to-end multi-step workflow."""
    if req.task_type == "search_and_read":
        res = await _workflow_engine.execute_web_search_and_read(query=req.query)
    elif req.task_type == "search_and_download":
        res = await _workflow_engine.execute_search_download_and_file(
            search_query=req.query,
            file_extension=req.file_extension,
            destination_folder=req.destination_folder,
        )
    else:
        raise HTTPException(status_code=400, detail=f"Invalid task_type: '{req.task_type}'")

    return {
        "success": res.success,
        "summary": res.summary,
        "steps": [
            {
                "number": s.step_number,
                "name": s.name,
                "status": s.status,
                "output": s.output,
                "error": s.error,
            }
            for s in res.steps
        ],
        "data": res.final_data,
    }


# ---------------------------------------------------------------------------
# Persistent Automations & Scheduled Routines
# ---------------------------------------------------------------------------

@router.get("/routines", summary="List all persistent automation routines")
async def list_automation_routines() -> dict[str, Any]:
    """Retrieve all scheduled and on-demand automation routines."""
    from seyal_ai.automation.scheduler import get_automation_scheduler
    scheduler = get_automation_scheduler()
    routines = scheduler.load_routines()
    return {"success": True, "routines": [r.model_dump() for r in routines]}


@router.post("/routines", summary="Create or update an automation routine")
async def save_automation_routine(routine_data: dict[str, Any]) -> dict[str, Any]:
    """Save an automation routine to disk."""
    from seyal_ai.automation.scheduler import AutomationRoutine, get_automation_scheduler
    scheduler = get_automation_scheduler()
    routines = scheduler.load_routines()

    new_r = AutomationRoutine(**routine_data)
    idx = next((i for i, r in enumerate(routines) if r.id == new_r.id), None)
    if idx is not None:
        routines[idx] = new_r
    else:
        routines.append(new_r)

    scheduler.save_routines(routines)
    return {"success": True, "routine": new_r.model_dump()}


@router.post("/routines/{routine_id}/run", summary="Run an automation routine immediately")
async def run_automation_routine(routine_id: str) -> dict[str, Any]:
    """Trigger immediate execution of a scheduled routine."""
    from seyal_ai.automation.scheduler import get_automation_scheduler
    scheduler = get_automation_scheduler()
    result = await scheduler.run_routine(routine_id)
    return result


@router.post("/routines/{routine_id}/toggle", summary="Toggle automation routine enabled state")
async def toggle_automation_routine(routine_id: str, payload: dict[str, bool]) -> dict[str, Any]:
    """Toggle enabled status of an automation routine."""
    from seyal_ai.automation.scheduler import get_automation_scheduler
    scheduler = get_automation_scheduler()
    routines = scheduler.load_routines()
    target = next((r for r in routines if r.id == routine_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Routine not found")

    target.enabled = payload.get("enabled", not target.enabled)
    scheduler.save_routines(routines)
    return {"success": True, "routine": target.model_dump()}

