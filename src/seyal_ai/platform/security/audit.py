"""
Seyal AI Audit Logger.

Records every significant action in the audit trail for security,
debugging, and transparency.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.platform.database.engine import get_session
from seyal_ai.platform.database.repositories.audit import AuditRepository
from seyal_ai.platform.security.redaction import sanitize_payload
from seyal_ai.utils.logging import get_logger

log = get_logger("security.audit")


class AuditLogger:
    """
    Logs actions to the audit trail.

    Every tool execution, permission decision, and security event
    is sanitized and recorded for later review.
    """

    def __init__(self, enabled: bool = True) -> None:
        self._enabled = enabled

    async def log_tool_execution(
        self,
        tool_name: str,
        parameters: dict[str, Any],
        result_status: str,
        risk_level: str,
        session_id: str | None = None,
    ) -> None:
        """Log a tool execution event with recursive redaction."""
        if not self._enabled:
            return

        try:
            clean_params = sanitize_payload(parameters)
            async with get_session() as session:
                repo = AuditRepository(session)
                await repo.log_action(
                    action_type="tool_execution",
                    tool_name=tool_name,
                    parameters=clean_params,
                    result_status=result_status,
                    risk_level=risk_level,
                    session_id=session_id,
                )
            log.debug("Audit: tool=%s, status=%s, risk=%s", tool_name, result_status, risk_level)
        except Exception as e:
            # Audit logging should never crash the main application.
            # Never log raw exception message to stderr as it may contain basic auth credentials.
            log.error(
                "Failed to write audit log [error_type=%s, error_code=%s]",
                type(e).__name__,
                getattr(e, "code", getattr(e, "pgcode", "UNSPECIFIED")),
            )

    async def log_auth_event(
        self,
        event_type: str,
        success: bool,
        details: str | None = None,
        session_id: str | None = None,
    ) -> None:
        """Log an authentication event with recursive redaction."""
        if not self._enabled:
            return

        try:
            raw_details = {"details": details} if details else None
            clean_details = sanitize_payload(raw_details) if raw_details else None
            async with get_session() as session:
                repo = AuditRepository(session)
                await repo.log_action(
                    action_type=f"auth_{event_type}",
                    result_status="success" if success else "failed",
                    parameters=clean_details,
                    session_id=session_id,
                )
        except Exception as e:
            log.error(
                "Failed to write auth audit log [error_type=%s, error_code=%s]",
                type(e).__name__,
                getattr(e, "code", getattr(e, "pgcode", "UNSPECIFIED")),
            )

    async def log_security_event(
        self,
        event_type: str,
        details: dict[str, Any] | None = None,
        risk_level: str = "medium",
        session_id: str | None = None,
    ) -> None:
        """Log a general security event with recursive redaction."""
        if not self._enabled:
            return

        try:
            clean_details = sanitize_payload(details) if details else None
            async with get_session() as session:
                repo = AuditRepository(session)
                await repo.log_action(
                    action_type=f"security_{event_type}",
                    parameters=clean_details,
                    risk_level=risk_level,
                    session_id=session_id,
                )
        except Exception as e:
            log.error(
                "Failed to write security audit log [error_type=%s, error_code=%s]",
                type(e).__name__,
                getattr(e, "code", getattr(e, "pgcode", "UNSPECIFIED")),
            )

