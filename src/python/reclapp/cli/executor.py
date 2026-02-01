"""
Dynamic Task Executor for Python

Watches task files and executes commands with live markdown output.
Similar to Dockerfile-style execution with parallel workers.

Mirrors: src/core/contract-ai/evolution/task-executor.ts
@version 2.4.1
"""

import asyncio
import os
import re
import time
from datetime import datetime
from typing import Dict, List, Optional, Set, Any
from pathlib import Path

from .runner import ShellRenderer


class ExecutorTask:
    """Task definition for the executor"""
    def __init__(self, id: str, command: str, timeout: int = 60000, cwd: Optional[str] = None):
        self.id = id
        self.command = command
        self.timeout = timeout
        self.cwd = cwd or os.getcwd()
        self.state = "pending"  # pending, running, done, failed, timeout
        self.started_at: Optional[float] = None
        self.completed_at: Optional[float] = None
        self.exit_code: Optional[int] = None
        self.stdout: List[str] = []
        self.stderr: List[str] = []
        self.error: Optional[str] = None


class TaskExecutor:
    """
    Executes commands from a task file or manually added.
    Supports parallel execution with a fixed number of workers.
    """
    
    def __init__(self, max_workers: int = 3, verbose: bool = True):
        self.max_workers = max_workers
        self.verbose = verbose
        self.renderer = ShellRenderer(verbose=verbose)
        self.tasks: Dict[str, ExecutorTask] = {}
        self.queue: List[str] = []
        self.running: Set[str] = set()
        self.task_counter = 0
        self.loop = asyncio.get_event_loop()
        
    def add_task(self, command: str, timeout: int = 60000, task_id: Optional[str] = None) -> ExecutorTask:
        """Add a single task to the queue"""
        self.task_counter += 1
        tid = task_id or f"task-{self.task_counter}"
        task = ExecutorTask(tid, command, timeout=timeout)
        self.tasks[tid] = task
        self.queue.append(tid)
        return task
        
    def add_tasks_from_file(self, file_path: str) -> None:
        """Parse tasks from a file (Dockerfile-style or bash lines)"""
        p = Path(file_path)
        if not p.exists():
            self.renderer.error(f"Task file not found: {file_path}")
            return
            
        content = p.read_text()
        for line in content.splitlines():
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("#"):
                continue
                
            # Parse command and optional timeout: cmd # timeout: 120
            timeout = 60000
            match = re.match(r"^(.+?)\s+#\s*timeout:\s*(\d+)$", trimmed)
            if match:
                cmd_part = match.group(1)
                timeout = int(match.group(2)) * 1000
            else:
                cmd_part = trimmed
                
            self.add_task(cmd_part, timeout=timeout)
            
    async def run_task(self, task_id: str) -> None:
        """Execute a single task using subprocess"""
        task = self.tasks[task_id]
        task.state = "running"
        task.started_at = time.time()
        self.running.add(task_id)
        
        self.renderer.info(f"🚀 [START] {task.command}")
        
        try:
            # Create subprocess
            proc = await asyncio.create_subprocess_shell(
                task.command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=task.cwd
            )
            
            # Read output concurrently with timeout
            async def read_stream(stream, is_stderr=False):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    decoded = line.decode().strip()
                    if is_stderr:
                        task.stderr.append(decoded)
                        self.renderer.text(f"   ⚠️ {decoded}")
                    else:
                        task.stdout.append(decoded)
                        self.renderer.text(f"   {decoded}")

            try:
                # Wait for process with timeout
                await asyncio.wait_for(
                    asyncio.gather(
                        proc.wait(),
                        read_stream(proc.stdout),
                        read_stream(proc.stderr)
                    ),
                    timeout=task.timeout / 1000.0
                )
                task.exit_code = proc.returncode
                task.state = "done" if task.exit_code == 0 else "failed"
            except asyncio.TimeoutError:
                proc.kill()
                task.state = "timeout"
                task.error = f"Timeout after {task.timeout}ms"
                self.renderer.error(f"⏱️ [TIMEOUT] {task.command}")
                
        except Exception as e:
            task.state = "failed"
            task.error = str(e)
            self.renderer.error(f"❌ [ERROR] {task.command}: {e}")
            
        finally:
            task.completed_at = time.time()
            self.running.remove(task_id)
            duration = int(task.completed_at - task.started_at)
            icon = "✅" if task.state == "done" else "❌"
            if task.state == "timeout": icon = "⏱️"
            self.renderer.info(f"{icon} [{task.state.upper()}] {task.command} ({duration}s)")
            
    async def wait_for_all(self) -> None:
        """Run tasks from queue until all finished using parallel workers"""
        pending_futures = []
        
        while self.queue or self.running:
            # Fill workers
            while len(self.running) < self.max_workers and self.queue:
                tid = self.queue.pop(0)
                future = asyncio.create_task(self.run_task(tid))
                pending_futures.append(future)
                
            if pending_futures:
                # Wait for at least one to complete
                done, pending = await asyncio.wait(
                    pending_futures, 
                    return_when=asyncio.FIRST_COMPLETED
                )
                pending_futures = list(pending)
            else:
                # Nothing running, nothing in queue
                break
                
    def print_summary(self) -> None:
        """Print final status of all tasks in YAML/Markdown"""
        tasks = list(self.tasks.values())
        done = len([t for t in tasks if t.state == "done"])
        failed = len([t for t in tasks if t.state in ("failed", "timeout")])
        
        self.renderer.heading(2, "Final Status")
        
        yaml_lines = [
            "tasks:",
            f"  total: {len(tasks)}",
            f"  done: {done}",
            f"  failed: {failed}",
            "",
            "results:"
        ]
        
        for t in tasks:
            duration = int(t.completed_at - t.started_at) if t.completed_at and t.started_at else 0
            icon = "✅" if t.state == "done" else "❌"
            if t.state == "timeout": icon = "⏱️"
            yaml_lines.append(f'  - {icon} "{t.command}": {t.state} ({duration}s)')
            if t.error:
                yaml_lines.append(f'      error: "{t.error}"')
                
        self.renderer.codeblock("yaml", "\n".join(yaml_lines))
