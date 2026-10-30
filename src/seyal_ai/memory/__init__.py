"""
Seyal AI Memory — Backward Compatibility Forwarding Layer.

Routes legacy imports from `seyal_ai.memory.*` to the single canonical platform
implementation under `seyal_ai.platform.memory.*`.
"""

from __future__ import annotations

import sys
import seyal_ai.platform.memory as _canonical_memory
import seyal_ai.platform.memory.types as _canonical_types
import seyal_ai.platform.memory.privacy as _canonical_privacy
import seyal_ai.platform.memory.vector_store as _canonical_vector_store
import seyal_ai.platform.memory.storage as _canonical_storage
import seyal_ai.platform.memory.context_resolver as _canonical_context_resolver
import seyal_ai.platform.memory.manager as _canonical_manager

# Alias all legacy module paths to canonical platform instances
sys.modules.setdefault("seyal_ai.memory", _canonical_memory)
sys.modules.setdefault("seyal_ai.memory.types", _canonical_types)
sys.modules.setdefault("seyal_ai.memory.privacy", _canonical_privacy)
sys.modules.setdefault("seyal_ai.memory.vector_store", _canonical_vector_store)
sys.modules.setdefault("seyal_ai.memory.storage", _canonical_storage)
sys.modules.setdefault("seyal_ai.memory.context_resolver", _canonical_context_resolver)
sys.modules.setdefault("seyal_ai.memory.manager", _canonical_manager)

# Direct submodule references
types = _canonical_types
privacy = _canonical_privacy
vector_store = _canonical_vector_store
storage = _canonical_storage
context_resolver = _canonical_context_resolver
manager = _canonical_manager

# Direct re-exports
ContextResolver = _canonical_context_resolver.ContextResolver
MemoryManager = _canonical_manager.MemoryManager
MemoryPrivacyFilter = _canonical_privacy.MemoryPrivacyFilter
MemoryStorage = _canonical_storage.MemoryStorage
SemanticVectorStore = _canonical_vector_store.SemanticVectorStore
compute_embedding = _canonical_vector_store.compute_embedding
compute_local_embedding = _canonical_vector_store.compute_local_embedding
cosine_similarity = _canonical_vector_store.cosine_similarity

ContextState = _canonical_types.ContextState
MemoryCategory = _canonical_types.MemoryCategory
MemoryRecord = _canonical_types.MemoryRecord
PrivacyLevel = _canonical_types.PrivacyLevel

def __getattr__(name: str):
    return getattr(_canonical_memory, name)

__all__ = _canonical_memory.__all__
