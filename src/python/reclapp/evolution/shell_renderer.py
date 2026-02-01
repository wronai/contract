"""
Shell Renderer

Renders colorized markdown output in terminal.
Uses clickmd.MarkdownRenderer as rendering backend.

Mirrors: src/core/contract-ai/evolution/shell-renderer.ts
@version 2.4.1 - Unified with clickmd
"""

import re
import sys
from typing import Literal, Optional

# Import clickmd renderer (or fallback to local ANSI codes)
try:
    from clickmd.renderer import MarkdownRenderer as _ClickmdRenderer, _COLORS as COLORS
    CLICKMD_AVAILABLE = True
except ImportError:
    CLICKMD_AVAILABLE = False
    _ClickmdRenderer = None
    # Fallback ANSI color codes
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
    
    Uses clickmd.MarkdownRenderer when available for consistent rendering
    across all reclapp components.
    
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
        self._clickmd_renderer: Optional[_ClickmdRenderer] = None
        self._log_enabled = False
        self._log_buffer: list[str] = []
        
        # Initialize clickmd renderer if available
        if CLICKMD_AVAILABLE and _ClickmdRenderer is not None:
            self._clickmd_renderer = _ClickmdRenderer(use_colors=True, stream=sys.stdout)

    @property
    def renderer(self) -> Optional["_ClickmdRenderer"]:
        """Expose underlying clickmd renderer"""
        return self._clickmd_renderer

    def enable_log(self) -> None:
        """Enable log buffering for markdown export"""
        self._log_enabled = True
        self._log_buffer = []

    def get_log(self) -> str:
        """Get buffered log as clean markdown"""
        return "\n".join(self._log_buffer)

    def clear_log(self) -> None:
        """Clear log buffer"""
        self._log_buffer = []

    def save_log(self, file_path: str) -> None:
        """Save log to file as markdown"""
        import os
        dir_path = os.path.dirname(file_path)
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(self.get_log())

    def _log(self, text: str) -> None:
        """Buffer log line if logging is enabled"""
        if self._log_enabled:
            # Strip ANSI codes for clean markdown
            clean = re.sub(r"\x1b\[[0-9;]*m", "", text)
            self._log_buffer.append(clean)

    def _get_clickmd(self):
        """Get clickmd module (lazy load)"""
        if hasattr(self, '_clickmd_module'):
            return self._clickmd_module
        try:
            import clickmd
            self._clickmd_module = clickmd
        except Exception:
            self._clickmd_module = None
        return self._clickmd_module

    def _try_md(self, text: str) -> bool:
        clickmd = self._get_clickmd()
        self._log(text)  # Buffer for log file
        if not clickmd:
            return False
        clickmd.md(text)
        return True

    def _try_echo(self, text: str) -> bool:
        clickmd = self._get_clickmd()
        self._log(text)  # Buffer for log file
        if not clickmd:
            return False
        clickmd.echo(text)
        return True
    
    def heading(self, level: int, text: str) -> None:
        """Print a heading"""
        if not self.verbose:
            return

        if self._try_md(f"{'#' * level} {text}\n"):
            return
        
        prefix = "#" * level
        self._log(f"{prefix} {text}")
        print(f"\n{COLORS['bold']}{COLORS['cyan']}{prefix} {text}{COLORS['reset']}\n")
    
    def codeblock(self, language: Language, content: str) -> None:
        """Print a syntax-highlighted code block"""
        if not self.verbose:
            return

        if self._try_md(f"```{language}\n{content}\n```\n"):
            return
        
        self._log(f"```{language}")
        print(f"{COLORS['dim']}```{language}{COLORS['reset']}")
        
        for line in content.split("\n"):
            self._log(line)
            highlighted = self._highlight_line(line, language)
            print(highlighted)
        
        self._log("```")
        print(f"{COLORS['dim']}```{COLORS['reset']}")
    
    def text(self, content: str) -> None:
        """Print plain text"""
        if not self.verbose:
            return

        if self._try_echo(content):
            return
        self._log(content)
        print(content)
    
    def success(self, message: str) -> None:
        """Print success message"""
        if not self.verbose:
            return

        if self._try_md(f"```log\n✅ {message}\n```\n"):
            return
        self._log(f"✅ {message}")
        print(f"{COLORS['green']}✅ {message}{COLORS['reset']}")
    
    def error(self, message: str) -> None:
        """Print error message"""
        if not self.verbose:
            return

        if self._try_md(f"```log\n❌ {message}\n```\n"):
            return
        self._log(f"❌ {message}")
        print(f"{COLORS['red']}❌ {message}{COLORS['reset']}")
    
    def warning(self, message: str) -> None:
        """Print warning message"""
        if not self.verbose:
            return

        if self._try_md(f"```log\n⚠️ {message}\n```\n"):
            return
        self._log(f"⚠️ {message}")
        print(f"{COLORS['yellow']}⚠️ {message}{COLORS['reset']}")
    
    def info(self, message: str) -> None:
        """Print info message"""
        if not self.verbose:
            return

        if self._try_md(f"```log\n→ {message}\n```\n"):
            return
        self._log(f"→ {message}")
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
