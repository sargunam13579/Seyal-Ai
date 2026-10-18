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
    current_input: str | None = None,
) -> str:
    """
    Build a dynamic, universal multilingual system prompt protocol (ChatGPT/Gemini style).

    Priority Hierarchy:
    1. Explicit User Directive (Top Priority): User asks for a language -> honor immediately.
    2. Current Message Language & Style (Adaptive Mirroring): Detect and mirror any language, dialect, or code-switched mix.
    3. Conversational Continuity: Maintain established thread language on brief follow-ups.
    4. User Profile Background Context: Use mother tongue & known languages as smart default/greeting context.
    """
    # Clean and deduplicate languages
    allowed: list[str] = []
    if mother_tongue and mother_tongue.strip():
        allowed.append(mother_tongue.strip())
    if known_languages:
        for lang in known_languages:
            if lang and lang.strip() and lang.strip().lower() not in [a.lower() for a in allowed]:
                allowed.append(lang.strip())

    native_str = mother_tongue.strip() if mother_tongue else "User's primary language"
    allowed_str = ", ".join(allowed) if allowed else "Any language spoken by user"

    active_directive_block = ""
    if current_input and current_input.strip():
        sig = resolve_language_signals(
            current_input=current_input,
            mother_tongue=mother_tongue,
            known_languages=known_languages,
        )
        active_directive_block = f"""
====================================================
ACTIVE REAL-TIME USER INTERACTION SIGNAL:
- Current Input: "{current_input.strip()}"
- Resolved Target Language: {sig.language_code.upper()}
- Script Mode: {sig.script}
- Communication Style: {sig.style}
- Explicit Request: {sig.explicit_directive or 'None (Dynamically inferred)'}
- Mandate: {sig.system_instruction}
====================================================
"""

    return f"""

====================================================
UNIVERSAL MULTILINGUAL LANGUAGE & CONVERSATION PROTOCOL
====================================================
You are a truly universal, fluent, and adaptive multilingual AI agent.
You natively understand, read, and communicate in ANY language in the world (English, Tamil, Hindi, Spanish, French, German, Telugu, Malayalam, Japanese, Chinese, Arabic, Russian, Italian, etc.) including natural regional code-switching (Tanglish, Hinglish, Spanglish, etc.).

PRIORITY HIERARCHY FOR LANGUAGE SELECTION:
1. EXPLICIT USER DIRECTIVE (Top Priority):
   - If the user explicitly asks you to speak, explain, translate, or reply in a specific language (e.g., "in English", "in French", "தமிழில் சொல்லுங்கள்", "Hindi mein batao", "explain in Spanish"), you MUST immediately honor that requested language for your response.

2. CURRENT MESSAGE LANGUAGE & STYLE (Adaptive Mirroring):
   - Automatically detect the language, dialect, and script of the user's current message.
   - Seamlessly mirror that language and communication style in your response:
     * If the user writes in English -> respond in clear, fluent English.
     * If the user writes in Tamil script -> respond in natural Tamil.
     * If the user writes in Tanglish (Tamil vocabulary in Latin/English script) -> respond naturally in conversational Tanglish.
     * If the user writes in Hindi / Hinglish -> respond in Hindi / Hinglish.
     * If the user writes in Spanish, French, German, Telugu, Malayalam, etc. -> respond fluently in that exact language.
     * If the user writes in mixed/code-switched language -> match their conversational style naturally.
   - Language ≠ Script: Always understand phonetic regional languages written in English letters.

3. CONVERSATIONAL CONTINUITY:
   - For short follow-ups, confirmations, or brief inputs (e.g., "Why?", "What next?", "Explain simply", "Puriyala"), maintain the established conversational topic and language from the active conversation history.

4. USER PROFILE BACKGROUND CONTEXT:
   - User Profile Preferences:
     * Mother Tongue: {native_str}
     * Known / Familiar Languages: {allowed_str}
   - Use these preferences as background context or default greeting language when the conversation starts or when input is language-neutral (e.g., "Hi", "Hello").
   - NEVER lock or restrict the user to these languages. Always dynamically adapt whenever the user writes or speaks in any other language.
====================================================
{active_directive_block}
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


from dataclasses import dataclass

@dataclass
class LanguageResolution:
    language_code: str               # "ta", "en", "hi", "es", "fr", "de", "te", ...
    script: str                      # "latin", "tamil", "devanagari", "telugu", ...
    style: str                       # "tanglish", "pure_tamil", "english", "hinglish", "code_switched"
    explicit_directive: str | None = None
    is_tanglish: bool = False
    system_instruction: str = ""


_EXTENDED_TANGLISH_MARKERS = {
    "pannu", "pannunga", "pannalam", "pannen", "pannitanga", "pannuriya",
    "seidu", "seiyalam", "vaanga", "ponga", "po", "thira",
    "kodu", "eduda", "edunga", "edu", "paru", "paarunga",
    "solra", "solla", "sollunga", "pesu", "pesunga", "irukku", "irukken", "irukkinga",
    "enna", "inga", "unga", "nalla", "romba", "aachu", "varuthu",
    "mudiyuma", "mudiyathu", "poidu", "thirumba", "inniki", "naalai", "naalaiki",
    "epdi", "eppadi", "yen", "dhaan", "kooda", "apdi", "ippadi",
    "puriyala", "seri", "illa", "vandhu", "kudunga", "theriyum", "solren",
    "vendaam", "venaam", "venam", "adhu", "idhu", "evalo", "neram", "mudinjitha", "mudinjatha",
    "enakku", "unakku", "indha", "andha", "theva", "podhum",
}

_HINDI_MARKERS = {
    "kholo", "karo", "chalao", "band", "batao", "dikhaye", "hai", "kya",
    "kaise", "karein", "ruko", "dekho", "bolo", "sunao", "chahiye", "kar",
}


def resolve_language_signals(
    current_input: str | None = None,
    conversation_history: list[dict] | None = None,
    mother_tongue: str | None = None,
    known_languages: list[str] | None = None,
) -> LanguageResolution:
    """
    ChatGPT 5-Tier Language Resolution Formula:
    Explicit User Directive > Current Message Style & Code-Switching > Conversation History Context > User Profile Preference > Default ('en').
    """
    import re

    # 1. TIER 1: Explicit User Directives (Top Priority)
    if current_input and current_input.strip():
        text = current_input.strip()
        lower = text.lower()

        # Explicit English request
        if any(w in lower for w in [
            "in english", "english-la", "english la", "speak english",
            "english please", "reply in english", "explain in english",
            "explain completely in english", "tell in english"
        ]):
            return LanguageResolution(
                language_code="en",
                script="latin",
                style="english",
                explicit_directive="User explicitly requested English",
                system_instruction="Strictly respond in clear, fluent English as requested.",
            )

        # Explicit Tanglish request
        if any(w in lower for w in ["tanglish", "tanglish-la", "tanglish la", "tamil-la", "tamil la"]):
            return LanguageResolution(
                language_code="ta",
                script="latin",
                style="tanglish",
                is_tanglish=True,
                explicit_directive="User explicitly requested Tanglish",
                system_instruction="Strictly respond in conversational Tanglish (Tamil in Latin/English script).",
            )

        # Explicit Tamil script request
        if any(w in lower for w in ["தமிழில்", "தமிழில் சொல்லுங்கள்", "தமிழில் பேசு", "in tamil script"]):
            return LanguageResolution(
                language_code="ta",
                script="tamil",
                style="pure_tamil",
                explicit_directive="User explicitly requested Tamil",
                system_instruction="Strictly respond in natural Tamil script (தமிழ்).",
            )

        # Explicit Hindi request
        if any(w in lower for w in ["in hindi", "hindi-la", "हिंदी", "hindi mein", "hinglish"]):
            return LanguageResolution(
                language_code="hi",
                script="devanagari" if re.search(r"[\u0900-\u097F]", text) else "latin",
                style="hinglish" if "hinglish" in lower else "hindi",
                explicit_directive="User explicitly requested Hindi",
                system_instruction="Strictly respond in Hindi / Hinglish.",
            )

        # Explicit other languages
        for lang_code, markers in [
            ("es", ["in spanish", "en español"]),
            ("fr", ["in french", "en français"]),
            ("de", ["in german", "auf deutsch"]),
            ("te", ["in telugu", "తెలుగులో", "telugu-la"]),
            ("ml", ["in malayalam", "മലയാളത്തിൽ"]),
        ]:
            if any(m in lower for m in markers):
                return LanguageResolution(
                    language_code=lang_code,
                    script="latin" if lang_code in ("es", "fr", "de") else lang_code,
                    style=lang_code,
                    explicit_directive=f"User explicitly requested {lang_code}",
                    system_instruction=f"Strictly respond in fluent {lang_code}.",
                )

        # 2. TIER 2: Current Message Language & Style (Adaptive Code-Switching)
        # 2A. Script-based detection
        if re.search(r"[\u0B80-\u0BFF]", text):
            return LanguageResolution(
                language_code="ta",
                script="tamil",
                style="pure_tamil",
                system_instruction="User communicated in Tamil script. Respond in natural, fluent Tamil.",
            )
        if re.search(r"[\u0900-\u097F]", text):
            return LanguageResolution(
                language_code="hi",
                script="devanagari",
                style="hindi",
                system_instruction="User communicated in Devanagari script. Respond in natural Hindi.",
            )
        if re.search(r"[\u0C00-\u0C7F]", text):
            return LanguageResolution(
                language_code="te",
                script="telugu",
                style="telugu",
                system_instruction="User communicated in Telugu script. Respond in natural Telugu.",
            )

        # 2B. Latin Script Code-Switching (Language != Script)
        words = set(re.findall(r"\b[a-zA-Z]+\b", lower))
        tanglish_matches = words.intersection(_EXTENDED_TANGLISH_MARKERS)
        if tanglish_matches or any(tm in lower for tm in ["puriyala", "sollunga", "pannunga", "panren", "pannalaam"]):
            return LanguageResolution(
                language_code="ta",
                script="latin",
                style="tanglish",
                is_tanglish=True,
                system_instruction="User communicated in Tanglish (Tamil in Latin script). Respond in natural, conversational Tanglish without forcing Tamil script.",
            )

        hindi_matches = words.intersection(_HINDI_MARKERS)
        if hindi_matches:
            return LanguageResolution(
                language_code="hi",
                script="latin",
                style="hinglish",
                system_instruction="User communicated in Hinglish. Respond in natural Hinglish.",
            )

        # 3. TIER 3: Conversational Continuity for Short Follow-ups
        short_tanglish = {"puriyala", "simple-ah", "simple ah", "enna aachu", "aduthu", "sollu"}
        if any(st in lower for st in short_tanglish):
            return LanguageResolution(
                language_code="ta",
                script="latin",
                style="tanglish",
                is_tanglish=True,
                system_instruction="User gave a brief conversational follow-up. Continue topic in friendly Tanglish.",
            )

        # Pure English detection
        return LanguageResolution(
            language_code="en",
            script="latin",
            style="english",
            system_instruction="User communicated in English. Respond in clear, natural English.",
        )

    # 4. TIER 4: User Profile Background Preferences
    all_langs: list[str] = []
    if mother_tongue:
        all_langs.append(mother_tongue.lower().strip())
    if known_languages:
        for k in known_languages:
            if isinstance(k, str):
                all_langs.append(k.lower().strip())

    has_tanglish_pref = any("tanglish" in lang for lang in all_langs)
    for lang in all_langs:
        if "tamil" in lang or "tanglish" in lang:
            return LanguageResolution(
                language_code="ta",
                script="latin" if has_tanglish_pref else "tamil",
                style="tanglish" if has_tanglish_pref else "pure_tamil",
                is_tanglish=has_tanglish_pref,
                system_instruction="Default to user's preferred Tamil/Tanglish context.",
            )
        if "hindi" in lang or "hinglish" in lang:
            has_hinglish_pref = any("hinglish" in l for l in all_langs)
            return LanguageResolution(
                language_code="hi",
                script="latin" if has_hinglish_pref else "devanagari",
                style="hinglish" if has_hinglish_pref else "hindi",
                system_instruction="Default to user's preferred Hindi context.",
            )
        if "spanish" in lang or lang == "es":
            return LanguageResolution(
                language_code="es",
                script="latin",
                style="spanish",
                system_instruction="Default to user's preferred Spanish context.",
            )
        if "french" in lang or lang == "fr":
            return LanguageResolution(
                language_code="fr",
                script="latin",
                style="french",
                system_instruction="Default to user's preferred French context.",
            )
        if "german" in lang or lang == "de":
            return LanguageResolution(
                language_code="de",
                script="latin",
                style="german",
                system_instruction="Default to user's preferred German context.",
            )
        if "telugu" in lang or lang == "te":
            return LanguageResolution(
                language_code="te",
                script="telugu",
                style="telugu",
                system_instruction="Default to user's preferred Telugu context.",
            )

    # 5. TIER 5: Global Default
    return LanguageResolution(
        language_code="en",
        script="latin",
        style="english",
        system_instruction="Default to universal English.",
    )


def resolve_response_language(
    mother_tongue: str | None = None,
    known_languages: list[str] | None = None,
    current_input: str | None = None,
) -> str:
    """
    Dynamically resolve target language code using ChatGPT 5-tier priority hierarchy.
    """
    res = resolve_language_signals(
        current_input=current_input,
        mother_tongue=mother_tongue,
        known_languages=known_languages,
    )
    return res.language_code


def is_tanglish_style(input_text: str | None) -> bool:
    """Check if the given text represents Tanglish (Tamil vocabulary in Latin script)."""
    if not input_text or not input_text.strip():
        return False
    res = resolve_language_signals(current_input=input_text)
    return res.is_tanglish


def is_user_tamil_preferred(mother_tongue: str | None, known_languages: list[str] | None) -> bool:
    """Check if Tamil or Tanglish is the user's primary/preferred language."""
    return resolve_response_language(mother_tongue, known_languages) == "ta"


def get_localized_response(
    key: str,
    mother_tongue: str | None = None,
    known_languages: list[str] | None = None,
    **kwargs: str,
) -> str:
    """
    Generate dynamic responses in the user's active/detected language,
    supporting English, Tamil/Tanglish, Hindi, Spanish, French, German, and Telugu dynamically.
    """
    current_input = kwargs.get("current_input") or kwargs.get("input_text")
    lang = resolve_response_language(mother_tongue, known_languages, current_input=current_input)

    app = kwargs.get("app", "app")
    item = kwargs.get("item", "task")
    user = kwargs.get("user", "")

    if key == "welcome":
        time_g = kwargs.get("time_greeting", "Hello")
        if lang == "ta":
            return f"Vanakkam {user}! Naan ready. Innaiki laptop-la enna task seiyalam, sollunga! 😊✨" if user else "Vanakkam! Naan ready. Innaiki laptop-la enna task seiyalam, sollunga! 😊✨"
        if lang == "hi":
            return f"Namaste {user}! Main ready hoon. Aaj computer par kya kaam karein? 😊✨" if user else "Namaste! Main ready hoon. Aaj computer par kya kaam karein? 😊✨"
        if lang == "es":
            return f"¡Hola {user}! Estoy listo. ¿En qué tarea podemos trabajar hoy? 😊✨" if user else "¡Hola! Estoy listo. ¿En qué tarea podemos trabajar hoy? 😊✨"
        if lang == "fr":
            return f"Bonjour {user}! Je suis prêt. Sur quelle tâche voulons-nous travailler? 😊✨" if user else "Bonjour! Je suis prêt. Sur quelle tâche voulons-nous travailler? 😊✨"
        return f"{time_g} {user}! I'm ready. What computer task shall we work on? 😊✨" if user else f"{time_g}! I'm ready. What computer task shall we work on? 😊✨"

    if key == "convo_fallback":
        if lang == "ta":
            return "Naan kavanikkiren! Enna seiyanum sollunga? 😊✨"
        if lang == "hi":
            return "Main sun raha hoon! Kya madad chahiye? 😊✨"
        if lang == "es":
            return "¡Te escucho! ¿Cómo puedo ayudarte hoy? 😊✨"
        if lang == "fr":
            return "Je vous écoute ! Comment puis-je vous aider aujourd'hui ? 😊✨"
        return "I'm listening! How can I help you today? 😊✨"

    if key == "task_ack":
        if lang == "ta":
            return f"{item} task-ah ippo start panren! 🚀"
        if lang == "hi":
            return f"{item} task shuru kar raha hoon! 🚀"
        if lang == "es":
            return f"¡Iniciando la tarea {item} ahora! 🚀"
        if lang == "fr":
            return f"Démarrage de la tâche {item} maintenant ! 🚀"
        return f"Starting {item} now! 🚀"

    if key == "task_done":
        if lang == "ta":
            return f"{item} mudichiten! Aduthu enna seiyalam?"
        if lang == "hi":
            return f"{item} poora ho gaya! Aage kya karein?"
        if lang == "es":
            return f"¡{item} completado! ¿Qué hacemos después?"
        if lang == "fr":
            return f"Tâche {item} terminée ! Que souhaitez-vous faire ensuite ?"
        return f"Done with {item}! What would you like to do next?"

    if key == "app_opened":
        if lang == "ta":
            return f"{app} open panniten! Aduthu enna seiyalam?"
        if lang == "hi":
            return f"{app} open kar diya! Aage kya karein?"
        if lang == "es":
            return f"¡Abrí {app}! ¿Qué hacemos ahora?"
        if lang == "fr":
            return f"J'ai ouvert {app} ! Que faisons-nous ensuite ?"
        return f"Opened {app} for you! What would you like to do next?"

    if key == "emergency_stop":
        if lang == "ta":
            return "🚨 அவசர நிறுத்தம்: எல்லா வேலைகளும் உடனடியாக நிறுத்தப்பட்டுவிட்டன."
        if lang == "hi":
            return "🚨 आपातकालीन रोक: सभी कार्य तुरंत रोक दिए गए हैं।"
        if lang == "es":
            return "🚨 PARADA DE EMERGENCIA: Todas las tareas activas se han detenido inmediatamente."
        if lang == "fr":
            return "🚨 ARRÊT D'URGENCE : Toutes les tâches actives ont été immédiatement arrêtées."
        return "🚨 EMERGENCY STOP: All active tasks and operations have been halted immediately."

    if key == "task_cancelled":
        if lang == "ta":
            return "Task cancel panniyachu. Ippo nadakkura velai niruthappattathu."
        if lang == "hi":
            return "Task cancel kar diya gaya. Current kaam rok diya gaya hai."
        if lang == "es":
            return "Tarea cancelada. Se detuvo la operación actual."
        if lang == "fr":
            return "Tâche annulée. L'opération actuelle a été arrêtée."
        return "Task cancelled. Stopped current operation."

    if key == "stop_operation":
        if lang == "ta":
            return "Kandippa, laptop velaiyai ungalukkaga niruthiten."
        if lang == "hi":
            return "Theek hai, laptop execution rok diya gaya hai."
        return "I have stopped the computer-use operation for you."

    if key == "wake_standalone":
        if lang == "ta":
            return "Sollunga, naan kekauren!"
        if lang == "hi":
            return "Haan kahiye, main sun raha hoon!"
        if lang == "es":
            return "¡Sí! Te escucho."
        if lang == "fr":
            return "Oui ? Je vous écoute."
        return "Yes? I'm listening."

    if key == "permission_mouse":
        if lang == "ta":
            return "Settings > Computer Control-la Mouse permission disable-la irukku. Dayavu seidhu enable pannunga! 🔒"
        return "Mouse Control permission is disabled in Settings > Computer Control. Please enable it to allow mouse actions! 🔒"

    if key == "permission_keyboard":
        if lang == "ta":
            return "Settings > Computer Control-la Keyboard permission disable-la irukku. Typing seiya enable pannunga! 🔒"
        return "Keyboard Control permission is disabled in Settings > Computer Control. Please enable it to allow typing! 🔒"

    if key == "permission_app":
        if lang == "ta":
            return "Settings > Computer Control-la App Control permission disable-la irukku. Apps launch seiya enable pannunga! 🔒"
        return "Applications Control permission is disabled in Settings > Computer Control. Please enable it to launch/close apps! 🔒"

    if key == "photo_captured":
        if lang == "ta":
            return "Camera-la photo eduthachu! 📸"
        if lang == "hi":
            return "Camera se photo le li gayi hai! 📸"
        return "Photo captured with Camera! 📸"

    if key == "assessing_layout":
        if lang == "ta":
            return "Screen layout-ah observe panren..."
        if lang == "hi":
            return "Screen layout dekh raha hoon..."
        return "Assessing application layout..."

    if key == "ask_permission":
        if lang == "ta":
            return f"Naan '{item}' task-ah start pannattuma?"
        if lang == "hi":
            return f"Kya main '{item}' task shuru karoon?"
        if lang == "es":
            return f"¿Debo proceder e iniciar la tarea: {item}?"
        return f"Should I go ahead and start: {item}?"

    if key == "task_completed_report":
        if lang == "ta":
            return f"'{item}' task vetrigarama mudinjithu!"
        if lang == "hi":
            return f"'{item}' task safaltapoorvak poora ho gaya!"
        return f"Task '{item}' has been successfully completed!"

    if key == "alert_notification":
        details = kwargs.get("details", "")
        if lang == "ta":
            return f"Arivippu: '{item}' patriya thagaval: {details}."
        if lang == "hi":
            return f"Suchna: '{item}' ke bare mein: {details}."
        return f"Notification: {details} regarding '{item}'."

    if key == "action_confirmed":
        if lang == "ta":
            return "Action confirm aagivittathu."
        if lang == "hi":
            return "Action confirm ho gaya hai."
        if lang == "es":
            return "Acción confirmada."
        if lang == "fr":
            return "Action confirmée."
        return "Action confirmed."

    if key == "action_cancelled":
        if lang == "ta":
            return "Action cancel aagivittathu."
        if lang == "hi":
            return "Action cancel ho gaya hai."
        if lang == "es":
            return "Acción cancelada."
        if lang == "fr":
            return "Action annulée."
        return "Action cancelled."

    if key == "no_pending_conf":
        if lang == "ta":
            return "Kaathiruppil endha confirmation-um illai."
        if lang == "hi":
            return "Koi confirmation pending nahi hai."
        return "No confirmation is currently pending."

    if key == "conf_expired":
        if lang == "ta":
            return "Confirmation kaalavathi aagivittathu."
        if lang == "hi":
            return "Confirmation expire ho chuka hai."
        return "Confirmation has expired or does not exist."

    if key == "name_change_ask":
        cur = kwargs.get("current_name", "Seyal AI")
        tgt = kwargs.get("target_name", "Seyal AI")
        if lang == "ta":
            return f"En peyara '{cur}'-lendhu '{tgt}'-nu maathattuma?"
        if lang == "hi":
            return f"Kya aap chahte hain ki main apna naam '{cur}' se badalkar '{tgt}' kar doon?"
        return f"Do you want me to change my name from {cur} to {tgt}?"

    if key == "name_change_done":
        tgt = kwargs.get("target_name", "Seyal AI")
        if lang == "ta":
            return f"En peyar '{tgt}'-nu maathiyachu."
        if lang == "hi":
            return f"Mera naam '{tgt}' kar diya gaya hai."
        return f"My name has been changed to {tgt}."

    return ""

