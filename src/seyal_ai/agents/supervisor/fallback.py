"""
Sequential LLM Fallback Handler Subsystem.

Provides robust provider fallback management with:
- Strict connection cancellation on primary timeout.
- Clean-slate secondary model execution without partial output splicing.
- Audit logging of `PROVIDER_BILLING_UNCERTAIN` for aborted calls.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Callable, Coroutine

from seyal_ai.platform.security.audit import AuditLogger
from seyal_ai.utils.logging import get_logger

log = get_logger("supervisor.fallback")


class FallbackError(Exception):
    """Raised when all provider options in the fallback chain fail."""


class LLMFallbackHandler:
    """
    Manages failover across multiple LLM providers.
    """

    def __init__(
        self,
        primary_provider: str = "anthropic",
        secondary_provider: str = "openai",
        first_token_timeout: float = 10.0,
        audit_logger: AuditLogger | None = None,
    ) -> None:
        self.primary_provider = primary_provider
        self.secondary_provider = secondary_provider
        self.first_token_timeout = first_token_timeout
        self.audit_logger = audit_logger

    async def execute_with_fallback(
        self,
        prompt: str,
        primary_call: Callable[[], Coroutine[Any, Any, str]],
        secondary_call: Callable[[], Coroutine[Any, Any, str]],
    ) -> tuple[str, str]:
        """
        Execute call with primary provider. If it times out or fails:
        1. Immediately abort connection.
        2. Log PROVIDER_BILLING_UNCERTAIN.
        3. Execute secondary provider cleanly from scratch.

        Returns: (result_text, provider_name)
        """
        log.info("Attempting primary LLM provider: %s", self.primary_provider)
        try:
            # Primary attempt with strict timeout
            result = await asyncio.wait_for(primary_call(), timeout=self.first_token_timeout)
            return result, self.primary_provider

        except asyncio.TimeoutError:
            log.warning(
                "Primary provider %s timed out (> %ss). Aborting transport cleanly.",
                self.primary_provider,
                self.first_token_timeout,
            )
            await self._log_billing_uncertainty(
                reason=f"Timeout after {self.first_token_timeout}s without first token."
            )

        except Exception as e:
            log.warning("Primary provider %s failed: %s. Aborting transport.", self.primary_provider, e)
            await self._log_billing_uncertainty(reason=f"Exception during stream: {str(e)}")

        # Fallback to secondary provider
        log.info("Executing secondary LLM provider from step 0: %s", self.secondary_provider)
        try:
            result = await secondary_call()
            return result, self.secondary_provider
        except Exception as e:
            log.error("Secondary provider %s also failed: %s", self.secondary_provider, e)
            raise FallbackError(f"All LLM providers failed. Primary and {self.secondary_provider} error: {e}")

    async def _log_billing_uncertainty(self, reason: str) -> None:
        """Record explicit audit log entry for potential provider costs on abort."""
        log.warning("PROVIDER_BILLING_UNCERTAIN: %s", reason)
        if self.audit_logger:
            try:
                await self.audit_logger.log_security_event(
                    event_type="PROVIDER_BILLING_UNCERTAIN",
                    details={
                        "provider": self.primary_provider,
                        "reason": reason,
                        "description": f"Primary provider {self.primary_provider} connection aborted mid-flight. Charges may still occur.",
                        "timestamp": time.time(),
                    },
                    risk_level="medium",
                )
            except Exception as e:
                log.error("Failed to log billing uncertainty to audit db: %s", e)

