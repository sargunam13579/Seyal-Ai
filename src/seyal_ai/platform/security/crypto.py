"""
Seyal AI Cryptography & Secret Vault Subsystem.

Provides AES-GCM and PBKDF2-based secret encryption, key derivation,
secure token generation, and credential zeroization.
"""

from __future__ import annotations

import base64
import getpass
import hashlib
import json
import os
import secrets
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("security.crypto")

class CryptographyUnavailableError(RuntimeError):
    """Raised when authenticated encryption cannot be performed because required cryptographic primitives are unavailable."""


class SecurityPermissionError(RuntimeError):
    """Raised when strict file or directory permissions cannot be enforced on sensitive security assets."""


def restrict_file_permissions(path: str | Path) -> None:
    """
    Restrict permissions on a sensitive file strictly to the current executing user.
    - On Windows NTFS: strips inheritance and grants Full control (F) to current user and SYSTEM.
    - On POSIX: sets 0o600 (owner read/write only).
    """
    p = Path(path).resolve()
    if not p.exists():
        raise FileNotFoundError(f"Target file does not exist: {p}")

    if os.name == "nt":
        try:
            user = getpass.getuser()
            cmd = ["icacls", str(p), "/inheritance:r", "/grant:r", f"{user}:F", "/grant:r", "SYSTEM:F"]
            res = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if res.returncode != 0:
                raise SecurityPermissionError(f"Failed to apply Windows NTFS ACL to {p}: {res.stderr or res.stdout}")
        except Exception as e:
            if isinstance(e, SecurityPermissionError):
                raise
            raise SecurityPermissionError(f"Windows ACL application error for {p}: {e}") from e
    else:
        try:
            os.chmod(p, 0o600)
        except Exception as e:
            raise SecurityPermissionError(f"Failed to set POSIX permissions 0600 on {p}: {e}") from e


def restrict_directory_permissions(path: str | Path) -> None:
    """
    Restrict permissions on a sensitive directory strictly to the current executing user.
    - On Windows NTFS: strips inheritance and grants (OI)(CI)F to current user and SYSTEM.
    - On POSIX: sets 0o700 (owner read/write/execute only).
    """
    p = Path(path).resolve()
    if not p.exists():
        raise FileNotFoundError(f"Target directory does not exist: {p}")

    if os.name == "nt":
        try:
            user = getpass.getuser()
            cmd = ["icacls", str(p), "/inheritance:r", "/grant:r", f"{user}:(OI)(CI)F", "/grant:r", "SYSTEM:(OI)(CI)F"]
            res = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if res.returncode != 0:
                raise SecurityPermissionError(f"Failed to apply Windows NTFS directory ACL to {p}: {res.stderr or res.stdout}")
        except Exception as e:
            if isinstance(e, SecurityPermissionError):
                raise
            raise SecurityPermissionError(f"Windows ACL directory error for {p}: {e}") from e
    else:
        try:
            os.chmod(p, 0o700)
        except Exception as e:
            raise SecurityPermissionError(f"Failed to set POSIX permissions 0700 on {p}: {e}") from e


# Authenticated encryption support using cryptography (AES-GCM)
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    _HAS_CRYPTOGRAPHY = True
except ImportError:
    AESGCM = None  # type: ignore[assignment, misc]
    _HAS_CRYPTOGRAPHY = False
    log.warning("cryptography package not installed; authenticated encryption primitives unavailable")


@dataclass
class SecretEntry:
    """Stored encrypted secret entry."""

    key: str
    encrypted_value: str
    nonce: str = ""
    created_at: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


class KeyManager:
    """
    Manages master encryption keys and key derivation from passphrases.
    """

    def __init__(self, key_dir: str | Path | None = None) -> None:
        if key_dir is None:
            home = Path.home()
            self.key_dir = home / ".seyal_ai" / "keys"
        else:
            self.key_dir = Path(key_dir)
        self.key_dir.mkdir(parents=True, exist_ok=True)
        restrict_directory_permissions(self.key_dir)
        self._master_key_file = self.key_dir / "master.key"
        self._master_key: bytes | None = None

    def get_or_create_master_key(self) -> bytes:
        """Load the master key from disk or generate a new 256-bit secure key."""
        if self._master_key is not None:
            return self._master_key

        if self._master_key_file.exists():
            try:
                restrict_file_permissions(self._master_key_file)
                self._master_key = self._master_key_file.read_bytes()
                if len(self._master_key) >= 32:
                    return self._master_key
            except Exception as e:
                log.warning("Could not read existing master key: %s, generating new", e)

        # Generate a new 32-byte (256-bit) cryptographically secure key
        new_key = secrets.token_bytes(32)
        tmp_key_file = self.key_dir / f".tmp_{secrets.token_hex(8)}.key"
        try:
            tmp_key_file.write_bytes(new_key)
            restrict_file_permissions(tmp_key_file)
            tmp_key_file.replace(self._master_key_file)
            restrict_file_permissions(self._master_key_file)
        except Exception as e:
            if tmp_key_file.exists():
                tmp_key_file.unlink(missing_ok=True)
            log.error("Could not persist master key to disk: %s", e)
            raise SecurityPermissionError(f"Failed to securely persist master key: {e}") from e

        self._master_key = new_key
        return self._master_key


    def derive_key(self, passphrase: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
        """
        Derive a 256-bit encryption key from a user passphrase using PBKDF2-HMAC-SHA256.
        """
        if salt is None:
            salt = secrets.token_bytes(16)
        derived = hashlib.pbkdf2_hmac("sha256", passphrase.encode("utf-8"), salt, iterations=100_000, dklen=32)
        return derived, salt

    @staticmethod
    def generate_token(length: int = 32) -> str:
        """Generate a cryptographically secure URL-safe random token."""
        return secrets.token_urlsafe(length)

    @staticmethod
    def generate_pin(digits: int = 6) -> str:
        """Generate a secure numeric PIN for device pairing."""
        upper = 10**digits
        val = secrets.randbelow(upper)
        return f"{val:0{digits}d}"


class SecretVault:
    """
    Encrypted key-value vault for storing sensitive credentials, API keys,
    and pairing tokens on disk.
    """

    def __init__(self, vault_path: str | Path | None = None, key_manager: KeyManager | None = None) -> None:
        if vault_path is None:
            home = Path.home()
            self.vault_path = home / ".seyal_ai" / "vault.enc"
        else:
            self.vault_path = Path(vault_path)
        self.vault_path.parent.mkdir(parents=True, exist_ok=True)
        restrict_directory_permissions(self.vault_path.parent)
        self._key_mgr = key_manager or KeyManager(self.vault_path.parent / "keys")
        self._cache: dict[str, str] = {}
        if self.vault_path.exists():
            restrict_file_permissions(self.vault_path)
        self._load_vault()

    def _get_encryption_key(self) -> bytes:
        return self._key_mgr.get_or_create_master_key()

    def _encrypt(self, plaintext: str) -> str:
        """Encrypt plaintext string to base64 ciphertext using authenticated AES-256-GCM."""
        if not _HAS_CRYPTOGRAPHY or AESGCM is None:
            raise CryptographyUnavailableError(
                "Authenticated encryption is unavailable: 'cryptography' library is required. "
                "Refusing to write secrets using insecure fallback encryption."
            )
        key = self._get_encryption_key()
        aesgcm = AESGCM(key)
        nonce = secrets.token_bytes(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        combined = nonce + ciphertext
        return base64.b64encode(combined).decode("utf-8")

    def _decrypt(self, ciphertext_b64: str) -> str:
        """Decrypt base64 ciphertext to plaintext string using authenticated AES-256-GCM."""
        if not _HAS_CRYPTOGRAPHY or AESGCM is None:
            raise CryptographyUnavailableError(
                "Authenticated decryption is unavailable: 'cryptography' library is required."
            )
        key = self._get_encryption_key()
        raw = base64.b64decode(ciphertext_b64.encode("utf-8"))
        if len(raw) < 28:
            raise ValueError("Corrupt ciphertext payload: minimum 28 bytes required for AES-GCM nonce and auth tag.")
        aesgcm = AESGCM(key)
        nonce = raw[:12]
        ciphertext = raw[12:]
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")

    def _load_vault(self) -> None:
        """Load and decrypt entries from disk."""
        if not self.vault_path.exists():
            return
        try:
            raw_data = self.vault_path.read_text(encoding="utf-8")
            if not raw_data.strip():
                return
            encrypted_payload = json.loads(raw_data)
            decrypted_json = self._decrypt(encrypted_payload["payload"])
            self._cache = json.loads(decrypted_json)
        except CryptographyUnavailableError:
            raise
        except Exception as e:
            log.warning("Could not decrypt secret vault (corrupted, tampered, or invalid key): %s", e)
            self._cache = {}

    def _save_vault(self) -> None:
        """Encrypt and persist cache to disk atomically with strict permissions."""
        tmp_vault: Path | None = None
        try:
            plaintext_json = json.dumps(self._cache)
            encrypted_b64 = self._encrypt(plaintext_json)
            payload = {"version": "1.0", "payload": encrypted_b64}
            tmp_vault = self.vault_path.parent / f".tmp_{secrets.token_hex(8)}.enc"
            tmp_vault.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            restrict_file_permissions(tmp_vault)
            tmp_vault.replace(self.vault_path)
            restrict_file_permissions(self.vault_path)
        except CryptographyUnavailableError:
            if tmp_vault and tmp_vault.exists():
                tmp_vault.unlink(missing_ok=True)
            raise
        except Exception as e:
            if tmp_vault and tmp_vault.exists():
                tmp_vault.unlink(missing_ok=True)
            log.error("Failed to write encrypted vault to disk: %s", e)
            raise

    def set_secret(self, key: str, value: str) -> None:
        """Store or update a secret in the vault."""
        self._cache[key] = value
        self._save_vault()

    def get_secret(self, key: str, default: str | None = None) -> str | None:
        """Retrieve a secret from the vault."""
        return self._cache.get(key, default)

    def delete_secret(self, key: str) -> bool:
        """Delete a secret from the vault."""
        if key in self._cache:
            del self._cache[key]
            self._save_vault()
            return True
        return False

    def list_keys(self) -> list[str]:
        """List all secret keys stored in the vault without revealing values."""
        return list(self._cache.keys())

    def clear(self) -> None:
        """Wipe all secrets from the vault."""
        self._cache.clear()
        self._save_vault()
