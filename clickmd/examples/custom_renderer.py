#!/usr/bin/env python3
"""
Custom renderer configuration example.

Demonstrates how to use MarkdownRenderer directly for more control.

Run: python examples/custom_renderer.py
"""

import sys
from io import StringIO

from clickmd import MarkdownRenderer, get_renderer


def main():
    # Default renderer (with colors to stdout)
    print("=== Default Renderer ===\n")
    renderer = MarkdownRenderer()
    renderer.heading(1, "Default Configuration")
    renderer.codeblock("python", "print('Hello, World!')")

    # No-color renderer
    print("\n=== No-Color Renderer ===\n")
    no_color = MarkdownRenderer(use_colors=False)
    no_color.heading(1, "No Colors")
    no_color.codeblock("python", "x = 42")

    # Custom stream (capture to string)
    print("\n=== Custom Stream (StringIO) ===\n")
    buffer = StringIO()
    stream_renderer = MarkdownRenderer(stream=buffer, use_colors=False)
    stream_renderer.heading(2, "Captured Output")
    stream_renderer.codeblock("json", '{"captured": true}')
    
    print(f"Captured {len(buffer.getvalue())} characters:")
    print(buffer.getvalue())

    # Using get_renderer helper
    print("\n=== Using get_renderer() ===\n")
    r = get_renderer(use_colors=True)
    r.heading(1, "Helper Function")
    
    # Direct highlighting methods
    print("\n=== Direct Highlighting ===\n")
    r = MarkdownRenderer(use_colors=True)
    
    print("YAML line:")
    print(r._highlight_yaml("  name: clickmd"))
    
    print("\nJSON line:")
    print(r._highlight_json('  "key": "value",'))
    
    print("\nPython/JS line:")
    print(r._highlight_js("const x = 'hello';"))
    
    print("\nBash line:")
    print(r._highlight_bash("echo hello world"))

    # Full markdown with fences
    print("\n=== Full Markdown ===\n")
    r.render_markdown_with_fences("""
# Main Title

Some introductory text with **bold** words.

```python
def example():
    return "highlighted code"
```

## Section Two

More text and a [link](https://example.com).
""")


if __name__ == "__main__":
    main()
