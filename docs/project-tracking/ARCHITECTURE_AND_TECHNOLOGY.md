# SEYAL AI — ARCHITECTURE & TECHNOLOGY INVENTORY
**Comprehensive Engineering Reference, Design Patterns & Execution Pipelines**
*Last Updated: 2026-10-31*
*Target Architecture: Modular Monolith with Clean Architectural Boundaries*

---

## 1. Architectural Strategy & Product Direction

### 1.1. Online-First / Cloud Inference vs. Local Persistence
There has been ambiguity regarding the presence of Ollama and SQLite in an "online-first" application. The actual architectural role of each component is strictly defined as follows:

1. **AI Inference is Online-First:**
   - Primary production inference relies 100% on cloud AI models:
     - **Google Gemini** (`google-genai`): Fast reasoning, multimodal vision, multilingual STT.
     - **OpenAI** (`openai`): Structured tool calling, fallback reasoning.
     - **Anthropic** (`anthropic`): Complex computer-use action planning.
     - **Microsoft Edge Neural TTS** (`edge-tts`): High-definition cloud voice synthesis.
   - **Ollama's Role:** `OllamaProvider` is strictly an optional developer/local fallback. If the local Ollama daemon (`http://localhost:11434`) is not running, `ModelRouter` skips it without error. It does NOT mean the product is intended as an offline AI appliance.

2. **SQLite's Role is Zero-Lag Desktop Persistence & Caching:**
   - Seyal AI uses local SQLite (`aiosqlite` at `~/.seyal_ai/seyal_ai.db`) for **Local-First Zero-Latency Persistence**:
     - **0ms App Startup:** UI renders instantly from local SQLite without waiting for cloud round-trips.
     - **Local Caching:** Stores conversation history, device registrations, audit trails, and user settings.
   - **Cloud Synchronization (`DatabaseSyncManager` in `platform/database/sync.py`):**
     - When Supabase/Cloud PostgreSQL is connected: Performs **Cloud-First Ordered Writes** (writes to remote cloud, then commits to local SQLite).
     - When offline or unreachable: Writes immediately to local SQLite and appends an entry to `SyncOutbox`. The moment network connectivity resumes, the background worker pushes queued items to the cloud sequentially.

---

## 2. Platform Canonicalization & Migration Status

The transition from a monolithic root package to a structured `platform/` layer is currently in a **Hybrid State**:

| Platform Subsystem | Canonical Implementation Path | Legacy / Forwarder Path | Canonicalization Status | Runtime Import Source |
| :--- | :--- | :--- | :---: | :--- |
| **Database** | `src/seyal_ai/platform/database/` | `src/seyal_ai/database/` | **FULLY CANONICALIZED** | Canonical engine & repositories; forwarders preserve backwards compatibility |
| **LLM** | `src/seyal_ai/platform/llm/` | `src/seyal_ai/llm/` | **FULLY CANONICALIZED** | `ModelRouter` and providers run from `platform/llm/`; forwarders re-export |
| **Memory** | `src/seyal_ai/platform/memory/` | `src/seyal_ai/memory/` | **FULLY CANONICALIZED** | Vector store, JSON storage, and context resolver run from `platform/memory/` |
| **Security** | `src/seyal_ai/security/` | `src/seyal_ai/platform/security/__init__.py` | **HYBRID TRANSITION** | Production security lives in root `security/`; `platform/security/` is a 3-symbol stub |
| **Voice** | `src/seyal_ai/voice/` | `src/seyal_ai/platform/voice/__init__.py` | **DOMAIN LAYER** | Production engines live in root `voice/`; `platform/voice/` is an empty stub |
| **Vision** | `src/seyal_ai/vision/` | `src/seyal_ai/platform/vision/__init__.py` | **DOMAIN LAYER** | Capture and OCR live in root `vision/`; `platform/vision/` is a stub |
| **Tools** | `src/seyal_ai/tools/` | `src/seyal_ai/platform/tools/__init__.py` | **DOMAIN LAYER** | System, OS, browser tools live in root `tools/`; `platform/tools/` is an empty stub |

*Architectural Target:* Phase B3.3 will canonicalize Security into `platform/security/`. Phases B4 and B5 will canonicalize Voice, Vision, and Tools into `platform/`.

---

## 3. Computer-Use Execution Engine: The Closed-Loop Cycle (Demystifying "OUDAV")

In previous reports, the term "OUDAV" was referenced. To eliminate any architectural confusion:
* **"OUDAV" is NOT an external library or custom pattern.**
* It is simply an acronym shorthand for the five sequential stages of the closed-loop agent execution cycle:
  $$\textbf{Observe} \longrightarrow \textbf{Understand} \longrightarrow \textbf{Decide} \longrightarrow \textbf{Act} \longrightarrow \textbf{Verify}$$
* **Actual Code Implementation:** Implemented in [`src/seyal_ai/agents/computer_use/execution/single_goal.py`](file:///d:/seyal_ai/src/seyal_ai/agents/computer_use/execution/single_goal.py) inside the class `SingleGoalExecutionMixin`.

### Execution Stages in Code:
1. **Stage 1 — Observe (`_capture_observation`):**
   - Grabs current desktop frame via `ScreenCaptureController` (using `mss`).
   - Retrieves active foreground window title, process name, and rectangle bounds via Win32 `GetForegroundWindow()`.
2. **Stage 2 — Understand (`_grounding.detect_elements`):**
   - Runs WinRT OCR to parse visible text and bounding boxes.
   - Runs `pywinauto` UIA tree dump to identify buttons, input fields, and checkboxes.
3. **Stage 3 — Decide (`_router.generate` / `generate_vision`):**
   - Feeds observation, active window context, user goal, and step history into the vision model (Claude 3.5 Sonnet or Gemini 2.5).
   - Generates a structured JSON `ComputerAction` (`CLICK`, `TYPE`, `SCROLL`, `KEY_COMBINATION`, `WAIT`, `STOP`).
4. **Stage 4 — Act (`_executor.execute_action`):**
   - Checks `SecurityGuardrails` (high-risk actions like file deletion or window close require user confirmation).
   - Dispatches keyboard/mouse events via `pyautogui` and `pynput`.
5. **Stage 5 — Verify (`_verify_step`):**
   - Captures subsequent screen frame, computes visual delta or window state changes, checks whether an error popup appeared, and updates progress history.
   - **Failure Handling:** If an action fails or UI does not change, it logs an observation warning, injects error feedback into the LLM history, and re-plans with an altered strategy (retry with different coordinates or hotkey).

---

## 4. Voice Subsystem Architecture & Code-Switching

### 4.1. Audio Pipeline
- **Input Stream:** 16kHz 16-bit mono PCM stream captured via `sounddevice` into a circular numpy buffer.
- **Acoustic VAD:** `Silero-VAD` neural network processes 30ms frames (512 samples). Probability $>0.5$ triggers speech onset.
- **Barge-In (Interruption):** When VAD detects user speech while TTS audio playback is active, orchestrator immediately stops audio playback in `<100ms` and clears the playback queue (`orchestrator.py:268`).

### 4.2. Multilingual Routing (Tamil / Tanglish / English)
- **Speech-to-Text:** `GeminiMultilingualTranscriber` natively accepts raw PCM audio and transcribes mixed Tamil, Tanglish, and English code-switching.
- **Text-to-Speech Routing:** In `sentence.py:38`, before speaking text, a regex check `bool(re.search(r"[\u0B80-\u0BFF]", text))` detects Tamil Unicode script. If present, it automatically routes to high-definition Tamil neural voice (`ta-IN-PallaviNeural` or `ta-IN-ValluvarNeural` via Edge-TTS) ensuring authentic pronunciation.

---

## 5. Security & Cryptographic Architecture

### 5.1. Unconditional JWT Verification (Phase B3.1)
- Implemented in `src/seyal_ai/security/supabase_auth.py:51`.
- Mandatory cryptographic signature verification: `algorithms=["HS256"]`, `audience="authenticated"`, `verify_exp=True`.
- The `verify_signature=False` argument has been completely removed. Blank or missing secrets fail closed immediately (`return None`).

### 5.2. Device Pairing & PIN Protection (Phase B3.2 Stage 1 — CLOSED)
- Implemented in `src/seyal_ai/security/pairing.py:150`.
- 6-digit cryptographically secure PIN generation.
- Strict limit of 5 failed attempts per session. On the 5th failed attempt, the session is deleted immediately from memory.
- Uses `hmac.compare_digest()` for constant-time comparison.
- Added strict `.isascii()` validation prior to comparison to eliminate Python `TypeError` on Tamil/Unicode characters. Unicode full-width and Arabic-Indic digits are rejected without normalization.
- Plaintext PIN values are purged from all application log statements.
