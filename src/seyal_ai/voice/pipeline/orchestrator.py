"""Seyal AI Voice — Voice Pipeline Orchestrator."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

import numpy as np

from seyal_ai.llm.prompts.language_guardrail import (
    get_localized_response,
    get_user_language_profile,
)
from seyal_ai.utils.events import get_event_bus
from seyal_ai.utils.logging import get_logger
from seyal_ai.voice.stt import STTError

if TYPE_CHECKING:
    from seyal_ai.core.brain import SeyalAiBrain

from .state import InputMode, InteractionMode, PipelineState
from .audio_playback import play_tts_audio, play_mp3_bytes

log = get_logger("voice.pipeline.orchestrator")


class VoicePipeline:
    """The main voice pipeline orchestrator.

    Coordinates microphone capture, voice activity detection, speech-to-text,
    brain processing, text-to-speech, and audio playback into a seamless
    voice conversation loop with interruption support.
    """

    def __init__(
        self,
        brain: SeyalAiBrain,
        sample_rate: int = 16000,
        stt_provider: str = "multilingual_gemini",
        tts_provider: str = "edge",
        tts_voice: str = "auto",
        tts_speed: float = 1.0,
        tts_fallback_voice: str = "",
        language: str = "auto",
        silence_threshold_ms: int = 800,
        vad_threshold: float = 0.5,
        vad_min_speech_ms: int = 250,
        vad_energy_threshold: int = 300,
        interaction_mode: str = "voice_and_text",
        interrupt_enabled: bool = True,
    ) -> None:
        self._brain = brain
        self._sample_rate = sample_rate
        self._language = language
        self._interaction_mode = InteractionMode(interaction_mode)
        self._interrupt_enabled = interrupt_enabled

        self._state = PipelineState.STOPPED
        self._running = False
        self._listen_task: asyncio.Task | None = None
        self._processing_task: asyncio.Task | None = None
        self._event_bus = get_event_bus()

        # State change callbacks
        self._state_callbacks: list[Callable[[PipelineState], Any]] = []

        # --- Initialize components ---
        from seyal_ai.voice.audio_io import AudioPlayer, AudioRecorder
        from seyal_ai.voice.stt import STTEngine
        from seyal_ai.voice.tts import TTSEngine
        from seyal_ai.voice.vad import VoiceActivityDetector
        from seyal_ai.voice.wake_word import WakeWordDetector

        self._recorder = AudioRecorder(
            sample_rate=sample_rate,
            channels=1,
            chunk_duration_ms=30,
        )
        self._player = AudioPlayer(sample_rate=sample_rate)
        self._vad = VoiceActivityDetector(
            sample_rate=sample_rate,
            threshold=vad_threshold,
            silence_threshold_ms=silence_threshold_ms,
            min_speech_ms=vad_min_speech_ms,
            energy_threshold=vad_energy_threshold,
        )
        self._stt = STTEngine(
            provider_name=stt_provider,
            language=language,
        )
        self._tts = TTSEngine(
            provider_name=tts_provider,
            voice=tts_voice,
            speed=tts_speed,
            fallback_voice=tts_fallback_voice,
        )

        # Wake-word detector (Phase 3)
        from unittest.mock import NonCallableMock

        identity: Any = getattr(self._brain, "identity", None)
        if (
            identity is not None
            and not isinstance(identity, NonCallableMock)
            and hasattr(identity, "all_wake_words")
        ):
            wake_words = list(identity.all_wake_words)
            id_config = getattr(identity, "config", None)
            prefixes = getattr(id_config, "wake_word_prefixes", None)
            self._require_wake_word = bool(getattr(id_config, "require_wake_word", False))
        else:
            wake_words = ["Seyal AI", "Seyal"]
            prefixes = None
            self._require_wake_word = False

        self._wake_detector = WakeWordDetector(
            wake_words=wake_words,
            prefixes=prefixes,
        )

    @classmethod
    def from_settings(cls, brain: SeyalAiBrain, settings: Any) -> VoicePipeline:
        """Create a VoicePipeline from SeyalAiSettings."""
        vs = settings.voice
        return cls(
            brain=brain,
            sample_rate=vs.sample_rate,
            stt_provider=vs.stt_provider,
            tts_provider=vs.tts_provider,
            tts_voice=vs.tts.voice,
            tts_speed=vs.tts.speed,
            tts_fallback_voice=vs.tts.fallback_voice,
            language=vs.language,
            silence_threshold_ms=vs.silence_threshold_ms,
            vad_threshold=vs.vad.threshold,
            vad_min_speech_ms=vs.vad.min_speech_ms,
            vad_energy_threshold=vs.vad.energy_threshold,
            interaction_mode=vs.interaction_mode,
            interrupt_enabled=vs.interrupt_enabled,
        )

    def on_state_change(self, callback: Callable[[PipelineState], Any]) -> None:
        """Register a callback for pipeline state changes."""
        self._state_callbacks.append(callback)

    def _set_state(self, new_state: PipelineState) -> None:
        """Update the pipeline state and notify callbacks."""
        old_state = self._state
        self._state = new_state
        if old_state != new_state:
            log.debug("Pipeline: %s → %s", old_state.value, new_state.value)
            for cb in self._state_callbacks:
                try:
                    cb(new_state)
                except Exception as e:
                    log.error("State callback error: %s", e)

    async def start(self) -> None:
        """Start the voice pipeline."""
        if self._running:
            log.warning("Voice pipeline is already running")
            return

        if self._interaction_mode == InteractionMode.TEXT_ONLY:
            log.info("Voice pipeline not started (text-only mode)")
            return

        log.info("Starting voice pipeline...")

        try:
            self._recorder.start()
        except RuntimeError as e:
            log.error("Cannot start voice pipeline: %s", e)
            self._set_state(PipelineState.ERROR)
            raise

        self._running = True
        self._set_state(PipelineState.IDLE)

        # Start the listen loop as a background task
        self._listen_task = asyncio.create_task(self._listen_loop())

        await self._event_bus.emit(
            "voice.pipeline.started",
            {"mode": self._interaction_mode.value},
            source="voice.pipeline",
        )
        log.info(
            "Voice pipeline started (mode=%s, stt=%s, tts=%s)",
            self._interaction_mode.value,
            self._stt.provider_name,
            self._tts.provider_name,
        )

    async def stop(self) -> None:
        """Stop the voice pipeline and release all resources."""
        if not self._running:
            return

        log.info("Stopping voice pipeline...")
        self._running = False

        # Cancel background tasks
        if self._listen_task and not self._listen_task.done():
            self._listen_task.cancel()
            import contextlib

            with contextlib.suppress(asyncio.CancelledError):
                await self._listen_task

        if self._processing_task and not self._processing_task.done():
            self._processing_task.cancel()
            import contextlib

            with contextlib.suppress(asyncio.CancelledError):
                await self._processing_task

        # Stop all components
        self._recorder.stop()
        self._player.stop()
        self._tts.request_stop()
        self._vad.reset()

        self._set_state(PipelineState.STOPPED)

        await self._event_bus.emit(
            "voice.pipeline.stopped",
            {},
            source="voice.pipeline",
        )
        log.info("Voice pipeline stopped")

    def handle_barge_in(self) -> bool:
        """Handle acoustic barge-in interruption immediately (<50ms cut-off)."""
        if self._interrupt_enabled and (self._player.is_playing or self._state == PipelineState.SPEAKING):
            log.info("User interrupted (acoustic barge-in) — stopping TTS playback")
            self._player.stop()
            self._tts.request_stop()
            return True
        return False

    async def _listen_loop(self) -> None:
        """Main listening loop — runs continuously while the pipeline is active."""
        log.debug("Listen loop started")

        while self._running:
            try:
                self._set_state(PipelineState.IDLE)

                # Get audio chunk from recorder
                chunk = await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._recorder.get_chunk,
                    0.1,
                )
                if chunk is None:
                    await asyncio.sleep(0.01)
                    continue

                # Feed to VAD
                from seyal_ai.voice.vad import VADState

                vad_result = self._vad.process_chunk(chunk)

                if vad_result == VADState.SPEECH:
                    if self._state != PipelineState.LISTENING:
                        self._set_state(PipelineState.LISTENING)
                        await self._event_bus.emit(
                            "voice.speech.start",
                            {},
                            source="voice.pipeline",
                        )

                        # If currently speaking, interrupt immediately (<50ms acoustic barge-in)!
                        self.handle_barge_in()

                elif vad_result == VADState.SILENCE:
                    # End of speech — get the segment and process in decoupled task
                    speech_segment = self._vad.get_speech_segment()
                    if speech_segment is not None and len(speech_segment) > 0:
                        await self._event_bus.emit(
                            "voice.speech.end",
                            {"duration_samples": len(speech_segment)},
                            source="voice.pipeline",
                        )
                        # Decouple execution so listen loop continues listening concurrently
                        self._processing_task = asyncio.create_task(self._process_speech(speech_segment))

            except asyncio.CancelledError:
                break
            except Exception as e:
                log.error("Listen loop error: %s", e)
                self._set_state(PipelineState.ERROR)
                await asyncio.sleep(1)

        log.debug("Listen loop ended")

    async def _process_speech(self, audio_segment: np.ndarray) -> None:
        """Process a speech segment: transcribe → brain → speak."""
        self._set_state(PipelineState.PROCESSING)

        # Step 1: Speech-to-Text with automatic language detection
        try:
            trans_res = await self._stt.transcribe_with_language(
                audio_segment,
                self._sample_rate,
                self._language,
            )
            text = trans_res.text
            detected_lang = trans_res.language

            if not text.strip():
                log.debug("STT returned empty text, ignoring")
                self._set_state(PipelineState.IDLE)
                return

            log.info("Voice input: '%s' (detected language: %s)", text, detected_lang)

            await self._event_bus.emit(
                "voice.stt.result",
                {"text": text, "language": detected_lang},
                source="voice.pipeline",
            )

        except STTError as e:
            log.error("STT failed: %s", e)
            self._set_state(PipelineState.ERROR)
            await asyncio.sleep(0.5)
            return

        # Step 2: Wake word processing (Phase 3)
        input_for_brain = text
        match = self._wake_detector.detect(text)

        if self._require_wake_word:
            if not match.matched:
                log.debug("Speech ignored: wake word not detected in '%s'", text)
                self._set_state(PipelineState.IDLE)
                return

            if not match.has_command:
                # User just called the wake word (e.g. "Hey Seyal")
                log.info("Wake word '%s' detected without command", match.wake_word)
                mt, kl = get_user_language_profile()
                await self._speak_response(get_localized_response("wake_standalone", mt, kl))
                return
            else:
                input_for_brain = match.command
        else:
            # Wake word not strictly required, but extract command if wake word was present
            if match.matched and match.has_command:
                input_for_brain = match.command

        # Step 3: Process through the Brain
        try:
            response = await self._brain.process(input_for_brain)
            log.info("Brain response: '%s...'", response[:80] if response else "")

        except Exception as e:
            log.error("Brain processing failed: %s", e)
            response = "Sorry, I encountered an error processing your request."

        # Step 4: Text-to-Speech (voice input → voice output)
        await self._speak_response(response)

    async def _speak_response(self, text: str) -> None:
        """Speak a response via TTS with sentence-level interruption."""
        if self._interaction_mode == InteractionMode.TEXT_ONLY:
            return

        self._set_state(PipelineState.SPEAKING)
        self._tts.reset_stop()

        await self._event_bus.emit(
            "voice.tts.start",
            {"text": text[:100]},
            source="voice.pipeline",
        )

        try:
            from seyal_ai.voice.tts import TTSError, _split_sentences

            sentences = _split_sentences(text)

            for sentence in sentences:
                if not self._running or self._tts._stop_requested:
                    log.info("TTS interrupted between sentences")
                    break

                try:
                    audio_bytes = await self._tts.synthesize(sentence)

                    if not self._running or self._tts._stop_requested:
                        break

                    # Play the audio
                    await self._play_tts_audio(audio_bytes)

                except TTSError as e:
                    log.error("TTS failed for sentence: %s", e)
                    continue

        except Exception as e:
            log.error("Speech response error: %s", e)

        await self._event_bus.emit(
            "voice.tts.end",
            {},
            source="voice.pipeline",
        )
        self._set_state(PipelineState.IDLE)

    async def _play_tts_audio(self, audio_bytes: bytes) -> None:
        """Play TTS audio bytes through the speakers."""
        await play_tts_audio(
            audio_bytes=audio_bytes,
            player=self._player,
            tts=self._tts,
            is_running_check=lambda: self._running,
            sample_rate=self._sample_rate,
        )

    async def _play_mp3_bytes(self, mp3_bytes: bytes) -> None:
        """Play MP3 audio bytes."""
        await play_mp3_bytes(
            mp3_bytes=mp3_bytes,
            player=self._player,
            tts=self._tts,
            is_running_check=lambda: self._running,
            sample_rate=self._sample_rate,
        )

    async def process_text_input(self, text: str) -> str:
        """Process a text input through the brain (no TTS)."""
        response = await self._brain.process(text)
        return response

    async def process_voice_text(self, text: str) -> str:
        """Process text as if it were voice input (triggers TTS response)."""
        response = await self._brain.process(text)
        await self._speak_response(response)
        return response

    # --- Configuration ---

    @property
    def state(self) -> PipelineState:
        return self._state

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def interaction_mode(self) -> InteractionMode:
        return self._interaction_mode

    @interaction_mode.setter
    def interaction_mode(self, mode: str | InteractionMode) -> None:
        if isinstance(mode, str):
            mode = InteractionMode(mode)
        self._interaction_mode = mode
        log.info("Interaction mode changed to: %s", mode.value)

    @property
    def stt_engine(self) -> Any:
        return self._stt

    @property
    def tts_engine(self) -> Any:
        return self._tts

    @property
    def vad(self) -> Any:
        return self._vad

    @property
    def language(self) -> str:
        return self._language

    @language.setter
    def language(self, value: str) -> None:
        self._language = value
        self._stt.language = value
        log.info("Voice language changed to: %s", value)

    @property
    def wake_word_detector(self) -> Any:
        return self._wake_detector

    @property
    def require_wake_word(self) -> bool:
        return self._require_wake_word

    @require_wake_word.setter
    def require_wake_word(self, required: bool) -> None:
        self._require_wake_word = required
        log.info("Require wake word changed to: %s", required)

    def get_status(self) -> dict[str, Any]:
        """Get the current status of the voice pipeline."""
        assistant_name = self._brain.identity.name if hasattr(self._brain, "identity") else "Seyal AI"
        wake_word = self._brain.identity.wake_word if hasattr(self._brain, "identity") else "Seyal AI"
        aliases = self._brain.identity.aliases if hasattr(self._brain, "identity") else []
        return {
            "state": self._state.value,
            "running": self._running,
            "interaction_mode": self._interaction_mode.value,
            "language": self._language,
            "stt_provider": self._stt.provider_name,
            "tts_provider": self._tts.provider_name,
            "tts_voice": self._tts.voice,
            "tts_speed": self._tts.speed,
            "vad_uses_silero": self._vad.uses_silero,
            "interrupt_enabled": self._interrupt_enabled,
            "recorder_active": self._recorder.is_recording,
            "assistant_name": assistant_name,
            "wake_word": wake_word,
            "aliases": aliases,
            "require_wake_word": self._require_wake_word,
        }
