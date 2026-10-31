"""
Tests for Seyal AI Device Pairing & PIN Brute-Force Protection.

Verifies:
1. Valid PIN succeeds.
2. Four incorrect attempts do not invalidate the session.
3. Fifth incorrect attempt immediately invalidates the session.
4. Correct PIN after invalidation is rejected.
5. Expired PIN is rejected.
6. Successful pairing invalidates the session (reuse rejected).
7. Invalid PIN inputs (types, empty, whitespace) are safely rejected.
8. Application logs never expose plaintext PIN values.
9. Source inspection verifies constant-time hmac.compare_digest usage.
"""

from __future__ import annotations

import inspect
import logging
import time
from pathlib import Path

import pytest

from seyal_ai.security.pairing import (
    MAX_PIN_ATTEMPTS,
    DevicePairingManager,
    PairingSession,
)


def test_pairing_valid_pin_succeeds(tmp_path: Path):
    """Valid 6-digit PIN completes pairing and produces valid credentials."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Pixel 8 Pro", device_type="phone")
    assert len(session.pin) == 6
    assert session.failed_attempts == 0

    device = mgr.verify_pairing(session.session_id, session.pin)
    assert device is not None
    assert device.device_name == "Pixel 8 Pro"
    assert mgr.authenticate_device(device.device_id, device.device_token) is True


def test_pairing_four_incorrect_attempts_preserve_session(tmp_path: Path):
    """Four incorrect PIN attempts do not invalidate the session; correct PIN on 5th try succeeds."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Test Device", device_type="phone")
    session_id = session.session_id
    correct_pin = session.pin
    wrong_pin = "999999" if correct_pin != "999999" else "000000"

    # Attempts 1 to 4: all incorrect
    for i in range(1, 5):
        result = mgr.verify_pairing(session_id, wrong_pin)
        assert result is None, f"Attempt {i} with wrong PIN should return None"
        assert session_id in mgr._pending_sessions, f"Session should remain active after attempt {i}"
        assert mgr._pending_sessions[session_id].failed_attempts == i

    # 5th attempt with correct PIN: succeeds
    device = mgr.verify_pairing(session_id, correct_pin)
    assert device is not None
    assert device.device_name == "Test Device"
    # Once paired, session must be invalidated
    assert session_id not in mgr._pending_sessions


def test_pairing_fifth_incorrect_attempt_invalidates_session(tmp_path: Path):
    """Fifth incorrect PIN attempt invalidates the session immediately; 6th attempt is rejected."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Test Device", device_type="phone")
    session_id = session.session_id
    wrong_pin = "888888" if session.pin != "888888" else "111111"

    # Attempts 1 to 4: session remains active
    for i in range(1, 5):
        result = mgr.verify_pairing(session_id, wrong_pin)
        assert result is None
        assert session_id in mgr._pending_sessions
        assert mgr._pending_sessions[session_id].failed_attempts == i

    # 5th attempt: incorrect PIN triggers immediate invalidation
    result_5 = mgr.verify_pairing(session_id, wrong_pin)
    assert result_5 is None
    assert session_id not in mgr._pending_sessions, "Session must be invalidated on the 5th failed attempt"

    # 6th attempt: session no longer exists
    result_6 = mgr.verify_pairing(session_id, wrong_pin)
    assert result_6 is None


def test_pairing_correct_pin_after_invalidation_rejected(tmp_path: Path):
    """After 5 failed attempts, even presenting the original correct PIN is rejected."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Victim Device", device_type="phone")
    session_id = session.session_id
    correct_pin = session.pin
    wrong_pin = "777777" if correct_pin != "777777" else "222222"

    # Exhaust the 5 allowed attempts
    for _ in range(MAX_PIN_ATTEMPTS):
        assert mgr.verify_pairing(session_id, wrong_pin) is None

    assert session_id not in mgr._pending_sessions

    # Present the genuine correct PIN - must be rejected
    res = mgr.verify_pairing(session_id, correct_pin)
    assert res is None


def test_pairing_expired_pin_rejected(tmp_path: Path):
    """Expired pairing session is rejected and cleaned up even with correct PIN."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Expired Device", device_type="phone")
    session_id = session.session_id
    correct_pin = session.pin

    # Force expiration
    session.expires_at = time.time() - 10.0
    assert session.is_expired is True

    result = mgr.verify_pairing(session_id, correct_pin)
    assert result is None
    assert session_id not in mgr._pending_sessions


def test_pairing_successful_pairing_invalidates_session_reuse_rejected(tmp_path: Path):
    """Successful pairing immediately drops the session; reuse with same credentials is rejected."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Device A", device_type="phone")
    session_id = session.session_id
    correct_pin = session.pin

    # First verification succeeds
    device = mgr.verify_pairing(session_id, correct_pin)
    assert device is not None

    # Immediate second verification attempt must fail closed
    replay = mgr.verify_pairing(session_id, correct_pin)
    assert replay is None


def test_pairing_invalid_pin_inputs_safely_rejected(tmp_path: Path):
    """Invalid PIN inputs (non-string types, empty string, whitespace) are handled safely and count as failed attempts."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Test Device", device_type="phone")
    session_id = session.session_id

    # Non-string inputs
    assert mgr.verify_pairing(session_id, None) is None  # type: ignore[arg-type]
    assert session.failed_attempts == 1

    assert mgr.verify_pairing(session_id, 123456) is None  # type: ignore[arg-type]
    assert session.failed_attempts == 2

    assert mgr.verify_pairing(session_id, ["123456"]) is None  # type: ignore[arg-type]
    assert session.failed_attempts == 3

    # Empty and whitespace-only strings
    assert mgr.verify_pairing(session_id, "") is None
    assert session.failed_attempts == 4

    # 5th attempt with whitespace only invalidates the session
    assert mgr.verify_pairing(session_id, "   ") is None
    assert session_id not in mgr._pending_sessions


def test_pairing_non_ascii_and_unicode_digits_safely_rejected(tmp_path: Path):
    """Non-ASCII characters and Unicode digits are rejected safely without exception and increment failed_attempts."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Unicode Device", device_type="phone")
    session_id = session.session_id

    # 1. Tamil characters - must not raise TypeError
    res1 = mgr.verify_pairing(session_id, "தமிழ்123")
    assert res1 is None
    assert session.failed_attempts == 1

    # 2. Full-width Unicode digits - must not be normalized into ASCII digits
    res2 = mgr.verify_pairing(session_id, "１２３４５６")
    assert res2 is None
    assert session.failed_attempts == 2

    # 3. Arabic-Indic digits - must be rejected
    res3 = mgr.verify_pairing(session_id, "١٢٣٤٥٦")
    assert res3 is None
    assert session.failed_attempts == 3

    # 4. Emoji PIN input - must be rejected
    res4 = mgr.verify_pairing(session_id, "🔑12345")
    assert res4 is None
    assert session.failed_attempts == 4
    assert session_id in mgr._pending_sessions

    # 5. 5th non-ASCII attempt immediately invalidates the session
    res5 = mgr.verify_pairing(session_id, "செயல்")
    assert res5 is None
    assert session_id not in mgr._pending_sessions, "5th invalid non-ASCII attempt must delete the session"


def test_pairing_valid_pin_succeeds_after_four_non_ascii_failures(tmp_path: Path):
    """Valid PIN succeeds on the 5th attempt after four consecutive non-ASCII/Unicode failures."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    session = mgr.initiate_pairing(device_name="Resilient Device", device_type="phone")
    session_id = session.session_id
    correct_pin = session.pin

    # 4 non-ASCII attempts
    non_ascii_samples = ["வணக்கம்", "１２３４５６", "१२३४५६", "🔐12345"]
    for i, bad_input in enumerate(non_ascii_samples, start=1):
        assert mgr.verify_pairing(session_id, bad_input) is None
        assert session_id in mgr._pending_sessions
        assert session.failed_attempts == i

    # 5th attempt with genuine correct PIN succeeds
    device = mgr.verify_pairing(session_id, correct_pin)
    assert device is not None
    assert device.device_name == "Resilient Device"
    assert session_id not in mgr._pending_sessions


def test_pairing_logs_never_expose_plaintext_pin(tmp_path: Path, caplog: pytest.LogCaptureFixture):
    """Application logs must never record the plaintext PIN during initiation, failures, or successes."""
    storage = tmp_path / "paired.json"
    mgr = DevicePairingManager(storage_path=storage)

    with caplog.at_level(logging.DEBUG):
        session = mgr.initiate_pairing(device_name="Secure Device", device_type="laptop")
        pin = session.pin
        session_id = session.session_id

        # Failed attempt
        mgr.verify_pairing(session_id, "000000" if pin != "000000" else "111111")

        # Successful attempt
        mgr.verify_pairing(session_id, pin)

    # Inspect all captured logs
    for record in caplog.records:
        assert pin not in record.message, f"Plaintext PIN '{pin}' leaked in log record: {record.message}"


def test_pairing_source_uses_hmac_compare_digest():
    """Verify via AST/source inspection that verify_pairing uses constant-time hmac.compare_digest."""
    src = inspect.getsource(DevicePairingManager.verify_pairing)
    assert "hmac.compare_digest" in src, "verify_pairing must use hmac.compare_digest for constant-time comparison"
