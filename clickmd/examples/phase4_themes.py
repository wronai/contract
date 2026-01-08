#!/usr/bin/env python3
"""
Phase 4 Features Example - Theming and Color Customization.

Demonstrates the new Phase 4 theming features:
- Predefined themes (default, monokai, dracula, nord, etc.)
- Theme switching
- NO_COLOR standard support
- Color support detection
- Custom themes

Run: python examples/phase4_themes.py

Environment variables:
  CLICKMD_THEME=monokai   Set default theme
  NO_COLOR=1              Disable all colors
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd


def demo_available_themes():
    """Show available themes."""
    clickmd.md("# 🎨 Available Themes\n")
    
    themes = clickmd.list_themes()
    clickmd.table(
        headers=["Theme", "Description"],
        rows=[
            ["default", "Standard clickmd colors"],
            ["monokai", "Dark theme with vibrant colors"],
            ["dracula", "Popular dark theme"],
            ["nord", "Arctic, north-bluish color palette"],
            ["solarized_dark", "Solarized dark variant"],
            ["solarized_light", "Solarized light variant"],
            ["github", "GitHub-style colors"],
            ["gruvbox", "Retro groove color scheme"],
        ]
    )


def demo_theme_switching():
    """Demonstrate theme switching."""
    clickmd.md("\n# 🔄 Theme Switching Demo\n")
    
    sample_code = '''
def greet(name: str) -> str:
    """Generate greeting."""
    return f"Hello, {name}!"

# Call the function
print(greet("World"))
'''
    
    for theme_name in ["default", "monokai", "dracula", "nord"]:
        clickmd.set_theme(theme_name)
        theme = clickmd.get_theme()
        
        clickmd.md(f"\n## Theme: {theme.name}\n")
        clickmd.md(f"```python{sample_code}```")
    
    # Reset to default
    clickmd.set_theme("default")


def demo_theme_colors():
    """Show theme color palette."""
    clickmd.md("\n# 🌈 Theme Colors\n")
    
    clickmd.set_theme("default")
    theme = clickmd.get_theme()
    
    color_samples = [
        ("text", "Regular text"),
        ("heading", "Heading color"),
        ("keyword", "Keywords (if, for, def)"),
        ("string", "String literals"),
        ("number", "Numbers"),
        ("comment", "Comments"),
        ("function", "Function names"),
        ("success", "Success messages"),
        ("warning", "Warning messages"),
        ("error", "Error messages"),
        ("info", "Info messages"),
    ]
    
    clickmd.md("## Default Theme Colors\n")
    for color_name, description in color_samples:
        colored = clickmd.color(color_name, f"■ {description}")
        print(f"  {colored} ({color_name})")


def demo_color_support():
    """Show terminal color support detection."""
    clickmd.md("\n# 🖥️ Terminal Color Support\n")
    
    support = clickmd.get_color_support()
    no_color = clickmd.is_no_color()
    
    clickmd.table(
        headers=["Check", "Result"],
        rows=[
            ["Color Support Level", support],
            ["NO_COLOR Active", "Yes" if no_color else "No"],
            ["CLICKMD_THEME", clickmd.get_theme().name],
        ]
    )
    
    clickmd.md("""
## Color Support Levels

- **none**: No color support (NO_COLOR set or non-TTY)
- **basic**: 16 ANSI colors
- **256**: 256 color palette
- **truecolor**: 24-bit RGB colors
""")


def demo_custom_theme():
    """Demonstrate custom theme creation."""
    clickmd.md("\n# ✨ Custom Theme\n")
    
    # Create custom theme
    custom = clickmd.Theme(
        name="my_custom",
        text="white",
        heading="bright_magenta",
        keyword="bright_cyan",
        string="bright_yellow",
        number="bright_green",
        comment="gray",
        function="bright_blue",
        success="bright_green",
        warning="bright_yellow",
        error="bright_red",
        info="bright_cyan",
        border="bright_magenta",
        custom={
            "special": "bright_white",
        }
    )
    
    # Register and use
    clickmd.register_theme(custom)
    clickmd.set_theme("my_custom")
    
    clickmd.md("## Custom Theme Applied\n")
    clickmd.panel(
        "This panel uses custom theme colors!\n"
        "The border should be bright magenta.",
        title="Custom Panel",
        style="info"
    )
    
    clickmd.md("""
```python
# Custom theme code highlighting
def custom_function():
    value = 42
    return f"Result: {value}"
```
""")
    
    # Reset
    clickmd.set_theme("default")


def demo_no_color():
    """Demonstrate NO_COLOR behavior."""
    clickmd.md("\n# 🚫 NO_COLOR Standard\n")
    
    clickmd.md("""
clickmd respects the [NO_COLOR](https://no-color.org/) standard:

```bash
# Disable colors
export NO_COLOR=1

# Or use clickmd-specific variable
export CLICKMD_NO_COLOR=1
```

When `NO_COLOR` is set, all color output is disabled
and text is rendered in plain format.
""")
    
    is_active = clickmd.is_no_color()
    if is_active:
        clickmd.warning("NO_COLOR is currently active!")
    else:
        clickmd.success("Colors are enabled.")


def demo_styled_output():
    """Show styled output with current theme."""
    clickmd.md("\n# 📋 Styled Output Examples\n")
    
    clickmd.success("Operation completed successfully!")
    clickmd.warning("This action cannot be undone.")
    clickmd.error("Connection failed: timeout.")
    clickmd.info("Processing 42 items...")
    
    clickmd.hr()
    
    clickmd.panel(
        "Welcome to clickmd theming!\n"
        "Your terminal supports beautiful colors.",
        title="🎉 Welcome",
        style="success"
    )


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("clickmd Phase 4 Theming Demo")
    print("=" * 60 + "\n")
    
    demo_available_themes()
    demo_theme_colors()
    demo_color_support()
    demo_custom_theme()
    demo_no_color()
    demo_styled_output()
    demo_theme_switching()
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60 + "\n")
