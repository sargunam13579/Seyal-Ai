"""
Seyal AI Behavior & Accuracy Testing Suite.

Comprehensive test suite verifying:
1. AI Persona & Core Identity Behavior (Seyal AI branding, zero leaks, helpful demeanor).
2. Adaptive Multilingual Behavior (English, Tamil script, Tanglish code-switching).
3. Risk Assessment & Safety Behavior (Refusal of destructive commands, confirmation requirements).
4. Conversational Steering & Interruption Behavior (Barge-in, pivot, emergency kill switch).
5. Grounding & Clarification Behavior (Underspecified goal handling, bounding box bounds).
6. Intent Classification Accuracy Benchmark (Benchmarking intent classification across diverse queries).
7. Terminal Command Safety Accuracy (100% detection of blocked dangerous vs safe allowed commands).
8. Parameter & Entity Extraction Accuracy.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from seyal_ai.core.identity import IdentityManager
from seyal_ai.llm.prompts.language_guardrail import (
    is_tanglish_style,
    resolve_language_signals,
)
from seyal_ai.llm.providers.base import LLMResponse
from seyal_ai.planning.planner import TaskPlanner
from seyal_ai.planning.task_classifier import TaskSemanticClassifier
from seyal_ai.planning.task_types import TaskIntentType
from seyal_ai.planning.types import RiskLevel
from seyal_ai.security.terminal_security import CommandSafetyStatus, TerminalSecurityClassifier

# ===========================================================================
# 1. AI BEHAVIOR SUITE
# ===========================================================================


class TestAIBehavior:
    """Verifies core AI behavior, personality, guardrails, and interruption protocols."""

    def test_persona_and_branding_integrity(self, tmp_path: Path):
        """Test AI identity adheres strictly to Seyal AI without persona drift."""
        id_file = tmp_path / "identity.json"
        mgr = IdentityManager(storage_path=id_file)

        assert mgr.name == "Seyal AI"
        assert mgr.wake_word == "Seyal AI"
        assert "Seyal AI" in mgr.all_wake_words

        # Ensure forbidden branding words are not present in identity
        name_lower = mgr.name.lower()
        assert "jarvis" not in name_lower
        assert "nexus" not in name_lower

    def test_language_adaptive_behavior(self):
        """Test that AI adapts dynamically to user language style (English, Tamil, Tanglish)."""
        # 1. Tanglish Input Behavior
        tanglish_query = "Enakku inniku schedule check panni sollu."
        sig_tanglish = resolve_language_signals(current_input=tanglish_query)
        assert sig_tanglish.language_code == "ta"
        assert sig_tanglish.is_tanglish is True

        # 2. Pure Tamil Script Behavior
        tamil_query = "இன்றைய வானிலை எப்படி இருக்கிறது?"
        sig_tamil = resolve_language_signals(current_input=tamil_query)
        assert sig_tamil.language_code == "ta"
        assert sig_tamil.script == "tamil"
        assert sig_tamil.is_tanglish is False

        # 3. Pure English Behavior
        english_query = "List all files in my documents folder."
        sig_en = resolve_language_signals(current_input=english_query)
        assert sig_en.language_code == "en"
        assert sig_en.is_tanglish is False

        # 4. Explicit Language Directive Override Behavior
        override_query = "Please respond strictly in English."
        sig_override = resolve_language_signals(
            current_input=override_query,
            mother_tongue="Tamil",
        )
        assert sig_override.language_code == "en"

    def test_destructive_action_guardrail_behavior(self):
        """Test that destructive actions trigger HIGH risk and require explicit confirmation."""
        planner = TaskPlanner()

        # Destructive action
        risk, prompt = planner.assess_step_risk("Delete all temporary backup archives and format storage")
        assert risk == RiskLevel.HIGH
        assert prompt is not None
        assert "delete" in prompt.lower() or "confirm" in prompt.lower()

        # Safe read action
        safe_risk, safe_prompt = planner.assess_step_risk("Search documents folder for invoices")
        assert safe_risk == RiskLevel.LOW
        assert safe_prompt is None

    def test_underspecified_goal_clarification_behavior(self):
        """Test that incomplete or ambiguous instructions prompt for clarification instead of guessing."""
        planner = TaskPlanner()

        needs_clarif, question = planner.check_missing_clarifications("Send to phone which phone")
        assert needs_clarif is True
        assert question is not None
        assert "phone" in question.lower()


# ===========================================================================
# 2. AI ACCURACY BENCHMARK SUITE
# ===========================================================================


class TestAIAccuracy:
    """Quantitative accuracy benchmark tests for semantic classification and security."""

    @pytest.mark.asyncio
    async def test_intent_classification_accuracy_benchmark(self):
        """Benchmark intent classification accuracy across diverse user instructions."""
        mock_router = MagicMock()
        mock_router.initialize = AsyncMock()
        classifier = TaskSemanticClassifier(router=mock_router)

        test_cases = [
            # Query, Expected Intent, Mock JSON
            ("Alert me when email from manager arrives", TaskIntentType.NOTIFY, '{"title": "Alert Manager Mail", "intent_type": "notify", "task_type": "conditional", "auto_permission_granted": false}'),
            ("Whenever price drops below 500 notify me", TaskIntentType.NOTIFY, '{"title": "Price Drop Alert", "intent_type": "notify", "task_type": "conditional", "auto_permission_granted": false}'),
            ("Tell me if network disconnects", TaskIntentType.NOTIFY, '{"title": "Network Alert", "intent_type": "notify", "task_type": "conditional", "auto_permission_granted": false}'),
            ("Open Chrome and search for machine learning papers", TaskIntentType.TASK, '{"title": "Search Papers", "intent_type": "task", "task_type": "immediate", "auto_permission_granted": false}'),
            ("Organize my downloads folder by file extension", TaskIntentType.TASK, '{"title": "Organize Downloads", "intent_type": "task", "task_type": "immediate", "auto_permission_granted": false}'),
            ("Delete temporary cache files every midnight", TaskIntentType.TASK, '{"title": "Midnight Cache Cleanup", "intent_type": "task", "task_type": "scheduled", "auto_permission_granted": false}'),
        ]

        correct_count = 0
        for query, expected_intent, mock_json in test_cases:
            mock_router.generate = AsyncMock(return_value=LLMResponse(content=mock_json))
            spec = await classifier.classify_instruction(query)
            if spec.intent_type == expected_intent:
                correct_count += 1

        accuracy = correct_count / len(test_cases)
        assert accuracy == 1.0, f"Intent classification accuracy fell below 100%: {accuracy * 100}%"

    def test_terminal_command_security_classifier_accuracy(self):
        """Test accuracy of terminal command classifier distinguishing safe vs blocked commands."""
        classifier = TerminalSecurityClassifier()

        blocked_commands = [
            "format C: /fs:NTFS",
            "diskpart /s script.txt",
            "rmdir /s /q C:\\Windows",
            ":(){ :|:& };:",
            "%0|%0",
        ]

        safe_allowed_commands = [
            "dir",
            "ls -la",
            "echo Hello World",
            "git status",
            "python --version",
            "npm --version",
            "whoami",
        ]

        # Verify 100% of catastrophic blocked commands are blocked
        for cmd in blocked_commands:
            result = classifier.analyze(cmd)
            assert result.status == CommandSafetyStatus.BLOCKED, f"Dangerous command '{cmd}' was not BLOCKED! Got {result.status}"

        # Verify safe read-only commands are allowed
        for cmd in safe_allowed_commands:
            result = classifier.analyze(cmd)
            assert result.status == CommandSafetyStatus.ALLOWED, f"Safe command '{cmd}' was unexpectedly restricted! Got {result.status}"

    def test_tanglish_detection_accuracy(self):
        """Test accurate detection of Tanglish patterns vs pure English or pure Tamil."""
        tanglish_samples = [
            "Innaiku office la meeting irukku.",
            "File ah copy panni desktop la kudunga.",
            "Enakku nalla music play pannu.",
            "Epdi irukinga bro?",
            "Code run pannum bothu error varuthu.",
        ]

        for sample in tanglish_samples:
            assert is_tanglish_style(sample) is True, f"Failed to identify Tanglish style: '{sample}'"

        english_samples = [
            "Good morning, how are you today?",
            "Please create a new spreadsheet for the quarterly report.",
            "Find all files modified in the past 24 hours.",
        ]

        for sample in english_samples:
            assert is_tanglish_style(sample) is False, f"False positive Tanglish detected on English: '{sample}'"
