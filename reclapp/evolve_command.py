"""
Reclapp Evolve Command - Native Python Implementation

Evolution mode using Python modules instead of Node.js.

@version 1.0.0
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

try:
    import clickmd as click
except ModuleNotFoundError:
    _project_root = Path(__file__).parent.parent.resolve()
    if str(_project_root) not in sys.path:
        sys.path.insert(0, str(_project_root))
    import clickmd as click

# Add src/python to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "python"))

from reclapp.evolution import EvolutionManager, EvolutionOptions
from reclapp.llm import LLMManager


async def run_evolve(
    prompt: str,
    output: str = "./generated",
    port: int = 3000,
    keep_running: bool = False,
    verbose: bool = True,
    use_python: bool = True,
    log_file: Optional[str] = None
) -> int:
    """
    Run evolution mode with Python implementation.
    
    Args:
        prompt: Natural language description
        output: Output directory
        keep_running: Keep service running after generation
        verbose: Verbose output
        use_python: Use Python implementation (vs Node.js fallback)
        log_file: Optional path to save markdown log
        
    Returns:
        Exit code (0 for success)
    """
    click.md(
        f"""## 🧬 Evolution

```log
🚀 RECLAPP EVOLUTION MODE
→ Prompt: {prompt}
→ Output: {output}
→ Port: {port}
→ Engine: Python Native
```
"""
    )
    
    try:
        # Initialize LLM client
        llm_manager = LLMManager(verbose=verbose)
        await llm_manager.initialize()

        provider = None
        if llm_manager.is_ready():
            provider = llm_manager.get_provider()
            if provider:
                click.md(
                    f"""```log
🤖 LLM selected: {provider.name}
→ Model: {provider.model}
```\n"""
                )
        
        if not llm_manager.is_ready():
            click.md("```log\n⚠️ No LLM available. Using template-based generation.\n```\n")
        
        # Create evolution manager
        evolution = EvolutionManager(EvolutionOptions(
            output_dir=output,
            verbose=True,
            keep_running=keep_running,
            port=port,
            max_iterations=5
        ))
        
        # Enable log buffering if log file requested
        if log_file:
            evolution.renderer.enable_log()
        
        # Set LLM client if available
        if provider:
            evolution.set_llm_client(provider)
        
        # Run evolution
        result = await evolution.evolve(prompt, output)
        
        # Save log file if requested
        if log_file:
            evolution.renderer.save_log(log_file)
            click.md(f"```log\n📝 Log saved to: {log_file}\n```\n")
        
        if result.success:
            click.md(
                f"""## ✅ Evolution complete

```yaml
files_generated: {result.files_generated}
time_ms: {result.time_ms}
output: {output}
```
"""
            )
            
            if keep_running:
                click.md("```log\n⚠️ Service would be running... (not implemented yet)\n```\n")
            
            return 0
        else:
            errors = "\n".join(f"❌ {e}" for e in result.errors[:5])
            click.md(
                f"""## ❌ Evolution failed

```log
{errors}
```
"""
            )
            return 1
            
    except Exception as e:
        click.md(f"## ❌ Error\n\n```log\n❌ Error: {e}\n```\n")
        if verbose:
            import traceback
            traceback.print_exc()
        return 1


def evolve_sync(
    prompt: str,
    output: str = "./generated",
    port: int = 3000,
    keep_running: bool = False,
    verbose: bool = True,
    log_file: Optional[str] = None
) -> int:
    """Synchronous wrapper for evolve command"""
    return asyncio.run(run_evolve(prompt, output, port, keep_running, verbose, log_file=log_file))


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Reclapp Evolution Mode")
    parser.add_argument("-p", "--prompt", required=True, help="Natural language prompt")
    parser.add_argument("-o", "--output", default="./generated", help="Output directory")
    parser.add_argument("-k", "--keep-running", action="store_true", help="Keep service running")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--log-file", default=None, help="Path to save markdown log")
    
    args = parser.parse_args()
    
    exit_code = evolve_sync(
        prompt=args.prompt,
        output=args.output,
        keep_running=args.keep_running,
        verbose=args.verbose,
        log_file=args.log_file
    )
    sys.exit(exit_code)
