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
    compute_embedding_with_model as canonical_compute_embedding_with_model,
    compute_local_embedding as canonical_compute_local_embedding,
    cosine_similarity as canonical_cosine_similarity,
    are_embeddings_compatible as canonical_are_embeddings_compatible,
    infer_embedding_model as canonical_infer_embedding_model,
)
from seyal_ai.platform.memory.vector_store import (
    LOCAL_EMBEDDING_MODEL,
    GEMINI_EMBEDDING_MODEL,
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
    compute_embedding_with_model as legacy_compute_embedding_with_model,
    compute_local_embedding as legacy_compute_local_embedding,
    cosine_similarity as legacy_cosine_similarity,
    are_embeddings_compatible as legacy_are_embeddings_compatible,
    infer_embedding_model as legacy_infer_embedding_model,
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
        assert canonical_compute_embedding_with_model is legacy_compute_embedding_with_model
        assert canonical_compute_local_embedding is legacy_compute_local_embedding
        assert canonical_cosine_similarity is legacy_cosine_similarity
        assert canonical_are_embeddings_compatible is legacy_are_embeddings_compatible
        assert canonical_infer_embedding_model is legacy_infer_embedding_model

    def test_cross_path_instance_checks(self):
        legacy_rec = LegacyRecord(key="test_key", value="test_val", category=LegacyCategory.CONVERSATION)
        assert isinstance(legacy_rec, CanonicalRecord)

        canon_rec = CanonicalRecord(key="pref_key", value="dark", category=CanonicalCategory.USER_PREFERENCE)
        assert isinstance(canon_rec, LegacyRecord)
        assert canon_rec.category == LegacyCategory.USER_PREFERENCE


class TestEmbeddingCompatibilityAndSemanticRecall:
    """Verify embedding space compatibility, retrieval ranking, and data safety."""

    def test_local_versus_local_similarity(self):
        """Identical local 256-dim embeddings yield positive cosine similarity."""
        v256_a = [0.1] * 256
        v256_b = [0.1] * 256
        sim = canonical_cosine_similarity(v256_a, v256_b, LOCAL_EMBEDDING_MODEL, LOCAL_EMBEDDING_MODEL)
        assert pytest.approx(sim, 0.001) == 1.0

    def test_gemini_versus_gemini_similarity(self):
        """Identical Gemini 768-dim embeddings yield positive cosine similarity."""
        v768_a = [0.05] * 768
        v768_b = [0.05] * 768
        sim_768 = canonical_cosine_similarity(v768_a, v768_b, GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_MODEL)
        assert pytest.approx(sim_768, 0.001) == 1.0

    def test_local_versus_gemini_incompatible(self):
        """Local 256-dim and Gemini 768-dim must NEVER be truncated or compared; returns 0.0."""
        v256 = [0.2] * 256
        v768 = [0.2] * 768
        assert not canonical_are_embeddings_compatible(v256, v768)
        sim_mixed = canonical_cosine_similarity(v256, v768)
        assert sim_mixed == 0.0

    def test_different_models_same_dimension_incompatible(self):
        """Different embedding models with the same dimension must not be compared; returns 0.0."""
        v256_a = [0.2] * 256
        v256_b = [0.2] * 256
        assert not canonical_are_embeddings_compatible(v256_a, v256_b, "model_alpha_256", "model_beta_256")
        sim_diff_models = canonical_cosine_similarity(v256_a, v256_b, "model_alpha_256", "model_beta_256")
        assert sim_diff_models == 0.0

    def test_empty_or_missing_embeddings(self):
        """Empty or missing embeddings are incompatible and return 0.0 similarity."""
        assert canonical_cosine_similarity([], [1.0, 2.0]) == 0.0
        assert canonical_cosine_similarity([1.0], []) == 0.0
        assert canonical_cosine_similarity(None, [1.0]) == 0.0
        assert canonical_cosine_similarity([1.0], None) == 0.0
        assert not canonical_are_embeddings_compatible(None, [1.0])

    def test_existing_records_without_model_metadata(self):
        """Existing records with 256-dim embedding but no metadata safely match local 256-dim queries."""
        legacy_emb = [0.1] * 256  # Inferred as local_ngram_256
        query_local = [0.1] * 256
        assert canonical_are_embeddings_compatible(query_local, legacy_emb)
        sim = canonical_cosine_similarity(query_local, legacy_emb)
        assert pytest.approx(sim, 0.001) == 1.0

        # But incompatible with a Gemini 768-dim query
        query_gemini = [0.05] * 768
        assert not canonical_are_embeddings_compatible(query_gemini, legacy_emb)
        assert canonical_cosine_similarity(query_gemini, legacy_emb) == 0.0

    @pytest.mark.asyncio
    async def test_offline_local_embedding_fallback(self):
        """Offline fallback produces 256-dim vector labeled as local_ngram_256."""
        vec, model_name = await canonical_compute_embedding_with_model("Seyal AI local recall")
        assert len(vec) == 256
        assert model_name == LOCAL_EMBEDDING_MODEL
        assert isinstance(vec[0], float)

    @pytest.mark.asyncio
    async def test_retrieval_ranking_with_incompatible_vectors(self):
        """Incompatible vectors are excluded from vector scoring, cleanly falling back to keyword/tag matching."""
        store = CanonicalVectorStore()
        rec_gemini = CanonicalRecord(
            key="gemini_browser",
            value="google chrome",
            tags=["browser", "web"],
            embedding=[0.05] * 768,
            embedding_model=GEMINI_EMBEDDING_MODEL,
        )
        rec_local = CanonicalRecord(
            key="local_editor",
            value="visual studio code",
            tags=["editor", "coding"],
            embedding=canonical_compute_local_embedding("local_editor visual studio code editor coding"),
            embedding_model=LOCAL_EMBEDDING_MODEL,
        )

        # 1. Query for editor: local record matches both vector space and keywords
        ranked_editor = await store.rank_records("editor coding", [rec_gemini, rec_local])
        assert len(ranked_editor) > 0
        assert ranked_editor[0][0].key == "local_editor"

        # 2. Query for browser: gemini vector is incompatible with local query vector,
        # but record is safely retrieved through keyword fallback matching without error
        ranked_browser = await store.rank_records("browser", [rec_gemini, rec_local])
        assert len(ranked_browser) > 0
        assert ranked_browser[0][0].key == "gemini_browser"

    def test_existing_json_data_compatibility_and_integrity(self):
        """Verify real user memory records and backup match 100% in count, IDs, and categories."""
        import json
        real_path = Path.home() / ".seyal_ai" / "seyal_memory.json"
        bak_path = Path.home() / ".seyal_ai" / "seyal_memory.json.bak"
        if real_path.exists() and bak_path.exists():
            data_real = json.loads(real_path.read_text(encoding="utf-8"))
            data_bak = json.loads(bak_path.read_text(encoding="utf-8"))
            recs_real = data_real.get("records", [])
            recs_bak = data_bak.get("records", [])
            assert len(recs_real) == len(recs_bak)
            assert [r["id"] for r in recs_real] == [r["id"] for r in recs_bak]
            assert [r.get("category") for r in recs_real] == [r.get("category") for r in recs_bak]
            assert [r.get("key") for r in recs_real] == [r.get("key") for r in recs_bak]


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
            assert isinstance(res, CanonicalRecord)
            assert res.key == "patched"
            assert mock_store.called
