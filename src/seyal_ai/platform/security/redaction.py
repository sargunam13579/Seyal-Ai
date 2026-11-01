"""
Seyal AI Security — Centralized Sensitive Data Redaction Engine.

Provides standalone, zero-dependency, recursive redaction of secrets, tokens,
passwords, and credentials from dictionaries, lists, URLs, and strings before
audit trail persistence or logging.
"""

from __future__ import annotations

import dataclasses
import json
import re
import unicodedata
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

REDACTED_STR: str = "[REDACTED]"

# ---------------------------------------------------------------------------
# Sensitive Keys and Whitelists
# ---------------------------------------------------------------------------

SENSITIVE_EXACT_KEYS: frozenset[str] = frozenset({
    "password", "passwd", "pwd",
    "secret", "client_secret", "shared_secret",
    "token", "access_token", "refresh_token", "session_token", "auth_token", "jwt",
    "api_key", "apikey", "api-key",
    "authorization", "auth", "bearer",
    "private_key", "privkey", "secret_key", "signing_key", "encryption_key", "master_key",
    "pin", "pairing_pin",
    "cookie", "set-cookie",
    "credential", "credentials",
})

SENSITIVE_KEY_SUFFIXES: tuple[str, ...] = (
    "_secret", "-secret",
    "_token", "-token",
    "_api_key", "_apikey", "-api-key",
    "_password", "_passwd", "-password",
    "_private_key", "-private-key",
    "_pin", "-pin",
    "_credentials", "-credentials",
)

SAFE_KEY_WHITELIST: frozenset[str] = frozenset({
    "primary_key", "foreign_key", "composite_key",
    "partition_key", "sort_key", "clustering_key",
    "keyboard_key", "key_code", "key_name", "key_path", "key_event",
    "idempotency_key", "cache_key", "routing_key",
    "key_type", "key_count",
})

# ---------------------------------------------------------------------------
# Pre-Compiled Regex Scanners (Execution Priority Order)
# ---------------------------------------------------------------------------

PATTERN_BEARER = re.compile(r'(?i)\bBearer\s+[A-Za-z0-9_\-\.~+/]+=*')
PATTERN_ANTHROPIC = re.compile(r'\bsk-ant-(?:api03|admin01)?[A-Za-z0-9_-]{20,}\b')
PATTERN_OPENAI = re.compile(r'\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b')
PATTERN_GOOGLE = re.compile(r'\bAIza[0-9A-Za-z_-]{35}\b')
PATTERN_JWT = re.compile(r'\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b')

# Embedded URL pattern (handles http, https, postgres, postgresql, mysql, sqlite)
URL_EMBEDDED_PATTERN = re.compile(r'([a-zA-Z0-9+.-]+://[^\s"\'<>]+)')

MAX_STRING_LEN: int = 4096
MAX_RECURSION_DEPTH: int = 20


def normalize_key_for_matching(key: Any) -> str:
    """
    Normalize key strictly for sensitive key detection.
    1. NFKC Unicode normalization.
    2. Strips Unicode Format (Cf) and Control (Cc) characters (including zero-width chars).
    3. casefold() for full caseless matching.
    4. Strips leading and trailing whitespace.
    """
    if not isinstance(key, str):
        return ""
    nfkc_str = unicodedata.normalize("NFKC", key)
    cleaned_chars = [
        char for char in nfkc_str
        if unicodedata.category(char) not in ("Cf", "Cc")
    ]
    return "".join(cleaned_chars).casefold().strip()


def is_sensitive_key(normalized_key: str) -> bool:
    """Check if normalized key matches sensitive patterns while respecting safe whitelist."""
    if not normalized_key:
        return False
    if normalized_key in SAFE_KEY_WHITELIST:
        return False
    if normalized_key in SENSITIVE_EXACT_KEYS:
        return True
    if any(normalized_key.endswith(suffix) for suffix in SENSITIVE_KEY_SUFFIXES):
        return True
    return False


def _sanitize_regex_only(text: str) -> str:
    """Apply secret token regex scanners without URL parsing to avoid circular recursion."""
    if not isinstance(text, str):
        return text
    # Idempotency fast path
    if text in ("[REDACTED]", "[REDACTED_JWT]", "[REDACTED_ANTHROPIC_KEY]", "[REDACTED_OPENAI_KEY]", "[REDACTED_GOOGLE_KEY]"):
        return text

    text = PATTERN_BEARER.sub("Bearer [REDACTED]", text)
    text = PATTERN_ANTHROPIC.sub("[REDACTED_ANTHROPIC_KEY]", text)
    text = PATTERN_OPENAI.sub("[REDACTED_OPENAI_KEY]", text)
    text = PATTERN_GOOGLE.sub("[REDACTED_GOOGLE_KEY]", text)
    text = PATTERN_JWT.sub("[REDACTED_JWT]", text)
    return text


def sanitize_url(url_str: str) -> str:
    """
    Structured URL sanitizer adhering to single-decoding policy:
    1. Extracts scheme, netloc, path, query, and fragment.
    2. Sanitizes basic auth credentials in netloc (supports IPv6 brackets).
    3. Parses query parameters (parse_qsl already decodes once; no double-decoding).
    4. Sanitizes sensitive query parameters and values.
    5. Sanitizes fragment if containing key-value pairs or tokens.
    """
    try:
        parsed = urlsplit(url_str)
    except Exception:
        return _sanitize_regex_only(url_str)

    if not parsed.scheme or not parsed.netloc:
        return _sanitize_regex_only(url_str)

    # 1. Netloc Basic-Auth Stripping
    netloc = parsed.netloc
    if "@" in netloc:
        # Split on the rightmost '@' to separate credentials from host:port (supports IPv6 and encoded chars)
        userinfo, host_port = netloc.rsplit("@", 1)
        if ":" in userinfo:
            username, _ = userinfo.split(":", 1)
            netloc = f"{username}:[REDACTED]@{host_port}"
        else:
            netloc = f"[REDACTED]@{host_port}"

    # 2. Query Parameters Sanitization
    query = parsed.query
    if query:
        pairs = parse_qsl(query, keep_blank_values=True)
        sanitized_pairs: list[tuple[str, str]] = []
        for k, v in pairs:
            k_norm = normalize_key_for_matching(k)
            if is_sensitive_key(k_norm):
                sanitized_pairs.append((k, "[REDACTED]"))
            else:
                sanitized_pairs.append((k, _sanitize_regex_only(v)))
        query = urlencode(sanitized_pairs)

    # 3. Fragment Sanitization (e.g. OAuth #access_token=... or #token=...)
    fragment = parsed.fragment
    if fragment:
        if "=" in fragment:
            try:
                f_pairs = parse_qsl(fragment, keep_blank_values=True)
                sanitized_f: list[tuple[str, str]] = []
                for k, v in f_pairs:
                    k_norm = normalize_key_for_matching(k)
                    if is_sensitive_key(k_norm):
                        sanitized_f.append((k, "[REDACTED]"))
                    else:
                        sanitized_f.append((k, _sanitize_regex_only(v)))
                fragment = urlencode(sanitized_f)
            except Exception:
                fragment = _sanitize_regex_only(fragment)
        else:
            fragment = _sanitize_regex_only(fragment)

    return urlunsplit((parsed.scheme, netloc, parsed.path, query, fragment))


def sanitize_string_patterns(text: str) -> str:
    """
    Sanitize secrets and URLs embedded inside arbitrary string values.
    Truncates strings longer than MAX_STRING_LEN before expensive regex scanning.
    """
    if not isinstance(text, str):
        return text

    # Truncate oversized strings first to protect against ReDoS / memory DoS
    if len(text) > MAX_STRING_LEN:
        text = text[:MAX_STRING_LEN] + "... [TRUNCATED]"

    # If already fully redacted placeholder, return immediately (Idempotency)
    if text in ("[REDACTED]", "[REDACTED_JWT]", "[REDACTED_ANTHROPIC_KEY]", "[REDACTED_OPENAI_KEY]", "[REDACTED_GOOGLE_KEY]"):
        return text

    # Check for embedded URLs and sanitize them cleanly
    if "://" in text:
        def _replace_url(match: re.Match) -> str:
            return sanitize_url(match.group(1))
        text = URL_EMBEDDED_PATTERN.sub(_replace_url, text)

    # Scanners applied in strict priority order
    return _sanitize_regex_only(text)


def canonical_json_bytes(item: Any) -> bytes:
    """
    Deterministic canonical JSON byte serialization for pre-sanitized values.
    Pure RFC 8785 sorting without default=str or id(item).
    """
    return json.dumps(
        item,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")


def _sanitize_inner(
    obj: Any,
    active_path: frozenset[int],
    current_depth: int,
    max_depth: int,
) -> Any:
    """Internal recursive worker with active recursion-path tracking."""
    # 1. Primitives and immutable scalars
    if obj is None or isinstance(obj, (int, float, bool)):
        return obj

    obj_id = id(obj)

    # 2. True cycle detection in active recursion path
    if obj_id in active_path:
        return "[CIRCULAR_REFERENCE]"

    # 3. Maximum depth guard
    if current_depth >= max_depth:
        return "[DEPTH_EXCEEDED]"

    new_active_path = active_path | {obj_id}

    # 4. Strings
    if isinstance(obj, str):
        return sanitize_string_patterns(obj)

    # 5. Raw Bytes
    if isinstance(obj, (bytes, bytearray)):
        return f"[BYTES len={len(obj)}]"

    # 6. Dictionaries
    if isinstance(obj, dict):
        sanitized_dict: dict[str, Any] = {}
        used_keys: set[str] = set()

        for raw_k, v in obj.items():
            # A. Safe key string representation
            if isinstance(raw_k, str):
                # Redact secrets directly inside the key string itself (AUD-24)
                sanitized_k = sanitize_string_patterns(raw_k)
            elif isinstance(raw_k, (int, float, bool)) or raw_k is None:
                sanitized_k = str(raw_k)
            else:
                # Do NOT execute untrusted arbitrary __str__ or __repr__
                sanitized_k = f"[KEY:{type(raw_k).__name__}]"

            # B. Collision disambiguation (AUD-25, AUD-33)
            final_k = sanitized_k
            collision_idx = 2
            while final_k in used_keys:
                final_k = f"{sanitized_k}#collision_{collision_idx}"
                collision_idx += 1
            used_keys.add(final_k)

            # C. Sensitive value redaction based on key name matching
            k_norm = normalize_key_for_matching(raw_k if isinstance(raw_k, str) else sanitized_k)
            if is_sensitive_key(k_norm):
                # If value is a nested container (dict, list, etc.), recurse into it so nested structure is preserved
                if isinstance(v, (dict, list, tuple, set, frozenset)):
                    sanitized_dict[final_k] = _sanitize_inner(
                        v, new_active_path, current_depth + 1, max_depth
                    )
                else:
                    sanitized_dict[final_k] = "[REDACTED]"
            else:
                sanitized_dict[final_k] = _sanitize_inner(
                    v, new_active_path, current_depth + 1, max_depth
                )

        return sanitized_dict

    # 7. Lists & Tuples
    if isinstance(obj, (list, tuple)):
        return [
            _sanitize_inner(item, new_active_path, current_depth + 1, max_depth)
            for item in obj
        ]

    # 8. Sets & Frozensets (Canonical JSON Sorting, AUD-20, AUD-34, AUD-35)
    if isinstance(obj, (set, frozenset)):
        sanitized_items = [
            _sanitize_inner(item, new_active_path, current_depth + 1, max_depth)
            for item in obj
        ]
        return sorted(sanitized_items, key=canonical_json_bytes)

    # 9. Whitelisted Pydantic Models & Dataclasses
    # Check if object is a Pydantic model safely
    if hasattr(obj, "model_dump") and callable(getattr(obj, "model_dump")):
        try:
            dumped = obj.model_dump(mode="json")
            return _sanitize_inner(dumped, new_active_path, current_depth + 1, max_depth)
        except Exception:
            return f"[{type(obj).__name__}]"

    # Check for dataclass safely
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        try:
            dumped = dataclasses.asdict(obj)
            return _sanitize_inner(dumped, new_active_path, current_depth + 1, max_depth)
        except Exception:
            return f"[{type(obj).__name__}]"

    # 10. Unsupported / Untrusted Custom Objects (AUD-29, AUD-34)
    # Never invoke user-defined __str__, __repr__, or attribute access
    return f"[UNTRUSTED_OBJECT:{type(obj).__name__}]"


def sanitize_payload(obj: Any) -> Any:
    """
    Central redaction gateway.
    Sanitizes any dictionary, list, URL, string, or collection recursively.
    Guarantees non-mutation of input and fail-safe fallback without data leakage.
    """
    try:
        return _sanitize_inner(
            obj,
            active_path=frozenset(),
            current_depth=0,
            max_depth=MAX_RECURSION_DEPTH,
        )
    except Exception as exc:
        # Fail-safe static dictionary. Raw data NEVER leaks.
        return {
            "_audit_status": "REDACTION_ERROR",
            "_error_class": type(exc).__name__,
        }
