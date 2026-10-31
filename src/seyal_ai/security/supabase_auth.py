"""
Seyal AI Security — Supabase Authentication & JWT Verification Subsystem.

Provides JWT token decoding, signature validation against Supabase JWT secret,
and FastAPI dependencies for protecting REST API endpoints.
"""

from __future__ import annotations

import time
from typing import Any, Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from seyal_ai.core.config import SeyalAiSettings, get_settings
from seyal_ai.utils.logging import get_logger

log = get_logger("security.supabase_auth")

security_bearer = HTTPBearer(auto_error=False)


class SupabaseUser:
    """Represents an authenticated Supabase user context."""

    def __init__(self, payload: dict[str, Any]) -> None:
        self.user_id: str = payload.get("sub", "")
        self.email: str = payload.get("email", "")
        self.role: str = payload.get("role", "authenticated")
        self.aud: str = payload.get("aud", "")
        self.app_metadata: dict[str, Any] = payload.get("app_metadata", {})
        self.user_metadata: dict[str, Any] = payload.get("user_metadata", {})
        self.exp: int = payload.get("exp", 0)

    @property
    def is_expired(self) -> bool:
        return time.time() >= self.exp

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "role": self.role,
            "aud": self.aud,
            "user_metadata": self.user_metadata,
        }


def decode_supabase_jwt(
    token: str,
    secret: str = "",
    verify_signature: bool = True,
) -> Optional[dict[str, Any]]:
    """
    Decode and verify a Supabase JWT token.

    Args:
        token: The raw JWT string from Authorization Bearer header.
        secret: The SUPABASE_JWT_SECRET or SUPABASE_SERVICE_ROLE_KEY.
        verify_signature: If True, validates cryptographic signature using secret.

    Returns:
        Decoded payload dictionary or None if invalid/unverified.
    """
    try:
        if verify_signature:
            if not secret or not secret.strip():
                log.warning("Cannot verify Supabase JWT: secret is missing or empty")
                return None
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256", "RS256"],
                audience="authenticated",
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": True,
                },
            )
        else:
            # Explicit unverified decode only when requested by caller (never for auth decisions)
            payload = jwt.decode(
                token,
                algorithms=["HS256", "RS256"],
                options={"verify_signature": False},
            )

        # Validate that the sub (user ID) claim exists and is non-empty
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str) or not sub.strip():
            log.warning("Supabase JWT payload rejected: missing or invalid 'sub' claim")
            return None

        return payload
    except jwt.ExpiredSignatureError:
        log.warning("Supabase JWT token has expired")
        return None
    except jwt.InvalidTokenError as e:
        log.warning("Invalid Supabase JWT token: %s", e)
        return None
    except Exception as e:
        log.error("Unexpected error parsing Supabase JWT: %s", e)
        return None


def verify_supabase_token(token: str, settings: Optional[SeyalAiSettings] = None) -> Optional[SupabaseUser]:
    """
    Verify token and return a SupabaseUser object.
    Strictly validates cryptographic signature against the configured JWT secret.
    Never accepts unverified payloads or forged tokens.
    """
    if not settings:
        settings = get_settings()

    jwt_secret = (
        settings.supabase_jwt_secret
        or settings.supabase_service_role_key
        or settings.security.supabase_jwt_secret
        or settings.security.supabase_service_role_key
    )

    if not jwt_secret or not jwt_secret.strip():
        log.warning("Supabase token verification failed: no JWT secret configured")
        return None

    # Cryptographic signature validation is mandatory for all tokens
    payload = decode_supabase_jwt(
        token,
        secret=jwt_secret,
        verify_signature=True,
    )

    if not payload:
        return None

    user = SupabaseUser(payload)
    if user.is_expired:
        log.warning("Supabase user session is expired")
        return None

    return user


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> SupabaseUser:
    """
    FastAPI dependency to extract and verify the current authenticated Supabase user.

    Raises:
        HTTPException 401 if authentication fails or bearer token is missing/invalid.
    """
    settings: SeyalAiSettings = getattr(request.app.state, "settings", get_settings())
    env = (getattr(settings, "environment", "") or "").strip().lower()
    is_dev = env == "development"

    if not credentials or not credentials.credentials:
        # Development fallback mock user ONLY if environment is explicitly "development" AND allow_dev_auth_bypass is True
        if is_dev and getattr(settings.security, "allow_dev_auth_bypass", False):
            return SupabaseUser({
                "sub": "local-dev-user-0000",
                "email": "dev@seyal.local",
                "role": "authenticated",
                "aud": "authenticated",
            })

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    user = verify_supabase_token(token, settings=settings)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
