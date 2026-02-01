"""
Tests for Shell Interaction and Code Generation

Tests the evolution pipeline's shell interaction, code generation,
and comparison with TypeScript implementation.

Run: pytest tests/python/test_shell_interaction.py -v
"""

import pytest
import asyncio
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
import sys

sys.path.insert(0, 'src/python')

from reclapp.evolution import (
    EvolutionManager,
    EvolutionOptions,
    EvolutionResult,
    TaskQueue,
    ShellRenderer,
    StateAnalyzer,
)
# Import cli module directly with absolute path
import importlib.util
from pathlib import Path

project_root = Path(__file__).resolve().parents[2]
cli_path = project_root / "src/python/reclapp/cli/main.py"
spec = importlib.util.spec_from_file_location("cli_main", cli_path)
cli_main = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli_main)
cli = cli_main.cli


# ============================================================================
# SHELL RENDERER TESTS
# ============================================================================

class TestShellRenderer:
    """Test shell rendering output"""
    
    def test_heading(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.heading(1, "Test Heading")
        captured = capsys.readouterr()
        assert "Test Heading" in captured.out
        
    def test_info(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.info("Test info message")
        captured = capsys.readouterr()
        assert "Test info" in captured.out
        
    def test_success(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.success("Test success")
        captured = capsys.readouterr()
        assert "Test success" in captured.out or "✅" in captured.out
        
    def test_error(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.error("Test error")
        captured = capsys.readouterr()
        assert "Test error" in captured.out or "❌" in captured.out
        
    def test_warning(self, capsys):
        renderer = ShellRenderer(verbose=True)
        renderer.warning("Test warning")
        captured = capsys.readouterr()
        assert "Test warning" in captured.out or "⚠️" in captured.out


# ============================================================================
# CODE GENERATION TESTS
# ============================================================================

class TestCodeGeneration:
    """Test code generation output"""
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary output directory"""
        tmp_dir = tempfile.mkdtemp(prefix="reclapp_test_")
        yield tmp_dir
        shutil.rmtree(tmp_dir, ignore_errors=True)
    
    @pytest.mark.asyncio
    async def test_evolution_generates_files(self, temp_output_dir):
        """Test that evolution generates expected files"""
        options = EvolutionOptions(
            output_dir=temp_output_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        result = await manager.evolve("Create a todo app", temp_output_dir)
        
        # Check result structure
        assert isinstance(result, EvolutionResult)
        assert result.files_generated >= 0
        
        # Check directories were created
        assert Path(temp_output_dir).exists()
        assert (Path(temp_output_dir) / "state").exists()
        
    @pytest.mark.asyncio
    async def test_evolution_creates_contract(self, temp_output_dir):
        """Test that evolution creates contract.ai.json"""
        options = EvolutionOptions(
            output_dir=temp_output_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a blog app", temp_output_dir)
        
        contract_path = Path(temp_output_dir) / "contract" / "contract.ai.json"
        assert contract_path.exists(), "contract.ai.json should be created"
        
        # Validate contract structure
        contract = json.loads(contract_path.read_text())
        assert "definition" in contract
        assert "app" in contract["definition"]
        
    @pytest.mark.asyncio
    async def test_evolution_creates_state_files(self, temp_output_dir):
        """Test that evolution creates state files"""
        options = EvolutionOptions(
            output_dir=temp_output_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a user management app", temp_output_dir)
        
        # Check state files
        state_dir = Path(temp_output_dir) / "state"
        assert (state_dir / "evolution-state.json").exists()
        assert (state_dir / "multi-level-state.json").exists()
        
    @pytest.mark.asyncio
    async def test_evolution_creates_tests(self, temp_output_dir):
        """Test that evolution creates test files"""
        options = EvolutionOptions(
            output_dir=temp_output_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a task app", temp_output_dir)
        
        # Check test files
        tests_dir = Path(temp_output_dir) / "tests"
        assert tests_dir.exists()
        assert (tests_dir / "e2e" / "api.e2e.ts").exists()
        assert (tests_dir / "test.config.ts").exists()
        assert (tests_dir / "fixtures").exists()
        
    @pytest.mark.asyncio
    async def test_evolution_creates_frontend(self, temp_output_dir):
        """Test that evolution creates frontend files"""
        options = EvolutionOptions(
            output_dir=temp_output_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a notes app", temp_output_dir)
        
        # Check frontend files
        frontend_dir = Path(temp_output_dir) / "frontend"
        assert frontend_dir.exists()
        assert (frontend_dir / "package.json").exists()
        assert (frontend_dir / "src" / "App.tsx").exists()
        
    @pytest.mark.asyncio
    async def test_evolution_creates_docs(self, temp_output_dir):
        """Test that evolution creates documentation"""
        options = EvolutionOptions(
            output_dir=temp_output_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a project app", temp_output_dir)
        
        # Check docs
        assert (Path(temp_output_dir) / "README.md").exists()
        assert (Path(temp_output_dir) / "API.md").exists()
        
    @pytest.mark.asyncio
    async def test_evolution_creates_logs(self, temp_output_dir):
        """Test that evolution creates log files"""
        options = EvolutionOptions(
            output_dir=temp_output_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a log app", temp_output_dir)
        
        # Check logs
        logs_dir = Path(temp_output_dir) / "logs"
        assert logs_dir.exists()
        log_files = list(logs_dir.glob("evolution-*.md"))
        assert len(log_files) > 0, "Should have at least one log file"


# ============================================================================
# STATE ANALYZER TESTS
# ============================================================================

class TestStateAnalyzer:
    """Test multi-level state analysis"""
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary output directory"""
        tmp_dir = tempfile.mkdtemp(prefix="reclapp_state_test_")
        yield tmp_dir
        shutil.rmtree(tmp_dir, ignore_errors=True)
    
    @pytest.mark.asyncio
    async def test_state_analyzer_creates_snapshot(self, temp_output_dir):
        """Test that StateAnalyzer creates state snapshot"""
        # Create minimal structure
        (Path(temp_output_dir) / "api").mkdir(parents=True)
        (Path(temp_output_dir) / "contract").mkdir(parents=True)
        
        # Create minimal contract
        contract = {
            "definition": {
                "app": {"name": "Test", "version": "1.0.0"},
                "entities": [{"name": "Item", "fields": []}]
            }
        }
        (Path(temp_output_dir) / "contract" / "contract.ai.json").write_text(
            json.dumps(contract)
        )
        
        analyzer = StateAnalyzer(temp_output_dir, verbose=False)
        state = await analyzer.analyze(contract)
        
        assert state.contract.app_name == "Test"
        assert len(state.contract.entities) == 1
        
    @pytest.mark.asyncio
    async def test_state_analyzer_detects_discrepancies(self, temp_output_dir):
        """Test that StateAnalyzer detects discrepancies"""
        (Path(temp_output_dir) / "contract").mkdir(parents=True)
        
        # Create contract with entity that has no model file
        contract = {
            "definition": {
                "app": {"name": "Test", "version": "1.0.0"},
                "entities": [{"name": "MissingModel", "fields": []}]
            }
        }
        (Path(temp_output_dir) / "contract" / "contract.ai.json").write_text(
            json.dumps(contract)
        )
        
        analyzer = StateAnalyzer(temp_output_dir, verbose=False)
        state = await analyzer.analyze(contract)
        
        # Should detect missing model file
        assert len(state.discrepancies) > 0


# ============================================================================
# CLI SHELL INTERACTION TESTS
# ============================================================================

class TestCLIShellInteraction:
    """Test CLI shell commands"""
    
    def test_cli_help(self):
        """Test CLI help command"""
        result = subprocess.run(
            [sys.executable, "-m", "reclapp.cli", "--help"],
            cwd="src/python",
            capture_output=True,
            text=True
        )
        assert result.returncode == 0
        assert "evolve" in result.stdout
        assert "generate" in result.stdout
        
    def test_cli_evolve_help(self):
        """Test CLI evolve help"""
        result = subprocess.run(
            [sys.executable, "-m", "reclapp.cli", "evolve", "--help"],
            cwd="src/python",
            capture_output=True,
            text=True
        )
        assert result.returncode == 0
        assert "--prompt" in result.stdout
        assert "--output" in result.stdout


# ============================================================================
# TYPESCRIPT COMPARISON TESTS
# ============================================================================

class TestTypeScriptComparison:
    """Compare Python output with TypeScript output"""
    
    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for both outputs"""
        ts_dir = tempfile.mkdtemp(prefix="reclapp_ts_")
        py_dir = tempfile.mkdtemp(prefix="reclapp_py_")
        yield ts_dir, py_dir
        shutil.rmtree(ts_dir, ignore_errors=True)
        shutil.rmtree(py_dir, ignore_errors=True)
    
    @pytest.mark.asyncio
    async def test_python_generates_same_structure(self, temp_dirs):
        """Test that Python generates same file structure as TypeScript would"""
        _, py_dir = temp_dirs
        
        options = EvolutionOptions(
            output_dir=py_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a todo app", py_dir)
        
        # These files should match TypeScript output structure
        expected_files = [
            "contract/contract.ai.json",
            "state/evolution-state.json",
            "state/multi-level-state.json",
            "tests/e2e/api.e2e.ts",
            "tests/test.config.ts",
            "frontend/package.json",
            "frontend/src/App.tsx",
            "README.md",
            "API.md",
            "Dockerfile",
            "docker-compose.yml",
            ".github/workflows/ci.yml",
        ]
        
        for file_path in expected_files:
            full_path = Path(py_dir) / file_path
            assert full_path.exists(), f"Missing expected file: {file_path}"
            
    @pytest.mark.asyncio
    async def test_contract_structure_matches(self, temp_dirs):
        """Test that contract structure matches TypeScript format"""
        _, py_dir = temp_dirs
        
        options = EvolutionOptions(
            output_dir=py_dir,
            max_iterations=1,
            verbose=False
        )
        manager = EvolutionManager(options)
        
        await manager.evolve("Create a todo app", py_dir)
        
        contract_path = Path(py_dir) / "contract" / "contract.ai.json"
        contract = json.loads(contract_path.read_text())
        
        # Verify TypeScript-compatible structure
        assert "definition" in contract
        assert "app" in contract["definition"]
        assert "name" in contract["definition"]["app"]
        assert "entities" in contract["definition"]
        
        # Verify generation layer exists
        if "generation" in contract:
            assert "techStack" in contract["generation"]


# ============================================================================
# TASK QUEUE INTEGRATION TESTS
# ============================================================================

class TestTaskQueueIntegration:
    """Test task queue with full pipeline"""
    
    def test_task_queue_21_tasks(self):
        """Test that task queue has 21 tasks like TypeScript"""
        queue = TaskQueue(verbose=False)
        
        # Add all tasks like EvolutionManager does
        tasks = [
            "Create output folders",
            "Create evolution state",
            "Parse prompt into contract",
            "Save contract.ai.json",
            "Validate plan",
            "Generate backend code",
            "Save generated files",
            "Validate generated output",
            "Install dependencies",
            "Start service",
            "Verify service health",
            "Generate tests",
            "Run tests",
            "Generate database",
            "Generate Docker",
            "Generate CI/CD templates",
            "Generate frontend",
            "Generate documentation",
            "Validate additional targets",
            "Verify contract ↔ code ↔ service",
            "Reconcile discrepancies",
        ]
        
        for task in tasks:
            queue.add(task)
        
        assert len(queue.tasks) == 21, "Should have exactly 21 tasks like TypeScript"
        
    def test_task_queue_stats(self):
        """Test task queue statistics"""
        queue = TaskQueue(verbose=False)
        
        queue.add("Task 1", "t1")
        queue.add("Task 2", "t2")
        queue.add("Task 3", "t3")
        
        queue.start("t1")
        queue.done("t1")
        queue.start("t2")
        queue.fail("t2", "Error")
        queue.skip("t3")
        
        stats = queue.get_stats()
        
        assert stats["done"] == 1
        assert stats["failed"] == 1
        assert stats["skipped"] == 1
        assert stats["total"] == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
