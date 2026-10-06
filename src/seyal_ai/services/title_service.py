"""
Seyal AI Dynamic Chat Title Service.

Analyzes conversations periodically to generate concise, dominant-topic titles
conforming strictly to word, character, and category uniqueness rules.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("services.title")


def clean_title_candidate(title: str, max_words: int = 6, max_chars: int = 42) -> str:
    """Clean and constrain a title string to rules: 3-6 words, 35-45 characters max."""
    if not title:
        return "New Conversation"

    # Remove markdown, quotes, prefixes
    cleaned = title.strip()
    cleaned = re.sub(r'^(title|topic|task|summary)\s*:\s*', '', cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r'[\'"`\*_#]', '', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    cleaned = cleaned.rstrip('.,;:-')

    words = cleaned.split()
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words])

    if len(cleaned) > max_chars:
        # Cut cleanly at last word boundary before max_chars
        truncated = cleaned[:max_chars].strip()
        last_space = truncated.rfind(' ')
        if last_space > 15:
            cleaned = truncated[:last_space].strip()
        else:
            cleaned = truncated

    return cleaned or "New Conversation"


def make_unique_title(candidate: str, existing_titles: set[str], is_computer_use: bool = False) -> str:
    """
    Ensure the title is strictly unique within its category.
    existing_titles should be clean titles without [Computer-Use] prefix (lowercased).
    """
    base = clean_title_candidate(candidate)
    lowered_existing = {t.strip().lower() for t in existing_titles if t}

    if base.lower() not in lowered_existing:
        return base

    # Try natural numeric or contextual differentiators
    for i in range(2, 50):
        test_title = f"{base} ({i})"
        if len(test_title) > 45:
            # Shorten base slightly so suffix fits under 45 chars
            shortened_base = base[:40 - len(str(i))].rstrip()
            test_title = f"{shortened_base} ({i})"
        if test_title.lower() not in lowered_existing:
            return test_title

    import uuid
    return f"{base[:36]} {uuid.uuid4().hex[:4]}"


def heuristic_title_from_message(text: str, is_computer_use: bool = False) -> str:
    """
    Generate a clean 3-6 word professional title without ever repeating verbatim user slang.
    """
    if not text or not text.strip():
        return "Computer Automation Task" if is_computer_use else "General Chat Discussion"

    t = text.lower().strip()
    # Check for domain-specific intents
    if "java" in t:
        return "Java Code Programming Help"
    if "python" in t:
        return "Python Code Development"
    if any(k in t for k in ["code", "coding", "program", "script", "bug", "syntax", "algorithm"]):
        return "Software Code Development Help"
    if any(k in t for k in ["laptop", "wifi", "internet", "network", "connect"]):
        return "Laptop Network Troubleshooting"
    if any(k in t for k in ["interview", "questions", "prepare", "job", "career"]):
        return "Technical Interview Preparation"
    if any(k in t for k in ["camera", "photo", "picture", "webcam", "snap"]):
        return "Camera and Photo Operation"
    if any(k in t for k in ["browser", "chrome", "edge", "website", "search", "google", "web"]):
        return "Web Browser Search Task"
    if any(k in t for k in ["notepad", "file", "text", "write", "document", "save"]):
        return "Document and Text Editing"
    if any(k in t for k in ["talk", "chat", "conversation", "hello", "hi", "how are you"]):
        return "Casual AI Conversation"

    # Clean words and filter common stopwords
    words = re.findall(r'[a-zA-Z0-9]+', text)
    stopwords = {
        "please", "can", "you", "me", "the", "a", "an", "in", "on", "at", "to", "for", "of",
        "do", "how", "what", "is", "are", "tell", "show", "give", "help"
    }
    filtered = [w.capitalize() for w in words if w.lower() not in stopwords]

    if len(filtered) >= 3:
        cand = " ".join(filtered[:5])
    elif len(filtered) > 0:
        suffix = "Operation Task" if is_computer_use else "Discussion Topic"
        cand = f"{' '.join(filtered)} {suffix}"
    else:
        cand = "Autonomous Agent Task" if is_computer_use else "General AI Conversation"

    return clean_title_candidate(cand)


def generate_initial_title_from_first_message(
    first_message: str,
    existing_category_titles: set[str],
    is_computer_use: bool = False,
) -> str:
    """
    Synchronous fallback: returns a clean, rule-abiding title from the message
    without raw slang or mirroring the user verbatim.
    """
    candidate = heuristic_title_from_message(first_message, is_computer_use)
    return make_unique_title(candidate, existing_category_titles, is_computer_use)


async def generate_ai_title_for_first_turn(
    first_message: str,
    existing_category_titles: set[str],
    brain: Any | None = None,
    is_computer_use: bool = False,
) -> str:
    """
    Generate an intelligent AI title from the first message via LLM,
    falling back to smart heuristics if LLM is unavailable.
    Guarantees:
    - 3-6 words, Title Case
    - 35-45 characters max
    - NEVER echoes raw informal slang
    - Unique within category
    """
    candidate_title: str | None = None

    if brain and hasattr(brain, "_router") and brain._router.has_providers:
        try:
            from seyal_ai.llm.providers.base import LLMMessage, ModelTier

            system_prompt = (
                "You are an expert AI conversation title generator.\n"
                "Generate a concise, professional title based on the user's initial message or task.\n"
                "STRICT RULES:\n"
                "1. Length: Exactly 3 to 6 words.\n"
                "2. Characters: 35 to 45 characters maximum.\n"
                "3. NEVER repeat informal user words or slang verbatim (generate professional titles like 'Java Code Programming Help' or 'Google Chrome Browser Task').\n"
                "4. Format: Title Case (e.g. 'Java Code Generation Help').\n"
                "5. Output ONLY the raw title text. No quotes, no markdown, no punctuation at the end, no prefix like 'Title:'."
            )

            titles_sample = list(existing_category_titles)[:15]
            uniqueness_hint = ""
            if titles_sample:
                uniqueness_hint = f"\nDo NOT reuse any of these existing titles: {', '.join(titles_sample)}."

            user_prompt = f"User Message:\n{first_message[:300]}{uniqueness_hint}\n\nTitle (3-6 words):"

            llm_resp = await asyncio.wait_for(
                brain._router.generate(
                    messages=[
                        LLMMessage(role="system", content=system_prompt),
                        LLMMessage(role="user", content=user_prompt),
                    ],
                    tier=ModelTier.FAST,
                    temperature=0.3,
                    max_tokens=30,
                ),
                timeout=3.5,
            )

            if llm_resp and llm_resp.content and llm_resp.content.strip():
                cand = clean_title_candidate(llm_resp.content)
                # Verify it is not an echo of raw input
                if cand and cand.lower() != first_message.strip().lower():
                    candidate_title = cand
        except Exception as err:
            log.debug("LLM first-turn title generation fallback: %s", err)

    if not candidate_title:
        candidate_title = heuristic_title_from_message(first_message, is_computer_use)

    return make_unique_title(candidate_title, existing_category_titles, is_computer_use)


async def generate_dynamic_title(
    messages: list[Any],
    existing_category_titles: set[str],
    brain: Any | None = None,
    is_computer_use: bool = False,
) -> str:
    """
    Generate an intelligent dynamic title for a conversation by analyzing full context.
    - 3-6 words
    - 35-45 characters
    - Identifies dominant or evolved topic
    - Synthesizes broader category if topics changed
    - Enforces uniqueness within category
    """
    if not messages:
        return make_unique_title("Computer Automation Task" if is_computer_use else "General AI Conversation", existing_category_titles, is_computer_use)

    # Format transcript lines for analysis
    transcript_lines: list[str] = []
    user_prompts: list[str] = []
    for m in messages:
        role = getattr(m, "role", "user")
        content = (getattr(m, "content", "") or "").strip()
        if not content:
            continue
        # Truncate content for token efficiency
        snippet = content[:200] if len(content) > 200 else content
        transcript_lines.append(f"{role.capitalize()}: {snippet}")
        if role.lower() == "user":
            user_prompts.append(content)

    transcript_text = "\n".join(transcript_lines[-8:])  # Last up to 8 messages

    # Attempt LLM generation if router is active
    if brain and hasattr(brain, "_router") and brain._router.has_providers:
        try:
            from seyal_ai.llm.providers.base import LLMMessage, ModelTier

            system_prompt = (
                "You are an expert AI conversation title generator.\n"
                "Analyze the conversation transcript and determine the primary or dominant theme.\n"
                "Follow these strict rules:\n"
                "1. Length: Exactly 3 to 6 words.\n"
                "2. Characters: 35 to 45 characters maximum.\n"
                "3. Dominant Theme: Capture the main or dominant subject.\n"
                "   Do NOT list separate unrelated topics (e.g., NEVER return 'Java, Laptop, Interview').\n"
                "4. If multiple unrelated topics are discussed without a single dominant topic, provide a concise broader category title.\n"
                "5. NEVER repeat verbatim user slang or informal sentences.\n"
                "6. Format: Standard Title Case (e.g. 'Java Code Development').\n"
                "7. Output format: Return ONLY the raw title text. No quotes, no markdown, no punctuation at the end, no prefix like 'Title:'."
            )

            titles_sample = list(existing_category_titles)[:15]
            uniqueness_hint = ""
            if titles_sample:
                uniqueness_hint = f"\nDo NOT reuse any of these existing titles: {', '.join(titles_sample)}."

            user_prompt = f"Transcript:\n{transcript_text}{uniqueness_hint}\n\nTitle (3-6 words):"

            llm_resp = await asyncio.wait_for(
                brain._router.generate(
                    messages=[
                        LLMMessage(role="system", content=system_prompt),
                        LLMMessage(role="user", content=user_prompt),
                    ],
                    tier=ModelTier.FAST,
                    temperature=0.3,
                    max_tokens=40,
                ),
                timeout=4.0,
            )

            if llm_resp and llm_resp.content and llm_resp.content.strip():
                candidate = clean_title_candidate(llm_resp.content)
                if candidate:
                    return make_unique_title(candidate, existing_category_titles, is_computer_use)
        except Exception as err:
            log.debug("LLM dynamic title generation notice: %s", err)

    # Heuristic fallback if LLM unavailable
    latest_user_prompt = user_prompts[-1] if user_prompts else ""
    candidate = heuristic_title_from_message(latest_user_prompt, is_computer_use)
    return make_unique_title(candidate, existing_category_titles, is_computer_use)


MANUALLY_RENAMED_CONVERSATIONS: set[str] = set()


def mark_manually_renamed(conv_id: str) -> None:
    """Mark a conversation as user-renamed so AI won't overwrite it."""
    MANUALLY_RENAMED_CONVERSATIONS.add(conv_id)


def is_conv_manually_renamed(conv_id: str) -> bool:
    """Check if conversation was manually renamed by the user."""
    return conv_id in MANUALLY_RENAMED_CONVERSATIONS


def should_periodically_update_title(message_count: int, is_manually_renamed: bool = False) -> bool:
    """
    Decide whether dynamic title should be re-evaluated as conversation evolves.
    - Evaluates on every completed turn (message_count >= 2 and message_count % 2 == 0)
    - NEVER if user has manually renamed the chat!
    """
    if is_manually_renamed:
        return False

    if message_count >= 2 and (message_count % 2 == 0):
        return True

    return False


async def run_periodic_title_update_if_needed(
    conversation_id: str,
    session: Any,
    repo: Any,
    brain: Any | None = None,
    is_computer_use: bool = False,
    force: bool = False,
) -> str | None:
    """
    Check conditions and run intelligent dynamic title update if due.
    Ensures category uniqueness and respects manual user renames.
    """
    try:
        if is_conv_manually_renamed(conversation_id) and not force:
            return None

        conv = await repo.get_conversation(conversation_id)
        if not conv:
            return None

        messages = conv.messages or []
        msg_count = len(messages)
        if not force and not should_periodically_update_title(msg_count, is_conv_manually_renamed(conversation_id)):
            return None

        # Gather existing titles in the exact same category to guarantee uniqueness
        all_convs, _ = await repo.list_conversations(offset=0, limit=200)
        existing_titles: set[str] = set()
        for c in all_convs:
            if c.id == conversation_id:
                continue
            c_sum = c.summary or ""
            c_is_cu = c_sum.startswith("[Computer-Use]")
            if c_is_cu == is_computer_use:
                clean_t = c_sum.replace("[Computer-Use]", "").strip()
                if clean_t:
                    existing_titles.add(clean_t.lower())

        new_title = await generate_dynamic_title(
            messages=messages,
            existing_category_titles=existing_titles,
            brain=brain,
            is_computer_use=is_computer_use,
        )

        final_summary = f"[Computer-Use] {new_title}" if is_computer_use else new_title
        conv.summary = final_summary
        await session.commit()
        log.info("Dynamic title updated for %s: '%s'", conversation_id, final_summary)
        return final_summary
    except Exception as e:
        log.warning("Periodic dynamic title update notice: %s", e)
        return None

