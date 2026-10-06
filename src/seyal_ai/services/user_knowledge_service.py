"""User Knowledge and Rules Service.

Manages:
1. User Knowledge Vault (On-Demand Key-Value facts: name, college, course, etc.)
2. One-Time Reminders (Auto-cleared upon completion)
3. Standing Rules & Watchers (Permanent monitors with active/inactive toggles)
"""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

HUB_DIR = Path(os.environ.get("SEYAL_AI_HOME", Path.home() / ".seyal_ai"))
HUB_FILE = HUB_DIR / "user_knowledge_hub.json"


def _get_default_hub() -> Dict[str, Any]:
    return {
        "user_knowledge": {},
        "one_time_reminders": [],
        "standing_rules": {},
    }


class UserKnowledgeService:
    def __init__(self, file_path: Path = HUB_FILE) -> None:
        self.file_path = file_path
        self._ensure_file_exists()

    def _ensure_file_exists(self) -> None:
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            if not self.file_path.exists():
                self._save(_get_default_hub())
        except Exception as e:
            logger.error("Failed to initialize user knowledge hub file: %s", e)

    def _load(self) -> Dict[str, Any]:
        try:
            if not self.file_path.exists():
                return _get_default_hub()
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, dict):
                    return _get_default_hub()
                data.setdefault("user_knowledge", {})
                data.setdefault("one_time_reminders", [])
                data.setdefault("standing_rules", {})
                return data
        except Exception as e:
            logger.error("Error reading user knowledge hub: %s", e)
            return _get_default_hub()

    def _save(self, data: Dict[str, Any]) -> bool:
        try:
            temp_path = self.file_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            temp_path.replace(self.file_path)
            return True
        except Exception as e:
            logger.error("Error saving user knowledge hub: %s", e)
            return False

    # -------------------------------------------------------------
    # 1. User Knowledge Vault (Key-Values)
    # -------------------------------------------------------------
    def get_user_knowledge(self) -> Dict[str, str]:
        data = self._load()
        return data.get("user_knowledge", {})

    def set_user_knowledge_item(self, key: str, value: str) -> Dict[str, str]:
        data = self._load()
        cleaned_key = key.strip()
        data["user_knowledge"][cleaned_key] = str(value).strip()
        self._save(data)
        return data["user_knowledge"]

    def delete_user_knowledge_item(self, key: str) -> Dict[str, str]:
        data = self._load()
        cleaned_key = key.strip()
        if cleaned_key in data["user_knowledge"]:
            del data["user_knowledge"][cleaned_key]
            self._save(data)
        return data["user_knowledge"]

    # -------------------------------------------------------------
    # 2. One-Time Reminders (Auto-cleared on completion)
    # -------------------------------------------------------------
    def get_reminders(self) -> List[Dict[str, Any]]:
        data = self._load()
        return data.get("one_time_reminders", [])

    def add_reminder(
        self,
        title: str,
        target_time: Optional[str] = None,
        notes: str = "",
    ) -> Dict[str, Any]:
        data = self._load()
        reminder_id = f"rem_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        reminder = {
            "id": reminder_id,
            "title": title.strip(),
            "target_time": target_time or "",
            "notes": notes.strip(),
            "created_at": time.time(),
            "status": "pending",
        }
        data["one_time_reminders"].append(reminder)
        self._save(data)
        return reminder

    def complete_and_remove_reminder(self, reminder_id: str) -> bool:
        """Removes the reminder from the list upon execution/completion."""
        data = self._load()
        original_len = len(data["one_time_reminders"])
        data["one_time_reminders"] = [
            r for r in data["one_time_reminders"] if r.get("id") != reminder_id
        ]
        if len(data["one_time_reminders"]) < original_len:
            self._save(data)
            return True
        return False

    # -------------------------------------------------------------
    # 3. Standing Rules & Watchers (Never removed, active toggled)
    # -------------------------------------------------------------
    def get_standing_rules(self) -> Dict[str, Dict[str, Any]]:
        data = self._load()
        return data.get("standing_rules", {})

    def add_or_update_standing_rule(
        self,
        rule_id: str,
        title: str,
        description: str = "",
        trigger_type: str = "custom",
        active: bool = True,
    ) -> Dict[str, Any]:
        data = self._load()
        rule = {
            "id": rule_id,
            "title": title.strip(),
            "description": description.strip(),
            "trigger_type": trigger_type,
            "active": active,
            "updated_at": time.time(),
        }
        data["standing_rules"][rule_id] = rule
        self._save(data)
        return rule

    def toggle_standing_rule(self, rule_id: str, active: Optional[bool] = None) -> Optional[Dict[str, Any]]:
        data = self._load()
        if rule_id not in data["standing_rules"]:
            return None
        current_active = data["standing_rules"][rule_id].get("active", True)
        new_active = not current_active if active is None else active
        data["standing_rules"][rule_id]["active"] = new_active
        data["standing_rules"][rule_id]["updated_at"] = time.time()
        self._save(data)
        return data["standing_rules"][rule_id]

    def delete_standing_rule(self, rule_id: str) -> bool:
        data = self._load()
        if rule_id in data["standing_rules"]:
            del data["standing_rules"][rule_id]
            self._save(data)
            return True
        return False

    # -------------------------------------------------------------
    # Full Hub Payload
    # -------------------------------------------------------------
    def get_full_hub(self) -> Dict[str, Any]:
        return self._load()


# Singleton
user_knowledge_service = UserKnowledgeService()
