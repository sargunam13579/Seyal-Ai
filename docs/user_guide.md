# Seyal AI User Guide

Welcome to **Seyal AI**, your voice-first, multimodal, cross-device personal AI agent.

---

## 1. Getting Started

### Starting the Agent
You can interact with Seyal AI in three primary modes:

```powershell
# 1. Interactive CLI (Text & Rich UI)
seyal_ai cli

# 2. Voice-First Mode (Continuous hands-free voice loop)
seyal_ai voice

# 3. Background REST & WebSocket Server
seyal_ai serve --port 8000

# 4. Desktop Electron App (Full UI)
npm run dev
```

---

## 2. Voice & Hands-Free Interaction

### Default Wake Word & Naming
- **Wake Word**: Say *"Seyal AI"* or *"Hey Seyal"* followed by your command.
- **Renaming the Assistant**:
  Say: *"Seyal AI, call yourself Aria"* or *"Seyal AI, change your name to Maya"*.
  Seyal AI will ask for confirmation: *"Do you want me to change my name to Aria?"*.
  Reply: *"Yes"*.

### Audio Feedback (Earcons)
Seyal AI provides non-visual auditory feedback:
- **Ascending Tone**: Wake word recognized / listening.
- **Melodic Chime**: Task or command completed successfully.
- **Low Tone**: Error or retry in progress.
- **Alert Beep**: Risky action requires confirmation.
- **Warble Tone**: Emergency stop triggered.

### Acoustic Interruption (Barge-In)
When Seyal AI is speaking, you can interrupt naturally simply by speaking. The neural Voice Activity Detector (VAD) detects speech, mutes output immediately, and captures your new turn.

---

## 3. Autonomous Multi-Step Planning

Seyal AI can understand complex, multi-step user goals, decompose them into steps, select tools, and execute them safely:

### Example Goal:
> *"Seyal AI, find my latest resume, convert it to PDF, rename it Shanmuga_Resume, and send it to my phone."*

### What Seyal AI Does:
1. **[Step 1] Find Files**: Searches user workspace for resume documents (`*.docx`, `*.pdf`).
2. **[Step 2] Identify Latest**: Inspects file modification timestamps to select the most recent version.
3. **[Step 3] Convert Format**: Converts `.docx` to `.pdf`.
4. **[Step 4] Rename File**: Renames output artifact to `Shanmuga_Resume.pdf`.
5. **[Step 5] Cross-Device Transfer**: Transfers the file to your paired Android phone via ADB / secure socket.
6. **[Step 6] Verification**: Validates delivery and file integrity.

---

## 4. Emergency Stop & Universal Kill Switch

Safety and user control are fundamental in Seyal AI:

- **Soft Task Cancellation**:
  - Voice: *"Seyal AI stop"* or *"Cancel current task"*
  - Halts safe-to-stop actions at the current step.
- **Hard Emergency Stop (Kill Switch)**:
  - Voice / Text: **`"Seyal AI STOP"`** or **`"EMERGENCY STOP"`**
  - Instantly aborts all active planning threads, terminates running background sub-processes, and stops hardware interactions immediately.

---

## 5. Personalization & Communication Tones

Customize how Seyal AI communicates and reasons to match your preferred workflow:

### Available Tones:
- **Action-First Operator (`action`)**: Ultra-concise, immediate execution with zero conversational fluff.
- **Executive Advisor (`executive`)**: Structured high-level executive summaries, risk assessments, and strategic action items.
- **Pair-Programmer Copilot (`copilot`)**: Technical partner providing modular code, architecture notes, and testing patterns.
- **Technical Mentor (`mentor`)**: Detailed educational explanations, step-by-step guidance, and deep dives.

### Custom Prompt Directives:
Add custom guidelines like:
> *"Prefer Tamil when speaking aloud, English when writing code. Always write modular Python & TypeScript. Prefer PowerShell syntax for Windows commands."*

---

## 6. Scheduled Automations & Daily Desktop Routines

Schedule repetitive tasks to run automatically in the background without needing manual prompting:
- **Pre-configured Routines**:
  - *Workstation System Diagnostics*: Daily health check on CPU, disk, tools, and memory.
  - *Workspace Maintenance & Git Hygiene*: Weekly cleanup of temporary artifacts and status review.
- **Custom Schedules**:
  - Set daily runs at specific times (e.g. `09:00`) or recurring minute intervals (e.g. every `60` minutes).
  - Manage routines directly in the desktop app UI or via `/api/automation/routines`.

---

## 7. Connecting External Tools via MCP (Model Context Protocol)

Seyal AI natively supports the Model Context Protocol, enabling you to plug in external tools seamlessly:
- **GitHub MCP Server**: Manage PRs, issues, and code directly through voice commands.
- **Brave Search MCP**: Add real-time live web research.
- **SQLite & Postgres MCP**: Query databases using natural language.
- Connect any stdio-based MCP server through the UI or `~/.seyal_ai/mcp_servers.json`.

---

## 8. Safety Guardrails & Protecting Sensitive Windows

Seyal AI provides enterprise-grade safety guardrails to ensure autonomous actions never endanger personal data:
- **Password Manager Protection**: Automatically detects and blocks synthetic mouse or keyboard interactions with Bitwarden, 1Password, KeePass, or LastPass.
- **Payment Gateway Blocking**: Intercepts checkout and credit card forms, preventing unauthorized financial transactions.
- **System Boundary Enforcement**: Blocks modifications to Windows system files (`C:\Windows\System32`).
- **PII Masking**: API keys, credentials, and payment card numbers are automatically masked in all UI logs and terminal telemetry.

---

## 9. Storage Footprint & System Maintenance

Keep your machine clean with built-in storage management:
- **Live Footprint Analytics**: See exact disk usage across vision frames, audio cache, ChromaDB vectors, and logs.
- **One-Click Cleanup**: Safely reclaim disk space by purging temporary vision frames and audio recordings.
- **Database Optimization**: Compact and optimize SQLite database performance via `VACUUM`.
- **Data Privacy**: Purge conversation histories, wipe knowledge attributes, or execute a factory reset.

---

## 10. Multilingual Computer-Use Shortcuts (Tamil & English)

Seyal AI recognizes conversational and local voice shortcuts for instant OS control:
- *"desktop kaatu"* / *"டெஸ்க்டாப் காட்டு"* / *"show desktop"* ➔ Minimize all windows (`Win+D`)
- *"window moodu"* / *"விண்டோவை மூடு"* / *"close app"* ➔ Close foreground window (`Alt+F4`)
- *"lock pannu"* / *"lock computer"* ➔ Lock workstation (`Win+L`)
- *"task manager"* ➔ Open Windows Task Manager (`Ctrl+Shift+Esc`)

---

## 11. Permissions & Security

Seyal AI isolates hardware and sensitive system capabilities into distinct permission scopes:
- `microphone`: Audio listening and voice recording
- `camera`: Camera capture and visual OCR
- `screen_capture`: Screen analysis and multimodal vision
- `file_access`: Local file reading, writing, and conversion
- `notifications`: Desktop alert banners
- `accessibility`: UI tree inspection and input automation
- `device_control`: Android ADB and cross-device tools

```powershell
# View and toggle permissions via CLI
seyal_ai permissions list
seyal_ai permissions revoke camera
seyal_ai permissions grant camera
```

---

## 12. Device Pairing (Cross-Device)

Pair your Android phone or secondary laptop with Seyal AI:

1. Initiate pairing:
   ```powershell
   seyal_ai pairing initiate --device "Pixel 8"
   # Output: PIN: 849201 (Valid for 5 minutes)
   ```
2. On your phone / client app:
   Submit PIN `849201` to authorize the connection and establish end-to-end encrypted communication.
3. Manage paired devices:
   ```powershell
   seyal_ai pairing list
   seyal_ai pairing revoke <device_id>
   ```

---

## 13. Offline Mode Fallback

When disconnected from the internet or if cloud LLM endpoints are unreachable, Seyal AI automatically falls back to local deterministic execution:
- Open desktop applications (*"open notepad"*, *"open chrome"*)
- Adjust volume (*"set volume to 50"*, *"mute audio"*)
- Check battery and system status (*"battery status"*)
- List and search local workspace files
- Immediate emergency stop execution
