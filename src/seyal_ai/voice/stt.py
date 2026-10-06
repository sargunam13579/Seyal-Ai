"""
Seyal AI Voice — Speech-to-Text (STT) Engine.

Provides a provider-abstracted Multilingual STT engine with support for:
  - Gemini Multilingual Audio Transcriber (native code-switching, Tamil, Tanglish, Hindi, English)
  - Google Web Speech API (free, online fallback)
  - Vosk (offline, requires model download)

Supports automatic language detection and code-switching out of the box.
"""

from __future__ import annotations

import asyncio
import io
import json
import re
import wave
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

import numpy as np

from seyal_ai.utils.logging import get_logger

log = get_logger("voice.stt")

# Common Tanglish marker patterns and verbs
_TANGLISH_MARKERS = {
    "pannu", "pannunga", "pannalam", "pannen", "pannitanga",
    "seidu", "seiyalam", "vaanga", "ponga", "po", "thira",
    "kodu", "eduda", "edunga", "edu", "paru", "paarunga",
    "solra", "solla", "sollunga", "pesu", "pesunga", "irukku",
    "enna", "inga", "unga", "nalla", "romba", "aachu", "varuthu",
    "mudiyuma", "mudiyathu", "poidu", "thirumba", "inniki", "naalai",
    "epdi", "eppadi", "yen", "dhaan", "kooda", "apdi", "ippadi",
}

# Common Hindi / Hinglish markers
_HINDI_MARKERS = {
    "kholo", "karo", "chalao", "band", "batao", "dikhaye", "hai", "kya",
    "kaise", "karein", "ruko", "dekho", "bolo", "sunao", "chahiye", "kar",
}


def detect_text_language(text: str) -> str:
    """
    Detect language category from transcribed text.

    Returns:
        'ta'       - Tamil script text
        'hi'       - Hindi / Devanagari script text
        'tanglish' - Tamil vocabulary written in English / Latin script
        'en'       - Standard English
    """
    if not text or not text.strip():
        return "en"

    # 1. Check for Tamil script (Unicode block U+0B80 to U+0BFF)
    if re.search(r"[\u0B80-\u0BFF]", text):
        return "ta"

    # 2. Check for Devanagari script (Unicode block U+0900 to U+097F)
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"

    # 3. Check for Tanglish words in Latin text
    words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
    if any(w in _TANGLISH_MARKERS for w in words):
        return "tanglish"

    # 4. Check for Hindi / Hinglish words in Latin text
    if any(w in _HINDI_MARKERS for w in words):
        return "hi"

    return "en"


def sanitize_transcribed_text(text: str) -> str:
    """Strip common STT hallucinations, subtitle metadata, JSON formatting, and timestamp artifacts."""
    if not text:
        return ""
    clean = text.strip()

    # Strip markdown code backticks if any
    clean = re.sub(r"^```(?:json)?\s*", "", clean)
    clean = re.sub(r"\s*```$", "", clean).strip()

    # Strip JSON or pseudo-JSON wrappers (e.g. {"text": "hello"} or {text: hello...})
    json_match = re.search(
        r'["\']?text["\']?\s*:\s*["\']?(.*?)(?:["\']?\s*,\s*["\']?language|["\']?\s*\}|$)',
        clean,
        re.DOTALL | re.IGNORECASE,
    )
    if json_match:
        extracted = json_match.group(1).strip()
        if extracted:
            clean = extracted

    # Clean leftover boundary braces, brackets, and quotes
    clean = re.sub(r'^[{\["\']+|[}\]"\'\s]+$', '', clean).strip()

    # Match pure timestamp patterns like 00:00, 00:00:00, [00:00.000], etc.
    if re.match(r"^\[?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?\s*\]?$", clean):
        log.info("Discarded acoustic timestamp hallucination: '%s'", clean)
        return ""
    # Match common YouTube / Whisper / Gemini subtitle artifacts
    if re.match(r"^(subtitles? by|closed captions?|thank you for watching|amara\.org|subtitles created by|transcription by)\b", clean, re.IGNORECASE):
        log.info("Discarded subtitle metadata artifact: '%s'", clean)
        return ""
    return clean




def _audio_to_wav_bytes(audio_data: np.ndarray, sample_rate: int = 16000) -> bytes:
    """Convert numpy array (int16 or float32) to in-memory 16-bit PCM WAV bytes."""
    if audio_data.dtype != np.int16:
        audio_int16 = (audio_data * 32767).astype(np.int16)
    else:
        audio_int16 = audio_data

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(audio_int16.tobytes())
    buf.seek(0)
    return buf.read()


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
    """
    State-of-the-art Multilingual STT using Google Gemini Multimodal Audio.

    Natively accepts raw audio bytes and transcribes Tamil, Tanglish,
    Hindi, and English code-switched utterances with zero hardcoded language constraints.
    """

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

    _quota_cooldown_until: float = 0.0

    async def transcribe_with_language(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000,
        language: str = "auto",
    ) -> TranscriptionResult:
        import time

        if time.time() < GeminiMultilingualSTTProvider._quota_cooldown_until:
            fallback = GoogleWebSTTProvider()
            return await fallback.transcribe_with_language(audio_data, sample_rate, language)

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

            # Run in executor to avoid blocking event loop
            loop = asyncio.get_event_loop()

            def _call_gemini() -> str:
                # Use high-fidelity flagship flash model
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
    """
    Speech-to-Text using Google's Web Speech API.

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

            # Auto-detection sequence:
            # 1. Try en-IN (captures Indian English, Tanglish verbs, and technical terms)
            # 2. If repetitive loop or unknown, try ta-IN (captures native Tamil script)
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

            # If empty or repetitive single-word hallucination, try fallback language
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


class STTEngine:
    """
    Speech-to-Text engine with provider abstraction and automatic language detection.
    """

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
    ) -> TranscriptionResult:
        """Transcribe audio and return both transcribed text and detected language."""
        if self._provider is None:
            self._init_provider()
            if self._provider is None:
                raise STTError("No STT provider available")

        lang = language or self._language or "auto"

        try:
            return await self._provider.transcribe_with_language(audio_data, sample_rate, lang)
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
