"""
Tests for Supabase authentication and JWT verification subsystem.
"""

import jwt
from fastapi.testclient import TestClient

from seyal_ai.api.app import create_app
from seyal_ai.core.config import SeyalAiSettings
from seyal_ai.security.supabase_auth import decode_supabase_jwt, verify_supabase_token


def test_supabase_jwt_decoding_unverified():
    payload = {
        "sub": "user-123-abc",
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,  # far future timestamp
    }
    token = jwt.encode(payload, "test-supabase-super-secret-key-at-least-32-bytes!", algorithm="HS256")

    decoded = decode_supabase_jwt(token, secret="", verify_signature=False)
    assert decoded is not None
    assert decoded["sub"] == "user-123-abc"
    assert decoded["email"] == "test@example.com"


def test_supabase_jwt_decoding_verified():
    secret = "my-supabase-super-secret-key-32-bytes-long!"
    payload = {
        "sub": "user-456-def",
        "email": "hero@seyal_ai.ai",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }
    token = jwt.encode(payload, secret, algorithm="HS256")

    user = verify_supabase_token(token, settings=SeyalAiSettings(supabase_jwt_secret=secret))
    assert user is not None
    assert user.user_id == "user-456-def"
    assert user.email == "hero@seyal_ai.ai"


def test_auth_status_endpoint():
    app = create_app(SeyalAiSettings(supabase_url="https://yxvwhewzbifgttmiasas.supabase.co"))
    client = TestClient(app)

    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "supabase"
    assert data["configured"] is True
    assert data["status"] == "ready"


def test_auth_me_endpoint_dev_fallback():
    app = create_app(SeyalAiSettings(supabase_url="https://yxvwhewzbifgttmiasas.supabase.co"))
    client = TestClient(app)

    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert "user_id" in data


def test_supabase_jwt_forged_signature_rejected():
    """Tokens signed with wrong or attacker keys must be rejected and return None."""
    real_secret = "real-supabase-server-secret-key-32-chars!"
    attacker_secret = "attacker-forged-key-32-characters-long!"

    payload = {
        "sub": "victim-user-123",
        "email": "victim@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }
    forged_token = jwt.encode(payload, attacker_secret, algorithm="HS256")

    settings = SeyalAiSettings(supabase_jwt_secret=real_secret)
    # Token verification must strictly reject the forged token
    verified_user = verify_supabase_token(forged_token, settings=settings)
    assert verified_user is None


def test_supabase_jwt_expired_token_rejected():
    """Expired tokens must fail verification and return None."""
    secret = "my-test-secret-key-at-least-32-bytes-long!"
    payload = {
        "sub": "user-expired-789",
        "email": "expired@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 1000000000,  # Expired in year 2001
    }
    expired_token = jwt.encode(payload, secret, algorithm="HS256")

    settings = SeyalAiSettings(supabase_jwt_secret=secret)
    assert verify_supabase_token(expired_token, settings=settings) is None


def test_supabase_jwt_missing_sub_rejected():
    """Tokens missing user ID ('sub') claim must be rejected."""
    secret = "my-test-secret-key-at-least-32-bytes-long!"
    payload = {
        "email": "nosub@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }
    token_without_sub = jwt.encode(payload, secret, algorithm="HS256")

    settings = SeyalAiSettings(supabase_jwt_secret=secret)
    assert verify_supabase_token(token_without_sub, settings=settings) is None


def test_supabase_jwt_missing_secret_fails_closed():
    """If no secret is configured, verify_supabase_token must fail closed and return None."""
    payload = {
        "sub": "user-valid-123",
        "email": "valid@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }
    token = jwt.encode(payload, "some-secret", algorithm="HS256")
    settings = SeyalAiSettings(supabase_jwt_secret="", supabase_service_role_key="")
    assert verify_supabase_token(token, settings=settings) is None


def test_auth_me_endpoint_invalid_token_returns_401():
    """Providing an invalid/forged bearer token must return 401 Unauthorized, never dev fallback."""
    secret = "real-supabase-server-secret-key-32-chars!"
    settings = SeyalAiSettings(
        supabase_url="https://yxvwhewzbifgttmiasas.supabase.co",
        supabase_jwt_secret=secret,
    )
    app = create_app(settings)
    client = TestClient(app)

    # Forged bearer token
    forged_token = jwt.encode({"sub": "admin-hacker"}, "wrong-secret", algorithm="HS256")
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
    assert response.status_code == 401
    assert "Invalid or expired authentication token" in response.json().get("detail", "")


def test_auth_me_endpoint_production_rejects_unauthenticated():
    """In production mode, unauthenticated requests to /api/auth/me must return 401."""
    secret = "production-supabase-jwt-secret-32-chars-long!"
    from seyal_ai.core.config import SecuritySettings

    prod_settings = SeyalAiSettings(
        environment="production",
        supabase_jwt_secret=secret,
        security=SecuritySettings(
            require_auth=True,
            allow_dev_auth_bypass=False,
            supabase_jwt_secret=secret,
        ),
    )
    app = create_app(prod_settings)
    client = TestClient(app)

    # Request without Authorization header in production must return 401
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Missing authorization bearer token" in response.json().get("detail", "")


def test_production_security_validation():
    """Production configuration must reject unsafe settings at startup."""
    import pytest
    from seyal_ai.core.config import SecuritySettings

    valid_secret = "production-supabase-jwt-secret-32-chars-long!"

    # 1. Unsafe require_auth = False in production
    with pytest.raises(ValueError, match="Unsafe production configuration: 'security.require_auth' cannot be False in production"):
        SeyalAiSettings(
            environment="production",
            supabase_jwt_secret=valid_secret,
            security=SecuritySettings(
                require_auth=False,
                allow_dev_auth_bypass=False,
                supabase_jwt_secret=valid_secret,
            ),
        )

    # 2. Unsafe allow_dev_auth_bypass = True in production
    with pytest.raises(ValueError, match="Unsafe production configuration: 'security.allow_dev_auth_bypass' cannot be True in production"):
        SeyalAiSettings(
            environment="production",
            supabase_jwt_secret=valid_secret,
            security=SecuritySettings(
                require_auth=True,
                allow_dev_auth_bypass=True,
                supabase_jwt_secret=valid_secret,
            ),
        )

    # 3. Missing JWT secret in production
    with pytest.raises(ValueError, match="Unsafe production configuration: Supabase JWT secret .* is required in production"):
        SeyalAiSettings(
            environment="production",
            supabase_jwt_secret="",
            supabase_service_role_key="",
            security=SecuritySettings(
                require_auth=True,
                allow_dev_auth_bypass=False,
                supabase_jwt_secret="",
                supabase_service_role_key="",
            ),
        )

    # 4. Valid production configuration passes cleanly
    prod_valid = SeyalAiSettings(
        environment="production",
        supabase_jwt_secret=valid_secret,
        security=SecuritySettings(
            require_auth=True,
            allow_dev_auth_bypass=False,
            supabase_jwt_secret=valid_secret,
        ),
    )
    assert prod_valid.environment == "production"
    assert prod_valid.security.require_auth is True
    assert prod_valid.security.allow_dev_auth_bypass is False
