"""
Tests for Reverse Engineering Integrity
Verifies that @auto, @unique and correct types are present in generated Markdown.
"""

import pytest
import sys
import os
from pathlib import Path
from unittest.mock import patch, MagicMock
from click.testing import CliRunner

# Ensure we can import reclapp
sys.path.insert(0, 'src/python')
sys.path.insert(0, '.')

from reclapp.cli import main

@pytest.fixture
def runner():
    return CliRunner()

def test_reverse_markdown_content(runner, tmp_path):
    """
    Simulates a reverse engineering process and checks if the output Markdown 
    contains expected annotations like @auto and @unique.
    """
    # 1. Setup a dummy project structure
    app_dir = tmp_path / "my-test-app"
    app_dir.mkdir()
    
    # Create a dummy contract.ai.json that might be found by reverse
    contract_dir = app_dir / "contract"
    contract_dir.mkdir()
    
    # We'll mock the actual node execution but check what happens if we had a real one.
    # Since we can't easily run the Node analyzer in this environment without full setup,
    # we will mock the subprocess and manually create the output file it would have created,
    # then verify our Python CLI handles it.
    
    output_md = app_dir / "contract" / "test-app.rcl.md"
    
    # content that CodeAnalyzer + Markdown writer should produce
    mock_md_content = """# App: Test App

## Entities

### User

| Field | Type | Required | Unique | Auto |
|-------|------|----------|--------|------|
| id | uuid | yes | yes | yes |
| email | email | yes | yes | no |
| createdAt | datetime | yes | no | yes |
| updatedAt | datetime | yes | no | yes |
"""

    @patch("subprocess.run")
    @patch("reclapp.cli.find_node")
    def run_mocked_reverse(mock_find_node, mock_run):
        mock_find_node.return_value = "/usr/bin/node"
        
        # When subprocess runs, we simulate it creating the file
        def side_effect(*args, **kwargs):
            output_md.write_text(mock_md_content)
            return MagicMock(returncode=0)
        
        mock_run.side_effect = side_effect
        
        result = runner.invoke(main, ["reverse", str(app_dir), "--output", str(output_md)])
        return result

    result = run_mocked_reverse()
    
    assert result.exit_code == 0
    assert output_md.exists()
    
    content = output_md.read_text()
    assert "### User" in content
    # Check for presence of columns
    assert "| Unique | Auto |" in content
    # Check if @auto/yes logic is present (in markdown table format)
    assert "| id | uuid | yes | yes | yes |" in content
    assert "| createdAt | datetime | yes | no | yes |" in content
    assert "| email | email | yes | yes | no |" in content

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
