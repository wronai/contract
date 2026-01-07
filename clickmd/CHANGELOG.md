# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-07

### Added
- Initial release
- `md()` function for markdown rendering
- `echo()` smart function with auto-detection
- `MarkdownRenderer` class for advanced usage
- Syntax highlighting for:
  - Python (keywords, decorators, strings, comments)
  - TypeScript/JavaScript (keywords, strings, template literals)
  - JSON (keys, values, numbers, booleans)
  - YAML (keys, values, comments, lists)
  - Bash/Shell (commands, comments)
  - Markdown (headers, bold, links)
  - Log (status emojis, errors, warnings)
- Click decorators re-export (optional dependency)
- Zero-dependency core functionality
- Full test suite
- Examples and documentation

### Features
- Works without Click installed
- Auto-detects TTY for color output
- Supports custom output streams
- Type hints (py.typed marker)

## [Unreleased]

### Planned
- Table rendering
- Progress bars
- Box/panel rendering
- More language highlighters
