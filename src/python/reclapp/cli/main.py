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


async def cmd_list(args: argparse.Namespace) -> int:
    """Execute the list command - find and display contracts"""
    import json
    import os
    from datetime import datetime
    
    print(f"\n## Reclapp List v{__version__}\n")
    
    search_dir = Path(args.directory).resolve()
    if not search_dir.exists():
        print(f"❌ Directory not found: {search_dir}")
        return 1
    
    # Find all contract files
    contracts = []
    
    # Search for .rcl.md files
    for rcl_file in search_dir.rglob("*.rcl.md"):
        # Skip log files
        if "/logs/" in str(rcl_file) or "/target/logs/" in str(rcl_file):
            continue
        
        contract_info = {
            "path": str(rcl_file.relative_to(search_dir)),
            "type": "rcl.md",
            "size": rcl_file.stat().st_size,
            "modified": datetime.fromtimestamp(rcl_file.stat().st_mtime).isoformat()
        }
        
        # Try to extract app name from file
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
        print(json.dumps({"contracts": contracts, "total": len(contracts)}, indent=2))
    elif args.format == "table":
        print(f"Found {len(contracts)} contract(s):\n")
        print(f"{'Path':<60} {'Type':<8} {'Size':<10}")
        print("-" * 80)
        for c in contracts:
            print(f"{c['path']:<60} {c['type']:<8} {c['size']:<10}")
    else:  # yaml
        print("```yaml")
        print("# @type: contract_list")
        print(f"total: {len(contracts)}")
        print(f"directory: \"{search_dir}\"")
        print("contracts:")
        for c in contracts:
            print(f"  - path: \"{c['path']}\"")
            print(f"    type: {c['type']}")
            if args.verbose and c.get("name"):
                print(f"    name: \"{c['name']}\"")
            print(f"    size: {c['size']}")
            print(f"    modified: \"{c['modified']}\"")
        print("```")
    
    return 0


async def cmd_prompts(args: argparse.Namespace) -> int:
    """Execute the prompts command - manage prompt templates"""
    print(f"\n## Reclapp Prompts v{__version__}\n")
    
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
        print("```yaml")
        print("# @type: prompt_list")
        print(f"total: {len(prompts)}")
        print("prompts:")
        for name, info in prompts.items():
            print(f"  - name: \"{name}\"")
            print(f"    description: \"{info['description']}\"")
            if args.verbose:
                print(f"    template: \"{info['template']}\"")
                print(f"    examples:")
                for ex in info['examples']:
                    print(f"      - \"{ex}\"")
        print("```")
    
    elif args.action == "show":
        if not args.name:
            print("❌ Please specify prompt name with -n/--name")
            return 1
        
        if args.name not in prompts:
            print(f"❌ Prompt '{args.name}' not found")
            print(f"Available: {', '.join(prompts.keys())}")
            return 1
        
        info = prompts[args.name]
        print("```yaml")
        print(f"# @type: prompt_detail")
        print(f"name: \"{args.name}\"")
        print(f"description: \"{info['description']}\"")
        print(f"template: \"{info['template']}\"")
        print("examples:")
        for ex in info['examples']:
            print(f"  - \"{ex}\"")
        print("```")
    
    elif args.action == "add":
        print("ℹ️  Custom prompt management coming soon")
        print("For now, use built-in prompts or provide inline with -p flag")
    
    return 0


async def cmd_analyze(args: argparse.Namespace) -> int:
    """Execute the analyze command - extract contract from codebase"""
    from ..analysis import CodeRAG
    
    print(f"\n## Reclapp Analyze v{__version__}\n")
    
    target_dir = Path(args.directory).resolve()
    if not target_dir.exists():
        print(f"❌ Directory not found: {target_dir}")
        return 1
    
    print("```yaml")
    print("# @type: task_queue")
    print("progress:")
    print("  done: 0")
    print("  total: 4")
    print("tasks:")
    print('  - name: "scan-files"')
    print('    status: "pending"')
    print('  - name: "detect-entities"')
    print('    status: "pending"')
    print('  - name: "extract-api"')
    print('    status: "pending"')
    print('  - name: "generate-contract"')
    print('    status: "pending"')
    print("```\n")
    
    # Task 1: Scan files
    print("> Scanning files...")
    
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
    
    print("```yaml")
    print("# @type: scan_result")
    print(f"directory: \"{target_dir}\"")
    print("files:")
    for ext, count in file_stats.items():
        if count > 0:
            print(f"  {ext}: {count}")
    print("```\n")
    
    # Task 2: Detect entities
    print("> Detecting entities...")
    
    entities = []
    # Simple heuristic: look for model/interface files
    for f in target_dir.rglob("**/models/*.ts"):
        entity_name = f.stem.replace("-", " ").replace("_", " ").title().replace(" ", "")
        if entity_name not in ["Index", "Types"]:
            entities.append(entity_name)
    
    for f in target_dir.rglob("**/models/*.py"):
        entity_name = f.stem.replace("-", " ").replace("_", " ").title().replace(" ", "")
        if entity_name not in ["__init__", "base"]:
            entities.append(entity_name)
    
    print("```yaml")
    print("# @type: entities_detected")
    print(f"count: {len(entities)}")
    print("entities:")
    for e in entities:
        print(f"  - {e}")
    print("```\n")
    
    # Task 3: Extract API
    print("> Extracting API endpoints...")
    
    endpoints = []
    for f in target_dir.rglob("**/routes/*.ts"):
        endpoints.append(f"/{f.stem}")
    for f in target_dir.rglob("**/routes/*.py"):
        if f.stem != "__init__":
            endpoints.append(f"/{f.stem}")
    
    print("```yaml")
    print("# @type: api_extracted")
    print(f"count: {len(endpoints)}")
    print("endpoints:")
    for e in endpoints:
        print(f"  - {e}")
    print("```\n")
    
    # Task 4: Generate contract
    print("> Generating contract...")
    
    contract = {
        "app": {
            "name": target_dir.name,
            "version": "1.0.0"
        },
        "entities": [{"name": e, "fields": [{"name": "id", "type": "uuid"}]} for e in entities],
        "api": {
            "prefix": "/api",
            "endpoints": endpoints
        }
    }
    
    if args.output:
        import json
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(contract, indent=2))
        print(f"✅ Contract saved to: {args.output}")
    else:
        import json
        print("```json")
        print(json.dumps(contract, indent=2))
        print("```")
    
    print("\n📊 Progress: 4/4 (4 done, 0 failed)")
    return 0


async def cmd_refactor(args: argparse.Namespace) -> int:
    """Execute the refactor command - apply contract changes to code"""
    import json
    
    print(f"\n## Reclapp Refactor v{__version__}\n")
    
    contract_path = Path(args.contract)
    if not contract_path.exists():
        print(f"❌ Contract not found: {args.contract}")
        return 1
    
    target_dir = Path(args.directory).resolve()
    if not target_dir.exists():
        print(f"❌ Directory not found: {target_dir}")
        return 1
    
    # Load contract
    try:
        contract = json.loads(contract_path.read_text())
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return 1
    
    print("```yaml")
    print("# @type: task_queue")
    print("progress:")
    print("  done: 0")
    print("  total: 3")
    print("tasks:")
    print('  - name: "analyze-diff"')
    print('    status: "pending"')
    print('  - name: "plan-changes"')
    print('    status: "pending"')
    print('  - name: "apply-changes"')
    print('    status: "pending"')
    print("```\n")
    
    # Task 1: Analyze diff
    print("> Analyzing contract vs codebase...")
    
    entities_in_contract = [e.get("name", "") for e in contract.get("entities", [])]
    
    print("```yaml")
    print("# @type: diff_analysis")
    print(f"contract: \"{args.contract}\"")
    print(f"directory: \"{target_dir}\"")
    print(f"entities_in_contract: {len(entities_in_contract)}")
    print("```\n")
    
    # Task 2: Plan changes
    print("> Planning changes...")
    
    changes = []
    for entity in entities_in_contract:
        model_path = target_dir / "api" / "src" / "models" / f"{entity.lower()}.ts"
        if not model_path.exists():
            changes.append({"type": "create", "entity": entity, "file": str(model_path)})
    
    print("```yaml")
    print("# @type: change_plan")
    print(f"changes: {len(changes)}")
    if changes:
        print("planned:")
        for c in changes[:5]:  # Show max 5
            print(f"  - type: {c['type']}")
            print(f"    entity: {c['entity']}")
    print("```\n")
    
    # Task 3: Apply changes
    if args.dry_run:
        print("> Dry run - no changes applied")
        print("```yaml")
        print("# @type: dry_run_result")
        print(f"would_create: {len([c for c in changes if c['type'] == 'create'])}")
        print(f"would_modify: {len([c for c in changes if c['type'] == 'modify'])}")
        print("```")
    else:
        print("> Applying changes...")
        print("```yaml")
        print("# @type: apply_result")
        print("applied: 0")
        print("skipped: 0")
        print("note: \"Full refactoring requires LLM - use reclapp evolve for complex changes\"")
        print("```")
    
    print("\n📊 Progress: 3/3 (3 done, 0 failed)")
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
    elif parsed_args.command == "list":
        return asyncio.run(cmd_list(parsed_args))
    elif parsed_args.command == "prompts":
        return asyncio.run(cmd_prompts(parsed_args))
    elif parsed_args.command == "analyze":
        return asyncio.run(cmd_analyze(parsed_args))
    elif parsed_args.command == "refactor":
        return asyncio.run(cmd_refactor(parsed_args))
    else:
        parser.print_help()
        return 1


def main():
    """Entry point for console script"""
    sys.exit(cli())


if __name__ == "__main__":
    main()
