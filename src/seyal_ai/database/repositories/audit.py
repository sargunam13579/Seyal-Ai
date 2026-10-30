"""Backward-compatibility forwarder for `seyal_ai.database.repositories.audit`.

Canonical location: `seyal_ai.platform.database.repositories.audit`.
"""

from __future__ import annotations

import sys
from seyal_ai.platform.database.repositories import audit as _canonical_audit

sys.modules.setdefault("seyal_ai.database.repositories.audit", _canonical_audit)

for attr in dir(_canonical_audit):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_canonical_audit, attr)
