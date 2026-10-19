"""
Seyal AI API Testing Suite.

Verifies FastAPI HTTP endpoints, route handling, request/response validation,
middleware headers, and error handling across all core API services:
1. API-01: Root Service Discovery Endpoint (`GET /`).
2. API-02: Health Liveness Check Endpoint (`GET /api/health`).
3. API-03: Subsystem Readiness Probe (`GET /api/ready`).
4. API-04: System Awareness Live Telemetry (`GET /api/system/awareness/live`).
5. API-05: System Awareness Active Window Introspection (`GET /api/system/awareness/active-window`).
6. API-06: Accessibility Voice Macros Listing & Creation (`GET/POST /api/accessibility/commands`).
7. API-07: Conversational Computer-Use Agent Status (`GET /api/computer-use/status`).
8. API-08: Conversational Computer-Use Emergency Stop (`POST /api/computer-use/stop`).
9. API-09: User Knowledge Vault Storage & Retrieval (`GET/POST /api/user-hub/knowledge`).
10. API-10: Middleware Tracing Headers & HTTP 404/422 Error Handling.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from seyal_ai.api.app import create_app

# ===========================================================================
# 1. ROOT & SERVICE DISCOVERY API TESTS
# ===========================================================================


class TestRootServiceDiscoveryAPI:
    """Verifies service discovery, root endpoint, and documentation URLs."""

    @pytest.mark.asyncio
    async def test_api_root_endpoint_service_discovery(self):
        """
        API-01: Root endpoint ('GET /') must return 200 OK with service name,
        version, docs route, and health check URL.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/")

            assert response.status_code == 200
            data = response.json()
            assert data.get("name") == "Seyal AI API"
            assert "version" in data
            assert data.get("docs") == "/docs"
            assert data.get("health") == "/api/health"


# ===========================================================================
# 2. HEALTH & READINESS PROBE API TESTS
# ===========================================================================


class TestHealthAndReadinessAPI:
    """Verifies process liveness and deep subsystem readiness probes."""

    @pytest.mark.asyncio
    async def test_api_health_liveness_check(self):
        """
        API-02: 'GET /api/health' must return 200 OK with status='ok',
        version, uptime, and system metadata.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/health")

            assert response.status_code == 200
            data = response.json()
            assert data.get("status") == "ok"
            assert "version" in data
            assert "uptime_seconds" in data
            assert isinstance(data.get("uptime_seconds"), (int, float))

    @pytest.mark.asyncio
    async def test_api_readiness_probe(self):
        """
        API-03: 'GET /api/ready' must return 200 OK with detailed status of
        underlying subsystems (api_server, database, brain, tools).
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/ready")

            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert "subsystems" in data
            subsystems = data["subsystems"]
            assert subsystems.get("api_server") == "ok"
            assert "database" in subsystems
            assert "brain" in subsystems


# ===========================================================================
# 3. SYSTEM AWARENESS API TESTS
# ===========================================================================


class TestSystemAwarenessAPI:
    """Verifies laptop introspection endpoints for active windows and live telemetry."""

    @pytest.mark.asyncio
    async def test_api_system_awareness_live_telemetry(self):
        """
        API-04: 'GET /api/system/awareness/live' must return 200 OK with
        real-time laptop metrics (active window, battery, memory).
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/system/awareness/live")

            assert response.status_code == 200
            data = response.json()
            assert data.get("success") is True
            assert "data" in data

    @pytest.mark.asyncio
    async def test_api_system_awareness_active_window(self):
        """
        API-05: 'GET /api/system/awareness/active-window' must return 200 OK
        with foreground window metadata.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/system/awareness/active-window")

            assert response.status_code == 200
            data = response.json()
            assert data.get("success") is True
            assert "data" in data


# ===========================================================================
# 4. ACCESSIBILITY & VOICE MACROS API TESTS
# ===========================================================================


class TestAccessibilityCommandsAPI:
    """Verifies listing and creating voice macro commands."""

    @pytest.mark.asyncio
    async def test_api_accessibility_custom_commands_lifecycle(self):
        """
        API-06: 'GET /api/accessibility/commands' lists voice macros, and
        'POST /api/accessibility/commands' registers a new macro successfully.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. List existing commands
            list_resp = await client.get("/api/accessibility/commands")
            assert list_resp.status_code == 200
            list_data = list_resp.json()
            assert "commands" in list_data
            assert "count" in list_data

            # 2. Create new custom command
            create_payload = {
                "phrase": "start my dev session",
                "actions": ["open terminal", "open vscode"],
                "description": "Automated morning developer routine",
            }
            create_resp = await client.post("/api/accessibility/commands", json=create_payload)
            assert create_resp.status_code == 200
            create_data = create_resp.json()
            assert create_data.get("success") is True


# ===========================================================================
# 5. COMPUTER-USE AGENT API TESTS
# ===========================================================================


class TestComputerUseAgentAPI:
    """Verifies Computer-Use agent status inspection and emergency kill switch."""

    @pytest.mark.asyncio
    async def test_api_computer_use_status_inspection(self):
        """
        API-07: 'GET /api/computer-use/status' returns the current execution state,
        task active flag, and step history.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/computer-use/status")

            assert response.status_code == 200
            data = response.json()
            assert "status" in data
            assert "is_task" in data
            assert "history" in data
            assert isinstance(data.get("history"), list)

    @pytest.mark.asyncio
    async def test_api_computer_use_emergency_stop(self):
        """
        API-08: 'POST /api/computer-use/stop' triggers an immediate emergency stop
        signal and returns status='stopped'.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/computer-use/stop")

            assert response.status_code == 200
            data = response.json()
            assert data.get("status") == "stopped"
            assert "Emergency stop" in data.get("message", "")


# ===========================================================================
# 6. USER KNOWLEDGE HUB API TESTS
# ===========================================================================


class TestUserKnowledgeHubAPI:
    """Verifies User Knowledge Vault key-value storage and retrieval."""

    @pytest.mark.asyncio
    async def test_api_user_knowledge_vault_crud(self):
        """
        API-09: 'GET /api/user-hub/knowledge' retrieves stored facts, and
        'POST /api/user-hub/knowledge' updates a key-value entry.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Fetch current knowledge
            get_resp = await client.get("/api/user-hub/knowledge")
            assert get_resp.status_code == 200
            assert isinstance(get_resp.json(), dict)

            # 2. Update knowledge item
            update_payload = {"key": "preferred_editor", "value": "VS Code"}
            post_resp = await client.post("/api/user-hub/knowledge", json=update_payload)
            assert post_resp.status_code == 200
            updated_data = post_resp.json()
            assert updated_data.get("preferred_editor") == "VS Code"


# ===========================================================================
# 7. MIDDLEWARE TRACING & ERROR HANDLING API TESTS
# ===========================================================================


class TestMiddlewareAndErrorHandlingAPI:
    """Verifies response tracing headers, 404 handling, and 422 validation errors."""

    @pytest.mark.asyncio
    async def test_api_middleware_tracing_headers_and_error_codes(self):
        """
        API-10: Middleware must inject 'X-Request-ID' and 'X-Response-Time' headers on all responses.
        Non-existent routes return 404, and invalid payloads return 422 Unprocessable Entity.
        """
        app = create_app()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Verify tracing headers
            res = await client.get("/api/health")
            assert "x-request-id" in res.headers
            assert "x-response-time" in res.headers

            # 2. Verify 404 Not Found
            r404 = await client.get("/api/non_existent_endpoint_xyz")
            assert r404.status_code == 404

            # 3. Verify 422 Unprocessable Entity on missing required payload fields
            r422 = await client.post("/api/user-hub/knowledge", json={})
            assert r422.status_code == 422
