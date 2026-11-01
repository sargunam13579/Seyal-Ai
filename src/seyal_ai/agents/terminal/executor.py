"""
Subprocess Execution Engine for Terminal Agent.

Provides process-tree termination on timeout via taskkill on Windows,
output buffer truncation (32 KB limit), and execution timing.
"""

from __future__ import annotations

import asyncio
import os
import platform
import subprocess
import time
from pathlib import Path
from typing import Any

from seyal_ai.agents.terminal.models import TerminalRequest, TerminalResponse
from seyal_ai.utils.logging import get_logger

log = get_logger("agents.terminal.executor")

MAX_BUFFER_CHARS: int = 32 * 1024  # 32 KB max output buffer


def kill_process_tree(pid: int) -> None:
    """
    Forcefully terminate a process and its entire descendant tree.
    Uses taskkill.exe /F /T on Windows to eliminate orphaned worker processes.
    """
    if platform.system() == "Windows":
        try:
            subprocess.run(
                ["taskkill.exe", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=5,
                check=False,
            )
            log.info("Process tree for PID %d terminated via taskkill.", pid)
        except Exception as e:
            log.warning("taskkill failed for PID %d: %s", pid, e)
    else:
        try:
            import signal
            killpg = getattr(os, "killpg", None)
            getpgid = getattr(os, "getpgid", None)
            sigkill = getattr(signal, "SIGKILL", getattr(signal, "SIGTERM", 9))
            if callable(killpg) and callable(getpgid):
                killpg(getpgid(pid), sigkill)
            else:
                os.kill(pid, sigkill)
        except Exception as e:
            log.warning("Process termination failed for PID %d: %s", pid, e)


class TerminalSubprocessExecutor:
    """
    Executes terminal commands inside an isolated subprocess with timeout and buffer limits.
    """

    def __init__(self, default_cwd: Path | str | None = None) -> None:
        self._default_cwd = Path(default_cwd or os.getcwd()).resolve()

    async def execute(self, request: TerminalRequest) -> TerminalResponse:
        """
        Execute the requested command inside an asynchronous subprocess.
        """
        cwd = Path(request.working_dir).resolve() if request.working_dir else self._default_cwd
        if not cwd.exists() or not cwd.is_dir():
            return TerminalResponse(
                command=request.command,
                exit_code=1,
                stdout="",
                stderr=f"Working directory does not exist: {cwd}",
                is_truncated=False,
                duration_ms=0.0,
                safety_status="allowed",
                error=f"DirectoryNotFound: {cwd}",
            )

        env = dict(os.environ)
        if request.env_vars:
            env.update(request.env_vars)

        # On Windows, wrap command in PowerShell execution
        if platform.system() == "Windows":
            cmd_args = [
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                request.command,
            ]
        else:
            cmd_args = ["/bin/sh", "-c", request.command]

        start_time = time.perf_counter()
        proc: asyncio.subprocess.Process | None = None

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(cwd),
                env=env,
            )

            # Wait for completion up to request.timeout_seconds
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(),
                timeout=request.timeout_seconds,
            )
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0

            raw_stdout = stdout_bytes.decode("utf-8", errors="replace")
            raw_stderr = stderr_bytes.decode("utf-8", errors="replace")

            # Check and apply buffer truncation
            is_truncated = False
            if len(raw_stdout) > MAX_BUFFER_CHARS:
                raw_stdout = raw_stdout[:MAX_BUFFER_CHARS] + "\n... [TRUNCATED at 32 KB]"
                is_truncated = True

            if len(raw_stderr) > MAX_BUFFER_CHARS:
                raw_stderr = raw_stderr[:MAX_BUFFER_CHARS] + "\n... [TRUNCATED at 32 KB]"
                is_truncated = True

            return TerminalResponse(
                command=request.command,
                exit_code=proc.returncode if proc.returncode is not None else 0,
                stdout=raw_stdout,
                stderr=raw_stderr,
                is_truncated=is_truncated,
                duration_ms=round(elapsed_ms, 2),
                safety_status="allowed",
                error=None if (proc.returncode == 0) else f"Process exited with non-zero status {proc.returncode}",
            )

        except TimeoutError:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.warning("Command '%s' timed out after %.1fs. Killing process tree.", request.command, request.timeout_seconds)

            if proc is not None and proc.pid is not None:
                kill_process_tree(proc.pid)
                try:
                    await asyncio.wait_for(proc.wait(), timeout=2.0)
                except Exception:
                    pass

            return TerminalResponse(
                command=request.command,
                exit_code=-1,
                stdout="",
                stderr=f"Command timed out after {request.timeout_seconds} seconds.",
                is_truncated=False,
                duration_ms=round(elapsed_ms, 2),
                safety_status="timeout",
                error=f"Execution timed out after {request.timeout_seconds} seconds. Process tree terminated.",
            )

        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            log.error("Unexpected execution error for command '%s': %s", request.command, e)
            if proc is not None and proc.pid is not None:
                kill_process_tree(proc.pid)

            return TerminalResponse(
                command=request.command,
                exit_code=1,
                stdout="",
                stderr=str(e),
                is_truncated=False,
                duration_ms=round(elapsed_ms, 2),
                safety_status="allowed",
                error=str(e),
            )
