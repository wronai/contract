"""
Reclapp CLI - Python wrapper for full lifecycle management

Usage:
    reclapp --prompt "Create a notes app"
    reclapp --prompt "Create a CRM" --output ./my-app --port 4000
    reclapp generate examples/contract-ai/crm-contract.ts
"""

import os
import re
import sys
import subprocess
import shutil
from pathlib import Path
from typing import Optional
import builtins

try:
    import clickmd as click
except ModuleNotFoundError:
    _project_root = Path(__file__).parent.parent.resolve()
    if str(_project_root) not in sys.path:
        sys.path.insert(0, str(_project_root))
    import clickmd as click

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


_RICH_TAG_RE = re.compile(r"\[(?:/)?[^\]]+\]")


def _strip_rich_markup(text: str) -> str:
    return _RICH_TAG_RE.sub("", text)


class _Console:
    def print(self, message: object = "") -> None:
        if message is None:
            click.echo("")
            return
        click.echo(_strip_rich_markup(str(message)))


class Panel:
    @staticmethod
    def fit(message: object, title: Optional[str] = None):
        if title:
            return f"{title}\n{message}"
        return str(message)


console = _Console()

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
@click.option("--log-file", default=None, help="Path to save markdown log")
@click.option("--version", is_flag=True, help="Show version")
@click.pass_context
def main(ctx, prompt: Optional[str], output: str, port: int, verbose: bool, keep_running: bool, log_file: Optional[str], version: bool):
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
        try:
            from reclapp import __version__
        except ImportError:
            __version__ = "2.4.1" # Fallback
        click.md(f"```log\n📦 Reclapp v{__version__}\n```\n")
        return
    
    if ctx.invoked_subcommand is None:
        if prompt:
            # Run full lifecycle with prompt
            ctx.invoke(lifecycle, prompt=prompt, output=output, port=port, verbose=verbose, keep_running=keep_running, log_file=log_file)
        else:
            click.echo(ctx.get_help())


@main.command()
@click.option("--prompt", "-p", required=True, help="Natural language prompt")
@click.option("--output", "-o", default="./generated", help="Output directory")
@click.option("--port", default=3000, type=int, help="Service port")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--keep-running", is_flag=True, help="Keep service running after tests")
@click.option("--log-file", default=None, help="Path to save markdown log")
def lifecycle(prompt: str, output: str, port: int, verbose: bool, keep_running: bool, log_file: Optional[str]):
    """Run full lifecycle: prompt → contract → code → service → tests"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(
        prompt=prompt, 
        output=output, 
        port=port, 
        verbose=verbose, 
        keep_running=keep_running, 
        log_file=log_file,
        max_iterations=5,
        auto_fix=True
    )
    sys.exit(asyncio.run(core_main.cmd_evolve(args)))


@main.command()
@click.argument("contract_path")
@click.option("--output", "-o", default="./generated", help="Output directory")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--engine", type=click.Choice(["python", "node"]), default="python", help="Execution engine")
def generate(contract_path: str, output: str, verbose: bool, engine: str):
    """Generate code from a contract file"""
    
    if engine == "python":
        core_main = _get_core_main()
        import asyncio
        
        class Args:
            def __init__(self, **kwargs):
                self.__dict__.update(kwargs)
                
        args = Args(contract=contract_path, output=output, verbose=verbose)
        sys.exit(asyncio.run(core_main.cmd_generate(args)))
    
    if engine == "node":
        click.md(f"```log\n📄 Generating from: {contract_path}\n```\n")
        
        node = find_node()
        if not node:
            click.md("```log\n❌ Error: Node.js not found\n```\n")
            sys.exit(1)
        
        if NODE_CLI.exists():
            cmd = [node, str(NODE_CLI), "generate-ai", contract_path, "-o", output]
            if verbose:
                cmd.append("-v")
            
            env = setup_node_env()
            result = subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
            sys.exit(result.returncode)
        else:
            click.md("```log\n❌ Error: Node CLI not found\n```\n")
            sys.exit(1)


def _get_core_main():
    """Dynamically load core main module from src/python"""
    import sys
    import importlib.util
    from pathlib import Path
    
    core_path = PROJECT_ROOT / "src" / "python"
    
    # Add core path to the front to prioritize it
    if str(core_path) not in sys.path:
        sys.path.insert(0, str(core_path))
    
    # To fix 'reclapp.cli is not a package' when running this file as a module:
    # If sys.modules['reclapp.cli'] is this file, we need to make it look like a package
    # or load the core main under a different name that IS a package.
    
    main_file = core_path / "reclapp" / "cli" / "main.py"
    if not main_file.exists():
        raise ImportError(f"Core main not found at {main_file}")

    # Load as a unique module name to avoid collision with the wrapper
    module_name = "reclapp_core_main_impl"
    if module_name in sys.modules:
        return sys.modules[module_name]

    spec = importlib.util.spec_from_file_location(module_name, str(main_file))
    module = importlib.util.module_from_spec(spec)
    
    # This is the key: we need to make sure it can find other modules in the same directory
    # by pretending it's part of the real reclapp.cli package
    module.__package__ = "reclapp.cli"
    
    # We also need to ensure 'reclapp.cli' in sys.modules is treated as a package
    # if we are currently in it.
    if "reclapp.cli" in sys.modules:
        m = sys.modules["reclapp.cli"]
        if not hasattr(m, "__path__"):
            # Force it to be a package so 'from .runner import ...' works
            m.__path__ = [str(main_file.parent)]
    
    spec.loader.exec_module(module)
    sys.modules[module_name] = module
    return module

@main.command()
@click.option("-d", "--directory", default=".", help="Directory to search for contracts")
@click.option("--format", type=click.Choice(["yaml", "json", "table"]), default="yaml", help="Output format")
@click.option("-v", "--verbose", is_flag=True, help="Show detailed contract information")
def list(directory: str, format: str, verbose: bool):
    """List available contracts and projects"""
    core_main = _get_core_main()
    import asyncio
    
    # Create a dummy args object for the handler
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
    
    args = Args(directory=directory, format=format, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_list(args)))


@main.command()
@click.argument("action", type=click.Choice(["list", "show", "add"]), default="list")
@click.option("-n", "--name", help="Prompt name for show/add actions")
@click.option("-v", "--verbose", is_flag=True, help="Show detailed prompt information")
def prompts(action: str, name: Optional[str], verbose: bool):
    """Manage and list available prompts"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(action=action, name=name, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_prompts(args)))


@main.command()
@click.option("-d", "--directory", default=".", help="Directory to analyze")
@click.option("-o", "--output", help="Output file for generated contract")
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def analyze(directory: str, output: Optional[str], verbose: bool):
    """Analyze existing codebase and extract contract"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(directory=directory, output=output, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_analyze(args)))


@main.command()
@click.option("-c", "--contract", required=True, help="Path to contract file")
@click.option("-d", "--directory", default=".", help="Directory containing code to refactor")
@click.option("--dry-run", is_flag=True, help="Show changes without applying them")
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def refactor(contract: str, directory: str, dry_run: bool, verbose: bool):
    """Refactor code based on contract changes"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(contract=contract, directory=directory, dry_run=dry_run, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_refactor(args)))


@main.command()
@click.argument("contract")
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def parse(contract: str, verbose: bool):
    """Parse contract and print JSON"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(contract=contract, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_parse(args)))


@main.command()
@click.argument("contract")
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def validate(contract: str, verbose: bool):
    """Validate contract (markdown or JSON)"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(contract=contract, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_validate(args)))


@main.command()
@click.option("--level", type=click.Choice(["simple", "medium", "complex", "all"]), default="simple")
@click.option("-v", "--verbose", is_flag=True, help="Show detailed prompt information")
def prompts_old(level: str, verbose: bool):
    """Show example prompts (legacy)"""
    click.md(f"## 💬 Example Prompts ({level})\n")
    
    try:
        from examples.pydantic_contracts.prompts import get_test_prompts
        prompts_list = get_test_prompts(level)
    except ImportError:
        # Fallback prompts
        prompts_list = [
            "Create a notes app",
            "Create a todo list with tasks",
            "Create a CRM system with contacts and deals",
        ]
    
    yaml_lines = [f'  - "{p}"' for p in prompts_list[:10]]
    click.md("```yaml\n# @type: example_prompts\nprompts:\n" + "\n".join(yaml_lines) + "\n```\n")
    
    if prompts_list:
        click.md(f'```log\n→ Usage: reclapp --prompt "{prompts_list[0]}"\n```\n')


@main.command()
@click.argument("file")
@click.option("--workers", "-w", type=int, default=3, help="Number of parallel workers")
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def tasks(file: str, workers: int, verbose: bool):
    """Run tasks from file (parallel execution)"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(file=file, workers=workers, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_tasks(args)))


@main.command()
@click.option("--output", "-o", default=".", help="Output directory for setup files")
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def setup(output: str, verbose: bool):
    """Check environment and setup API keys"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(output=output, verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_setup(args)))


@main.command()
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def stop(verbose: bool):
    """Stop all running containers"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_stop(args)))


@main.command()
@click.option("--prompt", "-p", required=True, help="Natural language prompt describing the app")
@click.option("--output", "-o", default="./target", help="Output directory")
@click.option("--port", default=3000, type=int, help="Service port")
@click.option("--keep-running", "-k", is_flag=True, help="Keep service running after generation")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
@click.option("--no-menu", is_flag=True, help="Do not enter interactive menu after evolve finishes (Node engine)")
@click.option("--log-file", type=str, default=None, help="Write markdown logs to file (Node engine)")
@click.option("--engine", type=click.Choice(["python", "node"]), default="python", help="Execution engine")
def evolve(prompt: str, output: str, port: int, keep_running: bool, verbose: bool, no_menu: bool, log_file: Optional[str], engine: str):
    """Evolution mode - dynamic code generation with auto-healing"""
    
    if engine == "python":
        core_main = _get_core_main()
        import asyncio
        
        class Args:
            def __init__(self, **kwargs):
                self.__dict__.update(kwargs)
                
        args = Args(
            prompt=prompt, 
            output=output, 
            keep_running=keep_running, 
            verbose=verbose,
            port=port,
            max_iterations=5,
            auto_fix=True,
            log_file=log_file
        )
        sys.exit(asyncio.run(core_main.cmd_evolve(args)))
    
    if engine == "node":
        # Use Node.js implementation
        node = find_node()
        if not node:
            click.md("```log\n❌ Error: Node.js not found. Run: reclapp setup\n```\n")
            sys.exit(1)
        
        if NODE_CLI.exists():
            cmd = [node, str(NODE_CLI), "evolve", "--prompt", prompt, "-o", output]
            if keep_running:
                cmd.append("-k")
            if verbose:
                cmd.append("-v")
            if no_menu:
                cmd.append("--no-menu")
            if log_file:
                cmd.extend(["--log-file", log_file])
            
            env = setup_node_env()
            result = subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
            sys.exit(result.returncode)
        else:
            click.md("```log\n❌ Error: Node CLI not found\n```\n")
            sys.exit(1)


@main.command()
@click.argument("target_dir", default=".")
@click.option("--output", "-o", help="Output .rcl.md file path")
@click.option("--verbose", "-v", is_flag=True, help="Verbose output")
def reverse(target_dir: str, output: Optional[str], verbose: bool):
    """Reverse-engineer a contract from an existing application"""
    click.md(f"```log\n🔄 Reverse engineering from: {target_dir}\n```\n")
    
    node = find_node()
    if not node:
        click.md("```log\n❌ Error: Node.js not found\n```\n")
        sys.exit(1)
    
    if NODE_CLI.exists():
        cmd = [node, str(NODE_CLI), "reverse", target_dir]
        if output:
            cmd.extend(["-o", output])
        if verbose:
            cmd.append("-v")
        
        env = setup_node_env()
        result = subprocess.run(cmd, env=env, cwd=str(PROJECT_ROOT))
        sys.exit(result.returncode)
    else:
        click.md("```log\n❌ Error: Node CLI not found\n```\n")
        sys.exit(1)


# ============================================================================
# LLM MANAGEMENT COMMANDS
# ============================================================================

@main.command()
@click.option("-v", "--verbose", is_flag=True, help="Enable verbose output")
def status(verbose: bool):
    """Check LLM provider status (alias for llm status)"""
    core_main = _get_core_main()
    import asyncio
    
    class Args:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)
            
    args = Args(verbose=verbose)
    sys.exit(asyncio.run(core_main.cmd_status(args)))


@main.group()
def llm():
    """LLM provider management commands."""
    pass


@llm.command("status")
def llm_status():
    """Show LLM providers status and configuration."""
    # Use unified reclapp.llm which provides multi-provider support
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "src" / "python"))
    
    try:
        from reclapp.llm import LLMConfig, list_available_providers
        
        config = LLMConfig()

        default_provider = config.get_default_provider()

        click.md("## 🤖 LLM Configuration\n\n## LLM Provider Status\n")
        available = list_available_providers()
        configured = config.list_configured_providers()

        def _infer_provider_from_model_string(model_string: str) -> str:
            if not model_string:
                return ""
            if "/" not in model_string:
                return "openai"
            return model_string.split("/", 1)[0]

        # Priority shown here reflects effective routing preference:
        # - if litellm_config.yaml contains per-model priorities, we use the minimum priority per provider
        # - otherwise we fall back to provider config priority
        priorities = {}
        for provider_name in configured.keys():
            provider_cfg = config.get_provider_config(provider_name)
            if provider_cfg is not None:
                priorities[provider_name] = int(getattr(provider_cfg, "priority", 100))
            else:
                priorities[provider_name] = 100

        try:
            for m in config.get_litellm_models():
                provider_name = _infer_provider_from_model_string(getattr(m, "litellm_model", ""))
                if not provider_name:
                    continue
                model_priority = int(getattr(m, "priority", 100))
                current = priorities.get(provider_name, 100)
                priorities[provider_name] = min(current, model_priority)
        except Exception:
            pass

        python_engine_provider = None
        try:
            import asyncio

            from reclapp.llm import LLMManager

            async def _probe_python_engine_llm():
                mgr = LLMManager(verbose=False)
                await mgr.initialize()
                p = mgr.get_provider()
                await mgr.close()
                return p

            python_engine_provider = asyncio.run(_probe_python_engine_llm())
        except Exception:
            python_engine_provider = None

        lines = []
        lines.append(f"Default Provider: {default_provider}")
        if python_engine_provider is None:
            lines.append("Python Engine Default: (none)")
        else:
            lines.append(
                f"Python Engine Default: {python_engine_provider.name}  Model: {python_engine_provider.model}"
            )
        lines.append("")
        lines.append("Providers:")
        
        for provider in sorted(priorities.keys(), key=lambda p: priorities[p]):
            is_available = available.get(provider, False)
            is_configured = configured.get(provider, False)

            if not is_configured:
                status = "✗ Not configured"
            elif is_available:
                status = "✓ Available"
            else:
                status = "⚠ Configured but unreachable"

            model = config.get_model(provider)
            priority = priorities.get(provider, 100)
            lines.append(f"  [{priority:2d}] {provider:12s} {status:26s} Model: {model}")

        lines.append("")
        lines.append("Priority: lower number = tried first")

        click.md("```log\n" + "\n".join(lines) + "\n```\n")
        
    except ImportError as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\nTry: pip install httpx pyyaml\n```\n")


@llm.command("models")
@click.option("--provider", "-p", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "ollama"
]), help="Filter by provider")
def llm_models(provider: str):
    """List recommended models for each provider."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "src" / "python"))
    
    try:
        from reclapp.llm import RECOMMENDED_MODELS, OllamaClient

        click.md("## 📦 LLM Models\n")

        lines = []
        providers_to_show = [provider] if provider else RECOMMENDED_MODELS.keys()

        for prov in providers_to_show:
            if prov not in RECOMMENDED_MODELS:
                continue
            lines.append(prov.upper())
            for model, desc in RECOMMENDED_MODELS[prov]:
                lines.append(f"- {model} :: {desc}")
            lines.append("")

        if provider == "ollama" or provider is None:
            client = OllamaClient()
            if client.is_available():
                models = client.list_models()
                if models:
                    lines.append(f"LOCAL OLLAMA MODELS ({len(models)}):")
                    for m in models[:15]:
                        lines.append(f"- {m}")
                    if len(models) > 15:
                        lines.append(f"... and {len(models) - 15} more")
                    lines.append("")

        click.md("```log\n" + "\n".join(lines).rstrip() + "\n```\n")
                        
    except ImportError as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


@llm.command("set-provider")
@click.argument("provider", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "ollama", "litellm", "auto"
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
    click.md(f"```log\n✅ Default provider set to: {provider}\nUpdated: {env_file}\n```\n")


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
    click.md(f"```log\n✅ {provider} model set to: {model}\nUpdated: {env_file}\n```\n")


@llm.group("key")
def llm_key():
    """Manage API keys for providers (stored in .env, not in YAML)."""
    pass


@llm_key.command("set")
@click.argument("provider", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "litellm"
]))
@click.argument("api_key")
def llm_key_set(provider: str, api_key: str):
    """Set provider API key in .env."""
    env_file = PROJECT_ROOT / ".env"
    env_var_map = {
        "openrouter": "OPENROUTER_API_KEY",
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "groq": "GROQ_API_KEY",
        "together": "TOGETHER_API_KEY",
        "litellm": "LITELLM_API_KEY",
    }
    var_name = env_var_map[provider]

    content = env_file.read_text() if env_file.exists() else ""

    import re
    if re.search(rf'^{var_name}=', content, re.MULTILINE):
        content = re.sub(rf'^{var_name}=.*$', f'{var_name}={api_key}', content, flags=re.MULTILINE)
    elif re.search(rf'^#\s*{var_name}=', content, re.MULTILINE):
        content = re.sub(rf'^#\s*{var_name}=.*$', f'{var_name}={api_key}', content, flags=re.MULTILINE)
    else:
        if content and not content.endswith("\n"):
            content += "\n"
        content += f"{var_name}={api_key}\n"

    env_file.write_text(content)
    click.md(f"```log\n✅ API key set for: {provider}\nUpdated: {env_file}\n```\n")


@llm_key.command("unset")
@click.argument("provider", type=click.Choice([
    "openrouter", "openai", "anthropic", "groq", "together", "litellm"
]))
def llm_key_unset(provider: str):
    """Remove provider API key from .env (line is deleted)."""
    env_file = PROJECT_ROOT / ".env"
    if not env_file.exists():
        click.md("```log\n⚠️ .env file not found\n```\n")
        return

    env_var_map = {
        "openrouter": "OPENROUTER_API_KEY",
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "groq": "GROQ_API_KEY",
        "together": "TOGETHER_API_KEY",
        "litellm": "LITELLM_API_KEY",
    }
    var_name = env_var_map[provider]

    lines = env_file.read_text().splitlines(True)
    new_lines = [ln for ln in lines if not ln.startswith(f"{var_name}=")]
    env_file.write_text("".join(new_lines))
    click.md(f"```log\n✅ API key removed for: {provider}\nUpdated: {env_file}\n```\n")


@llm.command("test")
@click.option("--provider", "-p", help="Provider to test (default: auto-detect)")
@click.option("--model", "-m", help="Model to test")
def llm_test(provider: str, model: str):
    """Test LLM generation with a simple prompt."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "src" / "python"))
    
    try:
        from reclapp.llm import LLMConfig, get_client

        LLMConfig()

        click.md("## 🧪 LLM Test\n")
        click.md("```log\nTesting LLM generation...\n```\n")
        
        kwargs = {}
        if model:
            kwargs['model'] = model
        
        client = get_client(provider, **kwargs) if provider else get_client(**kwargs)

        click.md(
            "```log\n"
            + f"Provider: {client.provider_name}\n"
            + f"Model: {getattr(client, 'model', 'unknown')}\n"
            + "```\n"
        )
        
        if not client.is_available():
            click.md("```log\n❌ Provider not available\n```\n")
            return
        
        import time
        start = time.time()
        response = client.generate("Say 'Hello from Reclapp!' and nothing else.", max_tokens=20)
        elapsed = time.time() - start

        click.md(
            "```log\n"
            + f"✅ Response: {response.strip()}\n"
            + f"Time: {elapsed:.2f}s\n"
            + "```\n"
        )
        
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


@llm.group("config", invoke_without_command=True)
@click.pass_context
def llm_config(ctx: click.Context):
    """Show and manage LLM configuration."""
    if ctx.invoked_subcommand is not None:
        return

    import sys
    import json
    sys.path.insert(0, str(PROJECT_ROOT / "src" / "python"))

    try:
        from reclapp.llm import LLMConfig

        config = LLMConfig()
        data = config.to_dict()

        click.md("```json\n" + json.dumps(data, indent=2) + "\n```\n")

    except ImportError as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


@llm_config.command("list")
@click.option("--provider", "-p", type=click.Choice([
    "ollama", "groq", "openrouter", "together_ai", "openai", "anthropic"
]), help="Filter by provider")
def llm_config_list(provider: str):
    """List model routing entries from litellm_config.yaml."""
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])
        if not model_list:
            click.md("```log\n⚠️ model_list is empty\n```\n")
            return

        lines = ["Models (litellm_config.yaml):"]
        for entry in sorted(model_list, key=lambda e: int(e.get("priority", 100))):
            model_name = entry.get("model_name", "")
            litellm_model = (entry.get("litellm_params", {}) or {}).get("model", "")
            entry_provider = _infer_provider_from_litellm_model(litellm_model)
            if provider and entry_provider != provider:
                continue
            priority = int(entry.get("priority", 100))
            rate_limit = int(entry.get("rate_limit", 60))

            lines.append(
                f"  [{priority:3d}] {model_name} -> {litellm_model} ({entry_provider}, rl={rate_limit}/min)"
            )

        click.md("```log\n" + "\n".join(lines) + "\n```\n")
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


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
            click.md(f"```log\n⚠️ No models found for provider: {provider}\n```\n")
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
        click.md(
            "```log\n"
            + f"✅ Set provider priority: {provider} -> {priority} ({len(matched)} model(s))\n"
            + f"Updated: {_get_litellm_config_path()}\n"
            + "```\n"
        )
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


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
                click.md(
                    "```log\n"
                    + f"✅ Set model priority: {model_name} -> {priority}\n"
                    + f"Updated: {_get_litellm_config_path()}\n"
                    + "```\n"
                )
                return

        click.md(f"```log\n⚠️ model_name not found: {model_name}\n```\n")
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


@llm.group("model")
def llm_model():
    """Manage model_list entries in litellm_config.yaml."""
    pass


@llm_model.command("list")
@click.option("--provider", "-p", type=click.Choice([
    "ollama", "groq", "openrouter", "together_ai", "openai", "anthropic"
]), help="Filter by provider")
def llm_model_list(provider: str):
    """Alias for `reclapp llm config list` (kept for backward compatibility)."""
    return llm_config_list(provider)


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
            click.md(f"```log\n❌ model_name already exists: {model_name}\n```\n")
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
        click.md(
            "```log\n"
            + f"✅ Added model: {model_name} -> {litellm_model}\n"
            + f"Updated: {_get_litellm_config_path()}\n"
            + "```\n"
        )
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


@llm_model.command("remove")
@click.argument("model_name")
def llm_model_remove(model_name: str):
    """Remove a model entry from litellm_config.yaml (and from fallbacks if present)."""
    try:
        data = _load_litellm_yaml()
        model_list = data.get("model_list", [])

        new_list = [e for e in model_list if e.get("model_name") != model_name]
        if len(new_list) == len(model_list):
            click.md(f"```log\n⚠️ model_name not found: {model_name}\n```\n")
            return

        data["model_list"] = new_list

        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks")
        if isinstance(fallbacks, builtins.list):
            router_settings["fallbacks"] = [f for f in fallbacks if f != model_name]
            data["router_settings"] = router_settings

        _save_litellm_yaml(data)
        click.md(
            "```log\n"
            + f"✅ Removed model: {model_name}\n"
            + f"Updated: {_get_litellm_config_path()}\n"
            + "```\n"
        )
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


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
            click.md(f"```log\n⚠️ No models found for provider: {provider}\n```\n")
            return

        data["model_list"] = kept

        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks")
        if isinstance(fallbacks, builtins.list):
            router_settings["fallbacks"] = [f for f in fallbacks if f not in to_remove_names]
            data["router_settings"] = router_settings

        _save_litellm_yaml(data)
        click.md(
            "```log\n"
            + f"✅ Removed provider models: {provider} ({len(to_remove_names)} entries)\n"
            + f"Updated: {_get_litellm_config_path()}\n"
            + "Removed model_name values:\n"
            + "\n".join(f"- {n}" for n in to_remove_names)
            + "\n```\n"
        )
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


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
        click.md("## Fallbacks\n")
        if not fallbacks:
            click.md("```log\n(no fallbacks configured)\n```\n")
            return
        for f in fallbacks:
            click.echo(f"- {f}")
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


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
            click.md(f"```log\n⚠️ Already in fallbacks: {model_name}\n```\n")
            return

        fallbacks.append(model_name)
        router_settings["fallbacks"] = fallbacks
        data["router_settings"] = router_settings
        _save_litellm_yaml(data)
        click.md(
            "```log\n"
            + f"✅ Added fallback: {model_name}\n"
            + f"Updated: {_get_litellm_config_path()}\n"
            + "```\n"
        )
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


@llm_fallbacks.command("remove")
@click.argument("model_name")
def llm_fallbacks_remove(model_name: str):
    """Remove model_name from router_settings.fallbacks."""
    try:
        data = _load_litellm_yaml()
        router_settings = data.get("router_settings", {}) or {}
        fallbacks = router_settings.get("fallbacks")
        if not isinstance(fallbacks, builtins.list) or not fallbacks:
            click.md("```log\n⚠️ No fallbacks configured\n```\n")
            return

        if model_name not in fallbacks:
            click.md(f"```log\n⚠️ Not in fallbacks: {model_name}\n```\n")
            return

        router_settings["fallbacks"] = [f for f in fallbacks if f != model_name]
        data["router_settings"] = router_settings
        _save_litellm_yaml(data)
        click.md(
            "```log\n"
            + f"✅ Removed fallback: {model_name}\n"
            + f"Updated: {_get_litellm_config_path()}\n"
            + "```\n"
        )
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n{e}\n```\n")


if __name__ == "__main__":
    main()
