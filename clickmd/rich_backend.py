"""
clickmd.rich_backend - Optional Rich integration for enhanced rendering.

When Rich is installed (`pip install clickmd[rich]`), clickmd can use Rich
for superior markdown rendering, syntax highlighting, and terminal output.

This module provides a fallback-aware API that uses Rich when available,
otherwise falls back to clickmd's built-in renderer.

Usage:
    from clickmd.rich_backend import render_md, is_rich_available
    
    if is_rich_available():
        render_md("# Rich Rendering")
    else:
        # Falls back to built-in renderer automatically
        render_md("# Built-in Rendering")
"""

import sys
from typing import Any, Optional, TextIO

# Check if Rich is available
try:
    from rich.console import Console
    from rich.markdown import Markdown
    from rich.panel import Panel
    from rich.syntax import Syntax
    from rich.table import Table
    from rich.theme import Theme
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    Console = None  # type: ignore
    Markdown = None  # type: ignore
    Panel = None  # type: ignore
    Syntax = None  # type: ignore
    Table = None  # type: ignore
    Theme = None  # type: ignore


def is_rich_available() -> bool:
    """Check if Rich is installed and available."""
    return RICH_AVAILABLE


# Global console instance (lazy initialized)
_console: Optional[Any] = None


def get_console(
    stream: Optional[TextIO] = None,
    force_terminal: Optional[bool] = None,
    no_color: bool = False,
) -> Any:
    """
    Get or create a Rich Console instance.
    
    Falls back to a simple wrapper if Rich is not available.
    """
    global _console
    
    if RICH_AVAILABLE:
        if stream is not None or force_terminal is not None or no_color:
            # Create a new console with custom settings
            return Console(
                file=stream or sys.stdout,
                force_terminal=force_terminal,
                no_color=no_color,
            )
        
        # Return cached default console
        if _console is None:
            _console = Console()
        return _console
    
    # Fallback: return a simple wrapper
    return _FallbackConsole(stream or sys.stdout)


class _FallbackConsole:
    """Simple console wrapper when Rich is not available."""
    
    def __init__(self, stream: TextIO):
        self._stream = stream
    
    def print(self, *args: Any, **kwargs: Any) -> None:
        """Print to stream, ignoring Rich-specific kwargs."""
        # Filter out Rich-specific kwargs
        text = " ".join(str(a) for a in args)
        print(text, file=self._stream)
    
    def rule(self, title: str = "", **kwargs: Any) -> None:
        """Print a horizontal rule."""
        width = 60
        if title:
            padding = (width - len(title) - 2) // 2
            line = "─" * padding + f" {title} " + "─" * padding
        else:
            line = "─" * width
        print(line, file=self._stream)


def render_md(
    text: str,
    stream: Optional[TextIO] = None,
    use_rich: bool = True,
) -> None:
    """
    Render markdown text to the terminal.
    
    Uses Rich if available and use_rich=True, otherwise falls back
    to clickmd's built-in renderer.
    
    Args:
        text: Markdown text to render
        stream: Output stream (default: stdout)
        use_rich: Whether to use Rich if available (default: True)
    """
    if RICH_AVAILABLE and use_rich:
        console = get_console(stream=stream)
        md = Markdown(text)
        console.print(md)
    else:
        # Fallback to built-in renderer
        from .renderer import MarkdownRenderer
        renderer = MarkdownRenderer(
            stream=stream or sys.stdout,
            use_colors=hasattr(stream or sys.stdout, "isatty") and (stream or sys.stdout).isatty()
        )
        renderer.render_markdown_with_fences(text)


def render_panel(
    content: str,
    title: Optional[str] = None,
    style: str = "default",
    stream: Optional[TextIO] = None,
) -> None:
    """
    Render content in a styled panel/box.
    
    Args:
        content: Text content (can be markdown)
        title: Optional panel title
        style: Panel style - "default", "info", "warning", "error", "success"
        stream: Output stream
    """
    style_map = {
        "default": "white",
        "info": "blue",
        "warning": "yellow", 
        "error": "red",
        "success": "green",
    }
    
    border_style = style_map.get(style, "white")
    
    if RICH_AVAILABLE:
        console = get_console(stream=stream)
        panel = Panel(
            Markdown(content),
            title=title,
            border_style=border_style,
        )
        console.print(panel)
    else:
        # Fallback: simple box drawing
        from .renderer import MarkdownRenderer
        renderer = MarkdownRenderer(
            stream=stream or sys.stdout,
            use_colors=True
        )
        
        width = 60
        top = "┌" + "─" * (width - 2) + "┐"
        bottom = "└" + "─" * (width - 2) + "┘"
        
        if title:
            title_line = f"│ {renderer._c(border_style, title, bold=True):<{width-4}} │"
            sep = "├" + "─" * (width - 2) + "┤"
            print(top)
            print(title_line)
            print(sep)
        else:
            print(top)
        
        for line in content.split("\n"):
            # Truncate long lines
            if len(line) > width - 4:
                line = line[:width-7] + "..."
            print(f"│ {line:<{width-4}} │")
        
        print(bottom)


def render_syntax(
    code: str,
    language: str = "python",
    theme: str = "monokai",
    line_numbers: bool = False,
    stream: Optional[TextIO] = None,
) -> None:
    """
    Render syntax-highlighted code.
    
    Args:
        code: Source code to highlight
        language: Programming language
        theme: Syntax highlighting theme
        line_numbers: Whether to show line numbers
        stream: Output stream
    """
    if RICH_AVAILABLE:
        console = get_console(stream=stream)
        syntax = Syntax(
            code,
            language,
            theme=theme,
            line_numbers=line_numbers,
        )
        console.print(syntax)
    else:
        # Fallback to built-in highlighting
        from .renderer import MarkdownRenderer
        renderer = MarkdownRenderer(
            stream=stream or sys.stdout,
            use_colors=True
        )
        renderer.codeblock(language, code)


def render_table(
    headers: list[str],
    rows: list[list[str]],
    title: Optional[str] = None,
    stream: Optional[TextIO] = None,
) -> None:
    """
    Render a formatted table.
    
    Args:
        headers: Column headers
        rows: Table rows (list of lists)
        title: Optional table title
        stream: Output stream
    """
    if RICH_AVAILABLE:
        console = get_console(stream=stream)
        table = Table(title=title)
        
        for header in headers:
            table.add_column(header)
        
        for row in rows:
            table.add_row(*row)
        
        console.print(table)
    else:
        # Fallback: simple ASCII table
        stream = stream or sys.stdout
        
        # Calculate column widths
        widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                if i < len(widths):
                    widths[i] = max(widths[i], len(str(cell)))
        
        # Print table
        if title:
            print(f"\n{title}", file=stream)
            print("=" * sum(widths) + "=" * (len(widths) * 3 + 1), file=stream)
        
        # Header
        header_line = "| " + " | ".join(h.ljust(widths[i]) for i, h in enumerate(headers)) + " |"
        sep_line = "|-" + "-|-".join("-" * w for w in widths) + "-|"
        
        print(header_line, file=stream)
        print(sep_line, file=stream)
        
        # Rows
        for row in rows:
            row_line = "| " + " | ".join(str(c).ljust(widths[i]) for i, c in enumerate(row)) + " |"
            print(row_line, file=stream)


# Convenience aliases matching Rich API
def print_md(text: str) -> None:
    """Print markdown (alias for render_md)."""
    render_md(text)


def print_panel(content: str, **kwargs: Any) -> None:
    """Print a panel (alias for render_panel)."""
    render_panel(content, **kwargs)


def print_syntax(code: str, language: str = "python", **kwargs: Any) -> None:
    """Print syntax-highlighted code (alias for render_syntax)."""
    render_syntax(code, language, **kwargs)


def print_table(headers: list[str], rows: list[list[str]], **kwargs: Any) -> None:
    """Print a table (alias for render_table)."""
    render_table(headers, rows, **kwargs)
