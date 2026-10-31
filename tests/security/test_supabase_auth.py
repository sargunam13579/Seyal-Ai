"""
Tests for Supabase authentication and JWT verification subsystem.
"""

import jwt
from fastapi.testclient import TestClient

from seyal_ai.api.app import create_app
from seyal_ai.core.config import SecuritySettings, SeyalAiSettings
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


def test_allow_dev_auth_bypass_default_is_false():
    """SecuritySettings.allow_dev_auth_bypass must strictly default to False."""
    from seyal_ai.core.config import SecuritySettings

    sec = SecuritySettings()
    assert sec.allow_dev_auth_bypass is False
    assert sec.require_auth is True

    settings = SeyalAiSettings()
    assert settings.security.allow_dev_auth_bypass is False


def test_auth_me_endpoint_default_rejects_unauthenticated():
    """By default (allow_dev_auth_bypass=False), unauthenticated requests must be rejected with 401."""
    app = create_app(SeyalAiSettings(supabase_url="https://yxvwhewzbifgttmiasas.supabase.co"))
    client = TestClient(app)

    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Missing authorization bearer token" in response.json().get("detail", "")


def test_auth_me_endpoint_explicit_dev_bypass_allows_mock_user():
    """Development with explicit allow_dev_auth_bypass=True behaves as intended and returns mock user."""
    from seyal_ai.core.config import SecuritySettings

    dev_settings = SeyalAiSettings(
        environment="development",
        supabase_url="https://yxvwhewzbifgttmiasas.supabase.co",
        security=SecuritySettings(allow_dev_auth_bypass=True),
    )
    app = create_app(dev_settings)
    client = TestClient(app)

    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user_id"] == "local-dev-user-0000"


def test_test_env_does_not_inherit_dev_bypass():
    """Test environment must not inherit dev bypass even if allow_dev_auth_bypass is True."""
    from seyal_ai.core.config import SecuritySettings

    settings = SeyalAiSettings(
        environment="test",
        security=SecuritySettings(allow_dev_auth_bypass=True),
    )
    app = create_app(settings)
    client = TestClient(app)

    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "Missing authorization bearer token" in response.json().get("detail", "")


def test_invalid_or_missing_env_does_not_enable_bypass():
    """Missing or invalid environment name must never enable authentication bypass."""
    from seyal_ai.core.config import SecuritySettings

    for invalid_env in ["", "staging", "unknown", "qa"]:
        settings = SeyalAiSettings(
            environment=invalid_env,
            security=SecuritySettings(allow_dev_auth_bypass=True),
        )
        app = create_app(settings)
        client = TestClient(app)

        response = client.get("/api/auth/me")
        assert response.status_code == 401
        assert "Missing authorization bearer token" in response.json().get("detail", "")


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


# ===========================================================================
# Dedicated Regression Tests for JWT Key Separation & Algorithm Restrictions
# ===========================================================================

def test_service_role_key_alone_cannot_verify_token():
    """Configuring only supabase_service_role_key must not enable token verification."""
    service_role_key = "my-service-role-key-that-is-32-bytes-long!"
    payload = {
        "sub": "user-test-service-key",
        "email": "test@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }
    token = jwt.encode(payload, service_role_key, algorithm="HS256")
    settings = SeyalAiSettings(
        supabase_jwt_secret="",
        supabase_service_role_key=service_role_key,
        security=SecuritySettings(supabase_jwt_secret="", supabase_service_role_key=service_role_key),
    )
    # Must fail closed and return None
    assert verify_supabase_token(token, settings=settings) is None


def test_token_signed_with_service_role_key_rejected_when_jwt_secret_missing():
    """A token signed with service role key is rejected when JWT secret is missing."""
    service_key = "service-role-admin-key-32-chars-long!"
    token = jwt.encode(
        {"sub": "attacker-001", "email": "att@evil.com", "role": "authenticated", "aud": "authenticated", "exp": 2524608000},
        service_key,
        algorithm="HS256",
    )
    settings = SeyalAiSettings(
        supabase_jwt_secret="",
        supabase_service_role_key=service_key,
        security=SecuritySettings(supabase_jwt_secret="", supabase_service_role_key=service_key),
    )
    assert verify_supabase_token(token, settings=settings) is None


def test_token_signed_with_service_role_key_rejected_when_jwt_secret_configured():
    """A token signed with service role key is rejected when a legitimate JWT secret is configured."""
    jwt_secret = "real-supabase-jwt-secret-32-bytes-long!"
    service_key = "service-role-admin-key-32-chars-long!"
    token = jwt.encode(
        {"sub": "attacker-002", "email": "att@evil.com", "role": "authenticated", "aud": "authenticated", "exp": 2524608000},
        service_key,
        algorithm="HS256",
    )
    settings = SeyalAiSettings(
        supabase_jwt_secret=jwt_secret,
        supabase_service_role_key=service_key,
        security=SecuritySettings(supabase_jwt_secret=jwt_secret, supabase_service_role_key=service_key),
    )
    assert verify_supabase_token(token, settings=settings) is None


def test_production_startup_fails_if_jwt_secret_empty_even_with_service_role_key():
    """Production startup must fail closed if supabase_jwt_secret is empty, even if service role key is present."""
    import pytest
    from seyal_ai.core.config import SecuritySettings

    with pytest.raises(ValueError, match="Unsafe production configuration: Supabase JWT secret"):
        SeyalAiSettings(
            environment="production",
            supabase_jwt_secret="",
            supabase_service_role_key="service-role-key-present-32-chars-long!",
            security=SecuritySettings(
                require_auth=True,
                allow_dev_auth_bypass=False,
                supabase_jwt_secret="",
                supabase_service_role_key="service-role-key-present-32-chars-long!",
            ),
        )


def test_jwt_algorithm_none_rejected():
    """Tokens using the 'none' algorithm must be rejected."""
    import base64
    import json

    jwt_secret = "valid-supabase-jwt-secret-32-bytes-long!"
    payload = {
        "sub": "user-none-alg",
        "email": "none@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }
    header_b64 = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    none_token = f"{header_b64}.{payload_b64}."

    settings = SeyalAiSettings(supabase_jwt_secret=jwt_secret)
    assert verify_supabase_token(none_token, settings=settings) is None
    assert decode_supabase_jwt(none_token, secret=jwt_secret, verify_signature=True) is None


def test_jwt_algorithm_hs384_rejected():
    """Tokens signed with HS384 algorithm must be rejected (only HS256 is accepted)."""
    jwt_secret = "valid-supabase-jwt-secret-32-bytes-long!"
    payload = {
        "sub": "user-hs384-alg",
        "email": "hs384@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }
    hs384_token = jwt.encode(payload, jwt_secret, algorithm="HS384")
    settings = SeyalAiSettings(supabase_jwt_secret=jwt_secret)
    assert verify_supabase_token(hs384_token, settings=settings) is None
    assert decode_supabase_jwt(hs384_token, secret=jwt_secret, verify_signature=True) is None


def test_jwt_algorithm_rs256_rejected():
    """Tokens with RS256 algorithm must be rejected under symmetric HS256 verification."""
    import base64
    import json

    jwt_secret = "valid-supabase-jwt-secret-32-bytes-long!"
    header_b64 = base64.urlsafe_b64encode(json.dumps({"alg": "RS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps({
        "sub": "user-rs256",
        "email": "rs256@example.com",
        "role": "authenticated",
        "aud": "authenticated",
        "exp": 2524608000,
    }).encode()).decode().rstrip("=")
    rs256_token = f"{header_b64}.{payload_b64}.fake-signature"

    settings = SeyalAiSettings(supabase_jwt_secret=jwt_secret)
    assert verify_supabase_token(rs256_token, settings=settings) is None
    assert decode_supabase_jwt(rs256_token, secret=jwt_secret, verify_signature=True) is None


def test_auth_status_does_not_report_jwt_enabled_with_only_service_role_key():
    """GET /api/auth/status must report jwt_verification_enabled: False when only service role key is set."""
    from seyal_ai.core.config import SecuritySettings

    settings = SeyalAiSettings(
        supabase_url="https://yxvwhewzbifgttmiasas.supabase.co",
        supabase_jwt_secret="",
        supabase_service_role_key="service-role-key-only",
        security=SecuritySettings(
            supabase_url="https://yxvwhewzbifgttmiasas.supabase.co",
            supabase_jwt_secret="",
            supabase_service_role_key="service-role-key-only",
        ),
    )
    app = create_app(settings)
    client = TestClient(app)

    response = client.get("/api/auth/status")
    assert response.status_code == 200
    data = response.json()
    assert data["jwt_verification_enabled"] is False
