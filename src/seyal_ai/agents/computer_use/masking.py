"""
Sensitive UI and Credential Field Masking for Computer Use Agent.

Detects password inputs, credential prompts, UAC dialogs, and password managers,
preventing plaintext logging of credentials during GUI automation.
"""

from __future__ import annotations

import re
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.computer_use.masking")

REDACTED_SECRET_PLACEHOLDER: str = "[REDACTED_CREDENTIAL]"

# Sensitive window titles and dialog headers
_SENSITIVE_WINDOW_PATTERNS = [
    re.compile(r"(?i)\b(?:1password|bitwarden|keepass|lastpass|dashlane|enpass)\b"),
    re.compile(r"(?i)\b(?:windows\s+security|user\s+account\s+control|credential\s+manager)\b"),
    re.compile(r"(?i)\b(?:enter\s+password|sign\s+in|login|log\s+in|passcode|pin\s+entry)\b"),
    re.compile(r"(?i)\b(?:sudo|master\s+password|security\s+key|authenticator)\b"),
]

# Sensitive UI control class names or automation types
_SENSITIVE_CONTROL_TYPES = {
    "passwordbox",
    "editpassword",
    "secureedit",
    "password",
    "pin",
}


class SensitiveUIMasker:
    """
    Guards against leaking passwords, PINs, and credentials during GUI automation.
    """

    def is_sensitive_active_window(self, window_title: str | None) -> bool:
        """
        Check if the foreground window title indicates a password prompt or credential manager.
        """
        if not window_title:
            return False
        clean = window_title.strip()
        return any(pat.search(clean) for pat in _SENSITIVE_WINDOW_PATTERNS)

    def is_sensitive_control(self, control_type: str | None, class_name: str | None = None) -> bool:
        """
        Check if the focused control is a password or secure text field.
        """
        ctrl = (control_type or "").strip().lower()
        cls_name = (class_name or "").strip().lower()

        if any(sec in ctrl for sec in _SENSITIVE_CONTROL_TYPES):
            return True
        if any(sec in cls_name for sec in _SENSITIVE_CONTROL_TYPES):
            return True
        return False

    def mask_text(self, text: str | None) -> str:
        """
        Replace sensitive text with safe audit redaction placeholder.
        """
        if not text:
            return ""
        return REDACTED_SECRET_PLACEHOLDER

    def should_mask(
        self,
        active_window_title: str | None = None,
        control_type: str | None = None,
        is_sensitive_flag: bool = False,
    ) -> bool:
        """
        Determine if the current action must be masked.
        """
        if is_sensitive_flag:
            return True
        if self.is_sensitive_active_window(active_window_title):
            return True
        if self.is_sensitive_control(control_type):
            return True
        return False
