"""Seyal AI — Brain Name Change Detection."""

from __future__ import annotations

import re

# Regex patterns to detect intent to change the assistant's name
_NAME_CHANGE_PATTERNS = [
    re.compile(
        r"^(?:(?:hey|ok|okay|hi|hello)\s+)?(?:(?P<cur>\w+)[,\s:]+)?(?:from\s+now\s+on\s+)?(?:your\s+name\s+is|change\s+your\s+name\s+to|call\s+yourself|set\s+your\s+name\s+to|rename\s+yourself\s+to)\s+(?P<target>[A-Za-z0-9_-]+)(?:\s+from\s+now\s+on)?[.!?]*$",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?:(?:hey|ok|okay|hi|hello)\s+)?(?:(?P<cur>\w+)[,\s:]+)?(?:i\s+want\s+to\s+call\s+you|please\s+change\s+your\s+name\s+to)\s+(?P<target>[A-Za-z0-9_-]+)(?:\s+from\s+now\s+on)?[.!?]*$",
        re.IGNORECASE,
    ),
]


def detect_name_change_intent(user_input: str, current_name: str) -> str | None:
    """Detect if the user is asking to change the assistant's name.

    Returns:
        The requested new name, or None if no name change requested.
    """
    text = user_input.strip()
    for pattern in _NAME_CHANGE_PATTERNS:
        m = pattern.match(text)
        if m:
            target = m.group("target").strip()
            if target and target.lower() != current_name.lower():
                return target
    return None
