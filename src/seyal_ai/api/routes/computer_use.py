"""
Seyal AI API — Conversational Computer-Use Agent Endpoints.

Provides REST and telemetry endpoints for autonomous computer-use tasks,
live conversational steering, screen element inspection, and emergency controls.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.agent import (
    ConversationalComputerUseAgent,
    UNIVERSAL_CONVO_FALLBACK,
    generate_task_acknowledgment,
)
from seyal_ai.llm.prompts.language_guardrail import (
    get_localized_response,
    get_user_language_profile,
)
from seyal_ai.agents.computer_use.protocol import (
    ActionType,
    AgentStatus,
    ComputerAction,
    SteeringInstruction,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("api.routes.computer_use")

router = APIRouter(prefix="/computer-use", tags=["Conversational Computer Use"])

# Global singleton instance of the computer use agent for live session management
_COMPUTER_USE_AGENT: ConversationalComputerUseAgent | None = None


def get_agent() -> ConversationalComputerUseAgent:
    global _COMPUTER_USE_AGENT
    if _COMPUTER_USE_AGENT is None:
        _COMPUTER_USE_AGENT = ConversationalComputerUseAgent()
    return _COMPUTER_USE_AGENT


class RunGoalRequest(BaseModel):
    goal: str = Field(..., description="The conversational computer-use goal to achieve.")
    max_steps: int = Field(default=20, ge=1, le=50, description="Max iterative steps.")
    auto_confirm: bool = Field(default=False, description="Auto-confirm standard actions.")
    conversation_id: str | None = Field(default=None, description="Optional conversation ID to append to.")


class SteerRequest(BaseModel):
    instruction: str = Field(..., description="Conversational guidance or correction instruction.")
    interrupt: bool = Field(default=True, description="Whether to interrupt current sub-action immediately.")


class DirectActionRequest(BaseModel):
    action_type: str = Field(..., description="Action primitive: click, double_click, right_click, type_text, hotkey, mouse_scroll")
    x: int | None = None
    y: int | None = None
    text: str | None = None
    key: str | None = None
    direction: str = "down"
    amount: int = 3


@router.get("/status")
async def get_computer_use_status() -> dict[str, Any]:
    """Get current status, telemetry, and step history of the computer-use agent."""
    agent = get_agent()
    is_task_running = getattr(agent, "is_task_running", False)
    return {
        "status": str(agent.status),
        "is_task": bool(is_task_running),
        "history_count": len(agent.history),
        "history": [
            {
                "step": s.step_number,
                "thought": s.thought,
                "action": str(s.action.action_type),
                "coordinates": (s.action.x, s.action.y),
                "success": s.success,
                "elapsed_seconds": s.elapsed_seconds,
            }
            for s in agent.history
        ],
    }


async def _persist_computer_use_turn(
    target_conv_id: str,
    goal: str,
    narration: str,
    status: str,
    steps_count: int,
    brain: Any | None = None,
) -> None:
    """Non-blocking background helper to persist computer-use conversation and messages to Supabase."""
    try:
        from sqlalchemy import select
        from seyal_ai.database.engine import get_session
        from seyal_ai.database.models import Session as DBSession, User
        from seyal_ai.database.repositories.conversation import ConversationRepository

        async with get_session() as session:
            repo = ConversationRepository(session)
            conv = await repo.get_conversation(target_conv_id)
            if conv is None:
                user_res = await session.execute(select(User).limit(1))
                db_user = user_res.scalar_one_or_none()
                if db_user is None:
                    db_user = User(name="User")
                    session.add(db_user)
                    await session.flush()

                sess_res = await session.execute(select(DBSession).where(DBSession.user_id == db_user.id).limit(1))
                db_session = sess_res.scalar_one_or_none()
                if db_session is None:
                    db_session = DBSession(user_id=db_user.id)
                    session.add(db_session)
                    await session.flush()

                # Gather existing titles in agent category for strict uniqueness
                all_convs, _ = await repo.list_conversations(offset=0, limit=200)
                existing_titles = {
                    (c.summary or "").replace("[Computer-Use]", "").strip().lower()
                    for c in all_convs
                    if (c.summary or "").startswith("[Computer-Use]")
                }
                from seyal_ai.services.title_service import generate_ai_title_for_first_turn
                clean_initial_title = await generate_ai_title_for_first_turn(
                    first_message=goal,
                    existing_category_titles=existing_titles,
                    brain=brain,
                    is_computer_use=True,
                )
                clean_summary = f"[Computer-Use] {clean_initial_title}"
                conv = await repo.create_conversation(
                    session_id=db_session.id,
                    summary=clean_summary,
                    conversation_id=target_conv_id,
                )

            await repo.add_message(conversation_id=conv.id, role="user", content=goal)
            assistant_content = (
                narration
                or f"Task {status}. {steps_count} autonomous steps executed on Windows."
            )
            await repo.add_message(conversation_id=conv.id, role="assistant", content=assistant_content)
            await session.commit()

            # Trigger periodic dynamic title evaluation in background if due
            from seyal_ai.services.title_service import run_periodic_title_update_if_needed
            await run_periodic_title_update_if_needed(
                conversation_id=conv.id,
                session=session,
                repo=repo,
                brain=brain,
                is_computer_use=True,
            )
    except Exception as db_err:
        log.warning("Computer-Use background database persistence notice: %s", db_err)


@router.post("/run")
async def run_computer_use_goal(
    req: RunGoalRequest,
    background_tasks: BackgroundTasks,
    request: Request,
) -> dict[str, Any]:
    """Start an autonomous conversational computer-use goal or handle stop commands."""
    agent = get_agent()
    goal_lower = req.goal.strip().lower()

    # 1. Check if user sent a cancellation or stop command
    stop_keywords = [
        "stop", "cancel", "halt", "quit", "exit", "stop it", "stop opening", "stop task",
        "niruthu", "niruthappa", "cancel pannu", "stop pannu", "vendaam", "venaam",
    ]
    if any(goal_lower == kw or goal_lower.startswith("stop ") or goal_lower.startswith("cancel ") or goal_lower.startswith("niruthu ") for kw in stop_keywords):
        agent.request_stop()
        agent._status = AgentStatus.IDLE
        mt, kl = get_user_language_profile()
        return {
            "status": "stopped",
            "narration": get_localized_response("stop_operation", mt, kl),
            "conversation_id": req.conversation_id,
            "steps_executed": len(agent.history),
        }

    # 2. If agent is currently busy, gracefully stop the previous task and start the new one
    if agent.status in (AgentStatus.ACTING, AgentStatus.THINKING, AgentStatus.OBSERVING):
        log.info("Agent is busy; auto-stopping prior task to fulfill new goal: %s", req.goal)
        agent.request_stop()
        await asyncio.sleep(0.3)
        agent._status = AgentStatus.IDLE

    # 3. Launch task
    result = await agent.run_goal(goal=req.goal, auto_confirm=req.auto_confirm)

    # 4. Non-blocking background database persistence
    active_conv_id = req.conversation_id or str(uuid.uuid4())
    steps_taken = len(result.get("history", []))
    final_narr = result.get("narration") or ""
    final_status = result.get("status", "completed")
    brain = getattr(request.app.state, "brain", None)

    asyncio.create_task(
        _persist_computer_use_turn(
            target_conv_id=active_conv_id,
            goal=req.goal,
            narration=final_narr,
            status=final_status,
            steps_count=steps_taken,
            brain=brain,
        )
    )

    result["conversation_id"] = active_conv_id
    return result


@router.post("/stream")
async def stream_computer_use_goal(
    req: RunGoalRequest,
    request: Request,
):
    """
    Stream conversational or computer-use responses in real-time using Server-Sent Events (SSE).
    """
    agent = get_agent()
    goal_lower = req.goal.strip().lower()

    # 1. Stop keywords check
    stop_keywords = [
        "stop", "cancel", "halt", "quit", "exit", "stop it", "stop opening", "stop task",
        "niruthu", "niruthappa", "cancel pannu", "stop pannu", "vendaam", "venaam",
    ]
    if any(goal_lower == kw or goal_lower.startswith("stop ") or goal_lower.startswith("cancel ") or goal_lower.startswith("niruthu ") for kw in stop_keywords):
        agent.request_stop()
        agent._status = AgentStatus.IDLE
        mt, kl = get_user_language_profile()
        async def stop_generator():
            data = json.dumps({
                "type": "done",
                "status": "stopped",
                "narration": get_localized_response("stop_operation", mt, kl),
                "conversation_id": req.conversation_id,
                "steps_executed": len(agent.history),
                "is_task": False,
            })
            yield f"data: {data}\n\n"
        return StreamingResponse(stop_generator(), media_type="text/event-stream")

    # 2. Busy handling
    if agent.status in (AgentStatus.ACTING, AgentStatus.THINKING, AgentStatus.OBSERVING):
        log.info("Agent is busy; auto-stopping prior task: %s", req.goal)
        agent.request_stop()
        await asyncio.sleep(0.3)
        agent._status = AgentStatus.IDLE

    active_conv_id = req.conversation_id or str(uuid.uuid4())
    brain = getattr(request.app.state, "brain", None)

    # Classify intent (instantaneous < 0.1ms deterministic routing)
    intent = await agent._classify_intent(req.goal)

    async def sse_generator():
        collected_chunks = []
        if intent in ("CHAT", "CONVERSATION", "CONVERSATION_GREETING"):
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': active_conv_id, 'is_task': False})}\n\n"
            async for chunk in agent.stream_conversational_query(req.goal):
                collected_chunks.append(chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

            full_text = "".join(collected_chunks).strip() or UNIVERSAL_CONVO_FALLBACK
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': active_conv_id, 'narration': full_text, 'is_task': False, 'status': 'completed'})}\n\n"

            # Background persistence & title service
            asyncio.create_task(
                _persist_computer_use_turn(
                    target_conv_id=active_conv_id,
                    goal=req.goal,
                    narration=full_text,
                    status="completed",
                    steps_count=0,
                    brain=brain,
                )
            )
        elif intent == "SYSTEM_WEATHER":
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': active_conv_id, 'is_task': False})}\n\n"
            res = await agent._handle_weather_query(req.goal)
            narr = res.get("narration", "")
            yield f"data: {json.dumps({'type': 'chunk', 'text': narr})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': active_conv_id, 'narration': narr, 'is_task': False, 'status': 'completed'})}\n\n"
            asyncio.create_task(
                _persist_computer_use_turn(
                    target_conv_id=active_conv_id,
                    goal=req.goal,
                    narration=narr,
                    status="completed",
                    steps_count=0,
                    brain=brain,
                )
            )
        elif intent == "SYSTEM_BATTERY":
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': active_conv_id, 'is_task': False})}\n\n"
            res = await agent._handle_battery_query(req.goal)
            narr = res.get("narration", "")
            yield f"data: {json.dumps({'type': 'chunk', 'text': narr})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': active_conv_id, 'narration': narr, 'is_task': False, 'status': 'completed'})}\n\n"
            asyncio.create_task(
                _persist_computer_use_turn(
                    target_conv_id=active_conv_id,
                    goal=req.goal,
                    narration=narr,
                    status="completed",
                    steps_count=0,
                    brain=brain,
                )
            )
        else:
            # OS Task execution
            ack_narration = await generate_task_acknowledgment(req.goal, agent._router)
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': active_conv_id, 'is_task': True})}\n\n"
            yield f"data: {json.dumps({'type': 'ack', 'text': ack_narration})}\n\n"

            result = await agent.run_goal(goal=req.goal, auto_confirm=req.auto_confirm)
            final_narr = result.get("narration") or ack_narration
            steps_taken = len(result.get("history", []))
            final_status = result.get("status", "completed")

            yield f"data: {json.dumps({'type': 'done', 'conversation_id': active_conv_id, 'narration': final_narr, 'is_task': True, 'status': final_status, 'history': result.get('history', []), 'steps_executed': steps_taken})}\n\n"

            asyncio.create_task(
                _persist_computer_use_turn(
                    target_conv_id=active_conv_id,
                    goal=req.goal,
                    narration=final_narr,
                    status=final_status,
                    steps_count=steps_taken,
                    brain=brain,
                )
            )

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/steer")
async def steer_computer_use(req: SteerRequest) -> dict[str, Any]:
    """Inject conversational guidance mid-execution into the active Computer-Use agent."""
    agent = get_agent()
    await agent.steer(SteeringInstruction(instruction=req.instruction, interrupt_current_action=req.interrupt))
    return {
        "status": "steered",
        "instruction": req.instruction,
        "message": "Conversational steering instruction queued successfully.",
    }


@router.post("/stop")
async def stop_computer_use() -> dict[str, Any]:
    """Emergency stop any currently running computer-use operation."""
    agent = get_agent()
    agent.request_stop()
    return {
        "status": "stopped",
        "message": "Emergency stop signal sent to Computer-Use Agent.",
    }


@router.get("/observe")
async def observe_screen_state(tag_elements: bool = True) -> dict[str, Any]:
    """Capture live screen state and Set-of-Marks tagged elements."""
    agent = get_agent()
    obs = await agent.observe(tag_elements=tag_elements)
    return {
        "status": "observed",
        "screen_width": obs.screen_width,
        "screen_height": obs.screen_height,
        "active_window": obs.active_window,
        "detected_elements_count": len(obs.detected_elements),
        "detected_elements": obs.detected_elements,
        "som_base64_image": obs.som_base64_image,
        "base64_image": obs.base64_image,
        "timestamp": obs.timestamp,
    }


@router.post("/action")
async def execute_direct_action(req: DirectActionRequest) -> dict[str, Any]:
    """Directly execute a single low-level computer action without full autonomous loop."""
    try:
        act_type = ActionType(req.action_type)
    except ValueError as err:
        raise HTTPException(
            status_code=400, detail=f"Unsupported action type '{req.action_type}'"
        ) from err

    executor = ComputerActionExecutor()
    action = ComputerAction(
        action_type=act_type,
        x=req.x,
        y=req.y,
        text=req.text,
        key=req.key,
        direction=req.direction,
        amount=req.amount,
    )
    result = await executor.execute(action)
    return result


@router.get("/welcome")
async def get_welcome_greeting(user_name: str = "Friend") -> dict[str, Any]:
    """Generate dynamic, context-aware personalized welcome greeting based on memory and time of day."""
    agent = get_agent()
    greeting = await agent.generate_welcome_greeting(user_name=user_name)
    return {"greeting": greeting}
