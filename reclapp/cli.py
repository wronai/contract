"""
Reclapp CLI - Python wrapper for full lifecycle management

Usage:
    reclapp --prompt "Create a notes app"
    reclapp --prompt "Create a CRM" --output ./my-app --port 4000
    reclapp generate examples/contract-ai/crm-contract.ts
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel

console = Console()

# Find the project root directory
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
BIN_DIR = PROJECT_ROOT / "bin"
LIFECYCLE_SCRIPT = BIN_DIR / "reclapp-full-lifecycle.sh"
NODE_CLI = BIN_DIR / "reclapp"


def find_node() -> Optional[str]:
    """Find node executable"""
    # Check common locations
    locations = [
        shutil.which("node"),
        os.path.expanduser("~/.nvm/versions/node/v20.19.5/bin/node"),
        os.path.expanduser("~/.nvm/versions/node/v18.20.8/bin/node"),
        "/usr/local/bin/node",
        "/usr/bin/node",
    ]
    for loc in locations:
        if loc and os.path.exists(loc):
            return loc
    return None


def find_npm() -> Optional[str]:
    """Find npm executable"""
    locations = [
        shutil.which("npm"),
        os.path.expanduser("~/.nvm/versions/node/v20.19.5/bin/npm"),
        os.path.expanduser("~/.nvm/versions/node/v18.20.8/bin/npm"),
        "/usr/local/bin/npm",
        "/usr/bin/npm",
    ]
    for loc in locations:
        if loc and os.path.exists(loc):
            return loc
    return None


def setup_node_env() -> dict:
    """Setup environment with node in PATH"""
    env = os.environ.copy()
    
    # Add nvm paths
    nvm_dir = os.path.expanduser("~/.nvm")
    if os.path.exists(nvm_dir):
        for version_dir in Path(nvm_dir).glob("versions/node/*/bin"):
            env["PATH"] = f"{version_dir}:{env.get('PATH', '')}"
    
    return env


@click.group(invoke_without_command=True)
@click.option("--prompt", "-p", help="Generate from natural language prompt")
@click.option("--output", "-o", default="./generated", help="Output directory")
@click.option("--port", default=3000, type=int, help="Service port")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--version", is_flag=True, help="Show version")
@click.pass_context
def main(ctx, prompt: Optional[str], output: str, port: int, verbose: bool, version: bool):
    """
    Reclapp - AI-Native Declarative Platform
    
    Generate applications from prompts or contracts.
    
    \b
    Examples:
        reclapp --prompt "Create a notes app"
        reclapp --prompt "Create a CRM" -o ./my-crm
        reclapp generate examples/contract-ai/crm-contract.ts
    """
    if version:
        from . import __version__
        console.print(f"[bold blue]Reclapp[/] v{__version__}")
        return
    
    if ctx.invoked_subcommand is None:
        if prompt:
            # Run full lifecycle with prompt
            ctx.invoke(lifecycle, prompt=prompt, output=output, port=port, verbose=verbose)
        else:
            click.echo(ctx.get_help())


@main.command()
@click.option("--prompt", "-p", required=True, help="Natural language prompt")
@click.option("--output", "-o", default="./generated", help="Output directory")
@click.option("--port", default=3000, type=int, help="Service port")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--keep-running", is_flag=True, help="Keep service running after tests")
def lifecycle(prompt: str, output: str, port: int, verbose: bool, keep_running: bool):
    """Run full lifecycle: prompt → contract → code → service → tests"""
    
    console.print(Panel.fit(
        "[bold blue]RECLAPP FULL LIFECYCLE[/]\n"
        f"[dim]Prompt:[/] {prompt}\n"
        f"[dim]Output:[/] {output}\n"
        f"[dim]Port:[/] {port}",
        title="🚀 Starting"
    ))
    
    # Check if shell script exists
    if LIFECYCLE_SCRIPT.exists():
        cmd = [
            str(LIFECYCLE_SCRIPT),
            "--prompt", prompt,
            "-o", output,
            "--port", str(port),
        ]
        if verbose:
            cmd.append("-v")
        if keep_running:
            cmd.append("--keep-running")
        
        env = setup_node_env()
        result = subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
        sys.exit(result.returncode)
    else:
        console.print("[red]Error:[/] Lifecycle script not found")
        console.print(f"Expected: {LIFECYCLE_SCRIPT}")
        sys.exit(1)


@main.command()
@click.argument("contract_path")
@click.option("--output", "-o", default="./generated", help="Output directory")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
def generate(contract_path: str, output: str, verbose: bool):
    """Generate code from a contract file"""
    
    console.print(f"[blue]📄 Generating from:[/] {contract_path}")
    
    node = find_node()
    if not node:
        console.print("[red]Error:[/] Node.js not found")
        sys.exit(1)
    
    if NODE_CLI.exists():
        cmd = [node, str(NODE_CLI), "generate-ai", contract_path, "-o", output]
        if verbose:
            cmd.append("-v")
        
        env = setup_node_env()
        result = subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
        sys.exit(result.returncode)
    else:
        console.print("[red]Error:[/] Node CLI not found")
        sys.exit(1)


@main.command()
def list():
    """List available contracts"""
    
    node = find_node()
    if not node and NODE_CLI.exists():
        cmd = [node, str(NODE_CLI), "list"]
        env = setup_node_env()
        subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
    else:
        # Fallback: list contract files
        console.print("[bold]Available Contracts:[/]\n")
        
        examples_dir = PROJECT_ROOT / "examples"
        if examples_dir.exists():
            for pattern in ["**/*.reclapp.ts", "**/contract*.ts"]:
                for f in examples_dir.glob(pattern):
                    rel_path = f.relative_to(PROJECT_ROOT)
                    console.print(f"  📄 {rel_path}")


@main.command()
def validate():
    """Validate Pydantic contracts"""
    console.print("[blue]Validating Pydantic contracts...[/]\n")
    
    try:
        from examples.pydantic_contracts.contracts import (
            NotesContract, TodoContract, CRMContract,
            InventoryContract, BookingContract
        )
        
        contracts = [
            ("Notes", NotesContract),
            ("Todo", TodoContract),
            ("CRM", CRMContract),
            ("Inventory", InventoryContract),
            ("Booking", BookingContract),
        ]
        
        for name, contract_cls in contracts:
            contract = contract_cls.create()
            entities = [e.name for e in contract.definition.entities]
            port = contract.generation.techStack.backend.port
            console.print(f"  [green]✓[/] {name}: {entities} (port {port})")
        
        console.print("\n[green]All contracts valid![/]")
    except ImportError as e:
        console.print(f"[red]Error:[/] {e}")
        sys.exit(1)


@main.command()
@click.option("--level", type=click.Choice(["simple", "medium", "complex", "all"]), default="simple")
def prompts(level: str):
    """Show example prompts"""
    
    try:
        from examples.pydantic_contracts.prompts import get_test_prompts
        
        prompts_list = get_test_prompts(level)
        console.print(f"[bold]Test Prompts ({level}):[/]\n")
        
        for i, prompt in enumerate(prompts_list, 1):
            console.print(f"  {i}. {prompt}")
        
        console.print(f"\n[dim]Usage: reclapp --prompt \"{prompts_list[0]}\"[/]")
    except ImportError:
        # Fallback prompts
        console.print("[bold]Example Prompts:[/]\n")
        console.print("  1. Create a notes app")
        console.print("  2. Create a todo list with tasks")
        console.print("  3. Create a CRM system with contacts and deals")


if __name__ == "__main__":
    main()
