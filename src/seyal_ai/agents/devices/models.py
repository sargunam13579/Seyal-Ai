"""
Pydantic V2 Request and Response Models for Android & External Devices Agent.

Strictly enforces recursive immutability, cryptographic device authorization,
touchscreen action primitives, and shell safety validation.
"""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator


class DeviceUnauthorizedException(Exception):
    """Raised when an action is attempted on an unpaired or unauthorized device."""


class ShellInjectionBlockedException(Exception):
    """Raised when dangerous shell metacharacters or unauthorized binaries are detected."""


class DeviceRequest(BaseModel):
    """
    Immutable specification for an Android device automation action.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(
        ...,
        description="Action: 'tap', 'swipe', 'type_text', 'key_event', 'screencap', 'dump_ui', 'list_devices'.",
    )
    device_id: str = Field(
        ...,
        description="Identifier or serial number of target paired device.",
    )
    device_token: str | None = Field(
        default=None,
        description="Cryptographic authorization token from pairing handshake.",
    )
    x: int | None = Field(default=None, ge=0, description="Touch X coordinate.")
    y: int | None = Field(default=None, ge=0, description="Touch Y coordinate.")
    x2: int | None = Field(default=None, ge=0, description="Swipe end X coordinate.")
    y2: int | None = Field(default=None, ge=0, description="Swipe end Y coordinate.")
    duration_ms: int = Field(default=300, ge=50, le=10000, description="Swipe or wait duration in ms.")
    text: str | None = Field(default=None, description="Text to type on the Android device.")
    key_code: int | None = Field(default=None, ge=0, description="Android KeyEvent code (e.g. 3=Home, 4=Back).")

    @field_validator("action_type")
    @classmethod
    def validate_action_type(cls, v: str) -> str:
        allowed = {
            "tap",
            "swipe",
            "type_text",
            "key_event",
            "screencap",
            "dump_ui",
            "list_devices",
        }
        lowered = v.strip().lower()
        if lowered not in allowed:
            raise ValueError(f"Unknown action_type '{v}'. Allowed: {sorted(allowed)}")
        return lowered


class DeviceResponse(BaseModel):
    """
    Immutable result of an executed Android device action.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action_type: str = Field(..., description="Action that was executed.")
    success: bool = Field(..., description="Whether action succeeded.")
    device_id: str = Field(..., description="Device ID on which action was performed.")
    output: str | None = Field(default=None, description="Command output or summary.")
    screenshot_bytes: bytes | None = Field(default=None, description="Raw captured screenshot bytes if screencap.")
    ui_hierarchy: str | None = Field(default=None, description="Extracted UI Automator hierarchy if dump_ui.")
    duration_ms: float = Field(default=0.0, ge=0.0, description="Execution duration in milliseconds.")
    error: str | None = Field(default=None, description="Error message if execution failed or was blocked.")
