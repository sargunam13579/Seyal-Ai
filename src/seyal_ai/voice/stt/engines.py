"""Seyal AI Voice — STT Providers and Engine Implementation."""

from __future__ import annotations

import asyncio
import io
import json
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import numpy as np

from seyal_ai.utils.logging import get_logger
from .markers import detect_text_language
from .sanitizer import _audio_to_wav_bytes, sanitize_transcribed_text

log = get_logger("voice.stt.engines")


@dataclass
class TranscriptionResult:
    """Result of speech-to-text transcription including detected language."""

    text: str
    language: str = "en"  # "ta" | "tanglish" | "hi" | "en"
    confidence: float = 1.0


class STTError(Exception):
    """Raised when speech-to-text transcription fails."""

    pass


class BaseSTTProvider(ABC):
    """Abstract base class for Speech-to-Text providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Human-readable provider name."""
        ...

    @abstractmethod
    async def transcribe(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
    ) -> str:
        """Transcribe audio to text string."""
        ...

    async def transcribe_with_language(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
        fast_interim: bool = False,
    ) -> TranscriptionResult:
        """Transcribe audio and return both text and detected language."""
        text = await self.transcribe(audio_data, sample_rate, language)
        detected_lang = detect_text_language(text)
        return TranscriptionResult(text=text, language=detected_lang)

    @abstractmethod
    async def check_availability(self) -> bool:
        """Check if the provider is available."""
        ...


class GeminiMultilingualSTTProvider(BaseSTTProvider):
    """State-of-the-art Multilingual STT using Google Gemini Multimodal Audio.

    Natively accepts raw audio bytes and transcribes Tamil, Tanglish,
    Hindi, and English code-switched utterances with zero hardcoded language constraints.
    """

    _quota_cooldown_until: float = 0.0

    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key
        self._client: Any = None

    @property
    def provider_name(self) -> str:
        return "Gemini Multilingual Audio"

    def _ensure_client(self) -> Any:
        if self._client is not None:
            return self._client

        from seyal_ai.core.config import get_settings

        settings = get_settings()
        key = self._api_key or settings.gemini_api_key

        if not key:
            raise STTError("Gemini API key is required for GeminiMultilingualSTTProvider")

        try:
            from google import genai

            self._client = genai.Client(api_key=key)
            return self._client
        except Exception as e:
            raise STTError(f"Failed to initialize Gemini GenAI client: {e}") from e

    async def transcribe_with_language(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
        fast_interim: bool = False,
    ) -> TranscriptionResult:
        if time.time() < GeminiMultilingualSTTProvider._quota_cooldown_until:
            fallback = GoogleWebSTTProvider()
            return await fallback.transcribe_with_language(
                audio_data, sample_rate, language, fast_interim=fast_interim
            )

        try:
            client = self._ensure_client()
            from google.genai import types

            wav_bytes = _audio_to_wav_bytes(audio_data, sample_rate)

            prompt = (
                "You are an expert multilingual audio transcription system for voice commands.\n"
                "Transcribe the spoken audio with 100% exact fidelity.\n"
                "CRITICAL PHONETIC GUIDELINES:\n"
                "- The user speaks Tamil, Tanglish (colloquial Tamil words written in English letters), or English.\n"
                "- Common Tanglish words:\n"
                "  * 'naa' / 'naan' means 'I' (never transcribe as 'the', 'now', or 'no')\n"
                "  * 'atha' means 'that', 'pathi' / 'paththi' means 'about', 'pesatha' means 'do not talk'\n"
                "  * 'pannu' / 'pannitan' / 'panniten' / 'pannunga' means 'do / did / done' (never 'panel')\n"
                "  * 'thira' / 'open pannu' means 'open'\n"
                "  * 'seiyalam' / 'seira' / 'seiyara' means 'doing'\n"
                "  * 'ippo' means 'now'\n"
                "  * 'illa' means 'no'\n"
                "- Output strictly what the user actually said. NEVER invent, hallucinate, or substitute unrelated words.\n"
                "- Maintain code-switching naturally as spoken.\n"
                "- DO NOT output JSON. DO NOT include markdown, quotation marks, or labels like 'text:'.\n"
                "- Output ONLY the exact transcribed words directly."
            )

            audio_part = types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav")

            loop = asyncio.get_event_loop()

            def _call_gemini() -> str:
                response = client.models.generate_content(
                    model="gemini-flash-latest",
                    contents=[audio_part, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.0,
                        max_output_tokens=300,
                    ),
                )
                return response.text or ""

            raw_resp = await asyncio.wait_for(loop.run_in_executor(None, _call_gemini), timeout=12.0)
            transcribed_text = sanitize_transcribed_text(raw_resp)
            detected_lang = detect_text_language(transcribed_text)
            log.info("Gemini Multilingual STT: '%s' (lang=%s)", transcribed_text, detected_lang)
            return TranscriptionResult(text=transcribed_text, language=detected_lang)

        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                GeminiMultilingualSTTProvider._quota_cooldown_until = time.time() + 300.0
                log.info("Gemini STT quota limit detected. Automatically using Google Web Speech fallback for 5 minutes.")
            else:
                log.warning("Gemini Multilingual STT notice: %s. Falling back to Google Web Speech.", e)
            fallback = GoogleWebSTTProvider()
            return await fallback.transcribe_with_language(audio_data, sample_rate, language)

    async def transcribe(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
    ) -> str:
        res = await self.transcribe_with_language(audio_data, sample_rate, language)
        return res.text

    async def check_availability(self) -> bool:
        from seyal_ai.core.config import get_settings

        return bool(self._api_key or get_settings().gemini_api_key)


class GoogleWebSTTProvider(BaseSTTProvider):
    """Speech-to-Text using Google's Web Speech API.

    Enhanced to support automatic code-switching (Tamil, Tanglish, and English)
    without forcing rigid en-US dictionary phonetics.
    """

    @property
    def provider_name(self) -> str:
        return "Google Web Speech (Multilingual)"

    async def transcribe_with_language(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
        fast_interim: bool = False,
    ) -> TranscriptionResult:
        try:
            import speech_recognition as sr
        except ImportError as err:
            raise STTError("SpeechRecognition library not installed.") from err

        wav_bytes = _audio_to_wav_bytes(audio_data, sample_rate)

        def _do_transcribe() -> TranscriptionResult:
            recognizer = sr.Recognizer()
            recognize_fn: Any = getattr(recognizer, "recognize_google", None)
            if not callable(recognize_fn):
                raise STTError("Google recognition backend not available on Recognizer")

            primary_lang = "en-IN" if language in ("auto", "en-US", "en-IN") else language
            fallback_lang = "ta-IN" if primary_lang != "ta-IN" else "en-IN"

            text = ""
            try:
                with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
                    audio = recognizer.record(source)
                text = str(recognize_fn(audio, language=primary_lang)).strip()
            except sr.UnknownValueError:
                text = ""
            except sr.RequestError as e:
                raise STTError(f"Google Web Speech API error: {e}") from e

            if fast_interim:
                text = sanitize_transcribed_text(text)
                lang = detect_text_language(text)
                return TranscriptionResult(text=text, language=lang)

            words = text.split()
            is_repetitive = len(words) >= 4 and len(set(words)) <= 2
            if not text or is_repetitive:
                try:
                    with sr.AudioFile(io.BytesIO(wav_bytes)) as fallback_src:
                        fallback_audio = recognizer.record(fallback_src)
                    fallback_text = str(recognize_fn(fallback_audio, language=fallback_lang)).strip()
                    if fallback_text:
                        text = fallback_text
                except Exception:
                    pass

            text = sanitize_transcribed_text(text)
            lang = detect_text_language(text)
            log.info("Google Web STT transcription: '%s' (detected lang=%s)", text, lang)
            return TranscriptionResult(text=text, language=lang)

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _do_transcribe)

    async def transcribe(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
    ) -> str:
        res = await self.transcribe_with_language(audio_data, sample_rate, language)
        return res.text

    async def check_availability(self) -> bool:
        import importlib.util

        return importlib.util.find_spec("speech_recognition") is not None


class VoskSTTProvider(BaseSTTProvider):
    """Offline Speech-to-Text using Vosk."""

    def __init__(self, model_path: str | None = None) -> None:
        self._model_path = model_path
        self._model = None

    @property
    def provider_name(self) -> str:
        return "Vosk (Offline)"

    def _ensure_model(self, language: str) -> None:
        if self._model is not None:
            return

        try:
            from vosk import Model, SetLogLevel

            SetLogLevel(-1)
            if self._model_path:
                self._model = Model(self._model_path)
            else:
                lang_short = language.split("-")[0] if "-" in language else "en"
                if lang_short == "auto":
                    lang_short = "en"
                self._model = Model(lang=lang_short)
            log.info("Vosk model loaded for language: %s", language)
        except Exception as e:
            raise STTError(f"Failed to load Vosk model: {e}") from e

    async def transcribe(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
    ) -> str:
        def _do_transcribe() -> str:
            try:
                from vosk import KaldiRecognizer
            except ImportError as err:
                raise STTError("Vosk library not installed.") from err

            self._ensure_model(language)
            recognizer = KaldiRecognizer(self._model, sample_rate)
            recognizer.SetWords(True)

            if audio_data.dtype != np.int16:
                audio_int16 = (audio_data * 32767).astype(np.int16)
            else:
                audio_int16 = audio_data

            audio_bytes = audio_int16.tobytes()
            chunk_size = 4000
            for i in range(0, len(audio_bytes), chunk_size):
                chunk = audio_bytes[i : i + chunk_size]
                recognizer.AcceptWaveform(chunk)

            result = json.loads(recognizer.FinalResult())
            text = result.get("text", "").strip()
            log.info("Vosk transcription: '%s'", text)
            return text

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _do_transcribe)

    async def check_availability(self) -> bool:
        import importlib.util

        return importlib.util.find_spec("vosk") is not None


class WhisperSTTProvider(BaseSTTProvider):
    """Speech-to-Text provider powered by OpenAI Whisper (local neural model or API)."""

    def __init__(
        self,
        model_size: str = "base",
        api_key: str | None = None,
        use_api: bool = False,
    ) -> None:
        self._model_size = model_size
        self._api_key = api_key
        self._use_api = use_api
        self._local_model: Any = None

    @property
    def provider_name(self) -> str:
        return "Whisper (Neural STT)"

    def _ensure_local_model(self) -> Any:
        if self._local_model is not None:
            return self._local_model

        try:
            import whisper  # type: ignore[import-not-found]

            self._local_model = whisper.load_model(self._model_size)
            log.info("Whisper local model '%s' loaded successfully", self._model_size)
            return self._local_model
        except ImportError:
            try:
                from faster_whisper import WhisperModel  # type: ignore[import-not-found]

                self._local_model = WhisperModel(self._model_size, device="cpu", compute_type="int8")
                log.info("faster-whisper model '%s' loaded successfully", self._model_size)
                return self._local_model
            except ImportError as e:
                raise STTError("Neither 'whisper' nor 'faster-whisper' package is installed.") from e

    async def transcribe(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
    ) -> str:
        res = await self.transcribe_with_language(audio_data, sample_rate, language)
        return res.text

    async def transcribe_with_language(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
        fast_interim: bool = False,
    ) -> TranscriptionResult:
        from seyal_ai.core.config import get_settings

        settings = get_settings()
        api_key: str | None = self._api_key or getattr(settings, "openai_api_key", None)

        if (self._use_api or not self._is_local_available()) and api_key:
            return await self._transcribe_api(audio_data, sample_rate, language, api_key)

        return await self._transcribe_local(audio_data, sample_rate, language)

    async def _transcribe_local(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
    ) -> TranscriptionResult:
        def _run_local() -> TranscriptionResult:
            model = self._ensure_local_model()

            if audio_data.dtype == np.int16:
                audio_float = audio_data.astype(np.float32) / 32768.0
            else:
                audio_float = audio_data.astype(np.float32)

            lang_param = None if language in ("auto", "", None) else language.split("-")[0]

            if hasattr(model, "transcribe"):
                result = model.transcribe(audio_float, language=lang_param)
                if isinstance(result, tuple):
                    segments, info = result
                    text = " ".join([seg.text for seg in segments]).strip()
                    detected_lang = getattr(info, "language", "en")
                elif isinstance(result, dict):
                    text = result.get("text", "").strip()
                    detected_lang = result.get("language", "en")
                else:
                    text = str(result).strip()
                    detected_lang = "en"
            else:
                text = ""
                detected_lang = "en"

            sanitized = sanitize_transcribed_text(text)
            classified_lang = detect_text_language(sanitized)
            return TranscriptionResult(
                text=sanitized,
                language=classified_lang or detected_lang,
                confidence=0.95,
            )

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _run_local)

    async def _transcribe_api(
        self,
        audio_data: np.ndarray,
        sample_rate: int,
        language: str,
        api_key: str,
    ) -> TranscriptionResult:
        try:
            import httpx

            wav_bytes = _audio_to_wav_bytes(audio_data, sample_rate)
            files = {"file": ("audio.wav", wav_bytes, "audio/wav")}
            data: dict[str, Any] = {"model": "whisper-1"}
            if language not in ("auto", "", None):
                data["language"] = language.split("-")[0]

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    files=files,
                    data=data,
                )
                if resp.status_code != 200:
                    raise STTError(f"Whisper API error ({resp.status_code}): {resp.text}")
                result = resp.json()
                raw_text = result.get("text", "").strip()
                sanitized = sanitize_transcribed_text(raw_text)
                lang = detect_text_language(sanitized)
                return TranscriptionResult(text=sanitized, language=lang, confidence=0.95)
        except Exception as e:
            if isinstance(e, STTError):
                raise
            raise STTError(f"Whisper API transcription failed: {e}") from e

    def _is_local_available(self) -> bool:
        import importlib.util

        return (
            importlib.util.find_spec("whisper") is not None
            or importlib.util.find_spec("faster_whisper") is not None
        )

    async def check_availability(self) -> bool:
        from seyal_ai.core.config import get_settings

        settings = get_settings()
        api_key = self._api_key or getattr(settings, "openai_api_key", None)
        return self._is_local_available() or bool(api_key)


class STTEngine:
    """Speech-to-Text engine with provider abstraction and automatic language detection."""

    def __init__(
        self,
        provider_name: str = "multilingual_gemini",
        language: str = "auto",
        vosk_model_path: str | None = None,
    ) -> None:
        self._provider_name = provider_name
        self._language = language
        self._provider: BaseSTTProvider | None = None
        self._vosk_model_path = vosk_model_path

        self._init_provider()

    def _init_provider(self) -> None:
        """Initialize the configured STT provider with graceful fallbacks."""
        if self._provider_name == "multilingual_gemini":
            from seyal_ai.core.config import get_settings

            settings = get_settings()
            if settings.gemini_api_key:
                self._provider = GeminiMultilingualSTTProvider(api_key=settings.gemini_api_key)
            else:
                log.info("Gemini API key not found for Multilingual STT; falling back to Google Web Speech")
                self._provider = GoogleWebSTTProvider()
        elif self._provider_name == "google_web":
            self._provider = GoogleWebSTTProvider()
        elif self._provider_name == "vosk":
            self._provider = VoskSTTProvider(model_path=self._vosk_model_path)
        elif self._provider_name == "whisper":
            self._provider = WhisperSTTProvider()
        else:
            log.warning("Unknown STT provider '%s', falling back to google_web", self._provider_name)
            self._provider = GoogleWebSTTProvider()

        log.info("STT engine initialized with provider: %s (default lang: %s)", self._provider.provider_name, self._language)

    async def transcribe(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str | None = None,
    ) -> str:
        """Transcribe audio to text string."""
        res = await self.transcribe_with_language(audio_data, sample_rate, language)
        return res.text

    async def transcribe_with_language(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str | None = None,
        fast_interim: bool = False,
    ) -> TranscriptionResult:
        """Transcribe audio and return both transcribed text and detected language."""
        if self._provider is None:
            self._init_provider()
            if self._provider is None:
                raise STTError("No STT provider available")

        lang = language or self._language or "auto"

        try:
            return await self._provider.transcribe_with_language(
                audio_data, sample_rate, lang, fast_interim=fast_interim
            )
        except STTError:
            raise
        except Exception as e:
            log.error("STT transcription failed: %s", e)
            raise STTError(f"Transcription failed: {e}") from e

    async def check_availability(self) -> bool:
        if self._provider is None:
            return False
        return await self._provider.check_availability()

    @property
    def provider_name(self) -> str:
        if self._provider:
            return self._provider.provider_name
        return "None"

    @property
    def language(self) -> str:
        return self._language

    @language.setter
    def language(self, value: str) -> None:
        self._language = value
