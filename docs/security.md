# Seyal AI Security & Privacy Architecture

Security, user agency, privacy, and system safety are foundational principles of the **Seyal AI** agent architecture.

---

## 1. Threat Model & Defense-in-Depth

Seyal AI operates as an autonomous agent with local system access, device control, and network connectivity. To prevent misuse, unauthorized data extraction, and catastrophic system damage, Seyal AI enforces multiple security layers:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Voice & API Authentication (PIN, Tokens, Rate Limits)    │
├─────────────────────────────────────────────────────────────┤
│ 2. Granular Permission Scopes (View & Revoke)               │
├─────────────────────────────────────────────────────────────┤
│ 3. Dangerous Command Blocker & Sandbox Classifier          │
├─────────────────────────────────────────────────────────────┤
│ 4. Enterprise Safety Guardrails (App Shields & Path Blocks) │
├─────────────────────────────────────────────────────────────┤
│ 5. Two-Phase Confirmation Guard for High-Risk Actions        │
├─────────────────────────────────────────────────────────────┤
│ 6. PII & API Key Masking in Logs and Telemetry              │
├─────────────────────────────────────────────────────────────┤
│ 7. AES-GCM Encrypted Secret Vault (Keys & Credentials)      │
├─────────────────────────────────────────────────────────────┤
│ 8. Global Kill Switch & Emergency Stop                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Granular Permission Scopes

Seyal AI isolates hardware and sensitive system capabilities into distinct permission scopes:

| Scope | Description | Associated Tools | Default |
|---|---|---|---|
| `microphone` | Audio recording & continuous STT | `voice_record`, `speech_to_text` | Granted |
| `camera` | Webcam capture & visual OCR | `capture_camera`, `take_photo` | Granted |
| `screen_capture`| Desktop screen capture & vision | `screen_capture`, `screen_ocr` | Granted |
| `file_access` | Reading, writing, and deleting files | `find_files`, `read_file`, `write_file` | Granted |
| `notifications`| Desktop alert banners | `send_notification` | Granted |
| `accessibility`| Synthetic keyboard/mouse inputs | `click_element`, `type_text`, `press_hotkey` | Granted |
| `device_control`| Android ADB & cross-device tools | `android_adb`, `transfer_file` | Granted |

### Revocation Guarantee
When a scope is revoked, the tool executor instantly rejects any tool invocation requiring that capability with `PermissionAction.DENY` before any execution occurs.

---

## 3. Dangerous Terminal Command Protection

All shell and PowerShell commands pass through the `TerminalSecurityClassifier` (`src/seyal_ai/security/terminal_security.py`) prior to execution:

### Strictly Blocked Commands (`BLOCKED`)
- Disk formatting (`format c:`, `diskpart`, `bcdedit`)
- Fork bombs (`:(){ :|:& };:`, `%0|%0`)
- Root recursive deletions (`rm -rf /`, `rd /s /q c:\`)
- Arbitrary dynamic script downloads (`curl ... | iex`, `Set-ExecutionPolicy Unrestricted`)

### High-Risk Commands Requiring Explicit Confirmation (`CONFIRM`)
- Service stops/restarts (`net stop`, `Stop-Service`)
- Registry modifications (`Set-ItemProperty HKLM:...`)
- System power actions (`shutdown`, `Restart-Computer`)

---

## 4. Enterprise Safety Guardrails & Policy Enforcement (`seyal_ai.security.guardrails`)

Seyal AI includes a centralized policy enforcer that runs pre-flight boundary checks before any visual, synthetic input, or automation action is executed:

### Safety Profiles
Users can choose between three operational safety tiers:
1. **Zero-Trust**: Requires strict explicit confirmation for virtually all modifying actions, strictly blocks all sensitive applications, and restricts execution strictly to safe workspace directories.
2. **Balanced (Default)**: Protects credentials, prevents self-termination, blocks checkout/payment gateways, and prompts for file deletions and modifying shell commands.
3. **Developer**: Permits flexible terminal automation while still strictly enforcing anti-kill and credential vault protection.

### Sensitive Application Shielding
To prevent autonomous agents from accidentally or maliciously reading credentials or making unauthorized transactions, the guardrail actively inspects window titles and target processes:
- **Credential & Password Managers**: Automatically blocks access to `Bitwarden`, `1Password`, `KeePass`, `LastPass`, and Windows Credential Manager.
- **Payment & Checkout Windows**: Blocks automated interactions with checkout gateways, banking portals, and credit card input screens.

### System Boundary & Anti-Self-Kill
- **Blacklisted Directories**: Rejects any file manipulation targeting critical system directories (e.g., `C:\Windows`, `C:\Windows\System32`, `/etc`, `/usr/bin`).
- **Self-Preservation**: Rejects any attempt to terminate, kill, or close Seyal AI background daemons, Electron processes, or Python runtime engines.

### PII & Secret Redaction
- Automatic masking of API keys (`sk-...`, `AIza...`), credit card numbers, and password tokens in system logs, terminal telemetry, and event feeds.
- Persisted configuration saved in `~/.seyal_ai/safety.json`.

---

## 5. Cryptographic Secret Vault

Sensitive credentials (Gemini, OpenAI, Anthropic, Deepgram, and ElevenLabs API keys) are stored in an encrypted vault (`~/.seyal_ai/vault.enc`):
- **Cipher**: AES-256-GCM authenticated encryption.
- **Key Derivation**: PBKDF2-HMAC-SHA256 with 100,000 iterations and per-vault salt.
- **Key Storage**: Master key stored in restricted permissions file `~/.seyal_ai/keys/master.key` (POSIX `0600`).

---

## 6. Device Pairing & Handshake

To prevent unauthorized devices on the local network from sending commands to Seyal AI:
1. Devices must initiate a pairing handshake.
2. A random, time-limited 6-digit numeric PIN is generated and displayed on the host.
3. The connecting device must present the PIN within 300 seconds.
4. Upon validation, a cryptographically secure 256-bit device authorization token is issued.
5. Users can view and revoke paired devices at any time.

---

## 7. Universal Kill Switch & Emergency Stop

- **Voice Trigger**: Saying **`"Seyal AI STOP"`** or **`"EMERGENCY STOP"`** immediately invokes hard cancellation.
- **Execution Effect**:
  - Broadcasts cancellation signals across all active async worker tasks.
  - Aborts currently executing plans and stops synthetic keyboard/mouse automation immediately.
  - Terminates any spawned subprocesses and emits an audible warble earcon alert.

---

## 8. Audit Logging

Every tool execution, permission check, security block, authentication event, and device pairing is recorded in the append-only audit trail (`src/seyal_ai/security/audit.py` and SQLite `audit_log` table) for forensic review and full transparency.
