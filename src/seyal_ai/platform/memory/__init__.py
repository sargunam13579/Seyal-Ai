"""
Seyal AI — Canonical Platform Memory Layer.

Provides unified 6-category memory partitioning, privacy filtering, contextual reference resolution,
semantic vector indexing, and local-first persistence.
"""

from __future__ import annotations

from seyal_ai.platform.memory.context_resolver import ContextResolver
from seyal_ai.platform.memory.manager import MemoryManager
from seyal_ai.platform.memory.privacy import MemoryPrivacyFilter
from seyal_ai.platform.memory.storage import MemoryStorage
from seyal_ai.platform.memory.types import (
    ContextState,
    MemoryCategory,
    MemoryRecord,
    PrivacyLevel,
)
from seyal_ai.platform.memory.vector_store import (
    SemanticVectorStore,
    are_embeddings_compatible,
    compute_embedding,
    compute_embedding_with_model,
    compute_local_embedding,
    cosine_similarity,
    infer_embedding_model,
)

__all__ = [
    "MemoryCategory",
    "PrivacyLevel",
    "MemoryRecord",
    "ContextState",
    "MemoryPrivacyFilter",
    "MemoryStorage",
    "SemanticVectorStore",
    "are_embeddings_compatible",
    "infer_embedding_model",
    "compute_embedding",
    "compute_embedding_with_model",
    "compute_local_embedding",
    "cosine_similarity",
    "ContextResolver",
    "MemoryManager",
]
