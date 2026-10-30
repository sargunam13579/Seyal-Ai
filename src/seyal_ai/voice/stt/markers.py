"""Seyal AI Voice — STT Multilingual Language & Script Markers."""

from __future__ import annotations

import re

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
    """Detect language category from transcribed text.

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
