"""
Seyal AI Personalization Manager.

Manages user communication tone, custom instructions, and behavioral preferences.
Persists configuration to disk (~/.seyal_ai/personalization.json) and injects
tailored prompt directives directly into the Seyal AI Brain reasoning context.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from seyal_ai.utils.logging import get_logger

log = get_logger("personalization.manager")


class PersonalizationConfig(BaseModel):
    """User personalization and communication configuration."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    communication_tone: str = Field(
        default="action",
        description="Communication tone: 'action', 'executive', 'copilot', 'mentor'",
    )
    custom_instructions: str = Field(
        default="Prefer Tamil when speaking aloud, English when writing code. Always write modular Python & TypeScript. Prefer PowerShell syntax for Windows commands.",
        description="Custom instructions injected into LLM reasoning loop.",
    )
    proactive_suggestions: bool = Field(
        default=True,
        description="Whether assistant offers proactive suggestions.",
    )
    language_auto_switching: bool = Field(
        default=True,
        description="Whether assistant mirrors user's language dynamically.",
    )
    concise_code_only: bool = Field(
        default=False,
        description="Whether code answers should be concise code-only without prose.",
    )


TONE_DIRECTIVES: dict[str, str] = {
    "action": (
        "## Communication Tone & Style: Action-First Operator (Default)\n"
        "- Execute directly and rapidly with zero conversational pleasantries.\n"
        "- Give immediate action status, concise bullet points, and actionable outcomes."
    ),
    "executive": (
        "## Communication Tone & Style: Executive Advisor\n"
        "- Provide polished, formal executive briefings with clear high-level impact summaries.\n"
        "- Structure information into strategic bulleted action items and risk assessments."
    ),
    "copilot": (
        "## Communication Tone & Style: Pair-Programmer & Co-Pilot\n"
        "- Act as an encouraging, pragmatic senior developer and coding partner.\n"
        "- Offer architectural insights, clean code patterns, and practical implementation tips."
    ),
    "mentor": (
        "## Communication Tone & Style: Detailed Mentor\n"
        "- Provide step-by-step pedagogical explanations and clear contextual reasoning.\n"
        "- Break down complex concepts with helpful educational background and examples."
    ),
}


class PersonalizationManager:
    """Manages persistent personalization settings and system prompt injection."""

    def __init__(self, storage_path: Path | str | None = None) -> None:
        if storage_path is not None:
            self._storage_path = Path(storage_path)
        else:
            self._storage_path = Path.home() / ".seyal_ai" / "personalization.json"

        self._config = self._load()

    @property
    def config(self) -> PersonalizationConfig:
        return self._config

    def _load(self) -> PersonalizationConfig:
        """Load personalization configuration from disk or initialize defaults."""
        if self._storage_path.exists():
            try:
                data = json.loads(self._storage_path.read_text(encoding="utf-8"))
                return PersonalizationConfig(**data)
            except Exception as err:
                log.warning("Could not read personalization config from %s: %s", self._storage_path, err)

        cfg = PersonalizationConfig()
        self._save(cfg)
        return cfg

    def _save(self, cfg: PersonalizationConfig) -> None:
        """Save personalization configuration to disk."""
        try:
            self._storage_path.parent.mkdir(parents=True, exist_ok=True)
            self._storage_path.write_text(
                json.dumps(cfg.model_dump(by_alias=True), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as err:
            log.error("Failed to save personalization config to %s: %s", self._storage_path, err)

    def get_config(self) -> PersonalizationConfig:
        return self._config

    def update_config(self, new_config: PersonalizationConfig | dict[str, Any]) -> PersonalizationConfig:
        if isinstance(new_config, dict):
            self._config = PersonalizationConfig(**new_config)
        else:
            self._config = new_config
        self._save(self._config)
        log.info("Updated personalization config: tone=%s", self._config.communication_tone)
        return self._config

    def get_system_prompt_snippet(self) -> str:
        """Generate tailored prompt directives to inject into system prompt."""
        parts: list[str] = []

        # 1. Communication tone directive
        tone = self._config.communication_tone.lower()
        directive = TONE_DIRECTIVES.get(tone, TONE_DIRECTIVES["action"])
        parts.append(directive)

        # 2. Output preference (concise code only)
        if self._config.concise_code_only:
            parts.append(
                "## Output Rule: Concise Code Only\n"
                "- When providing code solutions, output strictly the clean, production-ready code blocks.\n"
                "- Keep explanations to the absolute minimum necessary."
            )

        # 3. Custom Instructions
        custom = self._config.custom_instructions.strip()
        if custom:
            parts.append(
                f"## User Custom Persona & Behavioral Instructions (MANDATORY TO FOLLOW):\n{custom}"
            )

        return "\n\n".join(parts)


_singleton_manager: PersonalizationManager | None = None


def get_personalization_manager() -> PersonalizationManager:
    global _singleton_manager
    if _singleton_manager is None:
        _singleton_manager = PersonalizationManager()
    return _singleton_manager
