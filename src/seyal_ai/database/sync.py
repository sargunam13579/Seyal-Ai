"""Backward-compatibility forwarder for `seyal_ai.database.sync`.

Canonical location: `seyal_ai.platform.database.sync`.
All sync managers and functions are re-exported directly from the canonical location.
"""

from __future__ import annotations

import sys
from seyal_ai.platform.database import sync as _canonical_sync

sys.modules.setdefault("seyal_ai.database.sync", _canonical_sync)

for attr in dir(_canonical_sync):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_canonical_sync, attr)
