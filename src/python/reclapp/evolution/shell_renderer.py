"""
Shell Renderer

Renders colorized markdown output in terminal.

Mirrors: src/core/contract-ai/evolution/shell-renderer.ts
@version 1.0.0
"""

import re
from typing import Literal

# ANSI color codes
COLORS = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "dim": "\033[2m",
    "cyan": "\033[36m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "magenta": "\033[35m",
    "red": "\033[31m",
    "blue": "\033[34m",
    "gray": "\033[90m",
    "white": "\033[37m",
}


Language = Literal["yaml", "json", "bash", "typescript", "javascript", "markdown", "log", "text"]


class ShellRenderer:
    """
    Renders colorized output in terminal.
    
    Supports syntax highlighting for:
    - YAML
    - JSON
    - Bash
    - TypeScript/JavaScript
    - Markdown
    - Log messages
    
    Example:
        renderer = ShellRenderer(verbose=True)
        renderer.heading(2, "Status")
        renderer.codeblock("yaml", "status: ok\\ncount: 42")
    """
    
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
    
    def heading(self, level: int, text: str) -> None:
        """Print a heading"""
        if not self.verbose:
            return
        
        prefix = "#" * level
        print(f"\n{COLORS['bold']}{COLORS['cyan']}{prefix} {text}{COLORS['reset']}\n")
    
    def codeblock(self, language: Language, content: str) -> None:
        """Print a syntax-highlighted code block"""
        if not self.verbose:
            return
        
        print(f"{COLORS['dim']}```{language}{COLORS['reset']}")
        
        for line in content.split("\n"):
            highlighted = self._highlight_line(line, language)
            print(highlighted)
        
        print(f"{COLORS['dim']}```{COLORS['reset']}")
    
    def text(self, content: str) -> None:
        """Print plain text"""
        if not self.verbose:
            return
        print(content)
    
    def success(self, message: str) -> None:
        """Print success message"""
        if not self.verbose:
            return
        print(f"{COLORS['green']}✅ {message}{COLORS['reset']}")
    
    def error(self, message: str) -> None:
        """Print error message"""
        if not self.verbose:
            return
        print(f"{COLORS['red']}❌ {message}{COLORS['reset']}")
    
    def warning(self, message: str) -> None:
        """Print warning message"""
        if not self.verbose:
            return
        print(f"{COLORS['yellow']}⚠️ {message}{COLORS['reset']}")
    
    def info(self, message: str) -> None:
        """Print info message"""
        if not self.verbose:
            return
        print(f"{COLORS['cyan']}ℹ️ {message}{COLORS['reset']}")
    
    def _highlight_line(self, line: str, language: Language) -> str:
        """Apply syntax highlighting to a line"""
        if language == "yaml":
            return self._highlight_yaml(line)
        elif language == "json":
            return self._highlight_json(line)
        elif language == "bash":
            return self._highlight_bash(line)
        elif language in ("typescript", "javascript"):
            return self._highlight_js(line)
        elif language == "log":
            return self._highlight_log(line)
        else:
            return line
    
    def _highlight_yaml(self, line: str) -> str:
        """Highlight YAML syntax"""
        # Comments
        if line.strip().startswith("#"):
            return f"{COLORS['gray']}{line}{COLORS['reset']}"
        
        # Key: value
        match = re.match(r'^(\s*)([^:]+)(:)(.*)$', line)
        if match:
            indent, key, colon, value = match.groups()
            
            # Colorize value based on type
            value_colored = value
            if value.strip().isdigit() or re.match(r'^\s*-?\d+\.?\d*$', value):
                value_colored = f"{COLORS['magenta']}{value}{COLORS['reset']}"
            elif value.strip().lower() in ("true", "false", "yes", "no", "null", "none"):
                value_colored = f"{COLORS['yellow']}{value}{COLORS['reset']}"
            elif value.strip().startswith('"') or value.strip().startswith("'"):
                value_colored = f"{COLORS['green']}{value}{COLORS['reset']}"
            elif value.strip():
                value_colored = f"{COLORS['green']}{value}{COLORS['reset']}"
            
            return f"{indent}{COLORS['cyan']}{key}{COLORS['reset']}{colon}{value_colored}"
        
        # List item
        if line.strip().startswith("-"):
            return f"{COLORS['yellow']}{line}{COLORS['reset']}"
        
        return line
    
    def _highlight_json(self, line: str) -> str:
        """Highlight JSON syntax"""
        # Keys
        line = re.sub(
            r'"([^"]+)"\s*:',
            f'{COLORS["cyan"]}"\\1"{COLORS["reset"]}:',
            line
        )
        # String values
        line = re.sub(
            r':\s*"([^"]*)"',
            f': {COLORS["green"]}"\\1"{COLORS["reset"]}',
            line
        )
        # Numbers
        line = re.sub(
            r':\s*(\d+\.?\d*)',
            f': {COLORS["magenta"]}\\1{COLORS["reset"]}',
            line
        )
        # Booleans
        line = re.sub(
            r':\s*(true|false|null)',
            f': {COLORS["yellow"]}\\1{COLORS["reset"]}',
            line
        )
        return line
    
    def _highlight_bash(self, line: str) -> str:
        """Highlight Bash syntax"""
        # Comments
        if line.strip().startswith("#"):
            return f"{COLORS['gray']}{line}{COLORS['reset']}"
        
        # Commands
        commands = ["cd", "npm", "node", "python", "pip", "git", "docker", "reclapp", "ollama"]
        for cmd in commands:
            if line.strip().startswith(cmd):
                return f"{COLORS['cyan']}{line}{COLORS['reset']}"
        
        return line
    
    def _highlight_js(self, line: str) -> str:
        """Highlight JavaScript/TypeScript syntax"""
        # Keywords
        keywords = ["const", "let", "var", "function", "async", "await", "return", "import", "export", "from", "class", "interface", "type"]
        for kw in keywords:
            line = re.sub(
                rf'\b{kw}\b',
                f'{COLORS["magenta"]}{kw}{COLORS["reset"]}',
                line
            )
        
        # Strings
        line = re.sub(
            r'(["\'])(.*?)\1',
            f'{COLORS["green"]}\\1\\2\\1{COLORS["reset"]}',
            line
        )
        
        # Comments
        if "//" in line:
            parts = line.split("//", 1)
            line = parts[0] + f"{COLORS['gray']}//{parts[1]}{COLORS['reset']}"
        
        return line
    
    def _highlight_log(self, line: str) -> str:
        """Highlight log messages"""
        if "✅" in line or "success" in line.lower():
            return f"{COLORS['green']}{line}{COLORS['reset']}"
        elif "❌" in line or "error" in line.lower() or "fail" in line.lower():
            return f"{COLORS['red']}{line}{COLORS['reset']}"
        elif "⚠️" in line or "warn" in line.lower():
            return f"{COLORS['yellow']}{line}{COLORS['reset']}"
        elif "ℹ️" in line or "info" in line.lower():
            return f"{COLORS['cyan']}{line}{COLORS['reset']}"
        return line
