#!/usr/bin/env python3
"""
Phase 5 Features Example - Developer Tools.

Demonstrates the new Phase 5 developer tools:
- Pretty exceptions with syntax highlighting
- Debug output for objects
- Object inspection
- Diff visualization
- Tree view
- Logging handler

Run: python examples/phase5_devtools.py
"""

import logging
import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd


@dataclass
class User:
    """Sample user class for debugging."""
    name: str
    email: str
    age: int
    active: bool = True


def demo_debug():
    """Demonstrate debug output."""
    clickmd.md("# 🔍 Debug Output\n")
    
    clickmd.md("## Simple Values\n")
    clickmd.debug(42, name="integer")
    clickmd.debug(3.14159, name="float")
    clickmd.debug("Hello, World!", name="string")
    clickmd.debug(True, name="boolean")
    clickmd.debug(None, name="none")
    
    clickmd.md("\n## Collections\n")
    clickmd.debug([1, 2, 3, "four", 5.0], name="list")
    clickmd.debug({"name": "Alice", "age": 30, "active": True}, name="dict")
    clickmd.debug({1, 2, 3}, name="set")
    
    clickmd.md("\n## Nested Structure\n")
    data = {
        "users": [
            {"name": "Alice", "roles": ["admin", "user"]},
            {"name": "Bob", "roles": ["user"]},
        ],
        "config": {
            "debug": True,
            "version": "1.0.0",
        }
    }
    clickmd.debug(data, name="nested_data")
    
    clickmd.md("\n## Custom Object\n")
    user = User(name="Alice", email="alice@example.com", age=30)
    clickmd.debug(user, name="user_object")


def demo_inspect():
    """Demonstrate object inspection."""
    clickmd.md("\n# 🔬 Object Inspection\n")
    
    clickmd.md("## Inspect String\n")
    clickmd.inspect_obj("Hello")
    
    clickmd.md("\n## Inspect List\n")
    clickmd.inspect_obj([1, 2, 3])
    
    clickmd.md("\n## Inspect Custom Object\n")
    user = User(name="Bob", email="bob@example.com", age=25)
    clickmd.inspect_obj(user)


def demo_tree():
    """Demonstrate tree view."""
    clickmd.md("\n# 🌳 Tree View\n")
    
    data = {
        "src": {
            "components": {
                "Button.tsx": "component",
                "Input.tsx": "component",
                "Form.tsx": "component",
            },
            "pages": {
                "Home.tsx": "page",
                "About.tsx": "page",
            },
            "utils": {
                "api.ts": "utility",
                "helpers.ts": "utility",
            },
        },
        "public": {
            "index.html": "html",
            "favicon.ico": "icon",
        },
        "package.json": "config",
    }
    
    clickmd.tree(data, name="project/")


def demo_diff():
    """Demonstrate diff visualization."""
    clickmd.md("\n# 📊 Diff Visualization\n")
    
    old_code = '''def greet(name):
    print("Hello, " + name)
    return None'''
    
    new_code = '''def greet(name: str) -> str:
    """Generate a greeting."""
    message = f"Hello, {name}!"
    print(message)
    return message'''
    
    clickmd.md("## Code Changes\n")
    clickmd.diff(old_code, new_code, old_name="greet_v1.py", new_name="greet_v2.py")


def demo_logging():
    """Demonstrate logging handler."""
    clickmd.md("\n# 📝 Logging Handler\n")
    
    # Create logger with clickmd handler
    logger = logging.getLogger("demo")
    logger.setLevel(logging.DEBUG)
    logger.handlers = []  # Clear existing handlers
    logger.addHandler(clickmd.ClickmdHandler())
    
    clickmd.md("## Log Messages\n")
    logger.debug("Debug message - detailed information")
    logger.info("Info message - general information")
    logger.warning("Warning message - something to watch")
    logger.error("Error message - something went wrong")
    logger.critical("Critical message - system failure")


def demo_pretty_exceptions():
    """Demonstrate pretty exceptions."""
    clickmd.md("\n# 🛑 Pretty Exceptions\n")
    
    clickmd.md("""
Pretty exceptions provide:
- Syntax-highlighted code snippets
- Shortened file paths
- Colored traceback

To enable globally:
```python
import clickmd
clickmd.install_excepthook()
```
""")
    
    # Show a formatted exception without actually raising
    clickmd.md("## Example Exception Format\n")
    
    try:
        # Simulate an error
        result = {"users": []}["admins"][0]
    except Exception as e:
        formatter = clickmd.PrettyExceptionFormatter()
        output = formatter.format_exception(type(e), e, e.__traceback__)
        print(output)


def demo_combined():
    """Demonstrate combined usage."""
    clickmd.md("\n# 🎨 Combined Example: API Response Debug\n")
    
    # Simulate API response
    response = {
        "status": 200,
        "data": {
            "users": [
                {"id": 1, "name": "Alice", "email": "alice@example.com"},
                {"id": 2, "name": "Bob", "email": "bob@example.com"},
            ],
            "pagination": {
                "page": 1,
                "per_page": 10,
                "total": 2,
            }
        },
        "meta": {
            "request_id": "abc-123",
            "timestamp": "2024-01-07T20:00:00Z",
        }
    }
    
    clickmd.debug(response, name="api_response")
    
    clickmd.hr()
    
    clickmd.tree(response, name="Response Structure")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("clickmd Phase 5 Developer Tools Demo")
    print("=" * 60 + "\n")
    
    demo_debug()
    demo_inspect()
    demo_tree()
    demo_diff()
    demo_logging()
    demo_pretty_exceptions()
    demo_combined()
    
    print("\n" + "=" * 60)
    print("Demo Complete!")
    print("=" * 60 + "\n")
