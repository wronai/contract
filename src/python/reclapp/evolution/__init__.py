"""
Reclapp Evolution Module

Auto-healing code generation with task queue and shell rendering.

Mirrors: src/core/contract-ai/evolution/
@version 1.0.0
"""

from .task_queue import TaskQueue, Task, TaskStatus
from .shell_renderer import ShellRenderer
from .evolution_manager import EvolutionManager, EvolutionOptions, EvolutionResult
from .generators import EvolutionGenerators

__all__ = [
    "TaskQueue",
    "Task",
    "TaskStatus",
    "ShellRenderer",
    "EvolutionManager",
    "EvolutionOptions",
    "EvolutionResult",
    "EvolutionGenerators",
]
