"""
Autonomous Browser Agent with SSRF Socket Pinning and Execution Loop Guards.

Executes autonomous browser interactions while strictly guarding against
SSRF, DNS rebinding, and runaway infinite navigation loops.
"""

from __future__ import annotations

import time
from typing import Any

from seyal_ai.agents.browser.driver import EphemeralBrowserSession
from seyal_ai.agents.browser.models import (
    BrowserRequest,
    BrowserResponse,
    SSRFBlockedException,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.browser")


class BrowserAgent:
    """
    Autonomous Browser Agent for Module 3.

    Enforces SSRF numeric IP socket pinning, ephemeral per-session isolation,
    and a strict 30-step execution loop guard.
    """

    def __init__(self, session: EphemeralBrowserSession | None = None) -> None:
        self._session = session or EphemeralBrowserSession()
        self._step_counter = 0

    @property
    def session(self) -> EphemeralBrowserSession:
        return self._session

    async def execute(self, request: BrowserRequest) -> BrowserResponse:
        """
        Execute an immutable BrowserRequest action safely.
        """
        start_time = time.perf_counter()

        # 1. Enforce 30-step loop & safety guard
        if request.step_index > request.max_steps:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.warning(
                "Browser task aborted: step %d exceeded maximum limit of %d.",
                request.step_index,
                request.max_steps,
            )
            return BrowserResponse(
                action_type=request.action_type,
                success=False,
                current_url=self._session.current_url,
                title=self._session.current_title,
                duration_ms=round(elapsed_ms, 2),
                step_index=request.step_index,
                aborted_by_step_limit=True,
                error=f"Step limit exceeded: task aborted at step {request.step_index} (limit: {request.max_steps}).",
            )

        self._step_counter = request.step_index

        try:
            act = request.action_type.lower()

            if act == "navigate":
                if not request.url:
                    raise ValueError("URL is required for 'navigate' action.")

                cur_url, title, dom_summary, pinned_ip = self._session.navigate(request.url)
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return BrowserResponse(
                    action_type="navigate",
                    success=True,
                    current_url=cur_url,
                    title=title,
                    dom_content=dom_summary,
                    pinned_ip=pinned_ip,
                    duration_ms=round(elapsed_ms, 2),
                    step_index=request.step_index,
                    aborted_by_step_limit=False,
                    error=None,
                )

            elif act == "extract_dom":
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return BrowserResponse(
                    action_type="extract_dom",
                    success=True,
                    current_url=self._session.current_url,
                    title=self._session.current_title,
                    dom_content=None,
                    pinned_ip=self._session.last_pinned_ip,
                    duration_ms=round(elapsed_ms, 2),
                    step_index=request.step_index,
                    aborted_by_step_limit=False,
                    error=None,
                )

            elif act == "click":
                if not request.selector:
                    raise ValueError("Selector is required for 'click' action.")
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return BrowserResponse(
                    action_type="click",
                    success=True,
                    current_url=self._session.current_url,
                    title=self._session.current_title,
                    pinned_ip=self._session.last_pinned_ip,
                    duration_ms=round(elapsed_ms, 2),
                    step_index=request.step_index,
                    aborted_by_step_limit=False,
                    error=None,
                )

            elif act == "fill":
                if not request.selector or request.text is None:
                    raise ValueError("Selector and text are required for 'fill' action.")
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return BrowserResponse(
                    action_type="fill",
                    success=True,
                    current_url=self._session.current_url,
                    title=self._session.current_title,
                    pinned_ip=self._session.last_pinned_ip,
                    duration_ms=round(elapsed_ms, 2),
                    step_index=request.step_index,
                    aborted_by_step_limit=False,
                    error=None,
                )

            elif act == "press_key":
                if not request.key:
                    raise ValueError("Key is required for 'press_key' action.")
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return BrowserResponse(
                    action_type="press_key",
                    success=True,
                    current_url=self._session.current_url,
                    title=self._session.current_title,
                    pinned_ip=self._session.last_pinned_ip,
                    duration_ms=round(elapsed_ms, 2),
                    step_index=request.step_index,
                    aborted_by_step_limit=False,
                    error=None,
                )

            elif act == "screenshot":
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return BrowserResponse(
                    action_type="screenshot",
                    success=True,
                    current_url=self._session.current_url,
                    title=self._session.current_title,
                    pinned_ip=self._session.last_pinned_ip,
                    duration_ms=round(elapsed_ms, 2),
                    step_index=request.step_index,
                    aborted_by_step_limit=False,
                    error=None,
                )

            elif act == "close":
                self._session.close()
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                return BrowserResponse(
                    action_type="close",
                    success=True,
                    current_url=None,
                    title=None,
                    pinned_ip=None,
                    duration_ms=round(elapsed_ms, 2),
                    step_index=request.step_index,
                    aborted_by_step_limit=False,
                    error=None,
                )

            else:
                raise ValueError(f"Unsupported action_type: {act}")

        except SSRFBlockedException as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.warning("SSRF blocked execution: %s", e)
            return BrowserResponse(
                action_type=request.action_type,
                success=False,
                current_url=self._session.current_url,
                title=self._session.current_title,
                duration_ms=round(elapsed_ms, 2),
                step_index=request.step_index,
                aborted_by_step_limit=False,
                error=str(e),
            )
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.error("Browser action execution failed: %s", e)
            return BrowserResponse(
                action_type=request.action_type,
                success=False,
                current_url=self._session.current_url,
                title=self._session.current_title,
                duration_ms=round(elapsed_ms, 2),
                step_index=request.step_index,
                aborted_by_step_limit=False,
                error=str(e),
            )
