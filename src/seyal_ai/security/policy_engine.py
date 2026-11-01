"""
Seyal AI 4-Tier PolicyEngine Subsystem.

Classifies all agent tool and OS operations into 4 risk tiers:
- LOW: Auto-approved and audit logged.
- MEDIUM: Auto-approved within active session boundaries.
- HIGH: Requires explicit interactive user session confirmation.
- CRITICAL: Requires cryptographic RFC 8785 Ed25519 Approval Token + single-use nonce consumption.
"""

from __future__ import annotations

import re
from enum import StrEnum
from typing import Any
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from pydantic import BaseModel, ConfigDict, Field

from seyal_ai.security.approval_token import (
    ApprovalTokenManager,
    TokenSecurityError,
    compute_target_hash,
)
from seyal_ai.security.nonce_store import NonceStoreError, SqliteNonceStore
from seyal_ai.utils.logging import get_logger

log = get_logger("security.policy_engine")


class RiskTier(StrEnum):
    """The four risk tiers defined in Seyal AI Architecture."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PolicyDecision(BaseModel):
    """Immutable evaluation decision result from PolicyEngine."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    action: str
    tier: RiskTier
    approved: bool
    requires_user_confirmation: bool = False
    requires_approval_token: bool = False
    reason: str = Field(..., description="Human and audit readable rationale for decision.")


class PolicyEngine:
    """
    Central 4-tier security policy evaluation engine for Seyal AI.
    """

    # Critical patterns that require signed smartphone approval token
    _CRITICAL_ACTIONS = {
        "wipe_device",
        "format_disk",
        "delete_system_directory",
        "modify_registry",
        "clear_app_data",
    }

    _CRITICAL_CMD_PATTERNS = [
        re.compile(r"\bformat\b", re.IGNORECASE),
        re.compile(r"\bdiskpart\b", re.IGNORECASE),
        re.compile(r"\brmdir\s+/[sq]\b", re.IGNORECASE),
        re.compile(r"\bremove-item\b.*-recurse\b.*-force\b", re.IGNORECASE),
        re.compile(r"\breg\s+(delete|add)\b", re.IGNORECASE),
        re.compile(r"\bvssadmin\s+delete\b", re.IGNORECASE),
        re.compile(r"\bwbadmin\s+delete\b", re.IGNORECASE),
        re.compile(r"\bbcdedit\b", re.IGNORECASE),
    ]

    # High risk patterns that require active user session confirmation
    _HIGH_ACTIONS = {
        "execute_terminal_command",
        "install_package",
        "delete_file",
        "adb_input_keyevent",
        "mouse_drag",
    }

    # Medium risk actions (standard desktop / web interactions)
    _MEDIUM_ACTIONS = {
        "mouse_click",
        "mouse_double_click",
        "keyboard_type",
        "browser_navigate",
        "browser_click",
        "screen_capture",
        "write_temp_file",
    }

    # Low risk actions (pure read-only)
    _LOW_ACTIONS = {
        "read_file",
        "list_directory",
        "ocr_extract",
        "detect_ui_elements",
        "get_system_info",
        "get_paired_devices",
    }

    def __init__(self, nonce_store: SqliteNonceStore | None = None) -> None:
        self._nonce_store = nonce_store or SqliteNonceStore()

    @property
    def nonce_store(self) -> SqliteNonceStore:
        return self._nonce_store

    def classify_risk(self, action: str, parameters: dict[str, Any]) -> RiskTier:
        """Classify action and parameters into one of the 4 risk tiers."""
        act_lower = action.strip().lower()

        # 1. Check explicit critical actions
        if act_lower in self._CRITICAL_ACTIONS:
            return RiskTier.CRITICAL

        # Check for command line payloads in parameters
        command = parameters.get("command") or parameters.get("cmd") or ""
        if isinstance(command, str) and command:
            for pattern in self._CRITICAL_CMD_PATTERNS:
                if pattern.search(command):
                    return RiskTier.CRITICAL

        # 2. Check high risk
        if act_lower in self._HIGH_ACTIONS or "execute" in act_lower:
            return RiskTier.HIGH

        # 3. Check medium risk
        if act_lower in self._MEDIUM_ACTIONS:
            return RiskTier.MEDIUM

        # 4. Check low risk
        if act_lower in self._LOW_ACTIONS:
            return RiskTier.LOW

        # Default to HIGH for any unrecognized action
        return RiskTier.HIGH

    def evaluate(
        self,
        action: str,
        parameters: dict[str, Any],
        has_user_confirmed: bool = False,
        approval_token: str | None = None,
        public_key: Ed25519PublicKey | None = None,
        task_id: str | None = None,
    ) -> PolicyDecision:
        """
        Evaluate an action against the 4-tier matrix and return an immutable decision.
        """
        tier = self.classify_risk(action, parameters)

        # Tier 1: LOW
        if tier == RiskTier.LOW:
            return PolicyDecision(
                action=action,
                tier=tier,
                approved=True,
                reason="Auto-approved: Action is classified as read-only LOW risk.",
            )

        # Tier 2: MEDIUM
        if tier == RiskTier.MEDIUM:
            return PolicyDecision(
                action=action,
                tier=tier,
                approved=True,
                reason="Auto-approved: Action is standard interaction MEDIUM risk.",
            )

        # Tier 3: HIGH
        if tier == RiskTier.HIGH:
            if has_user_confirmed:
                return PolicyDecision(
                    action=action,
                    tier=tier,
                    approved=True,
                    requires_user_confirmation=True,
                    reason="Approved: User confirmed HIGH risk operation.",
                )
            return PolicyDecision(
                action=action,
                tier=tier,
                approved=False,
                requires_user_confirmation=True,
                reason="Blocked: HIGH risk action requires active user session confirmation.",
            )

        # Tier 4: CRITICAL
        if tier == RiskTier.CRITICAL:
            if not approval_token:
                return PolicyDecision(
                    action=action,
                    tier=tier,
                    approved=False,
                    requires_approval_token=True,
                    reason="Blocked: CRITICAL action requires Ed25519 signed RFC 8785 approval token.",
                )

            if not public_key:
                return PolicyDecision(
                    action=action,
                    tier=tier,
                    approved=False,
                    requires_approval_token=True,
                    reason="Blocked: No public key provided to verify approval token.",
                )

            # Calculate parameter hash
            target_hash = compute_target_hash(parameters)

            try:
                payload = ApprovalTokenManager.verify_token(
                    token=approval_token,
                    public_key=public_key,
                    expected_action=action,
                    expected_target_hash=target_hash,
                )

                # Atomically consume nonce
                tid = task_id or f"task_{action}_{payload.nonce[:8]}"
                self._nonce_store.consume_nonce(payload.nonce, task_id=tid)

                return PolicyDecision(
                    action=action,
                    tier=tier,
                    approved=True,
                    requires_approval_token=True,
                    reason=f"Approved: Valid token from {payload.supervisor_id} verified and nonce consumed.",
                )

            except (TokenSecurityError, NonceStoreError) as e:
                log.warning("Critical action rejected: %s", e)
                return PolicyDecision(
                    action=action,
                    tier=tier,
                    approved=False,
                    requires_approval_token=True,
                    reason=f"Blocked: Approval token rejected - {str(e)}",
                )

        return PolicyDecision(
            action=action,
            tier=tier,
            approved=False,
            reason=f"Blocked: Unhandled policy evaluation state for tier {tier}.",
        )
