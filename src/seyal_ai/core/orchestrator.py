"""
Seyal AI Orchestrator.

Implements the agentic loop: the core cycle of
  User Input → LLM → Tool Calls → Results → LLM → Response
This is the engine that turns Seyal AI from a chatbot into an agent.
"""

from __future__ import annotations

from typing import Any

from seyal_ai.core.context import ContextManager
from seyal_ai.llm.providers.base import ModelTier
from seyal_ai.llm.router import ModelRouter
from seyal_ai.tools.executor import ToolExecutor
from seyal_ai.tools.registry import ToolRegistry
from seyal_ai.utils.events import get_event_bus
from seyal_ai.utils.logging import get_logger, print_thinking

log = get_logger("core.orchestrator")

# Maximum iterations of the agentic loop to prevent infinite tool-call chains
MAX_AGENT_ITERATIONS = 10

# Specific action intents that genuinely require local OS tools
_TOOL_INTENT_COMMANDS = {
    "open ", "launch ", "start ", "close ", "kill ", "stop ", "terminate ",
    "screenshot", "capture screen", "capture photo", "take photo", "record screen",
    "volume ", "mute", "unmute", "brightness ",
    "shutdown", "restart", "sleep pc", "lock pc", "lock screen",
    "wifi ", "bluetooth ", "ip address", "system specs", "hardware status", "diagnostic",
    "delete file", "create file", "search file", "list files", "read file",
    "google search", "navigate to", "open website", "open url",
}

# Category-specific action triggers for Smart Tool Pruning
_CATEGORY_INTENT_PATTERNS: dict[str, tuple[str, ...]] = {
    "system": (
        "volume", "mute", "unmute", "sound", "audio",
        "brightness", "battery", "power", "shutdown", "restart",
        "sleep pc", "lock pc", "lock screen", "system info", "specs", "current time",
    ),
    "vision": (
        "screenshot", "capture screen", "capture photo", "take photo", "record screen",
        "describe screen", "read screen", "screen ocr", "read screen text",
    ),
    "browser": (
        "google search", "search web", "search internet", "browse ", "open website",
        "open url", "navigate to", "chrome", "firefox", "edge browser", "web page",
    ),
    "application": (
        "open ", "launch ", "close ", "kill ", "switch app", "list apps", "running apps",
    ),
    "files": (
        "file", "folder", "directory", "create file", "delete file", "read file",
        "edit file", "search file", "list files", "save file", "archive", "compress",
    ),
    "terminal": (
        "terminal", "powershell", "cmd ", "run command", "execute command", "shell",
    ),
    "devices": (
        "device", "bluetooth", "wifi", "network", "ip address", "hardware status",
    ),
}

# Group synergistic tool categories together
_EXPANDED_CATEGORY_MAP: dict[str, set[str]] = {
    "system": {"system"},
    "vision": {"vision", "system"},  # Screenshot is housed under system
    "browser": {"browser", "web"},
    "application": {"application", "desktop"},
    "files": {"files", "file"},
    "terminal": {"terminal", "system"},
    "devices": {"devices", "system"},
}

_EXPLICIT_QUESTION_STARTERS = (
    "what", "why", "how", "who", "when", "where", "can", "could", "explain", "describe", "tell",
    "enna", "edhu", "ethu", "eppadi", "yen", "yaaru", "solla", "sollu", "vilakku",
)


def _requires_tools(user_input: str) -> bool:
    """
    Check if the user input requires system action tools (Tool Path) or is conversational (Fast Path).
    Avoids false positives on regular questions containing words like 'system', 'file', 'script'.
    """
    lowered = user_input.lower().strip()
    if not lowered:
        return False

    # Pure conversational / informational questions go to Fast Streaming Path
    if lowered.endswith("?") and not any(cmd in lowered for cmd in ("take screenshot", "open ", "launch ")):
        return False

    words = lowered.split()
    first_word = words[0] if words else ""
    if first_word in _EXPLICIT_QUESTION_STARTERS and not any(cmd in lowered for cmd in ("take screenshot", "open ", "launch ")):
        return False

    # Check for direct action command patterns
    return any(cmd in lowered for cmd in _TOOL_INTENT_COMMANDS)


def resolve_relevant_categories(user_input: str) -> set[str] | None:
    """
    Resolve specific tool categories needed for the user command.

    Returns:
        - None if user input is conversational (Fast Path - zero tools needed).
        - A small set of category names (e.g. {'system'} or {'browser', 'web'}).
        - None if it requires tools but intent spans general/unspecified categories (falls back to all tools).
    """
    if not _requires_tools(user_input):
        return None

    lowered = user_input.lower().strip()
    active_categories: set[str] = set()

    for cat_key, patterns in _CATEGORY_INTENT_PATTERNS.items():
        if any(pat in lowered for pat in patterns):
            expanded = _EXPANDED_CATEGORY_MAP.get(cat_key, {cat_key})
            active_categories.update(expanded)

    return active_categories if active_categories else None



class Orchestrator:
    """
    Coordinates the agentic loop: LLM reasoning → tool execution → final response.

    Attributes:
        last_tool_calls: Tool calls executed during the last message turn.
    """

    def __init__(
        self,
        router: ModelRouter,
        registry: ToolRegistry,
        executor: ToolExecutor,
        context: ContextManager,
    ) -> None:
        self._router = router
        self._registry = registry
        self._executor = executor
        self._context = context
        self._event_bus = get_event_bus()
        self.last_tool_calls: list[dict[str, Any]] = []

    async def process(
        self,
        user_input: str,
        tier: ModelTier = ModelTier.FAST,
        show_thinking: bool = True,
        allow_tools: bool = True,
        context: ContextManager | None = None,
    ) -> str:
        """
        Process a user input through the full agentic loop.

        Args:
            user_input: The user's message or command.
            tier: Which model tier to use for this request.
            show_thinking: Whether to print thinking steps in the terminal.
            allow_tools: Whether system tools are allowed for this request.
            context: ContextManager instance for this conversation (defaults to global).

        Returns:
            The final text response from Seyal AI.
        """
        ctx = context or self._context

        # Clear tool calls history for this turn
        self.last_tool_calls = []

        # Add user message to context
        ctx.add_user_message(user_input)

        # Fast Path vs Tool Path determination with Smart Category Pruning
        needs_tools = allow_tools and _requires_tools(user_input)
        if needs_tools:
            target_categories = resolve_relevant_categories(user_input)
            if target_categories:
                tool_schemas = self._registry.get_schemas(categories=target_categories)
                log.info(
                    "Smart Tool Pruning active: Selected %d tools from categories: %s (reduced from %d total)",
                    len(tool_schemas),
                    ", ".join(sorted(target_categories)),
                    self._registry.count,
                )
            else:
                tool_schemas = self._registry.get_schemas()
        else:
            tool_schemas = None

        # Emit event
        await self._event_bus.emit(
            "user.message",
            {"content": user_input, "mode": "tool" if needs_tools else "fast"},
            source="orchestrator",
        )

        executed_tools: list[dict[str, Any]] = []

        try:
            # --- Agentic Loop ---
            for iteration in range(MAX_AGENT_ITERATIONS):
                log.debug("Agentic loop iteration %d (needs_tools=%s)", iteration + 1, needs_tools)

                if show_thinking and iteration > 0:
                    print_thinking(f"Thinking... (step {iteration + 1})")

                # Send to LLM (offer tools only on first pass if tools are needed)
                active_tools = tool_schemas if (tool_schemas and iteration == 0) else None
                messages = ctx.get_messages()

                response = await self._router.generate(
                    messages=messages,
                    tier=tier,
                    tools=active_tools,
                )

                # If the LLM returned a final text response (no tool calls), we're done
                if not response.has_tool_calls:
                    final_response = response.content or "I have completed the task."
                    ctx.add_assistant_message(final_response)
                    self.last_tool_calls = executed_tools

                    await self._event_bus.emit(
                        "assistant.response",
                        {"content": final_response, "iterations": iteration + 1},
                        source="orchestrator",
                    )
                    return final_response

                # Add the assistant's tool-calling intent to context
                if response.content:
                    ctx.add_assistant_message(response.content)

                # Execute each tool call and collect results
                for tc in response.tool_calls:
                    log.info("LLM requested tool: %s(%s)", tc.name, tc.arguments)

                    if show_thinking:
                        print_thinking(f"Calling {tc.name}...")

                    result = await self._executor.execute(
                        tool_name=tc.name,
                        parameters=tc.arguments,
                    )

                    executed_tools.append({
                        "name": tc.name,
                        "arguments": tc.arguments if isinstance(tc.arguments, dict) else {},
                        "result": result.output,
                        "success": result.success,
                    })
                    self.last_tool_calls = executed_tools

                    # Add tool result to context for the next LLM iteration
                    ctx.add_tool_result(
                        tool_call_id=tc.id,
                        tool_name=tc.name,
                        result=result.output,
                    )

            # If we exhausted all iterations, return what we have
            log.warning("Agentic loop reached max iterations (%d)", MAX_AGENT_ITERATIONS)
            self.last_tool_calls = executed_tools
            final = "I've been working on this task but reached my step limit. Here's what I've done so far."
            ctx.add_assistant_message(final)
            return final
        except Exception:
            # Prevent context poisoning: rollback dangling user message if no response was recorded
            if ctx._messages and ctx._messages[-1].role == "user":
                ctx._messages.pop()
            raise

    async def process_stream(
        self,
        user_input: str,
        tier: ModelTier = ModelTier.FAST,
        allow_tools: bool = False,
        context: ContextManager | None = None,
    ):
        """
        Process user input and stream text chunks in real-time.
        """
        ctx = context or self._context
        self.last_tool_calls = []
        ctx.add_user_message(user_input)
        messages = ctx.get_messages()

        try:
            full_chunks: list[str] = []
            async for chunk in self._router.generate_stream(
                messages=messages,
                tier=tier,
            ):
                full_chunks.append(chunk)
                yield chunk

            final_response = "".join(full_chunks)
            if final_response:
                ctx.add_assistant_message(final_response)
        except Exception:
            # Prevent context poisoning: rollback dangling user message if no assistant response completed
            if ctx._messages and ctx._messages[-1].role == "user":
                ctx._messages.pop()
            raise

    def reset(self) -> None:
        """Reset the conversation context."""
        self._context.clear()
        log.info("Conversation context reset")
