"""
Seyal AI Semantic Vector Store & Embeddings Engine.

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
    from seyal_ai.memory.types import MemoryRecord

log = get_logger("memory.vector_store")

LOCAL_VECTOR_DIM = 256


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

    norm = np.linalg.norm(vec)
    if norm > 1e-6:
        vec = vec / norm
    return vec.tolist()


async def compute_embedding(text: str) -> list[float]:
    """
    Compute semantic embedding for text.
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
            if hasattr(result, "embedding") and hasattr(result.embedding, "values"):
                vals = list(result.embedding.values)
                arr = np.array(vals, dtype=np.float32)
                norm = np.linalg.norm(arr)
                if norm > 1e-6:
                    arr = arr / norm
                return arr.tolist()
        except Exception as e:
            log.debug("Gemini embedding fallback to local vectorizer: %s", e)

    return compute_local_embedding(text)


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not vec_a or not vec_b:
        return 0.0
    if len(vec_a) != len(vec_b):
        # Different dimensions (e.g. Gemini 768 vs Local 256)
        # Pad or truncate to the shorter length for comparison
        min_dim = min(len(vec_a), len(vec_b))
        a = np.array(vec_a[:min_dim], dtype=np.float32)
        b = np.array(vec_b[:min_dim], dtype=np.float32)
    else:
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)

    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-6 or norm_b < 1e-6:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


class SemanticVectorStore:
    """Manages semantic vector index and similarity rankings for memory records."""

    def __init__(self) -> None:
        self._cache: dict[str, list[float]] = {}  # record_id -> vector

    async def get_or_create_embedding(self, record_id: str, text: str, existing: list[float] | None = None) -> list[float]:
        """Get cached embedding or compute and cache a new one."""
        if existing and len(existing) > 0:
            self._cache[record_id] = existing
            return existing
        if record_id in self._cache:
            return self._cache[record_id]

        emb = await compute_embedding(text)
        self._cache[record_id] = emb
        return emb

    def evict(self, record_id: str) -> None:
        """Evict record embedding from memory cache."""
        self._cache.pop(record_id, None)

    def clear(self) -> None:
        """Clear the in-memory vector cache."""
        self._cache.clear()

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

        query_vec = await compute_embedding(query)
        q_lower = query.lower().strip()
        q_words = set(re.findall(r"\w+", q_lower))

        scored: list[tuple[MemoryRecord, float]] = []

        for rec in records:
            # Build representative text for this record
            rep_text = f"{rec.key} {rec.value} {' '.join(rec.tags)}"
            rec_vec = await self.get_or_create_embedding(
                rec.id, rep_text, getattr(rec, "embedding", None)
            )

            # 1. Cosine similarity
            sem_sim = cosine_similarity(query_vec, rec_vec)

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
