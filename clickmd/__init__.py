"""
clickmd - Markdown rendering for CLI applications

Core functions (no click dependency):
    md(text) - Render markdown with syntax highlighting
    echo(message) - Smart echo with markdown detection
    render_markdown(text) - Low-level markdown rendering

Click decorators (require click installed):
    from clickmd.decorators import group, command, option, argument
"""

import re
import sys
from typing import Any, Optional

from .renderer import get_renderer, render_markdown, MarkdownRenderer

# Logger for automatic markdown wrapping
from .logger import (
    Logger,
    get_logger,
    set_logger,
    log_info,
    log_success,
    log_warning,
    log_error,
    log_action,
)

# Re-export decorators for backwards compatibility
from .decorators import (
    CLICK_AVAILABLE,
    group,
    command,
    option,
    argument,
    pass_context,
    Choice,
    Path,
    Context,
)


_MD_HINT_RE = re.compile(r"(^|\n)\s*#{1,6}\s|```|\*\*|\[[^\]]+\]\([^)]+\)")


def echo(
    message: Optional[Any] = None,
    file=None,
    nl: bool = True,
    err: bool = False,
    color: Optional[bool] = None,
) -> None:
    """
    Smart echo that auto-detects markdown and renders it with colors.
    
    Works without click installed - falls back to print().
    """
    if message is None:
        if CLICK_AVAILABLE:
            from .decorators import _click
            _click.echo(message, file=file, nl=nl, err=err, color=color)
        else:
            print("", file=file or sys.stdout, end="\n" if nl else "")
        return

    text = str(message)
    if _MD_HINT_RE.search(text):
        stream = None
        if file is not None:
            stream = file
        elif err:
            stream = sys.stderr
        r = get_renderer(stream=stream, use_colors=True)
        r.render_markdown_with_fences(text)
        return

    if CLICK_AVAILABLE:
        from .decorators import _click
        _click.echo(message, file=file, nl=nl, err=err, color=color)
    else:
        output = file or (sys.stderr if err else sys.stdout)
        print(text, file=output, end="\n" if nl else "")


def md(text: str) -> None:
    render_markdown(text)


__all__ = [
    # Core functions (no click dependency)
    "md",
    "echo",
    "render_markdown",
    "get_renderer",
    "MarkdownRenderer",
    "CLICK_AVAILABLE",
    # Logger (auto-wrapping in codeblocks)
    "Logger",
    "get_logger",
    "set_logger",
    "log_info",
    "log_success",
    "log_warning",
    "log_error",
    "log_action",
    # Click decorators (require click)
    "group",
    "command",
    "option",
    "argument",
    "pass_context",
    "Choice",
    "Path",
    "Context",
]
