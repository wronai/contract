# clickmd

[![PyPI version](https://badge.fury.io/py/clickmd.svg)](https://badge.fury.io/py/clickmd)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/wronai/clickmd/actions/workflows/tests.yml/badge.svg)](https://github.com/wronai/clickmd/actions)
[![codecov](https://codecov.io/gh/wronai/clickmd/branch/main/graph/badge.svg)](https://codecov.io/gh/wronai/clickmd)

**Markdown rendering for CLI applications with syntax highlighting.**

`clickmd` provides beautiful terminal output with:
- 🎨 **Syntax highlighting** for code blocks (Python, TypeScript, JSON, YAML, Bash, etc.)
- 📝 **Markdown rendering** with headers, bold, links, and more
- 🔧 **Zero dependencies** for core functionality
- 🖱️ **Optional Click integration** for CLI decorators

## Installation

```bash
# Core package (no dependencies)
pip install clickmd

# With Click support
pip install clickmd[click]
```

## Quick Start

### Basic Usage (No Dependencies)

```python
from clickmd import md, echo

# Render markdown with syntax highlighting
md("""
# Hello World

This is **bold** and this is a [link](https://example.com).

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"
```
""")

# Smart echo - auto-detects markdown
echo("## Status Update")
echo("Regular text without markdown")
```

### With Click Integration

```python
import clickmd as click

@click.group()
def cli():
    """My awesome CLI tool"""
    pass

@cli.command()
@click.option("--name", "-n", default="World")
def hello(name: str):
    """Say hello"""
    click.md(f"""
## 👋 Hello, {name}!

Welcome to **clickmd** - making CLIs beautiful.
    """)

if __name__ == "__main__":
    cli()
```

## Features

### Syntax Highlighting

`clickmd` provides syntax highlighting for multiple languages:

| Language | Extensions | Highlight Features |
|----------|------------|-------------------|
| Python | `.py` | Keywords, strings, comments, decorators |
| TypeScript/JavaScript | `.ts`, `.js` | Keywords, strings, template literals |
| JSON | `.json` | Keys, strings, numbers, booleans |
| YAML | `.yaml`, `.yml` | Keys, values, comments |
| Bash/Shell | `.sh`, `.bash` | Commands, comments |
| Markdown | `.md` | Headers, bold, links |
| Log | `.log` | Errors (red), warnings (yellow), success (green) |

### Markdown Elements

```python
from clickmd import md

md("""
# Heading 1
## Heading 2
### Heading 3

**Bold text** and regular text.

[Links](https://example.com) are supported.

```python
# Code blocks with syntax highlighting
print("Hello, World!")
```

- List items
- Are rendered
- Correctly
""")
```

### MarkdownRenderer Class

For more control, use the `MarkdownRenderer` class directly:

```python
from clickmd import MarkdownRenderer
import sys

renderer = MarkdownRenderer(use_colors=True, stream=sys.stdout)
renderer.heading(1, "My Title")
renderer.codeblock("python", 'print("Hello!")')
```

### Progress and Status Output

```python
from clickmd import md

# Log-style output with automatic coloring
md("""
```log
🚀 Starting process...
📦 Installing dependencies...
✅ Build successful!
⚠️ Warning: deprecated API
🛑 Error: connection failed
```
""")
```

## API Reference

### Core Functions

#### `md(text: str) -> None`
Render markdown text with syntax highlighting.

#### `echo(message, file=None, nl=True, err=False, color=None) -> None`
Smart echo that auto-detects markdown and renders it.

#### `render_markdown(text, text_lang="markdown", stream=None, use_colors=True) -> None`
Low-level markdown rendering function.

#### `get_renderer(stream=None, use_colors=True) -> MarkdownRenderer`
Get a `MarkdownRenderer` instance.

### Click Decorators (requires `click` package)

When `click` is installed, these decorators are available:

- `@clickmd.group()` - Create a command group
- `@clickmd.command()` - Create a command
- `@clickmd.option()` - Add an option
- `@clickmd.argument()` - Add an argument
- `@clickmd.pass_context` - Pass Click context
- `clickmd.Choice` - Choice type
- `clickmd.Path` - Path type

### Constants

- `CLICK_AVAILABLE: bool` - Whether Click is installed

## Examples

See the [examples/](examples/) directory for more usage examples:

- `examples/basic.py` - Basic markdown rendering
- `examples/cli_app.py` - Full CLI application with Click
- `examples/custom_renderer.py` - Custom renderer configuration
- `examples/logging.py` - Log-style colored output

## Development

```bash
# Clone the repository
git clone https://github.com/wronai/clickmd.git
cd clickmd

# Install development dependencies
pip install -e ".[dev]"

# Run tests
make test

# Run linter
make lint

# Format code
make format
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## Related Projects

- [Click](https://click.palletsprojects.com/) - Python CLI framework
- [Rich](https://github.com/Textualize/rich) - Rich text and beautiful formatting
- [Reclapp](https://github.com/wronai/contract) - Contract-first development platform
