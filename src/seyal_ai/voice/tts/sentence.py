"""Seyal AI Voice — TTS Sentence Splitting and Multilingual Voice Routing."""

from __future__ import annotations

import re


def _split_sentences(text: str) -> list[str]:
    """Split text into natural sentence chunks for interruptible TTS.

    Splits on sentence-ending punctuation while preserving the punctuation.
    Short fragments are merged with the previous sentence.
    """
    stripped = text.strip()
    if not stripped:
        return []

    # Split on sentence-ending punctuation
    raw = re.split(r"(?<=[.!?])\s+", stripped)
    if not raw:
        return [stripped]

    # Merge very short fragments (< 10 chars) with the previous sentence
    sentences: list[str] = []
    for part in raw:
        part = part.strip()
        if not part:
            continue
        if sentences and len(part) < 10:
            sentences[-1] = sentences[-1] + " " + part
        else:
            sentences.append(part)

    return sentences if sentences else [stripped]


def resolve_multilingual_voice(text: str, requested_voice: str = "auto") -> str:
    """Resolve the neural voice to use. If text contains Tamil script, automatically route
    to high-definition Tamil neural voices so Tamil characters are fully pronounced.
    """
    clean = text.strip()
    vl = (requested_voice or "").lower().strip()

    # Check if text contains Tamil Unicode script (U+0B80 to U+0BFF)
    has_tamil = bool(re.search(r"[\u0B80-\u0BFF]", clean))
    if has_tamil and not vl.startswith("ta-"):
        is_male = any(m in vl for m in ("valluvar", "andrew", "brian", "prabhat", "male", "guy", "david", "midhun", "madhur"))
        return "ta-IN-ValluvarNeural" if is_male else "ta-IN-PallaviNeural"

    if vl and vl not in ("", "auto", "default"):
        if vl in ("breeze", "en-us-avaneural"):
            return "en-US-AvaMultilingualNeural"
        return requested_voice

    # Fallback default if not specified
    return "en-US-AvaMultilingualNeural"
