"""
Pydantic V2 Request and Response Models for Computer Use Agent.

Strictly enforces recursive immutability, fail-safe exception definitions,
and native GUI automation action specifications.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class AutomationInterruptException(Exception):
    """
    Raised when the user activates the physical fail-safe abort boundary
    by slamming the mouse cursor into any screen corner.
    """


class ComputerUseRequest(BaseModel):
    """
    Immutable specification for an OS GUI automation action.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(
        ...,
        description="The action primitive: 'click', 'double_click', 'right_click', 'move_to', 'drag', 'type_text', 'key_press', 'hotkey', 'wait', 'screenshot'.",
    )
    coordinate: tuple[int, int] | None = Field(
        default=None,
        description="Target (x, y) screen coordinates.",
    )
    target_coordinate: tuple[int, int] | None = Field(
        default=None,
        description="Ending (x, y) coordinates for drag operations.",
    )
    text: str | None = Field(
        default=None,
        description="Text to type or application target name.",
    )
    keys: tuple[str, ...] = Field(
        default_factory=tuple,
        description="Sequence of keys for hotkey or shortcut combinations.",
    )
    button: str = Field(
        default="left",
        description="Mouse button: 'left', 'right', or 'middle'.",
    )
    duration_seconds: float = Field(
        default=0.0,
        ge=0.0,
        le=60.0,
        description="Duration for drag or wait operations.",
    )
    is_sensitive: bool = Field(
        default=False,
        description="Whether this action handles sensitive credentials requiring masking.",
    )

    @field_validator("action_type")
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        allowed = {
            "click",
            "double_click",
            "right_click",
            "middle_click",
            "mouse_down",
            "mouse_up",
            "move_to",
            "drag",
            "type_text",
            "key_press",
            "key_down",
            "key_up",
            "hotkey",
            "wait",
            "screenshot",
        }
        lowered = v.strip().lower()
        if lowered not in allowed:
            raise ValueError(f"Unknown action_type '{v}'. Allowed: {sorted(allowed)}")
        return lowered

    @field_validator("button")
    @classmethod
    def validate_button(cls, v: str) -> str:
        lowered = v.strip().lower()
        if lowered not in ("left", "right", "middle"):
            raise ValueError(f"Unknown button '{v}'. Allowed: left, right, middle")
        return lowered


class ComputerUseResponse(BaseModel):
    """
    Immutable result of an executed GUI automation action.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(..., description="Action that was executed.")
    success: bool = Field(..., description="Whether action executed without errors.")
    message: str = Field(default="", description="Detailed execution feedback or status.")
    coordinate: tuple[int, int] | None = Field(default=None, description="Actual coordinates targeted.")
    duration_ms: float = Field(default=0.0, ge=0.0, description="Action duration in milliseconds.")
    masked: bool = Field(default=False, description="Whether sensitive data was masked during execution.")
    interrupted: bool = Field(default=False, description="Whether execution was aborted by fail-safe interrupt.")
    error: str | None = Field(default=None, description="Error message if action failed or was aborted.")
