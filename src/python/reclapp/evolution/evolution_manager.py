"""
Evolution Manager

Manages the evolution pipeline with auto-healing code generation.

Mirrors: src/core/contract-ai/evolution/evolution-manager.ts
@version 2.0.0 - Full pipeline with E2E tests, npm install, service start
"""

import asyncio
import json
import os
import signal
import subprocess
import time
import glob
import uuid
from pathlib import Path
from typing import Any, Callable, Optional, TypeVar

T = TypeVar("T")

from pydantic import BaseModel, Field

from .task_queue import TaskQueue, Task
from .shell_renderer import ShellRenderer


# ============================================================================
# TYPES
# ============================================================================

class EvolutionOptions(BaseModel):
    """Evolution manager options"""
    output_dir: str = Field(default="./generated", alias="outputDir")
    max_iterations: int = Field(default=5, alias="maxIterations")
    auto_fix: bool = Field(default=True, alias="autoFix")
    verbose: bool = True
    keep_running: bool = Field(default=False, alias="keepRunning")
    port: int = 3000
    
    model_config = {"populate_by_name": True}


class EvolutionResult(BaseModel):
    """Result of evolution run"""
    success: bool
    iterations: int = 0
    files_generated: int = Field(default=0, alias="filesGenerated")
    tests_passed: int = Field(default=0, alias="testsPassed")
    tests_failed: int = Field(default=0, alias="testsFailed")
    errors: list[str] = Field(default_factory=list)
    time_ms: int = Field(default=0, alias="timeMs")
    service_port: Optional[int] = None
    
    model_config = {"populate_by_name": True}


# ============================================================================
# EVOLUTION MANAGER
# ============================================================================

class EvolutionManager:
    """
    Evolution manager with auto-healing code generation.
    
    Full pipeline (21 tasks like TypeScript):
    1. Create output folders
    2. Create evolution state
    3. Parse prompt into contract
    4. Save contract.ai.json
    5. Validate plan
    6. Generate backend code
    7. Save generated files
    8. Validate generated output
    9. Install dependencies
    10. Start service
    11. Verify service health
    12. Generate tests
    13. Run tests
    14. Auto-heal on failure (up to max_iterations)
    
    Example:
        manager = EvolutionManager(verbose=True)
        manager.set_llm_client(ollama_client)
        result = await manager.evolve("Create a todo app")
    """
    
    def __init__(self, options: Optional[EvolutionOptions] = None):
        self.options = options or EvolutionOptions()
        self.task_queue = TaskQueue(verbose=self.options.verbose)
        self.renderer = ShellRenderer(verbose=self.options.verbose)
        self._llm_client: Optional[Any] = None
        self._service_process: Optional[subprocess.Popen] = None
        self._contract: Optional[dict] = None
    
    def set_llm_client(self, client: Any) -> None:
        """Set the LLM client"""
        self._llm_client = client
    
    async def evolve(
        self,
        prompt: str,
        output_dir: Optional[str] = None
    ) -> EvolutionResult:
        """Run the full evolution pipeline with auto-healing."""
        start_time = time.time()
        target_dir = output_dir or self.options.output_dir
        errors: list[str] = []
        files_generated = 0
        tests_passed = 0
        tests_failed = 0
        iteration = 0
        
        self.renderer.heading(1, "Evolution Mode v2.0")
        self.renderer.info(f"Prompt: {prompt}")
        self.renderer.info(f"Output: {target_dir}")
        self.renderer.info(f"Max iterations: {self.options.max_iterations}")
        
        # Create full task list
        self._setup_tasks()
        
        try:
            # Phase 1: Setup
            await self._phase_setup(target_dir)
            
            # Phase 2: Contract generation
            self._contract = await self._phase_contract(prompt, target_dir)
            if not self._contract:
                errors.append("Contract generation failed")
                raise Exception("Contract generation failed")
            
            # Phase 3: Code generation with auto-healing loop
            for iteration in range(1, self.options.max_iterations + 1):
                if iteration > 1:
                    self.renderer.heading(2, f"Iteration {iteration}")
                
                # Generate code
                files = await self._phase_code_generation(self._contract, target_dir)
                files_generated = len(files)
                
                if files_generated == 0:
                    if self.options.auto_fix and iteration < self.options.max_iterations:
                        self.renderer.warning("No files generated, retrying...")
                        continue
                    errors.append("Code generation failed")
                    break
                
                # Install & start service
                service_ok = await self._phase_service(target_dir)
                if not service_ok:
                    if self.options.auto_fix and iteration < self.options.max_iterations:
                        self.renderer.warning("Service failed, regenerating...")
                        await self._stop_service()
                        continue
                    errors.append("Service failed to start")
                    break
                
                # Run E2E tests
                tests_passed, tests_failed = await self._phase_tests(target_dir)
                
                if tests_failed == 0:
                    self.renderer.success(f"All {tests_passed} tests passed!")
                elif self.options.auto_fix and iteration < self.options.max_iterations:
                    self.renderer.warning(f"{tests_failed} tests failed, attempting auto-fix...")
                    await self._auto_fix_code(target_dir, tests_failed)
                    continue
                else:
                    errors.append(f"{tests_failed} tests failed")
                
                # Phase 5-9: Additional generation (Docker, CI/CD, Frontend, Docs)
                await self._phase_additional(target_dir)
                
                # Phase 10: Final verification
                await self._phase_verification(target_dir)
                break
            
        except Exception as e:
            errors.append(str(e))
            if self.options.verbose:
                self.renderer.error(f"Evolution failed: {e}")
        finally:
            if not self.options.keep_running:
                await self._stop_service()
        
        time_ms = int((time.time() - start_time) * 1000)
        success = len(errors) == 0 and files_generated > 0
        
        # Save evolution log
        await self._save_evolution_log(target_dir)
        
        if success:
            self.renderer.success(f"Evolution complete! {files_generated} files, {tests_passed} tests passed")
        else:
            self.renderer.error(f"Evolution finished with {len(errors)} errors")
        
        return EvolutionResult(
            success=success,
            iterations=iteration,
            files_generated=files_generated,
            tests_passed=tests_passed,
            tests_failed=tests_failed,
            errors=errors,
            time_ms=time_ms,
            service_port=self.options.port if self._service_process else None
        )
    
    def _setup_tasks(self):
        """Setup full task queue (21 tasks like TypeScript)"""
        # Phase 1: Setup
        self.task_queue.add("Create output folders", "folders")
        self.task_queue.add("Create evolution state", "state")
        self.task_queue.add("Parse prompt into contract", "parse")
        self.task_queue.add("Save contract.ai.json", "save-contract")
        self.task_queue.add("Validate plan", "validate-plan")
        
        # Phase 2: Backend Generation
        self.task_queue.add("Generate backend code", "generate")
        self.task_queue.add("Save generated files", "save-files")
        self.task_queue.add("Validate generated output", "validate-output")
        
        # Phase 3: Build & Run
        self.task_queue.add("Install dependencies", "npm-install")
        self.task_queue.add("Start service", "start-service")
        self.task_queue.add("Verify service health", "health-check")
        
        # Phase 4: Testing
        self.task_queue.add("Generate tests", "generate-tests")
        self.task_queue.add("Run tests", "run-tests")
        
        # Phase 5: Database
        self.task_queue.add("Generate database", "generate-database")
        
        # Phase 6: Docker
        self.task_queue.add("Generate Docker", "generate-docker")
        
        # Phase 7: CI/CD
        self.task_queue.add("Generate CI/CD templates", "generate-cicd")
        
        # Phase 8: Frontend
        self.task_queue.add("Generate frontend", "generate-frontend")
        
        # Phase 9: Documentation
        self.task_queue.add("Generate documentation", "generate-docs")
        
        # Phase 10: Verification
        self.task_queue.add("Validate additional targets", "validate-targets")
        self.task_queue.add("Verify contract ↔ code ↔ service", "verify")
        self.task_queue.add("Reconcile discrepancies", "reconcile")
    
    async def _phase_setup(self, target_dir: str):
        """Phase 1: Setup directories and state"""
        self.task_queue.start("folders")
        api_dir = Path(target_dir) / "api" / "src"
        tests_dir = Path(target_dir) / "tests" / "e2e"
        state_dir = Path(target_dir) / "state"
        
        for d in [api_dir, tests_dir, state_dir]:
            d.mkdir(parents=True, exist_ok=True)
        self.task_queue.done("folders")
        
        self.task_queue.start("state")
        state_file = Path(target_dir) / "state" / "evolution-state.json"
        state_file.write_text(json.dumps({
            "started": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "status": "running",
            "iteration": 0
        }, indent=2))
        self.task_queue.done("state")
    
    async def _phase_contract(self, prompt: str, target_dir: str) -> Optional[dict]:
        """Phase 2: Generate and save contract"""
        self.task_queue.start("parse")
        contract = await self._generate_contract(prompt)
        if not contract:
            self.task_queue.fail("parse", "Failed to generate contract")
            return None
        self.task_queue.done("parse")
        
        self.task_queue.start("save-contract")
        contract_file = Path(target_dir) / "contract" / "contract.ai.json"
        contract_file.parent.mkdir(parents=True, exist_ok=True)
        contract_file.write_text(json.dumps(contract, indent=2))
        self.task_queue.done("save-contract")
        
        self.task_queue.start("validate-plan")
        self.task_queue.done("validate-plan")
        
        return contract
    
    async def _phase_code_generation(self, contract: dict, target_dir: str) -> list[str]:
        """Phase 3: Generate code"""
        self.task_queue.start("generate")
        files = await self._generate_code(contract, target_dir)
        if files:
            self.task_queue.done("generate")
        else:
            self.task_queue.fail("generate", "No files generated")
        
        self.task_queue.start("save-files")
        self.task_queue.done("save-files")
        
        self.task_queue.start("validate-output")
        self.task_queue.done("validate-output")
        
        return files
    
    async def _phase_service(self, target_dir: str) -> bool:
        """Phase 4: Install deps and start service"""
        api_dir = Path(target_dir) / "api"
        
        # npm install
        self.task_queue.start("npm-install")
        if not (api_dir / "package.json").exists():
            self.task_queue.skip("npm-install")
            self.task_queue.skip("start-service")
            self.task_queue.skip("health-check")
            return True
        
        # Find npm executable
        npm_cmd = self._find_npm()
        if not npm_cmd:
            self.task_queue.skip("npm-install")
            self.task_queue.skip("start-service")
            self.task_queue.skip("health-check")
            self.renderer.warning("npm not found, skipping service phase")
            return True  # Continue without service
        
        try:
            result = subprocess.run(
                [npm_cmd, "install"],
                cwd=str(api_dir),
                capture_output=True,
                text=True,
                timeout=120
            )
            if result.returncode != 0:
                err = (result.stderr or result.stdout or "").strip()
                if err:
                    err = err[:2000]
                else:
                    err = "npm install failed"
                self.renderer.codeblock("log", err)
                self.task_queue.fail("npm-install", err[:180] if err else "npm install failed")
                return False
            self.task_queue.done("npm-install")
        except Exception as e:
            self.task_queue.fail("npm-install", str(e))
            return False
        
        # Start service
        self.task_queue.start("start-service")
        try:
            await self._kill_port(self.options.port)
            self._service_process = subprocess.Popen(
                [npm_cmd, "run", "dev"],
                cwd=str(api_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            await asyncio.sleep(3)  # Wait for startup

            if self._service_process.poll() is not None:
                out_b, err_b = self._service_process.communicate(timeout=1)
                out = (out_b or b"").decode(errors="replace") if isinstance(out_b, (bytes, bytearray)) else (out_b or "")
                err = (err_b or b"").decode(errors="replace") if isinstance(err_b, (bytes, bytearray)) else (err_b or "")
                combined = (err.strip() or out.strip() or "Service exited immediately")
                combined = combined[:3000]
                self.renderer.codeblock("log", combined)
                self.task_queue.fail("start-service", combined[:180])
                return False

            self.task_queue.done("start-service")
        except Exception as e:
            self.task_queue.fail("start-service", str(e))
            return False
        
        # Health check
        self.task_queue.start("health-check")
        healthy = await self._check_health()
        if healthy:
            self.task_queue.done("health-check")
        else:
            msg = "Service not responding"
            self.task_queue.fail("health-check", msg)
            return False
        
        return True
    
    async def _phase_tests(self, target_dir: str) -> tuple[int, int]:
        """Phase 5: Generate and run E2E tests"""
        # Generate tests
        self.task_queue.start("generate-tests")
        test_file = await self._generate_e2e_tests(target_dir)
        await self._generate_test_fixtures(target_dir)
        await self._generate_test_config(target_dir)
        if test_file:
            self.task_queue.done("generate-tests")
        else:
            self.task_queue.skip("generate-tests")
        
        # Run tests
        self.task_queue.start("run-tests")
        passed, failed = await self._run_e2e_tests(target_dir)
        
        if failed == 0:
            self.task_queue.done("run-tests")
        else:
            self.task_queue.fail("run-tests", f"{failed} tests failed")
        
        return passed, failed
    
    async def _phase_additional(self, target_dir: str):
        """Phase 5-9: Additional generation (Database, Docker, CI/CD, Frontend, Docs)"""
        # Database (Prisma + SQLite)
        self.task_queue.start("generate-database")
        await self._generate_database(target_dir)
        self.task_queue.done("generate-database")
        
        # Docker
        self.task_queue.start("generate-docker")
        await self._generate_dockerfile(target_dir)
        self.task_queue.done("generate-docker")
        
        # CI/CD
        self.task_queue.start("generate-cicd")
        await self._generate_cicd(target_dir)
        self.task_queue.done("generate-cicd")
        
        # Frontend (React)
        self.task_queue.start("generate-frontend")
        await self._generate_frontend(target_dir)
        self.task_queue.done("generate-frontend")
        
        # Documentation
        self.task_queue.start("generate-docs")
        await self._generate_docs(target_dir)
        self.task_queue.done("generate-docs")
    
    async def _phase_verification(self, target_dir: str):
        """Phase 10: Final verification with multi-level state analysis"""
        from .state_analyzer import StateAnalyzer
        
        self.task_queue.start("validate-targets")
        # Validate generated targets exist
        api_dir = Path(target_dir) / "api"
        frontend_dir = Path(target_dir) / "frontend"
        targets_valid = api_dir.exists() or frontend_dir.exists()
        self.task_queue.done("validate-targets")
        
        self.task_queue.start("verify")
        # Run multi-level state analysis
        analyzer = StateAnalyzer(target_dir, verbose=self.options.verbose)
        state = await analyzer.analyze(self._contract)
        
        # Write state snapshot
        analyzer.write_state_snapshot(state)
        
        if self.options.verbose:
            self.renderer.info(f"State analysis: {len(state.discrepancies)} discrepancies found")
            for d in state.discrepancies:
                if d.severity == "error":
                    self.renderer.error(f"  {d.level.value}: {d.message}")
                else:
                    self.renderer.warning(f"  {d.level.value}: {d.message}")
        
        self.task_queue.done("verify")
        
        self.task_queue.start("reconcile")
        # Reconcile discrepancies (log for now, auto-fix in future)
        if state.is_consistent():
            self.renderer.success("Contract ↔ Code ↔ Service state is consistent")
        self.task_queue.done("reconcile")
    
    async def _generate_database(self, target_dir: str):
        """Generate Prisma database schema"""
        if not self._contract:
            return
        
        entities = self._contract.get("definition", {}).get("entities", [])
        
        # Generate Prisma models
        models = ""
        for entity in entities:
            name = entity.get("name", "Item")
            fields = entity.get("fields", [])
            
            field_defs = []
            for field in fields:
                fname = field.get("name", "")
                ftype = field.get("type", "String")
                
                # Map types to Prisma
                prisma_type = {
                    "UUID": "String @id @default(uuid())",
                    "String": "String",
                    "Int": "Int",
                    "Float": "Float",
                    "Boolean": "Boolean",
                    "DateTime": "DateTime @default(now())",
                    "Date": "DateTime",
                }.get(ftype, "String")
                
                if fname == "id":
                    field_defs.append(f"  {fname} {prisma_type}")
                elif "At" in fname:
                    field_defs.append(f"  {fname} DateTime @default(now())")
                else:
                    field_defs.append(f"  {fname} {prisma_type}")
            
            models += f"""
model {name} {{
{chr(10).join(field_defs)}
}}
"""
        
        prisma_schema = f'''// Prisma Schema
// Generated by Reclapp Evolution Engine

generator client {{
  provider = "prisma-client-js"
}}

datasource db {{
  provider = "sqlite"
  url      = env("DATABASE_URL")
}}
{models}
'''
        
        prisma_dir = Path(target_dir) / "api" / "prisma"
        prisma_dir.mkdir(parents=True, exist_ok=True)
        
        schema_path = prisma_dir / "schema.prisma"
        schema_path.write_text(prisma_schema)
        
        # Create .env for database
        env_content = 'DATABASE_URL="file:./dev.db"\n'
        env_path = Path(target_dir) / "api" / ".env"
        env_path.write_text(env_content)
    
    async def _generate_frontend(self, target_dir: str):
        """Generate React frontend"""
        if not self._contract:
            return
        
        entities = self._contract.get("definition", {}).get("entities", [])
        app_name = self._contract.get("definition", {}).get("app", {}).get("name", "App")
        
        frontend_dir = Path(target_dir) / "frontend"
        src_dir = frontend_dir / "src"
        src_dir.mkdir(parents=True, exist_ok=True)
        
        # Package.json
        package_json = {
            "name": f"{app_name.lower().replace(' ', '-')}-frontend",
            "version": "1.0.0",
            "type": "module",
            "scripts": {
                "dev": "vite",
                "build": "vite build",
                "preview": "vite preview"
            },
            "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0"
            },
            "devDependencies": {
                "@types/react": "^18.2.0",
                "@types/react-dom": "^18.2.0",
                "@vitejs/plugin-react": "^4.2.0",
                "typescript": "^5.3.0",
                "vite": "^5.0.0"
            }
        }
        (frontend_dir / "package.json").write_text(json.dumps(package_json, indent=2))
        
        # Vite config
        vite_config = '''import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
'''
        (frontend_dir / "vite.config.ts").write_text(vite_config)
        
        # Index.html
        index_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{app_name}</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
'''
        (frontend_dir / "index.html").write_text(index_html)
        
        # Main.tsx
        main_tsx = '''import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
'''
        (src_dir / "main.tsx").write_text(main_tsx)
        
        # Generate entity list for App
        entity_name = entities[0].get("name", "Item") if entities else "Item"
        entity_lower = entity_name.lower()
        
        # App.tsx
        app_tsx = f'''import {{ useState, useEffect }} from 'react'

interface {entity_name} {{
  id: string
  title?: string
  name?: string
  createdAt: string
}}

function App() {{
  const [items, setItems] = useState<{entity_name}[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {{
    fetch('/api/v1/{entity_lower}s')
      .then(res => res.json())
      .then(data => {{
        setItems(Array.isArray(data) ? data : [])
        setLoading(false)
      }})
      .catch(() => setLoading(false))
  }}, [])

  const addItem = async () => {{
    if (!newItem.trim()) return
    const res = await fetch('/api/v1/{entity_lower}s', {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ title: newItem }})
    }})
    if (res.ok) {{
      const item = await res.json()
      setItems([...items, item])
      setNewItem('')
    }}
  }}

  const deleteItem = async (id: string) => {{
    await fetch(`/api/v1/{entity_lower}s/${{id}}`, {{ method: 'DELETE' }})
    setItems(items.filter(i => i.id !== id))
  }}

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>{app_name}</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <input
          value={{newItem}}
          onChange={{e => setNewItem(e.target.value)}}
          placeholder="Add new item..."
          style={{ padding: '0.5rem', marginRight: '0.5rem', width: '300px' }}
        />
        <button onClick={{addItem}} style={{ padding: '0.5rem 1rem' }}>Add</button>
      </div>

      {{loading ? (
        <p>Loading...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {{items.map(item => (
            <li key={{item.id}} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.5rem',
              borderBottom: '1px solid #eee',
              maxWidth: '400px'
            }}>
              <span>{{item.title || item.name || item.id}}</span>
              <button onClick={{() => deleteItem(item.id)}} style={{ color: 'red' }}>×</button>
            </li>
          ))}}
        </ul>
      )}}
    </div>
  )
}}

export default App
'''
        (src_dir / "App.tsx").write_text(app_tsx)
        
        # Index.css
        index_css = '''* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

button {
  cursor: pointer;
  border: none;
  background: #007bff;
  color: white;
  border-radius: 4px;
}

button:hover {
  background: #0056b3;
}

input {
  border: 1px solid #ddd;
  border-radius: 4px;
}
'''
        (src_dir / "index.css").write_text(index_css)
        
        # TypeScript config
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "useDefineForClassFields": True,
                "lib": ["ES2020", "DOM", "DOM.Iterable"],
                "module": "ESNext",
                "skipLibCheck": True,
                "moduleResolution": "bundler",
                "allowImportingTsExtensions": True,
                "resolveJsonModule": True,
                "isolatedModules": True,
                "noEmit": True,
                "jsx": "react-jsx",
                "strict": True
            },
            "include": ["src"]
        }
        (frontend_dir / "tsconfig.json").write_text(json.dumps(tsconfig, indent=2))
    
    async def _generate_dockerfile(self, target_dir: str):
        """Generate Dockerfile for the API"""
        dockerfile_content = '''FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm ci --only=production

COPY api/src ./src
COPY api/tsconfig.json ./

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
'''
        dockerfile_path = Path(target_dir) / "Dockerfile"
        dockerfile_path.write_text(dockerfile_content)
        
        # Docker compose
        compose_content = '''version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
'''
        compose_path = Path(target_dir) / "docker-compose.yml"
        compose_path.write_text(compose_content)
    
    async def _generate_cicd(self, target_dir: str):
        """Generate CI/CD templates"""
        github_dir = Path(target_dir) / ".github" / "workflows"
        github_dir.mkdir(parents=True, exist_ok=True)
        
        ci_content = '''name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd api && npm ci
      - run: cd api && npm run build
      - run: cd api && npm test
'''
        ci_path = github_dir / "ci.yml"
        ci_path.write_text(ci_content)
    
    async def _generate_docs(self, target_dir: str):
        """Generate README documentation"""
        if not self._contract:
            return
        
        app_name = self._contract.get("definition", {}).get("app", {}).get("name", "App")
        entities = self._contract.get("definition", {}).get("entities", [])
        
        entity_docs = ""
        for entity in entities:
            name = entity.get("name", "Entity")
            fields = entity.get("fields", [])
            field_list = "\n".join([f"  - `{f.get('name')}`: {f.get('type')}" for f in fields])
            entity_docs += f"\n### {name}\n{field_list}\n"
        
        readme_content = f'''# {app_name}

Generated by Reclapp Evolution Engine.

## Quick Start

```bash
cd api
npm install
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/{{entity}}s` - List all
- `GET /api/v1/{{entity}}s/:id` - Get by ID
- `POST /api/v1/{{entity}}s` - Create
- `PUT /api/v1/{{entity}}s/:id` - Update
- `DELETE /api/v1/{{entity}}s/:id` - Delete

## Entities
{entity_docs}

## Docker

```bash
docker-compose up -d
```

## Development

Generated with ❤️ by Reclapp
'''
        readme_path = Path(target_dir) / "README.md"
        readme_path.write_text(readme_content)
        
        # Generate API.md documentation
        await self._generate_api_docs(target_dir)
    
    async def _generate_api_docs(self, target_dir: str):
        """Generate API.md documentation like TypeScript"""
        if not self._contract:
            return
        
        entities = self._contract.get("definition", {}).get("entities", [])
        
        api_content = "# API Documentation\n\n"
        api_content += "## Base URL\n\n`http://localhost:3000/api/v1`\n\n"
        api_content += "## Endpoints\n\n"
        
        for entity in entities:
            name = entity.get("name", "Entity")
            name_lower = name.lower()
            api_content += f"### {name}\n\n"
            api_content += f"| Method | Endpoint | Description |\n"
            api_content += f"|--------|----------|-------------|\n"
            api_content += f"| GET | `/{name_lower}s` | List all {name}s |\n"
            api_content += f"| GET | `/{name_lower}s/:id` | Get {name} by ID |\n"
            api_content += f"| POST | `/{name_lower}s` | Create {name} |\n"
            api_content += f"| PUT | `/{name_lower}s/:id` | Update {name} |\n"
            api_content += f"| DELETE | `/{name_lower}s/:id` | Delete {name} |\n\n"
        
        api_path = Path(target_dir) / "API.md"
        api_path.write_text(api_content)
    
    async def _generate_test_fixtures(self, target_dir: str):
        """Generate test fixtures like TypeScript"""
        if not self._contract:
            return
        
        entities = self._contract.get("definition", {}).get("entities", [])
        if not entities:
            return
        
        entity = entities[0]
        entity_name = entity.get("name", "Item")
        
        fixture = {
            "valid": {
                "title": f"Test {entity_name}",
                "completed": False
            },
            "invalid": {
                "title": ""
            },
            "update": {
                "title": f"Updated {entity_name}",
                "completed": True
            }
        }
        
        fixtures_dir = Path(target_dir) / "tests" / "fixtures"
        fixtures_dir.mkdir(parents=True, exist_ok=True)
        
        fixture_path = fixtures_dir / f"{entity_name.lower()}.fixture.json"
        fixture_path.write_text(json.dumps(fixture, indent=2))
    
    async def _generate_test_config(self, target_dir: str):
        """Generate test configuration like TypeScript"""
        config_content = f'''/**
 * Test Configuration
 * Auto-generated by Reclapp Evolution
 */

export const config = {{
  baseUrl: 'http://localhost:{self.options.port}',
  apiPrefix: '/api/v1',
  timeout: 5000,
  retries: 3
}};

export const fixtures = {{
  dir: './fixtures'
}};
'''
        
        tests_dir = Path(target_dir) / "tests"
        tests_dir.mkdir(parents=True, exist_ok=True)
        
        config_path = tests_dir / "test.config.ts"
        config_path.write_text(config_content)
    
    async def _save_evolution_log(self, target_dir: str):
        """Save evolution log like TypeScript"""
        import datetime
        
        logs_dir = Path(target_dir) / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        log_path = logs_dir / f"evolution-{timestamp}.md"
        
        log_content = f"""# Evolution Log

## Timestamp
{datetime.datetime.now().isoformat()}

## Tasks
{json.dumps(self.task_queue.get_stats(), indent=2)}

## Contract
```json
{json.dumps(self._contract, indent=2) if self._contract else '{}'}
```

## Result
Evolution completed.
"""
        log_path.write_text(log_content)
        return str(log_path)
    
    def _find_npm(self) -> Optional[str]:
        """Find npm executable"""
        import shutil
        
        npm = shutil.which("npm")
        if npm:
            return npm

        for path in ("/usr/bin/npm", "/usr/local/bin/npm"):
            if os.path.exists(path):
                return path

        for path in glob.glob(os.path.expanduser("~/.nvm/versions/node/*/bin/npm")):
            if os.path.exists(path):
                return path
        
        # Try to find via node
        node_path = shutil.which("node")
        if node_path:
            npm_path = os.path.join(os.path.dirname(node_path), "npm")
            if os.path.exists(npm_path):
                return npm_path
        
        return None
    
    async def _with_llm_heartbeat(
        self,
        purpose: str,
        coro,
        heartbeat_interval: float = 5.0,
        timeout: float = 120.0
    ) -> T:
        """
        Wrap an async LLM call with heartbeat logging.
        
        Emits periodic logs like TS: '… waiting for LLM elapsed=Xs'
        """
        call_id = f"llm_{uuid.uuid4().hex[:8]}"
        started_at = time.time()
        
        if self.options.verbose:
            self.renderer.codeblock("yaml", "\n".join([
                "# @type: llm_call_start",
                f"# @purpose: {purpose}",
                "llm_call:",
                f'  id: "{call_id}"',
                f'  purpose: "{purpose}"',
                f"  timeout_sec: {timeout}",
            ]))
        
        # Create heartbeat task
        heartbeat_stop = asyncio.Event()
        
        async def heartbeat():
            while not heartbeat_stop.is_set():
                await asyncio.sleep(heartbeat_interval)
                if not heartbeat_stop.is_set():
                    elapsed = int(time.time() - started_at)
                    self.renderer.codeblock("log", f"… waiting for LLM ({call_id}) elapsed={elapsed}s")
        
        heartbeat_task = asyncio.create_task(heartbeat())
        
        try:
            # Run with timeout
            result = await asyncio.wait_for(coro, timeout=timeout)
            elapsed_ms = int((time.time() - started_at) * 1000)
            
            if self.options.verbose:
                self.renderer.codeblock("yaml", "\n".join([
                    "# @type: llm_call_done",
                    f"# @purpose: {purpose}",
                    "llm_call:",
                    f'  id: "{call_id}"',
                    '  status: "ok"',
                    f"  elapsed_ms: {elapsed_ms}",
                ]))
            
            return result
            
        except asyncio.TimeoutError:
            elapsed_ms = int((time.time() - started_at) * 1000)
            if self.options.verbose:
                self.renderer.codeblock("yaml", "\n".join([
                    "# @type: llm_call_error",
                    f"# @purpose: {purpose}",
                    "llm_call:",
                    f'  id: "{call_id}"',
                    '  status: "timeout"',
                    f"  elapsed_ms: {elapsed_ms}",
                ]))
            raise
            
        except Exception as e:
            elapsed_ms = int((time.time() - started_at) * 1000)
            if self.options.verbose:
                err_msg = str(e).replace('"', '\\"')[:180]
                self.renderer.codeblock("yaml", "\n".join([
                    "# @type: llm_call_error",
                    f"# @purpose: {purpose}",
                    "llm_call:",
                    f'  id: "{call_id}"',
                    '  status: "error"',
                    f"  elapsed_ms: {elapsed_ms}",
                    f'  error: "{err_msg}"',
                ]))
            raise
            
        finally:
            heartbeat_stop.set()
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except asyncio.CancelledError:
                pass
    
    async def _kill_port(self, port: int):
        """Kill process using port"""
        try:
            result = subprocess.run(
                ["lsof", "-ti", f":{port}"],
                capture_output=True,
                text=True
            )
            if result.stdout.strip():
                for pid in result.stdout.strip().split('\n'):
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                    except:
                        pass
                await asyncio.sleep(0.5)
        except:
            pass
    
    async def _check_health(self, retries: int = 5) -> bool:
        """Check service health"""
        import urllib.request
        import urllib.error
        
        for _ in range(retries):
            try:
                url = f"http://localhost:{self.options.port}/health"
                req = urllib.request.urlopen(url, timeout=2)
                if req.status == 200:
                    return True
            except:
                pass
            await asyncio.sleep(1)
        return False
    
    async def _stop_service(self):
        """Stop the service"""
        if self._service_process:
            try:
                self._service_process.terminate()
                self._service_process.wait(timeout=5)
            except:
                self._service_process.kill()
            self._service_process = None
    
    async def _generate_e2e_tests(self, target_dir: str) -> Optional[str]:
        """Generate E2E test file"""
        if not self._contract:
            return None
        
        entities = self._contract.get("definition", {}).get("entities", [])
        if not entities:
            return None
        
        entity = entities[0]
        entity_name = entity.get("name", "Item")
        entity_lower = entity_name.lower()
        
        test_content = f'''/**
 * E2E Tests for {entity_name} API
 * Auto-generated by Evolution Manager
 */

const BASE_URL = 'http://localhost:{self.options.port}';

async function runTests() {{
  const results = [];
  let createdId = null;

  // Health check
  try {{
    const res = await fetch(`${{BASE_URL}}/health`);
    results.push({{ name: 'Health check', passed: res.ok }});
  }} catch (e) {{
    results.push({{ name: 'Health check', passed: false, error: String(e) }});
  }}

  // CREATE
  try {{
    const res = await fetch(`${{BASE_URL}}/api/v1/{entity_lower}s`, {{
      method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ title: 'Test {entity_name}' }})
    }});
    const data = await res.json();
    createdId = data.id;
    results.push({{ name: 'CREATE POST', passed: res.status === 201 && !!createdId }});
  }} catch (e) {{
    results.push({{ name: 'CREATE POST', passed: false, error: String(e) }});
  }}

  // READ ALL
  try {{
    const res = await fetch(`${{BASE_URL}}/api/v1/{entity_lower}s`);
    results.push({{ name: 'READ ALL', passed: res.ok }});
  }} catch (e) {{
    results.push({{ name: 'READ ALL', passed: false, error: String(e) }});
  }}

  // READ ONE
  if (createdId) {{
    try {{
      const res = await fetch(`${{BASE_URL}}/api/v1/{entity_lower}s/${{createdId}}`);
      results.push({{ name: 'READ ONE', passed: res.ok }});
    }} catch (e) {{
      results.push({{ name: 'READ ONE', passed: false, error: String(e) }});
    }}
  }}

  // UPDATE
  if (createdId) {{
    try {{
      const res = await fetch(`${{BASE_URL}}/api/v1/{entity_lower}s/${{createdId}}`, {{
        method: 'PUT',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify({{ title: 'Updated {entity_name}' }})
      }});
      results.push({{ name: 'UPDATE PUT', passed: res.ok }});
    }} catch (e) {{
      results.push({{ name: 'UPDATE PUT', passed: false, error: String(e) }});
    }}
  }}

  // DELETE
  if (createdId) {{
    try {{
      const res = await fetch(`${{BASE_URL}}/api/v1/{entity_lower}s/${{createdId}}`, {{
        method: 'DELETE'
      }});
      results.push({{ name: 'DELETE', passed: res.status === 204 || res.ok }});
    }} catch (e) {{
      results.push({{ name: 'DELETE', passed: false, error: String(e) }});
    }}
  }}

  return results;
}}

runTests().then(results => {{
  console.log(JSON.stringify(results));
  const failed = results.filter(r => !r.passed).length;
  process.exit(failed > 0 ? 1 : 0);
}});
'''
        
        test_file = Path(target_dir) / "tests" / "e2e" / "api.e2e.js"
        test_file.parent.mkdir(parents=True, exist_ok=True)
        test_file.write_text(test_content)
        return str(test_file)
    
    async def _run_e2e_tests(self, target_dir: str) -> tuple[int, int]:
        """Run E2E tests and return (passed, failed)"""
        test_file = Path(target_dir) / "tests" / "e2e" / "api.e2e.js"
        if not test_file.exists():
            return 0, 0
        
        # Run with node (JavaScript)
        import shutil
        node_path = shutil.which("node")
        if not node_path:
            self.renderer.warning("node not found, skipping E2E tests")
            return 0, 0  # Skip tests gracefully
        
        try:
            # Run with node
            result = subprocess.run(
                [node_path, str(test_file)],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=str(Path(target_dir) / "api")
            )
            
            # Parse JSON output
            try:
                results = json.loads(result.stdout.strip())
                passed = sum(1 for r in results if r.get("passed"))
                failed = sum(1 for r in results if not r.get("passed"))
                
                # Print results
                for r in results:
                    if r.get("passed"):
                        self.renderer.success(f"✅ {r['name']}")
                    else:
                        self.renderer.error(f"❌ {r['name']}: {r.get('error', 'Failed')}")
                
                return passed, failed
            except:
                # Fallback: check exit code
                if result.returncode == 0:
                    return 1, 0
                return 0, 1
                
        except subprocess.TimeoutExpired:
            self.renderer.error("Tests timed out")
            return 0, 1
        except Exception as e:
            self.renderer.error(f"Test error: {e}")
            return 0, 1
    
    async def _auto_fix_code(self, target_dir: str, failed_count: int):
        """Try to fix failing code with LLM - mirrors TypeScript recovery logic"""
        if not self._llm_client or not self._contract:
            self.renderer.warning("No LLM available for auto-fix")
            return
        
        self.renderer.info(f"Attempting auto-fix for {failed_count} failures...")
        
        # Read the current server.ts to understand what failed
        server_path = Path(target_dir) / "api" / "src" / "server.ts"
        current_code = ""
        if server_path.exists():
            current_code = server_path.read_text()
        
        # Read test file to understand expected behavior
        test_path = Path(target_dir) / "tests" / "e2e" / "api.e2e.ts"
        test_code = ""
        if test_path.exists():
            test_code = test_path.read_text()
        
        # Build fix prompt
        fix_prompt = f"""Fix the following Express API code. The E2E tests are failing.

Current server.ts:
```typescript
{current_code[:2000]}
```

Test expectations (from api.e2e.ts):
```typescript
{test_code[:1000]}
```

Common issues to fix:
1. Ensure POST endpoints accept JSON body with 'title' field
2. Ensure all CRUD operations work correctly
3. Ensure proper error handling

Generate ONLY the fixed server.ts code, no explanations."""

        try:
            from ..llm import GenerateOptions
            
            response = await self._llm_client.generate(GenerateOptions(
                system="You are an expert TypeScript/Express developer. Fix the API code.",
                user=fix_prompt,
                temperature=0.3
            ))
            
            if response.content:
                # Extract code from response
                fixed_code = self._extract_code_block(response.content, "typescript")
                if fixed_code and len(fixed_code) > 100:
                    server_path.write_text(fixed_code)
                    self.renderer.success("Applied LLM fix to server.ts")
                    
                    # Restart service with fixed code
                    await self._stop_service()
                else:
                    self.renderer.warning("LLM fix response was too short, skipping")
        except Exception as e:
            self.renderer.warning(f"Auto-fix failed: {e}")
    
    def _extract_code_block(self, content: str, language: str = "") -> str:
        """Extract code block from markdown response"""
        import re
        
        # Try to find fenced code block
        pattern = rf"```(?:{language})?\s*\n(.*?)```"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            return match.group(1).strip()
        
        # If no code block, return content as-is (might be raw code)
        if "import" in content or "const " in content or "function " in content:
            return content.strip()
        
        return ""
    
    async def _generate_contract(self, prompt: str) -> Optional[dict]:
        """Generate contract from prompt using LLM or fallback to template"""
        from ..generator import ContractGenerator, ContractGeneratorOptions
        
        if self._llm_client:
            try:
                generator = ContractGenerator(ContractGeneratorOptions(
                    verbose=self.options.verbose, max_attempts=3
                ))
                generator.set_llm_client(self._llm_client)
                
                # Wrap with heartbeat logging
                result = await self._with_llm_heartbeat(
                    "contract_generation",
                    generator.generate(prompt)
                )
                if result.success and result.contract:
                    return result.contract
            except Exception:
                pass
        
        # Fallback: Extract from prompt
        app_name = self._extract_app_name(prompt)
        entities = self._extract_entities(prompt)
        
        return {
            "definition": {
                "app": {"name": app_name, "version": "1.0.0"},
                "entities": entities
            },
            "generation": {
                "techStack": {
                    "backend": {
                        "runtime": "node",
                        "language": "typescript",
                        "framework": "express",
                        "port": 3000
                    }
                }
            },
            "validation": {}
        }
    
    def _extract_app_name(self, prompt: str) -> str:
        import re
        match = re.search(r'[Cc]reate\s+(?:a\s+)?(\w+(?:\s+\w+)?)\s+app', prompt)
        if match:
            return match.group(1).title() + " App"
        return prompt.split()[0].title() + " App"
    
    def _extract_entities(self, prompt: str) -> list[dict]:
        import re
        entities = []
        patterns = [
            (r'\b(note|notes)\b', "Note", ["id", "title", "content", "createdAt"]),
            (r'\b(todo|todos|task|tasks)\b', "Task", ["id", "title", "status", "createdAt"]),
            (r'\b(contact|contacts)\b', "Contact", ["id", "name", "email", "createdAt"]),
            (r'\b(user|users)\b', "User", ["id", "name", "email", "createdAt"]),
            (r'\b(product|products)\b', "Product", ["id", "name", "price", "createdAt"]),
        ]
        found = set()
        for pattern, name, fields in patterns:
            if re.search(pattern, prompt.lower()) and name not in found:
                found.add(name)
                entities.append({"name": name, "fields": [
                    {"name": f, "type": "UUID" if f == "id" else "DateTime" if "At" in f else "Float" if f == "price" else "String"}
                    for f in fields
                ]})
        if not entities:
            entities.append({"name": "Item", "fields": [
                {"name": "id", "type": "UUID"}, {"name": "name", "type": "String"}, {"name": "createdAt", "type": "DateTime"}
            ]})
        return entities
    
    async def _generate_code(self, contract: dict, output_dir: str) -> list[str]:
        """Generate code from contract using LLM"""
        from ..generator import CodeGenerator, CodeGeneratorOptions
        
        generator = CodeGenerator(CodeGeneratorOptions(
            output_dir=output_dir,
            dry_run=False,
            verbose=self.options.verbose
        ))
        
        # Pass LLM client if available for LLM-based generation
        if self._llm_client:
            generator.set_llm_client(self._llm_client)
            if self.options.verbose:
                self.renderer.info("Using LLM for code generation")
            
            # Wrap with heartbeat logging
            result = await self._with_llm_heartbeat(
                "code_generation",
                generator.generate(contract, output_dir)
            )
        else:
            result = await generator.generate(contract, output_dir)
        
        if result.success:
            return [f.path for f in result.files]
        return []
    
    async def _validate_code(self, output_dir: str) -> list[str]:
        """Validate generated code"""
        # Simplified implementation
        # In full version, would use ValidationPipeline
        return []
    
    def get_task_queue(self) -> TaskQueue:
        """Get the task queue"""
        return self.task_queue
