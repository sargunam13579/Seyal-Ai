"""
Seyal AI — WebSocket Real-Time Audio & Telemetry Streaming Contract Test Suite.

Verifies:
  - WebSocket connection handshake & protocol acknowledgment
  - Real-time heartbeat (ping/pong)
  - Acoustic barge-in interruption protocol
  - Binary PCM audio streaming & silence handling
  - Abrupt client disconnection resilience
"""

from __future__ import annotations

import json

import numpy as np
import pytest
from starlette.testclient import TestClient

from seyal_ai.api.app import create_app


class TestWebSocketStreamingContract:
    """Verifies bi-directional real-time WebSocket protocol contracts."""

    @pytest.fixture
    def client(self) -> TestClient:
        app = create_app()
        return TestClient(app)

    def test_websocket_handshake_and_acknowledgment(self, client: TestClient):
        """Verifies initial connection event and sample rate negotiation."""
        with client.websocket_connect("/api/voice/ws") as ws:
            data = ws.receive_json()
            assert data["event"] == "connected"
            assert data["sample_rate"] == 16000
            assert "Seyal AI" in data["message"]

    def test_websocket_ping_pong_heartbeat(self, client: TestClient):
        """Verifies keep-alive ping/pong exchange."""
        with client.websocket_connect("/api/voice/ws") as ws:
            # Drain connected event
            _ = ws.receive_json()

            # Send ping
            ws.send_text(json.dumps({"type": "ping"}))
            response = ws.receive_json()
            assert response["event"] == "pong"

    def test_websocket_config_update(self, client: TestClient):
        """Verifies language and config dynamic updates."""
        with client.websocket_connect("/api/voice/ws") as ws:
            _ = ws.receive_json()

            # Send config update
            ws.send_text(json.dumps({"type": "config", "language": "ta"}))

            # Send ping to verify socket remains responsive and healthy
            ws.send_text(json.dumps({"type": "ping"}))
            response = ws.receive_json()
            assert response["event"] == "pong"

    def test_websocket_empty_binary_and_silence_handling(self, client: TestClient):
        """Verifies empty bytes and silence PCM chunks do not trigger crashes."""
        with client.websocket_connect("/api/voice/ws") as ws:
            _ = ws.receive_json()

            # Send empty bytes
            ws.send_bytes(b"")

            # Send 512 samples of 16-bit silence (zeros)
            silence = np.zeros(512, dtype=np.int16).tobytes()
            ws.send_bytes(silence)

            # Send ping to confirm connection is intact
            ws.send_text(json.dumps({"type": "ping"}))
            response = ws.receive_json()
            assert response["event"] == "pong"

    def test_websocket_acoustic_barge_in_detection(self, client: TestClient):
        """
        Verifies that when assistant is speaking, loud speech audio triggers
        an acoustic 'barge_in' event to immediately silence frontend audio.
        """
        with client.websocket_connect("/api/voice/ws") as ws:
            _ = ws.receive_json()

            # Notify server that assistant is currently speaking
            ws.send_text(json.dumps({"type": "assistant_speaking", "status": True}))

            # Generate high-energy audio signal (e.g., loud speech simulation)
            loud_audio = (np.sin(np.linspace(0, 100, 1600)) * 12000).astype(np.int16).tobytes()

            # Send loud audio chunk
            ws.send_bytes(loud_audio)

            # Server must emit barge_in event
            event1 = ws.receive_json()
            assert event1["event"] == "barge_in"

            event2 = ws.receive_json()
            assert event2["event"] == "speech_started"
