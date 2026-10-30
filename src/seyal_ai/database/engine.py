"""Backward-compatibility forwarder for `seyal_ai.database.engine`.

Canonical location: `seyal_ai.platform.database.engine`.
All engine functions and connection factories are re-exported directly.
"""

from __future__ import annotations

import sys
from seyal_ai.platform.database import engine as _canonical_engine

sys.modules.setdefault("seyal_ai.database.engine", _canonical_engine)

for attr in dir(_canonical_engine):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_canonical_engine, attr)
