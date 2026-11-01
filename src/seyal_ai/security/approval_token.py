"""
RFC 8785 JSON Canonicalization Scheme (JCS) and Ed25519 Approval Token Subsystem.

Provides cryptographic verification for Human-in-the-Loop high-risk action authorizations.
Ensures tokens cannot be tampered with, forged, or replayed.
"""

from __future__ import annotations

import base64
import hashlib
import json
import math
import time
from typing import Any
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)
from pydantic import BaseModel, ConfigDict, Field, field_validator

from seyal_ai.utils.logging import get_logger

log = get_logger("security.approval_token")


class TokenSecurityError(Exception):
    """Base exception for approval token security failures."""


class TokenExpiredError(TokenSecurityError):
    """Raised when an approval token has passed its expiration timestamp."""


class TokenNotYetValidError(TokenSecurityError):
    """Raised when an approval token timestamp is in the future beyond clock drift."""


class TokenTamperedError(TokenSecurityError):
    """Raised when the cryptographic signature or payload does not match."""


def jcs_canonicalize(obj: Any) -> bytes:
    """
    Serialize Python data structure to RFC 8785 Canonical JSON bytes.

    Invariants:
    1. Whitespace: No whitespace outside string literals.
    2. Object keys: Sorted strictly by UTF-16 code units (RFC 8785 Section 3.2.3).
    3. String escaping: Only \\, \", and control characters 0x00-0x1F escaped.
    4. Numbers: IEEE 754 representation (integers formatted without decimals, no NaN/Infinity).
    5. Output: UTF-8 encoded bytes.
    """
    if obj is None:
        return b"null"
    elif isinstance(obj, bool):
        return b"true" if obj else b"false"
    elif isinstance(obj, int) and not isinstance(obj, bool):
        return str(obj).encode("ascii")
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            raise ValueError("NaN and Infinity are not permitted in RFC 8785 JSON.")
        if obj == 0.0:
            return b"0"
        # Standard compact float representation
        s = repr(obj)
        if s.endswith(".0"):
            s = s[:-2]
        return s.encode("ascii")
    elif isinstance(obj, str):
        # Escape string according to RFC 8785
        return _escape_jcs_string(obj)
    elif isinstance(obj, (list, tuple)):
        items = [jcs_canonicalize(item) for item in obj]
        return b"[" + b",".join(items) + b"]"
    elif isinstance(obj, dict):
        # Sort keys by UTF-16 code units
        sorted_keys = sorted(obj.keys(), key=lambda k: str(k).encode("utf-16-be"))
        members = []
        for k in sorted_keys:
            key_bytes = _escape_jcs_string(str(k))
            val_bytes = jcs_canonicalize(obj[k])
            members.append(key_bytes + b":" + val_bytes)
        return b"{" + b",".join(members) + b"}"
    else:
        raise TypeError(f"Type {type(obj)} is not serializable to RFC 8785 JSON.")


def _escape_jcs_string(s: str) -> bytes:
    """Escape string according to RFC 8785 Section 3.2.2.2."""
    out = ['"']
    for char in s:
        code = ord(char)
        if char == '"':
            out.append(r'\"')
        elif char == '\\':
            out.append(r'\\')
        elif char == '\b':
            out.append(r'\b')
        elif char == '\f':
            out.append(r'\f')
        elif char == '\n':
            out.append(r'\n')
        elif char == '\r':
            out.append(r'\r')
        elif char == '\t':
            out.append(r'\t')
        elif code < 0x20:
            out.append(f"\\u{code:04x}")
        else:
            out.append(char)
    out.append('"')
    return "".join(out).encode("utf-8")


def compute_target_hash(parameters: dict[str, Any]) -> str:
    """Compute SHA-256 hash over canonical JSON representation of action parameters."""
    canon = jcs_canonicalize(parameters)
    return hashlib.sha256(canon).hexdigest()


class ApprovalTokenPayload(BaseModel):
    """
    Immutable signed payload for authorization tokens.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    action: str = Field(..., description="Action name, e.g., 'execute_command', 'wipe_device'.")
    target_hash: str = Field(..., description="SHA-256 of canonical action parameters.")
    risk_level: str = Field(..., description="Risk tier: 'critical' or 'high'.")
    nonce: str = Field(..., description="Single-use random nonce (UUID4 or hex).")
    issued_at: float = Field(..., description="Unix timestamp when token was created.")
    expires_at: float = Field(..., description="Unix timestamp when token expires.")
    supervisor_id: str = Field(..., description="Unique identifier of supervisor host.")

    @field_validator("risk_level")
    @classmethod
    def validate_risk(cls, v: str) -> str:
        lowered = v.strip().lower()
        if lowered not in {"critical", "high"}:
            raise ValueError(f"Invalid risk_level: {v}. Must be 'critical' or 'high'.")
        return lowered


class ApprovalTokenManager:
    """
    Issues and verifies Ed25519-signed RFC 8785 Approval Tokens.
    """

    @classmethod
    def generate_keypair(cls) -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
        """Generate a new Ed25519 private/public keypair."""
        priv = Ed25519PrivateKey.generate()
        pub = priv.public_key()
        return priv, pub

    @classmethod
    def create_token(
        cls,
        payload: ApprovalTokenPayload,
        private_key: Ed25519PrivateKey,
    ) -> str:
        """
        Create a base64url-encoded signed token string:
        `<base64url(jcs_payload)>.<base64url(ed25519_signature)>`
        """
        payload_dict = payload.model_dump()
        payload_bytes = jcs_canonicalize(payload_dict)
        signature = private_key.sign(payload_bytes)

        enc_payload = base64.urlsafe_b64encode(payload_bytes).decode("ascii").rstrip("=")
        enc_sig = base64.urlsafe_b64encode(signature).decode("ascii").rstrip("=")
        return f"{enc_payload}.{enc_sig}"

    @classmethod
    def verify_token(
        cls,
        token: str,
        public_key: Ed25519PublicKey,
        expected_action: str | None = None,
        expected_target_hash: str | None = None,
        clock_drift_tolerance: float = 5.0,
    ) -> ApprovalTokenPayload:
        """
        Verify the Ed25519 signature, expiration, and payload contents.
        Raises TokenSecurityError on failure.
        """
        parts = token.strip().split(".")
        if len(parts) != 2:
            raise TokenTamperedError("Invalid token format: must be <payload>.<signature>")

        enc_payload, enc_sig = parts

        # Decode payload
        try:
            pad_payload = enc_payload + "=" * (-len(enc_payload) % 4)
            payload_bytes = base64.urlsafe_b64decode(pad_payload)
        except Exception as e:
            raise TokenTamperedError(f"Corrupt base64url payload: {e}")

        # Decode signature
        try:
            pad_sig = enc_sig + "=" * (-len(enc_sig) % 4)
            sig_bytes = base64.urlsafe_b64decode(pad_sig)
        except Exception as e:
            raise TokenTamperedError(f"Corrupt base64url signature: {e}")

        # Verify Ed25519 signature
        try:
            public_key.verify(sig_bytes, payload_bytes)
        except InvalidSignature:
            raise TokenTamperedError("Ed25519 signature verification failed: token has been forged or modified.")

        # Parse JSON
        try:
            raw_dict = json.loads(payload_bytes.decode("utf-8"))
            payload = ApprovalTokenPayload.model_validate(raw_dict)
        except Exception as e:
            raise TokenTamperedError(f"Token payload violates schema: {e}")

        # Verify timestamps
        now = time.time()
        if now > payload.expires_at:
            raise TokenExpiredError(
                f"Token expired at {payload.expires_at} (current time {now}, delta {now - payload.expires_at:.1f}s)."
            )

        if now < (payload.issued_at - clock_drift_tolerance):
            raise TokenNotYetValidError(
                f"Token issued in the future: {payload.issued_at} (current time {now})."
            )

        # Verify action
        if expected_action is not None and payload.action != expected_action:
            raise TokenTamperedError(
                f"Action mismatch: expected '{expected_action}', got '{payload.action}'."
            )

        # Verify target hash
        if expected_target_hash is not None and payload.target_hash != expected_target_hash:
            raise TokenTamperedError(
                f"Target hash mismatch: token bound to '{payload.target_hash}', request has '{expected_target_hash}'."
            )

        return payload
