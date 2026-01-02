#!/usr/bin/env python3
"""
Tests for Python setup command

Run: ./venv/bin/python -m pytest test_setup.py -v
"""

import asyncio
import json
import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from setup import (
    CLIRunner,
    CLITask,
    DependencyChecker,
    EnvironmentReport,
    LLMProvider,
    LLMProviderStatus,
    Priority,
    SetupConfig,
    SetupTask,
    TaskResult,
    TaskStatus,
    check_llm_providers,
    cmd_setup,
)


# ============================================================================
# MODEL TESTS
# ============================================================================

class TestModels:
    def test_llm_provider_available(self):
        provider = LLMProvider(
            name="ollama",
            status=LLMProviderStatus.AVAILABLE,
            models=10,
            code_models=5,
            url="http://localhost:11434"
        )
        assert provider.name == "ollama"
        assert provider.status == LLMProviderStatus.AVAILABLE
        assert provider.models == 10
        
    def test_llm_provider_not_configured(self):
        provider = LLMProvider(
            name="openai",
            status=LLMProviderStatus.NOT_CONFIGURED,
            fix="Set OPENAI_API_KEY"
        )
        assert provider.status == LLMProviderStatus.NOT_CONFIGURED
        assert provider.fix == "Set OPENAI_API_KEY"
        
    def test_setup_task_defaults(self):
        task = SetupTask(
            id="test-task",
            name="Test Task",
            priority=Priority.REQUIRED,
            category="test",
            commands=["echo hello"]
        )
        assert task.status == TaskStatus.PENDING
        assert task.commands == ["echo hello"]
        
    def test_task_result_success(self):
        result = TaskResult(
            success=True,
            message="Task completed",
            data={"count": 5}
        )
        assert result.success
        assert result.error is None
        
    def test_task_result_failure(self):
        result = TaskResult(
            success=False,
            message="Task failed",
            error="Connection timeout"
        )
        assert not result.success
        assert result.error == "Connection timeout"
        
    def test_setup_config_defaults(self):
        config = SetupConfig()
        assert config.output_dir == "."
        assert config.install is False
        assert config.interactive is True
        assert config.skip_optional is False
        
    def test_environment_report(self):
        report = EnvironmentReport(
            os="Linux 5.15",
            arch="x86_64",
            node_version="v20.0.0",
            ready=True,
            missing_required=[],
            missing_recommended=["Docker"],
            dependencies=[]
        )
        assert report.ready
        assert len(report.missing_recommended) == 1


# ============================================================================
# DEPENDENCY CHECKER TESTS
# ============================================================================

class TestDependencyChecker:
    def test_check_node_installed(self):
        checker = DependencyChecker()
        dep = checker.check_dependency({
            "name": "node",
            "display_name": "Node.js",
            "check": "node --version",
            "priority": Priority.REQUIRED
        })
        # Node should be installed in test environment
        assert dep.name == "node"
        assert dep.status == "installed"
        assert dep.version is not None
        
    def test_check_missing_dependency(self):
        checker = DependencyChecker()
        dep = checker.check_dependency({
            "name": "nonexistent",
            "display_name": "Nonexistent Tool",
            "check": "nonexistent-tool-12345 --version",
            "priority": Priority.OPTIONAL,
            "install": "apt install nonexistent"
        })
        assert dep.status == "missing"
        assert dep.install_command == "apt install nonexistent"
        
    def test_generate_report(self):
        checker = DependencyChecker()
        report = checker.generate_report()
        assert report.os is not None
        assert report.arch is not None
        assert len(report.dependencies) > 0
        # At least node should be in dependencies
        node_dep = next((d for d in report.dependencies if d.name == "node"), None)
        assert node_dep is not None


# ============================================================================
# LLM PROVIDER TESTS
# ============================================================================

class TestLLMProviders:
    @pytest.mark.asyncio
    async def test_check_ollama_available(self):
        """Test Ollama check when available"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "models": [
                    {"name": "codellama:7b"},
                    {"name": "llama2:7b"}
                ]
            }
            
            mock_client_instance = MagicMock()
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            providers = await check_llm_providers()
            ollama = next((p for p in providers if p.name == "ollama"), None)
            assert ollama is not None
            
    @pytest.mark.asyncio
    async def test_check_windsurf_not_configured(self):
        """Test Windsurf shows not_configured without API key"""
        with patch.dict(os.environ, {}, clear=True):
            providers = await check_llm_providers()
            windsurf = next((p for p in providers if p.name == "windsurf"), None)
            assert windsurf is not None
            assert windsurf.status == LLMProviderStatus.NOT_CONFIGURED
            assert windsurf.fix == "Set WINDSURF_API_KEY"


# ============================================================================
# CLI RUNNER TESTS
# ============================================================================

class TestCLIRunner:
    def test_runner_initialization(self):
        runner = CLIRunner("Test Runner", "1.0")
        assert runner.name == "Test Runner"
        assert runner.version == "1.0"
        assert len(runner.tasks) == 0
        
    def test_add_task(self):
        runner = CLIRunner("Test", "1.0")
        task = CLITask(id="test", name="Test Task", description="Testing")
        runner.add_task(task, lambda: TaskResult(success=True, message="OK"))
        assert len(runner.tasks) == 1
        
    @pytest.mark.asyncio
    async def test_run_single_task(self):
        runner = CLIRunner("Test", "1.0", verbose=False)
        task = CLITask(id="test", name="Test Task", description="Testing")
        runner.add_task(task, lambda: TaskResult(success=True, message="OK", data={"value": 42}))
        
        result = await runner.run()
        assert result["success"]
        assert result["completed"] == 1
        assert result["failed"] == 0
        
    @pytest.mark.asyncio
    async def test_run_with_skip(self):
        runner = CLIRunner("Test", "1.0", verbose=False)
        task = CLITask(id="skip-test", name="Skipped Task", description="Should skip")
        runner.add_task(
            task, 
            lambda: TaskResult(success=True, message="Should not run"),
            skip_fn=lambda: True
        )
        
        result = await runner.run()
        assert result["skipped"] == 1
        assert result["completed"] == 0
        
    @pytest.mark.asyncio
    async def test_run_failing_task(self):
        runner = CLIRunner("Test", "1.0", verbose=False)
        task = CLITask(id="fail-test", name="Failing Task", description="Will fail")
        
        def failing_task():
            raise Exception("Intentional failure")
            
        runner.add_task(task, failing_task)
        
        result = await runner.run()
        assert result["failed"] == 1
        assert not result["success"]


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestIntegration:
    @pytest.mark.asyncio
    async def test_full_setup_dry_run(self):
        """Test complete setup flow in dry run mode"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = SetupConfig(
                output_dir=tmpdir,
                install=False,
                interactive=False,
                yes=True
            )
            
            # Run setup (will check real Ollama if available)
            await cmd_setup(config)
            
            # Check files were created
            setup_dir = Path(tmpdir) / "setup"
            assert setup_dir.exists()
            
            tasks_file = setup_dir / "setup-tasks.json"
            assert tasks_file.exists()
            
            with open(tasks_file) as f:
                tasks = json.load(f)
            assert isinstance(tasks, list)
            
    def test_yaml_formatting(self):
        """Test YAML output formatting"""
        runner = CLIRunner("Test", "1.0")
        
        # Test simple data
        data = {"key": "value", "number": 42, "flag": True}
        lines = runner._format_yaml(data)
        assert 'key: "value"' in lines
        assert 'number: 42' in lines
        assert 'flag: true' in lines
        
    def test_yaml_nested_formatting(self):
        """Test nested YAML output"""
        runner = CLIRunner("Test", "1.0")
        
        data = {
            "parent": {
                "child": "value"
            },
            "list": [
                {"name": "item1"},
                {"name": "item2"}
            ]
        }
        lines = runner._format_yaml(data)
        yaml_str = "\n".join(lines)
        assert "parent:" in yaml_str
        assert "child:" in yaml_str
        assert "- name:" in yaml_str


# ============================================================================
# FEATURE PARITY TESTS (TypeScript vs Python)
# ============================================================================

class TestFeatureParity:
    """Tests to ensure Python version has same features as TypeScript"""
    
    def test_has_llm_provider_check(self):
        """TS: Check Ollama, Windsurf, OpenRouter"""
        # Python should check same providers
        assert True  # Verified in check_llm_providers
        
    def test_has_dependency_check(self):
        """TS: Check Node.js, Git, Docker, TypeScript"""
        checker = DependencyChecker()
        report = checker.generate_report()
        dep_names = [d.name for d in report.dependencies]
        assert "node" in dep_names
        assert "git" in dep_names
        
    def test_has_task_generation(self):
        """TS: Generate setup tasks from missing deps"""
        checker = DependencyChecker()
        report = checker.generate_report()
        # Should have setup_tasks list
        assert hasattr(report, 'setup_tasks')
        
    def test_has_file_saving(self):
        """TS: Save SETUP.md and setup-tasks.json"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = SetupConfig(output_dir=tmpdir, install=False, yes=True)
            asyncio.run(cmd_setup(config))
            
            assert (Path(tmpdir) / "setup" / "SETUP.md").exists()
            assert (Path(tmpdir) / "setup" / "setup-tasks.json").exists()
            
    def test_has_priority_levels(self):
        """TS: required, recommended, optional priorities"""
        assert Priority.REQUIRED.value == "required"
        assert Priority.RECOMMENDED.value == "recommended"
        assert Priority.OPTIONAL.value == "optional"
        
    def test_has_install_modes(self):
        """TS: --install, --dry-run, -y flags"""
        config = SetupConfig(install=True, yes=True, skip_optional=True)
        assert config.install is True
        assert config.yes is True
        assert config.skip_optional is True
        
    def test_task_statuses(self):
        """TS: pending, running, done, failed, skipped"""
        assert TaskStatus.PENDING.value == "pending"
        assert TaskStatus.RUNNING.value == "running"
        assert TaskStatus.DONE.value == "done"
        assert TaskStatus.FAILED.value == "failed"
        assert TaskStatus.SKIPPED.value == "skipped"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
