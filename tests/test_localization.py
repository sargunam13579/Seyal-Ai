"""
Seyal AI — Comprehensive Localization & Dynamic Multilingual Test Suite.

Validates the full localization lifecycle:
  - Multilingual response generation across Tamil/Tanglish, Hindi, Spanish, French, and English
  - Permission and safety warning localization
  - 5-Tier dynamic language resolution hierarchy (Explicit > Current Message > Continuity > Profile > Default)
  - Universal language guardrail prompt synthesis and injection
  - Local-first user language profile discovery and cache invalidation
  - Phonetic Tanglish marker classification and code-switching detection
  - Speech-to-Text multilingual script categorization
  - Multilingual neural voice routing
  - Assistant identity customization localization
  - Robust boundary and fallback resilience on unsupported or corrupt locales
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

from seyal_ai.llm.prompts.language_guardrail import (
    build_language_guardrail_prompt,
    get_localized_response,
    get_user_language_profile,
    invalidate_user_language_profile_cache,
    is_tanglish_style,
    is_user_tamil_preferred,
    resolve_language_signals,
    resolve_response_language,
)
from seyal_ai.voice.stt import detect_text_language
from seyal_ai.voice.tts import resolve_multilingual_voice

# ===========================================================================
# 1. MULTILINGUAL SYSTEM RESPONSE TEMPLATES (LOC-01)
# ===========================================================================


class TestLocalizedResponseTemplates:
    """Verifies get_localized_response across all supported locales."""

    def test_loc01_welcome_greetings_multilingual(self):
        """Welcome greeting dynamically adapts to Tamil, Hindi, Spanish, French, and English."""
        # Tamil / Tanglish
        welcome_ta = get_localized_response("welcome", mother_tongue="Tamil", user="Sargunam")
        assert "Vanakkam Sargunam!" in welcome_ta
        assert "laptop-la enna task seiyalam" in welcome_ta

        # Hindi / Hinglish
        welcome_hi = get_localized_response("welcome", mother_tongue="Hindi", user="Rahul")
        assert "Namaste Rahul!" in welcome_hi
        assert "computer par kya kaam karein" in welcome_hi

        # Spanish
        welcome_es = get_localized_response("welcome", mother_tongue="Spanish", user="Carlos")
        assert "¡Hola Carlos!" in welcome_es
        assert "¿En qué tarea podemos trabajar hoy?" in welcome_es

        # French
        welcome_fr = get_localized_response("welcome", mother_tongue="French", user="Pierre")
        assert "Bonjour Pierre!" in welcome_fr
        assert "Sur quelle tâche voulons-nous travailler?" in welcome_fr

        # English (Default)
        welcome_en = get_localized_response("welcome", mother_tongue="English", user="Alex")
        assert "Alex!" in welcome_en
        assert "What computer task shall we work on?" in welcome_en

    def test_loc01_task_lifecycle_and_emergency_messages(self):
        """Lifecycle notifications (start, done, emergency stop) match localized phrasing."""
        # Task Ack
        ack_ta = get_localized_response("task_ack", mother_tongue="Tamil", item="Backup")
        assert "Backup task-ah ippo start panren!" in ack_ta

        ack_hi = get_localized_response("task_ack", mother_tongue="Hindi", item="Backup")
        assert "Backup task shuru kar raha hoon!" in ack_hi

        # Task Done
        done_ta = get_localized_response("task_done", mother_tongue="Tamil", item="Report")
        assert "Report mudichiten! Aduthu enna seiyalam?" in done_ta

        done_es = get_localized_response("task_done", mother_tongue="Spanish", item="Report")
        assert "¡Report completado!" in done_es

        # Emergency Stop
        stop_ta = get_localized_response("emergency_stop", mother_tongue="Tamil")
        assert "அவசர நிறுத்தம்" in stop_ta
        assert "நிறுத்தப்பட்டுவிட்டன" in stop_ta

        stop_hi = get_localized_response("emergency_stop", mother_tongue="Hindi")
        assert "आपातकालीन रोक" in stop_hi

        stop_en = get_localized_response("emergency_stop", mother_tongue="English")
        assert "EMERGENCY STOP" in stop_en


# ===========================================================================
# 2. USER PERMISSION GUARDRAIL LOCALIZATION (LOC-02)
# ===========================================================================


class TestLocalizedPermissionGuardrails:
    """Verifies that security and hardware control warnings are accurately localized."""

    def test_loc02_mouse_and_keyboard_permission_warnings(self):
        """Hardware permission warning strings guide the user to Settings > Computer Control."""
        # Mouse permission in Tamil
        mouse_ta = get_localized_response("permission_mouse", mother_tongue="Tamil")
        assert "Settings > Computer Control-la Mouse permission disable-la irukku" in mouse_ta
        assert "enable pannunga" in mouse_ta

        # Mouse permission in English
        mouse_en = get_localized_response("permission_mouse", mother_tongue="English")
        assert "Mouse Control permission is disabled in Settings > Computer Control" in mouse_en

        # Keyboard permission in Tamil
        kb_ta = get_localized_response("permission_keyboard", mother_tongue="Tamil")
        assert "Keyboard permission disable-la irukku" in kb_ta
        assert "Typing seiya enable pannunga" in kb_ta

        # App control permission in Tamil
        app_ta = get_localized_response("permission_app", mother_tongue="Tamil")
        assert "App Control permission disable-la irukku" in app_ta


# ===========================================================================
# 3. 5-TIER DYNAMIC LANGUAGE RESOLUTION HIERARCHY (LOC-03)
# ===========================================================================


class TestLanguageResolutionHierarchy:
    """Verifies the 5-Tier dynamic resolution formula."""

    def test_loc03_tier1_explicit_directive_overrides_profile(self):
        """Tier 1: Explicit user request in message overrides user profile mother tongue."""
        # Profile is Tamil, but user explicitly asks for English
        sig_en = resolve_language_signals(
            current_input="Explain the solution completely in English please.",
            mother_tongue="Tamil",
            known_languages=["Tamil", "Tanglish"],
        )
        assert sig_en.language_code == "en"
        assert sig_en.explicit_directive is not None
        assert "English" in sig_en.explicit_directive

        # Profile is English, but user asks for Tanglish
        sig_ta = resolve_language_signals(
            current_input="Tanglish-la explain pannunga.",
            mother_tongue="English",
            known_languages=["English"],
        )
        assert sig_ta.language_code == "ta"
        assert sig_ta.is_tanglish

    def test_loc03_tier2_adaptive_script_and_code_switching(self):
        """Tier 2: Current message script and code-switching style are mirrored."""
        # Pure Tamil Unicode script
        sig_tamil = resolve_language_signals(current_input="வணக்கம் Seyal AI, எப்டி இருக்கீங்க?")
        assert sig_tamil.language_code == "ta"
        assert sig_tamil.script == "tamil"
        assert not sig_tamil.is_tanglish

        # Tanglish (Tamil semantics in Latin letters)
        sig_tanglish = resolve_language_signals(current_input="Chrome browser open pannu, Seyal AI.")
        assert sig_tanglish.language_code == "ta"
        assert sig_tanglish.script == "latin"
        assert sig_tanglish.is_tanglish

        # Hindi in Latin letters (Hinglish)
        sig_hinglish = resolve_language_signals(current_input="Calculator kholo aur calculate karo.")
        assert sig_hinglish.language_code == "hi"

        # Standard English
        sig_english = resolve_language_signals(current_input="Open the visual studio code editor.")
        assert sig_english.language_code == "en"
        assert sig_english.script == "latin"

    def test_loc03_tier3_conversational_continuity_brief_followups(self):
        """Tier 3: Short follow-ups like 'Puriyala' maintain active Tanglish style."""
        sig1 = resolve_language_signals(current_input="Puriyala.")
        assert sig1.language_code == "ta"
        assert sig1.is_tanglish

        sig2 = resolve_language_signals(current_input="Simple-ah sollu.")
        assert sig2.language_code == "ta"
        assert sig2.is_tanglish

    def test_loc03_tier4_profile_preference_for_neutral_greetings(self):
        """Tier 4: Neutral greetings (Hi, Hello) resolve to user profile mother tongue."""
        sig = resolve_language_signals(
            current_input="",
            mother_tongue="Tamil",
            known_languages=["Tanglish", "English"],
        )
        assert sig.language_code == "ta"
        assert sig.is_tanglish

    def test_loc03_tier5_universal_english_fallback(self):
        """Tier 5: When no inputs, directives, or profiles are provided, default to English."""
        sig = resolve_language_signals(current_input="")
        assert sig.language_code == "en"
        assert sig.style == "english"


# ===========================================================================
# 4. LANGUAGE GUARDRAIL PROMPT SYNTHESIS & INJECTION (LOC-04)
# ===========================================================================


class TestLanguageGuardrailPromptSynthesis:
    """Verifies system prompt construction for LLM language alignment."""

    def test_loc04_prompt_contains_identity_and_universal_protocol(self):
        """Guardrail prompt enforces multilingual adaptation and zero language locking."""
        prompt = build_language_guardrail_prompt(
            mother_tongue="Tamil",
            known_languages=["Tamil", "English", "Tanglish"],
            current_input="Next step enna?",
        )

        assert "UNIVERSAL MULTILINGUAL LANGUAGE & CONVERSATION PROTOCOL" in prompt
        assert "ACTIVE REAL-TIME USER INTERACTION SIGNAL" in prompt
        assert 'Current Input: "Next step enna?"' in prompt
        assert "TA" in prompt
        assert "Mother Tongue: Tamil" in prompt
        assert "NEVER lock or restrict the user" in prompt

    def test_loc04_deduplicates_languages_case_insensitively(self):
        """Prompt deduplicates languages list (e.g., 'tamil' and 'Tamil')."""
        prompt = build_language_guardrail_prompt(
            mother_tongue="Tamil",
            known_languages=["tamil", "TAMIL", "English", "english"],
            current_input=None,
        )
        assert "Known / Familiar Languages: Tamil, English" in prompt


# ===========================================================================
# 5. USER LANGUAGE PROFILE LOCAL-FIRST DISCOVERY & CACHE (LOC-05)
# ===========================================================================


class TestLanguageProfileDiscoveryAndCache:
    """Verifies local-first user knowledge JSON discovery and cache invalidation."""

    def test_loc05_cache_invalidation_and_json_discovery(self, tmp_path: Path):
        """Invalidating cache forces reload of new user linguistic preferences."""
        invalidate_user_language_profile_cache()

        fake_hub = tmp_path / "user_knowledge_hub.json"
        fake_hub.write_text(
            json.dumps({
                "mother_tongue": "Tamil",
                "known_languages": ["Tamil", "Tanglish", "English"],
            }),
            encoding="utf-8",
        )

        with patch("seyal_ai.services.user_knowledge_service.user_knowledge_service.get_user_knowledge") as mock_get:
            mock_get.return_value = {
                "mother_tongue": "Tamil",
                "known_languages": ["Tamil", "Tanglish", "English"],
            }

            mt, kl = get_user_language_profile()
            assert mt == "Tamil"
            assert "Tanglish" in kl

            # Invalidate and update mock
            invalidate_user_language_profile_cache()
            mock_get.return_value = {
                "mother_tongue": "Hindi",
                "known_languages": ["Hindi", "English"],
            }

            mt2, kl2 = get_user_language_profile()
            assert mt2 == "Hindi"
            assert "Hindi" in kl2

        # Cleanup
        invalidate_user_language_profile_cache()


# ===========================================================================
# 6. PHONETIC TANGLISH MARKER CLASSIFICATION (LOC-06)
# ===========================================================================


class TestTanglishMarkerClassification:
    """Verifies discrimination between Latin Tanglish and Standard English."""

    def test_loc06_identifies_tanglish_verbs_and_particles(self):
        """Extended Tanglish markers correctly flag colloquial Tamil in English alphabet."""
        assert is_tanglish_style("Idha seekiram pannunga")
        assert is_tanglish_style("Enakku indha file venam")
        assert is_tanglish_style("Romba nalla irukku")
        assert is_tanglish_style("Endha error varuthu nu sollunga")
        assert is_tanglish_style("Epdi execute panradhu?")

    def test_loc06_rejects_standard_english_sentences(self):
        """Standard English and common developer terms are not misclassified as Tanglish."""
        assert not is_tanglish_style("Please start the development server.")
        assert not is_tanglish_style("Git status shows three untracked files.")
        assert not is_tanglish_style("Run the test suite using pytest.")
        assert not is_tanglish_style("")
        assert not is_tanglish_style("   ")


# ===========================================================================
# 7. SPEECH-TO-TEXT MULTILINGUAL SCRIPT CATEGORIZATION (LOC-07)
# ===========================================================================


class TestSTTMultilingualCategorization:
    """Verifies detect_text_language correctly routes transcriptions."""

    def test_loc07_stt_language_detection_matrix(self):
        """STT language detector correctly maps script and markers."""
        # Tamil Unicode Block (U+0B80 - U+0BFF)
        assert detect_text_language("வணக்கம் செயல் AI") == "ta"
        assert detect_text_language("கோப்பை திறக்கவும்") == "ta"

        # Devanagari Block (U+0900 - U+097F)
        assert detect_text_language("नमस्ते Seyal AI") == "hi"

        # Tanglish
        assert detect_text_language("Browser-la Seyal AI website open pannu") == "tanglish"
        assert detect_text_language("Inniki meeting time enna solra?") == "tanglish"

        # Hindi in Latin letters
        assert detect_text_language("Mera naya document kholo") == "hi"

        # English
        assert detect_text_language("Show me system awareness and telemetry") == "en"

        # Empty / whitespace fallback
        assert detect_text_language("") == "en"
        assert detect_text_language("   ") == "en"


# ===========================================================================
# 8. MULTILINGUAL NEURAL VOICE DISPATCHER (LOC-08)
# ===========================================================================


class TestNeuralVoiceDispatcherLocalization:
    """Verifies TTS voice routing based on linguistic properties."""

    def test_loc08_neural_voice_selection_by_script(self):
        """Tamil Unicode text routes to Pallavi/Valluvar, English to Ava Multilingual."""
        # Tamil Unicode default female
        voice_ta = resolve_multilingual_voice("வணக்கம், நீங்கள் கேட்ட கோப்பு சேமிக்கப்பட்டது.")
        assert voice_ta == "ta-IN-PallaviNeural"

        # Tamil Unicode male voice
        voice_male = resolve_multilingual_voice("செயல் AI தயார்.", requested_voice="male")
        assert voice_male == "ta-IN-ValluvarNeural"

        # English neutral voice
        voice_en = resolve_multilingual_voice("All background tasks completed successfully.")
        assert voice_en == "en-US-AvaMultilingualNeural"

        # Explicit custom voice override
        voice_custom = resolve_multilingual_voice("Hello world", requested_voice="en-IN-NeerjaNeural")
        assert voice_custom == "en-IN-NeerjaNeural"


# ===========================================================================
# 9. ASSISTANT IDENTITY CUSTOMIZATION LOCALIZATION (LOC-09)
# ===========================================================================


class TestAssistantIdentityLocalization:
    """Verifies localized name change prompts and confirmation messages."""

    def test_loc09_assistant_name_change_localized_prompts(self):
        """Prompt to change assistant name is phrased accurately in Tamil, Hindi, and English."""
        # Tamil / Tanglish prompt
        ask_ta = get_localized_response(
            "name_change_ask",
            mother_tongue="Tamil",
            current_name="Seyal AI",
            target_name="Seyal Pro",
        )
        assert "En peyara 'Seyal AI'-lendhu 'Seyal Pro'-nu maathattuma?" in ask_ta

        # Tamil confirmation done
        done_ta = get_localized_response(
            "name_change_done",
            mother_tongue="Tamil",
            target_name="Seyal Pro",
        )
        assert "En peyar 'Seyal Pro'-nu maathiyachu." in done_ta

        # Hindi prompt
        ask_hi = get_localized_response(
            "name_change_ask",
            mother_tongue="Hindi",
            current_name="Seyal AI",
            target_name="Seyal Assistant",
        )
        assert "Mera naam" in ask_hi or "apna naam" in ask_hi

        # English prompt
        ask_en = get_localized_response(
            "name_change_ask",
            mother_tongue="English",
            current_name="Seyal AI",
            target_name="Seyal AI",
        )
        assert "Do you want me to change my name" in ask_en


# ===========================================================================
# 10. ROBUST FALLBACK & BOUNDARY RESILIENCE (LOC-10)
# ===========================================================================


class TestLocalizationFallbackAndEdgeCases:
    """Verifies zero unhandled exceptions on unusual or empty linguistic signals."""

    def test_loc10_empty_and_corrupt_inputs_graceful_fallback(self):
        """Handles empty inputs, unknown keys, and unexpected locales cleanly."""
        # Unknown message key returns empty string without crashing
        assert get_localized_response("unknown_nonexistent_key", mother_tongue="Tamil") == ""

        # None / empty mother tongue defaults safely
        res_none = resolve_response_language(mother_tongue=None, known_languages=None)
        assert res_none == "en"

        # Check tamil preferred helper
        assert is_user_tamil_preferred("Tamil", ["Tanglish"])
        assert not is_user_tamil_preferred("German", ["English"])

        # Resolving response language for arbitrary inputs
        assert resolve_response_language(current_input="1234567890 !@#") == "en"

        # Guardrail prompt with empty languages
        prompt = build_language_guardrail_prompt(mother_tongue="", known_languages=[])
        assert "UNIVERSAL MULTILINGUAL LANGUAGE & CONVERSATION PROTOCOL" in prompt
        assert "User's primary language" in prompt
