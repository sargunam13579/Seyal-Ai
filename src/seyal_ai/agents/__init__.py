"""Seyal AI — Agents Suite.

Houses the 5 core AI Agent capabilities:
1. computer_use — Self-Operating Computer Agent
2. personal     — Universal Personal AI Agent
3. research     — Autonomous Deep Research Agent
4. life_os      — Personal Life Operating System Agent
5. multi_agent  — Multi-Agent AI Company Coordinator
"""

from seyal_ai.agents.browser.agent import BrowserAgent
from seyal_ai.agents.computer_use.agent import (
    ComputerUseAgent,
    ConversationalComputerUseAgent,
)
from seyal_ai.agents.devices.agent import AndroidDeviceAgent
from seyal_ai.agents.life_os.agent import PersonalLifeOsAgent
from seyal_ai.agents.multi_agent.agent import MultiAgentCompanyCoordinator
from seyal_ai.agents.personal.agent import UniversalPersonalAgent
from seyal_ai.agents.research.agent import AutonomousResearchAgent
from seyal_ai.agents.terminal.agent import TerminalAgent
from seyal_ai.agents.vision.agent import VisionAgent

__all__ = [
    "AndroidDeviceAgent",
    "BrowserAgent",
    "ConversationalComputerUseAgent",
    "ComputerUseAgent",
    "UniversalPersonalAgent",
    "AutonomousResearchAgent",
    "PersonalLifeOsAgent",
    "MultiAgentCompanyCoordinator",
    "TerminalAgent",
    "VisionAgent",
]

# Backward compatibility alias for laptop agent (now consolidated under computer_use.laptop)
import sys
from seyal_ai.agents.computer_use import laptop as _cu_laptop
from seyal_ai.agents.computer_use.laptop import agent as _cu_laptop_agent
from seyal_ai.agents.computer_use.laptop import protocol as _cu_laptop_proto

sys.modules["seyal_ai.agents.laptop"] = _cu_laptop
sys.modules["seyal_ai.agents.laptop.agent"] = _cu_laptop_agent
sys.modules["seyal_ai.agents.laptop.protocol"] = _cu_laptop_proto