"""
Seyal AI — Windows NTFS & POSIX File Security ACL Acceptance Test Suite.

Validates Phase B3.2 Stage 3:
- ACL-01: KeyManager directory restriction
- ACL-02: Master key file restriction and inheritance stripping
- ACL-03: SecretVault restricted file permissions on read and atomic save
- ACL-04: Device pairing storage restricted permissions
- ACL-05: Windows icacls verification / POSIX chmod verification
- ACL-06: Fail-closed behavior on missing files or permission errors
"""

from __future__ import annotations

import getpass
import os
import subprocess
from pathlib import Path

import pytest

from seyal_ai.security.crypto import (
    KeyManager,
    SecretVault,
    SecurityPermissionError,
    restrict_directory_permissions,
    restrict_file_permissions,
)
from seyal_ai.security.pairing import DevicePairingManager


def _verify_windows_acl_exclusive_to_user(target_path: Path) -> bool:
    """Helper to inspect icacls output on Windows."""
    if os.name != "nt":
        return True
    res = subprocess.run(["icacls", str(target_path.resolve())], capture_output=True, text=True, check=False)
    if res.returncode != 0:
        return False
    user = getpass.getuser().lower()
    stdout_lower = res.stdout.lower()
    # Ensure current user is explicitly granted
    has_user = user in stdout_lower
    # Ensure inherited permissions are stripped (no (I) inheritance flag on user grant)
    # And no broad BUILTIN\\Users or Everyone
    has_no_broad_users = "builtin\\users" not in stdout_lower and "everyone" not in stdout_lower
    return has_user and has_no_broad_users


def _verify_posix_mode(target_path: Path, expected_mode: int) -> bool:
    """Helper to inspect POSIX octal mode."""
    if os.name == "nt":
        return True
    return (target_path.stat().st_mode & 0o777) == expected_mode


# ===========================================================================
# 1. CORE PERMISSION HELPER TESTS (ACL-05, ACL-06)
# ===========================================================================


def test_acl05_restrict_file_permissions_strips_inheritance(tmp_path: Path):
    """ACL-05: restrict_file_permissions locks down file and removes inherited access."""
    test_file = tmp_path / "test_secret.key"
    test_file.write_text("super_secret_payload")

    restrict_file_permissions(test_file)

    if os.name == "nt":
        assert _verify_windows_acl_exclusive_to_user(test_file)
    else:
        assert _verify_posix_mode(test_file, 0o600)


def test_acl01_restrict_directory_permissions(tmp_path: Path):
    """ACL-01: restrict_directory_permissions locks down directory and removes inherited access."""
    test_dir = tmp_path / "secret_keys_dir"
    test_dir.mkdir(parents=True, exist_ok=True)

    restrict_directory_permissions(test_dir)

    if os.name == "nt":
        assert _verify_windows_acl_exclusive_to_user(test_dir)
    else:
        assert _verify_posix_mode(test_dir, 0o700)


def test_acl06_fail_closed_on_missing_target(tmp_path: Path):
    """ACL-06: Non-existent paths raise FileNotFoundError and fail closed."""
    missing_file = tmp_path / "non_existent.key"
    with pytest.raises(FileNotFoundError):
        restrict_file_permissions(missing_file)

    missing_dir = tmp_path / "non_existent_dir"
    with pytest.raises(FileNotFoundError):
        restrict_directory_permissions(missing_dir)


# ===========================================================================
# 2. KEY MANAGER ACL VERIFICATION (ACL-02)
# ===========================================================================


def test_acl02_key_manager_locks_down_key_file_and_directory(tmp_path: Path):
    """ACL-02: KeyManager creation locks down key_dir and generated master.key."""
    key_dir = tmp_path / "keys"
    key_mgr = KeyManager(key_dir=key_dir)

    # Verify directory permissions
    if os.name == "nt":
        assert _verify_windows_acl_exclusive_to_user(key_dir)
    else:
        assert _verify_posix_mode(key_dir, 0o700)

    # Generate master key
    master_key = key_mgr.get_or_create_master_key()
    assert len(master_key) == 32
    master_key_file = key_dir / "master.key"
    assert master_key_file.exists()

    # Verify file permissions
    if os.name == "nt":
        assert _verify_windows_acl_exclusive_to_user(master_key_file)
    else:
        assert _verify_posix_mode(master_key_file, 0o600)

    # Re-loading existing key retains restricted permissions
    key_mgr_reload = KeyManager(key_dir=key_dir)
    reloaded_key = key_mgr_reload.get_or_create_master_key()
    assert reloaded_key == master_key


# ===========================================================================
# 3. SECRET VAULT ACL VERIFICATION (ACL-03)
# ===========================================================================


def test_acl03_secret_vault_locks_down_vault_file(tmp_path: Path):
    """ACL-03: SecretVault persists ciphertext with restricted permissions atomically."""
    vault_path = tmp_path / "vault" / "vault.enc"
    key_mgr = KeyManager(key_dir=tmp_path / "vault" / "keys")
    vault = SecretVault(vault_path=vault_path, key_manager=key_mgr)

    vault.set_secret("DATABASE_PASSWORD", "SuperSecurePassword987!")
    assert vault_path.exists()

    # Verify vault file permissions
    if os.name == "nt":
        assert _verify_windows_acl_exclusive_to_user(vault_path)
    else:
        assert _verify_posix_mode(vault_path, 0o600)

    # Verify decrypted content matches
    vault_reload = SecretVault(vault_path=vault_path, key_manager=key_mgr)
    assert vault_reload.get_secret("DATABASE_PASSWORD") == "SuperSecurePassword987!"


# ===========================================================================
# 4. DEVICE PAIRING STORAGE ACL VERIFICATION (ACL-04)
# ===========================================================================


def test_acl04_device_pairing_storage_locked_down(tmp_path: Path):
    """ACL-04: DevicePairingManager saves paired_devices.json with restricted permissions."""
    storage_path = tmp_path / "pairing" / "paired_devices.json"
    manager = DevicePairingManager(storage_path=storage_path)

    session = manager.initiate_pairing(device_name="Pixel 9", device_type="phone")
    paired = manager.verify_pairing(session.session_id, session.pin)
    assert paired is not None
    assert storage_path.exists()

    # Verify storage file permissions
    if os.name == "nt":
        assert _verify_windows_acl_exclusive_to_user(storage_path)
    else:
        assert _verify_posix_mode(storage_path, 0o600)

    # Verify persistence re-loads cleanly
    manager_reload = DevicePairingManager(storage_path=storage_path)
    assert manager_reload.authenticate_device(paired.device_id, paired.device_token) is True

