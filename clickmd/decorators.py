"""
clickmd.decorators - Click decorators re-export

This module provides click decorators for CLI building.
Import these only if you need click functionality.
The core clickmd.md() and clickmd.echo() work without click.
"""

try:
    import click as _click
    
    group = _click.group
    command = _click.command
    option = _click.option
    argument = _click.argument
    pass_context = _click.pass_context
    Choice = _click.Choice
    Path = _click.Path
    Context = _click.Context
    
    CLICK_AVAILABLE = True
except ImportError:
    _click = None  # type: ignore
    CLICK_AVAILABLE = False
    
    # Stub implementations when click is not available
    def _not_available(*args, **kwargs):
        raise ImportError("click is required for CLI decorators. Install with: pip install click")
    
    group = _not_available
    command = _not_available
    option = _not_available
    argument = _not_available
    pass_context = _not_available
    
    class Choice:
        def __init__(self, *args, **kwargs):
            raise ImportError("click is required. Install with: pip install click")
    
    class Path:
        def __init__(self, *args, **kwargs):
            raise ImportError("click is required. Install with: pip install click")
    
    class Context:
        pass


__all__ = [
    "CLICK_AVAILABLE",
    "_click",
    "group",
    "command", 
    "option",
    "argument",
    "pass_context",
    "Choice",
    "Path",
    "Context",
]
