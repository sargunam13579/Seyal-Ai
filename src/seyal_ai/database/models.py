"""Backward-compatibility forwarder for `seyal_ai.database.models`.

Canonical location: `seyal_ai.platform.database.models`.
All ORM models and DeclarativeBase metadata are re-exported directly
from the canonical location to guarantee 100% object and metadata identity.
"""

from __future__ import annotations

import sys
from seyal_ai.platform.database import models as _canonical_models

sys.modules.setdefault("seyal_ai.database.models", _canonical_models)

for attr in dir(_canonical_models):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_canonical_models, attr)
