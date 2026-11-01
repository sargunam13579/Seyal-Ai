"""
Sandboxed Terminal & CLI Agent for Seyal AI.

Orchestrates security classification, subprocess execution with process-tree cleanup,
and audit trail integration.
"""

from __future__ import annotations

from typing import Any, Callable

from seyal_ai.agents.terminal.classifier import (
    TerminalAgentSecurityClassifier,
    TerminalClassification,
)
from seyal_ai.agents.terminal.executor import TerminalSubprocessExecutor
from seyal_ai.agents.terminal.models import TerminalRequest, TerminalResponse
from seyal_ai.platform.security.audit import AuditLogger
from seyal_ai.platform.security.terminal_security import CommandSafetyStatus
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.terminal.agent")


class TerminalAgent:
    """
    Sandboxed Terminal & CLI Agent.

    Enforces dangerous command interception, process-tree termination on timeouts,
    32 KB buffer limits, and immutable contracts.
    """

    def __init__(
        self,
        classifier: TerminalAgentSecurityClassifier | None = None,
        executor: TerminalSubprocessExecutor | None = None,
        audit_logger: AuditLogger | None = None,
        confirmation_handler: Callable[[str, str], bool] | None = None,
    ) -> None:
        self._classifier = classifier or TerminalAgentSecurityClassifier()
        self._executor = executor or TerminalSubprocessExecutor()
        self._audit_logger = audit_logger or AuditLogger()
        self._confirmation_handler = confirmation_handler

    def classify(self, command: str) -> TerminalClassification:
        """Evaluate command safety classification."""
        return self._classifier.classify(command)

    def is_safe(self, command: str) -> bool:
        """Check whether a command is safe to execute without blocking."""
        return self._classifier.classify(command).is_safe

    async def execute(self, request: TerminalRequest) -> TerminalResponse:
        """
        Execute a terminal command with security checks and audit logging.
        """
        # 1. Security Classification
        classification = self._classifier.classify(request.command)

        if classification.status == CommandSafetyStatus.BLOCKED:
            log.warning("Terminal command rejected by security guardrails: '%s' (%s)", request.command, classification.reason)
            # Log security event in audit repository asynchronously
            try:
                await self._audit_logger.log_security_event(
                    event_type="terminal_command_blocked",
                    details={
                        "command": request.command,
                        "reason": classification.reason,
                        "working_dir": request.working_dir,
                    },
                    risk_level="high",
                )
            except Exception as e:
                log.debug("Audit logger error during blocked event: %s", e)

            return TerminalResponse(
                command=request.command,
                exit_code=126,
                stdout="",
                stderr=f"Command blocked by security policy: {classification.reason}",
                is_truncated=False,
                duration_ms=0.0,
                safety_status="blocked",
                error=classification.reason,
            )

        # 2. Check Confirmation Requirement
        if classification.status == CommandSafetyStatus.CONFIRM_REQUIRED:
            if self._confirmation_handler is not None:
                confirmed = self._confirmation_handler(request.command, classification.reason)
                if not confirmed:
                    return TerminalResponse(
                        command=request.command,
                        exit_code=125,
                        stdout="",
                        stderr="Command execution rejected by user confirmation.",
                        is_truncated=False,
                        duration_ms=0.0,
                        safety_status="confirmation_required",
                        error="User rejected execution confirmation.",
                    )
            else:
                # If confirmation is required but no handler provided, mark and permit or fail safely
                log.info("High-impact command requires confirmation: '%s'", request.command)

        # 3. Subprocess Execution
        response = await self._executor.execute(request)

        # 4. Audit Logging of Execution
        try:
            await self._audit_logger.log_tool_execution(
                tool_name="terminal_agent",
                parameters={"command": request.command, "working_dir": request.working_dir or ""},
                result_status="success" if response.exit_code == 0 else "failed",
                risk_level="low" if response.exit_code == 0 else "medium",
            )
        except Exception as e:
            log.debug("Audit logger error during tool execution log: %s", e)

        return response
