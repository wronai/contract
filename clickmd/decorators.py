"""
clickmd.decorators - Complete Click API re-export

This module provides ALL click decorators, types, and utilities for CLI building.
Import these only if you need click functionality.
The core clickmd.md() and clickmd.echo() work without click.

Usage:
    import clickmd
    
    @clickmd.command()
    @clickmd.option("--name", "-n", type=clickmd.STRING)
    @clickmd.option("--count", "-c", type=clickmd.IntRange(1, 100))
    @clickmd.version_option("1.0.0")
    def cli(name, count):
        pass
"""

try:
    import click as _click
    
    # ==========================================================================
    # DECORATORS
    # ==========================================================================
    group = _click.group
    command = _click.command
    option = _click.option
    argument = _click.argument
    pass_context = _click.pass_context
    pass_obj = _click.pass_obj
    make_pass_decorator = _click.make_pass_decorator
    
    # Option decorators
    confirmation_option = _click.confirmation_option
    help_option = _click.help_option
    password_option = _click.password_option
    version_option = _click.version_option
    
    # ==========================================================================
    # PARAMETER TYPES
    # ==========================================================================
    # Basic types
    STRING = _click.STRING
    INT = _click.INT
    FLOAT = _click.FLOAT
    BOOL = _click.BOOL
    UUID = _click.UUID
    UNPROCESSED = _click.UNPROCESSED
    
    # Complex types
    Choice = _click.Choice
    Path = _click.Path
    File = _click.File
    DateTime = _click.DateTime
    IntRange = _click.IntRange
    FloatRange = _click.FloatRange
    Tuple = _click.Tuple
    
    # Base type class
    ParamType = _click.ParamType
    
    # ==========================================================================
    # CORE CLASSES
    # ==========================================================================
    Context = _click.Context
    Command = _click.Command
    Group = _click.Group
    Option = _click.Option
    Argument = _click.Argument
    Parameter = _click.Parameter
    HelpFormatter = _click.HelpFormatter
    CommandCollection = _click.CommandCollection
    
    # ==========================================================================
    # UTILITY FUNCTIONS
    # ==========================================================================
    # Output
    click_echo = _click.echo  # Renamed to avoid conflict with clickmd.echo
    secho = _click.secho
    style = _click.style
    unstyle = _click.unstyle
    echo_via_pager = _click.echo_via_pager
    clear = _click.clear
    
    # Input
    prompt = _click.prompt
    confirm = _click.confirm
    getchar = _click.getchar
    pause = _click.pause
    edit = _click.edit
    
    # Progress
    progressbar = _click.progressbar
    
    # Files and paths
    open_file = _click.open_file
    format_filename = _click.format_filename
    get_app_dir = _click.get_app_dir
    get_binary_stream = _click.get_binary_stream
    get_text_stream = _click.get_text_stream
    
    # Context
    get_current_context = _click.get_current_context
    
    # System
    launch = _click.launch
    wrap_text = _click.wrap_text
    
    # ==========================================================================
    # EXCEPTIONS
    # ==========================================================================
    ClickException = _click.ClickException
    Abort = _click.Abort
    UsageError = _click.UsageError
    BadParameter = _click.BadParameter
    BadOptionUsage = _click.BadOptionUsage
    BadArgumentUsage = _click.BadArgumentUsage
    FileError = _click.FileError
    MissingParameter = _click.MissingParameter
    NoSuchOption = _click.NoSuchOption
    
    CLICK_AVAILABLE = True

except ImportError:
    _click = None  # type: ignore
    CLICK_AVAILABLE = False
    
    # Stub implementations when click is not available
    def _not_available(*args, **kwargs):
        raise ImportError("click is required for CLI decorators. Install with: pip install clickmd[click]")
    
    # Decorators
    group = _not_available
    command = _not_available
    option = _not_available
    argument = _not_available
    pass_context = _not_available
    pass_obj = _not_available
    make_pass_decorator = _not_available
    confirmation_option = _not_available
    help_option = _not_available
    password_option = _not_available
    version_option = _not_available
    
    # Utility functions
    click_echo = _not_available
    secho = _not_available
    style = _not_available
    unstyle = _not_available
    echo_via_pager = _not_available
    clear = _not_available
    prompt = _not_available
    confirm = _not_available
    getchar = _not_available
    pause = _not_available
    edit = _not_available
    progressbar = _not_available
    open_file = _not_available
    format_filename = _not_available
    get_app_dir = _not_available
    get_binary_stream = _not_available
    get_text_stream = _not_available
    get_current_context = _not_available
    launch = _not_available
    wrap_text = _not_available
    
    # Stub classes
    class _StubClass:
        def __init__(self, *args, **kwargs):
            raise ImportError("click is required. Install with: pip install clickmd[click]")
    
    # Types
    STRING = _StubClass
    INT = _StubClass
    FLOAT = _StubClass
    BOOL = _StubClass
    UUID = _StubClass
    UNPROCESSED = _StubClass
    Choice = _StubClass
    Path = _StubClass
    File = _StubClass
    DateTime = _StubClass
    IntRange = _StubClass
    FloatRange = _StubClass
    Tuple = _StubClass
    ParamType = _StubClass
    
    # Core classes
    Context = _StubClass
    Command = _StubClass
    Group = _StubClass
    Option = _StubClass
    Argument = _StubClass
    Parameter = _StubClass
    HelpFormatter = _StubClass
    CommandCollection = _StubClass
    
    # Exceptions
    class ClickException(Exception): pass
    class Abort(Exception): pass
    class UsageError(Exception): pass
    class BadParameter(Exception): pass
    class BadOptionUsage(Exception): pass
    class BadArgumentUsage(Exception): pass
    class FileError(Exception): pass
    class MissingParameter(Exception): pass
    class NoSuchOption(Exception): pass


__all__ = [
    # Meta
    "CLICK_AVAILABLE",
    "_click",
    
    # Decorators
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
    
    # Parameter types
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
    
    # Core classes
    "Context",
    "Command",
    "Group",
    "Option",
    "Argument",
    "Parameter",
    "HelpFormatter",
    "CommandCollection",
    
    # Utility functions
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
    
    # Exceptions
    "ClickException",
    "Abort",
    "UsageError",
    "BadParameter",
    "BadOptionUsage",
    "BadArgumentUsage",
    "FileError",
    "MissingParameter",
    "NoSuchOption",
]
