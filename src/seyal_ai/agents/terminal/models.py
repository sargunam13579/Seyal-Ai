"""
Pydantic V2 Request and Response Models for Terminal Agent.

Strictly enforces recursive immutability, schema validation,
and clean boundary encapsulation.
"""

from __future__ import annotations

from collections.abc import Mapping
from types import MappingProxyType
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TerminalRequest(BaseModel):
    """
    Immutable specification for a terminal command execution request.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    command: str = Field(..., min_length=1, description="The CLI command to execute.")
    working_dir: str | None = Field(default=None, description="Working directory path for execution.")
    timeout_seconds: float = Field(default=30.0, ge=0.1, le=120.0, description="Execution timeout in seconds.")
    env_vars: Mapping[str, str] = Field(
        default_factory=dict,
        description="Optional environment variables injected into the subprocess.",
    )

    @field_validator("command")
    @classmethod
    def validate_command(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Command cannot be empty or whitespace only.")
        return stripped

    @field_validator("env_vars", mode="after")
    @classmethod
    def ensure_immutable_env(cls, v: Any) -> Mapping[str, str]:
        if isinstance(v, MappingProxyType):
            return v
        if isinstance(v, dict):
            return MappingProxyType(dict(v))
        return MappingProxyType(dict(v))


class TerminalResponse(BaseModel):
    """
    Immutable specification for a terminal command execution result.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    command: str = Field(..., description="The command that was executed or evaluated.")
    exit_code: int = Field(..., description="Process return code (0 for success, non-zero for error, -1 for timeout).")
    stdout: str = Field(default="", description="Captured standard output.")
    stderr: str = Field(default="", description="Captured standard error.")
    is_truncated: bool = Field(default=False, description="Whether output exceeded maximum buffer size and was truncated.")
    duration_ms: float = Field(default=0.0, ge=0.0, description="Execution duration in milliseconds.")
    safety_status: str = Field(default="allowed", description="Safety classification: 'allowed', 'blocked', 'confirmation_required', 'timeout'.")
    error: str | None = Field(default=None, description="Error message if execution failed, timed out, or was blocked.")
