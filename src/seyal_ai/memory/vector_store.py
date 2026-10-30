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
LOCAL_EMBEDDING_MODEL = _canonical_vector_store.LOCAL_EMBEDDING_MODEL
GEMINI_VECTOR_DIM = _canonical_vector_store.GEMINI_VECTOR_DIM
GEMINI_EMBEDDING_MODEL = _canonical_vector_store.GEMINI_EMBEDDING_MODEL
HISTORICAL_DIMENSION_TO_MODEL = _canonical_vector_store.HISTORICAL_DIMENSION_TO_MODEL
infer_embedding_model = _canonical_vector_store.infer_embedding_model
are_embeddings_compatible = _canonical_vector_store.are_embeddings_compatible
_tokenize = _canonical_vector_store._tokenize
compute_local_embedding = _canonical_vector_store.compute_local_embedding
compute_embedding_with_model = _canonical_vector_store.compute_embedding_with_model
compute_embedding = _canonical_vector_store.compute_embedding
cosine_similarity = _canonical_vector_store.cosine_similarity
SemanticVectorStore = _canonical_vector_store.SemanticVectorStore

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
