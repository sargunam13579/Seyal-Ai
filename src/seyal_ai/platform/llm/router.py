"""
Seyal AI Model Router (Canonical Platform Implementation).

Selects the appropriate LLM provider and model based on the task tier
(fast/smart/vision/local) and provider availability.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from seyal_ai.core.config import SeyalAiSettings

from seyal_ai.platform.llm.providers.base import (
    BaseLLMProvider,
    LLMMessage,
    LLMResponse,
    ModelTier,
    ToolSchema,
)
from seyal_ai.utils.logging import get_logger

log = get_logger("llm.router")


# Default models per provider and tier to prevent passing incompatible model names on fallback
PROVIDER_DEFAULT_MODELS: dict[str, dict[ModelTier, str]] = {
    "gemini": {
        ModelTier.FAST: "gemini-flash-lite-latest",
        ModelTier.SMART: "gemini-flash-lite-latest",
        ModelTier.VISION: "gemini-flash-lite-latest",
        ModelTier.LOCAL: "gemini-flash-lite-latest",
    },
    "openai": {
        ModelTier.FAST: "gpt-4o-mini",
        ModelTier.SMART: "gpt-4o",
        ModelTier.VISION: "gpt-4o",
        ModelTier.LOCAL: "gpt-4o-mini",
    },
    "anthropic": {
        ModelTier.FAST: "claude-3-5-haiku-latest",
        ModelTier.SMART: "claude-3-5-sonnet-latest",
        ModelTier.VISION: "claude-3-5-sonnet-latest",
        ModelTier.LOCAL: "claude-3-5-haiku-latest",
    },
    "ollama": {
        ModelTier.FAST: "llama3",
        ModelTier.SMART: "llama3",
        ModelTier.VISION: "llava",
        ModelTier.LOCAL: "llama3",
    },
}


class ModelRouter:
    """
    Routes LLM requests to the appropriate provider and model.

    The router maintains a registry of available providers and selects
    the best one based on the requested tier and availability.
    """

    def __init__(self, settings: SeyalAiSettings | None = None) -> None:
        if settings is None:
            from seyal_ai.core.config import get_settings

            self._settings = get_settings()
        else:
            self._settings = settings
        self._providers: dict[str, BaseLLMProvider] = {}
        self._initialized = False

    async def initialize(self) -> None:
        """Initialize all configured LLM providers."""
        if self._initialized:
            return

        cfg = self._settings

        # Register providers based on available API keys
        if cfg.gemini_api_key:
            from seyal_ai.platform.llm.providers.gemini import GeminiProvider

            provider = GeminiProvider(api_key=cfg.gemini_api_key)
            if await provider.check_availability():
                self._providers["gemini"] = provider
                log.info("✓ Gemini provider registered")

        if cfg.openai_api_key:
            from seyal_ai.platform.llm.providers.openai import OpenAIProvider

            openai_provider = OpenAIProvider(api_key=cfg.openai_api_key)
            if await openai_provider.check_availability():
                self._providers["openai"] = openai_provider
                log.info("✓ OpenAI provider registered")

        if cfg.anthropic_api_key:
            from seyal_ai.platform.llm.providers.anthropic import AnthropicProvider

            anthropic_provider = AnthropicProvider(api_key=cfg.anthropic_api_key)
            if await anthropic_provider.check_availability():
                self._providers["anthropic"] = anthropic_provider
                log.info("✓ Anthropic provider registered")

        # Always try local Ollama
        from seyal_ai.platform.llm.providers.ollama import OllamaProvider

        ollama = OllamaProvider(base_url=cfg.llm.ollama.base_url)
        if await ollama.check_availability():
            self._providers["ollama"] = ollama
            log.info("✓ Ollama (local) provider registered")

        if not self._providers:
            log.warning("No LLM providers available! Configure API keys in .env")

        self._initialized = True

    def _resolve_provider_and_model(self, tier: ModelTier) -> tuple[BaseLLMProvider, str]:
        """
        Resolve the provider and model name for a given tier.

        Falls through to available providers if the preferred one isn't configured,
        resolving the appropriate model name for the fallback provider.
        """
        cfg = self._settings.llm

        # Map tiers to (preferred_provider, model_name)
        tier_map = {
            ModelTier.FAST: (cfg.default_provider, cfg.fast_model),
            ModelTier.SMART: (cfg.default_provider, cfg.smart_model),
            ModelTier.VISION: (cfg.default_provider, cfg.vision_model),
            ModelTier.LOCAL: ("ollama", cfg.local_model),
        }

        preferred_provider_name, model = tier_map[tier]

        # Try the preferred provider
        if preferred_provider_name in self._providers:
            return self._providers[preferred_provider_name], model

        # Fallback: try any available provider (except for LOCAL tier)
        if tier != ModelTier.LOCAL:
            for name, provider in self._providers.items():
                if name != "ollama":
                    fallback_model = PROVIDER_DEFAULT_MODELS.get(name, {}).get(tier, model)
                    log.warning(
                        "Preferred provider '%s' unavailable, falling back to '%s' (model='%s')",
                        preferred_provider_name,
                        name,
                        fallback_model,
                    )
                    return provider, fallback_model

        # Last resort: Ollama
        if "ollama" in self._providers:
            log.warning("Falling back to local Ollama model")
            return self._providers["ollama"], cfg.local_model

        raise RuntimeError(
            "No LLM providers available. Please configure at least one API key "
            "in your .env file, or ensure Ollama is running."
        )

    async def generate(
        self,
        messages: list[LLMMessage],
        tier: ModelTier = ModelTier.FAST,
        tools: list[ToolSchema] | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """
        Generate an LLM response, routing to the appropriate provider.

        Args:
            messages: Conversation history.
            tier: Model tier (FAST, SMART, VISION, LOCAL).
            tools: Optional tool schemas for function calling.
            temperature: Override temperature (uses config default if None).
            max_tokens: Override max tokens (uses config default if None).

        Returns:
            The LLM response with content and/or tool calls.
        """
        if not self._initialized:
            await self.initialize()

        primary_provider, primary_model = self._resolve_provider_and_model(tier)
        cfg = self._settings.llm

        candidates: list[tuple[BaseLLMProvider, str]] = [(primary_provider, primary_model)]
        for p_name, p_inst in self._providers.items():
            if p_inst != primary_provider:
                p_models = PROVIDER_DEFAULT_MODELS.get(p_name, {})
                fallback_m = p_models.get(tier) or p_models.get(ModelTier.FAST) or cfg.local_model
                candidates.append((p_inst, fallback_m))

        last_error = None
        for cand_provider, cand_model in candidates:
            try:
                log.info(
                    "Routing to %s (model=%s, tier=%s)",
                    cand_provider.provider_name,
                    cand_model,
                    tier.value,
                )
                response = await cand_provider.generate(
                    messages=messages,
                    model=cand_model,
                    tools=tools,
                    temperature=temperature or cfg.temperature,
                    max_tokens=max_tokens or cfg.max_tokens,
                )

                if response.usage:
                    log.debug(
                        "Token usage: prompt=%d, completion=%d",
                        response.usage.get("prompt_tokens", 0),
                        response.usage.get("completion_tokens", 0),
                    )

                return response
            except Exception as err:
                log.warning(
                    "Provider %s failed with error: %s. Attempting fallback if available...",
                    cand_provider.provider_name,
                    err,
                )
                last_error = err

        if last_error:
            raise last_error
        raise RuntimeError("All available LLM providers failed to generate response.")

    async def generate_stream(
        self,
        messages: list[LLMMessage],
        tier: ModelTier = ModelTier.FAST,
        tools: list[ToolSchema] | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ):
        """
        Generate a streaming LLM response, yielding text delta chunks as they arrive.
        Supports automatic runtime fallback if the primary provider fails at connection.
        """
        if not self._initialized:
            await self.initialize()

        primary_provider, primary_model = self._resolve_provider_and_model(tier)
        cfg = self._settings.llm

        candidates: list[tuple[BaseLLMProvider, str]] = [(primary_provider, primary_model)]
        for p_name, p_inst in self._providers.items():
            if p_inst != primary_provider:
                p_models = PROVIDER_DEFAULT_MODELS.get(p_name, {})
                fallback_m = p_models.get(tier) or p_models.get(ModelTier.FAST) or cfg.local_model
                candidates.append((p_inst, fallback_m))

        last_error = None
        for cand_provider, cand_model in candidates:
            try:
                log.info(
                    "Routing stream to %s (model=%s, tier=%s)",
                    cand_provider.provider_name,
                    cand_model,
                    tier.value,
                )
                yielded_any = False
                async for chunk in cand_provider.generate_stream(
                    messages=messages,
                    model=cand_model,
                    tools=tools,
                    temperature=temperature or cfg.temperature,
                    max_tokens=max_tokens or cfg.max_tokens,
                ):
                    yielded_any = True
                    yield chunk

                if yielded_any:
                    return
            except Exception as err:
                log.warning(
                    "Streaming provider %s failed with error: %s. Trying fallback...",
                    cand_provider.provider_name,
                    err,
                )
                last_error = err

        if last_error:
            raise last_error

    @property
    def available_providers(self) -> list[str]:
        """Return the names of all available providers."""
        return list(self._providers.keys())

    @property
    def has_providers(self) -> bool:
        """Whether any providers are available."""
        return len(self._providers) > 0
