# Seyal AI Developer Guide

This guide is intended for engineers contributing to or extending the Seyal AI codebase.

---

## 1. Project Architecture & Directory Layout

```
seyal_ai/
├── config/                 # Default TOML configuration (default.toml)
├── docs/                   # Complete documentation suite
├── electron/               # Electron main process and window lifecycle
├── frontend/               # React + TypeScript + TailwindCSS desktop interface
├── src/
│   └── seyal_ai/
│       ├── accessibility/  # Earcons, custom macros, screen reader formatters
│       ├── agents/         # Sub-agents (LaptopAgent, AndroidAgent, ComputerUseAgent)
│       ├── api/            # FastAPI REST & WebSocket routers, middleware
│       ├── automation/     # Desktop UI automation, scheduled routine scheduler
│       ├── browser/        # Playwright browser automation
│       ├── comms/          # Cross-device WebSocket & pairing protocol
│       ├── core/           # SeyalAiBrain, ModelRouter, ToolRegistry, Orchestrator
│       ├── database/       # SQLite / SQLAlchemy models, engines, background sync
│       ├── devices/        # Unified Device Manager (laptop, android, remote)
│       ├── evals/          # AI behavioral evaluations, reply speed & telemetry guards
│       ├── llm/            # Multi-model LLM provider adapters (Gemini, OpenAI, Anthropic, Ollama)
│       ├── mcp/            # Model Context Protocol manager, stdio client, dynamic tools
│       ├── memory/         # Unified 6-tier memory manager, dual-mode vector store
│       ├── notifications/  # Multi-channel webhook dispatcher (Discord, Slack, Telegram)
│       ├── personalization/# Tone directives, custom instructions, profile settings
│       ├── planning/       # Autonomous TaskPlanner, ToolSelector, ExecutionEngine
│       ├── reliability/    # Self-correction, retry systems, offline fallback
│       ├── security/       # Cryptographic vault, safety guardrails, permissions, terminal security
│       ├── services/       # User knowledge and background synchronization services
│       ├── tools/          # Extensible Tool Base & 60+ system tools
│       ├── utils/          # EventBus, async logging, cancellation tokens
│       ├── vision/         # Screen capture (DPI-aware), OCR, visual element detection
│       └── voice/          # VAD (Silero), STT (Gemini/Vosk), TTS (Edge/pyttsx3), acoustic barge-in
├── tests/                  # 570 tests across 12 test suites (AI testing pyramid)
├── package.json            # Electron & frontend build scripts
└── pyproject.toml          # Python package definitions & dependencies
```

---

## 2. Development Setup

### Virtual Environment & Dependencies
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[all,dev]"
```

### Static Analysis & Type Checking
We maintain a zero-diagnostic policy across the codebase:
```powershell
# Fast linting and import sorting
ruff check .

# Static type checking
npx pyright
mypy src
```

### Running Tests
Seyal AI includes 570 unit, integration, evals, and system tests:
```powershell
# Run the entire test suite
.\.venv\Scripts\python.exe -m pytest

# Run a specific test module
.\.venv\Scripts\python.exe -m pytest tests/security/test_security.py
```

---

## 3. Creating Custom Tools

To add a new tool to Seyal AI, subclass `BaseTool` in `src/seyal_ai/tools/`:

```python
from typing import Any
from seyal_ai.tools.base import BaseTool, RiskLevel, TargetDevice, ToolResult

class CustomDataTool(BaseTool):
    name = "custom_data_lookup"
    description = "Lookup records from external database."
    risk_level = RiskLevel.LOW
    target_device = TargetDevice.LAPTOP

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search keyword"},
            },
            "required": ["query"],
        }

    async def execute(self, query: str) -> ToolResult:
        try:
            data = await perform_lookup(query)
            return ToolResult(success=True, output=data)
        except Exception as e:
            return ToolResult(success=False, error=str(e))
```

Register the tool in `src/seyal_ai/core/brain.py` or with `ToolRegistry.register(CustomDataTool())`.

---

## 4. Model Context Protocol (MCP) Extensibility

External tool providers can be integrated using MCP:
```python
from seyal_ai.mcp import get_mcp_manager
from seyal_ai.mcp.types import McpServerConfig

manager = get_mcp_manager()
config = McpServerConfig(
    id="custom_server",
    name="Custom Server",
    command="python",
    args=["-m", "my_mcp_server"],
    enabled=True,
)
await manager.save_server(config)
await manager.connect_all()
```
Tools exposed by the MCP server are automatically bridged into Seyal AI's `ToolRegistry` and made available for task planning.

---

## 5. Enforcing Safety Guardrails in Sub-Agents

When adding new actions or automation routines, always invoke the central safety guardrails before execution:

```python
from seyal_ai.security.guardrails import get_safety_guardrails

guard = get_safety_guardrails()
is_safe, reason = guard.check_action_safety(action)
if not is_safe:
    return {"success": False, "error": reason, "blocked_by_safety": True}
```

---

## 6. Event Bus Architecture

Seyal AI uses an asynchronous publish-subscribe `EventBus` (`src/seyal_ai/utils/events.py`) to broadcast state changes across decoupled subsystems without circular dependencies:

```python
from seyal_ai.utils.events import get_event_bus

bus = get_event_bus()

# Subscribe to events
async def on_task_progress(event):
    print(f"Task {event.payload['plan_id']} progress: {event.payload['percent']}%")

bus.subscribe("task.progress", on_task_progress)

# Emit event
await bus.emit("task.progress", {"plan_id": "plan_123", "percent": 50.0})
```

---

## 7. Coding Guidelines

- **Type Annotations**: All public functions and methods must have complete PEP 484 type annotations.
- **Asynchronous Execution**: Long-running or I/O operations must be `async def`.
- **Error Handling**: Catch specific exceptions and log with structured loggers (`get_logger(__name__)`). Never let unhandled exceptions crash background event loops.
- **DPI & Multi-Monitor**: When capturing screens or sending synthetic inputs, ensure Per-Monitor DPI awareness is preserved.
