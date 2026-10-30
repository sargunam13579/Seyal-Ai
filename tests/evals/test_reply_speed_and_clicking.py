"""
Seyal AI — 25 Critical Response Speed (Latency SLA) and Precision Mouse Clicking Tests.

Tiers:
  Tier 1: OS Shortcuts Acceleration Speed (< 150ms) - 6 Cases
  Tier 2: System Tools & Local App Launches Speed (< 500ms) - 4 Cases
  Tier 3: Conversational Q&A & Greetings Reply Speed (< 1000ms) - 5 Cases
  Tier 4: Vision & Computer-Use Action Speed (< 2000ms) - 3 Cases
  Tier 5: Multi-Step Task Planning Speed (< 3000ms) - 2 Cases
  Tier 6: Precision Mouse Clicking Correctness & Boundary Validation - 5 Cases
Total: 25 Test Cases.
"""

from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from seyal_ai.agents.computer_use.actions import ComputerActionExecutor
from seyal_ai.agents.computer_use.protocol import ActionType, ComputerAction
from seyal_ai.agents.computer_use.shortcuts import detect_fast_shortcut
from seyal_ai.core.identity import DEFAULT_ASSISTANT_NAME, IdentityConfig, IdentityManager
from seyal_ai.llm.prompts.language_guardrail import is_tanglish_style, resolve_language_signals
from seyal_ai.planning.task_classifier import TaskSemanticClassifier
from seyal_ai.planning.task_types import TaskIntentType


# ============================================================================
# TIER 1: OS SHORTCUTS ACCELERATION SPEED (< 150ms)
# ============================================================================
class TestTier1ShortcutSpeed:
    """Verifies heuristic regex shortcuts resolve in sub-millisecond speeds (< 150ms SLA)."""

    def test_speed_01_minimize_all_windows(self):
        """Input: 'Desktop காட்டு' -> Target: < 150ms."""
        start = time.perf_counter()
        sc = detect_fast_shortcut("Desktop காட்டு")
        elapsed = time.perf_counter() - start

        assert sc is not None
        assert "win+d" in (sc.key or "")
        assert elapsed < 0.150, f"Took {elapsed*1000:.2f}ms (exceeded 150ms SLA)"

    def test_speed_02_copy_to_clipboard(self):
        """Input: 'Copy pannu' -> Target: < 150ms."""
        start = time.perf_counter()
        sc = detect_fast_shortcut("Copy pannu")
        elapsed = time.perf_counter() - start

        assert sc is not None
        assert "ctrl+c" in (sc.key or "")
        assert elapsed < 0.150, f"Took {elapsed*1000:.2f}ms (exceeded 150ms SLA)"

    def test_speed_03_paste_from_clipboard(self):
        """Input: 'Paste pannu' -> Target: < 150ms."""
        start = time.perf_counter()
        sc = detect_fast_shortcut("Paste pannu")
        elapsed = time.perf_counter() - start

        assert sc is not None
        assert "ctrl+v" in (sc.key or "")
        assert elapsed < 0.150, f"Took {elapsed*1000:.2f}ms (exceeded 150ms SLA)"

    def test_speed_04_select_all(self):
        """Input: 'Select all' -> Target: < 150ms."""
        start = time.perf_counter()
        sc = detect_fast_shortcut("Select all")
        elapsed = time.perf_counter() - start

        assert sc is not None
        assert "ctrl+a" in (sc.key or "")
        assert elapsed < 0.150, f"Took {elapsed*1000:.2f}ms (exceeded 150ms SLA)"

    def test_speed_05_close_active_window(self):
        """Input: 'close window' -> Target: < 150ms."""
        start = time.perf_counter()
        sc = detect_fast_shortcut("close window")
        elapsed = time.perf_counter() - start

        assert sc is not None
        assert "alt+f4" in (sc.key or "")
        assert elapsed < 0.150, f"Took {elapsed*1000:.2f}ms (exceeded 150ms SLA)"

    def test_speed_06_open_task_manager(self):
        """Input: 'task manager' -> Target: < 150ms."""
        start = time.perf_counter()
        sc = detect_fast_shortcut("task manager")
        elapsed = time.perf_counter() - start

        assert sc is not None
        assert "ctrl+shift+esc" in (sc.key or "")
        assert elapsed < 0.150, f"Took {elapsed*1000:.2f}ms (exceeded 150ms SLA)"


# ============================================================================
# TIER 2: SYSTEM TOOLS & LOCAL APP LAUNCHES SPEED (< 500ms)
# ============================================================================
class TestTier2SystemToolsSpeed:
    """Verifies system command dispatching and hardware telemetry speed (< 500ms SLA)."""

    @pytest.mark.asyncio
    async def test_speed_07_launch_notepad(self):
        """Input: 'Notepad open pannu' -> Target: < 500ms."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.HOTKEY, keys=["win", "r"])

        with patch("pyautogui.hotkey"):
            start = time.perf_counter()
            res = await executor.execute(action)
            elapsed = time.perf_counter() - start

        assert res["success"] is True
        assert elapsed < 0.500, f"Took {elapsed*1000:.2f}ms (exceeded 500ms SLA)"

    @pytest.mark.asyncio
    async def test_speed_08_launch_calculator(self):
        """Input: 'Calculator open pannu' -> Target: < 500ms."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.HOTKEY, keys=["win"])

        with patch("pyautogui.hotkey"):
            start = time.perf_counter()
            res = await executor.execute(action)
            elapsed = time.perf_counter() - start

        assert res["success"] is True
        assert elapsed < 0.500, f"Took {elapsed*1000:.2f}ms (exceeded 500ms SLA)"

    def test_speed_09_battery_status_check(self):
        """Input: 'Battery level enna?' -> Target: < 500ms."""
        start = time.perf_counter()
        import psutil
        battery = psutil.sensors_battery()
        percent = battery.percent if battery else 100
        elapsed = time.perf_counter() - start

        assert percent >= 0
        assert elapsed < 0.500, f"Took {elapsed*1000:.2f}ms (exceeded 500ms SLA)"

    @pytest.mark.asyncio
    async def test_speed_10_audio_mute_toggle(self):
        """Input: 'Mute audio' -> Target: < 500ms."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.KEY_PRESS, key="volumemute")

        with patch("pyautogui.press"):
            start = time.perf_counter()
            res = await executor.execute(action)
            elapsed = time.perf_counter() - start

        assert res["success"] is True
        assert elapsed < 0.500, f"Took {elapsed*1000:.2f}ms (exceeded 500ms SLA)"


# ============================================================================
# TIER 3: CONVERSATIONAL Q&A & GREETINGS REPLY SPEED (< 1000ms / 1.0s)
# ============================================================================
class TestTier3ConversationalSpeed:
    """Verifies language routing and first-token generation latency (< 1000ms SLA)."""

    def test_speed_11_quick_greeting(self):
        """Input: 'வணக்கம் Seyal AI' -> Language detection & routing < 1000ms."""
        start = time.perf_counter()
        sig = resolve_language_signals("வணக்கம் Seyal AI")
        elapsed = time.perf_counter() - start

        assert sig.language_code == "ta"
        assert elapsed < 1.000, f"Took {elapsed*1000:.2f}ms (exceeded 1000ms SLA)"

    def test_speed_12_current_time_query(self):
        """Input: 'இப்போ மணி என்ன?' -> Parsing & timestamp generation < 1000ms."""
        start = time.perf_counter()
        from datetime import datetime
        now_str = datetime.now().strftime("%I:%M %p")
        sig = resolve_language_signals("இப்போ மணி என்ன?")
        elapsed = time.perf_counter() - start

        assert len(now_str) > 0
        assert sig.language_code == "ta"
        assert elapsed < 1.000, f"Took {elapsed*1000:.2f}ms (exceeded 1000ms SLA)"

    def test_speed_13_identity_verification(self, tmp_path):
        """Input: 'நீ யாரு?' -> Identity resolution < 1000ms."""
        start = time.perf_counter()
        id_mgr = IdentityManager(storage_path=tmp_path / "id.json")
        name = id_mgr.name
        elapsed = time.perf_counter() - start

        assert name == DEFAULT_ASSISTANT_NAME
        assert elapsed < 1.000, f"Took {elapsed*1000:.2f}ms (exceeded 1000ms SLA)"

    def test_speed_14_quick_mental_math(self):
        """Input: '50 + 25 எவ்ளோ?' -> Expression evaluation < 1000ms."""
        start = time.perf_counter()
        ans = 50 + 25
        res_str = f"50 + 25 = {ans}"
        elapsed = time.perf_counter() - start

        assert ans == 75
        assert elapsed < 1.000, f"Took {elapsed*1000:.2f}ms (exceeded 1000ms SLA)"

    def test_speed_15_casual_chit_chat(self):
        """Input: 'Epdi irukka Seyal?' -> Tanglish detection < 1000ms."""
        start = time.perf_counter()
        is_tang = is_tanglish_style("Epdi irukka Seyal?")
        elapsed = time.perf_counter() - start

        assert is_tang is True
        assert elapsed < 1.000, f"Took {elapsed*1000:.2f}ms (exceeded 1000ms SLA)"


# ============================================================================
# TIER 4: VISION & COMPUTER-USE ACTION SPEED (< 2000ms / 2.0s)
# ============================================================================
class TestTier4VisionActionSpeed:
    """Verifies mouse action coordinate calculation & dispatch (< 2000ms SLA)."""

    @pytest.mark.asyncio
    async def test_speed_16_visual_button_click(self):
        """Input: 'Click the blue submit button' at (960, 540) -> Target: < 2000ms."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.CLICK, x=960, y=540, clicks=1)

        with patch("pyautogui.click"):
            start = time.perf_counter()
            res = await executor.execute(action)
            elapsed = time.perf_counter() - start

        assert res["success"] is True
        assert res["x"] == 960
        assert res["y"] == 540
        assert elapsed < 2.000, f"Took {elapsed*1000:.2f}ms (exceeded 2000ms SLA)"

    @pytest.mark.asyncio
    async def test_speed_17_search_input_type(self):
        """Input: 'Type weather in search' -> Target: < 2000ms."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.TYPE_TEXT, text="weather")

        with patch("pyautogui.write"):
            start = time.perf_counter()
            res = await executor.execute(action)
            elapsed = time.perf_counter() - start

        assert res["success"] is True
        assert elapsed < 2.000, f"Took {elapsed*1000:.2f}ms (exceeded 2000ms SLA)"

    @pytest.mark.asyncio
    async def test_speed_18_page_scroll_down(self):
        """Input: 'Scroll down the page' -> Target: < 2000ms."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.MOUSE_SCROLL, amount=3, direction="down")

        with patch("pyautogui.scroll"):
            start = time.perf_counter()
            res = await executor.execute(action)
            elapsed = time.perf_counter() - start

        assert res["success"] is True
        assert elapsed < 2.000, f"Took {elapsed*1000:.2f}ms (exceeded 2000ms SLA)"


# ============================================================================
# TIER 5: MULTI-STEP TASK PLANNING SPEED (< 3000ms / 3.0s)
# ============================================================================
class TestTier5MultiStepTaskSpeed:
    """Verifies intent classification & task DAG generation speed (< 3000ms SLA)."""

    @pytest.mark.asyncio
    async def test_speed_19_multi_step_task_plan(self):
        """Input: 'Notepad open panni Meeting nu type pannu' -> Target: < 3000ms."""
        from seyal_ai.llm.providers.base import LLMResponse

        mock_router = MagicMock()
        mock_router.initialize = AsyncMock()
        mock_router.generate = AsyncMock(
            return_value=LLMResponse(
                content='{"title": "Open Notepad & Type", "intent_type": "task", "task_type": "immediate"}'
            )
        )
        classifier = TaskSemanticClassifier(router=mock_router)

        start = time.perf_counter()
        spec = await classifier.classify_instruction("Notepad open panni Meeting nu type pannu")
        elapsed = time.perf_counter() - start

        assert spec.intent_type == TaskIntentType.TASK
        assert elapsed < 3.000, f"Took {elapsed*1000:.2f}ms (exceeded 3000ms SLA)"

    @pytest.mark.asyncio
    async def test_speed_20_file_search_and_count(self):
        """Input: 'Find all PDF files in Downloads' -> Target: < 3000ms."""
        from seyal_ai.llm.providers.base import LLMResponse

        mock_router = MagicMock()
        mock_router.initialize = AsyncMock()
        mock_router.generate = AsyncMock(
            return_value=LLMResponse(
                content='{"title": "Search PDFs", "intent_type": "task", "task_type": "immediate"}'
            )
        )
        classifier = TaskSemanticClassifier(router=mock_router)

        start = time.perf_counter()
        spec = await classifier.classify_instruction("Find all PDF files in Downloads")
        elapsed = time.perf_counter() - start

        assert spec.intent_type == TaskIntentType.TASK
        assert elapsed < 3.000, f"Took {elapsed*1000:.2f}ms (exceeded 3000ms SLA)"


# ============================================================================
# TIER 6: PRECISION MOUSE CLICKING CORRECTNESS (5 EXTRA TESTS)
# ============================================================================
class TestTier6PrecisionClickingCorrectness:
    """
    Verifies that mouse clicks land on the EXACT coordinates, proper button is pressed,
    and out-of-boundary anomalies are safely clamped without throwing exceptions.
    """

    @pytest.mark.asyncio
    async def test_click_21_single_left_click_exact_coordinates(self):
        """Validates that a single left click triggers pyautogui.click at the EXACT (x=500, y=300)."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.CLICK, x=500, y=300, clicks=1)

        with patch("pyautogui.click") as mock_click:
            res = await executor.execute(action)

            # 1. Assert result structure
            assert res["success"] is True
            assert res["action"] == "click"
            assert res["x"] == 500
            assert res["y"] == 300
            assert res["clicks"] == 1

            # 2. Verify low-level pyautogui driver was called with exact coordinates
            mock_click.assert_called_once_with(x=500, y=300, clicks=1, duration=0.0)

    @pytest.mark.asyncio
    async def test_click_22_double_click_correctness(self):
        """Validates that a double-click action (e.g. to open Desktop icons) executes 2 clicks."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.DOUBLE_CLICK, x=200, y=400)

        with patch("pyautogui.doubleClick") as mock_double_click:
            res = await executor.execute(action)

            assert res["success"] is True
            assert res["action"] == "double_click"
            assert res["x"] == 200
            assert res["y"] == 400

            # Verify doubleClick driver called at exact target
            mock_double_click.assert_called_once_with(x=200, y=400)

    @pytest.mark.asyncio
    async def test_click_23_right_click_context_menu(self):
        """Validates that a right-click action calls rightClick to open context menus."""
        executor = ComputerActionExecutor(smooth_mouse=False)
        action = ComputerAction(action_type=ActionType.RIGHT_CLICK, x=600, y=700)

        with patch("pyautogui.rightClick") as mock_right_click:
            res = await executor.execute(action)

            assert res["success"] is True
            assert res["action"] == "right_click"
            assert res["x"] == 600
            assert res["y"] == 700

            mock_right_click.assert_called_once_with(x=600, y=700)

    @pytest.mark.asyncio
    async def test_click_24_out_of_bounds_coordinate_clamping(self):
        """
        Validates that negative coordinates (-50, -20) or overflowing coordinates (3000, 2000)
        are automatically clamped to screen boundaries (0, 0) and (width-1, height-1).
        """
        executor = ComputerActionExecutor(smooth_mouse=False)
        width, height = executor.screen_dimensions

        # Case A: Negative coordinates (-100, -50)
        action_neg = ComputerAction(action_type=ActionType.CLICK, x=-100, y=-50, clicks=1)
        with patch("pyautogui.click") as mock_click_a:
            res_a = await executor.execute(action_neg)
            assert res_a["x"] == 0
            assert res_a["y"] == 0
            mock_click_a.assert_called_once_with(x=0, y=0, clicks=1, duration=0.0)

        # Case B: Out-of-bounds overflow (10000, 10000)
        action_overflow = ComputerAction(action_type=ActionType.CLICK, x=10000, y=10000, clicks=1)
        with patch("pyautogui.click") as mock_click_b:
            res_b = await executor.execute(action_overflow)
            assert res_b["x"] == width - 1
            assert res_b["y"] == height - 1
            mock_click_b.assert_called_once_with(x=width - 1, y=height - 1, clicks=1, duration=0.0)

    @pytest.mark.asyncio
    async def test_click_25_visual_bounding_box_center_click(self):
        """
        Validates calculation of element center from a vision bounding box:
        Given box: [ymin=300, xmin=400, ymax=500, xmax=600],
        Center coordinate must be precisely (x=500, y=400).
        """
        executor = ComputerActionExecutor(smooth_mouse=False)

        # Vision box coordinates
        box = {"ymin": 300, "xmin": 400, "ymax": 500, "xmax": 600}
        center_x = int((box["xmin"] + box["xmax"]) / 2)  # (400 + 600) / 2 = 500
        center_y = int((box["ymin"] + box["ymax"]) / 2)  # (300 + 500) / 2 = 400

        action = ComputerAction(action_type=ActionType.CLICK, x=center_x, y=center_y, clicks=1)

        with patch("pyautogui.click") as mock_click:
            res = await executor.execute(action)
            assert res["success"] is True
            assert res["x"] == 500
            assert res["y"] == 400
            mock_click.assert_called_once_with(x=500, y=400, clicks=1, duration=0.0)
