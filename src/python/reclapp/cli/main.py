"""
Reclapp CLI Main Module

Provides command-line interface for evolution and code generation.

Usage:
    reclapp evolve -p "Create a todo app" -o ./output
    reclapp generate -c contract.ai.json -o ./output
    reclapp validate -c contract.ai.json
"""

import argparse
import asyncio
import sys
from pathlib import Path
from typing import Optional

__version__ = "2.4.1"


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser"""
    parser = argparse.ArgumentParser(
        prog="reclapp",
        description="Reclapp - Contract-driven code generation with auto-healing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  reclapp evolve -p "Create a todo app" -o ./output
  reclapp evolve -p "Build a blog with posts and comments" -o ./blog --verbose
  reclapp generate -c contract.ai.json -o ./output
  reclapp validate -c contract.ai.json
        """
    )
    
    parser.add_argument(
        "--version", "-V",
        action="version",
        version=f"%(prog)s {__version__}"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Evolve command
    evolve_parser = subparsers.add_parser(
        "evolve",
        help="Run evolution pipeline from natural language prompt"
    )
    evolve_parser.add_argument(
        "-p", "--prompt",
        required=True,
        help="Natural language prompt describing the application"
    )
    evolve_parser.add_argument(
        "-o", "--output",
        required=True,
        help="Output directory for generated code"
    )
    evolve_parser.add_argument(
        "--port",
        type=int,
        default=3000,
        help="Port for the generated service (default: 3000)"
    )
    evolve_parser.add_argument(
        "--max-iterations",
        type=int,
        default=5,
        help="Maximum evolution iterations (default: 5)"
    )
    evolve_parser.add_argument(
        "--auto-fix",
        action="store_true",
        default=True,
        help="Enable auto-fix for failing tests (default: true)"
    )
    evolve_parser.add_argument(
        "--no-auto-fix",
        action="store_false",
        dest="auto_fix",
        help="Disable auto-fix"
    )
    evolve_parser.add_argument(
        "--keep-running",
        action="store_true",
        help="Keep service running after evolution"
    )
    evolve_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    # Generate command
    generate_parser = subparsers.add_parser(
        "generate",
        help="Generate code from existing contract"
    )
    generate_parser.add_argument(
        "-c", "--contract",
        required=True,
        help="Path to contract.ai.json file"
    )
    generate_parser.add_argument(
        "-o", "--output",
        required=True,
        help="Output directory for generated code"
    )
    generate_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    # Validate command
    validate_parser = subparsers.add_parser(
        "validate",
        help="Validate a contract file"
    )
    validate_parser.add_argument(
        "-c", "--contract",
        required=True,
        help="Path to contract.ai.json file"
    )
    validate_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    # Status command
    status_parser = subparsers.add_parser(
        "status",
        help="Check LLM provider status"
    )
    status_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    return parser


async def cmd_evolve(args: argparse.Namespace) -> int:
    """Execute the evolve command"""
    from ..evolution import EvolutionManager, EvolutionOptions
    from ..llm import LLMManager
    
    print(f"\n## Reclapp Evolution v{__version__}\n")
    
    # Initialize LLM manager
    llm_manager = LLMManager(verbose=args.verbose)
    await llm_manager.initialize()
    
    # Show setup info
    llm_info = "not available"
    if llm_manager.is_available:
        provider = llm_manager.get_provider()
        if provider:
            llm_info = f"available ({provider.model})"
    
    print("```yaml")
    print("# @type: evolution_setup")
    print("setup:")
    print(f'  prompt: "{args.prompt}"')
    print(f'  output: "{args.output}"')
    print(f"  port: {args.port}")
    print(f"  llm: {llm_info}")
    print("```\n")
    
    # Create evolution manager
    options = EvolutionOptions(
        output_dir=args.output,
        max_iterations=args.max_iterations,
        auto_fix=args.auto_fix,
        verbose=args.verbose,
        keep_running=args.keep_running,
        port=args.port
    )
    
    manager = EvolutionManager(options)
    
    # Set LLM client if available
    if llm_manager.is_available:
        provider = llm_manager.get_provider()
        if provider:
            manager.set_llm_client(provider)
    
    # Run evolution
    try:
        result = await manager.evolve(args.prompt, args.output)
        
        # Print summary
        print("\n## Summary\n")
        print("```yaml")
        print(f"success: {result.success}")
        print(f"iterations: {result.iterations}")
        print(f"files_generated: {result.files_generated}")
        print(f"tests_passed: {result.tests_passed}")
        print(f"tests_failed: {result.tests_failed}")
        print(f"time_ms: {result.time_ms}")
        if result.errors:
            print("errors:")
            for error in result.errors:
                print(f"  - {error}")
        print("```")
        
        # Show interactive menu if keep_running or service is running
        if args.keep_running and result.service_port:
            await show_interactive_menu(args.output, result.service_port)
        
        return 0 if result.success else 1
        
    except Exception as e:
        print(f"\n❌ Evolution failed: {e}")
        return 1
    finally:
        await llm_manager.close()


async def show_interactive_menu(output_dir: str, port: int):
    """Show interactive menu like TypeScript - mirrors bin/reclapp actions"""
    import sys
    import select
    
    print("\n## Actions\n")
    print("```yaml")
    print("commands:")
    print('  k: "keep running - monitor for issues"')
    print('  r: "restart - regenerate service"')
    print('  f: "fix - create ticket for LLM"')
    print('  c: "contract - show contract/contract.ai.json"')
    print('  e: "state - show state/evolution-state.json"')
    print('  l: "logs - view service logs"')
    print('  S: "tasks - show task queue"')
    print('  t: "test - run API health check"')
    print(f'  o: "open - browser http://localhost:{port}"')
    print('  q: "quit - stop and exit"')
    print("```")
    print("\n> Tip: Use `--keep-running` (`-k`) to enter this menu\n")
    
    try:
        while True:
            print("> ", end="", flush=True)
            
            # Non-blocking input with timeout
            if sys.stdin in select.select([sys.stdin], [], [], 60)[0]:
                cmd = sys.stdin.readline().strip().lower()
            else:
                continue
            
            if cmd == 'q':
                print("👋 Stopping service and exiting...")
                break
            elif cmd == 'c':
                await show_file(f"{output_dir}/contract/contract.ai.json")
            elif cmd == 'e':
                await show_file(f"{output_dir}/state/evolution-state.json")
            elif cmd == 't':
                await check_health(port)
            elif cmd == 'o':
                import webbrowser
                webbrowser.open(f"http://localhost:{port}")
                print(f"🌐 Opened http://localhost:{port}")
            elif cmd == 'l':
                await show_logs(output_dir)
            elif cmd == 'k':
                print("👀 Monitoring... Press 'q' to quit")
            else:
                print("Unknown command. Use: k, r, f, c, e, l, S, t, o, q")
    except KeyboardInterrupt:
        print("\n👋 Interrupted, exiting...")


async def show_file(path: str):
    """Display file contents"""
    from pathlib import Path
    p = Path(path)
    if p.exists():
        print(f"\n--- {path} ---")
        print(p.read_text()[:2000])
        print("---\n")
    else:
        print(f"❌ File not found: {path}")


async def check_health(port: int):
    """Check service health"""
    import urllib.request
    try:
        url = f"http://localhost:{port}/health"
        req = urllib.request.urlopen(url, timeout=5)
        print(f"✅ Health check OK: {req.status}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")


async def show_logs(output_dir: str):
    """Show latest log file"""
    from pathlib import Path
    logs_dir = Path(output_dir) / "logs"
    if logs_dir.exists():
        logs = sorted(logs_dir.glob("*.md"), reverse=True)
        if logs:
            print(f"\n--- {logs[0]} ---")
            print(logs[0].read_text()[:2000])
            print("---\n")
        else:
            print("No log files found")
    else:
        print("Logs directory not found")


async def cmd_generate(args: argparse.Namespace) -> int:
    """Execute the generate command"""
    import json
    from ..generator import CodeGenerator, CodeGeneratorOptions
    from ..llm import LLMManager
    
    # Load contract
    contract_path = Path(args.contract)
    if not contract_path.exists():
        print(f"❌ Contract file not found: {args.contract}")
        return 1
    
    try:
        with open(contract_path) as f:
            contract = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in contract: {e}")
        return 1
    
    print(f"\n## Reclapp Code Generator v{__version__}\n")
    
    # Initialize LLM
    llm_manager = LLMManager(verbose=args.verbose)
    await llm_manager.initialize()
    
    # Create generator
    options = CodeGeneratorOptions(
        output_dir=args.output,
        verbose=args.verbose
    )
    generator = CodeGenerator(options)
    
    if llm_manager.is_available:
        provider = llm_manager.get_provider()
        if provider:
            generator.set_llm_client(provider)
    
    # Generate code
    try:
        result = await generator.generate(contract, args.output)
        
        print(f"\n✅ Generated {len(result.files)} files")
        for f in result.files:
            print(f"   📄 {f.path}")
        
        return 0 if result.success else 1
        
    except Exception as e:
        print(f"\n❌ Generation failed: {e}")
        return 1
    finally:
        await llm_manager.close()


async def cmd_validate(args: argparse.Namespace) -> int:
    """Execute the validate command"""
    import json
    from ..models import is_valid_contract
    
    contract_path = Path(args.contract)
    if not contract_path.exists():
        print(f"❌ Contract file not found: {args.contract}")
        return 1
    
    try:
        with open(contract_path) as f:
            contract = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return 1
    
    print(f"\n## Reclapp Contract Validator v{__version__}\n")
    
    # Validate structure
    errors = []
    warnings = []
    
    if "definition" not in contract:
        errors.append("Missing 'definition' layer")
    else:
        definition = contract["definition"]
        if "app" not in definition:
            errors.append("Missing 'definition.app'")
        if "entities" not in definition:
            errors.append("Missing 'definition.entities'")
        elif not definition["entities"]:
            warnings.append("No entities defined")
    
    if "generation" not in contract:
        warnings.append("Missing 'generation' layer (will use defaults)")
    
    if "validation" not in contract:
        warnings.append("Missing 'validation' layer (will use defaults)")
    
    # Print results
    print("```yaml")
    print(f"file: {args.contract}")
    print(f"valid: {len(errors) == 0}")
    if errors:
        print("errors:")
        for e in errors:
            print(f"  - {e}")
    if warnings:
        print("warnings:")
        for w in warnings:
            print(f"  - {w}")
    print("```")
    
    return 0 if len(errors) == 0 else 1


async def cmd_status(args: argparse.Namespace) -> int:
    """Execute the status command"""
    from ..llm import LLMManager
    
    print(f"\n## Reclapp Status v{__version__}\n")
    
    llm_manager = LLMManager(verbose=args.verbose)
    await llm_manager.initialize()
    
    status = llm_manager.get_status()
    
    print("```yaml")
    print("providers:")
    for name, info in status.items():
        print(f"  {name}:")
        print(f"    status: {info.get('status', 'unknown')}")
        if info.get('model'):
            print(f"    model: {info['model']}")
    print("```")
    
    await llm_manager.close()
    return 0


def cli(args: Optional[list[str]] = None) -> int:
    """Main CLI entry point"""
    parser = create_parser()
    parsed_args = parser.parse_args(args)
    
    if not parsed_args.command:
        parser.print_help()
        return 0
    
    # Route to command handler
    if parsed_args.command == "evolve":
        return asyncio.run(cmd_evolve(parsed_args))
    elif parsed_args.command == "generate":
        return asyncio.run(cmd_generate(parsed_args))
    elif parsed_args.command == "validate":
        return asyncio.run(cmd_validate(parsed_args))
    elif parsed_args.command == "status":
        return asyncio.run(cmd_status(parsed_args))
    else:
        parser.print_help()
        return 1


def main():
    """Entry point for console script"""
    sys.exit(cli())


if __name__ == "__main__":
    main()
