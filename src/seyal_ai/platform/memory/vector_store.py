"""
Seyal AI Semantic Vector Store & Embeddings Engine (Canonical Platform Implementation).

Provides high-performance, local-first vector indexing and semantic recall:
- Online Embeddings: Google Gemini 'text-embedding-004' (768-dim) when API key is available.
- Local Embeddings: High-speed, deterministic n-gram semantic vectorizer (256-dim)
  with L2-normalization for instant, offline local-first recall.
- Hybrid Search: Blends cosine similarity with exact keyword & tag matching.
"""

from __future__ import annotations

import hashlib
import math
import re
from typing import TYPE_CHECKING, Any

import numpy as np

from seyal_ai.core.config import get_settings
from seyal_ai.utils.logging import get_logger

if TYPE_CHECKING:
    from seyal_ai.platform.memory.types import MemoryRecord

log = get_logger("memory.vector_store")

LOCAL_VECTOR_DIM = 256
LOCAL_EMBEDDING_MODEL = "local_ngram_256"
GEMINI_VECTOR_DIM = 768
GEMINI_EMBEDDING_MODEL = "gemini_text_embedding_004"

# Registry of historically documented and verified model signatures in Seyal AI:
# Only these specific dimensions map to documented historical generators.
HISTORICAL_DIMENSION_TO_MODEL: dict[int, str] = {
    LOCAL_VECTOR_DIM: LOCAL_EMBEDDING_MODEL,
    GEMINI_VECTOR_DIM: GEMINI_EMBEDDING_MODEL,
}


def _tokenize(text: str) -> list[str]:
    """Extract clean words and character n-grams from text."""
    clean = re.sub(r"[^\w\s]", " ", text.lower())
    words = [w for w in clean.split() if w]
    tokens = list(words)
    # Add character n-grams (3-grams and 4-grams) to capture roots and affixes
    for w in words:
        if len(w) >= 3:
            for n in (3, 4):
                for i in range(len(w) - n + 1):
                    tokens.append(w[i : i + n])
    return tokens


def compute_local_embedding(text: str, dim: int = LOCAL_VECTOR_DIM) -> list[float]:
    """
    Compute a fast, deterministic, L2-normalized semantic vector for text.
    Uses subword n-gram hashing with frequency weighting.
    """
    if not text.strip():
        return [0.0] * dim

    vec = np.zeros(dim, dtype=np.float32)
    tokens = _tokenize(text)
    if not tokens:
        return [0.0] * dim

    for token in tokens:
        # Hash token to dimension index and sign
        h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
        # Longer tokens and full words receive slightly more weight
        weight = 1.0 + math.log1p(len(token))
        vec[idx] += sign * weight

    norm = float(np.linalg.norm(vec))
    if norm > 1e-6:
        vec = vec / norm
    return vec.tolist()


def infer_embedding_model(embedding: list[float] | None, model_name: str | None = None) -> str | None:
    """
    Resolve embedding model identity.
    
    Rules:
    1. If explicit model_name is provided:
       - If it is empty, whitespace, "unknown" (case-insensitive), or begins with
         the reserved synthetic prefix "unknown_" (case-insensitive), it is rejected
         and returns None (unidentified/incompatible).
       - Otherwise, it is a valid explicit model identity and takes precedence.
    2. If explicit model_name is NOT provided (None):
       - Dimension-based inference is restricted strictly to verified, historically
         documented generator dimensions in Seyal AI:
         - 256 -> local_ngram_256 (local subword n-gram vectorizer)
         - 768 -> gemini_text_embedding_004 (Google Gemini embedder)
       - Any other dimensions or unverified vectors return None (unidentified/unknown).
         Unknown models are NEVER assigned a synthetic matching identifier like 'unknown_{dim}'.
    """
    if model_name is not None:
        clean = model_name.strip()
        lower = clean.lower()
        if not clean or lower == "unknown" or lower.startswith("unknown_"):
            return None
        return clean

    if not embedding:
        return None
    dim = len(embedding)
    return HISTORICAL_DIMENSION_TO_MODEL.get(dim)


def are_embeddings_compatible(
    vec_a: list[float] | None,
    vec_b: list[float] | None,
    model_a: str | None = None,
    model_b: str | None = None,
) -> bool:
    """
    Determine whether two embeddings belong to the exact same semantic vector space.
    
    Strict Compatibility Rules:
    1. Neither vector may be empty or None.
    2. Dimensions must match exactly (len(vec_a) == len(vec_b)).
    3. Both vectors must have a verified, non-empty, non-reserved model identity.
    4. If either vector's model identity is unknown/unverified (None, 'unknown',
       or starting with 'unknown_'), they are treated as INCOMPATIBLE by default.
       Matching dimensions alone do NOT establish compatibility.
    5. The model identities must match exactly (eff_model_a == eff_model_b).
    """
    if not vec_a or not vec_b:
        return False
    if len(vec_a) != len(vec_b):
        return False

    eff_model_a = infer_embedding_model(vec_a, model_a)
    eff_model_b = infer_embedding_model(vec_b, model_b)

    # Unknown or unverified models must be treated as incompatible by default.
    # Two unknown models (e.g. both 512-dim with model='unknown_512') can NEVER be assumed compatible.
    if not eff_model_a or not eff_model_b:
        return False

    # Explicit model identities must be identical
    if eff_model_a != eff_model_b:
        return False

    return True


async def compute_embedding_with_model(text: str) -> tuple[list[float], str]:
    """
    Compute semantic embedding for text along with the model identifier.
    Tries Google Gemini text-embedding-004 first if API key is configured,
    falling back seamlessly to local semantic vectorizer.
    """
    settings = get_settings()
    api_key = getattr(settings.llm, "gemini_api_key", "")
    if api_key:
        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            result = client.models.embed_content(
                model="text-embedding-004",
                contents=text,
            )
            emb_obj = getattr(result, "embedding", None)
            if emb_obj is not None and hasattr(emb_obj, "values"):
                vals = list(getattr(emb_obj, "values", []))
                arr = np.array(vals, dtype=np.float32)
                norm = float(np.linalg.norm(arr))
                if norm > 1e-6:
                    arr = arr / norm
                return arr.tolist(), GEMINI_EMBEDDING_MODEL
        except Exception as e:
            log.debug("Gemini embedding fallback to local vectorizer: %s", e)

    return compute_local_embedding(text), LOCAL_EMBEDDING_MODEL


async def compute_embedding(text: str) -> list[float]:
    """
    Compute semantic embedding for text (backward-compatible).
    Returns the vector as a list of floats.
    """
    vec, _ = await compute_embedding_with_model(text)
    return vec


def cosine_similarity(
    vec_a: list[float] | None,
    vec_b: list[float] | None,
    model_a: str | None = None,
    model_b: str | None = None,
) -> float:
    """
    Compute cosine similarity between two float vectors.
    
    Returns 0.0 if:
    - Either vector is empty or None.
    - Dimensions do not match (never truncates or pads vectors).
    - Models are incompatible (different embedding spaces, unknown models, or reserved IDs).
    - Any element in either vector is non-finite (NaN, +inf, -inf).
    - Either vector has near-zero magnitude.
    """
    if not are_embeddings_compatible(vec_a, vec_b, model_a, model_b):
        return 0.0

    assert vec_a is not None and vec_b is not None

    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)

    # Validate finite values: reject NaN, +inf, -inf
    if not np.all(np.isfinite(a)) or not np.all(np.isfinite(b)):
        return 0.0

    norm_a = float(np.linalg.norm(a))
    norm_b = float(np.linalg.norm(b))
    if norm_a < 1e-6 or norm_b < 1e-6:
        return 0.0

    sim = float(np.dot(a, b) / (norm_a * norm_b))
    if not math.isfinite(sim):
        return 0.0
    return max(-1.0, min(1.0, sim))


class SemanticVectorStore:
    """Manages semantic vector index and similarity rankings for memory records."""

    def __init__(self) -> None:
        self._cache: dict[str, list[float]] = {}  # record_id -> vector
        self._model_cache: dict[str, str] = {}  # record_id -> model_name

    async def get_or_create_embedding(
        self,
        record_id: str,
        text: str,
        existing: list[float] | None = None,
        model_name: str | None = None,
    ) -> list[float]:
        """Get cached embedding or compute and cache a new one."""
        vec, _ = await self.get_or_create_embedding_with_model(
            record_id=record_id,
            text=text,
            existing=existing,
            model_name=model_name,
        )
        return vec

    async def get_or_create_embedding_with_model(
        self,
        record_id: str,
        text: str,
        existing: list[float] | None = None,
        model_name: str | None = None,
    ) -> tuple[list[float], str]:
        """Get cached embedding with model identifier or compute and cache a new one."""
        if existing and len(existing) > 0:
            self._cache[record_id] = existing
            eff_model = infer_embedding_model(existing, model_name) or ""
            if eff_model:
                self._model_cache[record_id] = eff_model
            return existing, eff_model

        if record_id in self._cache:
            return self._cache[record_id], self._model_cache.get(record_id, "")

        emb, eff_model = await compute_embedding_with_model(text)
        self._cache[record_id] = emb
        self._model_cache[record_id] = eff_model
        return emb, eff_model

    def evict(self, record_id: str) -> None:
        """Evict record embedding from memory cache."""
        self._cache.pop(record_id, None)
        self._model_cache.pop(record_id, None)

    def clear(self) -> None:
        """Clear the in-memory vector cache."""
        self._cache.clear()
        self._model_cache.clear()

    async def rank_records(
        self,
        query: str,
        records: list[MemoryRecord],
        limit: int = 10,
        min_score: float = 0.05,
    ) -> list[tuple[MemoryRecord, float]]:
        """
        Rank candidate memory records by semantic and keyword relevance to the query.
        Returns list of (MemoryRecord, relevance_score) sorted descending.
        """
        if not records or not query.strip():
            return [(r, 1.0) for r in records[:limit]]

        query_vec, query_model = await compute_embedding_with_model(query)
        q_lower = query.lower().strip()
        q_words = set(re.findall(r"\w+", q_lower))

        scored: list[tuple[MemoryRecord, float]] = []

        for rec in records:
            # Build representative text for this record
            rep_text = f"{rec.key} {rec.value} {' '.join(rec.tags)}"
            rec_existing_emb = getattr(rec, "embedding", None)
            rec_existing_model = getattr(rec, "embedding_model", None)

            rec_vec, rec_model = await self.get_or_create_embedding_with_model(
                rec.id, rep_text, rec_existing_emb, rec_existing_model
            )

            # 1. Cosine similarity only between compatible embedding spaces
            if are_embeddings_compatible(query_vec, rec_vec, query_model, rec_model):
                sem_sim = cosine_similarity(query_vec, rec_vec, query_model, rec_model)
            else:
                # Incompatible spaces: never fabricate cosine similarity.
                # Exclude from vector comparison; rely on safe keyword fallback.
                sem_sim = 0.0

            # 2. Exact keyword / substring boost
            key_lower = rec.key.lower()
            val_lower = str(rec.value).lower()
            tag_set = {t.lower() for t in rec.tags}

            kw_score = 0.0
            if q_lower in key_lower:
                kw_score += 0.5
            elif any(w in key_lower for w in q_words if len(w) > 2):
                kw_score += 0.3

            if q_lower in val_lower:
                kw_score += 0.3
            elif any(w in val_lower for w in q_words if len(w) > 2):
                kw_score += 0.2

            if any(w in tag_set for w in q_words):
                kw_score += 0.4

            # Hybrid score (weighted combination)
            total_score = (0.65 * max(0.0, sem_sim)) + (0.35 * min(1.0, kw_score))

            if total_score >= min_score or kw_score > 0.1:
                scored.append((rec, float(total_score)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:limit]


__all__ = [
    "LOCAL_VECTOR_DIM",
    "LOCAL_EMBEDDING_MODEL",
    "GEMINI_VECTOR_DIM",
    "GEMINI_EMBEDDING_MODEL",
    "HISTORICAL_DIMENSION_TO_MODEL",
    "infer_embedding_model",
    "are_embeddings_compatible",
    "compute_local_embedding",
    "compute_embedding_with_model",
    "compute_embedding",
    "cosine_similarity",
    "SemanticVectorStore",
]
