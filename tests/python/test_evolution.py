"""
Tests for Reclapp Evolution Module

Tests task queue, shell renderer, and evolution manager.
Run: pytest tests/python/test_evolution.py -v
"""

import pytest
from datetime import datetime
from io import StringIO
import sys

sys.path.insert(0, 'src/python')

from reclapp.evolution import (
    TaskQueue,
    Task,
    ShellRenderer,
    EvolutionManager,
    EvolutionOptions,
    EvolutionResult,
)


# ============================================================================
# TASK TESTS
# ============================================================================

class TestTask:
    def test_basic_task(self):
        task = Task(id="t1", name="Test task")
        assert task.id == "t1"
        assert task.name == "Test task"
        assert task.status == "pending"
        
    def test_task_with_status(self):
        task = Task(id="t1", name="Test", status="running")
        assert task.status == "running"
        
    def test_task_with_dates(self):
        now = datetime.now()
        task = Task(
            id="t1",
            name="Test",
            status="done",
            started_at=now,
            completed_at=now
        )
        assert task.started_at == now
        assert task.completed_at == now


# ============================================================================
# TASK QUEUE TESTS
# ============================================================================

class TestTaskQueue:
    def test_create_queue(self):
        queue = TaskQueue(verbose=False)
        assert len(queue.tasks) == 0
        
    def test_add_task(self):
        queue = TaskQueue(verbose=False)
        task = queue.add("Test task")
        
        assert len(queue.tasks) == 1
        assert task.name == "Test task"
        assert task.status == "pending"
        
    def test_add_task_with_id(self):
        queue = TaskQueue(verbose=False)
        task = queue.add("Test task", "custom-id")
        
        assert task.id == "custom-id"
        
    def test_start_task(self):
        queue = TaskQueue(verbose=False)
        task = queue.add("Test task")
        queue.start(task.id)
        
        assert task.status == "running"
        assert task.started_at is not None
        
    def test_done_task(self):
        queue = TaskQueue(verbose=False)
        task = queue.add("Test task")
        queue.start(task.id)
        queue.done(task.id)
        
        assert task.status == "done"
        assert task.completed_at is not None
        
    def test_fail_task(self):
        queue = TaskQueue(verbose=False)
        task = queue.add("Test task")
        queue.start(task.id)
        queue.fail(task.id, "Something went wrong")
        
        assert task.status == "failed"
        assert task.error == "Something went wrong"
        
    def test_skip_task(self):
        queue = TaskQueue(verbose=False)
        task = queue.add("Test task")
        queue.skip(task.id)
        
        assert task.status == "skipped"
        
    def test_get_task(self):
        queue = TaskQueue(verbose=False)
        task = queue.add("Test task", "my-id")
        
        found = queue.get_task("my-id")
        assert found is not None
        assert found.id == "my-id"
        
        not_found = queue.get_task("unknown")
        assert not_found is None
        
    def test_get_stats(self):
        queue = TaskQueue(verbose=False)
        queue.add("Task 1")
        queue.add("Task 2")
        t3 = queue.add("Task 3")
        
        queue.start(t3.id)
        queue.done(t3.id)
        
        stats = queue.get_stats()
        assert stats["pending"] == 2
        assert stats["done"] == 1
        assert stats["total"] == 3
        
    def test_get_icon(self):
        assert TaskQueue.get_icon("pending") == "⏳"
        assert TaskQueue.get_icon("running") == "🔄"
        assert TaskQueue.get_icon("done") == "✅"
        assert TaskQueue.get_icon("failed") == "❌"
        assert TaskQueue.get_icon("skipped") == "⏭️"


# ============================================================================
# SHELL RENDERER TESTS
# ============================================================================

class TestShellRenderer:
    def test_create_renderer(self):
        renderer = ShellRenderer(verbose=True)
        assert renderer.verbose is True
        
    def test_create_silent_renderer(self):
        renderer = ShellRenderer(verbose=False)
        assert renderer.verbose is False
        
    def test_heading(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.heading(2, "Test Heading")
        
        captured = capsys.readouterr()
        assert "Test Heading" in captured.out
        assert "##" in captured.out
        
    def test_heading_silent(self, capsys):
        renderer = ShellRenderer(verbose=False)
        renderer.heading(2, "Test Heading")
        
        captured = capsys.readouterr()
        assert captured.out == ""
        
    def test_codeblock(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.codeblock("yaml", "key: value")
        
        captured = capsys.readouterr()
        assert "yaml" in captured.out
        assert "key" in captured.out
        
    def test_success(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.success("Operation completed")
        
        captured = capsys.readouterr()
        assert "✅" in captured.out
        assert "Operation completed" in captured.out
        
    def test_error(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.error("Something failed")
        
        captured = capsys.readouterr()
        assert "❌" in captured.out
        assert "Something failed" in captured.out
        
    def test_warning(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.warning("Be careful")
        
        captured = capsys.readouterr()
        assert "⚠️" in captured.out
        assert "Be careful" in captured.out
        
    def test_info(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.info("FYI")
        
        captured = capsys.readouterr()
        # clickmd uses arrow, fallback uses ℹ️
        assert "ℹ️" in captured.out or "→" in captured.out
        assert "FYI" in captured.out


# ============================================================================
# YAML HIGHLIGHTING TESTS
# ============================================================================

class TestYamlHighlighting:
    def test_highlight_comment(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.codeblock("yaml", "# This is a comment")
        
        captured = capsys.readouterr()
        assert "comment" in captured.out.lower() or "#" in captured.out
        
    def test_highlight_key_value(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.codeblock("yaml", "name: test")
        
        captured = capsys.readouterr()
        assert "name" in captured.out
        assert "test" in captured.out


# ============================================================================
# EVOLUTION OPTIONS TESTS
# ============================================================================

class TestEvolutionOptions:
    def test_default_options(self):
        options = EvolutionOptions()
        assert options.output_dir == "./generated"
        assert options.max_iterations == 5  # Changed from 10 to 5 for faster iterations
        assert options.auto_fix is True
        assert options.verbose is True
        
    def test_custom_options(self):
        options = EvolutionOptions(
            output_dir="./my-app",
            max_iterations=5,
            auto_fix=False,
            verbose=False
        )
        assert options.output_dir == "./my-app"
        assert options.max_iterations == 5
        assert options.auto_fix is False


# ============================================================================
# EVOLUTION RESULT TESTS
# ============================================================================

class TestEvolutionResult:
    def test_success_result(self):
        result = EvolutionResult(
            success=True,
            iterations=1,
            files_generated=5,
            time_ms=1000
        )
        assert result.success is True
        assert result.files_generated == 5
        
    def test_failed_result(self):
        result = EvolutionResult(
            success=False,
            errors=["Error 1", "Error 2"]
        )
        assert result.success is False
        assert len(result.errors) == 2


# ============================================================================
# EVOLUTION MANAGER TESTS
# ============================================================================

class TestEvolutionManager:
    def test_create_manager(self):
        manager = EvolutionManager()
        assert manager.options.verbose is True
        
    def test_create_manager_with_options(self):
        manager = EvolutionManager(EvolutionOptions(
            output_dir="./test-output",
            verbose=False
        ))
        assert manager.options.output_dir == "./test-output"
        assert manager.options.verbose is False
        
    def test_get_task_queue(self):
        manager = EvolutionManager()
        queue = manager.get_task_queue()
        assert queue is not None
        assert isinstance(queue, TaskQueue)
        
    @pytest.mark.asyncio
    async def test_evolve_basic(self, tmp_path):
        manager = EvolutionManager(EvolutionOptions(
            output_dir=str(tmp_path),
            verbose=False
        ))
        
        result = await manager.evolve("Create a simple app")
        
        assert result.iterations >= 1
        assert result.time_ms >= 0
        
    @pytest.mark.asyncio
    async def test_evolve_creates_directory(self, tmp_path):
        output_dir = tmp_path / "new-app"
        manager = EvolutionManager(EvolutionOptions(
            output_dir=str(output_dir),
            verbose=False
        ))
        
        await manager.evolve("Create an app")
        
        assert output_dir.exists()


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestEvolutionIntegration:
    @pytest.mark.asyncio
    async def test_full_pipeline(self, tmp_path):
        manager = EvolutionManager(EvolutionOptions(
            output_dir=str(tmp_path),
            verbose=False,
            max_iterations=3
        ))
        
        result = await manager.evolve("Create a notes application")
        
        # Check result
        assert result.iterations >= 1
        assert isinstance(result.files_generated, int)
        assert isinstance(result.errors, list)
        
    def test_task_queue_workflow(self):
        queue = TaskQueue(verbose=False)
        
        # Add tasks
        t1 = queue.add("Parse", "parse")
        t2 = queue.add("Generate", "generate")
        t3 = queue.add("Validate", "validate")
        
        # Execute workflow
        queue.start("parse")
        queue.done("parse")
        
        queue.start("generate")
        queue.done("generate")
        
        queue.start("validate")
        queue.done("validate")
        
        # Check final state
        stats = queue.get_stats()
        assert stats["done"] == 3
        assert stats["pending"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
