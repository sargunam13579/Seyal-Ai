"""Seyal AI Voice — STT Transcript Sanitizer and Audio WAV Converter."""

from __future__ import annotations

import io
import re
import wave
import numpy as np

from seyal_ai.utils.logging import get_logger

log = get_logger("voice.stt.sanitizer")


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
    # Match common YouTube / Whisper / Gemini subtitle artifacts & noise hallucination priors
    if re.match(r"^(subtitles? by|closed captions?|thank you for watching|amara\.org|subtitles created by|transcription by)\b", clean, re.IGNORECASE):
        log.info("Discarded subtitle metadata artifact: '%s'", clean)
        return ""
    if re.match(r"^(can you call|tamil news|இனி தான்)$", clean, re.IGNORECASE):
        log.info("Discarded acoustic noise artifact: '%s'", clean)
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
