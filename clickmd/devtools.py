"""
clickmd.devtools - Developer tools for debugging and logging.

Provides:
- Pretty exception formatting with syntax highlighting
- Debug object inspection with colored output
- Logging handler for clickmd-styled log output
- Diff visualization

Usage:
    from clickmd import install_excepthook, debug, inspect_obj
    
    # Pretty exceptions
    install_excepthook()
    
    # Debug output
    debug(my_object)
    
    # Logging
    import logging
    logging.basicConfig(handlers=[ClickmdHandler()])
"""

import inspect
import logging
import os
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, TextIO, Tuple, Union

from .renderer import MarkdownRenderer, get_renderer, strip_ansi


# ============================================================================
# PRETTY EXCEPTIONS
# ============================================================================

class PrettyExceptionFormatter:
    """
    Format exceptions with syntax highlighting and context.
    
    Features:
    - Syntax-highlighted code snippets
    - Local variable inspection
    - Shortened file paths
    - Colored traceback
    """
    
    def __init__(
        self,
        show_locals: bool = True,
        context_lines: int = 3,
        max_string_length: int = 80,
        theme: str = "default",
    ):
        self.show_locals = show_locals
        self.context_lines = context_lines
        self.max_string_length = max_string_length
        self.theme = theme
        self._renderer = get_renderer(use_colors=True)
    
    def format_exception(
        self,
        exc_type: type,
        exc_value: BaseException,
        exc_tb: Any,
    ) -> str:
        """Format an exception with full traceback."""
        lines: List[str] = []
        
        # Header
        lines.append("")
        lines.append(self._renderer._c("red", "═" * 60, bold=True))
        lines.append(self._renderer._c("red", f" 🛑 {exc_type.__name__}", bold=True))
        lines.append(self._renderer._c("red", "═" * 60, bold=True))
        lines.append("")
        
        # Exception message
        lines.append(self._renderer._c("white", str(exc_value), bold=True))
        lines.append("")
        
        # Traceback
        lines.append(self._renderer._c("gray", "─" * 60))
        lines.append(self._renderer._c("cyan", " Traceback (most recent call last):", bold=True))
        lines.append(self._renderer._c("gray", "─" * 60))
        
        # Process frames
        tb_frames = traceback.extract_tb(exc_tb)
        for i, frame in enumerate(tb_frames):
            lines.extend(self._format_frame(frame, is_last=(i == len(tb_frames) - 1)))
        
        # Footer
        lines.append(self._renderer._c("gray", "─" * 60))
        
        return "\n".join(lines)
    
    def _format_frame(self, frame: traceback.FrameSummary, is_last: bool = False) -> List[str]:
        """Format a single traceback frame."""
        lines: List[str] = []
        
        # File and line info
        filepath = self._shorten_path(frame.filename)
        location = f"  {self._renderer._c('blue', filepath)}:{self._renderer._c('yellow', str(frame.lineno))}"
        func_name = self._renderer._c("green", frame.name, bold=True)
        lines.append(f"{location} in {func_name}")
        
        # Code context
        if frame.line:
            # Show the line with syntax highlighting
            line_num = self._renderer._c("gray", f"    {frame.lineno} │")
            code = self._highlight_python(frame.line.strip())
            
            if is_last:
                # Highlight the error line
                lines.append(f"{line_num} {self._renderer._c('red', '→')} {code}")
            else:
                lines.append(f"{line_num}   {code}")
        
        lines.append("")
        return lines
    
    def _shorten_path(self, filepath: str) -> str:
        """Shorten file path for display."""
        path = Path(filepath)
        
        # Try to make relative to cwd
        try:
            cwd = Path.cwd()
            if path.is_relative_to(cwd):
                return str(path.relative_to(cwd))
        except (ValueError, RuntimeError):
            pass
        
        # Try to make relative to home
        try:
            home = Path.home()
            if path.is_relative_to(home):
                return "~/" + str(path.relative_to(home))
        except (ValueError, RuntimeError):
            pass
        
        # Shorten site-packages paths
        parts = path.parts
        for i, part in enumerate(parts):
            if part == "site-packages":
                return "/".join(parts[i+1:])
        
        return str(path)
    
    def _highlight_python(self, code: str) -> str:
        """Apply Python syntax highlighting."""
        return self._renderer._highlight_python(code)


_original_excepthook = sys.excepthook
_excepthook_installed = False


def install_excepthook(
    show_locals: bool = False,
    context_lines: int = 3,
) -> None:
    """
    Install pretty exception hook.
    
    Args:
        show_locals: Show local variables in traceback
        context_lines: Number of context lines around error
    """
    global _excepthook_installed
    
    formatter = PrettyExceptionFormatter(
        show_locals=show_locals,
        context_lines=context_lines,
    )
    
    def pretty_excepthook(exc_type: type, exc_value: BaseException, exc_tb: Any) -> None:
        if issubclass(exc_type, KeyboardInterrupt):
            # Don't prettify keyboard interrupt
            _original_excepthook(exc_type, exc_value, exc_tb)
            return
        
        output = formatter.format_exception(exc_type, exc_value, exc_tb)
        print(output, file=sys.stderr)
    
    sys.excepthook = pretty_excepthook
    _excepthook_installed = True


def uninstall_excepthook() -> None:
    """Restore original exception hook."""
    global _excepthook_installed
    sys.excepthook = _original_excepthook
    _excepthook_installed = False


# ============================================================================
# DEBUG OUTPUT
# ============================================================================

def debug(
    obj: Any,
    name: str = "",
    max_depth: int = 3,
    max_items: int = 20,
    stream: Optional[TextIO] = None,
    markdown_safe: bool = True,
) -> None:
    """
    Pretty-print an object for debugging.
    
    Args:
        obj: Object to inspect
        name: Optional name/label
        max_depth: Maximum nesting depth
        max_items: Maximum items to show in sequences
        stream: Output stream (default: stdout)
        markdown_safe: Wrap in codeblock for markdown compatibility
    """
    renderer = get_renderer(stream=stream, use_colors=True)
    output = _format_debug_value(obj, renderer, depth=0, max_depth=max_depth, max_items=max_items)
    
    if name:
        header = renderer._c("cyan", f"🔍 {name}", bold=True)
        print(header)
    
    if markdown_safe:
        print("```")
    print(output)
    if markdown_safe:
        print("```")


def _format_debug_value(
    obj: Any,
    renderer: MarkdownRenderer,
    depth: int = 0,
    max_depth: int = 3,
    max_items: int = 20,
) -> str:
    """Format a value for debug output."""
    indent = "  " * depth
    
    if depth >= max_depth:
        return renderer._c("gray", f"{indent}...")
    
    obj_type = type(obj).__name__
    
    # None
    if obj is None:
        return renderer._c("gray", "None")
    
    # Booleans
    if isinstance(obj, bool):
        return renderer._c("yellow", str(obj))
    
    # Numbers
    if isinstance(obj, (int, float)):
        return renderer._c("cyan", str(obj))
    
    # Strings
    if isinstance(obj, str):
        if len(obj) > 80:
            obj = obj[:77] + "..."
        return renderer._c("green", repr(obj))
    
    # Lists/Tuples
    if isinstance(obj, (list, tuple)):
        if len(obj) == 0:
            return renderer._c("gray", f"{obj_type}()")
        
        bracket = "[" if isinstance(obj, list) else "("
        close = "]" if isinstance(obj, list) else ")"
        
        lines = [renderer._c("white", f"{obj_type}{bracket}")]
        for i, item in enumerate(obj[:max_items]):
            formatted = _format_debug_value(item, renderer, depth + 1, max_depth, max_items)
            lines.append(f"{indent}  {formatted},")
        
        if len(obj) > max_items:
            lines.append(f"{indent}  {renderer._c('gray', f'... ({len(obj) - max_items} more)')}")
        
        lines.append(f"{indent}{renderer._c('white', close)}")
        return "\n".join(lines)
    
    # Dicts
    if isinstance(obj, dict):
        if len(obj) == 0:
            return renderer._c("gray", "{}")
        
        lines = [renderer._c("white", "{")]
        for i, (key, value) in enumerate(list(obj.items())[:max_items]):
            key_str = renderer._c("cyan", repr(key))
            val_str = _format_debug_value(value, renderer, depth + 1, max_depth, max_items)
            lines.append(f"{indent}  {key_str}: {val_str},")
        
        if len(obj) > max_items:
            lines.append(f"{indent}  {renderer._c('gray', f'... ({len(obj) - max_items} more)')}")
        
        lines.append(f"{indent}{renderer._c('white', '}')}")
        return "\n".join(lines)
    
    # Sets
    if isinstance(obj, (set, frozenset)):
        if len(obj) == 0:
            return renderer._c("gray", f"{obj_type}()")
        
        items = list(obj)[:max_items]
        formatted_items = [_format_debug_value(item, renderer, depth + 1, max_depth, max_items) for item in items]
        
        if len(obj) > max_items:
            formatted_items.append(renderer._c("gray", f"... ({len(obj) - max_items} more)"))
        
        open_brace = renderer._c('white', f'{obj_type}({{')
        close_brace = renderer._c('white', '})')
        return f"{open_brace}{', '.join(formatted_items)}{close_brace}"
    
    # Objects with __dict__
    if hasattr(obj, "__dict__") and obj.__dict__:
        lines = [renderer._c("magenta", f"<{obj_type}>", bold=True)]
        for key, value in list(vars(obj).items())[:max_items]:
            key_str = renderer._c("cyan", key)
            val_str = _format_debug_value(value, renderer, depth + 1, max_depth, max_items)
            lines.append(f"{indent}  .{key_str} = {val_str}")
        return "\n".join(lines)
    
    # Default: repr
    return renderer._c("white", repr(obj)[:100])


def inspect_obj(obj: Any, markdown_safe: bool = True) -> None:
    """
    Inspect an object showing its type, methods, and attributes.
    
    Args:
        obj: Object to inspect
        markdown_safe: Wrap in codeblock for markdown compatibility
    """
    renderer = get_renderer(use_colors=True)
    
    print(renderer._c("cyan", f"\n🔬 Inspecting: {type(obj).__name__}", bold=True))
    
    if markdown_safe:
        print("```")
    
    print(renderer._c("gray", "─" * 50))
    
    # Type info
    print(f"  {renderer._c('yellow', 'Type:')} {type(obj)}")
    print(f"  {renderer._c('yellow', 'Module:')} {type(obj).__module__}")
    
    # Value (if simple)
    if isinstance(obj, (str, int, float, bool, type(None))):
        print(f"  {renderer._c('yellow', 'Value:')} {repr(obj)}")
    
    # Attributes
    attrs = [a for a in dir(obj) if not a.startswith("_")]
    if attrs:
        print(f"\n  {renderer._c('green', 'Attributes:', bold=True)}")
        for attr in attrs[:15]:
            try:
                val = getattr(obj, attr)
                if callable(val):
                    print(f"    {renderer._c('blue', attr)}()")
                else:
                    val_repr = repr(val)[:50]
                    print(f"    {renderer._c('cyan', attr)} = {val_repr}")
            except Exception:
                print(f"    {renderer._c('cyan', attr)} = {renderer._c('red', '<error>')}")
        
        if len(attrs) > 15:
            print(f"    {renderer._c('gray', f'... and {len(attrs) - 15} more')}")
    
    print(renderer._c("gray", "─" * 50))
    
    if markdown_safe:
        print("```")


# ============================================================================
# LOGGING HANDLER
# ============================================================================

class ClickmdHandler(logging.Handler):
    """
    Logging handler that formats logs with clickmd styling.
    
    Usage:
        import logging
        from clickmd import ClickmdHandler
        
        logging.basicConfig(
            level=logging.INFO,
            handlers=[ClickmdHandler()]
        )
        
        logging.info("Application started")
        logging.warning("Low disk space")
        logging.error("Connection failed")
    """
    
    LEVEL_STYLES = {
        logging.DEBUG: ("gray", "🔍"),
        logging.INFO: ("cyan", "ℹ️ "),
        logging.WARNING: ("yellow", "⚠️ "),
        logging.ERROR: ("red", "🛑"),
        logging.CRITICAL: ("red", "💀"),
    }
    
    def __init__(
        self,
        stream: Optional[TextIO] = None,
        use_colors: bool = True,
        show_time: bool = True,
        show_level: bool = True,
        show_name: bool = False,
    ):
        super().__init__()
        self._stream = stream or sys.stderr
        self._use_colors = use_colors
        self._show_time = show_time
        self._show_level = show_level
        self._show_name = show_name
        self._renderer = get_renderer(stream=self._stream, use_colors=use_colors)
    
    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record."""
        try:
            msg = self.format_record(record)
            print(msg, file=self._stream)
        except Exception:
            self.handleError(record)
    
    def format_record(self, record: logging.LogRecord) -> str:
        """Format a log record with styling."""
        parts: List[str] = []
        
        color, emoji = self.LEVEL_STYLES.get(record.levelno, ("white", "→"))
        
        # Timestamp
        if self._show_time:
            timestamp = datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
            parts.append(self._renderer._c("gray", timestamp))
        
        # Level
        if self._show_level:
            level = f"{emoji}"
            parts.append(level)
        
        # Logger name
        if self._show_name and record.name != "root":
            parts.append(self._renderer._c("blue", f"[{record.name}]"))
        
        # Message
        message = record.getMessage()
        parts.append(self._renderer._c(color, message))
        
        return " ".join(parts)


# ============================================================================
# DIFF VISUALIZATION
# ============================================================================

def diff(
    old: Union[str, List[str]],
    new: Union[str, List[str]],
    old_name: str = "old",
    new_name: str = "new",
    markdown_safe: bool = True,
) -> None:
    """
    Display a colored diff between two texts.
    
    Args:
        old: Original text (string or list of lines)
        new: New text (string or list of lines)
        old_name: Label for old version
        new_name: Label for new version
        markdown_safe: Wrap in codeblock for markdown compatibility
    """
    import difflib
    
    renderer = get_renderer(use_colors=True)
    
    # Convert to lines if needed
    old_lines = old.splitlines() if isinstance(old, str) else list(old)
    new_lines = new.splitlines() if isinstance(new, str) else list(new)
    
    differ = difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile=old_name,
        tofile=new_name,
        lineterm=""
    )
    
    if markdown_safe:
        print("```diff")
    
    for line in differ:
        if line.startswith("+++") or line.startswith("---"):
            print(renderer._c("white", line, bold=True))
        elif line.startswith("@@"):
            print(renderer._c("cyan", line))
        elif line.startswith("+"):
            print(renderer._c("green", line))
        elif line.startswith("-"):
            print(renderer._c("red", line))
        else:
            print(renderer._c("gray", line))
    
    if markdown_safe:
        print("```")


# ============================================================================
# TREE VIEW
# ============================================================================

def tree(
    data: Dict[str, Any],
    prefix: str = "",
    is_last: bool = True,
    name: str = "",
    _is_root: bool = True,
) -> None:
    """
    Display data in a tree structure.
    
    Args:
        data: Dictionary to display as tree
        prefix: Current line prefix (internal use)
        is_last: Is this the last item (internal use)
        name: Root name
        _is_root: Internal flag for codeblock wrapping
    """
    renderer = get_renderer(use_colors=True)
    
    # Start codeblock at root level
    if _is_root:
        print("```")
    
    if name and not prefix:
        print(renderer._c("cyan", name, bold=True))
    
    if not isinstance(data, dict):
        print(f"{prefix}{renderer._c('white', repr(data))}")
        if _is_root:
            print("```")
        return
    
    items = list(data.items())
    for i, (key, value) in enumerate(items):
        is_last_item = (i == len(items) - 1)
        
        connector = "└── " if is_last_item else "├── "
        key_colored = renderer._c("yellow", str(key))
        
        if isinstance(value, dict):
            print(f"{prefix}{connector}{key_colored}/")
            new_prefix = prefix + ("    " if is_last_item else "│   ")
            tree(value, prefix=new_prefix, is_last=is_last_item, _is_root=False)
        else:
            value_str = repr(value) if not isinstance(value, str) else value
            if len(value_str) > 50:
                value_str = value_str[:47] + "..."
            print(f"{prefix}{connector}{key_colored}: {renderer._c('green', value_str)}")
    
    # End codeblock at root level
    if _is_root:
        print("```")
