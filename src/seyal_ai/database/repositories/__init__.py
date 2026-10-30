"""Backward-compatibility forwarder for `seyal_ai.database.repositories`.

Canonical location: `seyal_ai.platform.database.repositories`.
"""

from __future__ import annotations

import sys
from seyal_ai.platform.database import repositories as _canonical_repos

sys.modules.setdefault("seyal_ai.database.repositories", _canonical_repos)

for attr in dir(_canonical_repos):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_canonical_repos, attr)
