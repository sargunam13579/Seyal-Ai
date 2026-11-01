"""
Pydantic V2 Request and Response Models for Autonomous Browser Agent.

Strictly enforces recursive immutability, SSRF exception definitions,
and browser navigation/interaction action primitives.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SSRFBlockedException(Exception):
    """
    Raised when a requested URL resolves to a prohibited internal, loopback,
    private, or cloud-metadata IP address.
    """


class BrowserRequest(BaseModel):
    """
    Immutable specification for a browser navigation or interaction action.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(
        ...,
        description="Browser action: 'navigate', 'click', 'fill', 'press_key', 'extract_dom', 'screenshot', 'close'.",
    )
    url: str | None = Field(
        default=None,
        description="Target web URL for navigation.",
    )
    selector: str | None = Field(
        default=None,
        description="CSS or text selector for click/fill interaction.",
    )
    text: str | None = Field(
        default=None,
        description="Text to fill into an input field.",
    )
    key: str | None = Field(
        default=None,
        description="Keyboard key to press (e.g. 'Enter', 'Tab').",
    )
    session_id: str | None = Field(
        default=None,
        description="Unique session identifier for ephemeral context isolation.",
    )
    step_index: int = Field(
        default=1,
        ge=1,
        description="Current sequential step count in this browser task.",
    )
    max_steps: int = Field(
        default=30,
        ge=1,
        le=100,
        description="Maximum allowed steps before task is aborted to prevent infinite loops.",
    )

    @field_validator("action_type")
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        allowed = {
            "navigate",
            "click",
            "fill",
            "press_key",
            "extract_dom",
            "screenshot",
            "close",
        }
        lowered = v.strip().lower()
        if lowered not in allowed:
            raise ValueError(f"Unknown action_type '{v}'. Allowed: {sorted(allowed)}")
        return lowered

    @field_validator("url")
    @classmethod
    def validate_url_scheme(cls, v: str | None) -> str | None:
        if v is None:
            return None
        clean = v.strip()
        lowered = clean.lower()
        if not (lowered.startswith("http://") or lowered.startswith("https://")):
            raise ValueError(f"Invalid URL scheme in '{v}'. Only 'http://' and 'https://' are allowed.")
        return clean


class BrowserResponse(BaseModel):
    """
    Immutable result of an executed browser action.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(..., description="Action that was executed.")
    success: bool = Field(..., description="Whether action succeeded.")
    current_url: str | None = Field(default=None, description="Current page URL after execution.")
    title: str | None = Field(default=None, description="Current page title.")
    dom_content: str | None = Field(default=None, description="Extracted compact semantic DOM.")
    pinned_ip: str | None = Field(default=None, description="Verified numeric IP pinned for this request.")
    duration_ms: float = Field(default=0.0, ge=0.0, description="Execution duration in milliseconds.")
    step_index: int = Field(default=1, description="Step index that was executed.")
    aborted_by_step_limit: bool = Field(default=False, description="Whether execution was aborted by 30-step loop guard.")
    error: str | None = Field(default=None, description="Error message if action failed or was blocked.")
