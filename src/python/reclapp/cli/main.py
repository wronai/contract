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
from typing import Optional, Any

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
    
    # List command
    list_parser = subparsers.add_parser(
        "list",
        help="List available contracts and projects"
    )
    list_parser.add_argument(
        "-d", "--directory",
        default=".",
        help="Directory to search for contracts (default: current)"
    )
    list_parser.add_argument(
        "--format",
        choices=["yaml", "json", "table"],
        default="yaml",
        help="Output format (default: yaml)"
    )
    list_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show detailed contract information"
    )
    
    # Prompts command
    prompts_parser = subparsers.add_parser(
        "prompts",
        help="Manage and list available prompts"
    )
    prompts_parser.add_argument(
        "action",
        nargs="?",
        choices=["list", "show", "add"],
        default="list",
        help="Action to perform (default: list)"
    )
    prompts_parser.add_argument(
        "-n", "--name",
        help="Prompt name for show/add actions"
    )
    prompts_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Show detailed prompt information"
    )
    
    # Analyze command
    analyze_parser = subparsers.add_parser(
        "analyze",
        help="Analyze existing codebase and extract contract"
    )
    analyze_parser.add_argument(
        "-d", "--directory",
        default=".",
        help="Directory to analyze (default: current)"
    )
    analyze_parser.add_argument(
        "-o", "--output",
        help="Output file for generated contract"
    )
    analyze_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    # Refactor command
    refactor_parser = subparsers.add_parser(
        "refactor",
        help="Refactor code based on contract changes"
    )
    refactor_parser.add_argument(
        "-c", "--contract",
        required=True,
        help="Path to contract file"
    )
    refactor_parser.add_argument(
        "-d", "--directory",
        default=".",
        help="Directory containing code to refactor"
    )
    refactor_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show changes without applying them"
    )
    refactor_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    # Tasks command
    tasks_parser = subparsers.add_parser(
        "tasks",
        help="Run tasks from file (parallel execution)"
    )
    tasks_parser.add_argument(
        "file",
        help="Path to tasks file"
    )
    tasks_parser.add_argument(
        "--workers", "-w",
        type=int,
        default=3,
        help="Number of parallel workers (default: 3)"
    )
    tasks_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    
    # Stop command
    subparsers.add_parser(
        "stop",
        help="Stop all running containers"
    )
    
    # Setup command
    setup_parser = subparsers.add_parser(
        "setup",
        help="Check environment and setup API keys"
    )
    setup_parser.add_argument(
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
            await show_interactive_menu(manager, args, result.service_port)
        
        return 0 if result.success else 1
        
    except Exception as e:
        print(f"\n❌ Evolution failed: {e}")
        return 1
    finally:
        await llm_manager.close()


async def show_interactive_menu(manager: Any, args: argparse.Namespace, port: int):
    """Show interactive menu like TypeScript - mirrors bin/reclapp actions"""
    import sys
    import select
    
    output_dir = args.output
    
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
            elif cmd == 'S':
                manager.task_queue.print()
            elif cmd == 'r':
                print("🔄 Restarting evolution...")
                await manager.evolve(args.prompt, args.output)
                print("\n## Actions (r, f, c, e, l, S, t, o, q)\n")
            elif cmd == 'f':
                print("💬 What needs to be fixed? (Enter description):")
                fix_prompt = sys.stdin.readline().strip()
                if fix_prompt:
                    print(f"🔧 Applying fix: {fix_prompt}")
                    # In a real impl, we would append this to the prompt or evolution state
                    await manager.evolve(f"{args.prompt}\n\nFIX REQUEST: {fix_prompt}", args.output)
                    print("\n## Actions (r, f, c, e, l, S, t, o, q)\n")
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


async def cmd_parse(args: argparse.Namespace) -> int:
    """Execute the parse command - parse contract and print JSON"""
    from ..parser.markdown_parser import parse_contract_markdown
    from .runner import ShellRenderer
    import json
    
    renderer = ShellRenderer(verbose=args.verbose)
    renderer.heading(2, f"Reclapp Contract Parser v{__version__}")
    
    contract_path = Path(args.contract)
    if not contract_path.exists():
        renderer.error(f"Contract file not found: {args.contract}")
        return 1
        
    try:
        content = contract_path.read_text()
        if contract_path.suffix == ".md":
            contract = parse_contract_markdown(content)
            result = contract.model_dump(by_alias=True)
        else:
            # Assume JSON/YAML
            import yaml
            result = yaml.safe_load(content)
            
        renderer.codeblock("json", json.dumps(result, indent=2))
        return 0
    except Exception as e:
        renderer.error(f"Failed to parse contract: {e}")
        return 1


async def cmd_validate(args: argparse.Namespace) -> int:
    """Execute the validate command"""
    from ..parser.markdown_parser import parse_contract_markdown, validate_contract
    from .runner import ShellRenderer
    
    renderer = ShellRenderer(verbose=args.verbose)
    renderer.heading(2, f"Reclapp Contract Validator v{__version__}")
    
    contract_path = Path(args.contract)
    if not contract_path.exists():
        renderer.error(f"Contract file not found: {args.contract}")
        return 1
    
    try:
        content = contract_path.read_text()
        if contract_path.suffix == ".md":
            contract_md = parse_contract_markdown(content)
            val_result = validate_contract(contract_md)
            errors = val_result.errors
            warnings = val_result.warnings
        else:
            # Basic JSON validation for non-markdown
            import json
            contract = json.loads(content)
            errors = []
            warnings = []
            if "definition" not in contract:
                errors.append("Missing 'definition' layer")
            if "generation" not in contract:
                warnings.append("Missing 'generation' layer")
    except Exception as e:
        renderer.error(f"Validation failed: {e}")
        return 1
    
    # Print results
    yaml_res = {
        "file": str(contract_path),
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }
    import yaml
    renderer.codeblock("yaml", yaml.dump(yaml_res, sort_keys=False))
    
    return 0 if len(errors) == 0 else 1


async def cmd_setup(args: argparse.Namespace) -> int:
    """Execute the setup command - check environment and API keys"""
    from reclapp.cli.runner import CLIRunner, CLITaskResult
    import os
    import shutil
    import subprocess
    
    runner = CLIRunner(
        name="Reclapp Environment Setup",
        version=__version__,
        verbose=args.verbose
    )
    
    def check_git():
        git_path = shutil.which("git")
        if git_path:
            try:
                ver = subprocess.check_output(["git", "--version"]).decode().strip()
                return CLITaskResult(success=True, message=f"Git found: {ver}")
            except:
                pass
        return CLITaskResult(success=False, error="Git not found")

    def check_node():
        node_path = shutil.which("node")
        npm_path = shutil.which("npm")
        if node_path and npm_path:
            try:
                node_ver = subprocess.check_output(["node", "--version"]).decode().strip()
                return CLITaskResult(success=True, message=f"Node.js found: {node_ver}")
            except:
                pass
        return CLITaskResult(success=False, error="Node.js or npm not found (required for generated code)")

    def check_ollama():
        ollama_path = shutil.which("ollama")
        if ollama_path:
            return CLITaskResult(success=True, message="Ollama found (local LLM supported)")
        return CLITaskResult(success=True, message="Ollama not found (optional)")

    def detect_api_keys():
        keys = {
            "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY"),
            "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "WINDSURF_API_KEY": os.getenv("WINDSURF_API_KEY"),
        }
        found = [k for k, v in keys.items() if v]
        missing = [k for k, v in keys.items() if not v]
        
        return CLITaskResult(
            success=True, 
            data={"found": found, "missing": missing},
            message=f"Detected {len(found)} API keys"
        )

    runner.add_task("check-git", "Checking Git", check_git)
    runner.add_task("check-node", "Checking Node.js", check_node)
    runner.add_task("check-ollama", "Checking Ollama", check_ollama)
    runner.add_task("detect-keys", "Detecting API Keys", detect_api_keys)
    
    result = await runner.run()
    return 0 if result["success"] else 1


async def cmd_tasks(args: argparse.Namespace) -> int:
    """Execute the tasks command - parallel command execution from file"""
    from reclapp.cli.executor import TaskExecutor
    from reclapp.cli.runner import ShellRenderer
    
    renderer = ShellRenderer(verbose=args.verbose)
    renderer.heading(2, f"Reclapp Task Executor v{__version__}")
    
    yaml_config = {
        "config": {
            "file": args.file,
            "workers": args.workers,
            "verbose": args.verbose
        }
    }
    import yaml
    renderer.codeblock("yaml", yaml.dump(yaml_config, sort_keys=False))
    
    executor = TaskExecutor(max_workers=args.workers, verbose=args.verbose)
    executor.add_tasks_from_file(args.file)
    
    await executor.wait_for_all()
    executor.print_summary()
    
    # Check if any task failed
    success = all(t.state == "done" for t in executor.tasks.values())
    return 0 if success else 1


async def cmd_status(args: argparse.Namespace) -> int:
    """Execute the status command"""
    from reclapp.llm import LLMManager
    from reclapp.cli.runner import ShellRenderer
    
    # Always show status output regardless of verbose flag
    renderer = ShellRenderer(verbose=True)
    renderer.heading(2, f"Reclapp Status v{__version__}")
    
    llm_manager = LLMManager(verbose=args.verbose)
    await llm_manager.initialize()
    
    status = llm_manager.get_status()
    
    yaml_data = {"providers": status}
    import yaml
    renderer.codeblock("yaml", yaml.dump(yaml_data, sort_keys=False))
    
    await llm_manager.close()
    return 0


async def cmd_list(args: argparse.Namespace) -> int:
    """Execute the list command - find and display contracts"""
    import json
    from datetime import datetime
    from reclapp.cli.runner import ShellRenderer
    
    # Always show list output
    renderer = ShellRenderer(verbose=True)
    renderer.heading(2, f"Reclapp List v{__version__}")
    
    search_dir = Path(args.directory).resolve()
    if not search_dir.exists():
        renderer.error(f"Directory not found: {search_dir}")
        return 1
    
    # Find all contract files
    contracts = []
    
    # Search for .rcl.md files
    for rcl_file in search_dir.rglob("*.rcl.md"):
        if "/logs/" in str(rcl_file) or "/target/logs/" in str(rcl_file):
            continue
        
        contract_info = {
            "path": str(rcl_file.relative_to(search_dir)),
            "type": "rcl.md",
            "size": rcl_file.stat().st_size,
            "modified": datetime.fromtimestamp(rcl_file.stat().st_mtime).isoformat()
        }
        
        if args.verbose:
            try:
                content = rcl_file.read_text()[:500]
                for line in content.split("\n"):
                    if line.startswith("# "):
                        contract_info["name"] = line[2:].strip()
                        break
            except Exception:
                pass
        
        contracts.append(contract_info)
    
    # Search for contract.ai.json files
    for json_file in search_dir.rglob("contract.ai.json"):
        contract_info = {
            "path": str(json_file.relative_to(search_dir)),
            "type": "json",
            "size": json_file.stat().st_size,
            "modified": datetime.fromtimestamp(json_file.stat().st_mtime).isoformat()
        }
        
        if args.verbose:
            try:
                data = json.loads(json_file.read_text())
                if "app" in data and "name" in data["app"]:
                    contract_info["name"] = data["app"]["name"]
                elif "definition" in data and "app" in data["definition"]:
                    contract_info["name"] = data["definition"]["app"].get("name", "Unknown")
            except Exception:
                pass
        
        contracts.append(contract_info)
    
    # Output results
    if args.format == "json":
        renderer.codeblock("json", json.dumps({"contracts": contracts, "total": len(contracts)}, indent=2))
    elif args.format == "table":
        headers = ["Path", "Type", "Size"]
        rows = [[c["path"], c["type"], str(c["size"])] for c in contracts]
        renderer.renderer.table(headers, rows)
    else:  # yaml
        yaml_data = {
            "total": len(contracts),
            "directory": str(search_dir),
            "contracts": [
                {
                    "path": c["path"],
                    "type": c["type"],
                    "size": c["size"],
                    "modified": c["modified"],
                    **({"name": c["name"]} if "name" in c else {})
                }
                for c in contracts
            ]
        }
        import yaml
        renderer.codeblock("yaml", "# @type: contract_list\n" + yaml.dump(yaml_data, sort_keys=False))
    
    return 0


async def cmd_prompts(args: argparse.Namespace) -> int:
    """Execute the prompts command - manage prompt templates"""
    from reclapp.cli.runner import ShellRenderer
    # Always show prompts output
    renderer = ShellRenderer(verbose=True)
    renderer.heading(2, f"Reclapp Prompts v{__version__}")
    
    # Built-in prompt templates
    prompts = {
        "minimal": {
            "description": "Minimal app with basic CRUD",
            "template": "Create a {name} app with {entities}",
            "examples": ["Create a todo app with tasks"]
        },
        "b2b": {
            "description": "B2B application with onboarding and verification",
            "template": "Create a B2B {name} platform with {entities}, verification workflow, and dashboard",
            "examples": ["Create a B2B contractor management platform"]
        },
        "saas": {
            "description": "SaaS starter with auth and billing",
            "template": "Create a SaaS {name} with user authentication, subscription management, and {features}",
            "examples": ["Create a SaaS project management tool"]
        },
        "api": {
            "description": "REST API backend only",
            "template": "Create a REST API for {name} with {entities} and {auth_type} authentication",
            "examples": ["Create a REST API for inventory with products and JWT authentication"]
        },
        "ecommerce": {
            "description": "E-commerce platform",
            "template": "Create an e-commerce {name} with products, cart, orders, and {payment_provider}",
            "examples": ["Create an e-commerce bookstore with Stripe"]
        }
    }
    
    if args.action == "list":
        yaml_data = {
            "total": len(prompts),
            "prompts": [
                {
                    "name": name,
                    "description": info["description"],
                    **({"template": info["template"], "examples": info["examples"]} if args.verbose else {})
                }
                for name, info in prompts.items()
            ]
        }
        import yaml
        renderer.codeblock("yaml", "# @type: prompt_list\n" + yaml.dump(yaml_data, sort_keys=False))
    
    elif args.action == "show":
        if not args.name:
            renderer.error("Please specify prompt name with -n/--name")
            return 1
        
        if args.name not in prompts:
            renderer.error(f"Prompt '{args.name}' not found")
            renderer.info(f"Available: {', '.join(prompts.keys())}")
            return 1
        
        info = prompts[args.name]
        yaml_data = {
            "name": args.name,
            "description": info["description"],
            "template": info["template"],
            "examples": info["examples"]
        }
        import yaml
        renderer.codeblock("yaml", "# @type: prompt_detail\n" + yaml.dump(yaml_data, sort_keys=False))
    
    elif args.action == "add":
        renderer.info("ℹ️ Custom prompt management coming soon. For now, provide inline with -p flag.")
    
    return 0


async def cmd_analyze(args: argparse.Namespace) -> int:
    """Execute the analyze command - extract contract from codebase"""
    from reclapp.cli.runner import CLIRunner, CLITaskResult
    
    runner = CLIRunner(
        name="Reclapp Analyze",
        version=__version__,
        verbose=args.verbose
    )
    
    target_dir = Path(args.directory).resolve()
    if not target_dir.exists():
        runner.renderer.error(f"Directory not found: {target_dir}")
        return 1

    def scan_files():
        file_stats = {"ts": 0, "py": 0, "sql": 0, "json": 0, "other": 0}
        for f in target_dir.rglob("*"):
            if f.is_file() and not any(p in str(f) for p in ["node_modules", "__pycache__", ".git", "venv"]):
                ext = f.suffix.lower()
                if ext in [".ts", ".tsx"]:
                    file_stats["ts"] += 1
                elif ext in [".py"]:
                    file_stats["py"] += 1
                elif ext in [".sql"]:
                    file_stats["sql"] += 1
                elif ext in [".json"]:
                    file_stats["json"] += 1
                else:
                    file_stats["other"] += 1
        return CLITaskResult(success=True, data={"files": file_stats, "directory": str(target_dir)})

    def detect_entities():
        entities = []
        for f in target_dir.rglob("**/models/*.ts"):
            entity_name = f.stem.replace("-", " ").replace("_", " ").title().replace(" ", "")
            if entity_name not in ["Index", "Types"]:
                entities.append(entity_name)
        for f in target_dir.rglob("**/models/*.py"):
            entity_name = f.stem.replace("-", " ").replace("_", " ").title().replace(" ", "")
            if entity_name not in ["__init__", "base"]:
                entities.append(entity_name)
        return CLITaskResult(success=True, data={"entities": entities, "count": len(entities)})

    def extract_api():
        endpoints = []
        for f in target_dir.rglob("**/routes/*.ts"):
            endpoints.append(f"/{f.stem}")
        for f in target_dir.rglob("**/routes/*.py"):
            if f.stem != "__init__":
                endpoints.append(f"/{f.stem}")
        return CLITaskResult(success=True, data={"endpoints": endpoints, "count": len(endpoints)})

    def generate_contract():
        # Retrieve data from previous tasks if needed, but here we just use what we found
        # In a real impl, we'd pass state between tasks
        entities = [] # This would come from detect_entities result in a real runner
        endpoints = [] # This would come from extract_api
        
        # Simplified for now as we are just unifying the UI
        contract = {
            "app": {
                "name": target_dir.name,
                "version": "1.0.0"
            }
        }
        
        if args.output:
            import json
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(json.dumps(contract, indent=2))
            return CLITaskResult(success=True, message=f"Contract saved to {args.output}")
        else:
            return CLITaskResult(success=True, data={"contract": contract})

    runner.add_task("scan-files", "Scanning files", scan_files)
    runner.add_task("detect-entities", "Detecting entities", detect_entities)
    runner.add_task("extract-api", "Extracting API endpoints", extract_api)
    runner.add_task("generate-contract", "Generating contract", generate_contract)
    
    result = await runner.run()
    return 0 if result["success"] else 1


async def cmd_refactor(args: argparse.Namespace) -> int:
    """Execute the refactor command - apply contract changes to code"""
    from reclapp.cli.runner import CLIRunner, CLITaskResult
    import json
    
    runner = CLIRunner(
        name="Reclapp Refactor",
        version=__version__,
        verbose=args.verbose
    )
    
    contract_path = Path(args.contract)
    if not contract_path.exists():
        runner.renderer.error(f"Contract not found: {args.contract}")
        return 1
    
    target_dir = Path(args.directory).resolve()
    if not target_dir.exists():
        runner.renderer.error(f"Directory not found: {target_dir}")
        return 1
    
    # Load contract
    try:
        contract = json.loads(contract_path.read_text())
    except Exception as e:
        runner.renderer.error(f"Invalid contract JSON: {e}")
        return 1

    def analyze_diff():
        entities = [e.get("name", "") for e in contract.get("entities", [])]
        return CLITaskResult(success=True, data={
            "contract": str(contract_path),
            "directory": str(target_dir),
            "entities_in_contract": len(entities)
        })

    def plan_changes():
        entities = [e.get("name", "") for e in contract.get("entities", [])]
        changes = []
        for entity in entities:
            model_path = target_dir / "api" / "src" / "models" / f"{entity.lower()}.ts"
            if not model_path.exists():
                changes.append({"type": "create", "entity": entity, "file": str(model_path)})
        return CLITaskResult(success=True, data={"planned_changes": len(changes), "changes": changes[:5]})

    def apply_changes():
        if args.dry_run:
            return CLITaskResult(success=True, message="Dry run - no changes applied")
        
        return CLITaskResult(
            success=True, 
            message="Applied 0 changes", 
            data={"note": "Full refactoring requires LLM - use reclapp evolve for complex changes"}
        )

    runner.add_task("analyze-diff", "Analyzing contract vs codebase", analyze_diff)
    runner.add_task("plan-changes", "Planning changes", plan_changes)
    runner.add_task("apply-changes", "Applying changes", apply_changes)
    
    result = await runner.run()
    return 0 if result["success"] else 1


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
    elif parsed_args.command == "list":
        return asyncio.run(cmd_list(parsed_args))
    elif parsed_args.command == "prompts":
        return asyncio.run(cmd_prompts(parsed_args))
    elif parsed_args.command == "analyze":
        return asyncio.run(cmd_analyze(parsed_args))
    elif parsed_args.command == "refactor":
        return asyncio.run(cmd_refactor(parsed_args))
    elif parsed_args.command == "tasks":
        return asyncio.run(cmd_tasks(parsed_args))
    elif parsed_args.command == "setup":
        return asyncio.run(cmd_setup(parsed_args))
    elif parsed_args.command == "stop":
        print("ℹ️ Stop command not implemented in Python yet. Use docker-compose down manually.")
        return 0
    else:
        parser.print_help()
        return 1


def main():
    """Entry point for console script"""
    sys.exit(cli())


if __name__ == "__main__":
    main()
