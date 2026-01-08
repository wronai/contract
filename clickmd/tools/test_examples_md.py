#!/usr/bin/env python3
"""
Test Examples Markdown Output

Runs all examples and verifies the markdown output is valid
and converts correctly to HTML.

Usage:
    python tools/test_examples_md.py
    python tools/test_examples_md.py --html  # Generate HTML files
"""

import subprocess
import sys
import os
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tools.md_to_html import markdown_to_html


EXAMPLES = [
    ("quickstart.py", []),
    ("one_liners.py", []),
    ("cli_colors.py", []),
    ("api_response.py", []),
    ("config_viewer.py", []),
    # CLI examples need special handling
    ("simple_cli.py", ["--help"]),
    ("simple_cli.py", ["info"]),
]

SKIP_INTERACTIVE = [
    "build_script.py",  # Has sleep/progress
    "phase3_progress.py",  # Has sleep/progress
]


def run_example(example_file: str, args: list[str] = None) -> tuple[bool, str]:
    """Run an example and capture output."""
    args = args or []
    example_path = Path(__file__).parent.parent / "examples" / example_file
    
    if not example_path.exists():
        return False, f"File not found: {example_path}"
    
    env = os.environ.copy()
    env["PYTHONPATH"] = str(Path(__file__).resolve().parents[2])
    env["NO_COLOR"] = "1"  # Disable ANSI colors for clean markdown
    
    try:
        result = subprocess.run(
            [sys.executable, str(example_path)] + args,
            capture_output=True,
            text=True,
            timeout=10,
            env=env,
        )
        return True, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


def check_markdown_structure(content: str) -> list[str]:
    """Check markdown content for common issues."""
    issues = []
    
    lines = content.split("\n")
    in_codeblock = False
    codeblock_count = 0
    
    for i, line in enumerate(lines, 1):
        # Track codeblocks
        if line.strip().startswith("```"):
            in_codeblock = not in_codeblock
            codeblock_count += 1
        
        # Check for unescaped box-drawing characters outside codeblocks
        box_chars = "┌┐└┘├┤┬┴┼─│"
        if not in_codeblock and any(c in line for c in box_chars):
            issues.append(f"Line {i}: Box-drawing chars outside codeblock: {line[:50]}...")
    
    # Check for unclosed codeblocks
    if codeblock_count % 2 != 0:
        issues.append(f"Unclosed codeblock (found {codeblock_count} markers)")
    
    return issues


def test_html_conversion(content: str, name: str) -> tuple[bool, str]:
    """Test that markdown converts to valid HTML."""
    try:
        html = markdown_to_html(content, title=name)
        
        # Basic HTML validation
        if "<html" not in html:
            return False, "Missing <html> tag"
        if "</html>" not in html:
            return False, "Missing </html> tag"
        
        return True, html
    except Exception as e:
        return False, str(e)


def main():
    """Run all tests."""
    print("=" * 60)
    print("Testing clickmd Examples - Markdown Output")
    print("=" * 60)
    print()
    
    generate_html = "--html" in sys.argv
    output_dir = Path(__file__).parent.parent / "examples_output"
    
    if generate_html:
        output_dir.mkdir(exist_ok=True)
        print(f"HTML output directory: {output_dir}")
        print()
    
    results = []
    
    for example_file, args in EXAMPLES:
        name = f"{example_file}" + (f" {' '.join(args)}" if args else "")
        print(f"Testing: {name}")
        
        # Run example
        success, output = run_example(example_file, args)
        if not success:
            print(f"  ❌ Failed to run: {output}")
            results.append((name, False, output))
            continue
        
        # Check markdown structure
        issues = check_markdown_structure(output)
        if issues:
            print(f"  ⚠️  Markdown issues:")
            for issue in issues[:3]:
                print(f"      - {issue}")
            results.append((name, False, "\n".join(issues)))
            continue
        
        # Test HTML conversion
        html_ok, html_result = test_html_conversion(output, name)
        if not html_ok:
            print(f"  ❌ HTML conversion failed: {html_result}")
            results.append((name, False, html_result))
            continue
        
        print(f"  ✅ OK ({len(output)} chars)")
        results.append((name, True, ""))
        
        # Save files if requested
        if generate_html:
            safe_name = example_file.replace(".py", "")
            if args:
                safe_name += "_" + "_".join(a.replace("-", "") for a in args)
            
            md_file = output_dir / f"{safe_name}.md"
            html_file = output_dir / f"{safe_name}.html"
            
            md_file.write_text(output)
            html_file.write_text(html_result)
            print(f"      Saved: {md_file.name}, {html_file.name}")
    
    # Summary
    print()
    print("=" * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = len(results) - passed
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed > 0:
        print("\nFailed tests:")
        for name, ok, error in results:
            if not ok:
                print(f"  - {name}: {error[:100]}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
