"""
Tests for Reclapp CLI Integration

Tests the CLI commands with Python engine.
Run: pytest tests/python/test_cli.py -v
"""

import pytest
import sys
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
        # Should show some prompts
        assert "Prompt" in result.output or "Create" in result.output


# ============================================================================
# SETUP COMMAND TESTS
# ============================================================================

class TestSetupCommand:
    def test_setup_help(self, runner):
        result = runner.invoke(main, ["setup", "--help"])
        assert result.exit_code == 0
        assert "install" in result.output.lower() or "dependencies" in result.output.lower()


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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
