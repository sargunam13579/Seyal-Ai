"""
NEXUS LLM — Strict User Language Guardrail.

Dedicated module that enforces the user's chosen languages (Mother Tongue and Known Languages).
Ensures the AI Agent (Seyal AI) communicates ONLY in the languages selected by the user,
allowing natural mixing (e.g., Tanglish), and permitting other languages ONLY when explicitly
requested by the user.
"""

from __future__ import annotations


def build_language_guardrail_prompt(
    mother_tongue: str | None = None,
    known_languages: list[str] | None = None,
) -> str:
    """
    Build a strict system prompt constraint for agent language selection.

    Rules:
    1. Agent must strictly respond ONLY in the user's filled languages (Mother Tongue + Known Languages).
    2. Mixing permitted languages (such as Tanglish/code-switching) is permitted and encouraged.
    3. Unfilled/unlisted languages are strictly FORBIDDEN unless the user explicitly requests one
       (e.g., "translate this to French" or "speak in German").
    """
    # Clean and deduplicate languages
    allowed: list[str] = []
    if mother_tongue and mother_tongue.strip():
        allowed.append(mother_tongue.strip())
    if known_languages:
        for lang in known_languages:
            if lang and lang.strip() and lang.strip().lower() not in [a.lower() for a in allowed]:
                allowed.append(lang.strip())

    if not allowed:
        # Default fallback if user has not yet configured languages
        return (
            "\n\n====================================================\n"
            "LANGUAGE PROTOCOL:\n"
            "- Adaptively detect and seamlessly mirror the language and dialect the user speaks.\n"
            "====================================================\n"
        )

    allowed_str = ", ".join(allowed)
    native_str = mother_tongue.strip() if mother_tongue else allowed[0]

    return f"""

====================================================
STRICT USER LANGUAGE PROTOCOL & GUARDRAIL
====================================================
1. AUTHORIZED USER LANGUAGES:
   - Primary / Mother Tongue: {native_str}
   - Permitted Languages: {allowed_str}

2. ABSOLUTE LANGUAGE RESTRICTION:
   - You MUST communicate, respond, narrate, and explain ONLY in the user's permitted languages listed above ({allowed_str}).
   - You are fully authorized to naturally mix permitted languages (e.g. Tanglish / code-switching between {allowed_str}) to match natural conversational flow.
   - FORBIDDEN: You must NEVER initiate, switch to, or reply in any language NOT listed in the permitted languages.

3. EXPLICIT OVERRIDE EXCEPTION:
   - ONLY if the user explicitly asks you to speak, translate, explain, or write in an unlisted language (e.g., "translate this to French", "say this in German", "speak in Hindi"), you are permitted to use that specific requested language for that turn.
   - For all regular queries, chat, computing, and task narrations, strictly adhere to: {allowed_str}.
====================================================
"""
