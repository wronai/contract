#!/usr/bin/env python3
"""
Logger usage examples - automatic log wrapping in markdown codeblocks.

This example shows how to use clickmd.Logger to automatically wrap
all log output in ```log blocks for consistent CLI rendering.

Run: python examples/logger_usage.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from clickmd import Logger, md


def basic_usage():
    """Basic Logger usage"""
    md("# Basic Logger Usage\n")
    
    log = Logger(verbose=True)
    
    # Log levels - each automatically wrapped in ```log block
    log.info("Starting process...")
    log.success("Build completed successfully")
    log.warning("Cache miss - fetching from source")
    log.error("Connection refused")


def action_logging():
    """Action-based logging with emojis"""
    md("# Action Logging\n")
    
    log = Logger(verbose=True)
    
    # Predefined actions with appropriate emojis
    log.action("start", "Evolution mode activated")
    log.action("llm", "Using OpenRouter provider")
    log.action("generate", "Generating code to ./output")
    log.action("test", "Running test suite")
    log.action("save", "Saving contract.ai.json")
    log.action("done", "All tasks completed")


def progress_and_steps():
    """Progress and step logging"""
    md("# Progress & Steps\n")
    
    log = Logger(verbose=True)
    
    # Progress bar style
    log.progress("Installing", 25, 100)
    log.progress("Building", 50, 100)
    log.progress("Testing", 75, 100)
    log.progress("Complete", 100, 100)
    
    # Step by step
    log.step(1, 5, "Initialize project")
    log.step(2, 5, "Generate contract")
    log.step(3, 5, "Generate code")
    log.step(4, 5, "Run tests")
    log.step(5, 5, "Deploy")


def exception_handling():
    """Exception logging"""
    md("# Exception Handling\n")
    
    log = Logger(verbose=True)
    
    try:
        # Simulate an error
        result = 1 / 0
    except Exception as e:
        log.exception(e)
    
    # With traceback
    try:
        raise ValueError("Invalid configuration: missing 'port' field")
    except Exception as e:
        log.exception(e, show_traceback=True)


def grouped_output():
    """Grouped output using sections"""
    md("# Grouped Output (Sections)\n")
    
    log = Logger(verbose=True)
    
    # Without section - each call creates separate ```log block
    log.info("This is separate")
    log.info("Each line is its own block")
    
    md("\n## With Section\n")
    
    # With section - all output in single ```log block
    with log.section("Build Process"):
        log.action("start", "Starting build...")
        log.info("Compiling TypeScript")
        log.info("Bundling assets")
        log.info("Optimizing images")
        log.success("Build complete!")


def llm_logging():
    """LLM-specific logging"""
    md("# LLM Logging\n")
    
    log = Logger(verbose=True)
    
    # LLM selection
    log.llm("openrouter", "qwen/qwen-2.5-coder-32b-instruct")
    
    # Attempt logging
    log.attempt(1, 3, "contract generation")
    log.attempt(2, 3, "contract generation")
    
    # Key-value pairs
    log.key_value("Provider", "openrouter")
    log.key_value("Model", "qwen-2.5-coder")
    log.key_value("Temperature", 0.7)


def mixed_output():
    """Mixed markdown and log output"""
    md("# Mixed Markdown & Logs\n")
    
    log = Logger(verbose=True)
    
    # Markdown heading (outside codeblock)
    log.heading(2, "Generation Status")
    
    # Log output (inside codeblock)
    log.action("start", "Starting generation...")
    log.info("Loading contract.ai.json")
    log.success("Contract loaded")
    
    # More markdown
    log.md("""
## Generated Files

| File | Size | Status |
|------|------|--------|
| server.ts | 2.4 KB | ✅ |
| package.json | 0.8 KB | ✅ |
| tsconfig.json | 0.3 KB | ✅ |
""")
    
    # More logs
    log.action("done", "Generation complete!")


def real_world_example():
    """Real-world evolution pipeline example"""
    md("# Real-World Example: Evolution Pipeline\n")
    
    log = Logger(verbose=True)
    
    # Pipeline header
    log.heading(1, "🧬 Evolution Mode")
    
    with log.section("Configuration"):
        log.key_value("Prompt", "Create a todo app")
        log.key_value("Output", "./output")
        log.key_value("Engine", "Python Native")
    
    log.heading(2, "Contract Generation")
    
    log.llm("openrouter", "nvidia/nemotron-3-nano-30b-a3b:free")
    
    log.attempt(1, 3, "contract generation")
    log.success("Contract generated successfully in 1 attempt(s)")
    
    log.heading(2, "Code Generation")
    
    with log.section("Generation"):
        log.action("generate", "Generating code to ./output")
        log.info("Framework: express (typescript)")
        log.info("Entities: 1")
        log.action("llm", "Using LLM for code generation...")
        log.success("LLM generated 3 files")
    
    log.heading(2, "Testing")
    
    with log.section("Test Results"):
        log.success("Health check passed")
        log.success("CRUD tests passed")
        log.warning("1 test skipped (optional feature)")
    
    log.heading(2, "✅ Evolution Complete")
    
    log.success("All tasks finished successfully!")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("clickmd Logger Examples")
    print("=" * 60 + "\n")
    
    basic_usage()
    print("\n" + "-" * 40 + "\n")
    
    action_logging()
    print("\n" + "-" * 40 + "\n")
    
    progress_and_steps()
    print("\n" + "-" * 40 + "\n")
    
    exception_handling()
    print("\n" + "-" * 40 + "\n")
    
    grouped_output()
    print("\n" + "-" * 40 + "\n")
    
    llm_logging()
    print("\n" + "-" * 40 + "\n")
    
    mixed_output()
    print("\n" + "-" * 40 + "\n")
    
    real_world_example()
