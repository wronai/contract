#!/usr/bin/env python3
"""
Phase 1 Features Example - Tables, Panels, Blockquotes, etc.

Demonstrates the new Phase 1 features added to clickmd:
- Tables (ASCII/Unicode styles)
- Panels/Boxes with styles
- Blockquotes
- Horizontal rules
- Checklists
- Nested lists

Run: python examples/phase1_features.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd


def demo_tables():
    """Demonstrate table rendering."""
    clickmd.md("# 📊 Tables\n")
    
    headers = ["Name", "Version", "Status"]
    rows = [
        ["clickmd", "1.1.0", "✅ Active"],
        ["click", "8.1.7", "✅ Active"],
        ["rich", "13.7.0", "Optional"],
    ]
    
    clickmd.md("## Unicode Style (default)\n")
    clickmd.table(headers, rows)
    
    clickmd.md("\n## ASCII Style\n")
    clickmd.table(headers, rows, style="ascii")
    
    clickmd.md("\n## Minimal Style\n")
    clickmd.table(headers, rows, style="minimal")
    
    clickmd.md("\n## With Alignment\n")
    headers2 = ["Item", "Qty", "Price"]
    rows2 = [
        ["Widget", "10", "$9.99"],
        ["Gadget", "5", "$19.99"],
        ["Gizmo", "100", "$0.99"],
    ]
    clickmd.table(headers2, rows2, align=["left", "center", "right"])


def demo_panels():
    """Demonstrate panel/box rendering."""
    clickmd.md("\n# 📦 Panels\n")
    
    clickmd.md("## Default Panel\n")
    clickmd.panel("This is a default panel.\nIt can have multiple lines.")
    
    clickmd.md("\n## Panel with Title\n")
    clickmd.panel(
        "Important information goes here.\nPay attention to this content.",
        title="Notice"
    )
    
    clickmd.md("\n## Info Panel\n")
    clickmd.panel("This is an informational message.", title="Info", style="info")
    
    clickmd.md("\n## Warning Panel\n")
    clickmd.panel("Proceed with caution!", title="Warning", style="warning")
    
    clickmd.md("\n## Error Panel\n")
    clickmd.panel("Something went wrong.", title="Error", style="error")
    
    clickmd.md("\n## Success Panel\n")
    clickmd.panel("Operation completed successfully!", title="Success", style="success")


def demo_blockquotes():
    """Demonstrate blockquote rendering."""
    clickmd.md("\n# 💬 Blockquotes\n")
    
    clickmd.blockquote("This is a simple blockquote.")
    
    clickmd.md("")
    
    clickmd.blockquote(
        "The only way to do great work is to love what you do.\n"
        "- Steve Jobs"
    )
    
    clickmd.md("")
    
    clickmd.blockquote(
        "First line of the quote.\n"
        "Second line continues...\n"
        "Third line ends it."
    )


def demo_horizontal_rules():
    """Demonstrate horizontal rule rendering."""
    clickmd.md("\n# ➖ Horizontal Rules\n")
    
    clickmd.md("Default rule:")
    clickmd.hr()
    
    clickmd.md("Custom character (=):")
    clickmd.hr(char="=")
    
    clickmd.md("Custom width (30):")
    clickmd.hr(width=30)
    
    clickmd.md("Dotted rule:")
    clickmd.hr(char="·")


def demo_checklists():
    """Demonstrate checklist rendering."""
    clickmd.md("\n# ☑️ Checklists\n")
    
    clickmd.md("## Project Tasks\n")
    clickmd.checklist([
        (True, "Initialize project"),
        (True, "Set up CI/CD"),
        (True, "Write documentation"),
        (False, "Add more tests"),
        (False, "Release v1.0"),
    ])
    
    clickmd.md("\n## Shopping List\n")
    clickmd.checklist([
        (True, "Milk"),
        (True, "Bread"),
        (False, "Eggs"),
        (False, "Butter"),
    ])


def demo_nested_lists():
    """Demonstrate nested list rendering."""
    clickmd.md("\n# 📋 Lists\n")
    
    clickmd.md("## Bullet List\n")
    renderer = clickmd.get_renderer()
    renderer.list_item("First item", level=0)
    renderer.list_item("Second item", level=0)
    renderer.list_item("Nested item 1", level=1)
    renderer.list_item("Nested item 2", level=1)
    renderer.list_item("Deep nested", level=2)
    renderer.list_item("Third item", level=0)
    
    clickmd.md("\n## Numbered List\n")
    renderer.numbered_list([
        "First step",
        "Second step",
        "Third step",
        "Fourth step",
    ])
    
    clickmd.md("\n## Custom Markers\n")
    renderer.list_item("Arrow marker", level=0, marker="→")
    renderer.list_item("Star marker", level=0, marker="★")
    renderer.list_item("Check marker", level=0, marker="✓")


def demo_combined():
    """Demonstrate combined usage."""
    clickmd.md("\n# 🎨 Combined Example\n")
    
    clickmd.panel(
        "Welcome to clickmd Phase 1!\n"
        "New features are ready to use.",
        title="🚀 Release Notes",
        style="success"
    )
    
    clickmd.md("\n## New Features Summary\n")
    
    headers = ["Feature", "Status", "Description"]
    rows = [
        ["Tables", "✅", "Unicode/ASCII/Minimal styles"],
        ["Panels", "✅", "Info/Warning/Error/Success"],
        ["Blockquotes", "✅", "Multi-line support"],
        ["HR", "✅", "Custom chars and width"],
        ["Checklists", "✅", "Interactive style"],
    ]
    clickmd.table(headers, rows)
    
    clickmd.hr()
    
    clickmd.blockquote(
        "clickmd makes CLI output beautiful.\n"
        "Zero dependencies, maximum impact."
    )


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("clickmd Phase 1 Features Demo")
    print("=" * 60 + "\n")
    
    demo_tables()
    demo_panels()
    demo_blockquotes()
    demo_horizontal_rules()
    demo_checklists()
    demo_nested_lists()
    demo_combined()
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60 + "\n")
