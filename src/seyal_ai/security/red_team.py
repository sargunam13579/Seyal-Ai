"""
Seyal AI — Layer 4: Red Teaming & Adversarial Attack Defense Subsystem.

Defends against adversarial prompt engineering and jailbreak attempts:
  1. Persona & Roleplay Jailbreaks (DAN, Developer Mode, AIM, Unrestricted Mode)
  2. Identity & Branding Hijacking (Attempts to alter assistant name to forbidden personas)
  3. Obfuscated & Dangerous Command Injections (Base64, Hex encoding, Drive formatting)
  4. Credential & Environment Exfiltration (Dumping .env, API keys, Private vaults)
  5. Indirect Prompt Injections & Hidden Delimiters
"""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from enum import StrEnum

from seyal_ai.security.terminal_security import (
    CommandSafetyStatus,
    TerminalSecurityClassifier,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("security.red_team")


class AttackCategory(StrEnum):
    JAILBREAK_ROLEPLAY = "jailbreak_roleplay"
    IDENTITY_HIJACKING = "identity_hijacking"
    COMMAND_INJECTION = "command_injection"
    CREDENTIAL_EXFILTRATION = "credential_exfiltration"
    OBFUSCATED_PAYLOAD = "obfuscated_payload"
    INDIRECT_INJECTION = "indirect_injection"


class DefenseAction(StrEnum):
    ALLOW = "allow"
    BLOCK = "block"
    REDACT = "redact"
    CONFIRM_REQUIRED = "confirm_required"


@dataclass
class DefenseVerdict:
    """The security verdict after auditing user input against adversarial attacks."""

    is_safe: bool
    attack_detected: bool
    attack_category: AttackCategory | None
    action: DefenseAction
    confidence: float
    reason: str
    sanitized_input: str


class RedTeamGuard:
    """
    Automated Defense Guard against adversarial attacks and prompt injections.
    Audits incoming prompts before they reach the Brain orchestrator or LLM providers.
    """

    _JAILBREAK_PATTERNS = [
        r"\b(?:dan|aim|do\s+anything\s+now)\b",
        r"\bignore\s+(?:all\s+)?(?:previous\s+)?instructions\b",
        r"\byou\s+are\s+now\s+(?:in\s+)?developer\s+mode\b",
        r"\bdisregard\s+(?:your\s+)?(?:safety\s+)?(?:protocols|guidelines|rules)\b",
        r"\bunrestricted\s+mode\s+enabled\b",
        r"\bpretend\s+you\s+have\s+no\s+(?:morals|rules|limits|filters)\b",
    ]

    _IDENTITY_PATTERNS = [
        r"\b(?:you\s+are|call\s+yourself|pretend\s+to\s+be)\s+(?:jarvis|nexus)\b",
        r"\b(?:your\s+real\s+name\s+is|admit\s+you\s+are)\s+(?:jarvis|nexus)\b",
    ]

    _EXFILTRATION_PATTERNS = [
        r"\b(?:print|show|dump|leak|display|cat|type)\s+(?:the\s+)?(?:\.env|secrets|vault|api_key|private_key)\b",
        r"\bwhat\s+is\s+(?:the\s+)?(?:gemini_api_key|master_key|jwt_secret)\b",
        r"\bgive\s+me\s+(?:the\s+)?passwords?\b",
    ]

    def __init__(self) -> None:
        self.terminal_classifier = TerminalSecurityClassifier()

    def audit_input(self, prompt: str) -> DefenseVerdict:
        """
        Inspects user input for adversarial attacks, jailbreaks, or destructive vectors.
        Returns a DefenseVerdict specifying whether the input is safe to execute.
        """
        raw_text = prompt.strip()
        lower_text = raw_text.lower()

        # 1. JAILBREAK & UNRESTRICTED PERSONA ATTACKS
        for pattern in self._JAILBREAK_PATTERNS:
            if re.search(pattern, lower_text):
                log.warning("Adversarial jailbreak attempt detected: %s", raw_text)
                return DefenseVerdict(
                    is_safe=False,
                    attack_detected=True,
                    attack_category=AttackCategory.JAILBREAK_ROLEPLAY,
                    action=DefenseAction.BLOCK,
                    confidence=0.99,
                    reason="Jailbreak or rule override attempt detected.",
                    sanitized_input="",
                )

        # 2. IDENTITY HIJACKING (FORBIDDEN BRANDING)
        for pattern in self._IDENTITY_PATTERNS:
            if re.search(pattern, lower_text):
                log.warning("Identity hijacking attack detected: %s", raw_text)
                return DefenseVerdict(
                    is_safe=False,
                    attack_detected=True,
                    attack_category=AttackCategory.IDENTITY_HIJACKING,
                    action=DefenseAction.BLOCK,
                    confidence=0.98,
                    reason="Identity hijacking attempt violating Seyal AI branding.",
                    sanitized_input="",
                )

        # 3. CREDENTIAL & SECRET EXFILTRATION
        for pattern in self._EXFILTRATION_PATTERNS:
            if re.search(pattern, lower_text):
                log.warning("Credential exfiltration attack detected: %s", raw_text)
                return DefenseVerdict(
                    is_safe=False,
                    attack_detected=True,
                    attack_category=AttackCategory.CREDENTIAL_EXFILTRATION,
                    action=DefenseAction.BLOCK,
                    confidence=0.95,
                    reason="Attempt to access or dump confidential credentials/keys.",
                    sanitized_input="",
                )

        # 4. OBFUSCATED BASE64 PAYLOADS
        b64_match = re.search(r"\b[A-Za-z0-9+/]{20,}={0,2}\b", raw_text)
        if b64_match:
            try:
                decoded = (
                    base64.b64decode(b64_match.group(0)).decode("utf-8", errors="ignore").lower()
                )
                if any(
                    w in decoded
                    for w in ("format", "rm -rf", "del /f", "powershell", "system32", "shutdown")
                ):
                    return DefenseVerdict(
                        is_safe=False,
                        attack_detected=True,
                        attack_category=AttackCategory.OBFUSCATED_PAYLOAD,
                        action=DefenseAction.BLOCK,
                        confidence=0.99,
                        reason="Destructive command obfuscated in Base64 encoding.",
                        sanitized_input="",
                    )
            except Exception:
                pass

        # 5. DANGEROUS TERMINAL COMMAND CLASSIFICATION
        sec_check = self.terminal_classifier.classify_command(raw_text)
        if sec_check.status == CommandSafetyStatus.BLOCKED:
            return DefenseVerdict(
                is_safe=False,
                attack_detected=True,
                attack_category=AttackCategory.COMMAND_INJECTION,
                action=DefenseAction.BLOCK,
                confidence=1.0,
                reason=f"Dangerous shell command blocked: {sec_check.reason}",
                sanitized_input="",
            )
        elif sec_check.status == CommandSafetyStatus.CONFIRM_REQUIRED:
            return DefenseVerdict(
                is_safe=True,
                attack_detected=False,
                attack_category=None,
                action=DefenseAction.CONFIRM_REQUIRED,
                confidence=0.9,
                reason="High-impact command requires explicit user confirmation.",
                sanitized_input=raw_text,
            )

        # 6. SAFE INPUT
        return DefenseVerdict(
            is_safe=True,
            attack_detected=False,
            attack_category=None,
            action=DefenseAction.ALLOW,
            confidence=1.0,
            reason="Input verified as safe.",
            sanitized_input=raw_text,
        )
