# SEYAL AI — NEXT STEPS & IMMEDIATE DEVELOPMENT ROADMAP
**Sequential Execution Plan from Security Completion to the 5 Core Modules**
*Last Updated: 2026-10-31*
*Active Branch: `refactor/security-remediation`*
*Baseline Commit: `38620a1965526197f86f957d9490f885e06486ca`*

---

## 1. Current Project Stage
We have verified and formally closed **Phase B3.2 Stage 1 (PIN Protection & Non-ASCII Hardening)**:
- 5-attempt PIN brute-force lockout.
- Non-ASCII & Unicode digit safe rejection without exception.
- Constant-time `hmac.compare_digest`.
- Zero plaintext PIN logging.
- Baseline: 637 backend tests passed, Pyright: 0 errors, Commit `38620a1`.
- **Status:** `COMPLETE / CLOSED` (Reviewed and accepted).

---

## 2. Immediate Sequential Execution Roadmap

```
[Phase B3.2 Stage 1: PIN Protection] ──► [CLOSED / VERIFIED (Commit 38620a1)]
                 │
                 ▼
[Phase B3.2 Stage 2: Audit-Log Redaction] ──► [CLOSED / VERIFIED (42/42 Tests Passing)]
                 │
                 ▼
[Phase B3.2 Stage 3: Windows Key-File ACLs] ──► [CLOSED / VERIFIED (6/6 Tests Passing)]
                 │
                 ▼
[Phase B3.4: Database Engine & Offline Sync] ──► [CLOSED / VERIFIED (12/12 Tests Passing)]
                 │
                 ▼
[Phase B3.3: Platform Security Canonicalization] ──► [CLOSED / VERIFIED (4/4 Canonical Tests Passing)]
                 │
                 ▼
══════════════════════════════════════════════════════════════════════
 ★ PHASE B3 (SECURITY REMEDIATION) IS OFFICIALLY 100% COMPLETE & CLOSED ★
══════════════════════════════════════════════════════════════════════
                 │
                 ▼
[Module 1: Sandboxed Terminal & CLI Agent] ──► [CLOSED / VERIFIED (30/30 Tests Passing)]
                 │
                 ▼
[Module 2: Computer Use Agent (Mouse, Keyboard & UI)] ──► [CLOSED / VERIFIED (32/32 Tests Passing)]
                 │
                 ▼
[Module 3: Autonomous Browser Agent with SSRF Pinning] ──► [CLOSED / VERIFIED (23/23 Tests Passing)]
                 │
                 ▼
[Module 4: Android & External Devices Agent (ADB)] ──► [CLOSED / VERIFIED (16/16 Tests Passing)]
                 │
                 ▼
[Module 5: Multimodal Vision & UI Grounding Agent] ──► [CLOSED / VERIFIED (12/12 Tests Passing)]
                 │
                 ▼
══════════════════════════════════════════════════════════════════════
 ★ ALL 5 AGENT MODULES ARE OFFICIALLY 100% IMPLEMENTED & VERIFIED ★
                (113 / 113 Tests Passing, 0 Pyright Errors)
══════════════════════════════════════════════════════════════════════
                 │
                 ▼
[Plan 4: Supervisor Orchestrator & PolicyEngine Architecture] ──► [CLOSED / VERIFIED (25/25 Tests Passing, 0 Pyright Errors)]
                 │
                 ▼
[Plan 8: Product Module 2 — Autonomous Deep Research Agent] ──► [READY FOR IMPLEMENTATION]
```

### Active Interactive Plan Artifacts (with Proceed Buttons):
1. **[Plan 1: Phase B3.2 Stage 2 — Audit-Log Sensitive Data Redaction (Revision 3)](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_stage2_audit_redaction.md)**
2. **[Plan 2: Phase B3.2 Stage 3 — Windows NTFS Key-File ACL Permissions](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_stage3_windows_ntfs_acl.md)**
3. **[Plan 3: Five Core Agent Modules & Supervisor Overview](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_phase3_five_agent_modules.md)**
4. **[Plan 3.1: Module 1 — Sandboxed Terminal & CLI Agent](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_module1_terminal_agent.md)**
5. **[Plan 3.2: Module 2 — Computer Use Agent (Mouse, Keyboard & UI Automation)](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_module2_computer_use_agent.md)**
6. **[Plan 3.3: Module 3 — Autonomous Browser Agent with SSRF Socket Pinning](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_module3_browser_agent.md)**
7. **[Plan 3.4: Module 4 — Android & External Devices Agent (ADB Orchestration)](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_module4_android_devices_agent.md)**
8. **[Plan 3.5: Module 5 — Multimodal Vision & UI Grounding Agent](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_module5_vision_agent.md)**
9. **[Plan 4: Supervisor Orchestrator & PolicyEngine Architecture](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_supervisor_orchestrator_policy_engine.md)**
10. **[Plan 5: Voice Pipeline Engine (Whisper VAD + Kokoro TTS)](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_voice_pipeline_engine.md)**
11. **[Plan 6: Database Engine & Offline-First Cloud Sync (SQLite + PostgreSQL)](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_database_sync_engine.md)**
12. **[Plan 7: Phase B3.3 — Platform Security Canonicalization](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_platform_security_canonicalization.md)**
13. **[Plan 8: Product Module 2 — Autonomous Deep Research Agent](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_product_module2_research_agent.md)**
14. **[Plan 9: Product Module 3 — Universal Personal AI Agent](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_product_module3_personal_ai_agent.md)**
15. **[Plan 10: Product Module 4 — Personal Life OS](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_product_module4_personal_life_os.md)**
16. **[Plan 11: Product Module 5 — Multi-Agent AI Company](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_product_module5_multi_agent_company.md)**
17. **[Plan 12: Desktop Shell & Frontend UI Architecture (Electron + React 18)](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_frontend_desktop_ui.md)**
18. **[Plan 13: Android Native Companion App Architecture (Kotlin & Compose)](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_android_companion_app.md)**
19. **[Plan 14: Autonomous Red-Teaming & E2E Agent Benchmarking Suite](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_red_team_and_benchmarks.md)**
20. **[Plan 15: Windows Packaging, Code Signing & CI/CD Auto-Updates](file:///C:/Users/pgsar/.gemini/antigravity-ide/brain/3c164b3d-2ec3-4091-a494-fcce036274c3/plan_packaging_ci_cd_auto_update.md)**

---

## 3. Detailed Scope & Acceptance Criteria for Upcoming Tasks

### Task 1: Implement Phase B3.2 Stage 2 (Audit-Log Sensitive Data Redaction)
* **Status:** `SPECIFICATION READY / AWAITING AUTHORIZATION`
* **Target File:** [`src/seyal_ai/security/audit.py`](file:///d:/seyal_ai/src/seyal_ai/security/audit.py)
* **Test File:** `tests/security/test_audit.py`
* **Requirements:**
  1. Implement `redact_sensitive_data(data: Any) -> Any` that recursively traverses dicts, lists, and strings without mutating input data or crashing on circular references.
  2. Mask values whose keys match sensitive patterns (case-insensitive): `api_key`, `secret`, `password`, `token`, `bearer`, `authorization`, `pin`, `jwt`, `credential`, `private_key`, replacing them with `"[REDACTED]"`.
  3. Detect and mask recognizable secret strings (Bearer tokens `Bearer eyJ...`, Anthropic `sk-ant-...`, Google `AIzaSy...`).
  4. Ensure all calls in `AuditLogger` sanitize payloads prior to sending to `AuditRepository`.
  5. Add dedicated test suite verifying nested structures, circular references, case insensitivity, and preservation of non-sensitive parameters.

---

### Task 2: Implement Stage 3 (Windows Key-File ACL Permissions)
* **Target Files:** [`src/seyal_ai/security/crypto.py`](file:///d:/seyal_ai/src/seyal_ai/security/crypto.py), [`src/seyal_ai/security/pairing.py`](file:///d:/seyal_ai/src/seyal_ai/security/pairing.py)
* **Test File:** `tests/security/test_crypto_security.py`
* **Requirements:**
  1. Implement platform-aware `restrict_file_permissions(path: Path) -> None`.
  2. On POSIX: `os.chmod(path, 0o600)`.
  3. On Windows: Use Windows SID (avoiding shell command injection; `shell=False`) to restrict NTFS access strictly to the current user and SYSTEM.
  4. Atomic creation or post-creation lockdown with fail-closed behavior on non-NTFS volumes.
  5. Apply to `master.key`, `vault.enc`, and `paired_devices.json`.
  6. Add unit tests verifying permission application on Windows and POSIX without crashing.

---

### Task 3: Complete Phase B3.3 (Platform Security Canonicalization)
* **Target Action:** Relocate files from `src/seyal_ai/security/` to `src/seyal_ai/platform/security/`.
* **Requirements:**
  1. Canonicalize `supabase_auth.py`, `pairing.py`, `crypto.py`, `audit.py`, `permissions.py`, `guardrails.py`, `terminal_security.py`, `red_team.py`.
  2. Establish backward-compatible forwarders in `src/seyal_ai/security/`.
  3. Verify all 114 security tests and full 637 backend test suite pass.
  4. Formally declare **Phase B3 APPROVED & CLOSED**.

---

### Task 4: Begin Phase C — Module 2: Autonomous Research Agent
* **Objective:** Elevate the prototype in `src/seyal_ai/agents/research/` into a complete, enterprise-grade research engine.
* **Core Capabilities to Implement:**
  1. **Topic Decomposition:** Recursive multi-query generation (`planner.py`).
  2. **Multi-Source Scraping:** Enhanced web extraction, PDF reader tool integration, and rate limiting (`searcher.py`).
  3. **Information Extraction & Citations:** Structured Markdown report synthesis with numbered URL citations (`synthesizer.py`).
  4. **REST API Endpoint:** `/api/research/execute` and `/api/research/status` endpoints in `api/routes/research.py`.
  5. **Frontend View:** React research dashboard with real-time progress steps and markdown viewer in `frontend/src/features/research_agent/`.
  6. **Automated Test Suite:** Comprehensive unit & integration tests in `tests/research/test_research_agent.py`.

---

## 4. Master Tracking Workflow Rules
For all future tasks, the agent and developers MUST strictly follow this 10-step protocol:
1. **Consult Tracking Docs:** Read [`MASTER_IMPLEMENTATION_CHECKLIST.md`](./MASTER_IMPLEMENTATION_CHECKLIST.md).
2. **Confirm Existing Status:** Never re-implement what is already `COMPLETE`.
3. **Identify Reusable Code:** Always reuse canonical platform engines (`platform/llm/`, `platform/memory/`, etc.).
4. **Define Strict Scope:** Limit edits strictly to the approved phase/stage.
5. **Establish Acceptance Criteria:** Agree on explicit test expectations before writing code.
6. **Implement Code:** Write clean, typed, documented Python/TypeScript code.
7. **Verify Locally:** Run focused tests, full security suite, full backend suite, and Pyright.
8. **Inspect Diff:** Check `git diff` to ensure zero unintended changes or formatting noise.
9. **Update Tracking Checklist:** Update feature status, test evidence, and commit hash in `MASTER_IMPLEMENTATION_CHECKLIST.md`.
10. **Record History & Next Action:** Update `IMPLEMENTATION_HISTORY.md` and `NEXT_STEPS.md`.
