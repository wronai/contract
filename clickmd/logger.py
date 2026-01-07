"""
clickmd.logger - Automatic log wrapping in markdown codeblocks.

Provides a Logger class that automatically wraps output in ```log blocks
and handles exceptions, progress, and status messages consistently.

Usage:
    from clickmd import Logger
    
    log = Logger()
    log.info("Starting process...")
    log.success("Done!")
    log.error("Failed!")
    
    # Or use context manager for grouped output
    with log.section("Building"):
        log.info("Step 1...")
        log.info("Step 2...")
"""

import sys
import traceback
from contextlib import contextmanager
from typing import Any, Literal, Optional, TextIO

from .renderer import MarkdownRenderer, get_renderer


LogLevel = Literal["debug", "info", "warning", "error", "success"]

# Emoji prefixes for log levels
_LEVEL_EMOJI = {
    "debug": "🔍",
    "info": "→",
    "warning": "⚠️",
    "error": "🛑",
    "success": "✅",
}

# Additional emojis for common actions
_ACTION_EMOJI = {
    "start": "🚀",
    "stop": "🛑",
    "process": "📦",
    "generate": "🔨",
    "test": "🧪",
    "save": "💾",
    "load": "📂",
    "send": "📤",
    "receive": "📥",
    "wait": "⏳",
    "done": "✅",
    "fail": "❌",
    "skip": "⏭️",
    "config": "⚙️",
    "llm": "🤖",
    "contract": "📋",
    "code": "💻",
    "api": "🔌",
    "db": "🗄️",
    "docker": "🐳",
    "git": "📊",
}


class Logger:
    """
    Markdown-aware logger that wraps output in codeblocks.
    
    All log methods automatically wrap output in ```log blocks
    for consistent CLI rendering with clickmd.
    
    Example:
        log = Logger(verbose=True)
        
        log.info("Starting...")
        log.success("Build completed")
        log.warning("Cache miss")
        log.error("Connection failed")
        
        # With actions
        log.action("start", "Evolution mode")
        log.action("llm", "Using OpenRouter")
        
        # Progress
        log.progress("Installing", 50, 100)
        
        # Exceptions
        try:
            risky_operation()
        except Exception as e:
            log.exception(e)
        
        # Grouped output
        with log.section("Generation"):
            log.info("Step 1")
            log.info("Step 2")
    """
    
    def __init__(
        self,
        verbose: bool = True,
        stream: Optional[TextIO] = None,
        use_colors: bool = True,
        buffer_logs: bool = False
    ):
        self.verbose = verbose
        self._stream = stream or sys.stdout
        self._use_colors = use_colors
        self._buffer_logs = buffer_logs
        self._buffer: list[str] = []
        self._in_section = False
        self._section_lines: list[str] = []
        self._renderer = get_renderer(stream=self._stream, use_colors=use_colors)
    
    def _emit(self, message: str) -> None:
        """Emit a log line"""
        if not self.verbose:
            return
        
        if self._in_section:
            self._section_lines.append(message)
        elif self._buffer_logs:
            self._buffer.append(message)
        else:
            self._render_log_block([message])
    
    def _render_log_block(self, lines: list[str]) -> None:
        """Render lines as a markdown log codeblock"""
        if not lines:
            return
        
        content = "\n".join(lines)
        self._renderer.codeblock("log", content)
    
    def flush(self) -> None:
        """Flush buffered logs"""
        if self._buffer:
            self._render_log_block(self._buffer)
            self._buffer = []
    
    # ========================================================================
    # LOG LEVELS
    # ========================================================================
    
    def debug(self, message: str) -> None:
        """Debug message (gray)"""
        self._emit(f"{_LEVEL_EMOJI['debug']} {message}")
    
    def info(self, message: str) -> None:
        """Info message (default)"""
        self._emit(f"{_LEVEL_EMOJI['info']} {message}")
    
    def warning(self, message: str) -> None:
        """Warning message (yellow)"""
        self._emit(f"{_LEVEL_EMOJI['warning']} {message}")
    
    def error(self, message: str) -> None:
        """Error message (red)"""
        self._emit(f"{_LEVEL_EMOJI['error']} {message}")
    
    def success(self, message: str) -> None:
        """Success message (green)"""
        self._emit(f"{_LEVEL_EMOJI['success']} {message}")
    
    # ========================================================================
    # ACTIONS
    # ========================================================================
    
    def action(self, action: str, message: str) -> None:
        """Log an action with appropriate emoji"""
        emoji = _ACTION_EMOJI.get(action, "→")
        self._emit(f"{emoji} {message}")
    
    def start(self, message: str) -> None:
        """Log start of operation"""
        self.action("start", message)
    
    def done(self, message: str) -> None:
        """Log completion"""
        self.action("done", message)
    
    def fail(self, message: str) -> None:
        """Log failure"""
        self.action("fail", message)
    
    # ========================================================================
    # SPECIAL FORMATS
    # ========================================================================
    
    def progress(self, label: str, current: int, total: int) -> None:
        """Log progress"""
        percent = int((current / total) * 100) if total > 0 else 0
        self._emit(f"📊 {label}: {percent}% ({current}/{total})")
    
    def step(self, step_num: int, total: int, message: str) -> None:
        """Log a step in a sequence"""
        self._emit(f"[{step_num}/{total}] {message}")
    
    def exception(self, exc: Exception, show_traceback: bool = False) -> None:
        """Log an exception"""
        self._emit(f"🛑 {type(exc).__name__}: {exc}")
        if show_traceback:
            tb = traceback.format_exc()
            for line in tb.strip().split("\n"):
                self._emit(f"  {line}")
    
    def key_value(self, key: str, value: Any) -> None:
        """Log a key-value pair"""
        self._emit(f"→ {key}: {value}")
    
    def llm(self, provider: str, model: str) -> None:
        """Log LLM selection"""
        self._emit(f"🤖 LLM selected: {provider}")
        self._emit(f"→ Model: {model}")
    
    def attempt(self, current: int, total: int, context: str = "") -> None:
        """Log an attempt"""
        ctx = f" ({context})" if context else ""
        self._emit(f"📋 Attempt {current}/{total}{ctx}")
    
    # ========================================================================
    # SECTIONS
    # ========================================================================
    
    @contextmanager
    def section(self, title: str = ""):
        """
        Context manager for grouping logs into a single codeblock.
        
        Example:
            with log.section("Building"):
                log.info("Step 1")
                log.info("Step 2")
        """
        self._in_section = True
        self._section_lines = []
        
        try:
            yield
        finally:
            self._in_section = False
            if self._section_lines:
                self._render_log_block(self._section_lines)
            self._section_lines = []
    
    # ========================================================================
    # DIRECT RENDERING
    # ========================================================================
    
    def heading(self, level: int, text: str) -> None:
        """Render a markdown heading (outside codeblock)"""
        if not self.verbose:
            return
        self._renderer.heading(level, text)
    
    def md(self, text: str) -> None:
        """Render raw markdown"""
        if not self.verbose:
            return
        self._renderer.render_markdown_with_fences(text)
    
    def raw(self, text: str) -> None:
        """Output raw text (no wrapping)"""
        if not self.verbose:
            return
        print(text, file=self._stream)


# Global logger instance
_default_logger: Optional[Logger] = None


def get_logger(verbose: bool = True) -> Logger:
    """Get or create the default logger"""
    global _default_logger
    if _default_logger is None:
        _default_logger = Logger(verbose=verbose)
    return _default_logger


def set_logger(logger: Logger) -> None:
    """Set the default logger"""
    global _default_logger
    _default_logger = logger


# Convenience functions
def log_info(message: str) -> None:
    get_logger().info(message)

def log_success(message: str) -> None:
    get_logger().success(message)

def log_warning(message: str) -> None:
    get_logger().warning(message)

def log_error(message: str) -> None:
    get_logger().error(message)

def log_action(action: str, message: str) -> None:
    get_logger().action(action, message)
