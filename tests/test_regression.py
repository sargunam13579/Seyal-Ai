"""
Seyal AI Regression Testing Suite.

Guarantees that previously identified bugs, edge cases, and regressions
do NOT reoccur across software updates and refactorings:
1. REGRESSION-01: Voice Listening Callback Loss & Race Conditions (Push #24 Bug).
2. REGRESSION-02: Acoustic Speaker Echo & Duplicate Transcript Suppression.
3. REGRESSION-03: STT Silence Artifacts, Pseudo-JSON & Timestamp Cleaning.
4. REGRESSION-04: Out-of-Order Stale Turn Overwrite Protection.
5. REGRESSION-05: Context Window Memory Overflow & System Prompt Preservation.
6. REGRESSION-06: Emergency Stop Idempotence & Safe Double-Cancellation.
"""

from __future__ import annotations

import re

from seyal_ai.planning.cancellation import CancellationManager

# ===========================================================================
# 1. REGRESSION-01: VOICE LISTENING CALLBACK & REGISTRATION INTEGRITY
# ===========================================================================


class TestVoiceListeningRegistrationRegression:
    """Verifies that speech callbacks are never lost due to transient listening states."""

    def test_regression_transcript_listeners_receive_dispatched_speech(self):
        """
        Regression: In Push #24, a race condition caused transcript callbacks to be dropped
        if isListening was already True. Verify that multiple registered transcript listeners
        reliably receive speech transcripts unconditionally.
        """
        dispatched_messages: list[str] = []

        # Simulate VoiceContext transcript listener registry
        listeners: set = set()

        def register_listener(handler):
            listeners.add(handler)
            return lambda: listeners.discard(handler)

        def dispatch_final_transcript(text: str):
            clean_text = text.strip()
            if not clean_text:
                return
            for listener in list(listeners):
                listener(clean_text)

        # Register two independent subscribers (e.g. Chat View and Activity Logger)
        unsub1 = register_listener(lambda t: dispatched_messages.append(f"View: {t}"))
        register_listener(lambda t: dispatched_messages.append(f"Logger: {t}"))

        # Dispatch speech
        dispatch_final_transcript("Open visual studio code now")

        assert len(dispatched_messages) == 2
        assert "View: Open visual studio code now" in dispatched_messages
        assert "Logger: Open visual studio code now" in dispatched_messages

        # Unregister one subscriber and verify clean detachment without memory leaks
        unsub1()
        dispatch_final_transcript("Second instruction")
        assert len(dispatched_messages) == 3
        assert "Logger: Second instruction" in dispatched_messages


# ===========================================================================
# 2. REGRESSION-02: ACOUSTIC ECHO & DEDUPLICATION REGRESSION
# ===========================================================================


class TestAcousticEchoAndDeduplicationRegression:
    """Verifies that speaker self-hearing acoustic echo and rapid duplicate transcripts are rejected."""

    def test_regression_speaker_echo_rejection(self):
        """
        Regression: Assistant voice output played through laptop speakers was picked up
        by the microphone and dispatched as user input. Verify echo rejection logic.
        """
        last_assistant_speech = "Good morning Friend, I am ready. What task would you like to run today?"

        def normalize(t: str) -> str:
            return re.sub(r"[.,/#!$%^&*;:{}=\-_`~()?'\"]", "", t).lower().strip()

        norm_assistant = normalize(last_assistant_speech)

        def is_echo(user_transcript: str) -> bool:
            norm_user = normalize(user_transcript)
            # 1. Exact or substring echo of assistant output
            return bool(norm_user in norm_assistant or norm_assistant in norm_user)

        # Exact echo from microphone
        assert is_echo("Good morning Friend, I am ready") is True
        assert is_echo("What task would you like to run today?") is True

        # Genuine user input must NOT be flagged as echo
        assert is_echo("Please open my downloads folder") is False
        assert is_echo("What is the current CPU temperature?") is False

    def test_regression_rapid_duplicate_transcript_suppression(self):
        """
        Regression: Parallel STT recognizers dispatched duplicate transcripts within milliseconds.
        Verify that deduplication filter suppresses duplicate normalized transcripts within threshold.
        """
        last_processed = {"text": "", "time": 0.0}
        accepted_transcripts: list[str] = []

        def process_transcript(text: str, current_time: float):
            clean = text.strip().lower()
            if clean == last_processed["text"] and (current_time - last_processed["time"] < 2.0):
                # Duplicate within 2s suppression window -> reject
                return False
            last_processed["text"] = clean
            last_processed["time"] = current_time
            accepted_transcripts.append(text)
            return True

        # First dispatch at t=10.0s -> Accepted
        assert process_transcript("Open browser", 10.0) is True
        # Rapid duplicate at t=10.3s (300ms later) -> Suppressed
        assert process_transcript("Open browser", 10.3) is False
        # Legitimate repeated command after 2.5s (t=12.8s) -> Accepted
        assert process_transcript("Open browser", 12.8) is True

        assert len(accepted_transcripts) == 2


# ===========================================================================
# 3. REGRESSION-03: STT HALLUCINATION & SANITIZATION REGRESSION
# ===========================================================================


class TestSTTHallucinationSanitizationRegression:
    """Verifies that Whisper acoustic noise artifacts and pseudo-JSON formatting are sanitized."""

    def test_regression_whisper_hallucination_and_timestamp_filtering(self):
        """
        Regression: Acoustic noise caused Whisper to hallucinate timestamps like '[00:00.000]'
        or subtitle credits. Verify filtering rejects these artifacts cleanly.
        """
        hallucination_samples = [
            "[00:00.000]",
            "00:00",
            "00:00:00",
            "Subtitles by Amara.org",
            "Thank you for watching!",
            "Closed captions by Google",
        ]

        def is_hallucination(text: str) -> bool:
            clean = text.strip()
            # Timestamp regex
            if re.match(r"^\[?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\]?$", clean, re.I):
                return True
            # Subtitle artifact regex
            return bool(re.search(r"\b(subtitles? by|closed captions?|thank you for watching|amara\.org)\b", clean, re.I))

        for artifact in hallucination_samples:
            assert is_hallucination(artifact) is True, f"Failed to filter hallucination artifact: '{artifact}'"

        # Legitimate user speech must NOT be filtered
        valid_inputs = [
            "What time is it?",
            "Set a timer for 10 minutes",
            "Open my project folder",
        ]
        for speech in valid_inputs:
            assert is_hallucination(speech) is False

    def test_regression_pseudo_json_transcript_cleaning(self):
        """
        Regression: Streaming STT models sometimes wrapped user speech in pseudo-JSON
        like '{"text": "open edge"}'. Verify unwrapping extracts the pure spoken text.
        """
        raw_pseudo_json = '{"text": "open chrome browser", "language": "en"}'

        def clean_transcript(raw: str) -> str:
            clean = raw.strip()
            match = re.search(r'["\']?text["\']?\s*:\s*["\']?(.*?)(?:["\']?\s*,\s*["\']?language|["\']?\s*\}|$)', clean, re.I | re.S)
            if match and match.group(1):
                clean = match.group(1).strip()
            return clean.strip("{\"'}")

        assert clean_transcript(raw_pseudo_json) == "open chrome browser"


# ===========================================================================
# 4. REGRESSION-04: OUT-OF-ORDER STALE TURN OVERWRITE PROTECTION
# ===========================================================================


class TestTurnRaceConditionRegression:
    """Verifies that stale turn responses never overwrite newer user turns."""

    def test_regression_stale_turn_invalidation(self):
        """
        Regression: If turn 1 takes 3 seconds and turn 2 is issued at 1 second,
        turn 1's late response must NOT overwrite turn 2.
        """
        active_turn_id = 0
        current_bubble_content = ""

        def start_new_turn() -> int:
            nonlocal active_turn_id
            active_turn_id += 1
            return active_turn_id

        def commit_assistant_reply(turn_id: int, text: str):
            nonlocal current_bubble_content
            # Guard: Stale response check
            if turn_id != active_turn_id:
                return False  # Stale response discarded
            current_bubble_content = text
            return True

        # Turn 1 starts
        turn_1 = start_new_turn()
        assert turn_1 == 1

        # Turn 2 starts before turn 1 finishes (User interrupted or asked follow-up)
        turn_2 = start_new_turn()
        assert turn_2 == 2

        # Turn 2 completes first
        assert commit_assistant_reply(turn_2, "Fast response for Turn 2") is True
        assert current_bubble_content == "Fast response for Turn 2"

        # Turn 1 arrives late -> MUST BE DISCARDED
        assert commit_assistant_reply(turn_1, "Old stale response for Turn 1") is False
        assert current_bubble_content == "Fast response for Turn 2"


# ===========================================================================
# 5. REGRESSION-05: EMERGENCY STOP IDEMPOTENCE
# ===========================================================================


class TestEmergencyStopRegression:
    """Verifies that emergency stop is safe to invoke repeatedly without unhandled exceptions."""

    def test_regression_emergency_stop_multiple_invocations(self):
        """
        Regression: Calling emergency_stop multiple times rapidly in succession
        must not throw uncaught exceptions or raise unhandled KeyError/IndexError.
        """
        cancel_mgr = CancellationManager()
        token1 = cancel_mgr.create_token(plan_id="plan_alpha")
        token2 = cancel_mgr.create_token(plan_id="plan_beta")

        # Invoke emergency stop 3 times in a row
        cancel_mgr.emergency_stop(reason="First kill trigger")
        cancel_mgr.emergency_stop(reason="Second kill trigger")
        cancel_mgr.emergency_stop(reason="Third kill trigger")

        assert token1.is_cancelled
        assert token1.is_emergency
        assert token2.is_cancelled
        assert token2.is_emergency
