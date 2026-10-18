"""
Seyal AI — Comprehensive Memory & Context System Test Suite.

Validates the full enterprise memory lifecycle:
  - Multi-category memory partitioning across all 6 core categories
  - Automatic credential redaction and deep privacy sanitization
  - Automated conversational learning from English and Tanglish statements
  - Anaphoric deixis and contextual reference resolution ('this', 'it', 'my Java project')
  - Dynamic context state tracking and entity mapping
  - Atomic JSON persistence and Tamil Unicode integrity
  - Fast keyword search, tag filtering, and confidence thresholds
  - Memory access metrics and frequency tracking
  - Global memory master toggle and privacy controls
  - Granular category clearance and record deletion
"""

from __future__ import annotations

from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from seyal_ai.api.app import create_app
from seyal_ai.core.brain import SeyalAiBrain
from seyal_ai.memory.context_resolver import ContextResolver
from seyal_ai.memory.manager import MemoryManager
from seyal_ai.memory.privacy import MemoryPrivacyFilter
from seyal_ai.memory.storage import MemoryStorage
from seyal_ai.memory.types import ContextState, MemoryCategory
from seyal_ai.tools.memory.memory_tools import (
    ClearMemoryTool,
    DeleteMemoryTool,
    ManageMemorySettingsTool,
    RecallMemoryTool,
    SearchMemoryTool,
    StoreMemoryTool,
    get_memory_tools,
)

# ===========================================================================
# 1. MULTI-CATEGORY MEMORY PARTITIONING & CRUD (MEM-01)
# ===========================================================================


class TestMemoryCategoryPartitioning:
    """Verifies isolation and CRUD across the 6 core memory categories."""

    @pytest.mark.asyncio
    async def test_mem01_category_partitioning_and_crud(self, tmp_path: Path):
        """Records stored across all 6 categories remain strictly isolated."""
        storage_file = tmp_path / "memory_partition.json"
        storage = MemoryStorage(storage_path=storage_file)

        # Store a record in each of the 6 categories
        await storage.store(
            key="recent_turn",
            value="User asked about weather",
            category=MemoryCategory.CONVERSATION,
        )
        await storage.store(
            key="active_step",
            value="Step 2: Generate PDF report",
            category=MemoryCategory.CURRENT_TASK,
        )
        await storage.store(
            key="editor_theme",
            value="catppuccin_mocha",
            category=MemoryCategory.USER_PREFERENCE,
            tags=["theme", "ide"],
        )
        await storage.store(
            key="primary_display",
            value={"width": 1920, "height": 1080},
            category=MemoryCategory.DEVICE_MEMORY,
        )
        await storage.store(
            key="default_browser",
            value="Chrome",
            category=MemoryCategory.APP_PREFERENCE,
        )
        await storage.store(
            key="project_codename",
            value="Seyal AI 2.0",
            category=MemoryCategory.USER_DEFINED_INFO,
        )

        # Verify total count
        stats = await storage.get_stats()
        assert stats["total_records"] == 6

        # Category-filtered searches do not bleed across boundaries
        pref_results = await storage.search(category=MemoryCategory.USER_PREFERENCE)
        assert len(pref_results) == 1
        assert pref_results[0].key == "editor_theme"
        assert pref_results[0].value == "catppuccin_mocha"

        task_results = await storage.search(category=MemoryCategory.CURRENT_TASK)
        assert len(task_results) == 1
        assert task_results[0].key == "active_step"


# ===========================================================================
# 2. PRIVACY CREDENTIAL REDACTION & DEEP SANITIZATION (MEM-02)
# ===========================================================================


class TestMemoryPrivacySanitization:
    """Verifies sensitive token masking and credential interception before persistence."""

    def test_mem02_detects_and_redacts_credentials(self):
        """Scrubs API keys, passwords, bearer tokens, and private keys from strings."""
        privacy = MemoryPrivacyFilter()

        # OpenAI key
        openai_text = "My key is sk-1234567890abcdef1234567890abcdef"
        assert privacy.contains_sensitive_data(openai_text)
        assert "[OPENAI_API_KEY_REDACTED]" in privacy.sanitize(openai_text)

        # GitHub token
        gh_text = "GitHub token is ghp_1234567890abcdefghijklmnopqrstuvwxyz12"
        assert privacy.contains_sensitive_data(gh_text)
        assert "[GITHUB_TOKEN_REDACTED]" in privacy.sanitize(gh_text)

        # Password assignment
        pwd_text = 'login with password: "SuperSecretPassword123"'
        assert privacy.contains_sensitive_data(pwd_text)
        assert "password: [REDACTED]" in privacy.sanitize(pwd_text)

    def test_mem02_recursive_nested_payload_sanitization(self):
        """Sanitizes sensitive values inside nested dictionaries and lists."""
        privacy = MemoryPrivacyFilter()

        nested_payload = {
            "config": {
                "api_endpoint": "https://api.seyal.ai/v1",
                "auth": {
                    "token": "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijk1234567890",
                },
            },
            "secrets_list": [
                "sk-9999999999abcdef9999999999abcdef",
                "normal_setting",
            ],
        }

        sanitized = privacy.sanitize_value(nested_payload)
        assert "[BEARER_TOKEN_REDACTED]" in sanitized["config"]["auth"]["token"]
        assert "[OPENAI_API_KEY_REDACTED]" in sanitized["secrets_list"][0]
        assert sanitized["secrets_list"][1] == "normal_setting"


# ===========================================================================
# 3. AUTOMATED CONVERSATIONAL LEARNING (MEM-03)
# ===========================================================================


class TestAutomatedPreferenceLearning:
    """Verifies preference extraction from English and Tanglish statements."""

    @pytest.mark.asyncio
    async def test_mem03_learn_project_directories_english(self, tmp_path: Path):
        """Extracts project paths from natural English conversational statements."""
        storage = MemoryStorage(storage_path=tmp_path / "learn_eng.json")
        manager = MemoryManager(storage=storage)

        msg = "My Python projects are normally inside D:/Code/Python_Workspace."
        rec = await manager.auto_learn_from_message(msg)

        assert rec is not None
        assert rec.key == "python_projects_dir"
        assert rec.value == "D:/Code/Python_Workspace"
        assert rec.category == MemoryCategory.USER_PREFERENCE
        assert "python" in rec.tags

    @pytest.mark.asyncio
    async def test_mem03_learn_tanglish_notes_and_reminders(self, tmp_path: Path):
        """Extracts facts from Tanglish statements like 'Enoda phone ... nu save pannu'."""
        storage = MemoryStorage(storage_path=tmp_path / "learn_tanglish.json")
        manager = MemoryManager(storage=storage)

        # Tanglish statement 1
        msg1 = "Enoda phone 9876543210 nu save pannu"
        rec1 = await manager.auto_learn_from_message(msg1)
        assert rec1 is not None
        assert rec1.key == "phone"
        assert rec1.value == "9876543210"

        # Tanglish statement 2 (note pannu)
        msg2 = "note pannu email is sargunam@seyal.ai"
        rec2 = await manager.auto_learn_from_message(msg2)
        assert rec2 is not None
        assert rec2.key == "email"
        assert rec2.value == "sargunam@seyal.ai"

    @pytest.mark.asyncio
    async def test_mem03_learn_default_application(self, tmp_path: Path):
        """Extracts default application preferences."""
        storage = MemoryStorage(storage_path=tmp_path / "learn_app.json")
        manager = MemoryManager(storage=storage)

        msg = "Set my default browser to Google Chrome"
        rec = await manager.auto_learn_from_message(msg)
        assert rec is not None
        assert rec.key == "default_browser"
        assert rec.value == "Google Chrome"
        assert rec.category == MemoryCategory.APP_PREFERENCE


# ===========================================================================
# 4. ANAPHORIC DEIXIS & CONTEXTUAL REFERENCE RESOLUTION (MEM-04)
# ===========================================================================


class TestContextualReferenceResolution:
    """Verifies resolution of pronouns and user workspace aliases."""

    @pytest.mark.asyncio
    async def test_mem04_pronoun_and_deixis_resolution(self, tmp_path: Path):
        """Resolves 'this file', 'it', and 'the link' using dynamic context state."""
        storage = MemoryStorage(storage_path=tmp_path / "context_res.json")
        resolver = ContextResolver(storage=storage)

        # Update dynamic context
        resolver.update_state(
            last_mentioned_path="D:/Reports/Quarterly_Report.pdf",
            last_mentioned_url="https://seyal.ai/documentation",
        )

        # 'open this file' should bind to last_mentioned_path
        res_file = await resolver.resolve_reference("Can you open this file for me?")
        assert res_file.get("target_file") == "D:/Reports/Quarterly_Report.pdf"

        # 'summarize the link' should bind to last_mentioned_url
        res_url = await resolver.resolve_reference("Please summarize the link.")
        assert res_url.get("target_url") == "https://seyal.ai/documentation"

    @pytest.mark.asyncio
    async def test_mem04_project_alias_resolution(self, tmp_path: Path):
        """Resolves 'my Java project' to concrete path stored in USER_PREFERENCE."""
        storage = MemoryStorage(storage_path=tmp_path / "proj_alias.json")
        await storage.store(
            key="java_projects_dir",
            value="D:/Dev/Enterprise_Java_App",
            category=MemoryCategory.USER_PREFERENCE,
        )

        resolver = ContextResolver(storage=storage)
        res = await resolver.resolve_reference("Open my Java project in IDE")
        assert res.get("target_path") == "D:/Dev/Enterprise_Java_App"
        assert res.get("reference_type") == "project_directory"


# ===========================================================================
# 5. DYNAMIC CONTEXT STATE TRACKING (MEM-05)
# ===========================================================================


class TestDynamicContextState:
    """Verifies ContextState updates and entity dictionary persistence."""

    def test_mem05_context_state_mutation_and_entity_mapping(self):
        """ContextResolver tracks active app, window title, and recent entities."""
        resolver = ContextResolver()

        resolver.update_state(
            active_app="Code.exe",
            active_window_title="seyal_ai — Visual Studio Code",
            recent_entity_key="invoice_number",
            recent_entity_val="INV-2026-001",
        )

        state: ContextState = resolver.state
        assert state.active_app == "Code.exe"
        assert "Visual Studio Code" in str(state.active_window_title)
        assert state.recent_entities.get("invoice_number") == "INV-2026-001"


# ===========================================================================
# 6. ATOMIC PERSISTENCE & TAMIL UNICODE INTEGRITY (MEM-06)
# ===========================================================================


class TestAtomicPersistenceAndUnicode:
    """Verifies atomic file replacement and Tamil Unicode encoding."""

    @pytest.mark.asyncio
    async def test_mem06_atomic_json_persistence_and_tamil_unicode(self, tmp_path: Path):
        """Memory records save atomically and retain Tamil Unicode characters on reload."""
        storage_file = tmp_path / "memory_unicode.json"
        storage = MemoryStorage(storage_path=storage_file)

        tamil_note = "செயல் AI நினைவகம்: திட்டப்பணி வெற்றிகரமாக முடிந்தது."
        await storage.store(
            key="tamil_milestone",
            value=tamil_note,
            category=MemoryCategory.USER_DEFINED_INFO,
            tags=["தமிழ்", "seyal_ai"],
        )

        # File exists on disk
        assert storage_file.exists()

        # Reload in fresh storage instance
        new_storage = MemoryStorage(storage_path=storage_file)
        rec = await new_storage.find_by_key("tamil_milestone")

        assert rec is not None
        assert rec.value == tamil_note
        assert "தமிழ்" in rec.tags


# ===========================================================================
# 7. FAST SEARCH, TAG FILTERING & CONFIDENCE THRESHOLDS (MEM-07)
# ===========================================================================


class TestMemorySearchAndFiltering:
    """Verifies keyword search, multi-tag filtering, and confidence matching."""

    @pytest.mark.asyncio
    async def test_mem07_keyword_and_tag_search(self, tmp_path: Path):
        """Searches across keys, values, and tags with precision."""
        storage = MemoryStorage(storage_path=tmp_path / "search_test.json")

        await storage.store(
            key="ide_font",
            value="JetBrains Mono",
            category=MemoryCategory.USER_PREFERENCE,
            tags=["font", "editor", "styling"],
            confidence=0.9,
        )
        await storage.store(
            key="terminal_font",
            value="Fira Code",
            category=MemoryCategory.USER_PREFERENCE,
            tags=["font", "terminal"],
            confidence=0.85,
        )
        await storage.store(
            key="database_host",
            value="localhost:5432",
            category=MemoryCategory.DEVICE_MEMORY,
            tags=["db", "postgres"],
            confidence=1.0,
        )

        # Search by tag
        font_records = await storage.search(tags=["font"])
        assert len(font_records) == 2

        # Search by query keyword
        db_records = await storage.search(query="database")
        assert len(db_records) == 1
        assert db_records[0].key == "database_host"


# ===========================================================================
# 8. ACCESS METRICS & FREQUENCY TRACKING (MEM-08)
# ===========================================================================


class TestMemoryAccessMetrics:
    """Verifies access counter incrementation and last_accessed timestamp updates."""

    @pytest.mark.asyncio
    async def test_mem08_access_counter_and_timestamp(self, tmp_path: Path):
        """Querying records via find_by_key updates access metrics."""
        storage = MemoryStorage(storage_path=tmp_path / "metrics_test.json")
        await storage.store(key="tracked_item", value="Seyal AI Knowledge")

        # Initial access count is 0
        rec = await storage.find_by_key("tracked_item")
        assert rec is not None
        assert rec.access_count == 1

        # Subsequent access increments counter
        rec2 = await storage.find_by_key("tracked_item")
        assert rec2 is not None
        assert rec2.access_count == 2
        assert rec2.last_accessed != ""


# ===========================================================================
# 9. MASTER TOGGLE & PRIVACY CONTROLS (MEM-09)
# ===========================================================================


class TestMemoryMasterToggle:
    """Verifies that disabling the memory engine halts all write operations."""

    @pytest.mark.asyncio
    async def test_mem09_disable_memory_halts_operations(self, tmp_path: Path):
        """Disabled memory manager ignores auto-learning and write operations."""
        storage = MemoryStorage(storage_path=tmp_path / "toggle_test.json")
        manager = MemoryManager(storage=storage)

        # Disable memory
        manager.set_enabled(False)
        assert not manager.is_enabled

        # Auto-learning should return None
        learned = await manager.auto_learn_from_message("My Java projects are inside D:/Java")
        assert learned is None

        # Re-enable memory
        manager.set_enabled(True)
        assert manager.is_enabled

        learned2 = await manager.auto_learn_from_message("My Java projects are inside D:/Java")
        assert learned2 is not None
        assert learned2.key == "java_projects_dir"


# ===========================================================================
# 10. GRANULAR CATEGORY CLEAR & RECORD DELETION (MEM-10)
# ===========================================================================


class TestGranularDeletionAndClearing:
    """Verifies single item deletion and selective category wipes."""

    @pytest.mark.asyncio
    async def test_mem10_delete_single_and_clear_category(self, tmp_path: Path):
        """Clearing one category leaves all other categories completely unharmed."""
        storage = MemoryStorage(storage_path=tmp_path / "clear_test.json")

        # Populate tasks and preferences
        await storage.store(key="task_1", value="Step 1", category=MemoryCategory.CURRENT_TASK)
        await storage.store(key="task_2", value="Step 2", category=MemoryCategory.CURRENT_TASK)
        await storage.store(key="user_email", value="user@seyal.ai", category=MemoryCategory.USER_DEFINED_INFO)

        # Clear ONLY CURRENT_TASK
        cleared_count = await storage.clear(category=MemoryCategory.CURRENT_TASK)
        assert cleared_count == 2

        # Verify CURRENT_TASK is empty
        tasks = await storage.search(category=MemoryCategory.CURRENT_TASK)
        assert len(tasks) == 0

        # Verify USER_DEFINED_INFO is preserved
        preserved = await storage.find_by_key("user_email")
        assert preserved is not None
        assert preserved.value == "user@seyal.ai"

        # Delete single item by key
        deleted = await storage.delete("user_email")
        assert deleted is True

        assert await storage.find_by_key("user_email") is None


# ===========================================================================
# 11. LLM MEMORY TOOLS SUITE (MEM-11)
# ===========================================================================


class TestMemoryToolsSuite:
    """Tests for all LLM memory tools."""

    @pytest.mark.asyncio
    async def test_mem11_store_recall_search_settings_tools(self, tmp_path: Path):
        """Validates tool execution for store, recall, search, settings, and delete."""
        storage = MemoryStorage(storage_path=tmp_path / "mem_tools.json")
        manager = MemoryManager(storage=storage)

        # 1. Store tool
        store_tool = StoreMemoryTool(manager=manager)
        assert store_tool.name == "store_memory"
        res_store = await store_tool.execute(
            key="python_version",
            value="3.12",
            category="user_preference",
            tags=["python", "runtime"],
        )
        assert res_store.success is True
        assert "3.12" in res_store.output

        # 2. Recall tool
        recall_tool = RecallMemoryTool(manager=manager)
        res_recall = await recall_tool.execute(key="python_version")
        assert res_recall.success is True
        assert "3.12" in res_recall.output

        # 3. Search tool
        search_tool = SearchMemoryTool(manager=manager)
        res_search = await search_tool.execute(query="python")
        assert res_search.success is True
        assert res_search.data["count"] == 1

        # 4. Settings tool
        settings_tool = ManageMemorySettingsTool(manager=manager)
        res_status = await settings_tool.execute(action="status")
        assert res_status.success is True
        assert "Total Records" in res_status.output

        # 5. Delete tool
        del_tool = DeleteMemoryTool(manager=manager)
        res_del = await del_tool.execute(target="python_version")
        assert res_del.success is True

        # 6. Clear tool
        clear_tool = ClearMemoryTool(manager=manager)
        res_clear = await clear_tool.execute()
        assert res_clear.success is True

    def test_mem11_memory_tools_factory(self):
        """Verifies get_memory_tools returns all 6 core memory tools."""
        tools = get_memory_tools()
        assert len(tools) == 6


# ===========================================================================
# 12. FASTAPI MEMORY REST ENDPOINTS (MEM-12)
# ===========================================================================


class TestFastAPIMemoryRoutes:
    """Tests for /api/memory/* endpoints."""

    @pytest.mark.asyncio
    async def test_mem12_rest_endpoints(self):
        """Tests full REST CRUD and context resolution over HTTP."""
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # 1. Create memory
            res_create = await ac.post(
                "/api/memory/",
                json={
                    "key": "test_endpoint_key",
                    "value": "endpoint_val",
                    "category": "user_defined_info",
                    "tags": ["test"],
                },
            )
            assert res_create.status_code == 200
            mem_id = res_create.json()["memory"]["id"]

            # 2. Get by ID
            res_get = await ac.get(f"/api/memory/{mem_id}")
            assert res_get.status_code == 200
            assert res_get.json()["memory"]["key"] == "test_endpoint_key"

            # 3. Search
            res_search = await ac.get("/api/memory/search?query=endpoint")
            assert res_search.status_code == 200
            assert res_search.json()["count"] >= 1

            # 4. Context resolve
            res_resolve = await ac.post(
                "/api/memory/context/resolve",
                json={"user_input": "Open my Java project"},
            )
            assert res_resolve.status_code == 200

            # 5. Delete
            res_del = await ac.delete(f"/api/memory/{mem_id}")
            assert res_del.status_code == 200
            assert res_del.json()["success"] is True


# ===========================================================================
# 13. BRAIN MEMORY DIALOGUE INTEGRATION (MEM-13)
# ===========================================================================


class TestSeyalAiBrainMemoryIntegration:
    """Tests for Brain auto-learning during dialogue processing."""

    @pytest.mark.asyncio
    async def test_mem13_brain_auto_learn_on_process(self):
        """Brain automatically captures preference into memory during conversation."""
        brain = SeyalAiBrain()
        assert brain.memory_manager is not None

        from unittest.mock import AsyncMock, patch

        with patch.object(
            brain._orchestrator,
            "process",
            new_callable=AsyncMock,
            return_value="Remembered your preference.",
        ):
            pref_input = "My Java projects are normally inside D:/Projects"
            res = await brain.process(pref_input)
            assert res == "Remembered your preference."

            recalled = await brain.memory_manager.recall_memory("java_projects_dir")
            assert recalled is not None
            assert recalled.value == "D:/Projects"

