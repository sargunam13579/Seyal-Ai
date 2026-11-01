# SEYAL AI — KNOWN ISSUES, RISKS & TECHNICAL DEBT
**Evidence-Based Inventory of Pending Remediations, Bugs, Gaps & Architectural Risks**
*Last Updated: 2026-10-31*
*Baseline Commit: `38620a1965526197f86f957d9490f885e06486ca`*

---

## 1. High-Priority Security Gaps (Pending Phase B3.2 Work)

### SEC-GAP-01: Audit-Log Sensitive Data Exposure
- **Severity:** High
- **Location:** [`src/seyal_ai/security/audit.py`](file:///d:/seyal_ai/src/seyal_ai/security/audit.py) lines 30–103
- **Evidence:** `AuditLogger.log_tool_execution()`, `log_auth_event()`, and `log_security_event()` accept arbitrary `parameters` and `details` dictionaries and pass them directly to `AuditRepository.log_action()`.
- **Risk:** Sensitive user credentials, API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), passwords, JWT tokens, and device tokens are persisted unmasked in the local SQLite audit database.
- **Remediation Plan:** Phase B3.2 Stage 2 — Implement recursive sensitive key & pattern redaction (`redact_sensitive_data`) before persisting any audit record.

### SEC-GAP-02: Windows NTFS Key-File Permissions Bypassed
- **Severity:** High
- **Location:** [`src/seyal_ai/security/crypto.py`](file:///d:/seyal_ai/src/seyal_ai/security/crypto.py) lines 82–84, 186–188; [`pairing.py`](file:///d:/seyal_ai/src/seyal_ai/security/pairing.py) lines 102–104
- **Evidence:** Code explicitly bypasses permission restriction on Windows:
  ```python
  if os.name != "nt":
      os.chmod(self._master_key_file, 0o600)
  ```
- **Risk:** On Windows machines, `~/.seyal_ai/keys/master.key`, `~/.seyal_ai/vault.enc`, and `~/.seyal_ai/paired_devices.json` inherit default parent directory ACLs, allowing any standard user or process on a multi-user machine to read encryption master keys and vaults.
- **Remediation Plan:** Phase B3.2 Stage 3 — Implement platform-aware `restrict_file_permissions` using Windows SID-based ACLs (`icacls` without `shell=True` or `win32security`), granting access strictly to the current user and SYSTEM.

---

## 2. Incomplete Features & Prototype Skeletons

### GAP-01: Autonomous Research Agent Pipeline (Module 2)
- **Status:** `PARTIALLY COMPLETE`
- **Location:** `src/seyal_ai/agents/research/` (`agent.py`, `planner.py`, `searcher.py`, `synthesizer.py`)
- **Evidence:** Minimal 60-line pipeline prototype exists. Connects to `WebSearchBrowserTool` and `ModelRouter`, but has the following critical production gaps:
  - **Single-Pass Only:** No iterative research loop or recursion depth limit; queries are planned once and executed linearly.
  - **No Citation Verification:** Generated Markdown citations are not fact-checked, cross-referenced with scraped text, or verified against active URLs.
  - **No Source Deduplication:** Duplicate domains or identical search result snippets across queries are not deduplicated.
  - **Zero Automated Tests:** Has zero dedicated automated unit/integration tests in `tests/`.
  - **No REST API Endpoint:** Not wired into FastAPI routing (`src/seyal_ai/api/routes/`).
  - **No React View:** Only frontend TypeScript types exist (`frontend/src/features/research_agent/types.ts`); no interactive UI view.

### GAP-02: Computer Use Multi-Monitor Capture Limitation
- **Severity:** Medium
- **Location:** [`src/seyal_ai/vision/capture.py`](file:///d:/seyal_ai/src/seyal_ai/vision/capture.py) line 205
- **Evidence:** Multi-monitor screen capture hardcodes primary monitor:
  ```python
  monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
  ```
- **Risk:** In multi-monitor Windows setups, if the target application window resides on secondary display `sct.monitors[2]`, the agent captures only the primary screen (`sct.monitors[1]`), causing OCR coordinate mismatch and mis-clicks.
- **Remediation Plan:** Enhance `capture_screen` to accept a target display index or dynamically resolve coordinates to the active monitor containing the focused UIA window.

### GAP-03: Voice Subsystem Hardware AEC & Noise Suppression Reliance
- **Severity:** Medium
- **Location:** [`src/seyal_ai/voice/`](file:///d:/seyal_ai/src/seyal_ai/voice/) (`vad.py`, `pipeline.py`)
- **Evidence:** Voice pipeline includes Silero neural VAD and barge-in cut-off, but has NO digital software Acoustic Echo Cancellation (AEC) or active background noise suppression filters in Python.
- **Risk:** Relies entirely on underlying OS audio drivers or headset hardware AEC. On laptops using built-in speakers and microphones simultaneously, TTS playback can trigger VAD false-positives and unwanted barge-in interruptions.
- **Remediation Plan:** Add client-side WebRTC AEC in Electron frontend audio capture before streaming raw PCM chunks to the backend WebSocket.

### GAP-04: Personal AI Agent & Cross-Device Continuity (Module 3)
- **Status:** `IMPLEMENTED BUT UNVERIFIED`
- **Location:** `src/seyal_ai/agents/personal/` (`agent.py`)
- **Evidence:** Bare single-turn wrapper around `SeyalAiBrain`. Connects to memory, but lacks cross-device sync protocols, calendar/email integrations, or proactive background alerts.

### GAP-05: Personal Life OS (Module 4)
- **Status:** `PARTIALLY COMPLETE`
- **Location:** `src/seyal_ai/agents/life_os/` (`agent.py`, `briefing.py`, `habits.py`)
- **Evidence:** Simple habit streak counter and template-based daily briefing exist. Lacks database persistence for wellness/finance metrics, reminder schedulers, or frontend UI components.

### GAP-06: Multi-Agent AI Company (Module 5)
- **Status:** `PARTIALLY COMPLETE`
- **Location:** `src/seyal_ai/agents/multi_agent/` (`agent.py`, `bus.py`, `roles.py`)
- **Evidence:** In-memory queue message bus and basic role definitions (CEO, PM, Coder, QA) exist. Lacks artifact code generation verification, test execution sandboxing, and frontend visual task boards.

---

## 3. Duplicate Implementations & Legacy Technical Debt

### DUP-01: Split Security Location (Root vs. Platform)
- **Status:** `DUPLICATED`
- **Location:** Production code in `src/seyal_ai/security/`; stub in `src/seyal_ai/platform/security/__init__.py`.
- **Evidence:** `platform/security/` only exports 3 symbols (`PermissionScopeManager`, `PermissionScope`, `SecurityGuardrails`), while callers still import directly from `seyal_ai.security.*`.
- **Resolution:** Phase B3.3 will canonicalize all security files into `src/seyal_ai/platform/security/` and establish clean backward-compatible forwarders.

### DUP-02: Tools, Voice, and Vision Platform Stubs
- **Status:** `DUPLICATED / PENDING CANONICALIZATION`
- **Location:** Full engines in `src/seyal_ai/tools/`, `voice/`, `vision/`; one-line `__init__.py` stubs in `src/seyal_ai/platform/tools/`, `voice/`, `vision/`.
- **Resolution:** Canonicalize shared low-level tool, voice, and vision drivers into `platform/` during Phase B4/B5.

---

## 4. Performance, Concurrency & Threading Bottlenecks

### PERF-01: PyAutoGUI & Win32 Blocking Synchronous I/O
- **Severity:** Medium
- **Location:** `src/seyal_ai/agents/computer_use/actions/keyboard.py`, `mouse.py`
- **Evidence:** Calls to `pyautogui.moveTo()`, `pyautogui.click()`, and Win32 key simulation block the thread synchronously during execution delays. Handled via `asyncio.to_thread` in some callers, but risks blocking the primary asyncio loop if called directly.

### PERF-02: Silero VAD Torch JIT Deprecation Warnings
- **Severity:** Low (Maintenance)
- **Location:** `src/seyal_ai/voice/vad.py`
- **Evidence:** Pytest outputs 8 warnings: `DeprecationWarning: torch.jit.load is deprecated. Please switch to torch.export.`
- **Action:** Plan migration to `torch.export` when PyTorch 2.5+ becomes mandatory.
