"""
Reclapp Evolve Command - Native Python Implementation

Evolution mode using Python modules instead of Node.js.

@version 1.0.0
"""

import asyncio
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel

from .evolution import EvolutionManager, EvolutionOptions
from .generator import ContractGenerator, CodeGenerator, ContractGeneratorOptions, CodeGeneratorOptions
from .llm import OllamaClient, OllamaConfig, LLMManager

console = Console()


async def run_evolve(
    prompt: str,
    output: str = "./generated",
    keep_running: bool = False,
    verbose: bool = True,
    use_python: bool = True
) -> int:
    """
    Run evolution mode with Python implementation.
    
    Args:
        prompt: Natural language description
        output: Output directory
        keep_running: Keep service running after generation
        verbose: Verbose output
        use_python: Use Python implementation (vs Node.js fallback)
        
    Returns:
        Exit code (0 for success)
    """
    if verbose:
        console.print(Panel.fit(
            "[bold blue]RECLAPP EVOLUTION MODE[/]\n"
            f"[dim]Prompt:[/] {prompt}\n"
            f"[dim]Output:[/] {output}\n"
            f"[dim]Engine:[/] Python Native",
            title="🧬 Evolution"
        ))
    
    try:
        # Initialize LLM client
        llm_manager = LLMManager(verbose=verbose)
        await llm_manager.initialize()
        
        if not llm_manager.is_ready():
            console.print("[yellow]⚠️ No LLM available. Using template-based generation.[/]")
        
        # Create evolution manager
        evolution = EvolutionManager(EvolutionOptions(
            output_dir=output,
            verbose=verbose,
            keep_running=keep_running,
            max_iterations=5
        ))
        
        # Set LLM client if available
        if llm_manager.is_ready():
            provider = llm_manager.get_provider()
            if provider:
                evolution.set_llm_client(provider)
        
        # Run evolution
        result = await evolution.evolve(prompt, output)
        
        if result.success:
            console.print(f"\n[green]✅ Evolution complete![/]")
            console.print(f"   Files generated: {result.files_generated}")
            console.print(f"   Time: {result.time_ms}ms")
            console.print(f"\n[dim]Output: {output}[/]")
            
            if keep_running:
                console.print("\n[yellow]Service would be running... (not implemented yet)[/]")
            
            return 0
        else:
            console.print(f"\n[red]❌ Evolution failed[/]")
            for error in result.errors[:5]:
                console.print(f"   - {error}")
            return 1
            
    except Exception as e:
        console.print(f"\n[red]❌ Error: {e}[/]")
        if verbose:
            import traceback
            traceback.print_exc()
        return 1


def evolve_sync(
    prompt: str,
    output: str = "./generated",
    keep_running: bool = False,
    verbose: bool = True
) -> int:
    """Synchronous wrapper for evolve command"""
    return asyncio.run(run_evolve(prompt, output, keep_running, verbose))


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Reclapp Evolution Mode")
    parser.add_argument("-p", "--prompt", required=True, help="Natural language prompt")
    parser.add_argument("-o", "--output", default="./generated", help="Output directory")
    parser.add_argument("-k", "--keep-running", action="store_true", help="Keep service running")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    exit_code = evolve_sync(
        prompt=args.prompt,
        output=args.output,
        keep_running=args.keep_running,
        verbose=args.verbose
    )
    sys.exit(exit_code)
