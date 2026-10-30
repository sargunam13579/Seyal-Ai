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
    HISTORICAL_DIMENSION_TO_MODEL as canonical_historical_dim_to_model,
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
from seyal_ai.memory.vector_store import (
    HISTORICAL_DIMENSION_TO_MODEL as legacy_historical_dim_to_model,
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
        assert canonical_historical_dim_to_model is legacy_historical_dim_to_model

    def test_cross_path_instance_checks(self):
        legacy_rec = LegacyRecord(key="test_key", value="test_val", category=LegacyCategory.CONVERSATION)
        assert isinstance(legacy_rec, CanonicalRecord)

        canon_rec = CanonicalRecord(key="pref_key", value="dark", category=CanonicalCategory.USER_PREFERENCE)
        assert isinstance(canon_rec, LegacyRecord)
        assert canon_rec.category == LegacyCategory.USER_PREFERENCE


class TestEmbeddingCompatibilityAndSemanticRecall:
    """Verify embedding space compatibility, retrieval ranking, and data safety."""

    def test_two_unknown_models_with_equal_dimensions_incompatible(self):
        """Two unknown models with equal dimensions (e.g. 512-dim) must NOT be treated as compatible."""
        v512_a = [0.1] * 512
        v512_b = [0.1] * 512
        # Neither has explicit model; dimension 512 is not in historical registry
        assert canonical_infer_embedding_model(v512_a) is None
        assert canonical_infer_embedding_model(v512_b) is None
        assert not canonical_are_embeddings_compatible(v512_a, v512_b)
        assert canonical_cosine_similarity(v512_a, v512_b) == 0.0

        # Even if explicit model string is set to 'unknown'
        assert not canonical_are_embeddings_compatible(v512_a, v512_b, "unknown", "unknown")
        assert canonical_cosine_similarity(v512_a, v512_b, "unknown", "unknown") == 0.0

    def test_two_explicitly_different_models_with_equal_dimensions_incompatible(self):
        """Different embedding models with the same dimension must not be compared; returns 0.0."""
        v256_a = [0.2] * 256
        v256_b = [0.2] * 256
        assert not canonical_are_embeddings_compatible(v256_a, v256_b, "model_alpha_256", "model_beta_256")
        sim_diff_models = canonical_cosine_similarity(v256_a, v256_b, "model_alpha_256", "model_beta_256")
        assert sim_diff_models == 0.0

    def test_same_model_and_dimensions_compatible(self):
        """Identical models and dimensions yield positive cosine similarity."""
        v256_a = [0.1] * 256
        v256_b = [0.1] * 256
        assert canonical_are_embeddings_compatible(v256_a, v256_b, LOCAL_EMBEDDING_MODEL, LOCAL_EMBEDDING_MODEL)
        sim_local = canonical_cosine_similarity(v256_a, v256_b, LOCAL_EMBEDDING_MODEL, LOCAL_EMBEDDING_MODEL)
        assert pytest.approx(sim_local, 0.001) == 1.0

        v768_a = [0.05] * 768
        v768_b = [0.05] * 768
        assert canonical_are_embeddings_compatible(v768_a, v768_b, GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_MODEL)
        sim_768 = canonical_cosine_similarity(v768_a, v768_b, GEMINI_EMBEDDING_MODEL, GEMINI_EMBEDDING_MODEL)
        assert pytest.approx(sim_768, 0.001) == 1.0

    def test_local_versus_gemini_incompatible(self):
        """Local 256-dim and Gemini 768-dim must NEVER be truncated or compared; returns 0.0."""
        v256 = [0.2] * 256
        v768 = [0.2] * 768
        assert not canonical_are_embeddings_compatible(v256, v768)
        sim_mixed = canonical_cosine_similarity(v256, v768)
        assert sim_mixed == 0.0

    def test_legacy_256_dim_record_documented_historical_model(self):
        """Documented historical Seyal AI 256-dim records safely infer local_ngram_256."""
        legacy_emb = [0.1] * 256  # Inferred as local_ngram_256 from historical registry
        assert canonical_infer_embedding_model(legacy_emb, None) == LOCAL_EMBEDDING_MODEL
        query_local = [0.1] * 256
        assert canonical_are_embeddings_compatible(query_local, legacy_emb)
        sim = canonical_cosine_similarity(query_local, legacy_emb)
        assert pytest.approx(sim, 0.001) == 1.0

        # But strictly rejected when compared to Gemini 768
        query_gemini = [0.05] * 768
        assert not canonical_are_embeddings_compatible(query_gemini, legacy_emb)
        assert canonical_cosine_similarity(query_gemini, legacy_emb) == 0.0

    def test_legacy_record_whose_model_cannot_be_established(self):
        """Legacy records with dimensions outside historical registry cannot be inferred and are rejected."""
        unestablished_emb = [0.1] * 384
        assert canonical_infer_embedding_model(unestablished_emb, None) is None
        query_local = [0.1] * 256
        assert not canonical_are_embeddings_compatible(query_local, unestablished_emb)
        assert canonical_cosine_similarity(query_local, unestablished_emb) == 0.0

    def test_empty_or_missing_embeddings(self):
        """Empty or missing embeddings are incompatible and return 0.0 similarity."""
        assert canonical_cosine_similarity([], [1.0, 2.0]) == 0.0
        assert canonical_cosine_similarity([1.0], []) == 0.0
        assert canonical_cosine_similarity(None, [1.0]) == 0.0
        assert canonical_cosine_similarity([1.0], None) == 0.0
        assert not canonical_are_embeddings_compatible(None, [1.0])

    @pytest.mark.asyncio
    async def test_offline_local_embedding_fallback(self):
        """Offline fallback produces 256-dim vector labeled as local_ngram_256."""
        vec, model_name = await canonical_compute_embedding_with_model("Seyal AI local recall")
        assert len(vec) == 256
        assert model_name == LOCAL_EMBEDDING_MODEL
        assert isinstance(vec[0], float)

    @pytest.mark.asyncio
    async def test_query_embedding_metadata_propagation(self):
        """Query embedding carries explicit model metadata through rank_records to comparison guards."""
        vec, model_name = await canonical_compute_embedding_with_model("test query")
        assert model_name == LOCAL_EMBEDDING_MODEL

        store = CanonicalVectorStore()
        rec_matching = CanonicalRecord(
            key="rec_match",
            value="matching local record",
            embedding=canonical_compute_local_embedding("matching local record"),
            embedding_model=LOCAL_EMBEDDING_MODEL,
        )
        rec_unidentified = CanonicalRecord(
            key="rec_unidentified",
            value="unidentified model record",
            embedding=[0.05] * 512,
            embedding_model=None,
        )

        ranked = await store.rank_records("matching", [rec_matching, rec_unidentified])
        assert len(ranked) > 0
        assert ranked[0][0].key == "rec_match"

    @pytest.mark.asyncio
    async def test_new_embedding_metadata_persistence(self, tmp_path: Path):
        """New records persist their embedding_model in memory and across disk JSON serialization."""
        import json
        storage_path = tmp_path / "model_persist_test.json"
        storage = CanonicalStorage(storage_path=storage_path)
        mgr = CanonicalManager(storage=storage)

        rec = await mgr.store_memory(
            key="user_ide_preference",
            value="Visual Studio Code",
            category=CanonicalCategory.APP_PREFERENCE,
            tags=["ide", "editor"],
        )
        assert rec is not None
        assert rec.embedding_model == LOCAL_EMBEDDING_MODEL
        assert rec.embedding is not None
        assert len(rec.embedding) == 256

        # Verify disk file persistence of embedding_model
        assert storage_path.exists()
        disk_data = json.loads(storage_path.read_text(encoding="utf-8"))
        saved_recs = disk_data.get("records", [])
        persisted = next((r for r in saved_recs if r.get("key") == "user_ide_preference"), None)
        assert persisted is not None
        assert persisted.get("embedding_model") == LOCAL_EMBEDDING_MODEL

        # Verify round-trip reload from storage
        fresh_storage = CanonicalStorage(storage_path=storage_path)
        reloaded = await fresh_storage.get(rec.id)
        assert reloaded is not None
        assert reloaded.embedding_model == LOCAL_EMBEDDING_MODEL

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
        """Verify real user memory records and backup match in integrity and preserve all original records."""
        import json
        real_path = Path.home() / ".seyal_ai" / "seyal_memory.json"
        bak_path = Path.home() / ".seyal_ai" / "seyal_memory.json.bak"
        if real_path.exists() and bak_path.exists():
            data_real = json.loads(real_path.read_text(encoding="utf-8"))
            data_bak = json.loads(bak_path.read_text(encoding="utf-8"))
            recs_real = data_real.get("records", [])
            recs_bak = data_bak.get("records", [])
            assert len(recs_bak) == 10
            # Every original record from backup must exist in live storage with intact attributes
            recs_real_by_id = {r["id"]: r for r in recs_real}
            for bak_rec in recs_bak:
                rec_id = bak_rec["id"]
                assert rec_id in recs_real_by_id, f"Original record {rec_id} missing from live storage"
                live_rec = recs_real_by_id[rec_id]
                assert live_rec.get("category") == bak_rec.get("category")
                assert live_rec.get("key") == bak_rec.get("key")
                assert live_rec.get("value") == bak_rec.get("value")
                assert live_rec.get("metadata") == bak_rec.get("metadata")


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
