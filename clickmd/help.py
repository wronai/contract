"""
clickmd.help - Markdown support for Click help text.

Provides MarkdownCommand, MarkdownGroup, and @markdown_help decorator
for rendering docstrings and option descriptions as Markdown.

Usage:
    import clickmd
    
    @clickmd.command(cls=clickmd.MarkdownCommand)
    def mycli():
        '''
        # My CLI Tool
        
        This tool does **amazing** things:
        - Feature one
        - Feature two
        
        ```bash
        mycli --help
        ```
        '''
        pass

    # Or use the decorator:
    @clickmd.command()
    @clickmd.markdown_help
    def mycli():
        '''# My CLI with markdown help'''
        pass
"""

import re
import sys
import textwrap
from functools import wraps
from typing import Any, Callable, Optional, TypeVar

from .renderer import MarkdownRenderer, get_renderer

# Check if click is available
try:
    import click
    CLICK_AVAILABLE = True
except ImportError:
    CLICK_AVAILABLE = False
    click = None  # type: ignore


F = TypeVar("F", bound=Callable[..., Any])


def _is_tty() -> bool:
    """Check if stdout is a TTY."""
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


def _render_markdown_help(text: str, use_colors: bool = True) -> str:
    """
    Render markdown text for help output.
    
    Returns rendered string with ANSI codes if use_colors=True and TTY,
    otherwise returns cleaned plain text.
    """
    if not text:
        return ""
    
    # Dedent the text (common in docstrings)
    text = textwrap.dedent(text).strip()
    
    if not use_colors or not _is_tty():
        # Plain text mode - strip markdown syntax but keep structure
        return _strip_markdown_to_plain(text)
    
    # Render with colors
    import io
    buffer = io.StringIO()
    renderer = MarkdownRenderer(stream=buffer, use_colors=True)
    renderer.render_markdown_with_fences(text)
    return buffer.getvalue().rstrip()


def _strip_markdown_to_plain(text: str) -> str:
    """
    Convert markdown to plain text, preserving structure.
    Removes syntax like **bold**, *italic*, `code` but keeps text.
    """
    # Remove code fences but keep content
    text = re.sub(r"```\w*\n(.*?)```", r"\1", text, flags=re.DOTALL)
    
    # Convert headers to uppercase with underline effect
    def header_to_plain(m: re.Match) -> str:
        level = len(m.group(1))
        title = m.group(2).strip()
        if level == 1:
            return f"\n{title.upper()}\n{'=' * len(title)}\n"
        elif level == 2:
            return f"\n{title}\n{'-' * len(title)}\n"
        else:
            return f"\n{title}\n"
    
    text = re.sub(r"^(#{1,6})\s+(.+)$", header_to_plain, text, flags=re.MULTILINE)
    
    # Remove bold/italic markers
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"_([^_]+)_", r"\1", text)
    
    # Remove inline code backticks
    text = re.sub(r"`([^`]+)`", r"\1", text)
    
    # Clean up multiple newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    
    return text.strip()


def _format_option_help(help_text: str, use_colors: bool = True) -> str:
    """
    Format option/argument help text with inline markdown.
    Handles **bold**, *italic*, `code` inline.
    """
    if not help_text:
        return ""
    
    if not use_colors or not _is_tty():
        # Strip markdown for plain text
        text = re.sub(r"\*\*([^*]+)\*\*", r"\1", help_text)
        text = re.sub(r"\*([^*]+)\*", r"\1", text)
        text = re.sub(r"`([^`]+)`", r"\1", text)
        return text
    
    # Apply inline formatting with ANSI
    renderer = MarkdownRenderer(use_colors=True)
    
    # Bold
    help_text = re.sub(
        r"\*\*([^*]+)\*\*",
        lambda m: renderer._c("white", m.group(1), bold=True),
        help_text
    )
    
    # Italic (using dim)
    help_text = re.sub(
        r"\*([^*]+)\*",
        lambda m: renderer._c("white", m.group(1), dim=True),
        help_text
    )
    
    # Inline code
    help_text = re.sub(
        r"`([^`]+)`",
        lambda m: renderer._c("cyan", m.group(1)),
        help_text
    )
    
    # Highlight --options and -flags
    help_text = re.sub(
        r"(--?\w+(?:-\w+)*)",
        lambda m: renderer._c("yellow", m.group(1)),
        help_text
    )
    
    return help_text


if CLICK_AVAILABLE:
    
    class MarkdownHelpFormatter(click.HelpFormatter):
        """
        Custom Click HelpFormatter that renders markdown.
        """
        
        def __init__(self, *args: Any, use_colors: bool = True, **kwargs: Any):
            super().__init__(*args, **kwargs)
            self.use_colors = use_colors and _is_tty()
        
        def write_usage(self, prog: str, args: str = "", prefix: Optional[str] = None) -> None:
            """Write usage with styling."""
            if prefix is None:
                prefix = "Usage: "
            
            if self.use_colors:
                renderer = MarkdownRenderer(use_colors=True)
                prefix = renderer._c("yellow", prefix, bold=True)
                prog = renderer._c("green", prog, bold=True)
            
            super().write_usage(prog, args, prefix)
        
        def write_heading(self, heading: str) -> None:
            """Write a heading with markdown styling."""
            if self.use_colors:
                renderer = MarkdownRenderer(use_colors=True)
                heading = renderer._c("blue", heading, bold=True)
            self.write(f"{heading}:\n")
        
        def write_paragraph(self) -> None:
            """Write a paragraph separator."""
            if self.buffer:
                self.write("\n")
        
        def write_text(self, text: str) -> None:
            """Write text, rendering markdown if present."""
            if not text:
                return
            
            # Check if text looks like markdown
            has_markdown = any([
                re.search(r"^#+\s", text, re.MULTILINE),  # Headers
                re.search(r"```", text),  # Code blocks
                re.search(r"\*\*[^*]+\*\*", text),  # Bold
                re.search(r"^[-*]\s", text, re.MULTILINE),  # Lists
            ])
            
            if has_markdown:
                rendered = _render_markdown_help(text, self.use_colors)
                # Indent to match Click's formatting
                lines = rendered.split("\n")
                indented = "\n".join("  " + line if line.strip() else "" for line in lines)
                self.write(indented + "\n")
            else:
                # Standard Click text wrapping
                text_width = max(self.width - 2, 10)
                wrapped = textwrap.wrap(text, text_width)
                for line in wrapped:
                    self.write(f"  {line}\n")
    
    
    class MarkdownCommand(click.Command):
        """
        Click Command subclass that renders docstring as Markdown.
        
        Usage:
            @click.command(cls=MarkdownCommand)
            def mycli():
                '''
                # My Tool
                
                Does **amazing** things.
                '''
                pass
        """
        
        def __init__(self, *args: Any, **kwargs: Any):
            super().__init__(*args, **kwargs)
            self._use_colors = True
        
        def format_help(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
            """Format help with markdown rendering."""
            # Use our custom formatter
            md_formatter = MarkdownHelpFormatter(
                width=formatter.width,
                max_width=formatter.width,
                use_colors=self._use_colors
            )
            
            self.format_usage(ctx, md_formatter)
            self.format_help_text(ctx, md_formatter)
            self.format_options(ctx, md_formatter)
            self.format_epilog(ctx, md_formatter)
            
            # Write to original formatter
            formatter.write(md_formatter.getvalue())
        
        def format_help_text(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
            """Format the help text (docstring) as markdown."""
            text = self.help
            if text:
                formatter.write_paragraph()
                rendered = _render_markdown_help(text, getattr(formatter, 'use_colors', True))
                # Write with proper indentation
                for line in rendered.split("\n"):
                    formatter.write(f"  {line}\n" if line.strip() else "\n")
        
        def format_options(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
            """Format options with markdown in help text."""
            opts = []
            for param in self.get_params(ctx):
                rv = param.get_help_record(ctx)
                if rv is not None:
                    # Apply markdown formatting to help text
                    opt_str, help_text = rv
                    help_text = _format_option_help(
                        help_text, 
                        getattr(formatter, 'use_colors', True)
                    )
                    opts.append((opt_str, help_text))
            
            if opts:
                use_colors = getattr(formatter, 'use_colors', True) and _is_tty()
                if use_colors:
                    renderer = MarkdownRenderer(use_colors=True)
                    heading = renderer._c("blue", "Options", bold=True)
                else:
                    heading = "Options"
                
                with formatter.section(heading):
                    formatter.write_dl(opts)
    
    
    class MarkdownGroup(click.Group):
        """
        Click Group subclass that renders docstring as Markdown.
        
        Usage:
            @click.group(cls=MarkdownGroup)
            def cli():
                '''
                # My CLI Suite
                
                A collection of **powerful** commands.
                '''
                pass
        """
        
        command_class = MarkdownCommand
        
        def __init__(self, *args: Any, **kwargs: Any):
            super().__init__(*args, **kwargs)
            self._use_colors = True
        
        def format_help(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
            """Format help with markdown rendering."""
            md_formatter = MarkdownHelpFormatter(
                width=formatter.width,
                max_width=formatter.width,
                use_colors=self._use_colors
            )
            
            self.format_usage(ctx, md_formatter)
            self.format_help_text(ctx, md_formatter)
            self.format_options(ctx, md_formatter)
            self.format_commands(ctx, md_formatter)
            self.format_epilog(ctx, md_formatter)
            
            formatter.write(md_formatter.getvalue())
        
        def format_help_text(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
            """Format the help text (docstring) as markdown."""
            text = self.help
            if text:
                formatter.write_paragraph()
                rendered = _render_markdown_help(text, getattr(formatter, 'use_colors', True))
                for line in rendered.split("\n"):
                    formatter.write(f"  {line}\n" if line.strip() else "\n")
        
        def format_commands(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
            """Format commands list with styling."""
            commands = []
            for subcommand in self.list_commands(ctx):
                cmd = self.get_command(ctx, subcommand)
                if cmd is None or cmd.hidden:
                    continue
                
                help_text = cmd.get_short_help_str(limit=formatter.width)
                help_text = _format_option_help(
                    help_text,
                    getattr(formatter, 'use_colors', True)
                )
                commands.append((subcommand, help_text))
            
            if commands:
                use_colors = getattr(formatter, 'use_colors', True) and _is_tty()
                if use_colors:
                    renderer = MarkdownRenderer(use_colors=True)
                    heading = renderer._c("blue", "Commands", bold=True)
                else:
                    heading = "Commands"
                
                with formatter.section(heading):
                    formatter.write_dl(commands)
        
        def format_options(self, ctx: click.Context, formatter: click.HelpFormatter) -> None:
            """Format options with markdown in help text."""
            opts = []
            for param in self.get_params(ctx):
                rv = param.get_help_record(ctx)
                if rv is not None:
                    opt_str, help_text = rv
                    help_text = _format_option_help(
                        help_text,
                        getattr(formatter, 'use_colors', True)
                    )
                    opts.append((opt_str, help_text))
            
            if opts:
                use_colors = getattr(formatter, 'use_colors', True) and _is_tty()
                if use_colors:
                    renderer = MarkdownRenderer(use_colors=True)
                    heading = renderer._c("blue", "Options", bold=True)
                else:
                    heading = "Options"
                
                with formatter.section(heading):
                    formatter.write_dl(opts)
    
    
    def markdown_help(func: F) -> F:
        """
        Decorator that enables markdown rendering for a Click command's help.
        
        Usage:
            @click.command()
            @clickmd.markdown_help
            def mycli():
                '''
                # My Tool
                
                Does **amazing** things with:
                - Feature one
                - Feature two
                
                ```bash
                mycli --verbose
                ```
                '''
                pass
        
        This is an alternative to using cls=MarkdownCommand.
        """
        if hasattr(func, "__click_params__"):
            # Already decorated with @click.command - modify the callback
            original_callback = func
            
            @wraps(func)
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                return original_callback(*args, **kwargs)
            
            # Copy click params
            wrapper.__click_params__ = getattr(func, "__click_params__", [])  # type: ignore
            
            # Mark for markdown help
            wrapper._clickmd_markdown_help = True  # type: ignore
            
            return wrapper  # type: ignore
        
        # Not yet decorated - just mark for later
        func._clickmd_markdown_help = True  # type: ignore
        return func

else:
    # Click not available - provide stub implementations
    
    class MarkdownHelpFormatter:  # type: ignore
        """Stub when click is not installed."""
        def __init__(self, *args: Any, **kwargs: Any):
            raise ImportError("MarkdownHelpFormatter requires click. Install with: pip install clickmd[click]")
    
    class MarkdownCommand:  # type: ignore
        """Stub when click is not installed."""
        def __init__(self, *args: Any, **kwargs: Any):
            raise ImportError("MarkdownCommand requires click. Install with: pip install clickmd[click]")
    
    class MarkdownGroup:  # type: ignore
        """Stub when click is not installed."""
        def __init__(self, *args: Any, **kwargs: Any):
            raise ImportError("MarkdownGroup requires click. Install with: pip install clickmd[click]")
    
    def markdown_help(func: F) -> F:
        """Stub decorator when click is not installed."""
        raise ImportError("markdown_help requires click. Install with: pip install clickmd[click]")


# Convenience functions for styled output panels
def success(message: str) -> None:
    """Display a success message in a green panel."""
    renderer = get_renderer(use_colors=_is_tty())
    text = f"✅ {message}"
    if _is_tty():
        print(renderer._c("green", text, bold=True))
    else:
        print(text)


def warning(message: str) -> None:
    """Display a warning message in a yellow panel."""
    renderer = get_renderer(use_colors=_is_tty())
    text = f"⚠️  {message}"
    if _is_tty():
        print(renderer._c("yellow", text, bold=True))
    else:
        print(text)


def error(message: str) -> None:
    """Display an error message in a red panel."""
    renderer = get_renderer(use_colors=_is_tty())
    text = f"🛑 {message}"
    if _is_tty():
        print(renderer._c("red", text, bold=True))
    else:
        print(text)


def info(message: str) -> None:
    """Display an info message in a blue panel."""
    renderer = get_renderer(use_colors=_is_tty())
    text = f"ℹ️  {message}"
    if _is_tty():
        print(renderer._c("cyan", text))
    else:
        print(text)


def echo_md(text: str, err: bool = False) -> None:
    """
    Echo markdown-formatted text to the terminal.
    
    Args:
        text: Markdown text to render
        err: If True, write to stderr
    
    Example:
        clickmd.echo_md("# Hello\\n**Bold** and *italic*")
    """
    import sys
    stream = sys.stderr if err else sys.stdout
    use_colors = hasattr(stream, "isatty") and stream.isatty()
    
    renderer = MarkdownRenderer(stream=stream, use_colors=use_colors)
    renderer.render_markdown_with_fences(text)
