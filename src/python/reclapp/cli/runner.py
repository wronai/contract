"""
CLI Runner for Python

Standardized CLI execution with TaskQueue, markdown logs, and consistent output.
Unifies TaskQueue and ShellRenderer for all reclapp commands.

Mirrors: src/core/contract-ai/cli/cli-runner.ts
@version 1.0.0
"""

import asyncio
import time
from typing import Any, Callable, Dict, List, Optional, Union

from ..evolution.shell_renderer import ShellRenderer
from ..evolution.task_queue import TaskQueue, Task


class CLITaskResult:
    """Result of a single CLI task"""
    def __init__(
        self, 
        success: bool, 
        message: Optional[str] = None, 
        data: Optional[Dict[str, Any]] = None, 
        error: Optional[str] = None
    ):
        self.success = success
        self.message = message
        self.data = data
        self.error = error


class CLIRunner:
    """
    Standardized runner for CLI commands.
    
    Provides consistent output using ShellRenderer and manages tasks via TaskQueue.
    """
    
    def __init__(
        self, 
        name: str, 
        version: str, 
        verbose: bool = True,
        show_progress: bool = True,
        continue_on_error: bool = True
    ):
        self.name = name
        self.version = version
        self.verbose = verbose
        self.show_progress = show_progress
        self.continue_on_error = continue_on_error
        
        self.renderer = ShellRenderer(verbose=verbose)
        # TaskQueue prints its own TODO blocks when verbose=True.
        # CLIRunner is responsible for printing TODO/progress, so keep TaskQueue silent.
        self.task_queue = TaskQueue(verbose=False)
        
        self.tasks: List[Dict[str, Any]] = []
        self.results: List[Dict[str, Any]] = []
        self.start_time: float = 0
        
    def header(self) -> None:
        """Print header"""
        self.renderer.heading(2, f"{self.name} v{self.version}")
        
    def add_task(
        self, 
        task_id: str, 
        name: str, 
        run_fn: Callable[[], Any],
        description: Optional[str] = None,
        skip_fn: Optional[Callable[[], bool]] = None
    ) -> 'CLIRunner':
        """Add task to queue"""
        self.tasks.append({
            "id": task_id,
            "name": name,
            "description": description,
            "run": run_fn,
            "skip": skip_fn
        })
        self.task_queue.add(name, task_id)
        return self
        
    def log(self, message: str) -> None:
        """Log message"""
        if "Progress:" in message:
            # Simple print for progress to avoid excessive codeblocks
            self.renderer.text(f"→ {message}")
        else:
            self.renderer.codeblock("log", message)
        
    def yaml(self, type_name: str, description: str, data: Dict[str, Any]) -> None:
        """Log YAML data"""
        import yaml
        
        content = [
            f"# @type: {type_name}",
            f"# @description: {description}"
        ]
        
        # Simple YAML dump (could be more sophisticated like TS version)
        yaml_str = yaml.dump(data, sort_keys=False, default_flow_style=False)
        content.append(yaml_str)
        
        self.renderer.codeblock("yaml", "\n".join(content))
        
    def print_todo(self) -> None:
        """Print current TODO list"""
        tasks = self.task_queue.tasks
        done = len([t for t in tasks if t.status == "done"])
        failed = len([t for t in tasks if t.status == "failed"])
        total = len(tasks)
        
        todo_data = {
            "progress": {"done": done, "failed": failed, "total": total},
            "tasks": [
                {
                    "name": t.name,
                    "status": t.status,
                    **({"error": t.error} if t.error else {})
                }
                for t in tasks
            ]
        }
        
        self.yaml("task_queue", "Current task status", todo_data)
        
    async def run(self) -> Dict[str, Any]:
        """Run all tasks"""
        self.start_time = time.time()
        self.header()
        
        if self.show_progress:
            self.print_todo()
            
        completed = 0
        failed = 0
        skipped = 0
        
        for task_def in self.tasks:
            task_id = task_def["id"]
            name = task_def["name"]
            description = task_def["description"]
            run_fn = task_def["run"]
            skip_fn = task_def["skip"]
            
            # Check if should skip
            if skip_fn and skip_fn():
                self.task_queue.skip(task_id)
                skipped += 1
                self.results.append({
                    "name": name,
                    "status": "skipped",
                    "duration": 0
                })
                continue
                
            # Start task
            self.task_queue.start(task_id)
            desc_part = f": {description}" if description else ""
            self.renderer.info(f"{name}{desc_part}")
            
            task_start = time.time()
            
            try:
                # Run the task (handle both sync and async)
                if asyncio.iscoroutinefunction(run_fn):
                    result = await run_fn()
                else:
                    result = run_fn()
                    
                duration = time.time() - task_start
                
                # Check result
                if isinstance(result, CLITaskResult):
                    success = result.success
                    error_msg = result.error
                    data = result.data
                    message = result.message
                else:
                    # Assume success if no exception and not CLITaskResult
                    success = True
                    error_msg = None
                    data = result if isinstance(result, dict) else None
                    message = None
                    
                if success:
                    self.task_queue.done(task_id)
                    completed += 1
                    
                    if data:
                        self.yaml(f"{task_id}_result", message or "Task completed", data)
                        
                    self.results.append({
                        "name": name,
                        "status": "done",
                        "duration": duration
                    })
                else:
                    self.task_queue.fail(task_id, error_msg or "Unknown error")
                    failed += 1
                    
                    self.results.append({
                        "name": name,
                        "status": "failed",
                        "duration": duration,
                        "error": error_msg
                    })
                    
                    if not self.continue_on_error:
                        break
                        
            except Exception as e:
                duration = time.time() - task_start
                error_msg = str(e)
                
                self.task_queue.fail(task_id, error_msg)
                failed += 1
                
                self.results.append({
                    "name": name,
                    "status": "failed",
                    "duration": duration,
                    "error": error_msg
                })
                
                if not self.continue_on_error:
                    break
                    
            # Progress update
            if self.show_progress:
                progress = completed + failed + skipped
                self.renderer.info(f"📊 Progress: {progress}/{len(self.tasks)} ({completed} done, {failed} failed, {skipped} skipped)")
                
        total_duration = time.time() - self.start_time
        
        # Final Status
        if self.show_progress:
            self.renderer.heading(2, "Final Status")
            self.print_todo()
            
        # Summary
        summary_data = {
            "success": failed == 0,
            "completed": completed,
            "failed": failed,
            "skipped": skipped,
            "total": len(self.tasks),
            "duration_sec": round(total_duration, 2)
        }
        
        self.yaml("run_summary", "Execution summary", summary_data)
        
        return {
            "success": failed == 0,
            "completed": completed,
            "failed": failed,
            "skipped": skipped,
            "total": len(self.tasks),
            "duration": total_duration,
            "tasks": self.results
        }
