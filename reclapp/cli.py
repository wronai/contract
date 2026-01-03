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
@click.option("--keep-running", "-k", is_flag=True, help="Keep service running after tests")
@click.option("--version", is_flag=True, help="Show version")
@click.pass_context
def main(ctx, prompt: Optional[str], output: str, port: int, verbose: bool, keep_running: bool, version: bool):
    """
    Reclapp - AI-Native Declarative Platform
    
    Generate applications from prompts or contracts.
    
    \b
    Examples:
        reclapp --prompt "Create a notes app"
        reclapp --prompt "Create a CRM" -o ./my-crm
        reclapp --prompt "Create a todo app" --keep-running
        reclapp generate examples/contract-ai/crm-contract.ts
    """
    if version:
        from . import __version__
        console.print(f"[bold blue]Reclapp[/] v{__version__}")
        return
    
    if ctx.invoked_subcommand is None:
        if prompt:
            # Run full lifecycle with prompt
            ctx.invoke(lifecycle, prompt=prompt, output=output, port=port, verbose=verbose, keep_running=keep_running)
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
@click.option("--engine", type=click.Choice(["python", "node"]), default="python", help="Execution engine")
def generate(contract_path: str, output: str, verbose: bool, engine: str):
    """Generate code from a contract file"""
    
    # Check if contract is a .md file (Python can handle these natively)
    is_markdown = contract_path.endswith(".md")
    
    if engine == "python" and is_markdown:
        try:
            from .generate_command import generate_sync
            exit_code = generate_sync(
                contract_path=contract_path,
                output=output,
                verbose=verbose
            )
            sys.exit(exit_code)
        except ImportError as e:
            console.print(f"[yellow]Warning:[/] Python engine not available: {e}")
            engine = "node"
    elif engine == "python" and not is_markdown:
        console.print("[yellow]Note:[/] TypeScript contracts require Node.js engine")
        engine = "node"
    
    if engine == "node":
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


@main.command()
@click.option("--output", "-o", default=".", help="Output directory for setup files")
@click.option("--install", "-i", is_flag=True, help="Install missing dependencies")
@click.option("--yes", "-y", is_flag=True, help="Skip confirmations")
@click.option("--dry-run", is_flag=True, help="Simulate installations without executing")
@click.option("--skip-optional", is_flag=True, help="Skip optional dependencies")
def setup(output: str, install: bool, yes: bool, dry_run: bool, skip_optional: bool):
    """Check environment and install dependencies"""
    
    # Try Python native setup first
    setup_script = PROJECT_ROOT / "tools" / "reclapp-setup" / "setup.py"
    venv_python = PROJECT_ROOT / "tools" / "reclapp-setup" / "venv" / "bin" / "python"
    
    if setup_script.exists():
        # Use venv python if available, else system python
        python_path = str(venv_python) if venv_python.exists() else sys.executable
        
        cmd = [python_path, str(setup_script)]
        if output != ".":
            cmd.extend(["-o", output])
        if install or dry_run:
            cmd.append("--install")
        if yes or dry_run:
            cmd.append("-y")
        if dry_run:
            cmd.append("--dry-run")
        if skip_optional:
            cmd.append("--skip-optional")
        
        result = subprocess.run(cmd, cwd=str(PROJECT_ROOT))
        sys.exit(result.returncode)
    else:
        # Fallback to Node.js CLI
        node = find_node()
        if node and NODE_CLI.exists():
            cmd = [node, str(NODE_CLI), "setup"]
            if output != ".":
                cmd.extend(["-o", output])
            if install:
                cmd.append("--install")
            if yes:
                cmd.append("-y")
            if dry_run:
                cmd.append("--dry-run")
            if skip_optional:
                cmd.append("--skip-optional")
            
            env = setup_node_env()
            result = subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
            sys.exit(result.returncode)
        else:
            console.print("[red]Error:[/] Setup module not found")
            sys.exit(1)


@main.command()
@click.option("--prompt", "-p", required=True, help="Natural language prompt describing the app")
@click.option("--output", "-o", default="./target", help="Output directory")
@click.option("--keep-running", "-k", is_flag=True, help="Keep service running after generation")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--engine", type=click.Choice(["python", "node"]), default="python", help="Execution engine")
def evolve(prompt: str, output: str, keep_running: bool, verbose: bool, engine: str):
    """Evolution mode - dynamic code generation with auto-healing"""
    
    if engine == "python":
        # Use native Python implementation
        try:
            from .evolve_command import evolve_sync
            exit_code = evolve_sync(
                prompt=prompt,
                output=output,
                keep_running=keep_running,
                verbose=verbose
            )
            sys.exit(exit_code)
        except ImportError as e:
            console.print(f"[yellow]Warning:[/] Python engine not available: {e}")
            console.print("[dim]Falling back to Node.js...[/]")
            engine = "node"
    
    if engine == "node":
        # Use Node.js implementation
        node = find_node()
        if not node:
            console.print("[red]Error:[/] Node.js not found. Run: reclapp setup")
            sys.exit(1)
        
        if NODE_CLI.exists():
            cmd = [node, str(NODE_CLI), "evolve", "--prompt", prompt, "-o", output]
            if keep_running:
                cmd.append("-k")
            if verbose:
                cmd.append("-v")
            
            env = setup_node_env()
            result = subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
            sys.exit(result.returncode)
        else:
            console.print("[red]Error:[/] Node CLI not found")
            sys.exit(1)


# ============================================================================
# LLM MANAGEMENT COMMANDS
# ============================================================================

@main.group()
def llm():
    """LLM provider management commands."""
    pass


@llm.command("status")
def llm_status():
    """Show LLM providers status and configuration."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / 'pycontracts' / 'llm'))
    
    try:
        from config import LLMConfig
        from clients import list_available_providers, RECOMMENDED_MODELS
        
        config = LLMConfig()
        
        console.print(Panel.fit(
            "[bold blue]LLM Provider Status[/]",
            title="🤖 LLM Configuration"
        ))
        
        # Show default provider
        console.print(f"\n[bold]Default Provider:[/] {config.get_default_provider()}")
        
        # Show provider status
        console.print("\n[bold]Providers:[/]")
        available = list_available_providers()
        priorities = {
            'ollama': 10, 'groq': 20, 'together': 30,
            'openrouter': 40, 'openai': 50, 'anthropic': 60, 'litellm': 70
        }
        
        for provider in sorted(priorities.keys(), key=lambda p: priorities[p]):
            is_available = available.get(provider, False)
            status = "[green]✓ Available[/]" if is_available else "[dim]✗ Not configured[/]"
            model = config.get_model(provider)
            priority = priorities.get(provider, 100)
            console.print(f"  [{priority:2d}] {provider:12s} {status}  Model: {model}")
        
        console.print("\n[dim]Priority: lower number = tried first[/]")
        
    except ImportError as e:
        console.print(f"[red]Error:[/] {e}")
        console.print("[dim]Try: pip install httpx pyyaml[/]")


@llm.command("models")
@click.option("--provider", "-p", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "ollama"
]), help="Filter by provider")
def llm_models(provider: str):
    """List recommended models for each provider."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / 'pycontracts' / 'llm'))
    
    try:
        from clients import RECOMMENDED_MODELS, OllamaClient
        
        console.print(Panel.fit(
            "[bold blue]Recommended Models[/]",
            title="📦 LLM Models"
        ))
        
        providers_to_show = [provider] if provider else RECOMMENDED_MODELS.keys()
        
        for prov in providers_to_show:
            if prov not in RECOMMENDED_MODELS:
                continue
            console.print(f"\n[bold]{prov.upper()}:[/]")
            for model, desc in RECOMMENDED_MODELS[prov]:
                console.print(f"  [cyan]{model}[/]")
                console.print(f"    [dim]{desc}[/]")
        
        # Show local Ollama models if available
        if provider == "ollama" or provider is None:
            client = OllamaClient()
            if client.is_available():
                models = client.list_models()
                if models:
                    console.print(f"\n[bold]LOCAL OLLAMA MODELS ({len(models)}):[/]")
                    for m in models[:15]:
                        console.print(f"  [green]✓[/] {m}")
                    if len(models) > 15:
                        console.print(f"  [dim]... and {len(models) - 15} more[/]")
                        
    except ImportError as e:
        console.print(f"[red]Error:[/] {e}")


@llm.command("set-provider")
@click.argument("provider", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "ollama", "litellm"
]))
def llm_set_provider(provider: str):
    """Set default LLM provider."""
    env_file = PROJECT_ROOT / ".env"
    
    if env_file.exists():
        content = env_file.read_text()
        
        # Update or add LLM_PROVIDER
        import re
        if re.search(r'^LLM_PROVIDER=', content, re.MULTILINE):
            content = re.sub(r'^LLM_PROVIDER=.*$', f'LLM_PROVIDER={provider}', content, flags=re.MULTILINE)
        else:
            content += f"\nLLM_PROVIDER={provider}\n"
        
        env_file.write_text(content)
        console.print(f"[green]✓[/] Default provider set to: [bold]{provider}[/]")
        console.print(f"[dim]Updated: {env_file}[/]")
    else:
        console.print(f"[yellow]Warning:[/] .env file not found")
        console.print(f"Set manually: export LLM_PROVIDER={provider}")


@llm.command("set-model")
@click.argument("provider", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "ollama"
]))
@click.argument("model")
def llm_set_model(provider: str, model: str):
    """Set model for a specific provider."""
    env_file = PROJECT_ROOT / ".env"
    var_name = f"{provider.upper()}_MODEL"
    
    if env_file.exists():
        content = env_file.read_text()
        
        import re
        if re.search(rf'^{var_name}=', content, re.MULTILINE):
            content = re.sub(rf'^{var_name}=.*$', f'{var_name}={model}', content, flags=re.MULTILINE)
        elif re.search(rf'^#\s*{var_name}=', content, re.MULTILINE):
            content = re.sub(rf'^#\s*{var_name}=.*$', f'{var_name}={model}', content, flags=re.MULTILINE)
        else:
            content += f"\n{var_name}={model}\n"
        
        env_file.write_text(content)
        console.print(f"[green]✓[/] {provider} model set to: [bold]{model}[/]")
        console.print(f"[dim]Updated: {env_file}[/]")
    else:
        console.print(f"[yellow]Warning:[/] .env file not found")
        console.print(f"Set manually: export {var_name}={model}")


@llm.command("test")
@click.option("--provider", "-p", help="Provider to test (default: auto-detect)")
@click.option("--model", "-m", help="Model to test")
def llm_test(provider: str, model: str):
    """Test LLM generation with a simple prompt."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / 'pycontracts' / 'llm'))
    
    try:
        from clients import get_client
        
        console.print("[blue]Testing LLM generation...[/]")
        
        kwargs = {}
        if model:
            kwargs['model'] = model
        
        client = get_client(provider, **kwargs) if provider else get_client(**kwargs)
        
        console.print(f"[dim]Provider: {client.provider_name}[/]")
        console.print(f"[dim]Model: {getattr(client, 'model', 'unknown')}[/]")
        
        if not client.is_available():
            console.print(f"[red]Error:[/] Provider not available")
            return
        
        import time
        start = time.time()
        response = client.generate("Say 'Hello from Reclapp!' and nothing else.", max_tokens=20)
        elapsed = time.time() - start
        
        console.print(f"\n[green]✓ Response:[/] {response.strip()}")
        console.print(f"[dim]Time: {elapsed:.2f}s[/]")
        
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm.command("config")
def llm_config():
    """Show full LLM configuration as JSON."""
    import sys
    import json
    sys.path.insert(0, str(PROJECT_ROOT / 'pycontracts' / 'llm'))
    
    try:
        from config import LLMConfig
        
        config = LLMConfig()
        data = config.to_dict()
        
        console.print(json.dumps(data, indent=2))
        
    except ImportError as e:
        console.print(f"[red]Error:[/] {e}")


if __name__ == "__main__":
    main()
