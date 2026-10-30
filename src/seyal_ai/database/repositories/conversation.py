"""Backward-compatibility forwarder for `seyal_ai.database.repositories.conversation`.

Canonical location: `seyal_ai.platform.database.repositories.conversation`.
"""

from __future__ import annotations

import sys
from seyal_ai.platform.database.repositories import conversation as _canonical_conv

sys.modules.setdefault("seyal_ai.database.repositories.conversation", _canonical_conv)

for attr in dir(_canonical_conv):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_canonical_conv, attr)
