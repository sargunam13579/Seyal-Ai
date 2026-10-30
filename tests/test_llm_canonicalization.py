"""
Seyal AI — LLM Canonicalization & Backward Compatibility Verification Test Suite.

Verifies:
1. Object and Class Identity between legacy (`seyal_ai.llm`) and canonical (`seyal_ai.platform.llm`).
2. Single Provider Registry and Router integrity.
3. Streaming, Tool-calling, and Mock Routing functionality.
4. Seamless Cross-Path Instantiation and Type Checking.
"""

import pytest
from unittest.mock import AsyncMock, patch

# Canonical imports
from seyal_ai.platform.llm import (
    ModelRouter as CanonicalRouter,
    BaseLLMProvider as CanonicalBaseProvider,
    ModelTier as CanonicalTier,
    LLMMessage as CanonicalMessage,
    LLMResponse as CanonicalResponse,
    ToolCallRequest as CanonicalToolCall,
    ToolSchema as CanonicalToolSchema,
    GeminiProvider as CanonicalGemini,
    OpenAIProvider as CanonicalOpenAI,
    AnthropicProvider as CanonicalAnthropic,
    OllamaProvider as CanonicalOllama,
    get_identity_prompt as canonical_identity_prompt,
    build_system_prompt as canonical_build_system_prompt,
    build_language_guardrail_prompt as canonical_guardrail_prompt,
)

# Legacy imports
from seyal_ai.llm import (
    ModelRouter as LegacyRouter,
    BaseLLMProvider as LegacyBaseProvider,
    ModelTier as LegacyTier,
    LLMMessage as LegacyMessage,
    LLMResponse as LegacyResponse,
    ToolCallRequest as LegacyToolCall,
    ToolSchema as LegacyToolSchema,
    GeminiProvider as LegacyGemini,
    OpenAIProvider as LegacyOpenAI,
    AnthropicProvider as LegacyAnthropic,
    OllamaProvider as LegacyOllama,
    get_identity_prompt as legacy_identity_prompt,
    build_system_prompt as legacy_build_system_prompt,
    build_language_guardrail_prompt as legacy_guardrail_prompt,
)


class TestLLMCanonicalIdentities:
    """Ensure legacy and canonical imports resolve to the EXACT same object in memory."""

    def test_router_and_base_class_identities(self):
        assert CanonicalRouter is LegacyRouter
        assert CanonicalBaseProvider is LegacyBaseProvider
        assert CanonicalTier is LegacyTier

    def test_dataclass_identities(self):
        assert CanonicalMessage is LegacyMessage
        assert CanonicalResponse is LegacyResponse
        assert CanonicalToolCall is LegacyToolCall
        assert CanonicalToolSchema is LegacyToolSchema

    def test_provider_class_identities(self):
        assert CanonicalGemini is LegacyGemini
        assert CanonicalOpenAI is LegacyOpenAI
        assert CanonicalAnthropic is LegacyAnthropic
        assert CanonicalOllama is LegacyOllama

    def test_prompt_function_identities(self):
        assert canonical_identity_prompt is legacy_identity_prompt
        assert canonical_build_system_prompt is legacy_build_system_prompt
        assert canonical_guardrail_prompt is legacy_guardrail_prompt


class TestLLMCrossPathCompatibility:
    """Ensure data structures created on one path interact seamlessly with the other."""

    def test_cross_path_instance_checks(self):
        legacy_msg = LegacyMessage(role="user", content="Hello Seyal")
        assert isinstance(legacy_msg, CanonicalMessage)

        canonical_resp = CanonicalResponse(
            content="Answer",
            tool_calls=[CanonicalToolCall(id="tc-1", name="search", arguments={"q": "AI"})],
            model="gemini-flash-lite-latest",
        )
        assert isinstance(canonical_resp, LegacyResponse)
        assert canonical_resp.has_tool_calls is True
        assert canonical_resp.tool_calls[0].name == "search"

    def test_prompt_generation_equivalence(self):
        canon_res = canonical_build_system_prompt(user_name="Sargunam", mother_tongue="Tamil")
        legacy_res = legacy_build_system_prompt(user_name="Sargunam", mother_tongue="Tamil")
        assert canon_res == legacy_res
        assert "Tamil" in canon_res


@pytest.mark.asyncio
class TestModelRouterExecution:
    """Ensure ModelRouter functions properly under canonicalization."""

    async def test_router_generate_with_mock_provider(self):
        router = CanonicalRouter()
        mock_provider = AsyncMock(spec=CanonicalBaseProvider)
        mock_provider.provider_name = "MockProvider"
        mock_provider.generate.return_value = CanonicalResponse(
            content="Synthetic AI output",
            finish_reason="stop",
            model="mock-model",
        )
        mock_provider.check_availability.return_value = True

        router._providers = {"gemini": mock_provider}
        router._initialized = True

        resp = await router.generate(
            messages=[LegacyMessage(role="user", content="Test prompt")],
            tier=LegacyTier.FAST,
        )

        assert resp.content == "Synthetic AI output"
        assert resp.model == "mock-model"
        assert mock_provider.generate.called

    async def test_router_streaming_with_mock_provider(self):
        router = CanonicalRouter()

        class StreamingMockProvider(CanonicalBaseProvider):
            @property
            def provider_name(self) -> str:
                return "StreamMock"

            async def generate(self, *args, **kwargs):
                return CanonicalResponse(content="Full content")

            async def generate_stream(self, *args, **kwargs):
                for chunk in ["Chunk1 ", "Chunk2 ", "Chunk3"]:
                    yield chunk

            async def check_availability(self) -> bool:
                return True

        provider = StreamingMockProvider()
        router._providers = {"gemini": provider}
        router._initialized = True

        chunks = []
        async for piece in router.generate_stream(
            messages=[CanonicalMessage(role="user", content="Stream this")],
            tier=CanonicalTier.FAST,
        ):
            chunks.append(piece)

        assert "".join(chunks) == "Chunk1 Chunk2 Chunk3"

    async def test_router_fallback_chain(self):
        router = CanonicalRouter()

        failing_provider = AsyncMock(spec=CanonicalBaseProvider)
        failing_provider.provider_name = "FailingProvider"
        failing_provider.generate.side_effect = RuntimeError("Primary API connection failed")

        working_fallback = AsyncMock(spec=CanonicalBaseProvider)
        working_fallback.provider_name = "WorkingFallback"
        working_fallback.generate.return_value = CanonicalResponse(
            content="Recovered from fallback",
            finish_reason="stop",
            model="fallback-model",
        )

        # Primary is gemini, fallback is openai
        router._providers = {
            "gemini": failing_provider,
            "openai": working_fallback,
        }
        router._initialized = True

        resp = await router.generate(
            messages=[CanonicalMessage(role="user", content="Fallback test")],
            tier=CanonicalTier.SMART,
        )

        assert resp.content == "Recovered from fallback"
        assert failing_provider.generate.called
        assert working_fallback.generate.called
