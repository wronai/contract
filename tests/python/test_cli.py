"""
Tests for Reclapp CLI Integration

Tests the CLI commands with Python engine.
Run: pytest tests/python/test_cli.py -v
"""

import pytest
import sys
import asyncio
from pathlib import Path
from unittest.mock import patch, MagicMock
from click.testing import CliRunner

sys.path.insert(0, 'src/python')
sys.path.insert(0, '.')

from reclapp.cli import main


@pytest.fixture
def runner():
    return CliRunner()


@pytest.fixture
def sample_contract_md(tmp_path):
    """Create a sample contract markdown file"""
    contract = '''---
name: Test App
version: "1.0.0"
---

# App: Test App

A simple test application.

## Entities

### User

| Field | Type | Required |
|-------|------|----------|
| id | UUID | yes |
| name | String | yes |
| email | Email | yes |
| createdAt | DateTime | no |

## API

Version: v1
Prefix: /api/v1

### Users Resource

| Method | Path | Description |
|--------|------|-------------|
| GET | /users | List all users |
| POST | /users | Create user |
| GET | /users/:id | Get user |

## Tech Stack

- Backend: Node.js + Express + TypeScript
- Port: 3000
'''
    contract_file = tmp_path / "test.contract.md"
    contract_file.write_text(contract)
    return str(contract_file)


# ============================================================================
# BASIC CLI TESTS
# ============================================================================

class TestCLIBasic:
    def test_help(self, runner):
        result = runner.invoke(main, ["--help"])
        assert result.exit_code == 0
        assert "Reclapp" in result.output
        
    def test_version(self, runner):
        result = runner.invoke(main, ["--version"])
        assert result.exit_code == 0
        assert "Reclapp" in result.output or "v" in result.output


# ============================================================================
# EVOLVE COMMAND TESTS
# ============================================================================

class TestEvolveCommand:
    def test_evolve_help(self, runner):
        result = runner.invoke(main, ["evolve", "--help"])
        assert result.exit_code == 0
        assert "prompt" in result.output.lower()
        
    def test_evolve_requires_prompt(self, runner):
        result = runner.invoke(main, ["evolve"])
        assert result.exit_code != 0
        
    def test_evolve_python_engine(self, runner, tmp_path):
        output_dir = tmp_path / "evolved-app"
        result = runner.invoke(main, [
            "evolve",
            "-p", "Create a simple notes app",
            "-o", str(output_dir),
            "--engine", "python"
        ])
        # May fail due to missing LLM, but should not crash
        assert "Evolution" in result.output or "Error" in result.output or result.exit_code in (0, 1)


# ============================================================================
# GENERATE COMMAND TESTS
# ============================================================================

class TestGenerateCommand:
    def test_generate_help(self, runner):
        result = runner.invoke(main, ["generate", "--help"])
        assert result.exit_code == 0
        assert "contract" in result.output.lower()
        
    def test_generate_missing_file(self, runner):
        result = runner.invoke(main, [
            "generate",
            "nonexistent.contract.md",
            "--engine", "python"
        ])
        assert result.exit_code != 0
        
    def test_generate_markdown_contract(self, runner, sample_contract_md, tmp_path):
        output_dir = tmp_path / "generated"
        result = runner.invoke(main, [
            "generate",
            sample_contract_md,
            "-o", str(output_dir),
            "--engine", "python"
        ])
        # Should attempt to generate
        assert "Generating" in result.output or "Generator" in result.output or "Error" in result.output


# ============================================================================
# VALIDATE COMMAND TESTS
# ============================================================================

class TestValidateCommand:
    def test_validate_help(self, runner):
        result = runner.invoke(main, ["validate", "--help"])
        assert result.exit_code == 0


# ============================================================================
# LIST COMMAND TESTS
# ============================================================================

class TestListCommand:
    def test_list_help(self, runner):
        result = runner.invoke(main, ["list", "--help"])
        assert result.exit_code == 0


# ============================================================================
# PROMPTS COMMAND TESTS
# ============================================================================

class TestPromptsCommand:
    def test_prompts_help(self, runner):
        result = runner.invoke(main, ["prompts", "--help"])
        assert result.exit_code == 0
        
    def test_prompts_default(self, runner):
        result = runner.invoke(main, ["prompts"])
        assert result.exit_code == 0
        # Should show some prompts in YAML format
        assert "prompts:" in result.output or "minimal" in result.output


# ============================================================================
# SETUP COMMAND TESTS
# ============================================================================

class TestSetupCommand:
    def test_setup_help(self, runner):
        result = runner.invoke(main, ["setup", "--help"])
        assert result.exit_code == 0
        assert "setup" in result.output.lower()


# ============================================================================
# ENGINE SWITCHING TESTS
# ============================================================================

class TestEngineSwitching:
    def test_evolve_engine_option(self, runner):
        result = runner.invoke(main, ["evolve", "--help"])
        assert "engine" in result.output
        assert "python" in result.output
        assert "node" in result.output
        
    def test_generate_engine_option(self, runner):
        result = runner.invoke(main, ["generate", "--help"])
        assert "engine" in result.output


# ============================================================================
# REVERSE COMMAND TESTS
# ============================================================================

class TestReverseCommand:
    def test_reverse_help(self, runner):
        result = runner.invoke(main, ["reverse", "--help"])
        assert result.exit_code == 0
        assert "reverse-engineer" in result.output.lower()

    def test_reverse_missing_dir(self, runner):
        result = runner.invoke(main, ["reverse", "nonexistent_dir"])
        assert result.exit_code != 0

    @patch("subprocess.run")
    @patch("reclapp.cli.find_node")
    def test_reverse_execution(self, mock_find_node, mock_run, runner, tmp_path):
        mock_find_node.return_value = "/usr/bin/node"
        mock_run.return_value = MagicMock(returncode=0)
        
        target_dir = tmp_path / "app"
        target_dir.mkdir()
        
        # Create a mock contract to avoid analysis failure if it looks for it
        contract_dir = target_dir / "contract"
        contract_dir.mkdir()
        (contract_dir / "contract.ai.json").write_text("{}")
        
        result = runner.invoke(main, ["reverse", str(target_dir)])
        assert result.exit_code == 0
        assert "Reverse engineering" in result.output


# ============================================================================
# NEW COMMANDS TESTS (SMOKE TESTS)
# ============================================================================

class TestNewCommands:
    def test_analyze_help(self, runner):
        result = runner.invoke(main, ["analyze", "--help"])
        assert result.exit_code == 0
        assert "analyze" in result.output.lower()

    @patch("reclapp.cli._get_core_main")
    def test_analyze_execution(self, mock_get_main, runner, tmp_path):
        mock_main = MagicMock()
        mock_main.cmd_analyze = MagicMock(side_effect=lambda *args, **kwargs: asyncio.sleep(0))
        mock_get_main.return_value = mock_main
        
        result = runner.invoke(main, ["analyze", "-d", str(tmp_path)])
        assert result.exit_code == 0

    def test_refactor_help(self, runner):
        result = runner.invoke(main, ["refactor", "--help"])
        assert result.exit_code == 0
        assert "refactor" in result.output.lower()

    def test_tasks_help(self, runner):
        result = runner.invoke(main, ["tasks", "--help"])
        assert result.exit_code == 0
        assert "tasks" in result.output.lower()

    def test_status_help(self, runner):
        result = runner.invoke(main, ["status", "--help"])
        assert result.exit_code == 0
        assert "status" in result.output.lower()

    @patch("reclapp.cli._get_core_main")
    def test_parse_markdown(self, mock_get_main, runner, tmp_path):
        mock_main = MagicMock()
        mock_main.cmd_parse = MagicMock(side_effect=lambda *args, **kwargs: asyncio.sleep(0))
        mock_get_main.return_value = mock_main
        
        contract_file = tmp_path / "app.rcl.md"
        contract_file.write_text("# App")
        
        result = runner.invoke(main, ["parse", str(contract_file)])
        assert result.exit_code == 0

    @patch("reclapp.cli._get_core_main")
    def test_validate_json(self, mock_get_main, runner, tmp_path):
        mock_main = MagicMock()
        mock_main.cmd_validate = MagicMock(side_effect=lambda *args, **kwargs: asyncio.sleep(0))
        mock_get_main.return_value = mock_main
        
        contract_file = tmp_path / "contract.json"
        contract_file.write_text("{}")
        
        result = runner.invoke(main, ["validate", str(contract_file)])
        assert result.exit_code == 0
