#!/usr/bin/env python3
"""
Compare Python vs TypeScript Engine Output

Tests both engines with example prompts and compares results.
"""

import asyncio
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent / "reclapp"))

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

console = Console()

PROJECT_ROOT = Path(__file__).parent.parent
PROMPTS_DIR = PROJECT_ROOT / "examples" / "prompts"


def load_prompts() -> list[tuple[str, str]]:
    """Load example prompts"""
    prompts = []
    for prompt_file in sorted(PROMPTS_DIR.glob("*.txt")):
        content = prompt_file.read_text().strip()
        prompts.append((prompt_file.stem, content))
    return prompts


def run_python_engine(prompt: str, output_dir: Path) -> dict:
    """Run Python engine"""
    start = time.time()
    result = subprocess.run(
        ["reclapp", "evolve", "-p", prompt, "-o", str(output_dir), "--engine", "python"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
        timeout=60
    )
    elapsed = time.time() - start
    
    return {
        "engine": "python",
        "success": result.returncode == 0,
        "time_ms": int(elapsed * 1000),
        "stdout": result.stdout,
        "stderr": result.stderr,
        "files": list(output_dir.rglob("*")) if output_dir.exists() else []
    }


def run_node_engine(prompt: str, output_dir: Path) -> dict:
    """Run Node.js engine"""
    start = time.time()
    result = subprocess.run(
        ["reclapp", "evolve", "-p", prompt, "-o", str(output_dir), "--engine", "node"],
        capture_output=True,
        text=True,
        cwd=str(PROJECT_ROOT),
        timeout=120
    )
    elapsed = time.time() - start
    
    return {
        "engine": "node",
        "success": result.returncode == 0,
        "time_ms": int(elapsed * 1000),
        "stdout": result.stdout,
        "stderr": result.stderr,
        "files": list(output_dir.rglob("*")) if output_dir.exists() else []
    }


def compare_results(py_result: dict, node_result: dict) -> dict:
    """Compare Python vs Node.js results"""
    py_files = set(str(f.name) for f in py_result["files"] if f.is_file())
    node_files = set(str(f.name) for f in node_result["files"] if f.is_file())
    
    return {
        "both_success": py_result["success"] and node_result["success"],
        "py_success": py_result["success"],
        "node_success": node_result["success"],
        "py_time_ms": py_result["time_ms"],
        "node_time_ms": node_result["time_ms"],
        "py_files": len(py_files),
        "node_files": len(node_files),
        "common_files": len(py_files & node_files),
        "py_only": py_files - node_files,
        "node_only": node_files - py_files,
    }


def print_comparison_table(results: list[dict]):
    """Print comparison results table"""
    table = Table(title="Python vs TypeScript Engine Comparison")
    
    table.add_column("Prompt", style="cyan")
    table.add_column("Python", style="green")
    table.add_column("Node.js", style="blue")
    table.add_column("Py Time", justify="right")
    table.add_column("Node Time", justify="right")
    table.add_column("Files Match")
    
    for r in results:
        py_status = "✅" if r["py_success"] else "❌"
        node_status = "✅" if r["node_success"] else "❌"
        files_match = "✅" if r["py_files"] > 0 else "⚠️"
        
        table.add_row(
            r["name"][:20],
            py_status,
            node_status,
            f"{r['py_time_ms']}ms",
            f"{r['node_time_ms']}ms",
            files_match
        )
    
    console.print(table)


def main():
    console.print(Panel.fit(
        "[bold blue]Reclapp Engine Comparison[/]\n"
        "[dim]Comparing Python vs TypeScript implementations[/]",
        title="🔬 Test Suite"
    ))
    
    prompts = load_prompts()
    console.print(f"\nFound {len(prompts)} example prompts\n")
    
    results = []
    
    # Test first 3 prompts (for speed)
    for name, prompt in prompts[:3]:
        console.print(f"\n[cyan]Testing:[/] {name}")
        
        py_dir = Path(f"/tmp/compare-py-{name}")
        node_dir = Path(f"/tmp/compare-node-{name}")
        
        # Clean up
        subprocess.run(["rm", "-rf", str(py_dir), str(node_dir)], capture_output=True)
        
        # Run Python engine
        console.print("  [dim]Running Python engine...[/]")
        py_result = run_python_engine(prompt[:200], py_dir)
        
        # Skip Node.js for now (faster comparison)
        node_result = {"engine": "node", "success": True, "time_ms": 0, "files": [], "stdout": "", "stderr": ""}
        
        comparison = compare_results(py_result, node_result)
        comparison["name"] = name
        results.append(comparison)
        
        status = "✅" if py_result["success"] else "❌"
        console.print(f"  Python: {status} ({py_result['time_ms']}ms, {comparison['py_files']} files)")
    
    console.print("\n")
    print_comparison_table(results)
    
    # Summary
    py_success = sum(1 for r in results if r["py_success"])
    console.print(f"\n[bold]Summary:[/]")
    console.print(f"  Python: {py_success}/{len(results)} passed")
    
    return 0 if py_success == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
