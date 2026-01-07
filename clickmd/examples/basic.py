#!/usr/bin/env python3
"""
Basic clickmd usage - no Click dependency required.

Run: python examples/basic.py
"""

from clickmd import md, echo

# Simple markdown rendering
md("""
# Welcome to clickmd! 🎨

This is a **beautiful** markdown renderer for your CLI applications.

## Features

- Syntax highlighting for code blocks
- Markdown formatting (bold, headers, links)
- Zero dependencies for core functionality
- Works with or without Click
""")

# Code block example
md("""
## Python Code Example

```python
def greet(name: str) -> str:
    \"\"\"Generate a greeting.\"\"\"
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(greet("World"))
```
""")

# JSON example
md("""
## JSON Data

```json
{
  "name": "clickmd",
  "version": "1.0.0",
  "features": ["highlighting", "markdown", "colors"],
  "stable": true,
  "downloads": 12345
}
```
""")

# YAML example
md("""
## YAML Configuration

```yaml
# Application configuration
app:
  name: clickmd
  version: "1.0.0"
  debug: false
  
dependencies:
  - click>=8.0
  - pytest>=7.0
```
""")

# Smart echo - auto-detects markdown
print("\n--- Using echo() ---\n")

echo("## This is detected as markdown")
echo("Regular text without markdown markers")
echo("**Bold text** is also detected")

# Log-style output
md("""
## Status Log

```log
🚀 Starting application...
📦 Loading dependencies...
✅ All systems ready!
⚠️ Warning: Using development mode
🛑 Error: Connection timeout (example)
```
""")
