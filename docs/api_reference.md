# Seyal AI REST & WebSocket API Reference

The Seyal AI backend provides a comprehensive REST and WebSocket API for client applications, browser extensions, mobile companions, and voice peripherals.

Base URL: `http://localhost:8000/api`
Interactive Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

---

## 1. Core Endpoints

### `GET /api/health`
Healthcheck diagnostic endpoint.
- **Response**: `{"status": "ok", "version": "0.1.0", "uptime_seconds": 120.4, "active_tasks": 0}`

### `POST /api/chat`
Send a single message or multi-turn conversational turn.
- **Request Body**:
  ```json
  {
    "message": "Find latest resume and send to my phone",
    "session_id": "optional_session_uuid",
    "stream": false
  }
  ```
- **Response**:
  ```json
  {
    "response": "Found resume and initiated transfer to your phone.",
    "session_id": "session_uuid",
    "tier_used": "smart"
  }
  ```

---

## 2. Multi-Step Task Endpoints (`/api/tasks`)

### `POST /api/tasks`
Submit a high-level goal for decomposition and execution.
- **Request Body**:
  ```json
  {
    "goal": "Find my resume, convert to PDF, rename it Shanmuga_Resume, and send to my phone",
    "execute_now": true
  }
  ```
- **Response**:
  ```json
  {
    "plan": {
      "plan_id": "plan_948210fe",
      "total_steps": 6,
      "status": "completed"
    },
    "execution": {
      "success": true,
      "steps_executed": 6,
      "duration_seconds": 2.45
    }
  }
  ```

### `GET /api/tasks`
List all historical and active multi-step plans.

### `GET /api/tasks/{task_id}`
Get detailed status and step-by-step progress for a task.

### `POST /api/tasks/{task_id}/cancel`
Cancel an active task gracefully.

### `POST /api/tasks/emergency/stop`
Trigger an immediate hard emergency stop across all running tasks.

---

## 3. Permissions Endpoints (`/api/permissions`)

### `GET /api/permissions`
List all capability permission scopes (`microphone`, `camera`, `screen_capture`, `file_access`, `notifications`, `accessibility`, `device_control`) and their grant status.

### `POST /api/permissions/grant`
Grant a permission scope.
- **Request Body**: `{"scope": "camera"}`

### `POST /api/permissions/revoke`
Revoke a permission scope.
- **Request Body**: `{"scope": "camera"}`

### `POST /api/permissions/reset`
Reset all permission scopes to default granted state.

---

## 4. Device Pairing Endpoints (`/api/pairing`)

### `POST /api/pairing/initiate`
Initiate pairing handshake and generate a time-limited 6-digit PIN.
- **Request Body**: `{"device_name": "Pixel 8", "device_type": "phone"}`
- **Response**: `{"session_id": "sess_89f02", "pin": "849201", "expires_in_seconds": 300}`

### `POST /api/pairing/verify`
Verify 6-digit PIN and receive permanent device token.
- **Request Body**: `{"session_id": "sess_89f02", "pin": "849201"}`
- **Response**: `{"success": true, "device_id": "dev_phone_001", "device_token": "token_xyz"}`

### `GET /api/pairing/devices`
List all authorized paired devices.

### `DELETE /api/pairing/devices/{device_id}`
Revoke access for a paired device.

---

## 5. Model Context Protocol (MCP) Endpoints (`/api/mcp`)

### `GET /api/mcp/servers`
List all configured external MCP servers, status, connection type, and bridged tools.

### `POST /api/mcp/servers`
Register or update an MCP server configuration.
- **Request Body**:
  ```json
  {
    "id": "github",
    "name": "GitHub MCP",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxx"},
    "enabled": true
  }
  ```

### `POST /api/mcp/servers/{server_id}/toggle`
Enable or disable an MCP server connection.
- **Request Body**: `{"enabled": true}`

### `POST /api/mcp/servers/{server_id}/ping`
Ping server and test connection latency.
- **Response**: `{"success": true, "ping_ms": 14.2}`

---

## 6. Scheduled Automations & Routines (`/api/automation`)

### `GET /api/automation/routines`
List all scheduled and triggerable desktop automations.

### `POST /api/automation/routines/{routine_id}/run`
Trigger immediate execution of an automation routine in the background.

### `POST /api/automation/routines/{routine_id}/toggle`
Enable or disable scheduled trigger for a routine.

---

## 7. System Maintenance & Storage Footprint (`/api/system`)

### `GET /api/system/storage/stats`
Retrieve real-time storage disk footprint.
- **Response**:
  ```json
  {
    "storagePath": "C:\\Users\\user\\.seyal_ai",
    "visionSize": 12.4,
    "vectorSize": 4.1,
    "audioSize": 8.0,
    "logsSize": 1.2,
    "totalUsedMb": 25.7,
    "reclaimableMb": 21.6
  }
  ```

### `POST /api/system/storage/clean`
Trigger targeted storage cleanup.
- **Request Body**: `{"type": "all"}` (options: `"vision"`, `"audio"`, `"logs"`, `"vacuum"`, `"all"`)

### `POST /api/system/data/purge-conversations`
Purge all conversation history while preserving core configuration.

### `POST /api/system/data/wipe-knowledge`
Wipe learned semantic memory and user knowledge attributes.

### `POST /api/system/data/factory-reset`
Nuclear factory reset restoring default application state.
- **Request Body**: `{"confirm_nuclear": true}`

---

## 8. Notifications & Webhook Endpoints (`/api/notifications`)

### `POST /api/notifications/test-webhook`
Test delivery of an alert to a target Discord, Slack, Telegram, or custom webhook URL.
- **Request Body**: `{"webhook_url": "https://discord.com/api/webhooks/..."}`
- **Response**: `{"success": true, "statusCode": 204, "latencyMs": 142}`

### `GET /api/notifications/history`
Retrieve persistent historical notification audit log.

### `DELETE /api/notifications/history`
Clear historical notification event log.

---

## 9. Personalization Endpoints (`/api/personalization`)

### `GET /api/personalization`
Get active user communication tone, custom instructions, and behavioral settings.
- **Response**:
  ```json
  {
    "communicationTone": "action",
    "customInstructions": "Prefer Tamil when speaking aloud, English when writing code.",
    "proactiveSuggestions": true,
    "languageAutoSwitching": true,
    "conciseCodeOnly": false
  }
  ```

### `PUT /api/personalization`
Update user personalization settings and refresh runtime system prompts.

---

## 10. Safety Guardrails Endpoints (`/api/safety`)

### `GET /api/safety`
Get active safety profile (`zero_trust`, `balanced`, `developer`), blocked applications, and boundary rules.

### `PUT /api/safety`
Update safety policies, protected app list, and confirmation triggers.

---

## 11. Accessibility & Custom Commands (`/api/accessibility`)

### `GET /api/accessibility/commands`
List all configured custom voice shortcuts and compound macros.

### `POST /api/accessibility/commands`
Register a new custom voice command.

### `POST /api/accessibility/audio/earcon`
Play a test audio earcon chime (`wake`, `success`, `error`, `confirmation`, `emergency_stop`).

---

## 12. Voice & Audio WebSocket

### `WS /api/voice/ws`
Full-duplex real-time audio streaming WebSocket with Silero VAD, acoustic barge-in interruption detection, and interim STT.
- **Audio Format**: 16kHz, 16-bit Mono Linear PCM.
- **Interruption Event**: Emits `{"event": "barge_in"}` immediately when acoustic speech is detected mid-playback.
