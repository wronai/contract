#!/usr/bin/env python3
"""
Reclapp Setup - Python/Pydantic Version

Environment checker and dependency installer with TaskQueue-like execution.
Compares to the TypeScript version in bin/reclapp cmdSetup.

@version 1.0.0
"""

import asyncio
import json
import os
import platform
import subprocess
import sys
import time
from dataclasses import field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Optional

import httpx
from pydantic import BaseModel, Field
from rich.console import Console
from rich.markdown import Markdown
from rich.syntax import Syntax
from rich.table import Table

# ============================================================================
# MODELS
# ============================================================================

class TaskStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"

class Priority(str, Enum):
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"

class LLMProviderStatus(str, Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"
    ERROR = "error"

class LLMProvider(BaseModel):
    name: str
    status: LLMProviderStatus
    models: int = 0
    code_models: int = 0
    url: Optional[str] = None
    fix: Optional[str] = None
    error: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert to dict with clean status string, filter nulls"""
        d = {"name": self.name, "status": self.status.value}
        if self.models > 0:
            d["models"] = self.models
        if self.code_models > 0:
            d["codeModels"] = self.code_models  # Match TypeScript naming
        if self.url:
            d["url"] = self.url
        if self.fix:
            d["fix"] = self.fix
        if self.error:
            d["error"] = self.error
        return d

class Dependency(BaseModel):
    name: str
    display_name: str
    status: str
    priority: Priority
    version: Optional[str] = None
    install_command: Optional[str] = None

class SetupTask(BaseModel):
    id: str
    name: str
    priority: Priority
    category: str
    status: TaskStatus = TaskStatus.PENDING
    commands: list[str] = Field(default_factory=list)
    description: Optional[str] = None

class TaskResult(BaseModel):
    success: bool
    message: str
    data: dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

class EnvironmentReport(BaseModel):
    os: str
    arch: str
    node_version: str
    ready: bool
    missing_required: list[str]
    missing_recommended: list[str]
    dependencies: list[Dependency]
    setup_tasks: list[SetupTask] = Field(default_factory=list)

class SetupConfig(BaseModel):
    output_dir: str = "."
    install: bool = False
    interactive: bool = True
    skip_optional: bool = False
    yes: bool = False
    dry_run: bool = False

# ============================================================================
# CLI RUNNER
# ============================================================================

class CLITask(BaseModel):
    id: str
    name: str
    description: str = ""
    category: str = "general"
    model_config = {"arbitrary_types_allowed": True}

class CLIRunner:
    def __init__(self, name: str, version: str, verbose: bool = True):
        self.name = name
        self.version = version
        self.verbose = verbose
        self.console = Console()
        self.tasks: list[tuple[CLITask, Callable, Optional[Callable]]] = []
        self.results: list[dict] = []
        
    def add_task(
        self, 
        task: CLITask, 
        run_fn: Callable[[], TaskResult],
        skip_fn: Optional[Callable[[], bool]] = None
    ):
        self.tasks.append((task, run_fn, skip_fn))
        
    def log(self, message: str):
        self.console.print(f"[dim]```log[/dim]")
        self.console.print(f"[dim]{message}[/dim]")
        self.console.print(f"[dim]```[/dim]\n")
        
    def yaml(self, type_name: str, description: str, data: dict):
        lines = [f"# @type: {type_name}", f"# @description: {description}"]
        lines.extend(self._format_yaml(data))
        yaml_str = "\n".join(lines)
        syntax = Syntax(yaml_str, "yaml", theme="monokai", line_numbers=False)
        self.console.print(syntax)
        self.console.print()
        
    def _format_yaml(self, data: dict, indent: int = 0) -> list[str]:
        lines = []
        prefix = "  " * indent
        for key, value in data.items():
            if isinstance(value, dict):
                lines.append(f"{prefix}{key}:")
                lines.extend(self._format_yaml(value, indent + 1))
            elif isinstance(value, list):
                lines.append(f"{prefix}{key}:")
                for item in value:
                    if isinstance(item, dict):
                        first = True
                        for k, v in item.items():
                            if first:
                                lines.append(f"{prefix}  - {k}: {self._format_value(v)}")
                                first = False
                            else:
                                lines.append(f"{prefix}    {k}: {self._format_value(v)}")
                    else:
                        lines.append(f"{prefix}  - {self._format_value(item)}")
            else:
                lines.append(f"{prefix}{key}: {self._format_value(value)}")
        return lines
    
    def _format_value(self, value: Any) -> str:
        if value is None:
            return "null"
        if isinstance(value, bool):
            return str(value).lower()
        if isinstance(value, str):
            return f'"{value}"'
        return str(value)
        
    def print_todo(self):
        done = sum(1 for t, _, _ in self.tasks if self.results and any(r.get("id") == t.id and r.get("status") == "done" for r in self.results))
        failed = sum(1 for t, _, _ in self.tasks if self.results and any(r.get("id") == t.id and r.get("status") == "failed" for r in self.results))
        
        self.yaml("task_queue", "Current task status", {
            "progress": {"done": done, "failed": failed, "total": len(self.tasks)},
            "tasks": [{"name": t.name, "status": "pending"} for t, _, _ in self.tasks]
        })
        
    async def run(self) -> dict:
        start_time = time.time()
        self.console.print(f"\n## {self.name} v{self.version}\n")
        
        self.print_todo()
        
        completed = 0
        failed = 0
        skipped = 0
        
        for task, run_fn, skip_fn in self.tasks:
            # Check skip
            if skip_fn and skip_fn():
                skipped += 1
                self.results.append({"id": task.id, "status": "skipped"})
                continue
                
            self.log(f"→ {task.name}: {task.description}")
            
            try:
                if asyncio.iscoroutinefunction(run_fn):
                    result = await run_fn()
                else:
                    result = run_fn()
                    
                if result.success:
                    completed += 1
                    self.results.append({"id": task.id, "status": "done"})
                    if result.data:
                        self.yaml(f"{task.id}_result", result.message, result.data)
                else:
                    failed += 1
                    self.results.append({"id": task.id, "status": "failed", "error": result.error})
                    self.log(f"❌ {task.name} failed: {result.error}")
            except Exception as e:
                failed += 1
                self.results.append({"id": task.id, "status": "failed", "error": str(e)})
                self.log(f"❌ {task.name} error: {e}")
                
            self.log(f"📊 Progress: {completed + failed + skipped}/{len(self.tasks)}")
            
        duration = time.time() - start_time
        
        self.yaml("run_summary", "Execution summary", {
            "success": failed == 0,
            "completed": completed,
            "failed": failed,
            "skipped": skipped,
            "total": len(self.tasks),
            "duration_ms": int(duration * 1000)
        })
        
        return {
            "success": failed == 0,
            "completed": completed,
            "failed": failed,
            "skipped": skipped,
            "duration": duration
        }

# ============================================================================
# DEPENDENCY CHECKER
# ============================================================================

DEPENDENCIES = [
    {"name": "node", "display_name": "Node.js", "check": "node --version", "priority": Priority.REQUIRED},
    {"name": "git", "display_name": "Git", "check": "git --version", "priority": Priority.REQUIRED},
    {"name": "typescript", "display_name": "TypeScript", "check": "tsc --version", "priority": Priority.REQUIRED,
     "install": "npm install -g typescript"},
    {"name": "ollama", "display_name": "Ollama", "check": "ollama --version", "priority": Priority.RECOMMENDED,
     "install": "curl -fsSL https://ollama.ai/install.sh | sh"},
    {"name": "docker", "display_name": "Docker", "check": "docker --version", "priority": Priority.RECOMMENDED},
    {"name": "docker-compose", "display_name": "Docker Compose", "check": "docker compose version", "priority": Priority.OPTIONAL},
    {"name": "postgresql", "display_name": "PostgreSQL", "check": "psql --version", "priority": Priority.OPTIONAL,
     "install": "sudo apt-get install postgresql postgresql-contrib"},
    {"name": "redis", "display_name": "Redis", "check": "redis-server --version", "priority": Priority.OPTIONAL,
     "install": "sudo apt-get install redis-server"},
    {"name": "python", "display_name": "Python 3", "check": "python3 --version", "priority": Priority.OPTIONAL},
]

class DependencyChecker:
    def check_dependency(self, dep: dict) -> Dependency:
        try:
            result = subprocess.run(
                dep["check"], shell=True, capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip().split()[-1] if result.stdout else None
                return Dependency(
                    name=dep["name"],
                    display_name=dep["display_name"],
                    status="installed",
                    priority=dep["priority"],
                    version=version
                )
        except Exception:
            pass
            
        return Dependency(
            name=dep["name"],
            display_name=dep["display_name"],
            status="missing",
            priority=dep["priority"],
            install_command=dep.get("install")
        )
        
    def generate_report(self) -> EnvironmentReport:
        deps = [self.check_dependency(d) for d in DEPENDENCIES]
        
        missing_required = [d.display_name for d in deps if d.status == "missing" and d.priority == Priority.REQUIRED]
        missing_recommended = [d.display_name for d in deps if d.status == "missing" and d.priority == Priority.RECOMMENDED]
        
        setup_tasks = []
        for d in deps:
            if d.status == "missing" and d.install_command:
                setup_tasks.append(SetupTask(
                    id=f"install-{d.name}",
                    name=f"Install {d.display_name}",
                    priority=d.priority,
                    category="tool" if d.priority == Priority.REQUIRED else "database",
                    commands=[d.install_command]
                ))
                
        try:
            node_version = subprocess.run("node --version", shell=True, capture_output=True, text=True).stdout.strip()
        except:
            node_version = "unknown"
            
        return EnvironmentReport(
            os=f"{platform.system()} {platform.release()}",
            arch=platform.machine(),
            node_version=node_version,
            ready=len(missing_required) == 0,
            missing_required=missing_required,
            missing_recommended=missing_recommended,
            dependencies=deps,
            setup_tasks=setup_tasks
        )

# ============================================================================
# LLM PROVIDER CHECKER
# ============================================================================

async def check_llm_providers() -> list[LLMProvider]:
    providers = []
    
    # Check Ollama
    ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{ollama_url}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = data.get("models", [])
                code_models = [m for m in models if any(x in m.get("name", "") for x in ["codellama", "deepseek", "qwen", "coder"])]
                providers.append(LLMProvider(
                    name="ollama",
                    status=LLMProviderStatus.AVAILABLE,
                    models=len(models),
                    code_models=len(code_models),
                    url=ollama_url
                ))
            else:
                providers.append(LLMProvider(name="ollama", status=LLMProviderStatus.ERROR, error="API error"))
    except Exception:
        providers.append(LLMProvider(name="ollama", status=LLMProviderStatus.UNAVAILABLE, error="Connection failed"))
        
    # Check Windsurf
    windsurf_key = os.environ.get("WINDSURF_API_KEY")
    if windsurf_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{os.environ.get('WINDSURF_URL', 'https://api.windsurf.ai/v1')}/models",
                    headers={"Authorization": f"Bearer {windsurf_key}"}
                )
                providers.append(LLMProvider(
                    name="windsurf",
                    status=LLMProviderStatus.AVAILABLE if resp.status_code == 200 else LLMProviderStatus.ERROR
                ))
        except:
            providers.append(LLMProvider(name="windsurf", status=LLMProviderStatus.UNAVAILABLE))
    else:
        providers.append(LLMProvider(name="windsurf", status=LLMProviderStatus.NOT_CONFIGURED, fix="Set WINDSURF_API_KEY"))
        
    # Check OpenRouter
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if openrouter_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={"Authorization": f"Bearer {openrouter_key}"}
                )
                providers.append(LLMProvider(
                    name="openrouter",
                    status=LLMProviderStatus.AVAILABLE if resp.status_code == 200 else LLMProviderStatus.ERROR
                ))
        except:
            providers.append(LLMProvider(name="openrouter", status=LLMProviderStatus.UNAVAILABLE))
    else:
        providers.append(LLMProvider(name="openrouter", status=LLMProviderStatus.NOT_CONFIGURED, fix="Set OPENROUTER_API_KEY"))
        
    return providers

# ============================================================================
# SETUP COMMAND
# ============================================================================

async def cmd_setup(config: SetupConfig):
    runner = CLIRunner("Reclapp Environment Setup", "1.0-python")
    checker = DependencyChecker()
    
    llm_providers: list[LLMProvider] = []
    report: Optional[EnvironmentReport] = None
    all_tasks: list[SetupTask] = []
    
    # Task 1: Check LLM providers
    async def check_llm():
        nonlocal llm_providers
        llm_providers = await check_llm_providers()
        available = [p for p in llm_providers if p.status == LLMProviderStatus.AVAILABLE]
        return TaskResult(
            success=True,
            message="LLM provider check complete",
            data={
                "llm_providers": [p.to_dict() for p in llm_providers],
                "available": len(available),
                "total": len(llm_providers)
            }
        )
        
    runner.add_task(
        CLITask(id="check-llm", name="Check LLM providers", description="Testing Ollama, Windsurf, OpenRouter"),
        check_llm
    )
    
    # Task 2: Check system dependencies
    def check_deps():
        nonlocal report
        report = checker.generate_report()
        return TaskResult(
            success=True,
            message="Dependency check complete",
            data={
                "os": report.os,
                "arch": report.arch,
                "node": report.node_version,
                "ready": report.ready,
                "missing_required": report.missing_required,
                "dependencies": [d.model_dump() for d in report.dependencies]
            }
        )
        
    runner.add_task(
        CLITask(id="check-deps", name="Check system dependencies", description="Node.js, Git, Docker, TypeScript"),
        check_deps
    )
    
    # Task 3: Generate setup tasks
    def generate_tasks():
        nonlocal all_tasks
        all_tasks = []
        
        # LLM tasks
        ollama = next((p for p in llm_providers if p.name == "ollama"), None)
        if not ollama or ollama.status != LLMProviderStatus.AVAILABLE:
            all_tasks.append(SetupTask(
                id="install-ollama", name="Install Ollama", priority=Priority.RECOMMENDED,
                category="llm", commands=["curl -fsSL https://ollama.ai/install.sh | sh"]
            ))
        elif ollama.code_models == 0:
            all_tasks.append(SetupTask(
                id="pull-model", name="Pull Ollama code model", priority=Priority.RECOMMENDED,
                category="llm", commands=["ollama pull codellama:7b"]
            ))
            
        # System tasks
        if report:
            all_tasks.extend(report.setup_tasks)
            
        counts = {
            "required": len([t for t in all_tasks if t.priority == Priority.REQUIRED]),
            "recommended": len([t for t in all_tasks if t.priority == Priority.RECOMMENDED]),
            "optional": len([t for t in all_tasks if t.priority == Priority.OPTIONAL])
        }
        
        # Show install hint if not in install mode
        if not config.install and len(all_tasks) > 0:
            runner.log(
                f"💡 Install steps are disabled by default. Run: reclapp setup --install\n"
                f"   required: {counts['required']}, recommended: {counts['recommended']}, optional: {counts['optional']}"
            )
        
        return TaskResult(
            success=True,
            message="Setup tasks generated",
            data={"total": len(all_tasks), "install_mode": config.install, "counts": counts}
        )
        
    runner.add_task(
        CLITask(id="generate-tasks", name="Generate setup tasks", description="Create installation task list"),
        generate_tasks
    )
    
    # Task 4: Save setup files
    def save_files():
        setup_dir = Path(config.output_dir) / "setup"
        setup_dir.mkdir(parents=True, exist_ok=True)
        
        # Save JSON
        tasks_path = setup_dir / "setup-tasks.json"
        with open(tasks_path, "w") as f:
            json.dump([t.model_dump() for t in all_tasks], f, indent=2, default=str)
            
        # Save Markdown
        md_path = setup_dir / "SETUP.md"
        with open(md_path, "w") as f:
            f.write("# Reclapp Setup Guide\n\n")
            f.write(f"Platform: **{platform.system()}**\n\n")
            
            required = [t for t in all_tasks if t.priority == Priority.REQUIRED]
            if required:
                f.write("## Required\n\n")
                for t in required:
                    f.write(f"### {t.name}\n\n```bash\n{t.commands[0]}\n```\n\n")
                    
            recommended = [t for t in all_tasks if t.priority == Priority.RECOMMENDED]
            if recommended:
                f.write("## Recommended\n\n")
                for t in recommended:
                    f.write(f"### {t.name}\n\n```bash\n{t.commands[0]}\n```\n\n")
                    
        return TaskResult(
            success=True,
            message="Setup files created",
            data={"files": [str(md_path), str(tasks_path)]}
        )
        
    runner.add_task(
        CLITask(id="save-files", name="Save setup files", description="Create SETUP.md and setup-tasks.json"),
        save_files,
        skip_fn=lambda: len(all_tasks) == 0
    )
    
    # Task 5: Install required (only if --install)
    def install_required():
        required = [t for t in all_tasks if t.priority == Priority.REQUIRED]
        results = []
        
        runner.yaml('install_required', 'Required dependencies to install', {
            "count": len(required),
            "items": [{"name": t.name, "command": t.commands[0]} for t in required]
        })
        
        for task in required:
            runner.log(f"📦 Installing {task.name}...")
            try:
                for cmd in task.commands:
                    if cmd.startswith("#"):
                        continue
                    if config.dry_run:
                        runner.log(f"DRY RUN: {cmd}")
                    else:
                        subprocess.run(cmd, shell=True, check=True)
                status = "dry_run" if config.dry_run else "installed"
                results.append({"name": task.name, "status": status})
                runner.log(f"✅ {task.name} {'simulated' if config.dry_run else 'installed'}")
            except Exception as e:
                results.append({"name": task.name, "status": "failed", "error": str(e)})
                runner.log(f"❌ {task.name} failed")
        return TaskResult(success=True, message="Required installed", data={"results": results})
        
    runner.add_task(
        CLITask(id="install-required", name="Install required dependencies", description="Install missing required dependencies"),
        install_required,
        skip_fn=lambda: not config.install or len([t for t in all_tasks if t.priority == Priority.REQUIRED]) == 0
    )
    
    # Task 6: Install recommended (only if --install)
    def install_recommended():
        recommended = [t for t in all_tasks if t.priority == Priority.RECOMMENDED]
        results = []
        
        runner.yaml('install_recommended', 'Recommended dependencies to install', {
            "count": len(recommended),
            "items": [{"name": t.name, "command": t.commands[0]} for t in recommended]
        })
        
        for task in recommended:
            runner.log(f"📦 Installing {task.name}...")
            try:
                for cmd in task.commands:
                    if cmd.startswith("#"):
                        continue
                    if config.dry_run:
                        runner.log(f"DRY RUN: {cmd}")
                    else:
                        subprocess.run(cmd, shell=True, check=True)
                status = "dry_run" if config.dry_run else "installed"
                results.append({"name": task.name, "status": status})
                runner.log(f"✅ {task.name} {'simulated' if config.dry_run else 'installed'}")
            except Exception as e:
                results.append({"name": task.name, "status": "failed", "error": str(e)})
                runner.log(f"⚠️ {task.name} failed")
        return TaskResult(success=True, message="Recommended installed", data={"results": results})
        
    runner.add_task(
        CLITask(id="install-recommended", name="Install recommended dependencies", description="Install recommended dependencies"),
        install_recommended,
        skip_fn=lambda: not config.install or len([t for t in all_tasks if t.priority == Priority.RECOMMENDED]) == 0
    )
    
    # Task 7: Install optional (only if --install and not --skip-optional)
    def install_optional():
        optional = [t for t in all_tasks if t.priority == Priority.OPTIONAL]
        results = []
        
        runner.yaml('install_optional', 'Optional dependencies available', {
            "count": len(optional),
            "items": [{"name": t.name, "category": t.category, "command": t.commands[0] if not t.commands[0].startswith("#") else "(manual)"} for t in optional]
        })
        
        for task in optional:
            if all(c.startswith("#") for c in task.commands):
                runner.log(f"📝 {task.name}: {task.commands[0]}")
                results.append({"name": task.name, "status": "manual"})
                continue
                
            runner.log(f"📦 Installing {task.name}...")
            try:
                for cmd in task.commands:
                    if cmd.startswith("#"):
                        continue
                    if config.dry_run:
                        runner.log(f"DRY RUN: {cmd}")
                    else:
                        subprocess.run(cmd, shell=True, check=True)
                status = "dry_run" if config.dry_run else "installed"
                results.append({"name": task.name, "status": status})
                runner.log(f"✅ {task.name} {'simulated' if config.dry_run else 'installed'}")
            except Exception as e:
                results.append({"name": task.name, "status": "failed", "error": str(e)})
                runner.log(f"⚠️ {task.name} failed")
        return TaskResult(success=True, message="Optional processed", data={"results": results})
        
    runner.add_task(
        CLITask(id="install-optional", name="Install optional dependencies", description="Choose which optional dependencies to install"),
        install_optional,
        skip_fn=lambda: not config.install or config.skip_optional or len([t for t in all_tasks if t.priority == Priority.OPTIONAL]) == 0
    )
    
    # Run
    result = await runner.run()
    
    # Summary
    available_llms = [p.name for p in llm_providers if p.status == LLMProviderStatus.AVAILABLE]
    ready = report.ready if report else False
    
    runner.yaml("setup_summary", "Environment status", {
        "ready": ready and len(available_llms) > 0,
        "llm_available": len(available_llms) > 0,
        "llm_providers": available_llms,
        "pending_tasks": len(all_tasks)
    })
    
    if ready and available_llms:
        print("\n## Next Steps\n")
        print("```bash")
        print("# Create your first app")
        print("reclapp evolve -p 'Create a todo app' -o ./my-app")
        print("```\n")
    elif len(all_tasks) > 0:
        print("\n## Fix Issues\n")
        print("```bash")
        print("# Install missing dependencies")
        print("reclapp setup --install")
        print("")
        print("# Or follow the guide")
        print("cat setup/SETUP.md")
        print("```\n")

# ============================================================================
# MAIN
# ============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Reclapp Setup - Environment checker and dependency installer")
    parser.add_argument("-o", "--output", default=".", help="Output directory")
    parser.add_argument("-i", "--install", action="store_true", help="Install dependencies")
    parser.add_argument("-y", "--yes", action="store_true", help="Skip confirmations")
    parser.add_argument("--skip-optional", action="store_true", help="Skip optional deps")
    parser.add_argument("--dry-run", action="store_true", help="Simulate installations without executing")
    
    args = parser.parse_args()
    
    # --dry-run implies --install
    install = args.install or args.dry_run
    
    config = SetupConfig(
        output_dir=args.output,
        install=install,
        interactive=not args.yes and not args.dry_run,
        skip_optional=args.skip_optional,
        yes=args.yes or args.dry_run,
        dry_run=args.dry_run
    )
    
    asyncio.run(cmd_setup(config))

if __name__ == "__main__":
    main()
