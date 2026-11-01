"""Backward-compatibility forwarder for `seyal_ai.security.redaction`.

Canonical location: `seyal_ai.platform.security.redaction`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import redaction as _canonical_module
from seyal_ai.platform.security.redaction import REDACTED_STR, sanitize_payload

sys.modules.setdefault("seyal_ai.security.redaction", _canonical_module)

__all__ = ["REDACTED_STR", "sanitize_payload"]
