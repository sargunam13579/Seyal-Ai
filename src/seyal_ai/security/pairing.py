"""Backward-compatibility forwarder for `seyal_ai.security.pairing`.

Canonical location: `seyal_ai.platform.security.pairing`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import pairing as _canonical_module
from seyal_ai.platform.security.pairing import (
    DevicePairingManager,
    PairedDevice,
    PairingSession,
)

sys.modules.setdefault("seyal_ai.security.pairing", _canonical_module)

__all__ = ["DevicePairingManager", "PairedDevice", "PairingSession"]
