"""
Seyal AI Semantic Vector Store — Backward Compatibility Forwarding Module.

Forwarded to canonical implementation at:
    seyal_ai.platform.memory.vector_store
"""

from __future__ import annotations

import sys
import seyal_ai.platform.memory.vector_store as _canonical_vector_store

sys.modules.setdefault("seyal_ai.memory.vector_store", _canonical_vector_store)

LOCAL_VECTOR_DIM = _canonical_vector_store.LOCAL_VECTOR_DIM
_tokenize = _canonical_vector_store._tokenize
compute_local_embedding = _canonical_vector_store.compute_local_embedding
compute_embedding = _canonical_vector_store.compute_embedding
cosine_similarity = _canonical_vector_store.cosine_similarity
SemanticVectorStore = _canonical_vector_store.SemanticVectorStore

__all__ = [
    "LOCAL_VECTOR_DIM",
    "compute_local_embedding",
    "compute_embedding",
    "cosine_similarity",
    "SemanticVectorStore",
]
