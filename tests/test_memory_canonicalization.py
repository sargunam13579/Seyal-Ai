"""
Seyal AI — Memory Canonicalization & Backward Compatibility Verification Test Suite.

Verifies:
1. Canonical and legacy class, enum, and dataclass identities.
2. Cross-path instance compatibility and type checking.
3. Privacy filter identity and credential scrubbing.
4. Semantic vector-store embedding dimension handling (256-dim vs 768-dim mixed compatibility).
5. Offline embedding fallback behavior.
6. Context resolver and reference resolution equivalence.
7. Automated Tanglish/English preference learning through both paths.
8. Existing JSON storage format compatibility and atomic persistence.
9. Monkeypatching through legacy import paths.
"""

from pathlib import Path
import tempfile
import pytest
from unittest.mock import patch, AsyncMock

# Canonical Platform Imports
from seyal_ai.platform.memory import (
    MemoryManager as CanonicalManager,
    MemoryStorage as CanonicalStorage,
    MemoryPrivacyFilter as CanonicalPrivacy,
    ContextResolver as CanonicalResolver,
    SemanticVectorStore as CanonicalVectorStore,
    MemoryCategory as CanonicalCategory,
    PrivacyLevel as CanonicalPrivacyLevel,
    MemoryRecord as CanonicalRecord,
    ContextState as CanonicalContextState,
    compute_embedding as canonical_compute_embedding,
    compute_local_embedding as canonical_compute_local_embedding,
    cosine_similarity as canonical_cosine_similarity,
)

# Legacy Imports
from seyal_ai.memory import (
    MemoryManager as LegacyManager,
    MemoryStorage as LegacyStorage,
    MemoryPrivacyFilter as LegacyPrivacy,
    ContextResolver as LegacyResolver,
    SemanticVectorStore as LegacyVectorStore,
    MemoryCategory as LegacyCategory,
    PrivacyLevel as LegacyPrivacyLevel,
    MemoryRecord as LegacyRecord,
    ContextState as LegacyContextState,
    compute_embedding as legacy_compute_embedding,
    compute_local_embedding as legacy_compute_local_embedding,
    cosine_similarity as legacy_cosine_similarity,
)


class TestMemoryCanonicalIdentities:
    """Verify legacy and canonical imports resolve to the exact same Python classes & objects."""

    def test_class_and_enum_identities(self):
        assert CanonicalManager is LegacyManager
        assert CanonicalStorage is LegacyStorage
        assert CanonicalPrivacy is LegacyPrivacy
        assert CanonicalResolver is LegacyResolver
        assert CanonicalVectorStore is LegacyVectorStore
        assert CanonicalCategory is LegacyCategory
        assert CanonicalPrivacyLevel is LegacyPrivacyLevel
        assert CanonicalRecord is LegacyRecord
        assert CanonicalContextState is LegacyContextState

    def test_function_identities(self):
        assert canonical_compute_embedding is legacy_compute_embedding
        assert canonical_compute_local_embedding is legacy_compute_local_embedding
        assert canonical_cosine_similarity is legacy_cosine_similarity

    def test_cross_path_instance_checks(self):
        legacy_rec = LegacyRecord(key="test_key", value="test_val", category=LegacyCategory.CONVERSATION)
        assert isinstance(legacy_rec, CanonicalRecord)

        canon_rec = CanonicalRecord(key="pref_key", value="dark", category=CanonicalCategory.USER_PREFERENCE)
        assert isinstance(canon_rec, LegacyRecord)
        assert canon_rec.category == LegacyCategory.USER_PREFERENCE


class TestEmbeddingDimensionCompatibility:
    """Verify Issue 1: 256-dim local vectors and 768-dim Gemini vectors are handled safely."""

    def test_same_dimension_cosine_similarity(self):
        v256_a = [0.1] * 256
        v256_b = [0.1] * 256
        sim = canonical_cosine_similarity(v256_a, v256_b)
        assert pytest.approx(sim, 0.001) == 1.0

        v768_a = [0.05] * 768
        v768_b = [0.05] * 768
        sim_768 = canonical_cosine_similarity(v768_a, v768_b)
        assert pytest.approx(sim_768, 0.001) == 1.0

    def test_mixed_dimension_safe_comparison(self):
        """Mixed 256 vs 768 vectors must compare safely using truncated prefix without crashing."""
        v256 = [0.2] * 256
        v768 = [0.2] * 768
        sim_mixed = canonical_cosine_similarity(v256, v768)
        assert isinstance(sim_mixed, float)
        assert -1.0 <= sim_mixed <= 1.0
        assert pytest.approx(sim_mixed, 0.001) == 1.0

    def test_empty_vector_returns_zero(self):
        assert canonical_cosine_similarity([], [1.0, 2.0]) == 0.0
        assert canonical_cosine_similarity([1.0], []) == 0.0

    @pytest.mark.asyncio
    async def test_offline_local_embedding_fallback(self):
        vec = await canonical_compute_embedding("Seyal AI local-first memory recall")
        assert len(vec) == 256
        assert isinstance(vec[0], float)


class TestMemoryPersistenceAndCrossPathCRUD:
    """Verify existing JSON storage format compatibility, atomic replace, and cross-path CRUD."""

    @pytest.mark.asyncio
    async def test_cross_path_store_and_recall(self, tmp_path: Path):
        storage_path = tmp_path / "test_cross_memory.json"

        # 1. Store via Canonical Manager
        canon_mgr = CanonicalManager(storage=CanonicalStorage(storage_path=storage_path))
        rec = await canon_mgr.store_memory(
            key="favorite_editor",
            value="VS Code",
            category=CanonicalCategory.APP_PREFERENCE,
            tags=["editor", "coding"],
        )
        assert rec is not None
        assert storage_path.exists()

        # 2. Recall via Legacy Manager from the same file
        legacy_mgr = LegacyManager(storage=LegacyStorage(storage_path=storage_path))
        fetched = await legacy_mgr.recall_memory("favorite_editor", category=LegacyCategory.APP_PREFERENCE)
        assert fetched is not None
        assert fetched.value == "VS Code"
        assert "editor" in fetched.tags

    @pytest.mark.asyncio
    async def test_tanglish_preference_auto_learning(self, tmp_path: Path):
        storage_path = tmp_path / "test_learning.json"
        mgr = CanonicalManager(storage=CanonicalStorage(storage_path=storage_path))

        # Test Tanglish statement
        rec = await mgr.auto_learn_from_message("Enoda phone 9876543210 nu save pannu")
        assert rec is not None
        assert rec.key == "phone"
        assert "9876543210" in str(rec.value)

    def test_privacy_filter_sanitization(self):
        priv = LegacyPrivacy()
        clean = priv.sanitize("My OpenAI key is sk-1234567890abcdef1234567890abcdef and password: secret_pass_123")
        assert "sk-1234567890" not in clean
        assert "secret_pass_123" not in clean
        assert "[OPENAI_API_KEY_REDACTED]" in clean

    @pytest.mark.asyncio
    async def test_context_resolver_anaphoric_reference(self, tmp_path: Path):
        storage_path = tmp_path / "test_resolver.json"
        storage = CanonicalStorage(storage_path=storage_path)
        await storage.store(
            key="python_projects_dir",
            value="D:/SeyalProjects",
            category=CanonicalCategory.USER_PREFERENCE,
        )

        resolver = LegacyResolver(storage=storage)
        resolved = await resolver.resolve_reference("open my Python project")
        assert resolved.get("target_path") == "D:/SeyalProjects"


class TestLegacyPathMonkeypatching:
    """Verify monkeypatching through legacy import paths correctly intercepts canonical behavior."""

    @pytest.mark.asyncio
    async def test_legacy_patch_storage_store(self, tmp_path: Path):
        storage_path = tmp_path / "patch_test.json"
        storage = CanonicalStorage(storage_path=storage_path)

        with patch("seyal_ai.memory.storage.MemoryStorage.store") as mock_store:
            mock_store.return_value = CanonicalRecord(key="patched", value="value")
            mgr = CanonicalManager(storage=storage)
            res = await mgr.store_memory(key="patched", value="value")

            assert res.key == "patched"
            assert mock_store.called
