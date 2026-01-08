"""
clickmd.progress - Progress bars, spinners, and live updates.

Provides interactive terminal elements:
- Progress bars with customizable format
- Animated spinners with context manager
- Live updates (in-place terminal updates)

Usage:
    from clickmd import progress, spinner
    
    # Progress bar
    for item in progress(items, label="Processing"):
        process(item)
    
    # Spinner
    with spinner("Loading..."):
        do_work()
    
    # Manual progress
    with Progress() as p:
        task = p.add_task("Downloading", total=100)
        for i in range(100):
            p.update(task, advance=1)
"""

import sys
import threading
import time
from contextlib import contextmanager
from typing import Any, Callable, Generator, Iterable, Iterator, Optional, TypeVar

from .renderer import MarkdownRenderer, get_renderer, strip_ansi

T = TypeVar("T")


# ============================================================================
# SPINNER ANIMATIONS
# ============================================================================

SPINNERS = {
    "dots": ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    "line": ["-", "\\", "|", "/"],
    "arc": ["◜", "◠", "◝", "◞", "◡", "◟"],
    "circle": ["◐", "◓", "◑", "◒"],
    "square": ["◰", "◳", "◲", "◱"],
    "arrow": ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
    "bounce": ["⠁", "⠂", "⠄", "⠂"],
    "clock": ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"],
    "moon": ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
    "earth": ["🌍", "🌎", "🌏"],
}


def _is_tty() -> bool:
    """Check if stdout is a TTY."""
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


def _clear_line() -> None:
    """Clear current line in terminal."""
    if _is_tty():
        sys.stdout.write("\r\033[K")
        sys.stdout.flush()


def _write_inline(text: str) -> None:
    """Write text inline (overwriting current line)."""
    if _is_tty():
        sys.stdout.write(f"\r{text}")
        sys.stdout.flush()
    else:
        print(text)


# ============================================================================
# PROGRESS BAR
# ============================================================================

class ProgressBar:
    """
    A customizable progress bar.
    
    Example:
        bar = ProgressBar(total=100, label="Downloading")
        for i in range(100):
            bar.update(1)
            time.sleep(0.01)
        bar.finish()
    """
    
    def __init__(
        self,
        total: int,
        label: str = "",
        width: int = 40,
        fill_char: str = "█",
        empty_char: str = "░",
        show_percent: bool = True,
        show_count: bool = True,
        show_eta: bool = True,
        color: str = "cyan",
    ):
        self.total = max(1, total)
        self.label = label
        self.width = width
        self.fill_char = fill_char
        self.empty_char = empty_char
        self.show_percent = show_percent
        self.show_count = show_count
        self.show_eta = show_eta
        self.color = color
        
        self.current = 0
        self.start_time = time.time()
        self._renderer = get_renderer(use_colors=_is_tty())
        self._finished = False
    
    def update(self, advance: int = 1) -> None:
        """Advance the progress bar."""
        self.current = min(self.current + advance, self.total)
        self._render()
    
    def set(self, value: int) -> None:
        """Set progress to specific value."""
        self.current = min(max(0, value), self.total)
        self._render()
    
    def _render(self) -> None:
        """Render the progress bar."""
        if not _is_tty():
            return
        
        percent = self.current / self.total
        filled = int(self.width * percent)
        empty = self.width - filled
        
        bar = self.fill_char * filled + self.empty_char * empty
        bar_colored = self._renderer._c(self.color, bar)
        
        parts = []
        
        if self.label:
            parts.append(self._renderer._c("white", self.label, bold=True))
        
        parts.append(f"[{bar_colored}]")
        
        if self.show_percent:
            pct = f"{int(percent * 100):3d}%"
            parts.append(self._renderer._c("green", pct))
        
        if self.show_count:
            count = f"{self.current}/{self.total}"
            parts.append(self._renderer._c("gray", count))
        
        if self.show_eta and self.current > 0:
            elapsed = time.time() - self.start_time
            rate = self.current / elapsed
            remaining = (self.total - self.current) / rate if rate > 0 else 0
            if remaining < 60:
                eta = f"ETA: {int(remaining)}s"
            elif remaining < 3600:
                eta = f"ETA: {int(remaining/60)}m"
            else:
                eta = f"ETA: {int(remaining/3600)}h"
            parts.append(self._renderer._c("gray", eta))
        
        _write_inline(" ".join(parts))
    
    def finish(self, message: str = "") -> None:
        """Complete the progress bar."""
        if self._finished:
            return
        self._finished = True
        
        _clear_line()
        
        elapsed = time.time() - self.start_time
        
        if message:
            final = message
        else:
            if self.label:
                final = f"✅ {self.label} completed"
            else:
                final = "✅ Done"
            
            if elapsed >= 1:
                final += f" ({elapsed:.1f}s)"
        
        print(self._renderer._c("green", final))
    
    def __enter__(self) -> "ProgressBar":
        return self
    
    def __exit__(self, *args: Any) -> None:
        self.finish()


def progress(
    iterable: Iterable[T],
    label: str = "",
    total: Optional[int] = None,
    **kwargs: Any
) -> Generator[T, None, None]:
    """
    Wrap an iterable with a progress bar.
    
    Args:
        iterable: Items to iterate over
        label: Progress bar label
        total: Total count (auto-detected if possible)
        **kwargs: Additional ProgressBar options
    
    Example:
        for item in progress(items, label="Processing"):
            process(item)
    """
    # Try to get total from iterable
    if total is None:
        try:
            total = len(iterable)  # type: ignore
        except TypeError:
            total = 0
    
    if total == 0:
        # Unknown length - just yield items
        for item in iterable:
            yield item
        return
    
    bar = ProgressBar(total=total, label=label, **kwargs)
    
    try:
        for item in iterable:
            yield item
            bar.update(1)
    finally:
        bar.finish()


# ============================================================================
# SPINNER
# ============================================================================

class Spinner:
    """
    An animated spinner for indeterminate progress.
    
    Example:
        with Spinner("Loading..."):
            do_work()
    """
    
    def __init__(
        self,
        message: str = "Loading...",
        style: str = "dots",
        color: str = "cyan",
        success_message: str = "",
        fail_message: str = "",
    ):
        self.message = message
        self.frames = SPINNERS.get(style, SPINNERS["dots"])
        self.color = color
        self.success_message = success_message
        self.fail_message = fail_message
        
        self._renderer = get_renderer(use_colors=_is_tty())
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._frame_idx = 0
        self._success = True
    
    def start(self) -> None:
        """Start the spinner animation."""
        if not _is_tty():
            print(f"⏳ {self.message}")
            return
        
        self._running = True
        self._thread = threading.Thread(target=self._animate, daemon=True)
        self._thread.start()
    
    def _animate(self) -> None:
        """Animation loop (runs in thread)."""
        while self._running:
            frame = self.frames[self._frame_idx % len(self.frames)]
            frame_colored = self._renderer._c(self.color, frame)
            _write_inline(f"{frame_colored} {self.message}")
            self._frame_idx += 1
            time.sleep(0.1)
    
    def stop(self, success: bool = True) -> None:
        """Stop the spinner."""
        self._running = False
        self._success = success
        
        if self._thread:
            self._thread.join(timeout=0.5)
        
        _clear_line()
        
        if success:
            msg = self.success_message or f"✅ {self.message.rstrip('.')} done"
            print(self._renderer._c("green", msg))
        else:
            msg = self.fail_message or f"❌ {self.message.rstrip('.')} failed"
            print(self._renderer._c("red", msg))
    
    def __enter__(self) -> "Spinner":
        self.start()
        return self
    
    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.stop(success=(exc_type is None))


@contextmanager
def spinner(
    message: str = "Loading...",
    style: str = "dots",
    **kwargs: Any
) -> Generator[Spinner, None, None]:
    """
    Context manager for a spinner.
    
    Args:
        message: Spinner message
        style: Animation style (dots, line, arc, circle, etc.)
        **kwargs: Additional Spinner options
    
    Example:
        with spinner("Processing..."):
            do_work()
    """
    s = Spinner(message=message, style=style, **kwargs)
    s.start()
    try:
        yield s
    except Exception:
        s.stop(success=False)
        raise
    else:
        s.stop(success=True)


# ============================================================================
# LIVE UPDATE
# ============================================================================

class LiveUpdate:
    """
    Live-updating display that refreshes in place.
    
    Example:
        with LiveUpdate() as live:
            for i in range(10):
                live.update(f"Count: {i}")
                time.sleep(0.5)
    """
    
    def __init__(self, initial: str = ""):
        self._content = initial
        self._lines = 0
        self._renderer = get_renderer(use_colors=_is_tty())
    
    def update(self, content: str) -> None:
        """Update the display content."""
        if not _is_tty():
            print(content)
            return
        
        # Clear previous lines
        if self._lines > 0:
            sys.stdout.write(f"\033[{self._lines}A")  # Move up
            sys.stdout.write("\033[J")  # Clear to end
        
        # Write new content
        print(content)
        self._lines = content.count("\n") + 1
        self._content = content
    
    def clear(self) -> None:
        """Clear the display."""
        if _is_tty() and self._lines > 0:
            sys.stdout.write(f"\033[{self._lines}A")
            sys.stdout.write("\033[J")
            sys.stdout.flush()
        self._lines = 0
        self._content = ""
    
    def __enter__(self) -> "LiveUpdate":
        return self
    
    def __exit__(self, *args: Any) -> None:
        pass


@contextmanager
def live(initial: str = "") -> Generator[LiveUpdate, None, None]:
    """
    Context manager for live-updating display.
    
    Example:
        with live() as display:
            for i in range(10):
                display.update(f"Progress: {i}/10")
                time.sleep(0.1)
    """
    display = LiveUpdate(initial)
    if initial:
        display.update(initial)
    try:
        yield display
    finally:
        pass


# ============================================================================
# STATUS INDICATOR
# ============================================================================

class StatusIndicator:
    """
    A status indicator that shows step-by-step progress.
    
    Example:
        status = StatusIndicator()
        status.start("Downloading...")
        # do work
        status.done()
        status.start("Processing...")
        # do work
        status.done()
    """
    
    def __init__(self):
        self._renderer = get_renderer(use_colors=_is_tty())
        self._current_message = ""
        self._start_time = 0.0
    
    def start(self, message: str) -> None:
        """Start a new status step."""
        self._current_message = message
        self._start_time = time.time()
        
        if _is_tty():
            _write_inline(f"⏳ {message}")
        else:
            print(f"⏳ {message}")
    
    def done(self, message: str = "") -> None:
        """Mark current step as done."""
        elapsed = time.time() - self._start_time
        _clear_line()
        
        msg = message or self._current_message
        if elapsed >= 0.1:
            msg += f" ({elapsed:.1f}s)"
        
        print(self._renderer._c("green", f"✅ {msg}"))
    
    def fail(self, message: str = "") -> None:
        """Mark current step as failed."""
        _clear_line()
        msg = message or self._current_message
        print(self._renderer._c("red", f"❌ {msg}"))
    
    def skip(self, message: str = "") -> None:
        """Mark current step as skipped."""
        _clear_line()
        msg = message or self._current_message
        print(self._renderer._c("yellow", f"⏭️  {msg} (skipped)"))


# ============================================================================
# COUNTDOWN
# ============================================================================

def countdown(
    seconds: int,
    message: str = "Starting in",
    on_complete: Optional[Callable[[], None]] = None,
) -> None:
    """
    Display a countdown timer.
    
    Args:
        seconds: Number of seconds to count down
        message: Message to display
        on_complete: Callback when countdown finishes
    
    Example:
        countdown(5, "Deploying in")
    """
    renderer = get_renderer(use_colors=_is_tty())
    
    for i in range(seconds, 0, -1):
        if _is_tty():
            _write_inline(f"{message} {renderer._c('yellow', str(i), bold=True)}...")
        else:
            print(f"{message} {i}...")
        time.sleep(1)
    
    _clear_line()
    print(renderer._c("green", f"✅ {message.replace('in', 'now')}!"))
    
    if on_complete:
        on_complete()
