#!/usr/bin/env python3
"""
Markdown Help Example - clickmd's USP (Unique Selling Point)

Demonstrates how to use MarkdownCommand and MarkdownGroup to render
docstrings and option descriptions as Markdown in Click help screens.

Run: python examples/markdown_help.py --help
     python examples/markdown_help.py process --help
     python examples/markdown_help.py config --help
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import clickmd

# Check if click is available
if not clickmd.CLICK_AVAILABLE:
    print("This example requires Click. Install with: pip install click")
    sys.exit(1)


@clickmd.group(cls=clickmd.MarkdownGroup)
def cli():
    """
    # 🚀 My Awesome CLI
    
    A **powerful** command-line tool for data processing.
    
    ## Features
    
    - Fast and efficient processing
    - Multiple output formats
    - Extensible plugin system
    
    ## Quick Start
    
    ```bash
    mycli process input.csv --output results.json
    mycli config set api_key YOUR_KEY
    ```
    
    For more information, visit https://example.com/docs
    """
    pass


@cli.command(cls=clickmd.MarkdownCommand)
@clickmd.option("--input", "-i", required=True, help="Input file path (**required**)")
@clickmd.option("--output", "-o", default="output.json", help="Output file path (default: `output.json`)")
@clickmd.option("--format", "-f", type=clickmd.Choice(["json", "csv", "yaml"]), default="json",
                help="Output format: `json`, `csv`, or `yaml`")
@clickmd.option("--verbose", "-v", is_flag=True, help="Enable *verbose* output")
@clickmd.option("--dry-run", is_flag=True, help="Run without making changes (**safe mode**)")
def process(input: str, output: str, format: str, verbose: bool, dry_run: bool):
    """
    # Process Data
    
    Transform and process input files with **configurable** options.
    
    ## Supported Formats
    
    | Format | Extension | Description |
    |--------|-----------|-------------|
    | JSON   | `.json`   | JavaScript Object Notation |
    | CSV    | `.csv`    | Comma-Separated Values |
    | YAML   | `.yaml`   | YAML Ain't Markup Language |
    
    ## Examples
    
    ```bash
    # Basic usage
    mycli process -i data.csv -o result.json
    
    # With verbose output
    mycli process -i data.csv -v --format yaml
    
    # Dry run (no changes)
    mycli process -i data.csv --dry-run
    ```
    
    ## Notes
    
    - Large files may take longer to process
    - Use `--verbose` to see progress
    """
    clickmd.success(f"Processing {input}")
    
    if dry_run:
        clickmd.warning("Dry run mode - no changes will be made")
    
    if verbose:
        clickmd.info(f"Output format: {format}")
        clickmd.info(f"Output file: {output}")
    
    # Simulate processing
    clickmd.echo_md(f"""
## Results

Processed **{input}** successfully!

```json
{{
  "status": "success",
  "input": "{input}",
  "output": "{output}",
  "format": "{format}"
}}
```
""")


@cli.command(cls=clickmd.MarkdownCommand)
@clickmd.argument("action", type=clickmd.Choice(["get", "set", "list", "reset"]))
@clickmd.argument("key", required=False)
@clickmd.argument("value", required=False)
def config(action: str, key: str, value: str):
    """
    # Configuration Management
    
    Manage application configuration with **persistent** storage.
    
    ## Actions
    
    - `get` - Get a configuration value
    - `set` - Set a configuration value
    - `list` - List all configuration
    - `reset` - Reset to defaults
    
    ## Examples
    
    ```bash
    # List all config
    mycli config list
    
    # Get a value
    mycli config get api_key
    
    # Set a value
    mycli config set api_key YOUR_SECRET_KEY
    
    # Reset to defaults
    mycli config reset
    ```
    """
    if action == "list":
        clickmd.echo_md("""
## Current Configuration

```yaml
api_key: sk-***hidden***
output_dir: ./output
log_level: INFO
theme: default
```
""")
    elif action == "get":
        if key:
            clickmd.info(f"{key} = <value>")
        else:
            clickmd.error("Key is required for 'get' action")
    elif action == "set":
        if key and value:
            clickmd.success(f"Set {key} = {value}")
        else:
            clickmd.error("Both key and value are required for 'set' action")
    elif action == "reset":
        clickmd.warning("Configuration reset to defaults")


@cli.command(cls=clickmd.MarkdownCommand)
def version():
    """
    # Version Information
    
    Display version and system information.
    """
    clickmd.echo_md("""
## clickmd Demo CLI

| Component | Version |
|-----------|---------|
| CLI | 1.0.0 |
| clickmd | 1.1.0 |
| Python | 3.12 |

Built with ❤️ using **clickmd**
""")


if __name__ == "__main__":
    cli()
