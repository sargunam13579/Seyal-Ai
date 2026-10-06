"""
Seyal AI LLM — Strict User Language Guardrail.

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


_CACHED_LANGUAGE_PROFILE: tuple[str | None, list[str]] | None = None


def invalidate_user_language_profile_cache() -> None:
    """Invalidate cached language profile so changes take effect immediately."""
    global _CACHED_LANGUAGE_PROFILE
    _CACHED_LANGUAGE_PROFILE = None


def get_user_language_profile() -> tuple[str | None, list[str]]:
    """
    Retrieve user's mother tongue and known languages synchronously from:
    1. In-memory cache
    2. User Knowledge JSON file (~/.seyal_ai/user_knowledge_hub.json)
    3. SQLite database (~/.seyal_ai/seyal_ai.db)
    """
    global _CACHED_LANGUAGE_PROFILE
    if _CACHED_LANGUAGE_PROFILE is not None:
        return _CACHED_LANGUAGE_PROFILE

    # 1. Check user knowledge hub JSON (Local-First synchronous read)
    try:
        from seyal_ai.services.user_knowledge_service import user_knowledge_service
        uk = user_knowledge_service.get_user_knowledge()
        if uk:
            mt = uk.get("mother_tongue")
            raw_kl = uk.get("known_languages")
            kl: list[str] = []
            if isinstance(raw_kl, list):
                kl = [str(k).strip() for k in raw_kl if str(k).strip()]
            elif isinstance(raw_kl, str):
                kl = [k.strip() for k in raw_kl.split(",") if k.strip()]
            if mt or kl:
                _CACHED_LANGUAGE_PROFILE = (mt, kl)
                return _CACHED_LANGUAGE_PROFILE
    except Exception:
        pass

    # 2. Check local SQLite DB synchronously
    try:
        import json
        import sqlite3
        from pathlib import Path
        db_path = Path.home() / ".seyal_ai" / "seyal_ai.db"
        if db_path.exists():
            with sqlite3.connect(str(db_path)) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT mother_tongue, known_languages FROM users ORDER BY created_at DESC LIMIT 1")
                row = cursor.fetchone()
                if row:
                    mt = row[0]
                    raw_kl = row[1]
                    kl = []
                    if isinstance(raw_kl, str):
                        try:
                            parsed = json.loads(raw_kl)
                            kl = parsed if isinstance(parsed, list) else [str(parsed)]
                        except Exception:
                            kl = [k.strip() for k in raw_kl.split(",") if k.strip()]
                    elif isinstance(raw_kl, list):
                        kl = [str(k) for k in raw_kl]
                    if mt or kl:
                        _CACHED_LANGUAGE_PROFILE = (mt, kl)
                        return _CACHED_LANGUAGE_PROFILE
    except Exception:
        pass

    return None, []


def is_user_tamil_preferred(mother_tongue: str | None, known_languages: list[str] | None) -> bool:
    """Check if Tamil or Tanglish is the user's primary/preferred language."""
    all_langs = []
    if mother_tongue:
        all_langs.append(mother_tongue.lower().strip())
    if known_languages:
        for k in known_languages:
            if isinstance(k, str):
                all_langs.append(k.lower().strip())
    return any("tamil" in lang or "tanglish" in lang for lang in all_langs)


def get_localized_response(
    key: str,
    mother_tongue: str | None = None,
    known_languages: list[str] | None = None,
    **kwargs: str,
) -> str:
    """
    Generate fallback messages adhering to the user's mother tongue and known languages,
    avoiding rigid English-only defaults when dynamic LLM synthesis is offline.
    """
    prefers_tamil = is_user_tamil_preferred(mother_tongue, known_languages)
    app = kwargs.get("app", "app")
    item = kwargs.get("item", "task")
    user = kwargs.get("user", "")

    if key == "welcome":
        time_g = kwargs.get("time_greeting", "Vanakkam")
        if prefers_tamil:
            return f"Vanakkam {user}! Naan ready. Innaiki laptop-la enna task seiyalam, sollunga! 😊✨" if user else "Vanakkam! Naan ready. Innaiki laptop-la enna task seiyalam, sollunga! 😊✨"
        return f"{time_g} {user}! I'm ready. What computer task shall we work on? 😊✨" if user else f"{time_g}! I'm ready. What computer task shall we work on? 😊✨"

    if key == "convo_fallback":
        if prefers_tamil:
            return "Naan kavanikkiren! Enna seiyanum sollunga? 😊✨"
        return "I'm listening! How can I help you today? 😊✨"

    if key == "task_ack":
        if prefers_tamil:
            return f"{item} task-ah ippo start panren! 🚀"
        return f"Starting {item} now! 🚀"

    if key == "task_done":
        if prefers_tamil:
            return f"{item} mudichiten! Aduthu enna seiyalam?"
        return f"Done with {item}! What would you like to do next?"

    if key == "app_opened":
        if prefers_tamil:
            return f"{app} open panniten! Aduthu enna seiyalam?"
        return f"Opened {app} for you! What would you like to do next?"

    if key == "emergency_stop":
        if prefers_tamil:
            return "🚨 அவசர நிறுத்தம்: எல்லா வேலைகளும் உடனடியாக நிறுத்தப்பட்டுவிட்டன."
        return "🚨 EMERGENCY STOP: All active tasks and operations have been halted immediately."

    if key == "task_cancelled":
        if prefers_tamil:
            return "Task cancel panniyachu. Ippo nadakkura velai niruthappattathu."
        return "Task cancelled. Stopped current operation."

    if key == "stop_operation":
        if prefers_tamil:
            return "Kandippa, laptop velaiyai ungalukkaga niruthiten."
        return "I have stopped the computer-use operation for you."

    if key == "wake_standalone":
        if prefers_tamil:
            return "Sollunga, naan kekauren!"
        return "Yes? I'm listening."

    if key == "permission_mouse":
        if prefers_tamil:
            return "Settings > Computer Control-la Mouse permission disable-la irukku. Dayavu seidhu enable pannunga! 🔒"
        return "Mouse Control permission is disabled in Settings > Computer Control. Please enable it to allow mouse actions! 🔒"

    if key == "permission_keyboard":
        if prefers_tamil:
            return "Settings > Computer Control-la Keyboard permission disable-la irukku. Typing seiya enable pannunga! 🔒"
        return "Keyboard Control permission is disabled in Settings > Computer Control. Please enable it to allow typing! 🔒"

    if key == "permission_app":
        if prefers_tamil:
            return "Settings > Computer Control-la App Control permission disable-la irukku. Apps launch seiya enable pannunga! 🔒"
        return "Applications Control permission is disabled in Settings > Computer Control. Please enable it to launch/close apps! 🔒"

    if key == "photo_captured":
        if prefers_tamil:
            return "Camera-la photo eduthachu! 📸"
        return "Photo captured with Camera! 📸"

    if key == "assessing_layout":
        if prefers_tamil:
            return "Screen layout-ah observe panren..."
        return "Assessing application layout..."

    if key == "ask_permission":
        if prefers_tamil:
            return f"Naan '{item}' task-ah start pannattuma?"
        return f"Should I go ahead and start: {item}?"

    if key == "task_completed_report":
        if prefers_tamil:
            return f"'{item}' task vetrigarama mudinjithu!"
        return f"Task '{item}' has been successfully completed!"

    if key == "alert_notification":
        details = kwargs.get("details", "")
        if prefers_tamil:
            return f"Arivippu: '{item}' patriya thagaval: {details}."
        return f"Notification: {details} regarding '{item}'."

    if key == "action_confirmed":
        if prefers_tamil:
            return "Action confirm aagivittathu."
        return "Action confirmed."

    if key == "action_cancelled":
        if prefers_tamil:
            return "Action cancel aagivittathu."
        return "Action cancelled."

    if key == "no_pending_conf":
        if prefers_tamil:
            return "Kaathiruppil endha confirmation-um illai."
        return "No confirmation is currently pending."

    if key == "conf_expired":
        if prefers_tamil:
            return "Confirmation kaalavathi aagivittathu."
        return "Confirmation has expired or does not exist."

    if key == "name_change_ask":
        cur = kwargs.get("current_name", "Seyal AI")
        tgt = kwargs.get("target_name", "Seyal AI")
        if prefers_tamil:
            return f"En peyara '{cur}'-lendhu '{tgt}'-nu maathattuma?"
        return f"Do you want me to change my name from {cur} to {tgt}?"

    if key == "name_change_done":
        tgt = kwargs.get("target_name", "Seyal AI")
        if prefers_tamil:
            return f"En peyar '{tgt}'-nu maathiyachu."
        return f"My name has been changed to {tgt}."

    return ""

