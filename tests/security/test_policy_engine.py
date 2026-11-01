"""
Unit and Integration Tests for PolicyEngine and SqliteNonceStore.
"""

import time
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from seyal_ai.security.approval_token import (
    ApprovalTokenManager,
    ApprovalTokenPayload,
    compute_target_hash,
)
from seyal_ai.security.nonce_store import (
    NonceAlreadyConsumedError,
    NonceExpiredError,
    NonceNotFoundError,
    SqliteNonceStore,
)
from seyal_ai.security.policy_engine import PolicyEngine, RiskTier


class TestNonceStore:
    """Tests atomic SQL nonce validation and replay prevention."""

    @pytest.fixture
    def nonce_store(self, tmp_path):
        db_file = tmp_path / "test_nonces.db"
        return SqliteNonceStore(db_file)

    def test_register_and_consume_nonce(self, nonce_store):
        now = time.time()
        nonce = "nonce-001"
        nonce_store.register_nonce(nonce, expires_at=now + 60.0)

        # First consumption should succeed
        nonce_store.consume_nonce(nonce, task_id="task_123")

        # Second consumption (replay attack) must raise NonceAlreadyConsumedError
        with pytest.raises(NonceAlreadyConsumedError):
            nonce_store.consume_nonce(nonce, task_id="task_456")

    def test_expired_nonce_rejected(self, nonce_store):
        now = time.time()
        nonce = "nonce-expired-01"
        nonce_store.register_nonce(nonce, expires_at=now - 5.0)

        with pytest.raises(NonceExpiredError):
            nonce_store.consume_nonce(nonce, task_id="task_789")

    def test_unregistered_nonce_rejected(self, nonce_store):
        with pytest.raises(NonceNotFoundError):
            nonce_store.consume_nonce("nonexistent-nonce", task_id="task_000")


class TestPolicyEngine:
    """Tests 4-tier risk classification and authorization enforcement."""

    @pytest.fixture
    def policy_engine(self, tmp_path):
        db_file = tmp_path / "policy_nonces.db"
        return PolicyEngine(nonce_store=SqliteNonceStore(db_file))

    @pytest.fixture
    def keypair(self):
        return ApprovalTokenManager.generate_keypair()

    def test_low_risk_auto_approved(self, policy_engine):
        dec = policy_engine.evaluate(action="read_file", parameters={"path": "README.md"})
        assert dec.tier == RiskTier.LOW
        assert dec.approved is True
        assert dec.requires_user_confirmation is False
        assert dec.requires_approval_token is False

    def test_medium_risk_auto_approved(self, policy_engine):
        dec = policy_engine.evaluate(action="mouse_click", parameters={"x": 100, "y": 200})
        assert dec.tier == RiskTier.MEDIUM
        assert dec.approved is True

    def test_high_risk_requires_confirmation(self, policy_engine):
        # Without confirmation
        dec = policy_engine.evaluate(
            action="execute_terminal_command",
            parameters={"command": "npm install express"},
            has_user_confirmed=False,
        )
        assert dec.tier == RiskTier.HIGH
        assert dec.approved is False
        assert dec.requires_user_confirmation is True

        # With user confirmation
        dec2 = policy_engine.evaluate(
            action="execute_terminal_command",
            parameters={"command": "npm install express"},
            has_user_confirmed=True,
        )
        assert dec2.tier == RiskTier.HIGH
        assert dec2.approved is True

    def test_critical_risk_requires_approval_token(self, policy_engine, keypair):
        priv, pub = keypair
        params = {"command": "diskpart /s clean.txt"}

        # Without token -> blocked
        dec1 = policy_engine.evaluate(action="format_disk", parameters=params)
        assert dec1.tier == RiskTier.CRITICAL
        assert dec1.approved is False
        assert dec1.requires_approval_token is True

        # Create valid token
        now = time.time()
        nonce = "nonce-crit-01"
        policy_engine.nonce_store.register_nonce(nonce, expires_at=now + 60.0)

        payload = ApprovalTokenPayload(
            action="format_disk",
            target_hash=compute_target_hash(params),
            risk_level="critical",
            nonce=nonce,
            issued_at=now,
            expires_at=now + 60.0,
            supervisor_id="sup-mobile-1",
        )
        token = ApprovalTokenManager.create_token(payload, priv)

        # With valid token -> approved
        dec2 = policy_engine.evaluate(
            action="format_disk",
            parameters=params,
            approval_token=token,
            public_key=pub,
        )
        assert dec2.tier == RiskTier.CRITICAL
        assert dec2.approved is True

        # Replay attempt with same token -> blocked (nonce consumed)
        dec3 = policy_engine.evaluate(
            action="format_disk",
            parameters=params,
            approval_token=token,
            public_key=pub,
        )
        assert dec3.approved is False
        assert "already consumed" in dec3.reason
