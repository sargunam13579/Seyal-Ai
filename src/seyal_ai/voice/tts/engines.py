"""Seyal AI Voice — TTS Providers and Engine Implementation."""

from __future__ import annotations

import asyncio
import re
import tempfile
import threading
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

from seyal_ai.utils.logging import get_logger
from .sentence import _split_sentences, resolve_multilingual_voice

log = get_logger("voice.tts.engines")


class BaseTTSProvider(ABC):
    """Abstract base class for Text-to-Speech providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name."""
        ...

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice: str = "",
        speed: float = 1.0,
    ) -> bytes:
        """Synthesize text to audio bytes."""
        ...

    @abstractmethod
    async def check_availability(self) -> bool:
        """Check if the provider is available."""
        ...

    @abstractmethod
    async def list_voices(self) -> list[dict[str, str]]:
        """List available voices."""
        ...


class TTSError(Exception):
    """Raised when text-to-speech synthesis fails."""

    pass


# In-memory synthesis cache: (paced_text, resolved_voice, speed_str) -> audio_bytes
_edge_tts_cache: dict[tuple[str, str, str], bytes] = {}


class EdgeTTSProvider(BaseTTSProvider):
    """High-quality TTS using Microsoft Edge's free speech API.

    Provides natural-sounding voices in many languages with automatic
    multilingual dialect matching.
    """

    @property
    def provider_name(self) -> str:
        return "Edge TTS"

    async def synthesize(
        self,
        text: str,
        voice: str = "auto",
        speed: float = 1.0,
    ) -> bytes:
        try:
            import edge_tts
        except ImportError as err:
            raise TTSError(
                "edge-tts library not installed. Install with: pip install seyal-ai[voice]"
            ) from err

        # Dynamically resolve voice according to language/script of text
        resolved_voice = resolve_multilingual_voice(text, voice)
        vl = resolved_voice.lower()
        if vl in ("breeze", "default", "en-us-avaneural"):
            resolved_voice = "en-US-AvaMultilingualNeural"
        elif vl in ("andrew", "en-us-andrewneural"):
            resolved_voice = "en-US-AndrewMultilingualNeural"
        elif vl in ("emma", "en-us-emmaneural"):
            resolved_voice = "en-US-EmmaMultilingualNeural"
        elif vl in ("brian", "en-us-brianneural"):
            resolved_voice = "en-US-BrianMultilingualNeural"

        # Natural conversational pacing: convert line/paragraph breaks into natural human breath pauses
        paced_text = re.sub(r"\n{2,}", ". ", text.strip())
        paced_text = re.sub(r"\n", ", ", paced_text)
        paced_text = re.sub(r"\s+", " ", paced_text).strip()

        # Convert speed to edge-tts format: e.g. 0.88 -> -12% for relaxed, natural human cadence
        speed_pct = round((speed - 1.0) * 100)
        speed_str = f"+{speed_pct}%" if speed_pct >= 0 else f"{speed_pct}%"

        # Check in-memory cache for instant 0ms synthesis
        cache_key = (paced_text or text, resolved_voice, speed_str)
        if cache_key in _edge_tts_cache:
            return _edge_tts_cache[cache_key]

        for attempt in range(2):
            try:
                communicate = edge_tts.Communicate(paced_text or text, resolved_voice, rate=speed_str)

                audio_chunks: list[bytes] = []
                async for chunk in communicate.stream():
                    if isinstance(chunk, dict) and chunk.get("type") == "audio":
                        chunk_data = chunk.get("data")
                        if isinstance(chunk_data, (bytes, bytearray)):
                            audio_chunks.append(chunk_data if isinstance(chunk_data, bytes) else bytes(chunk_data))

                if not audio_chunks:
                    raise TTSError("Edge TTS returned no audio data")

                audio_bytes = b"".join(audio_chunks)
                log.debug(
                    "Edge TTS synthesized %d bytes for: '%s...'",
                    len(audio_bytes),
                    text[:50],
                )
                if len(_edge_tts_cache) > 256:
                    try:
                        _edge_tts_cache.pop(next(iter(_edge_tts_cache)))
                    except Exception:
                        pass
                _edge_tts_cache[cache_key] = audio_bytes
                return audio_bytes

            except TTSError:
                if attempt == 0:
                    await asyncio.sleep(0.3)
                    continue
                raise
            except Exception as e:
                if attempt == 0:
                    await asyncio.sleep(0.3)
                    continue
                raise TTSError(f"Edge TTS synthesis failed: {e}") from e

        raise TTSError("Edge TTS synthesis failed after retry")

    async def check_availability(self) -> bool:
        import importlib.util

        return importlib.util.find_spec("edge_tts") is not None

    async def list_voices(self) -> list[dict[str, str]]:
        try:
            import edge_tts

            voices = await edge_tts.list_voices()
            return [
                {
                    "id": v["ShortName"],
                    "name": v["FriendlyName"],
                    "language": v["Locale"],
                    "gender": v["Gender"],
                }
                for v in voices
            ]
        except Exception as e:
            log.error("Failed to list Edge TTS voices: %s", e)
            return []


class Pyttsx3TTSProvider(BaseTTSProvider):
    """Offline TTS using pyttsx3.

    Uses the system's native speech engine (SAPI5 on Windows,
    espeak on Linux, NSSpeechSynthesizer on macOS).
    """

    def __init__(self) -> None:
        self._engine = None
        self._lock = threading.Lock()

    def _ensure_engine(self) -> None:
        """Initialize the pyttsx3 engine if needed."""
        if self._engine is not None:
            return
        try:
            import pyttsx3

            self._engine = pyttsx3.init()
            log.info("pyttsx3 TTS engine initialized")
        except Exception as e:
            raise TTSError(f"Failed to initialize pyttsx3: {e}") from e

    @property
    def provider_name(self) -> str:
        return "pyttsx3 (Offline)"

    async def synthesize(
        self,
        text: str,
        voice: str = "",
        speed: float = 1.0,
    ) -> bytes:
        import contextlib

        loop = asyncio.get_event_loop()

        def _do_synthesize() -> bytes:
            with self._lock:
                self._ensure_engine()

                engine = self._engine
                if engine is None:
                    raise TTSError("pyttsx3 engine could not be initialized")

                # Set voice if specified
                if voice:
                    with contextlib.suppress(Exception):
                        engine.setProperty("voice", voice)

                # Set speed (pyttsx3 uses words-per-minute, default ~200)
                base_rate = 200
                engine.setProperty("rate", int(base_rate * speed))

                # Save to a temporary WAV file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp_path = tmp.name

                try:
                    engine.save_to_file(text, tmp_path)
                    engine.runAndWait()

                    audio_bytes = Path(tmp_path).read_bytes()
                    log.debug(
                        "pyttsx3 synthesized %d bytes for: '%s...'",
                        len(audio_bytes),
                        text[:50],
                    )
                    return audio_bytes
                finally:
                    with contextlib.suppress(Exception):
                        Path(tmp_path).unlink(missing_ok=True)

        return await loop.run_in_executor(None, _do_synthesize)

    async def check_availability(self) -> bool:
        import importlib.util

        return importlib.util.find_spec("pyttsx3") is not None

    async def list_voices(self) -> list[dict[str, str]]:
        try:
            self._ensure_engine()
            engine = self._engine
            if engine is None:
                return []
            voices: Any = engine.getProperty("voices")
            if not isinstance(voices, (list, tuple)):
                return []
            return [
                {
                    "id": getattr(v, "id", str(v)),
                    "name": getattr(v, "name", str(v)),
                    "language": ",".join(getattr(v, "languages", []))
                    if getattr(v, "languages", None)
                    else "unknown",
                    "gender": "unknown",
                }
                for v in voices
            ]
        except Exception as e:
            log.error("Failed to list pyttsx3 voices: %s", e)
            return []


class KokoroTTSProvider(BaseTTSProvider):
    """
    High-fidelity neural Text-to-Speech powered by Kokoro-82M.
    Supports fast local inference (<100ms latency) and ONNX runtime.
    """

    def __init__(
        self,
        voice: str = "af_heart",
        speed: float = 1.0,
        model_path: str | None = None,
    ) -> None:
        self._voice = voice or "af_heart"
        self._speed = speed
        self._model_path = model_path
        self._pipeline: Any = None

    @property
    def provider_name(self) -> str:
        return "Kokoro (Neural TTS)"

    def _ensure_pipeline(self) -> Any:
        if self._pipeline is not None:
            return self._pipeline

        try:
            from kokoro import KPipeline  # type: ignore[import-not-found]

            lang_code = "a" if not self._voice.startswith("b") else "b"
            self._pipeline = KPipeline(lang_code=lang_code)
            log.info("Kokoro KPipeline initialized for voice '%s'", self._voice)
            return self._pipeline
        except ImportError:
            try:
                from kokoro_onnx import Kokoro  # type: ignore[import-not-found]

                self._pipeline = Kokoro(
                    model_path=self._model_path or "kokoro-v0_19.onnx",
                    voices_path="voices.json",
                )
                log.info("Kokoro ONNX initialized successfully")
                return self._pipeline
            except ImportError as e:
                raise TTSError(f"Neither 'kokoro' nor 'kokoro_onnx' library is installed: {e}") from e

    async def synthesize(
        self,
        text: str,
        voice: str = "auto",
        speed: float = 1.0,
    ) -> bytes:
        if not text or not text.strip():
            return b""

        active_voice = self._voice if voice in ("auto", "", None) else voice
        active_speed = speed or self._speed or 1.0

        def _do_synthesize() -> bytes:
            pipe = self._ensure_pipeline()
            import io
            import wave
            import numpy as np

            if hasattr(pipe, "create") and getattr(type(pipe), "__name__", "") == "Kokoro":
                samples, sr = pipe.create(text, voice=active_voice, speed=active_speed)
            else:
                generator = pipe(text, voice=active_voice, speed=active_speed, split_pattern=r"\n+")
                audio_chunks: list[np.ndarray] = []
                sr = 24000
                for item in generator:
                    if isinstance(item, (tuple, list)):
                        audio = item[2] if len(item) == 3 else item[0]
                    else:
                        audio = item
                    if audio is not None and len(audio) > 0:
                        audio_chunks.append(audio)
                if not audio_chunks:
                    raise TTSError("Kokoro synthesis yielded no audio chunks")
                samples = np.concatenate(audio_chunks)

            if samples.dtype != np.int16:
                samples_clamped = np.clip(samples, -1.0, 1.0)
                int_audio = (samples_clamped * 32767).astype(np.int16)
            else:
                int_audio = samples

            buf = io.BytesIO()
            with wave.open(buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sr)
                wf.writeframes(int_audio.tobytes())
            return buf.getvalue()

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _do_synthesize)

    async def check_availability(self) -> bool:
        import importlib.util

        return (
            importlib.util.find_spec("kokoro") is not None
            or importlib.util.find_spec("kokoro_onnx") is not None
        )

    async def list_voices(self) -> list[dict[str, str]]:
        return [
            {"id": "af_heart", "name": "Heart (US Female)", "language": "en-US", "gender": "female"},
            {"id": "af_bella", "name": "Bella (US Female)", "language": "en-US", "gender": "female"},
            {"id": "am_michael", "name": "Michael (US Male)", "language": "en-US", "gender": "male"},
            {"id": "bf_emma", "name": "Emma (UK Female)", "language": "en-GB", "gender": "female"},
            {"id": "bm_george", "name": "George (UK Male)", "language": "en-GB", "gender": "male"},
        ]


class TTSEngine:
    """Text-to-Speech engine with provider abstraction and interruption support.

    Splits text into sentences and speaks them one-by-one, checking for
    interruption between each sentence.
    """

    def __init__(
        self,
        provider_name: str = "edge",
        voice: str = "auto",
        speed: float = 1.0,
        fallback_voice: str = "",
    ) -> None:
        self._provider_name = provider_name
        self._voice = voice
        self._speed = speed
        self._fallback_voice = fallback_voice
        self._provider: BaseTTSProvider | None = None
        self._fallback_provider: BaseTTSProvider | None = None
        self._is_speaking = False
        self._stop_requested = False
        self._lock = threading.Lock()

        self._init_providers()

    def _init_providers(self) -> None:
        """Initialize the configured TTS provider and fallback."""
        if self._provider_name == "edge":
            self._provider = EdgeTTSProvider()
            self._fallback_provider = Pyttsx3TTSProvider()
        elif self._provider_name == "pyttsx3":
            self._provider = Pyttsx3TTSProvider()
            self._fallback_provider = None
        elif self._provider_name == "kokoro":
            self._provider = KokoroTTSProvider(voice=self._voice, speed=self._speed)
            self._fallback_provider = EdgeTTSProvider()
        else:
            log.warning(
                "Unknown TTS provider '%s', falling back to edge",
                self._provider_name,
            )
            self._provider = EdgeTTSProvider()
            self._fallback_provider = Pyttsx3TTSProvider()
            self._provider_name = "edge"

        log.info("TTS engine initialized with provider: %s", self._provider.provider_name)

    async def synthesize(self, text: str) -> bytes:
        """Synthesize text to audio bytes."""
        try:
            if self._provider is None:
                raise TTSError("No TTS provider configured")
            return await self._provider.synthesize(text, self._voice, self._speed)
        except TTSError as e:
            if self._provider is not None and self._provider_name == "edge" and self._voice != "en-US-AvaNeural":
                log.warning("Edge TTS failed for voice '%s': %s. Trying resilient neural voice 'en-US-AvaNeural'...", self._voice, e)
                try:
                    return await self._provider.synthesize(text, "en-US-AvaNeural", self._speed)
                except Exception as fb_err:
                    log.debug("Fallback neural voice notice: %s", fb_err)
            if self._fallback_provider is not None:
                log.warning("Primary TTS failed (%s), trying local pyttsx3 fallback", e)
                voice = self._fallback_voice or ""
                return await self._fallback_provider.synthesize(text, voice, self._speed)
            raise

    async def synthesize_sentences(
        self,
        text: str,
    ) -> list[bytes]:
        """Split text into sentences and synthesize each separately."""
        sentences = _split_sentences(text)
        audio_chunks: list[bytes] = []

        for sentence in sentences:
            if self._stop_requested:
                log.info("TTS synthesis stopped by interruption")
                break

            try:
                chunk = await self.synthesize(sentence)
                audio_chunks.append(chunk)
            except TTSError as e:
                log.error("TTS failed for sentence: %s", e)
                continue

        return audio_chunks

    def request_stop(self) -> None:
        """Request the TTS engine to stop speaking after the current sentence."""
        self._stop_requested = True
        self._is_speaking = False
        log.debug("TTS stop requested")

    def reset_stop(self) -> None:
        """Reset the stop flag for a new utterance."""
        self._stop_requested = False

    async def speak(self, text: str) -> bool:
        """Synthesize and indicate readiness to play text."""
        self._stop_requested = False
        self._is_speaking = True

        try:
            await self.synthesize(text)
            return not self._stop_requested
        except TTSError as e:
            log.error("TTS speak failed: %s", e)
            return False
        finally:
            self._is_speaking = False

    async def check_availability(self) -> bool:
        """Check if any TTS provider is available."""
        return bool(
            (self._provider and await self._provider.check_availability())
            or (self._fallback_provider and await self._fallback_provider.check_availability())
        )

    async def list_voices(self) -> list[dict[str, str]]:
        """List available voices from the current provider."""
        if self._provider:
            return await self._provider.list_voices()
        return []

    @property
    def provider_name(self) -> str:
        if self._provider:
            return self._provider.provider_name
        return "None"

    @property
    def is_speaking(self) -> bool:
        return self._is_speaking

    @property
    def voice(self) -> str:
        return self._voice

    @voice.setter
    def voice(self, value: str) -> None:
        self._voice = value

    @property
    def speed(self) -> float:
        return self._speed

    @speed.setter
    def speed(self, value: float) -> None:
        self._speed = max(0.25, min(4.0, value))
