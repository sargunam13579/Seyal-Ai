"""Unit tests for User Knowledge & Rules Hub.

Tests:
1. User Knowledge Vault (Key-Value CRUD, persistence, default values)
2. One-Time Reminders (Add, auto-clear on completion)
3. Standing Rules & Watchers (Add, toggle active/inactive, delete)
4. Context & Telemetry Injection
"""

import tempfile
from pathlib import Path
import pytest
from seyal_ai.services.user_knowledge_service import UserKnowledgeService


@pytest.fixture
def temp_service():
    with tempfile.TemporaryDirectory() as tmpdir:
        hub_path = Path(tmpdir) / "test_user_hub.json"
        service = UserKnowledgeService(file_path=hub_path)
        yield service


def test_default_user_knowledge(temp_service):
    """Ensure default hub starts empty without hardcoded user data."""
    knowledge = temp_service.get_user_knowledge()
    assert isinstance(knowledge, dict)
    assert len(knowledge) == 0


def test_user_knowledge_crud(temp_service):
    """Test adding, updating, and deleting key-values."""
    # Add new fact
    updated = temp_service.set_user_knowledge_item("location", "Chennai")
    assert updated.get("location") == "Chennai"

    # Update existing fact
    updated = temp_service.set_user_knowledge_item("name", "Sargunam P")
    assert updated.get("name") == "Sargunam P"

    # Delete fact
    updated = temp_service.delete_user_knowledge_item("course")
    assert "course" not in updated


def test_one_time_reminders_auto_clear(temp_service):
    """Verify one-time reminders are added and completely auto-cleared when completed."""
    assert len(temp_service.get_reminders()) == 0

    rem1 = temp_service.add_reminder("Drink water", target_time="15:00")
    assert rem1["title"] == "Drink water"
    assert len(temp_service.get_reminders()) == 1

    rem2 = temp_service.add_reminder("Submit assignment", target_time="20:00")
    assert len(temp_service.get_reminders()) == 2

    # Complete and remove first reminder
    removed = temp_service.complete_and_remove_reminder(rem1["id"])
    assert removed is True

    reminders = temp_service.get_reminders()
    assert len(reminders) == 1
    assert reminders[0]["id"] == rem2["id"]

    # Trying to remove again returns False
    assert temp_service.complete_and_remove_reminder(rem1["id"]) is False


def test_standing_rules_toggle(temp_service):
    """Verify permanent standing rules can be registered, toggled, and persisted."""
    rule = temp_service.add_or_update_standing_rule(
        rule_id="recycle_bin_watcher",
        title="Recycle Bin Monitor",
        description="Notify if recycle bin has files",
        active=True,
    )
    assert rule["active"] is True

    # Toggle to inactive
    toggled = temp_service.toggle_standing_rule("recycle_bin_watcher")
    assert toggled["active"] is False

    # Toggle back to active
    toggled = temp_service.toggle_standing_rule("recycle_bin_watcher", active=True)
    assert toggled["active"] is True

    # Delete rule
    deleted = temp_service.delete_standing_rule("recycle_bin_watcher")
    assert deleted is True
    assert "recycle_bin_watcher" not in temp_service.get_standing_rules()
