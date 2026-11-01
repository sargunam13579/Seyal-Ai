"""Backward-compatibility forwarder for `seyal_ai.security.supabase_auth`.

Canonical location: `seyal_ai.platform.security.supabase_auth`.
"""
from __future__ import annotations
import sys
from seyal_ai.platform.security import supabase_auth as _canonical_module
from seyal_ai.platform.security.supabase_auth import (
    SupabaseUser,
    decode_supabase_jwt,
    get_current_user,
    verify_supabase_token,
)

sys.modules.setdefault("seyal_ai.security.supabase_auth", _canonical_module)

__all__ = [
    "SupabaseUser",
    "decode_supabase_jwt",
    "verify_supabase_token",
    "get_current_user",
]
