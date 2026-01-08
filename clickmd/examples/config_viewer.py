#!/usr/bin/env python3
"""
Config Viewer - Wyświetlanie konfiguracji

Pokazuje jak czytelnie wyświetlić pliki konfiguracyjne
(YAML, JSON, TOML) z syntax highlighting.

Run: python examples/config_viewer.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd


def show_yaml_config():
    """Wyświetl przykładową konfigurację YAML."""
    
    clickmd.md("# 📄 Config Viewer\n")
    clickmd.md("## YAML Configuration\n")
    
    yaml_config = """
# Application settings
app:
  name: MyApp
  version: 1.0.0
  debug: true

# Database
database:
  host: localhost
  port: 5432
  name: myapp_db

# Features
features:
  - authentication
  - logging
  - caching
"""
    
    clickmd.md(f"```yaml{yaml_config}```")


def show_json_config():
    """Wyświetl przykładową konfigurację JSON."""
    
    clickmd.md("\n## JSON Configuration\n")
    
    json_config = """{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "build": "webpack --mode production",
    "test": "jest --coverage"
  },
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}"""
    
    clickmd.md(f"```json\n{json_config}\n```")


def show_toml_config():
    """Wyświetl przykładową konfigurację TOML."""
    
    clickmd.md("\n## TOML Configuration\n")
    
    toml_config = """
[project]
name = "clickmd"
version = "1.5.0"
description = "Markdown for CLI"

[project.optional-dependencies]
click = ["click>=8.0"]
rich = ["rich>=13.0"]

[tool.pytest]
testpaths = ["tests"]
"""
    
    clickmd.md(f"```toml{toml_config}```")


def show_env_config():
    """Wyświetl zmienne środowiskowe."""
    
    clickmd.md("\n## Environment Variables\n")
    
    import os
    
    env_vars = {
        "PATH": os.environ.get("PATH", "")[:50] + "...",
        "HOME": os.environ.get("HOME", ""),
        "USER": os.environ.get("USER", ""),
        "SHELL": os.environ.get("SHELL", ""),
        "TERM": os.environ.get("TERM", ""),
    }
    
    clickmd.table(
        headers=["Variable", "Value"],
        rows=[[k, v] for k, v in env_vars.items()]
    )


def show_config_diff():
    """Pokaż różnicę między konfiguracjami."""
    
    clickmd.md("\n## Config Diff\n")
    
    old_config = """database:
  host: localhost
  port: 5432"""
    
    new_config = """database:
  host: db.example.com
  port: 5432
  ssl: true"""
    
    clickmd.diff(old_config, new_config, "config.old.yaml", "config.new.yaml")


def show_config_tree():
    """Pokaż strukturę konfiguracji jako drzewo."""
    
    clickmd.md("\n## Config Structure\n")
    
    config = {
        "app": {
            "name": "MyApp",
            "version": "1.0.0",
        },
        "database": {
            "connection": {
                "host": "localhost",
                "port": 5432,
            },
            "pool": {
                "min": 5,
                "max": 20,
            }
        },
        "logging": {
            "level": "INFO",
            "file": "/var/log/app.log",
        }
    }
    
    clickmd.tree(config, name="config/")


if __name__ == "__main__":
    show_yaml_config()
    show_json_config()
    show_toml_config()
    show_env_config()
    show_config_diff()
    show_config_tree()
