"""Backward-compatibility forwarder for Seyal AI Database Layer.

Canonical location: `seyal_ai.platform.database`.
All submodules and symbols are aliased to the canonical platform database modules
to guarantee 100% object, class, and DeclarativeBase metadata identity.
"""

from __future__ import annotations

import sys
from seyal_ai.platform import database as _canonical_db
from seyal_ai.platform.database import (
    engine as _canonical_engine,
    models as _canonical_models,
    repositories as _canonical_repos,
    sync as _canonical_sync,
)
from seyal_ai.platform.database.repositories import (
    audit as _canonical_audit_repo,
    conversation as _canonical_conv_repo,
)

# 1. Alias all legacy submodule paths directly to canonical platform module instances
sys.modules["seyal_ai.database"] = _canonical_db
sys.modules["seyal_ai.database.engine"] = _canonical_engine
sys.modules["seyal_ai.database.models"] = _canonical_models
sys.modules["seyal_ai.database.sync"] = _canonical_sync
sys.modules["seyal_ai.database.repositories"] = _canonical_repos
sys.modules["seyal_ai.database.repositories.conversation"] = _canonical_conv_repo
sys.modules["seyal_ai.database.repositories.audit"] = _canonical_audit_repo

# 2. Re-export all canonical database attributes for callers importing directly from seyal_ai.database
for attr in dir(_canonical_db):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_canonical_db, attr)
