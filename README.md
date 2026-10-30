# Seyal AI — Voice-First, Cross-Device Autonomous Personal AI Agent

[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/)
[![Tests Passing](https://img.shields.io/badge/tests-570%20passed-brightgreen.svg)]()
[![Code Style](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![Type Checking](https://img.shields.io/badge/type%20checker-pyright%20%7C%20mypy-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> **Seyal AI** is an autonomous, hands-free personal AI agent engineered to understand complex user goals, plan multi-step workflows, control desktop applications and Android mobile devices, and operate seamlessly across your personal ecosystem with military-grade safety guards.

---

## 🌟 Key Capabilities

- 🤖 **Autonomous Multi-Step Planning**: Understands high-level compound goals, decomposes them into dependency-ordered graphs, handles retries, variable passing (`{{step_1.output}}`), and automated result verification.
- 🎙️ **Voice-First & Hands-Free**: Low-latency voice loop with wake word detection (*"Seyal AI"*), dynamic renaming (*"Call yourself Aria"*), acoustic barge-in interruption, and non-visual audio feedback (earcons).
- 🔌 **Model Context Protocol (MCP)**: Native stdio/json-rpc MCP client & server manager to connect external tools (GitHub, Brave, SQLite, filesystem) dynamically into Seyal AI's ToolRegistry.
- 🛡️ **Enterprise Safety Guardrails**: Sensitive application shielding (Bitwarden, 1Password, KeePass, banking portals), system path blacklists (System32), payment gateway blocking, anti-kill protection, and automatic API key/credit card masking.
- ⚙️ **Scheduled Automations & Background Routines**: Persistent cron and interval-based desktop routines with execution telemetry and background orchestration.
- 🎨 **Deep Personalization & Communication Tones**: Configurable communication tones (*Action-First*, *Executive Advisor*, *Pair-Programmer Copilot*, *Technical Mentor*), custom instructions, and language auto-switching.
- 💻 **Complete Laptop & OS Automation**: 64 OS automation tools for window management, document conversion, audio control, application launching, and screen understanding.
- 🖥️ **Conversational Computer-Use**: Autonomous visual agent utilizing Set-of-Marks grounding, Per-Monitor v2 DPI-aware screen capture, Semantic UIA clicking, and multilingual voice shortcuts (English, Tamil, Tanglish).
- 🌐 **Browser Automation**: Full Playwright automation for navigating web pages, filling forms, and extracting live web content.
- 🧠 **Unified 6-Tier Memory & Dual-Mode Vector Store**: Working, Short-Term, Long-Term, Episodic, Semantic (Google Gemini `text-embedding-004` & local deterministic 256-dim n-gram vectorizer), and Procedural memory with pre-orchestration recall.
- 🧹 **Storage Maintenance & Nuclear Data Controls**: Live storage footprint analytics (vision frames, vectors, audio, logs), one-click cleanup, SQLite VACUUM optimization, and granular history purges.
- 🔔 **Multi-Channel Notifications**: Outbound webhook dispatchers for Discord, Slack, Telegram, and custom HTTP endpoints with delivery telemetry.
- 🔒 **Defense-in-Depth Security**: Granular permission scopes (view/revoke), AES-GCM encrypted secret vault, PIN-based device pairing, and dangerous command blockers.
- ⚡ **Offline Mode Fallback**: Deterministic local command execution (app launching, volume control, status queries, emergency stop) when internet or cloud LLMs are unavailable.
- 🚨 **Universal Kill Switch**: Emergency stop command (*"Seyal AI STOP"*) instantly halts all background tasks, sub-agents, and hardware actions.

---

## 🚀 Quick Start

### 1. Installation
```powershell
# Clone the repository
git clone https://github.com/seyal-ai/seyal_ai.git
cd seyal_ai

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install package with all dependencies
pip install -e ".[all,dev]"
```

### 2. Configuration
```powershell
cp .env.example .env
# Configure your preferred LLM and Speech API keys in .env
```

### 3. Launching Seyal AI
```powershell
# Interactive CLI mode
seyal_ai cli

# Voice-first hands-free mode
seyal_ai voice

# Background REST & WebSocket Server (Swagger at http://localhost:8000/docs)
seyal_ai serve --port 8000

# Full Desktop Application (Electron + React UI)
npm run dev
```

---

## 📚 Complete Documentation Suite

- 📖 [**Installation Guide**](docs/installation.md) — Comprehensive setup instructions for Windows, Linux, and macOS.
- 📖 [**User Guide**](docs/user_guide.md) — Daily usage, voice commands, multi-step examples, personalization, and routines.
- 📖 [**Developer Guide**](docs/developer_guide.md) — Architecture, creating custom tools, MCP integrations, and event-bus development.
- 📖 [**API Reference**](docs/api_reference.md) — Complete REST and WebSocket endpoint specifications.
- 📖 [**Security Documentation**](docs/security.md) — Threat model, safety guardrails, permission scopes, encryption, and audit logs.
- 📖 [**Architecture Documentation**](docs/architecture.md) — Deep dive into core subsystems, data flows, and concurrency.
- 📖 [**Troubleshooting Guide**](docs/troubleshooting.md) — Diagnostic checklists, error solutions, and recovery steps.

---

## 🏗️ System Architecture

```
User Voice / Text / API
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                       SeyalAiBrain                            │
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────┐ │
│  │ Identity / Wake │ │ Safety Guardrails│ │Personalization│ │
│  └─────────────────┘ └──────────────────┘ └───────────────┘ │
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────┐ │
│  │ Semantic Recall │ │ Permissions Guard│ │ Offline Engine│ │
│  └─────────────────┘ └──────────────────┘ └───────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌───────────────────────────┐ ┌──────────────────────────┐
   │ Autonomous Task Planner   │ │  Multi-Model Router      │
   │ - Goal Decomposition      │ │  - Gemini 2.0 Flash/Pro  │
   │ - Dynamic Tool Selection  │ │  - Claude 3.5 Sonnet     │
   │ - Plan Execution Engine   │ │  - GPT-4o / GPT-4o-mini  │
   │ - Verification & Retries  │ │  - Local Ollama          │
   └────────────┬──────────────┘ └────────────┬─────────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
        ┌───────────────────────────────────────────┐
        │       Unified Execution Sub-Agents        │
        │ ┌──────────────┐ ┌─────────────┐ ┌──────┐ │
        │ │ Laptop Agent │ │Android Agent│ │Vision│ │
        │ └──────────────┘ └─────────────┘ └──────┘ │
        │ ┌──────────────┐ ┌─────────────┐ ┌──────┐ │
        │ │Computer Use  │ │ MCP Manager │ │Routines│
        │ └──────────────┘ └─────────────┘ └──────┘ │
        └───────────────────────────────────────────┘
```

---

## 🧪 Testing & Verification

Seyal AI includes 12 comprehensive test suites covering all feature areas (570 tests passing):

```powershell
# Run the entire test suite (570 tests)
.\.venv\Scripts\python.exe -m pytest

# Static analysis and linting
ruff check .
npx pyright
mypy src
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
