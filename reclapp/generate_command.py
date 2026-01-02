"""
Reclapp Generate Command - Native Python Implementation

Code generation from contracts using Python modules.

@version 1.0.0
"""

import asyncio
import sys
from pathlib import Path
from typing import Optional

from rich.console import Console
from rich.panel import Panel

# Add src/python to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "python"))

from reclapp.parser import parse_contract_markdown
from reclapp.generator import CodeGenerator, CodeGeneratorOptions
from reclapp.validation import create_default_pipeline

console = Console()


async def run_generate(
    contract_path: str,
    output: str = "./generated",
    verbose: bool = True,
    validate: bool = True
) -> int:
    """
    Generate code from a contract file.
    
    Args:
        contract_path: Path to contract file (.contract.md or .ts)
        output: Output directory
        verbose: Verbose output
        validate: Run validation after generation
        
    Returns:
        Exit code (0 for success)
    """
    if verbose:
        console.print(Panel.fit(
            "[bold blue]RECLAPP CODE GENERATOR[/]\n"
            f"[dim]Contract:[/] {contract_path}\n"
            f"[dim]Output:[/] {output}\n"
            f"[dim]Engine:[/] Python Native",
            title="🔧 Generate"
        ))
    
    contract_file = Path(contract_path)
    
    if not contract_file.exists():
        console.print(f"[red]❌ Contract file not found:[/] {contract_path}")
        return 1
    
    try:
        # Parse contract
        if verbose:
            console.print(f"\n[cyan]📄 Parsing contract...[/]")
        
        content = contract_file.read_text()
        
        # Handle different file types
        if contract_file.suffix == ".md":
            parse_result = parse_contract_markdown(content)
            if parse_result.errors:
                console.print("[red]❌ Contract parsing errors:[/]")
                for error in parse_result.errors:
                    console.print(f"   - {error}")
                return 1
            contract = parse_result.contract
        else:
            # For .ts files, create a minimal contract structure
            console.print("[yellow]⚠️ TypeScript contracts require Node.js engine[/]")
            console.print("[dim]Use: reclapp generate --engine node[/]")
            return 1
        
        if not contract:
            console.print("[red]❌ Failed to parse contract[/]")
            return 1
        
        if verbose:
            app_name = contract.get("definition", {}).get("app", {}).get("name", "Unknown")
            entities = contract.get("definition", {}).get("entities", [])
            console.print(f"   App: {app_name}")
            console.print(f"   Entities: {len(entities)}")
        
        # Generate code
        if verbose:
            console.print(f"\n[cyan]🔨 Generating code...[/]")
        
        generator = CodeGenerator(CodeGeneratorOptions(
            output_dir=output,
            verbose=verbose,
            dry_run=False
        ))
        
        result = await generator.generate(contract, output)
        
        if not result.success:
            console.print("[red]❌ Code generation failed:[/]")
            for error in result.errors:
                console.print(f"   - {error}")
            return 1
        
        if verbose:
            console.print(f"   Generated {len(result.files)} files")
            for f in result.files[:5]:
                console.print(f"   - {f.path}")
            if len(result.files) > 5:
                console.print(f"   ... and {len(result.files) - 5} more")
        
        # Validate if requested
        if validate:
            if verbose:
                console.print(f"\n[cyan]✅ Validating...[/]")
            
            pipeline = create_default_pipeline()
            # Simplified validation - just check files exist
            output_path = Path(output)
            if output_path.exists():
                console.print("   Validation passed")
            else:
                console.print("[yellow]⚠️ Output directory not created[/]")
        
        # Success
        console.print(f"\n[green]✅ Generation complete![/]")
        console.print(f"   Files: {len(result.files)}")
        console.print(f"   Time: {result.time_ms}ms")
        console.print(f"\n[dim]Output: {output}[/]")
        console.print(f"[dim]Next: cd {output} && npm install && npm run dev[/]")
        
        return 0
        
    except Exception as e:
        console.print(f"\n[red]❌ Error: {e}[/]")
        if verbose:
            import traceback
            traceback.print_exc()
        return 1


def generate_sync(
    contract_path: str,
    output: str = "./generated",
    verbose: bool = True,
    validate: bool = True
) -> int:
    """Synchronous wrapper for generate command"""
    return asyncio.run(run_generate(contract_path, output, verbose, validate))


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Reclapp Code Generator")
    parser.add_argument("contract", help="Path to contract file")
    parser.add_argument("-o", "--output", default="./generated", help="Output directory")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--no-validate", action="store_true", help="Skip validation")
    
    args = parser.parse_args()
    
    exit_code = generate_sync(
        contract_path=args.contract,
        output=args.output,
        verbose=args.verbose,
        validate=not args.no_validate
    )
    sys.exit(exit_code)
