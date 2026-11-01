"""
Unit and Security Tests for RFC 8785 JCS and Ed25519 Approval Tokens.
"""

import time
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from seyal_ai.security.approval_token import (
    ApprovalTokenManager,
    ApprovalTokenPayload,
    TokenExpiredError,
    TokenNotYetValidError,
    TokenTamperedError,
    compute_target_hash,
    jcs_canonicalize,
)


class TestJCSCanonicalization:
    """Tests RFC 8785 canonical JSON formatting rules."""

    def test_whitespace_and_sorting(self):
        data = {"z": 1, "a": 2, "m": {"b": 3, "a": 4}}
        canon = jcs_canonicalize(data)
        assert canon == b'{"a":2,"m":{"a":4,"b":3},"z":1}'

    def test_utf16_key_sorting(self):
        # RFC 8785 requires UTF-16 code unit ordering
        data = {"\u00e9": 1, "e": 2, "\u0b86": 3}
        canon = jcs_canonicalize(data)
        # In UTF-16 code units: 'e' (0x0065) < '\u00e9' (0x00e9) < '\u0b86' (0x0b86)
        assert canon == '{"e":2,"\u00e9":1,"\u0b86":3}'.encode("utf-8")

    def test_string_escapes(self):
        data = {"str": "hello\nworld\t\"test\"\\backslash"}
        canon = jcs_canonicalize(data)
        assert canon == b'{"str":"hello\\nworld\\t\\"test\\"\\\\backslash"}'

    def test_numbers_ieee754(self):
        data = {"int": 42, "zero": 0.0, "float": 3.14}
        canon = jcs_canonicalize(data)
        assert b'"int":42' in canon
        assert b'"zero":0' in canon
        assert b'"float":3.14' in canon

    def test_target_hash_deterministic(self):
        params1 = {"url": "https://example.com", "retries": 3}
        params2 = {"retries": 3, "url": "https://example.com"}
        assert compute_target_hash(params1) == compute_target_hash(params2)


class TestApprovalTokens:
    """Tests Ed25519 token generation, verification, and tamper resistance."""

    @pytest.fixture
    def keypair(self):
        return ApprovalTokenManager.generate_keypair()

    def test_valid_token_verification(self, keypair):
        priv, pub = keypair
        now = time.time()
        params = {"command": "diskpart /s script.txt"}
        thash = compute_target_hash(params)

        payload = ApprovalTokenPayload(
            action="execute_command",
            target_hash=thash,
            risk_level="critical",
            nonce="test-nonce-1234",
            issued_at=now,
            expires_at=now + 60.0,
            supervisor_id="supervisor-win-01",
        )

        token = ApprovalTokenManager.create_token(payload, priv)
        verified = ApprovalTokenManager.verify_token(
            token=token,
            public_key=pub,
            expected_action="execute_command",
            expected_target_hash=thash,
        )

        assert verified.nonce == "test-nonce-1234"
        assert verified.supervisor_id == "supervisor-win-01"

    def test_tampered_token_rejected(self, keypair):
        priv, pub = keypair
        now = time.time()
        payload = ApprovalTokenPayload(
            action="format_disk",
            target_hash="hash123",
            risk_level="critical",
            nonce="nonce-abc",
            issued_at=now,
            expires_at=now + 60.0,
            supervisor_id="sup1",
        )
        token = ApprovalTokenManager.create_token(payload, priv)
        # Tamper token signature
        tampered_token = token[:-4] + "AAAA"

        with pytest.raises(TokenTamperedError):
            ApprovalTokenManager.verify_token(tampered_token, pub)

    def test_expired_token_rejected(self, keypair):
        priv, pub = keypair
        now = time.time()
        payload = ApprovalTokenPayload(
            action="wipe_device",
            target_hash="hash123",
            risk_level="critical",
            nonce="nonce-expired",
            issued_at=now - 120.0,
            expires_at=now - 10.0,  # Expired 10 seconds ago
            supervisor_id="sup1",
        )
        token = ApprovalTokenManager.create_token(payload, priv)

        with pytest.raises(TokenExpiredError):
            ApprovalTokenManager.verify_token(token, pub)

    def test_future_issued_token_rejected(self, keypair):
        priv, pub = keypair
        now = time.time()
        payload = ApprovalTokenPayload(
            action="wipe_device",
            target_hash="hash123",
            risk_level="critical",
            nonce="nonce-future",
            issued_at=now + 30.0,  # 30s in future beyond 5s tolerance
            expires_at=now + 120.0,
            supervisor_id="sup1",
        )
        token = ApprovalTokenManager.create_token(payload, priv)

        with pytest.raises(TokenNotYetValidError):
            ApprovalTokenManager.verify_token(token, pub)

    def test_action_or_hash_mismatch_rejected(self, keypair):
        priv, pub = keypair
        now = time.time()
        payload = ApprovalTokenPayload(
            action="delete_system_directory",
            target_hash="hash-correct",
            risk_level="critical",
            nonce="nonce-match",
            issued_at=now,
            expires_at=now + 60.0,
            supervisor_id="sup1",
        )
        token = ApprovalTokenManager.create_token(payload, priv)

        with pytest.raises(TokenTamperedError, match="Action mismatch"):
            ApprovalTokenManager.verify_token(token, pub, expected_action="different_action")

        with pytest.raises(TokenTamperedError, match="Target hash mismatch"):
            ApprovalTokenManager.verify_token(token, pub, expected_target_hash="wrong-hash")
