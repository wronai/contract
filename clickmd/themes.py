"""
clickmd.themes - Theming system for terminal colors.

Provides customizable color themes with:
- Predefined themes (default, monokai, dracula, nord, solarized)
- NO_COLOR standard support (https://no-color.org/)
- Environment variable configuration (CLICKMD_THEME, CLICKMD_NO_COLOR)
- 256-color and True Color (24-bit) support
- Terminal capability detection

Usage:
    from clickmd import set_theme, get_theme
    
    set_theme("monokai")
    
    # Or via environment
    # export CLICKMD_THEME=dracula
"""

import os
import sys
from dataclasses import dataclass, field
from typing import Dict, Literal, Optional


# ============================================================================
# COLOR CODES
# ============================================================================

# Basic 16 colors (ANSI)
ANSI_COLORS = {
    "black": 30,
    "red": 31,
    "green": 32,
    "yellow": 33,
    "blue": 34,
    "magenta": 35,
    "cyan": 36,
    "white": 37,
    "gray": 90,
    "bright_red": 91,
    "bright_green": 92,
    "bright_yellow": 93,
    "bright_blue": 94,
    "bright_magenta": 95,
    "bright_cyan": 96,
    "bright_white": 97,
}

# 256-color palette indices for common colors
COLOR_256 = {
    # Grays
    "gray_dark": 236,
    "gray": 244,
    "gray_light": 250,
    # Reds
    "red_dark": 124,
    "red": 196,
    "red_light": 203,
    # Greens
    "green_dark": 22,
    "green": 46,
    "green_light": 114,
    # Blues
    "blue_dark": 17,
    "blue": 33,
    "blue_light": 75,
    # Yellows
    "yellow_dark": 136,
    "yellow": 226,
    "yellow_light": 228,
    # Cyans
    "cyan_dark": 30,
    "cyan": 51,
    "cyan_light": 123,
    # Magentas
    "magenta_dark": 90,
    "magenta": 201,
    "magenta_light": 213,
    # Oranges
    "orange_dark": 166,
    "orange": 208,
    "orange_light": 215,
}


def _rgb_to_ansi(r: int, g: int, b: int) -> str:
    """Convert RGB to ANSI True Color escape sequence."""
    return f"\x1b[38;2;{r};{g};{b}m"


def _color_256(index: int) -> str:
    """Generate 256-color escape sequence."""
    return f"\x1b[38;5;{index}m"


def _ansi_color(name: str) -> str:
    """Generate basic ANSI color escape sequence."""
    code = ANSI_COLORS.get(name, 37)
    return f"\x1b[{code}m"


# ============================================================================
# THEME DATACLASS
# ============================================================================

@dataclass
class Theme:
    """Color theme definition."""
    
    name: str
    
    # Text colors
    text: str = "white"
    text_dim: str = "gray"
    text_muted: str = "gray"
    
    # Headings
    heading: str = "cyan"
    heading_bold: bool = True
    
    # Code
    keyword: str = "magenta"
    string: str = "green"
    number: str = "cyan"
    comment: str = "gray"
    function: str = "blue"
    variable: str = "white"
    operator: str = "white"
    
    # UI elements
    success: str = "green"
    warning: str = "yellow"
    error: str = "red"
    info: str = "cyan"
    
    # Tables and panels
    border: str = "gray"
    border_accent: str = "cyan"
    
    # Progress
    progress_fill: str = "cyan"
    progress_empty: str = "gray"
    
    # Links
    link: str = "blue"
    link_url: str = "gray"
    
    # Custom colors (for extension)
    custom: Dict[str, str] = field(default_factory=dict)
    
    def get_color(self, name: str) -> str:
        """Get color value by name."""
        if name in self.custom:
            return self.custom[name]
        return getattr(self, name, "white")


# ============================================================================
# PREDEFINED THEMES
# ============================================================================

THEMES: Dict[str, Theme] = {
    "default": Theme(
        name="default",
        text="white",
        heading="cyan",
        keyword="magenta",
        string="green",
        number="cyan",
        comment="gray",
        function="blue",
        success="green",
        warning="yellow",
        error="red",
        info="cyan",
        border="gray",
    ),
    
    "monokai": Theme(
        name="monokai",
        text="white",
        text_dim="gray",
        heading="bright_cyan",
        keyword="bright_magenta",
        string="bright_yellow",
        number="bright_magenta",
        comment="gray",
        function="bright_green",
        variable="white",
        success="bright_green",
        warning="bright_yellow",
        error="bright_red",
        info="bright_cyan",
        border="gray",
        custom={
            "class": "bright_green",
            "decorator": "bright_red",
        }
    ),
    
    "dracula": Theme(
        name="dracula",
        text="white",
        text_dim="gray",
        heading="bright_magenta",
        keyword="bright_magenta",
        string="bright_yellow",
        number="bright_magenta",
        comment="gray",
        function="bright_green",
        variable="bright_cyan",
        success="bright_green",
        warning="bright_yellow",
        error="bright_red",
        info="bright_cyan",
        border="bright_magenta",
        border_accent="bright_cyan",
        custom={
            "class": "bright_cyan",
            "constant": "bright_magenta",
        }
    ),
    
    "nord": Theme(
        name="nord",
        text="white",
        text_dim="gray",
        heading="cyan",
        keyword="blue",
        string="green",
        number="magenta",
        comment="gray",
        function="cyan",
        variable="white",
        success="green",
        warning="yellow",
        error="red",
        info="cyan",
        border="gray",
        border_accent="blue",
        custom={
            "frost": "cyan",
            "aurora_green": "green",
            "aurora_yellow": "yellow",
            "aurora_red": "red",
        }
    ),
    
    "solarized_dark": Theme(
        name="solarized_dark",
        text="white",
        text_dim="gray",
        heading="blue",
        keyword="green",
        string="cyan",
        number="magenta",
        comment="gray",
        function="blue",
        variable="white",
        success="green",
        warning="yellow",
        error="red",
        info="cyan",
        border="gray",
    ),
    
    "solarized_light": Theme(
        name="solarized_light",
        text="black",
        text_dim="gray",
        heading="blue",
        keyword="green",
        string="cyan",
        number="magenta",
        comment="gray",
        function="blue",
        variable="black",
        success="green",
        warning="yellow",
        error="red",
        info="cyan",
        border="gray",
    ),
    
    "github": Theme(
        name="github",
        text="white",
        text_dim="gray",
        heading="blue",
        keyword="red",
        string="blue",
        number="blue",
        comment="gray",
        function="magenta",
        variable="white",
        success="green",
        warning="yellow",
        error="red",
        info="blue",
        border="gray",
    ),
    
    "gruvbox": Theme(
        name="gruvbox",
        text="white",
        text_dim="gray",
        heading="bright_yellow",
        keyword="bright_red",
        string="bright_green",
        number="bright_magenta",
        comment="gray",
        function="bright_cyan",
        variable="bright_blue",
        success="bright_green",
        warning="bright_yellow",
        error="bright_red",
        info="bright_cyan",
        border="gray",
    ),
}


# ============================================================================
# GLOBAL STATE
# ============================================================================

_current_theme: Theme = THEMES["default"]
_no_color: bool = False


def _check_no_color() -> bool:
    """Check if NO_COLOR is set (https://no-color.org/)."""
    return (
        os.environ.get("NO_COLOR") is not None or
        os.environ.get("CLICKMD_NO_COLOR") is not None
    )


def _detect_color_support() -> Literal["none", "basic", "256", "truecolor"]:
    """Detect terminal color support level."""
    if _check_no_color():
        return "none"
    
    if not sys.stdout.isatty():
        return "none"
    
    # Check COLORTERM for true color
    colorterm = os.environ.get("COLORTERM", "").lower()
    if colorterm in ("truecolor", "24bit"):
        return "truecolor"
    
    # Check TERM for 256 color
    term = os.environ.get("TERM", "").lower()
    if "256color" in term or "256-color" in term:
        return "256"
    
    # Check for basic color support
    if term and term != "dumb":
        return "basic"
    
    return "none"


# ============================================================================
# PUBLIC API
# ============================================================================

def get_theme() -> Theme:
    """Get the current theme."""
    return _current_theme


def set_theme(name: str) -> None:
    """
    Set the current theme by name.
    
    Args:
        name: Theme name (default, monokai, dracula, nord, solarized_dark, etc.)
    
    Raises:
        ValueError: If theme name is not found
    """
    global _current_theme
    
    if name not in THEMES:
        available = ", ".join(THEMES.keys())
        raise ValueError(f"Unknown theme '{name}'. Available: {available}")
    
    _current_theme = THEMES[name]


def register_theme(theme: Theme) -> None:
    """
    Register a custom theme.
    
    Args:
        theme: Theme instance to register
    """
    THEMES[theme.name] = theme


def list_themes() -> list[str]:
    """Get list of available theme names."""
    return list(THEMES.keys())


def is_no_color() -> bool:
    """Check if colors are disabled (NO_COLOR standard)."""
    return _check_no_color()


def get_color_support() -> Literal["none", "basic", "256", "truecolor"]:
    """Get detected terminal color support level."""
    return _detect_color_support()


def color(
    name: str,
    text: str,
    bold: bool = False,
    dim: bool = False,
    use_theme: bool = True,
) -> str:
    """
    Apply color to text using current theme.
    
    Args:
        name: Color name (from theme or ANSI color name)
        text: Text to colorize
        bold: Apply bold
        dim: Apply dim
        use_theme: Use theme color mapping
    
    Returns:
        Colorized text string
    """
    if _check_no_color():
        return text
    
    # Get color from theme if requested
    if use_theme:
        theme = get_theme()
        color_name = theme.get_color(name)
    else:
        color_name = name
    
    # Build escape sequence
    codes = []
    if bold:
        codes.append("1")
    if dim:
        codes.append("2")
    
    # Get color code
    if color_name in ANSI_COLORS:
        codes.append(str(ANSI_COLORS[color_name]))
    else:
        codes.append("37")  # Default to white
    
    if not codes:
        return text
    
    prefix = f"\x1b[{';'.join(codes)}m"
    reset = "\x1b[0m"
    
    return f"{prefix}{text}{reset}"


def init_theme_from_env() -> None:
    """Initialize theme from environment variables."""
    global _no_color
    
    _no_color = _check_no_color()
    
    theme_name = os.environ.get("CLICKMD_THEME", "default")
    if theme_name in THEMES:
        set_theme(theme_name)


# Initialize on import
init_theme_from_env()
