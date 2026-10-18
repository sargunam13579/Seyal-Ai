"""
Seyal AI Context Manager.

Manages the conversation context (working memory), building the message
history that gets sent to the LLM on each turn.
"""

from __future__ import annotations

from collections import deque

from seyal_ai.llm.providers.base import LLMMessage
from seyal_ai.utils.logging import get_logger

log = get_logger("core.context")


class ContextManager:
    """
    Manages the conversation context window.

    Maintains the complete conversation history and injects system context
    (tools, memory, device state) into the prompt.

    Messages are not automatically trimmed.
    """

    def __init__(self, max_turns: int = 20, max_chars: int = 120_000) -> None:
        """
        Args:
            max_turns: Maximum number of user turns to keep in context.
            max_chars: Maximum character budget across history to prevent LLM context overflow.
        """
        self._max_turns = max_turns
        self._max_chars = max_chars
        self._messages: deque[LLMMessage] = deque()
        self._system_prompt: str = ""
        self._running_summary: str = ""

    def set_system_prompt(self, prompt: str) -> None:
        """Set or update the system prompt."""
        self._system_prompt = prompt

    @property
    def system_prompt(self) -> str:
        """Get the current system prompt."""
        return self._system_prompt

    def get_system_prompt(self) -> str:
        """Get the current system prompt."""
        return self._system_prompt

    def _total_char_length(self) -> int:
        """Sum of all message content character lengths."""
        return sum(len(m.content or "") for m in self._messages)

    def _trim_oldest_turn(self) -> bool:
        """
        Atomically evict the oldest user turn, including all its subsequent
        tool calls, tool results, and assistant response.
        Distills evicted turns into a rolling context summary to prevent memory cliff.
        Returns True if a turn was evicted, False if not possible.
        """
        if not self._messages:
            return False

        user_snippet = ""
        asst_snippet = ""

        # Pop the oldest user message
        if self._messages and self._messages[0].role == "user":
            u_msg = self._messages.popleft()
            if u_msg.content:
                user_snippet = u_msg.content[:160].replace("\n", " ").strip()

        # Pop any associated tool calls, tool results, or assistant reply
        # belonging to that turn until we hit the next user message
        while self._messages and self._messages[0].role != "user":
            popped = self._messages.popleft()
            if popped.role == "assistant" and popped.content and not asst_snippet:
                asst_snippet = popped.content[:160].replace("\n", " ").strip()

        # Append to running summary
        if user_snippet:
            entry = f"- User: {user_snippet} -> Seyal AI: {asst_snippet or 'Executed task'}"
            if not self._running_summary:
                self._running_summary = entry
            else:
                self._running_summary = f"{self._running_summary}\n{entry}"
                # Keep summary concise (max ~1500 chars)
                if len(self._running_summary) > 1500:
                    lines = self._running_summary.split("\n")
                    self._running_summary = "\n".join(lines[-10:])

        return True

    def _trim_messages(self) -> None:
        """
        Trim oldest turns when exceeding max_turns user turns or max_chars,
        always keeping message roles valid, complete, and atomic.
        """
        if self._max_turns <= 0 and self._max_chars <= 0:
            return

        # Ensure we keep at least 1 turn if messages exist
        while (
            (self._max_turns > 0 and self.turn_count > self._max_turns)
            or (self._max_chars > 0 and self._total_char_length() > self._max_chars)
        ) and self.turn_count > 1:
            if not self._trim_oldest_turn():
                break

        # Final sanitization: ensure the first message is always a user message
        while self._messages and self._messages[0].role != "user":
            self._messages.popleft()

    def add_user_message(self, content: str) -> None:
        """Add a user message to the context."""
        # Truncate oversized single inputs to avoid model context overflow (HTTP 400)
        safe_content = content
        if len(safe_content) > 36_000:
            safe_content = (
                safe_content[:35_000]
                + "\n\n[... Uploaded content truncated to avoid model context overflow ...]"
            )
            log.warning("User message exceeded 36,000 characters and was safely truncated.")

        self._messages.append(
            LLMMessage(role="user", content=safe_content)
        )
        self._trim_messages()

    def add_assistant_message(self, content: str) -> None:
        """Add an assistant response to the context."""
        self._messages.append(
            LLMMessage(role="assistant", content=content)
        )

    def add_tool_call_message(self, content: str) -> None:
        """Add an assistant message representing a tool call."""
        self._messages.append(
            LLMMessage(role="assistant", content=content)
        )

    def add_tool_result(
        self,
        tool_call_id: str,
        tool_name: str,
        result: str,
    ) -> None:
        """Add a tool result message to the context."""
        safe_result = result
        if len(safe_result) > 36_000:
            safe_result = (
                safe_result[:35_000]
                + "\n\n[... Tool output truncated to avoid model context overflow ...]"
            )
            log.warning("Tool output for '%s' exceeded 36,000 characters and was safely truncated.", tool_name)

        self._messages.append(
            LLMMessage(
                role="tool",
                content=safe_result,
                name=tool_name,
                tool_call_id=tool_call_id,
            )
        )

    def get_messages(self) -> list[LLMMessage]:
        """
        Build the full message list for the LLM, including system prompt.

        Returns:
            List starting with the system prompt,
            followed by the complete conversation history.
        """
        messages = []

        if self._system_prompt:
            content = self._system_prompt
            try:
                from seyal_ai.services.user_knowledge_service import user_knowledge_service
                uk = user_knowledge_service.get_user_knowledge()
                if uk:
                    facts_str = "\n".join(f"- {k}: {v}" for k, v in uk.items())
                    content += f"\n\n[USER KNOWLEDGE VAULT & PROFILE (VERIFIED FACTS)]:\n{facts_str}"
            except Exception:
                pass

            if self._running_summary:
                content += f"\n\n[EARLIER CONVERSATION MEMORY & KEY CONSTRAINTS (DISTILLED SUMMARY)]:\n{self._running_summary}"

            messages.append(
                LLMMessage(
                    role="system",
                    content=content,
                )
            )

        messages.extend(self._messages)

        return messages

    def clear(self) -> None:
        """Clear all conversation history and running summary (keeps system prompt)."""
        self._messages.clear()
        self._running_summary = ""

    def _trim(self) -> None:
        """
        Retained for backward compatibility.

        Automatic trimming is intentionally disabled so that
        the complete conversation history remains available.
        """
        pass

    @property
    def turn_count(self) -> int:
        """Number of user turns in the current context."""
        return sum(
            1
            for m in self._messages
            if m.role == "user"
        )

    @property
    def message_count(self) -> int:
        """Total number of messages in the context."""
        return len(self._messages)

    def get_recent_turns(self, count: int = 5) -> list[str]:
        """Return list of recent user message contents."""
        turns = [
            m.content
            for m in self._messages
            if m.role == "user"
        ]

        return turns[-count:]

    def get_last_user_message(self) -> str | None:
        """Return the content of the last user message."""
        for msg in reversed(self._messages):
            if msg.role == "user":
                return msg.content

        return None