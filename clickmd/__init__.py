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

from .renderer import (
    get_renderer,
    render_markdown,
    MarkdownRenderer,
    strip_ansi,
    # Phase 1 features
    table,
    panel,
    blockquote,
    hr,
    checklist,
)

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

# Re-export decorators - complete Click API
from .decorators import (
    CLICK_AVAILABLE,
    _click,
    # Decorators
    group,
    command,
    option,
    argument,
    pass_context,
    pass_obj,
    make_pass_decorator,
    confirmation_option,
    help_option,
    password_option,
    version_option,
    # Parameter types
    STRING,
    INT,
    FLOAT,
    BOOL,
    UUID,
    UNPROCESSED,
    Choice,
    Path,
    File,
    DateTime,
    IntRange,
    FloatRange,
    Tuple,
    ParamType,
    # Core classes
    Context,
    Command,
    Group,
    Option,
    Argument,
    Parameter,
    HelpFormatter,
    CommandCollection,
    # Utility functions
    click_echo,
    secho,
    style,
    unstyle,
    echo_via_pager,
    clear,
    prompt,
    confirm,
    getchar,
    pause,
    edit,
    progressbar,
    open_file,
    format_filename,
    get_app_dir,
    get_binary_stream,
    get_text_stream,
    get_current_context,
    launch,
    wrap_text,
    # Exceptions
    ClickException,
    Abort,
    UsageError,
    BadParameter,
    BadOptionUsage,
    BadArgumentUsage,
    FileError,
    MissingParameter,
    NoSuchOption,
)

# Markdown help for Click (require click installed)
from .help import (
    MarkdownCommand,
    MarkdownGroup,
    MarkdownHelpFormatter,
    markdown_help,
    success,
    warning,
    error,
    info,
    echo_md,
)

# Optional Rich backend
from .rich_backend import (
    RICH_AVAILABLE,
    is_rich_available,
    get_console,
    render_md,
    render_panel,
    render_syntax,
    render_table,
)

# Phase 3: Progress, spinners, live updates
from .progress import (
    ProgressBar,
    progress,
    Spinner,
    spinner,
    LiveUpdate,
    live,
    StatusIndicator,
    countdown,
    SPINNERS,
)

# Phase 4: Theming
from .themes import (
    Theme,
    THEMES,
    get_theme,
    set_theme,
    register_theme,
    list_themes,
    is_no_color,
    get_color_support,
    color,
)

# Phase 5: Dev Tools
from .devtools import (
    PrettyExceptionFormatter,
    install_excepthook,
    uninstall_excepthook,
    debug,
    inspect_obj,
    ClickmdHandler,
    diff,
    tree,
)


_MD_HINT_RE = re.compile(r"(^|\n)\s*#{1,6}\s|```|\*\*|\[[^\]]+\]\([^)]+\)")


def menu(
    title: str,
    items: list,
    default: int = 1,
    prompt_text: str = "Select",
    exit_option: Optional[str] = "Exit",
) -> int:
    """
    Display a numbered markdown menu and prompt for selection.

    Args:
        title: Menu heading (markdown supported, e.g. "## Main Menu")
        items: List of strings or (key, description) tuples
        default: Default selection (1-based), shown in prompt
        prompt_text: Prompt label shown before input
        exit_option: Label for option 0. None = no exit option.

    Returns:
        int: 1-based index of selected item, 0 for exit/cancel, -1 on error

    Example:
        choice = clickmd.menu("## LLM Provider", [
            ("groq", "Groq — fast & free tier"),
            ("openrouter", "OpenRouter — multi-model"),
            ("ollama", "Ollama — local, no API key"),
        ])
    """
    lines: list[str] = []
    heading = title if title.lstrip().startswith("#") else f"## {title}"
    lines.append(heading)
    lines.append("")

    if exit_option is not None:
        lines.append(f"**0.** {exit_option}")

    for i, item in enumerate(items, 1):
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            key, desc = str(item[0]), str(item[1])
            lines.append(f"**{i}.** `{key}` — {desc}")
        else:
            lines.append(f"**{i}.** {str(item)}")

    lines.append("")
    md("\n".join(lines))

    max_i = len(items)
    range_hint = f"0-{max_i}" if exit_option is not None else f"1-{max_i}"

    while True:
        if CLICK_AVAILABLE:
            try:
                val = prompt(f"{prompt_text} [{range_hint}]", default=str(default))
                choice = int(str(val).strip())
            except (ValueError, TypeError):
                choice = -1
            except Exception:
                return -1
        else:
            try:
                raw = input(f"{prompt_text} [{range_hint}] (default {default}): ").strip()
                choice = int(raw) if raw else default
            except (ValueError, EOFError, KeyboardInterrupt):
                return 0

        lo = 0 if exit_option is not None else 1
        if lo <= choice <= max_i:
            return choice
        md(f"> ⚠️ Invalid selection `{choice}`. Enter a number between {lo} and {max_i}.")


def select(prompt_text: str, items: list, default: int = 1) -> int:
    """
    Inline numbered selection without a title heading.
    Shorthand for menu() with no title.

    Returns 1-based index, 0 for exit.
    """
    return menu(title="", items=items, default=default, prompt_text=prompt_text, exit_option=None)


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
    "menu",
    "select",
    "echo",
    "echo_md",
    "render_markdown",
    "get_renderer",
    "MarkdownRenderer",
    "strip_ansi",
    "CLICK_AVAILABLE",
    # Phase 1: Tables, panels, blockquotes, etc.
    "table",
    "panel",
    "blockquote",
    "hr",
    "checklist",
    # Logger (auto-wrapping in codeblocks)
    "Logger",
    "get_logger",
    "set_logger",
    "log_info",
    "log_success",
    "log_warning",
    "log_error",
    "log_action",
    # Click API (require click) - Decorators
    "group",
    "command",
    "option",
    "argument",
    "pass_context",
    "pass_obj",
    "make_pass_decorator",
    "confirmation_option",
    "help_option",
    "password_option",
    "version_option",
    # Click API - Parameter types
    "STRING",
    "INT",
    "FLOAT",
    "BOOL",
    "UUID",
    "UNPROCESSED",
    "Choice",
    "Path",
    "File",
    "DateTime",
    "IntRange",
    "FloatRange",
    "Tuple",
    "ParamType",
    # Click API - Core classes
    "Context",
    "Command",
    "Group",
    "Option",
    "Argument",
    "Parameter",
    "HelpFormatter",
    "CommandCollection",
    # Click API - Utility functions
    "click_echo",
    "secho",
    "style",
    "unstyle",
    "echo_via_pager",
    "clear",
    "prompt",
    "confirm",
    "getchar",
    "pause",
    "edit",
    "progressbar",
    "open_file",
    "format_filename",
    "get_app_dir",
    "get_binary_stream",
    "get_text_stream",
    "get_current_context",
    "launch",
    "wrap_text",
    # Click API - Exceptions
    "ClickException",
    "Abort",
    "UsageError",
    "BadParameter",
    "BadOptionUsage",
    "BadArgumentUsage",
    "FileError",
    "MissingParameter",
    "NoSuchOption",
    # Markdown help for Click (USP)
    "MarkdownCommand",
    "MarkdownGroup",
    "MarkdownHelpFormatter",
    "markdown_help",
    # Styled output panels
    "success",
    "warning",
    "error",
    "info",
    # Rich backend (optional)
    "RICH_AVAILABLE",
    "is_rich_available",
    "get_console",
    "render_md",
    "render_panel",
    "render_syntax",
    "render_table",
    # Phase 3: Progress, spinners, live updates
    "ProgressBar",
    "progress",
    "Spinner",
    "spinner",
    "LiveUpdate",
    "live",
    "StatusIndicator",
    "countdown",
    "SPINNERS",
    # Phase 4: Theming
    "Theme",
    "THEMES",
    "get_theme",
    "set_theme",
    "register_theme",
    "list_themes",
    "is_no_color",
    "get_color_support",
    "color",
    # Phase 5: Dev Tools
    "PrettyExceptionFormatter",
    "install_excepthook",
    "uninstall_excepthook",
    "debug",
    "inspect_obj",
    "ClickmdHandler",
    "diff",
    "tree",
]
