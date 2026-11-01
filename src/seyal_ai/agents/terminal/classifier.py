"""
Command Security Classification for Terminal Agent.

Strictly inspects CLI commands against destructive patterns, system purging,
disk wiping, registry tampering, and privilege escalations.
"""

from __future__ import annotations

import re
from typing import NamedTuple

from seyal_ai.platform.security.terminal_security import (
    CommandAnalysisResult,
    CommandSafetyStatus,
    TerminalSecurityClassifier as PlatformClassifier,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.terminal.classifier")


class TerminalClassification(NamedTuple):
    is_safe: bool
    status: CommandSafetyStatus
    reason: str


class TerminalAgentSecurityClassifier:
    """
    Evaluates terminal command safety with Windows and cross-platform guardrails.
    """

    # 1. Unconditionally Blocked: Destructive system wipe & corruption patterns
    _STRICT_BLOCKED_PATTERNS = [
        # Disk formatting & partition wiping
        (re.compile(r"(?i)\bformat\s+[a-zA-Z]:"), "Disk partition formatting is strictly prohibited."),
        (re.compile(r"(?i)\bdiskpart\b"), "Diskpart utility execution is strictly prohibited."),
        (re.compile(r"(?i)\bmkfs(?:\.[a-z0-9]+)?\b"), "Filesystem creation/formatting is strictly prohibited."),
        # System directory recursive purging
        (re.compile(r"(?i)\brmdir\s+/[sS]"), "Recursive system directory purging is prohibited."),
        (re.compile(r"(?i)\bdel\s+.*(?:/[fF]|/[sS]|/[qQ]).*[cC]:\\(?:windows|system32)", re.IGNORECASE), "Direct Windows system directory deletion is prohibited."),
        (re.compile(r"(?i)\bRemove-Item\s+.*(?:-Recurse|-Force)\s+.*[cC]:\\", re.IGNORECASE), "Recursive root directory purging is prohibited."),
        (re.compile(r"(?i)\brm\s+-[rRfF]{1,3}\s+(?:/|/boot|/etc|/sys|/usr|C:\\|C:/)"), "System-wide root directory destruction is prohibited."),
        # Registry destruction
        (re.compile(r"(?i)\breg\s+(?:delete|add)\s+HKLM"), "Direct modification of HKEY_LOCAL_MACHINE registry hive is blocked."),
        # Volume shadow copy & system recovery destruction
        (re.compile(r"(?i)\bvssadmin\s+delete\s+shadows"), "Deletion of volume shadow copies (ransomware indicator) is prohibited."),
        (re.compile(r"(?i)\bwbadmin\s+delete\s+catalog"), "Deletion of Windows backup catalog is prohibited."),
        # Boot configuration tampering
        (re.compile(r"(?i)\bbcdedit\s+(?:/delete|/set|/export)"), "Tampering with Windows Boot Configuration Data is prohibited."),
        # Fork bombs & infinite crashers
        (re.compile(r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:"), "Fork bomb pattern detected and blocked."),
        (re.compile(r"(?i)powershell.*while\s*\(\s*(?:\$true|1)\s*\)\s*\{\s*start-process"), "Process spawning fork bomb detected and blocked."),
    ]

    # 2. Confirmation Required: High impact destructive operations
    _CONFIRMATION_PATTERNS = [
        (re.compile(r"(?i)\bgit\s+push\s+.*(?:--force|-f\b)"), "Force pushing to remote repository requires user confirmation."),
        (re.compile(r"(?i)\bgit\s+reset\s+--hard"), "Hard reset of git working tree requires user confirmation."),
        (re.compile(r"(?i)\bgit\s+clean\s+-[fFdD]"), "Force cleaning untracked git files requires user confirmation."),
    ]

    def __init__(self, platform_classifier: PlatformClassifier | None = None) -> None:
        self._platform_classifier = platform_classifier or PlatformClassifier()

    def classify(self, command: str) -> TerminalClassification:
        """
        Classify a command and return (is_safe, status, reason).
        """
        raw = command.strip()
        if not raw:
            return TerminalClassification(False, CommandSafetyStatus.BLOCKED, "Empty command.")

        # Check strict blocked regexes first
        for pattern, reason in self._STRICT_BLOCKED_PATTERNS:
            if pattern.search(raw):
                log.warning("Terminal command BLOCKED by strict rule: '%s' (Reason: %s)", raw, reason)
                return TerminalClassification(False, CommandSafetyStatus.BLOCKED, reason)

        # Check confirmation patterns
        for pattern, reason in self._CONFIRMATION_PATTERNS:
            if pattern.search(raw):
                return TerminalClassification(True, CommandSafetyStatus.CONFIRM_REQUIRED, reason)

        # Delegate to platform classifier for semantic risk and confirmation rules
        platform_result: CommandAnalysisResult = self._platform_classifier.analyze(raw)
        if platform_result.status == CommandSafetyStatus.BLOCKED:
            return TerminalClassification(False, CommandSafetyStatus.BLOCKED, platform_result.reason)
        if platform_result.status == CommandSafetyStatus.CONFIRM_REQUIRED:
            return TerminalClassification(True, CommandSafetyStatus.CONFIRM_REQUIRED, platform_result.reason)

        return TerminalClassification(True, CommandSafetyStatus.ALLOWED, "Command verified as safe.")

