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
import builtins

import click
from rich.console import Console
from rich.panel import Panel

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

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
        from clients import list_available_providers
        
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
        configured = config.list_configured_providers()
        priorities = {
            'ollama': 10, 'groq': 20, 'together': 30,
            'openrouter': 40, 'openai': 50, 'anthropic': 60, 'litellm': 70
        }
        
        for provider in sorted(priorities.keys(), key=lambda p: priorities[p]):
            is_available = available.get(provider, False)
            is_configured = configured.get(provider, False)

            if not is_configured:
                status = "[dim]✗ Not configured[/]"
            elif is_available:
                status = "[green]✓ Available[/]"
            else:
                status = "[yellow]⚠ Configured but unreachable[/]"

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

    content = env_file.read_text() if env_file.exists() else ""

    # Update or add LLM_PROVIDER
    import re
    if re.search(r'^LLM_PROVIDER=', content, re.MULTILINE):
        content = re.sub(r'^LLM_PROVIDER=.*$', f'LLM_PROVIDER={provider}', content, flags=re.MULTILINE)
    else:
        if content and not content.endswith("\n"):
            content += "\n"
        content += f"LLM_PROVIDER={provider}\n"

    env_file.write_text(content)
    console.print(f"[green]✓[/] Default provider set to: [bold]{provider}[/]")
    console.print(f"[dim]Updated: {env_file}[/]")


@llm.command("set-model")
@click.argument("provider", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "ollama"
]))
@click.argument("model")
def llm_set_model(provider: str, model: str):
    """Set model for a specific provider."""
    env_file = PROJECT_ROOT / ".env"
    var_name = f"{provider.upper()}_MODEL"

    content = env_file.read_text() if env_file.exists() else ""

    import re
    if re.search(rf'^{var_name}=', content, re.MULTILINE):
        content = re.sub(rf'^{var_name}=.*$', f'{var_name}={model}', content, flags=re.MULTILINE)
    elif re.search(rf'^#\s*{var_name}=', content, re.MULTILINE):
        content = re.sub(rf'^#\s*{var_name}=.*$', f'{var_name}={model}', content, flags=re.MULTILINE)
    else:
        if content and not content.endswith("\n"):
            content += "\n"
        content += f"{var_name}={model}\n"

    env_file.write_text(content)
    console.print(f"[green]✓[/] {provider} model set to: [bold]{model}[/]")
    console.print(f"[dim]Updated: {env_file}[/]")


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


def _get_litellm_config_path() -> Path:
    return PROJECT_ROOT / "litellm_config.yaml"


def _load_litellm_yaml() -> dict:
    if not YAML_AVAILABLE:
        raise RuntimeError("pyyaml is required for this command")

    path = _get_litellm_config_path()
    if not path.exists():
        raise FileNotFoundError(f"litellm_config.yaml not found at {path}")

    with path.open("r") as f:
        data = yaml.safe_load(f) or {}
    if "model_list" not in data or data.get("model_list") is None:
        data["model_list"] = []
    if "router_settings" not in data or data.get("router_settings") is None:
        data["router_settings"] = {}
    return data


def _save_litellm_yaml(data: dict) -> None:
    if not YAML_AVAILABLE:
        raise RuntimeError("pyyaml is required for this command")

    path = _get_litellm_config_path()
    with path.open("w") as f:
        yaml.safe_dump(data, f, sort_keys=False)


def _infer_provider_from_litellm_model(litellm_model: str) -> str:
    if not litellm_model:
        return ""
    # Examples: ollama/qwen2.5-coder:14b, groq/llama-3.1-70b-versatile, openrouter/...
    if "/" not in litellm_model:
        return "openai"  # plain OpenAI model strings in config
    return litellm_model.split("/", 1)[0]


@llm.group("priority")
def llm_priority():
    """Manage LLM routing priorities in litellm_config.yaml."""
    pass


@llm_priority.command("set-provider")
@click.argument("provider", type=click.Choice([
    "ollama", "groq", "openrouter", "together_ai", "openai", "anthropic"
]))
@click.argument("priority", type=int)
@click.option("--preserve-order", is_flag=True, help="Keep relative order by spacing priorities")
@click.option("--step", type=int, default=5, show_default=True, help="Priority step when preserve-order is used")
def llm_priority_set_provider(provider: str, priority: int, preserve_order: bool, step: int):
    """Set priority for all models belonging to a provider in litellm_config.yaml.

    Provider is inferred from litellm_params.model prefix, e.g. ollama/<...>, groq/<...>.
    Lower priority value = tried earlier.
    """
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])

        matched = []
        for entry in model_list:
            litellm_model = (entry.get("litellm_params", {}) or {}).get("model", "")
            entry_provider = _infer_provider_from_litellm_model(litellm_model)
            if entry_provider == provider:
                matched.append(entry)

        if not matched:
            console.print(f"[yellow]Warning:[/] No models found for provider: {provider}")
            return

        if preserve_order:
            # Keep existing order but re-space
            # Sort by current priority then apply new spacing
            matched_sorted = sorted(matched, key=lambda e: int(e.get("priority", 100)))
            for idx, entry in enumerate(matched_sorted):
                entry["priority"] = int(priority) + idx * int(step)
        else:
            for entry in matched:
                entry["priority"] = int(priority)

        _save_litellm_yaml(data)
        console.print(
            f"[green]✓[/] Set provider priority: [bold]{provider}[/] -> {priority} "
            f"({len(matched)} model(s))"
        )
        console.print(f"[dim]Updated: {_get_litellm_config_path()}[/]")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm_priority.command("set-model")
@click.argument("model_name")
@click.argument("priority", type=int)
def llm_priority_set_model(model_name: str, priority: int):
    """Set priority for a specific model_name in litellm_config.yaml."""
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])

        for entry in model_list:
            if entry.get("model_name") == model_name:
                entry["priority"] = int(priority)
                _save_litellm_yaml(data)
                console.print(f"[green]✓[/] Set model priority: [bold]{model_name}[/] -> {priority}")
                console.print(f"[dim]Updated: {_get_litellm_config_path()}[/]")
                return

        console.print(f"[yellow]Warning:[/] model_name not found: {model_name}")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm.group("model")
def llm_model():
    """Manage model_list entries in litellm_config.yaml."""
    pass


@llm_model.command("list")
@click.option("--provider", "-p", type=click.Choice([
    "ollama", "groq", "openrouter", "together_ai", "openai", "anthropic"
]), help="Filter by provider")
def llm_model_list(provider: str):
    """List model_list entries (model_name -> litellm model, provider, priority, rate_limit)."""
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])
        if not model_list:
            console.print("[yellow]Warning:[/] model_list is empty")
            return

        console.print("[bold]Models (litellm_config.yaml):[/]")
        for entry in sorted(model_list, key=lambda e: int(e.get("priority", 100))):
            model_name = entry.get("model_name", "")
            litellm_model = (entry.get("litellm_params", {}) or {}).get("model", "")
            entry_provider = _infer_provider_from_litellm_model(litellm_model)
            if provider and entry_provider != provider:
                continue
            priority = int(entry.get("priority", 100))
            rate_limit = int(entry.get("rate_limit", 60))
            console.print(f"  [{priority:3d}] {model_name} -> {litellm_model}  [dim]({entry_provider}, rl={rate_limit}/min)[/]")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm_model.command("add")
@click.option("--model-name", required=True, help="Unique model_name key (e.g. code-analyzer)")
@click.option("--litellm-model", required=True, help="LiteLLM model string (e.g. ollama/qwen2.5-coder:14b)")
@click.option("--api-base", help="Optional api_base (e.g. http://localhost:11434)")
@click.option("--api-key", help="Optional api_key (usually from env)")
@click.option("--priority", type=int, default=50, show_default=True)
@click.option("--rate-limit", type=int, default=60, show_default=True)
def llm_model_add(model_name: str, litellm_model: str, api_base: str, api_key: str, priority: int, rate_limit: int):
    """Add a new model entry to litellm_config.yaml."""
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])

        if any(e.get("model_name") == model_name for e in model_list):
            console.print(f"[red]Error:[/] model_name already exists: {model_name}")
            return

        litellm_params = {"model": litellm_model}
        if api_base:
            litellm_params["api_base"] = api_base
        if api_key:
            litellm_params["api_key"] = api_key

        entry = {
            "model_name": model_name,
            "litellm_params": litellm_params,
            "priority": int(priority),
            "rate_limit": int(rate_limit),
        }
        model_list.append(entry)
        data["model_list"] = model_list

        _save_litellm_yaml(data)
        console.print(f"[green]✓[/] Added model: [bold]{model_name}[/] -> {litellm_model}")
        console.print(f"[dim]Updated: {_get_litellm_config_path()}[/]")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm_model.command("remove")
@click.argument("model_name")
def llm_model_remove(model_name: str):
    """Remove a model entry from litellm_config.yaml (and from fallbacks if present)."""
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])

        new_list = [e for e in model_list if e.get("model_name") != model_name]
        if len(new_list) == len(model_list):
            console.print(f"[yellow]Warning:[/] model_name not found: {model_name}")
            return

        data["model_list"] = new_list

        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks")
        if isinstance(fallbacks, builtins.list):
            router_settings["fallbacks"] = [f for f in fallbacks if f != model_name]
            data["router_settings"] = router_settings

        _save_litellm_yaml(data)
        console.print(f"[green]✓[/] Removed model: [bold]{model_name}[/]")
        console.print(f"[dim]Updated: {_get_litellm_config_path()}[/]")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm_model.command("remove-provider")
@click.argument("provider", type=click.Choice([
    "ollama", "groq", "openrouter", "together_ai", "openai", "anthropic"
]))
def llm_model_remove_provider(provider: str):
    """Remove all model_list entries belonging to a provider (and remove from fallbacks)."""
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])

        to_remove_names = []
        kept = []
        for entry in model_list:
            litellm_model = (entry.get("litellm_params", {}) or {}).get("model", "")
            entry_provider = _infer_provider_from_litellm_model(litellm_model)
            if entry_provider == provider:
                to_remove_names.append(entry.get("model_name"))
            else:
                kept.append(entry)

        to_remove_names = [n for n in to_remove_names if n]
        if not to_remove_names:
            console.print(f"[yellow]Warning:[/] No models found for provider: {provider}")
            return

        data["model_list"] = kept

        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks")
        if isinstance(fallbacks, builtins.list):
            router_settings["fallbacks"] = [f for f in fallbacks if f not in to_remove_names]
            data["router_settings"] = router_settings

        _save_litellm_yaml(data)
        console.print(f"[green]✓[/] Removed provider models: [bold]{provider}[/] ({len(to_remove_names)} entries)")
        console.print(f"[dim]Updated: {_get_litellm_config_path()}[/]")
        console.print("[dim]Removed model_name values:[/]")
        for n in to_remove_names:
            console.print(f"  - {n}")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm.group("fallbacks")
def llm_fallbacks():
    """Manage router_settings.fallbacks in litellm_config.yaml."""
    pass


@llm_fallbacks.command("list")
def llm_fallbacks_list():
    """List current fallback model_names."""
    try:
        data = _load_litellm_yaml()
        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks") or []
        console.print("[bold]Fallbacks:[/]")
        for f in fallbacks:
            console.print(f"  - {f}")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm_fallbacks.command("add")
@click.argument("model_name")
def llm_fallbacks_add(model_name: str):
    """Append model_name to router_settings.fallbacks."""
    try:
        data = _load_litellm_yaml()
        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks")
        if not isinstance(fallbacks, builtins.list):
            fallbacks = []

        if model_name in fallbacks:
            console.print(f"[yellow]Warning:[/] Already in fallbacks: {model_name}")
            return

        fallbacks.append(model_name)
        router_settings["fallbacks"] = fallbacks
        data["router_settings"] = router_settings
        _save_litellm_yaml(data)
        console.print(f"[green]✓[/] Added fallback: [bold]{model_name}[/]")
        console.print(f"[dim]Updated: {_get_litellm_config_path()}[/]")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


@llm_fallbacks.command("remove")
@click.argument("model_name")
def llm_fallbacks_remove(model_name: str):
    """Remove model_name from router_settings.fallbacks."""
    try:
        data = _load_litellm_yaml()
        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks")
        if not isinstance(fallbacks, builtins.list) or not fallbacks:
            console.print("[yellow]Warning:[/] No fallbacks configured")
            return

        if model_name not in fallbacks:
            console.print(f"[yellow]Warning:[/] Not in fallbacks: {model_name}")
            return

        router_settings["fallbacks"] = [f for f in fallbacks if f != model_name]
        data["router_settings"] = router_settings
        _save_litellm_yaml(data)
        console.print(f"[green]✓[/] Removed fallback: [bold]{model_name}[/]")
        console.print(f"[dim]Updated: {_get_litellm_config_path()}[/]")
    except Exception as e:
        console.print(f"[red]Error:[/] {e}")


if __name__ == "__main__":
    main()
