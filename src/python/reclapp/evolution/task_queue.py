"""
Task Queue

Manages task execution pipeline with status tracking.

Mirrors: src/core/contract-ai/evolution/task-queue.ts
@version 1.0.0
"""

from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ============================================================================
# TYPES
# ============================================================================

TaskStatus = Literal["pending", "running", "done", "failed", "skipped"]


class Task(BaseModel):
    """Task definition"""
    id: str
    name: str
    status: TaskStatus = "pending"
    started_at: Optional[datetime] = Field(default=None, alias="startedAt")
    completed_at: Optional[datetime] = Field(default=None, alias="completedAt")
    error: Optional[str] = None
    children: Optional[list["Task"]] = None
    
    model_config = {"populate_by_name": True}


# ============================================================================
# TASK QUEUE CLASS
# ============================================================================

class TaskQueue:
    """
    Task queue with status tracking and YAML output.
    
    Example:
        queue = TaskQueue(verbose=True)
        task = queue.add("Generate code")
        queue.start(task.id)
        # ... do work ...
        queue.done(task.id)
    """
    
    def __init__(self, verbose: bool = True):
        self.tasks: list[Task] = []
        self.verbose = verbose
        self._renderer: Optional["ShellRenderer"] = None
    
    @property
    def renderer(self) -> "ShellRenderer":
        """Lazy load renderer"""
        if self._renderer is None:
            from .shell_renderer import ShellRenderer
            self._renderer = ShellRenderer(self.verbose)
        return self._renderer
    
    def add(self, name: str, task_id: Optional[str] = None) -> Task:
        """Add a new task to the queue"""
        task = Task(
            id=task_id or f"task-{len(self.tasks) + 1}",
            name=name,
            status="pending"
        )
        self.tasks.append(task)
        return task
    
    def start(self, task_id: str) -> None:
        """Mark a task as running"""
        task = self._find_task(task_id)
        if task:
            task.status = "running"
            task.started_at = datetime.now()
            self._print_todo_list()
    
    def done(self, task_id: str) -> None:
        """Mark a task as done"""
        task = self._find_task(task_id)
        if task:
            task.status = "done"
            task.completed_at = datetime.now()
            
            all_done = all(
                t.status in ("done", "failed", "skipped")
                for t in self.tasks
            )
            if all_done:
                self._print_todo_list()
    
    def fail(self, task_id: str, error: str) -> None:
        """Mark a task as failed"""
        task = self._find_task(task_id)
        if task:
            task.status = "failed"
            task.error = error
            task.completed_at = datetime.now()
            self._print_todo_list(force=True)
    
    def skip(self, task_id: str) -> None:
        """Mark a task as skipped"""
        task = self._find_task(task_id)
        if task:
            task.status = "skipped"
            task.completed_at = datetime.now()
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get task by ID"""
        return self._find_task(task_id)
    
    def get_stats(self) -> dict[str, int]:
        """Get task statistics"""
        return {
            "pending": len([t for t in self.tasks if t.status == "pending"]),
            "running": len([t for t in self.tasks if t.status == "running"]),
            "done": len([t for t in self.tasks if t.status == "done"]),
            "failed": len([t for t in self.tasks if t.status == "failed"]),
            "skipped": len([t for t in self.tasks if t.status == "skipped"]),
            "total": len(self.tasks),
        }
    
    def print(self, force: bool = True) -> None:
        """Print current task list"""
        self._print_todo_list(force=force)
    
    def _find_task(self, task_id: str) -> Optional[Task]:
        """Find task by ID"""
        return next((t for t in self.tasks if t.id == task_id), None)
    
    def _print_todo_list(self, force: bool = False) -> None:
        """Print task list as YAML"""
        if not self.verbose:
            return
        
        stats = self.get_stats()
        all_done = stats["pending"] == 0 and stats["running"] == 0
        just_started = stats["done"] == 0 and stats["running"] == 1
        
        if just_started or force:
            self.renderer.heading(2, "TODO")
            yaml_lines = [
                "# @type: task_queue",
                "# @description: Evolution pipeline task list",
                "progress:",
                f"  done: {stats['done']}",
                f"  total: {stats['total']}",
            ]
            if stats["failed"] > 0:
                yaml_lines.append(f"  failed: {stats['failed']}")
            
            yaml_lines.append("tasks:")
            for task in self.tasks:
                error_line = ""
                if task.status == "failed" and task.error:
                    escaped_error = task.error[:180].replace('"', '\\"')
                    error_line = f'\n    error: "{escaped_error}"'
                yaml_lines.append(f'  - name: "{task.name}"\n    status: {task.status}{error_line}')
            
            self.renderer.codeblock("yaml", "\n".join(yaml_lines))
            
        elif all_done:
            self.renderer.heading(2, "COMPLETED")
            yaml_lines = [
                "# @type: task_queue_result",
                "# @description: Final task execution results",
                "progress:",
                f"  done: {stats['done']}",
                f"  total: {stats['total']}",
            ]
            if stats["failed"] > 0:
                yaml_lines.append(f"  failed: {stats['failed']}")
            
            yaml_lines.append("tasks:")
            for task in self.tasks:
                duration = 0
                if task.started_at and task.completed_at:
                    duration = int((task.completed_at - task.started_at).total_seconds())
                
                error_line = ""
                if task.status == "failed" and task.error:
                    escaped_error = task.error[:180].replace('"', '\\"')
                    error_line = f'\n    error: "{escaped_error}"'
                
                yaml_lines.append(
                    f'  - name: "{task.name}"\n    status: {task.status}\n    duration_sec: {duration}{error_line}'
                )
            
            self.renderer.codeblock("yaml", "\n".join(yaml_lines))
    
    @staticmethod
    def get_icon(status: TaskStatus) -> str:
        """Get status icon"""
        icons = {
            "pending": "⏳",
            "running": "🔄",
            "done": "✅",
            "failed": "❌",
            "skipped": "⏭️",
        }
        return icons.get(status, "•")
