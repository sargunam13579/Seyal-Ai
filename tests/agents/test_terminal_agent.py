"""
Unit and Integration Tests for Module 1: Sandboxed Terminal & CLI Agent.

Acceptance Criteria Verified:
- TERM-01: Safe command execution (exit_code == 0, stdout capture)
- TERM-02: Dangerous command interception (format, rmdir /s, reg delete HKLM, etc.)
- TERM-03: Timeout and process-tree termination (exit_code == -1, safety_status == 'timeout')
- TERM-04: Buffer truncation at 32 KB limit (is_truncated == True)
- TERM-05: Pydantic V2 immutability enforcement
- TERM-06: Working directory confinement and validation
- TERM-07: Confirmation workflow for high-risk operations
"""

from __future__ import annotations

import platform
from pathlib import Path

import pytest
from pydantic import ValidationError

from seyal_ai.agents.terminal import (
    TerminalAgent,
    TerminalAgentSecurityClassifier,
    TerminalClassification,
    TerminalRequest,
    TerminalResponse,
    TerminalSubprocessExecutor,
)
from seyal_ai.platform.security.terminal_security import CommandSafetyStatus


class TestTerminalAgentContracts:
    """Verifies TERM-05: Recursive immutability and schema validation."""

    def test_term05_request_immutability(self):
        """TerminalRequest fields cannot be reassigned or mutated."""
        req = TerminalRequest(command="echo 'test'", timeout_seconds=10.0, env_vars={"FOO": "bar"})

        with pytest.raises(ValidationError):
            req.command = "another command"  # type: ignore

        with pytest.raises(ValidationError):
            req.timeout_seconds = 60.0  # type: ignore

        # Ensure env_vars mapping is immutable MappingProxyType
        with pytest.raises(TypeError):
            req.env_vars["FOO"] = "baz"  # type: ignore

    def test_term05_response_immutability(self):
        """TerminalResponse fields cannot be reassigned or mutated."""
        resp = TerminalResponse(
            command="echo hello",
            exit_code=0,
            stdout="hello\n",
            stderr="",
            is_truncated=False,
            duration_ms=12.5,
            safety_status="allowed",
        )

        with pytest.raises(ValidationError):
            resp.exit_code = 1  # type: ignore

        with pytest.raises(ValidationError):
            resp.stdout = "modified"  # type: ignore

    def test_request_empty_command_rejected(self):
        """Empty or whitespace-only commands are rejected at schema level."""
        with pytest.raises(ValidationError):
            TerminalRequest(command="")

        with pytest.raises(ValidationError):
            TerminalRequest(command="   \t\n")


class TestTerminalClassifier:
    """Verifies TERM-02: Strict dangerous command interception."""

    @pytest.fixture
    def classifier(self):
        return TerminalAgentSecurityClassifier()

    @pytest.mark.parametrize(
        "dangerous_cmd",
        [
            "format C:",
            "format D: /fs:NTFS",
            "diskpart",
            "mkfs.ext4 /dev/sda1",
            "rmdir /s /q C:\\",
            "rmdir /S /Q D:\\Data",
            "del /f /s /q C:\\Windows\\System32",
            "Remove-Item -Recurse -Force C:\\",
            "reg delete HKLM\\Software\\Policies",
            "reg add HKLM\\Software\\Malware",
            "vssadmin delete shadows",
            "wbadmin delete catalog",
            "bcdedit /delete {current}",
            ":(){ :|:& };:",
            "powershell while(1){Start-Process powershell}",
        ],
    )
    def test_term02_strict_dangerous_commands_blocked(self, classifier: TerminalAgentSecurityClassifier, dangerous_cmd: str):
        """Dangerous system wipe commands must be strictly BLOCKED."""
        result = classifier.classify(dangerous_cmd)
        assert result.is_safe is False
        assert result.status == CommandSafetyStatus.BLOCKED
        assert len(result.reason) > 0

    @pytest.mark.parametrize(
        "safe_cmd",
        [
            "echo Hello Seyal AI",
            "python --version",
            "dir",
            "Get-Location",
            "git status",
            "npm --version",
        ],
    )
    def test_term01_safe_commands_allowed(self, classifier: TerminalAgentSecurityClassifier, safe_cmd: str):
        """Standard developer CLI commands must be verified as safe."""
        result = classifier.classify(safe_cmd)
        assert result.is_safe is True
        assert result.status in (CommandSafetyStatus.ALLOWED, CommandSafetyStatus.CONFIRM_REQUIRED)


@pytest.mark.asyncio
class TestTerminalExecutionEngine:
    """Verifies TERM-01, TERM-03, TERM-04, TERM-06, TERM-07 with live execution."""

    @pytest.fixture
    def agent(self):
        return TerminalAgent()

    async def test_term01_execute_safe_command(self, agent: TerminalAgent):
        """Safe echo command executes successfully with exit_code 0."""
        req = TerminalRequest(command="echo 'Seyal AI Terminal Test'")
        resp = await agent.execute(req)

        assert resp.exit_code == 0
        assert "Seyal AI Terminal Test" in resp.stdout
        assert resp.stderr == ""
        assert resp.is_truncated is False
        assert resp.safety_status == "allowed"
        assert resp.duration_ms > 0

    async def test_term02_agent_blocks_dangerous_command_without_executing(self, agent: TerminalAgent):
        """Agent intercepts format C: and never launches a subprocess."""
        req = TerminalRequest(command="format C:")
        resp = await agent.execute(req)

        assert resp.exit_code == 126
        assert resp.safety_status == "blocked"
        assert "strictly prohibited" in resp.stderr.lower()
        assert resp.stdout == ""

    async def test_term03_timeout_kills_process_tree(self, agent: TerminalAgent):
        """Long-running sleep is killed when timeout triggers and returns status 'timeout'."""
        # 1-second timeout against a 10-second sleep
        if platform.system() == "Windows":
            cmd = "Start-Sleep -Seconds 10"
        else:
            cmd = "sleep 10"

        req = TerminalRequest(command=cmd, timeout_seconds=1.0)
        resp = await agent.execute(req)

        assert resp.exit_code == -1
        assert resp.safety_status == "timeout"
        assert "timed out after 1.0 seconds" in resp.stderr
        assert "Process tree terminated" in (resp.error or "")

    async def test_term04_buffer_truncation_at_32kb(self, agent: TerminalAgent):
        """Subprocess output exceeding 32 KB is truncated with notification."""
        # Generate ~60 KB of output in PowerShell
        cmd = "powershell -Command \"1..2000 | ForEach-Object { 'Seyal-AI-Buffer-Padding-Data-1234567890' }\""
        req = TerminalRequest(command=cmd, timeout_seconds=15.0)
        resp = await agent.execute(req)

        assert resp.exit_code == 0
        assert resp.is_truncated is True
        assert len(resp.stdout) <= (32 * 1024 + 100)  # 32KB + truncation message
        assert "... [TRUNCATED at 32 KB]" in resp.stdout

    async def test_term06_working_directory_validation(self, agent: TerminalAgent, tmp_path: Path):
        """Command executes inside the specified directory; non-existent dir fails gracefully."""
        # Valid directory
        req_valid = TerminalRequest(command="Get-Location", working_dir=str(tmp_path))
        resp_valid = await agent.execute(req_valid)
        assert resp_valid.exit_code == 0
        assert tmp_path.name in resp_valid.stdout or str(tmp_path) in resp_valid.stdout

        # Invalid directory
        non_existent = tmp_path / "does_not_exist_xyz_123"
        req_invalid = TerminalRequest(command="dir", working_dir=str(non_existent))
        resp_invalid = await agent.execute(req_invalid)
        assert resp_invalid.exit_code == 1
        assert "Working directory does not exist" in resp_invalid.stderr

    async def test_term07_confirmation_rejection(self):
        """Confirmation handler returning False rejects command execution."""
        def reject_all(cmd: str, reason: str) -> bool:
            return False

        agent = TerminalAgent(confirmation_handler=reject_all)
        # git push requires confirmation in classifier
        req = TerminalRequest(command="git push origin main --force")
        resp = await agent.execute(req)

        assert resp.exit_code == 125
        assert resp.safety_status == "confirmation_required"
        assert "rejected by user" in resp.stderr
