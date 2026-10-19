"""
Seyal AI — Comprehensive Offline Mode & Local Fallback Test Suite.

Validates the full offline resilience lifecycle:
  - Immediate offline mode detection and network connectivity probing
  - Deterministic local emergency stop without cloud roundtrips
  - Local system volume and mute controls
  - Local desktop application launching
  - Local hardware metrics and battery diagnostic queries
  - Graceful rejection and guardrails for complex requests requiring cloud
  - Text-to-Speech automatic fallback to offline pyttsx3 when network drops
  - Local SQLite WAL database operations in pure air-gapped mode
  - Local-first database synchronization and outbox persistence
  - Complete memory and user knowledge CRUD in offline environment
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy import select

from seyal_ai.database.engine import close_engine, get_session, init_engine
from seyal_ai.database.models import User
from seyal_ai.memory.manager import MemoryManager
from seyal_ai.memory.storage import MemoryStorage
from seyal_ai.memory.types import MemoryCategory
from seyal_ai.reliability.offline import LocalCommandResult, OfflineModeManager
from seyal_ai.voice.tts import Pyttsx3TTSProvider, TTSEngine, TTSError

# ===========================================================================
# 1. OFFLINE MODE DETECTION & CONNECTIVITY PROBING (OFF-01)
# ===========================================================================


class TestOfflineConnectivityDetection:
    """Verifies reliable detection of offline state without network stalls."""

    def test_off01_forced_offline_mode_returns_immediately(self):
        """When force_offline is True, is_online returns False instantly without network calls."""
        mgr = OfflineModeManager(force_offline=True)
        assert not mgr.is_online()

    def test_off01_socket_connection_failure_detects_offline(self):
        """Socket connect failures (e.g. unroutable host or timeout) report offline status."""
        mgr = OfflineModeManager(force_offline=False)

        # Mock socket to simulate network unreachable
        with patch("socket.socket") as mock_sock:
            mock_instance = MagicMock()
            mock_instance.connect.side_effect = OSError("Network is unreachable")
            mock_sock.return_value.__enter__.return_value = mock_instance

            assert not mgr.is_online(test_host="192.0.2.1", timeout=0.1)


# ===========================================================================
# 2. DETERMINISTIC LOCAL EMERGENCY STOP (OFF-02)
# ===========================================================================


class TestOfflineEmergencyStop:
    """Verifies that life-safety and emergency stop commands execute locally."""

    @pytest.mark.asyncio
    async def test_off02_emergency_stop_executes_offline(self):
        """Emergency stop words ('stop', 'halt', 'abort', 'kill') halt operations locally."""
        mgr = OfflineModeManager(force_offline=True)

        for stop_cmd in ["stop immediately", "halt execution", "abort task", "kill all operations"]:
            assert mgr.can_handle_locally(stop_cmd)

            result: LocalCommandResult = await mgr.execute_offline_command(stop_cmd)
            assert result.success
            assert result.action_taken == "emergency_stop"
            assert "halted" in result.response_text.lower()


# ===========================================================================
# 3. LOCAL SYSTEM VOLUME CONTROLS (OFF-03)
# ===========================================================================


class TestOfflineVolumeControls:
    """Verifies local system audio and mute operations."""

    @pytest.mark.asyncio
    async def test_off03_volume_and_mute_local_dispatch(self):
        """Volume change and mute commands are handled offline deterministically."""
        mgr = OfflineModeManager(force_offline=True)

        assert mgr.can_handle_locally("set volume 40")
        assert mgr.can_handle_locally("mute audio")

        # Mock the internal volume setter to test command parser
        with patch.object(mgr, "_set_volume_local") as mock_set_vol:
            mock_set_vol.return_value = LocalCommandResult(
                success=True,
                response_text="Volume set to 40 percent.",
                action_taken="volume_change",
                metadata={"volume": 40},
            )

            res = await mgr.execute_offline_command("set volume 40")
            assert res.success
            assert res.action_taken == "volume_change"
            mock_set_vol.assert_called_once_with(40)


# ===========================================================================
# 4. LOCAL APPLICATION LAUNCHING (OFF-04)
# ===========================================================================


class TestOfflineAppLaunching:
    """Verifies local application launching without cloud interaction."""

    @pytest.mark.asyncio
    async def test_off04_app_launch_local_dispatch(self):
        """Opening desktop tools (notepad, calculator, cmd) dispatches locally."""
        mgr = OfflineModeManager(force_offline=True)

        assert mgr.can_handle_locally("open notepad")
        assert mgr.can_handle_locally("launch calculator")

        with patch("subprocess.Popen") as mock_popen:
            res = await mgr.execute_offline_command("open notepad")
            assert res.success
            assert res.action_taken == "app_launch"
            assert res.metadata and res.metadata.get("app") == "notepad"
            mock_popen.assert_called_once()


# ===========================================================================
# 5. LOCAL HARDWARE & SYSTEM DIAGNOSTICS (OFF-05)
# ===========================================================================


class TestOfflineHardwareDiagnostics:
    """Verifies local system queries (battery, CPU, RAM) run without cloud."""

    @pytest.mark.asyncio
    async def test_off05_battery_and_system_status_local(self):
        """Status queries inspect psutil sensors locally."""
        mgr = OfflineModeManager(force_offline=True)

        assert mgr.can_handle_locally("battery status")
        assert mgr.can_handle_locally("system status")

        res = await mgr.execute_offline_command("battery status")
        assert res.success
        assert res.action_taken == "status_query"
        assert "local status" in res.response_text.lower()


# ===========================================================================
# 6. UNSUPPORTED OFFLINE REQUEST GUARDRAIL (OFF-06)
# ===========================================================================


class TestOfflineCloudGuardrail:
    """Verifies requests requiring cloud LLM reasoning are safely flagged."""

    @pytest.mark.asyncio
    async def test_off06_complex_cloud_requests_rejected_gracefully(self):
        """Complex reasoning prompts inform user of offline mode without crashing."""
        mgr = OfflineModeManager(force_offline=True)

        complex_query = "Write a comprehensive history of the Byzantine empire."
        assert not mgr.can_handle_locally(complex_query)

        res = await mgr.execute_offline_command(complex_query)
        assert not res.success
        assert res.action_taken == "unsupported_offline"
        assert "currently in offline mode" in res.response_text
        assert "requires cloud connectivity" in res.response_text


# ===========================================================================
# 7. OFFLINE TTS FALLBACK ROUTING (OFF-07)
# ===========================================================================


class TestOfflineTTSFallback:
    """Verifies automatic downgrade to pyttsx3 when cloud TTS is unreachable."""

    @pytest.mark.asyncio
    async def test_off07_tts_falls_back_to_offline_pyttsx3(self):
        """When primary Edge TTS throws TTSError, synthesis falls back to local pyttsx3."""
        engine = TTSEngine(provider_name="edge")

        # Mock primary provider to simulate network drop
        mock_primary = MagicMock()
        mock_primary.synthesize = AsyncMock(side_effect=TTSError("Network connection lost"))
        engine._provider = mock_primary

        # Mock fallback pyttsx3 provider
        mock_fallback = MagicMock()
        mock_fallback.synthesize = AsyncMock(return_value=b"OFFLINE_WAV_AUDIO")
        mock_fallback.provider_name = "pyttsx3 (Offline)"
        engine._fallback_provider = mock_fallback
        # Empty voice so it allows fallback
        engine._voice = ""

        audio_bytes = await engine.synthesize("Seyal AI is running in offline mode.")
        assert audio_bytes == b"OFFLINE_WAV_AUDIO"
        mock_fallback.synthesize.assert_called_once()

    def test_off07_pyttsx3_provider_name_designation(self):
        """Pyttsx3 provider identifies as offline provider."""
        provider = Pyttsx3TTSProvider()
        assert "Offline" in provider.provider_name


# ===========================================================================
# 8. LOCAL SQLITE DATABASE IN AIR-GAPPED MODE (OFF-08)
# ===========================================================================


class TestOfflineDatabaseOperations:
    """Verifies SQLite WAL mode operations function with zero internet connection."""

    @pytest.mark.asyncio
    async def test_off08_sqlite_crud_completely_offline(self, tmp_path: Path):
        """User creation, queries, and commits succeed in air-gapped environment."""
        db_file = tmp_path / "offline_airgapped.db"
        await init_engine(db_url=f"sqlite+aiosqlite:///{db_file}", echo=False)

        async with get_session() as session:
            user = User(
                name="செயல் ஆஃப்லைன் பயனர் (Offline User)",
                mother_tongue="தமிழ்",
                known_languages=["ta", "en"],
            )
            session.add(user)
            await session.commit()
            user_id = user.id

        # Read back in new session
        async with get_session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            saved_user = result.scalar_one_or_none()

            assert saved_user is not None
            assert saved_user.name == "செயல் ஆஃப்லைன் பயனர் (Offline User)"
            assert saved_user.mother_tongue == "தமிழ்"

        await close_engine()


# ===========================================================================
# 9. DATABASE SYNC GRACEFUL OFFLINE MODE (OFF-09)
# ===========================================================================


class TestDatabaseSyncOfflineGrace:
    """Verifies DatabaseSyncManager stays local when remote cloud is absent."""

    @pytest.mark.asyncio
    async def test_off09_sync_runs_locally_when_cloud_unconfigured(self):
        """When cloud is not configured, sync manager remains purely local."""
        from seyal_ai.database.sync import DatabaseSyncManager, is_cloud_configured

        with patch("seyal_ai.database.sync.is_cloud_configured", return_value=False):
            assert not is_cloud_configured()
            manager = DatabaseSyncManager()
            # Starting with no cloud configuration runs in local mode without error
            await manager.start()
            assert not manager.is_cloud_available
            await manager.stop()


# ===========================================================================
# 10. LOCAL MEMORY & CONTEXT RESOLUTION OFFLINE (OFF-10)
# ===========================================================================


class TestOfflineMemoryOperations:
    """Verifies memory manager, persistence, and reference resolution work 100% offline."""

    @pytest.mark.asyncio
    async def test_off10_memory_and_auto_learning_fully_offline(self, tmp_path: Path):
        """Memory auto-learning, retrieval, and disk persistence execute entirely on-box."""
        storage_file = tmp_path / "offline_memory.json"
        storage = MemoryStorage(storage_path=storage_file)
        manager = MemoryManager(storage=storage)

        # Store offline preference
        rec = await manager.auto_learn_from_message("My Java projects are inside D:/Offline_Code")
        assert rec is not None
        assert rec.key == "java_projects_dir"

        # Resolve reference via ContextResolver completely offline
        resolver = manager.resolver
        resolved = await resolver.resolve_reference("Open my Java project")
        assert resolved.get("target_path") == "D:/Offline_Code"

        # Verify storage file created locally on disk
        assert storage_file.exists()
        recalled = await manager.recall_memory("java_projects_dir", category=MemoryCategory.USER_PREFERENCE)
        assert recalled is not None
        assert recalled.value == "D:/Offline_Code"
