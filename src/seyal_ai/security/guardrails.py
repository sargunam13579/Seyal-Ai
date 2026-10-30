"""
Seyal AI Security Guardrails & Safety Policy Enforcer.

Enforces system boundaries, protected application boundaries (e.g. Bitwarden, 1Password, Banking),
blacklisted directories (e.g. System32), and self-preservation policies.
Persists settings to disk (~/.seyal_ai/safety.json).
"""

from __future__ import annotations

import json
import os
import platform
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.utils.logging import get_logger

log = get_logger("security.guardrails")


class SafetySettings(BaseModel):
    """Configuration for system guardrails and sensitive boundaries."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    profile: str = Field(
        default="balanced",
        description="Active safety profile: 'zero_trust', 'balanced', 'developer'",
    )
    require_confirm_delete: bool = Field(
        default=True,
        description="Whether file or directory deletion requires confirmation.",
    )
    require_confirm_terminal: bool = Field(
        default=True,
        description="Whether running modifying terminal commands requires confirmation.",
    )
    block_payment_gateways: bool = Field(
        default=True,
        description="Whether payment portals and checkout windows are blocked.",
    )
    prevent_self_kill: bool = Field(
        default=True,
        description="Whether closing or killing Seyal AI processes is blocked.",
    )
    credential_protection: bool = Field(
        default=True,
        description="Whether password managers and credential vaults are blocked.",
    )
    mask_api_keys: bool = Field(
        default=True,
        description="Whether API keys are masked in logs and telemetry.",
    )
    mask_credit_cards: bool = Field(
        default=True,
        description="Whether credit card patterns are masked.",
    )
    mask_passwords: bool = Field(
        default=True,
        description="Whether password strings are masked.",
    )
    confirmation_timeout_sec: int = Field(
        default=30,
        description="Timeout for user confirmation prompts in seconds.",
    )
    blacklist_paths: list[str] = Field(
        default_factory=lambda: [
            "C:\\Windows\\System32",
            "C:\\Program Files",
            "C:\\Windows\\SysWOW64",
        ],
        description="Filesystem paths protected from modification or access.",
    )
    safe_workspaces: list[str] = Field(
        default_factory=lambda: [
            "D:\\projects",
            "C:\\Users\\Public\\Workspace",
        ],
        description="Designated unrestricted workspaces for project development.",
    )
    blocked_applications: list[str] = Field(
        default_factory=lambda: [
            "Bitwarden",
            "1Password",
            "KeePass",
            "Personal Banking Tab",
        ],
        description="Applications and window titles that autonomous agents cannot touch.",
    )


def _get_windows_foreground_window_title() -> str:
    """Retrieve the title of the current active foreground window on Windows."""
    if platform.system() != "Windows":
        return ""
    try:
        import ctypes

        hwnd = ctypes.windll.user32.GetForegroundWindow()
        if not hwnd:
            return ""
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buff = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buff, length + 1)
            return buff.value
    except Exception:
        pass
    return ""


class SafetyGuardrailsManager:
    """Enforces safety guardrails across autonomous computer use actions."""

    def __init__(self, storage_path: Path | str | None = None) -> None:
        if storage_path is not None:
            self._storage_path = Path(storage_path)
        else:
            self._storage_path = Path.home() / ".seyal_ai" / "safety.json"

        self._settings = self._load()

    @property
    def settings(self) -> SafetySettings:
        return self._settings

    def _load(self) -> SafetySettings:
        """Load safety settings from disk or return default settings."""
        if self._storage_path.exists():
            try:
                data = json.loads(self._storage_path.read_text(encoding="utf-8"))
                return SafetySettings(**data)
            except Exception as err:
                log.warning("Could not read safety config from %s: %s", self._storage_path, err)

        cfg = SafetySettings()
        self._save(cfg)
        return cfg

    def _save(self, cfg: SafetySettings) -> None:
        """Persist safety settings to disk."""
        try:
            self._storage_path.parent.mkdir(parents=True, exist_ok=True)
            self._storage_path.write_text(
                json.dumps(cfg.model_dump(by_alias=True), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as err:
            log.error("Failed to save safety settings to %s: %s", self._storage_path, err)

    def get_settings(self) -> SafetySettings:
        return self._settings

    def update_settings(self, new_settings: SafetySettings | dict[str, Any]) -> SafetySettings:
        if isinstance(new_settings, dict):
            self._settings = SafetySettings(**new_settings)
        else:
            self._settings = new_settings
        self._save(self._settings)
        log.info("Updated safety guardrails: profile=%s", self._settings.profile)
        return self._settings

    def is_application_blocked(self, target_name: str) -> tuple[bool, str | None]:
        """Check if an application name or window title matches blocked applications."""
        if not target_name:
            return False, None

        lower_target = target_name.lower().strip()
        for blocked in self._settings.blocked_applications:
            b_clean = blocked.lower().strip()
            if b_clean and (b_clean in lower_target or lower_target in b_clean):
                return True, f"Application or window '{target_name}' matches protected boundary '{blocked}'"

        return False, None

    def is_path_blacklisted(self, path: str) -> tuple[bool, str | None]:
        """Check if a path falls under protected system directories."""
        if not path:
            return False, None

        norm_path = os.path.normpath(path).lower()
        for bpath in self._settings.blacklist_paths:
            norm_bpath = os.path.normpath(bpath).lower()
            if norm_path.startswith(norm_bpath) or norm_bpath in norm_path:
                return True, f"Path '{path}' is inside blacklisted system directory '{bpath}'"

        return False, None

    def check_action_safety(
        self,
        action: ComputerAction,
        active_window_title: str | None = None,
    ) -> tuple[bool, str]:
        """
        Validate whether a ComputerAction is safe to execute.

        Returns:
            (is_safe, reason_or_status)
        """
        act_type = action.action_type

        # 1. Target Application Launch Check (OPEN_APP)
        if act_type == ActionType.OPEN_APP:
            app_target = (action.app_name or action.text or "").strip()
            # Check blocked applications
            blocked, b_reason = self.is_application_blocked(app_target)
            if blocked:
                log.warning("Safety guardrail triggered: %s", b_reason)
                return False, f"Safety Guardrail: {b_reason}."

            # Check blacklisted paths
            path_blocked, p_reason = self.is_path_blacklisted(app_target)
            if path_blocked:
                log.warning("Safety guardrail triggered: %s", p_reason)
                return False, f"Safety Guardrail: {p_reason}."

        # 2. Self-Preservation / Anti-Kill Check (WINDOW_CLOSE)
        if act_type == ActionType.WINDOW_CLOSE and self._settings.prevent_self_kill:
            target_close = (action.app_name or action.text or "").lower()
            if any(k in target_close for k in ("seyal", "seyal_ai", "antigravity")):
                return False, "Safety Guardrail: Closing Seyal AI is blocked by self-preservation policy."

        # 3. Active Window Boundary Check for Interactive Input
        # (CLICK, DOUBLE_CLICK, RIGHT_CLICK, MIDDLE_CLICK, TYPE_TEXT, HOTKEY, KEY_PRESS, CLIPBOARD_PASTE)
        interactive_types = {
            ActionType.CLICK,
            ActionType.DOUBLE_CLICK,
            ActionType.RIGHT_CLICK,
            ActionType.MIDDLE_CLICK,
            ActionType.TYPE_TEXT,
            ActionType.CLIPBOARD_PASTE,
            ActionType.KEY_PRESS,
            ActionType.HOTKEY,
        }
        if act_type in interactive_types:
            win_title = active_window_title or _get_windows_foreground_window_title()
            if win_title:
                blocked, b_reason = self.is_application_blocked(win_title)
                if blocked:
                    log.warning("Safety guardrail triggered on active window: %s", b_reason)
                    return False, f"Safety Guardrail: Active window '{win_title}' is protected. Action '{act_type}' blocked."

        # 4. Destructive terminal deletion checks in typed commands
        if act_type in (ActionType.TYPE_TEXT, ActionType.CLIPBOARD_PASTE) and action.text:
            t = action.text.lower()
            if ("rmdir /s" in t or "del /f" in t or "rm -rf" in t) and any(
                bp.lower() in t for bp in self._settings.blacklist_paths
            ):
                return False, "Safety Guardrail: Destructive file command targeting blacklisted directory blocked."

        return True, "Allowed"


_singleton_guardrails: SafetyGuardrailsManager | None = None


def get_safety_guardrails() -> SafetyGuardrailsManager:
    global _singleton_guardrails
    if _singleton_guardrails is None:
        _singleton_guardrails = SafetyGuardrailsManager()
    return _singleton_guardrails
