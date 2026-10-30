"""
Seyal AI — Model Context Protocol (MCP) Stdio Client.

Executes and manages external MCP server processes over standard I/O (stdio)
using JSON-RPC 2.0 framing and protocol negotiation.
"""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import time
from typing import Any

from seyal_ai.mcp.types import McpServerConfig, McpServerStatus, McpToolSpec
from seyal_ai.utils.logging import get_logger

log = get_logger("mcp.client")


class McpStdioClient:
    """Asynchronous JSON-RPC 2.0 Stdio Client for Model Context Protocol."""

    def __init__(self, config: McpServerConfig) -> None:
        self.config = config
        self._process: asyncio.subprocess.Process | None = None
        self._request_id = 0
        self._pending_requests: dict[int, asyncio.Future[dict[str, Any]]] = {}
        self._reader_task: asyncio.Task | None = None
        self._lock = asyncio.Lock()
        self._tools: list[McpToolSpec] = []

    @property
    def is_running(self) -> bool:
        return self._process is not None and self._process.returncode is None

    async def start(self) -> bool:
        """Launch the external MCP server process and perform initialize handshake."""
        async with self._lock:
            if self.is_running:
                return True

            cmd_parts = self.config.command.split()
            if not cmd_parts:
                self.config.status = McpServerStatus.ERROR
                self.config.last_error = "Empty command configured"
                return False

            executable = cmd_parts[0]
            # Resolve executable in system PATH
            resolved = shutil.which(executable)
            if not resolved and executable == "npx":
                resolved = shutil.which("npx.cmd") or "npx"

            env = {**os.environ, **self.config.env}

            try:
                start_time = time.perf_counter()
                cmd = [resolved or executable] + cmd_parts[1:] + self.config.args

                # Windows support: use shell=True if executing npm/npx script batch
                is_win = os.name == "nt"
                if is_win and cmd[0].endswith(".cmd") or cmd[0] == "npx":
                    self._process = await asyncio.create_subprocess_shell(
                        " ".join(cmd),
                        stdin=asyncio.subprocess.PIPE,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        env=env,
                    )
                else:
                    self._process = await asyncio.create_subprocess_exec(
                        cmd[0],
                        *cmd[1:],
                        stdin=asyncio.subprocess.PIPE,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                        env=env,
                    )

                self._reader_task = asyncio.create_task(self._listen_stdout())

                # Initialize Handshake
                init_res = await self._send_request(
                    "initialize",
                    {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"roots": {"listChanged": True}},
                        "clientInfo": {"name": "Seyal AI", "version": "0.1.7"},
                    },
                    timeout=8.0,
                )

                if "error" in init_res:
                    raise RuntimeError(f"MCP Initialize error: {init_res['error']}")

                # Send initialized notification
                await self._send_notification("notifications/initialized", {})

                # Query initial tools list
                await self.refresh_tools()

                latency = (time.perf_counter() - start_time) * 1000
                self.config.status = McpServerStatus.CONNECTED
                self.config.ping_ms = round(latency, 1)
                self.config.last_error = None
                log.info("Connected MCP server '%s' (%d tools, %.1fms)", self.config.id, len(self._tools), latency)
                return True

            except Exception as e:
                log.warning("Failed to start MCP server '%s': %s", self.config.id, e)
                self.config.status = McpServerStatus.ERROR
                self.config.last_error = str(e)
                await self.stop()
                return False

    async def stop(self) -> None:
        """Gracefully stop the server process."""
        if self._reader_task and not self._reader_task.done():
            self._reader_task.cancel()
            self._reader_task = None

        if self._process:
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=2.0)
            except Exception:
                try:
                    self._process.kill()
                except Exception:
                    pass
            self._process = None

        for fut in self._pending_requests.values():
            if not fut.done():
                fut.cancel()
        self._pending_requests.clear()
        self.config.status = McpServerStatus.DISCONNECTED

    async def ping(self) -> float:
        """Measure round-trip ping latency to server."""
        if not self.is_running:
            ok = await self.start()
            if not ok:
                return -1.0

        start = time.perf_counter()
        try:
            await self._send_request("ping", {}, timeout=3.0)
            latency = (time.perf_counter() - start) * 1000
            self.config.ping_ms = round(latency, 1)
            return self.config.ping_ms
        except Exception:
            # Fallback to tools/list ping
            try:
                await self._send_request("tools/list", {}, timeout=3.0)
                latency = (time.perf_counter() - start) * 1000
                self.config.ping_ms = round(latency, 1)
                return self.config.ping_ms
            except Exception as e:
                log.debug("MCP Ping failed for '%s': %s", self.config.id, e)
                return -1.0

    async def refresh_tools(self) -> list[McpToolSpec]:
        """Query tools/list from server and update local tools catalog."""
        res = await self._send_request("tools/list", {}, timeout=5.0)
        tools_list: list[McpToolSpec] = []
        result = res.get("result", {})
        raw_tools = result.get("tools", [])

        for t in raw_tools:
            spec = McpToolSpec(
                server_id=self.config.id,
                name=t.get("name", ""),
                description=t.get("description", ""),
                parameters=t.get("inputSchema", {}),
            )
            tools_list.append(spec)

        self._tools = tools_list
        self.config.tools = [t.name for t in tools_list]
        return self._tools

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> str:
        """Call a tool on the MCP server and return text content."""
        if not self.is_running:
            ok = await self.start()
            if not ok:
                raise RuntimeError(f"MCP server '{self.config.id}' is offline: {self.config.last_error}")

        res = await self._send_request(
            "tools/call",
            {"name": name, "arguments": arguments},
            timeout=30.0,
        )

        if "error" in res:
            raise RuntimeError(f"MCP Tool '{name}' error: {res['error']}")

        result = res.get("result", {})
        content_items = result.get("content", [])
        output_chunks = []
        for item in content_items:
            if isinstance(item, dict) and "text" in item:
                output_chunks.append(item["text"])
            else:
                output_chunks.append(str(item))

        return "\n".join(output_chunks) if output_chunks else json.dumps(result)

    async def _send_request(self, method: str, params: dict[str, Any], timeout: float = 10.0) -> dict[str, Any]:
        """Send JSON-RPC request and wait for matched response ID."""
        if not self._process or not self._process.stdin:
            raise RuntimeError("Process stdin not available")

        self._request_id += 1
        req_id = self._request_id

        payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params,
        }

        loop = asyncio.get_running_loop()
        fut: asyncio.Future[dict[str, Any]] = loop.create_future()
        self._pending_requests[req_id] = fut

        line = json.dumps(payload) + "\n"
        self._process.stdin.write(line.encode("utf-8"))
        await self._process.stdin.drain()

        try:
            return await asyncio.wait_for(fut, timeout=timeout)
        finally:
            self._pending_requests.pop(req_id, None)

    async def _send_notification(self, method: str, params: dict[str, Any]) -> None:
        """Send JSON-RPC notification (no response expected)."""
        if not self._process or not self._process.stdin:
            return

        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
        }
        line = json.dumps(payload) + "\n"
        self._process.stdin.write(line.encode("utf-8"))
        await self._process.stdin.drain()

    async def _listen_stdout(self) -> None:
        """Listen to server process stdout for JSON-RPC messages."""
        if not self._process or not self._process.stdout:
            return

        try:
            while not self._process.stdout.at_eof():
                line = await self._process.stdout.readline()
                if not line:
                    break
                text = line.decode("utf-8", errors="replace").strip()
                if not text:
                    continue

                try:
                    data = json.loads(text)
                    msg_id = data.get("id")
                    if msg_id in self._pending_requests:
                        fut = self._pending_requests[msg_id]
                        if not fut.done():
                            fut.set_result(data)
                except Exception:
                    # Ignore non-json debug lines output by tools
                    pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log.debug("MCP stdout listener closed for '%s': %s", self.config.id, e)
