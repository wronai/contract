# Evolution System

> Dynamic code generation, monitoring, and self-healing for Contract AI applications

**Version:** 2.2.0  
**Related docs:** [Architecture Overview](00-architecture-overview.md) | [Code Generation](31-code-generation.md) | [CLI Reference](cli-reference.md)

---

## Overview

The Evolution System enables continuous improvement of generated applications through:

1. **LLM-Powered Code Generation** - All code generated dynamically by LLM with fallbacks
2. **Multi-Level State Analysis** - Contract ↔ Code ↔ Service ↔ Logs verification
3. **CodeRAG Navigation** - Semantic code search and hierarchical indexing
4. **Git Integration** - Import existing projects, track state via Git
5. **Auto-Fix & Recovery** - 4-level error recovery system
6. **Evolution History** - Track all changes in `.rcl.md` logs

---

## Quick Start

```bash
# Basic evolution from prompt
./bin/reclapp evolve --prompt "Create a todo app with tasks and categories"

# Keep running with continuous monitoring
./bin/reclapp evolve --prompt "Create a CRM system" -k

# Custom port and output directory
./bin/reclapp evolve --prompt "Create a notes app" --port 4000 -o ./my-app
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVOLUTION MANAGER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │    Prompt    │────▶│   Contract   │────▶│     Code     │   │
│  │    Input     │     │   Creation   │     │  Generation  │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│                                                   │             │
│                                                   ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐   │
│  │   Auto-Fix   │◀────│     Log      │◀────│   Service    │   │
│  │    Cycle     │     │   Analysis   │     │   Monitor    │   │
│  └──────────────┘     └──────────────┘     └──────────────┘   │
│         │                                         ▲             │
│         │              ┌──────────────┐           │             │
│         └─────────────▶│   Service    │───────────┘             │
│                        │   Restart    │                         │
│                        └──────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Entity Extraction

**File:** `src/core/contract-ai/evolution/evolution-manager.ts`

Extracts entities from natural language prompts using:

- **Domain keywords** - contact, company, task, todo, note, etc.
- **Pattern matching** - "managing X", "X with fields"
- **Fallback** - Default to "Item" if no entities found

```typescript
// Example: "Create a CRM system with contacts and companies"
// Extracted entities: Contact, Company
```

**Supported domain entities:**
- Contact, Company, Deal (CRM)
- Task, Todo, Category (Project management)
- Note, Post, Article, Comment (Content)
- User, Customer, Employee (People)
- Product, Order, Invoice (E-commerce)
- Booking, Event, Ticket (Scheduling)

---

### 2. Contract Creation

Creates a `ContractAI` object with:

```typescript
{
  definition: {
    app: { name, version, description },
    entities: [...],    // Extracted entities
    api: { resources }  // CRUD endpoints
  },
  generation: {
    techStack: {
      backend: { framework: 'express', language: 'typescript' },
      frontend: { framework: 'react', styling: 'tailwind' }
    }
  }
}
```

---

### 3. Code Generation

Generates 3 architecture layers:

| Layer | Files | Purpose |
|-------|-------|---------|
| **API** | `api/src/server.ts` | Express REST API |
| **Tests** | `tests/api.test.ts` | Jest + Supertest |
| **Frontend** | `frontend/src/App.tsx` | React + Tailwind |

**For each entity, generates:**
- GET `/api/v1/{entities}` - List all
- GET `/api/v1/{entities}/:id` - Get by ID
- POST `/api/v1/{entities}` - Create
- PUT `/api/v1/{entities}/:id` - Update
- DELETE `/api/v1/{entities}/:id` - Delete

---

### 4. Service Lifecycle

```
┌─────────────┐
│  Generate   │
│    Code     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Install   │  npm install
│    Deps     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Start     │  npx ts-node src/server.ts
│  Service    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Health    │  GET /health every 5s
│   Check     │
└─────────────┘
```

---

### 5. Monitoring & Auto-Fix

**Health Check** (every 5 seconds):
```typescript
GET http://localhost:{port}/health
// Expected: { status: 'ok', timestamp: '...' }
```

**Log Analysis** (every 10 seconds):
- Detects errors and warnings in service logs
- Triggers auto-fix cycle when issues found

**Auto-Fix Cycle:**
1. Stop current service
2. Regenerate problematic code
3. Reinstall dependencies
4. Restart service
5. Log evolution cycle

---

## Evolution Logs

All evolution cycles are logged to `generated/logs/evolution_*.rcl.md`:

```markdown
# Evolution Log

> Generated by Reclapp Evolution Manager v2.2.0

## Summary

| Property | Value |
|----------|-------|
| Total Cycles | 2 |
| Service Port | 3000 |

## Evolution History

### Cycle 0 - initial
- **Timestamp**: 2026-01-02T09:00:00.000Z
- **Result**: success
- **Changes**: 11 files

### Cycle 1 - error
- **Timestamp**: 2026-01-02T09:05:00.000Z
- **Trigger**: TypeScript compilation error
- **Result**: success
- **Changes**: 1 file (api/src/server.ts)
```

---

## CLI Options

```bash
./bin/reclapp evolve [options]

Options:
  --prompt, -p <text>   Natural language prompt (required)
  --output, -o <dir>    Output directory (default: ./generated)
  --port <port>         API server port (default: 3000)
  --keep-running, -k    Keep service running after generation
  --verbose, -v         Verbose output
```

---

## Configuration

**Default options:**

| Option | Default | Description |
|--------|---------|-------------|
| `outputDir` | `./generated` | Where to write files |
| `port` | `3000` | API server port |
| `maxEvolutionCycles` | `10` | Max auto-fix attempts |
| `healthCheckInterval` | `5000` | Health check frequency (ms) |
| `logAnalysisInterval` | `10000` | Log analysis frequency (ms) |
| `autoRestart` | `true` | Auto-restart on errors |

---

## Example Prompts

See `examples/prompts/` for ready-to-use prompts:

| File | Description | Entities |
|------|-------------|----------|
| `01-notes-app.txt` | Notes application | Note |
| `02-todo-app.txt` | Todo with categories | Task, Category |
| `03-contacts-crm.txt` | CRM system | Contact, Company, Deal |
| `04-inventory.txt` | Inventory management | Product, Category |
| `05-booking.txt` | Room booking | Booking, Room |

```bash
# Run from example prompt file
./bin/reclapp evolve --prompt "$(cat examples/prompts/03-contacts-crm.txt)"
```

---

## Troubleshooting

### Port already in use

```bash
# Kill existing process
pkill -f "ts-node"
# Or use different port
./bin/reclapp evolve --prompt "..." --port 4000
```

### TypeScript compilation errors

The evolution manager will automatically:
1. Detect the error from logs
2. Regenerate code using fallback templates
3. Restart the service

### Dependencies not installing

Check that npm is in PATH. The evolution manager looks for npm in:
- `~/.nvm/versions/node/v20.19.5/bin`
- `~/.nvm/versions/node/v18.20.8/bin`
- `/usr/local/bin`
- `/usr/bin`

---

## Task Queue (v2.5.0)

The evolution system shows granular LLM-centric tasks with human-readable narration:

```yaml
# @type: task_queue
progress:
  done: 0
  total: 16
tasks:
  - name: "Create output folders"
  - name: "Create evolution state file"
  - name: "Parse prompt into contract"
  - name: "Save contract.ai.json"
  - name: "Validate plan against contract"
  - name: "Ask LLM for API code"
  - name: "Save API files from LLM"
  - name: "Validate API output"
  - name: "Install API dependencies"
  - name: "Start API service"
  - name: "Health check API"
  - name: "Generate E2E tests"
  - name: "Run E2E tests"
  - name: "Validate layer2 targets"
  - name: "Verify contract ↔ code ↔ service"
  - name: "Reconcile discrepancies"
```

### Human-Readable Narration

Each task includes context:

```
→ Creating project structure: Setting up output directories for API, tests, contract, and state
→ Parsing user prompt: Extracting entities and requirements from: "Create a todo app..."
→ Requesting code from LLM: Sending contract and context to generate API implementation
→ Multi-level verification: Analyzing Contract ↔ SourceCode ↔ Service ↔ Logs
```

---

## Multi-Level State Analysis (NEW)

Detects discrepancies between Contract, SourceCode, Service, and Logs:

```
┌─────────────────────────────────────────┐
│          CONTRACT (contract.ai.json)    │
│  entities: [Todo], endpoints: 6         │
└─────────────────┬───────────────────────┘
                  │ ↕ verify
┌─────────────────▼───────────────────────┐
│          SOURCE CODE (api/src/*)        │
│  files: 4, detected_endpoints: 6        │
└─────────────────┬───────────────────────┘
                  │ ↕ verify
┌─────────────────▼───────────────────────┐
│          SERVICE (localhost:3000)       │
│  running: true, health: true            │
└─────────────────┬───────────────────────┘
                  │ ↕ verify
┌─────────────────▼───────────────────────┐
│          LOGS (output/logs/*)           │
│  errors: 0, warnings: 0                 │
└─────────────────────────────────────────┘
```

### Discrepancy Detection

```yaml
# @type: discrepancies
discrepancies:
  - level: "contract-code"
    severity: "error"
    expected: "Entity 'Todo' defined in contract"
    actual: "Entity not found in source code"
    suggestion: "Add Todo model and CRUD endpoints"
```

---

## CodeRAG Navigation (NEW)

Semantic code search and hierarchical indexing:

```typescript
// Initialize CodeRAG
await evolutionManager.initCodeRAG();

// Ask questions about code
const result = await evolutionManager.askCode("Where is auth handled?");

// Find symbol usages
const usages = evolutionManager.findSymbolUsages("validateTodo");

// Get code structure
const structure = evolutionManager.getCodeStructure();
```

### Hierarchical Levels

```
Level 0: Modules (directories)
  └── api/src (5 items)
  └── tests/e2e (3 items)

Level 1: Files
  └── server.ts
  └── todo.service.ts

Level 2: Symbols (functions/classes)
  └── createTodo()
  └── TodoService
```

---

## Git Integration (NEW)

Import existing projects and track state via Git:

```typescript
// Import from existing Git repo
await evolutionManager.importFromGit('/path/to/project');

// Get Git state
const gitState = evolutionManager.getGitState();
```

### Evolution State with Git

```json
{
  "mode": "import",
  "git": {
    "branch": "main",
    "lastCommit": { "hash": "abc123", "message": "feat: add API" },
    "detectedStack": {
      "language": "typescript",
      "framework": "express"
    }
  }
}
```

---

## 4-Level Error Recovery (NEW)

```
Level 1: Heuristic fixes (instant, pattern-based)
    ↓ if failed
Level 2: Registry fixes (reusable LLM-generated fixes)
    ↓ if failed
Level 3: Fallback generators (deterministic templates)
    ↓ if failed
Level 4: LLM fix request (ask LLM for solution)
```

---

## LLM-Powered Generation

All code is now generated by LLM with fallback templates:

| Component | LLM Prompt | Fallback |
|-----------|------------|----------|
| Server code | Dynamic based on contract | `getFallbackServerCode()` |
| E2E tests | Based on entity & endpoints | `getFallbackE2ETests()` |
| Test config | Based on port & layers | `getFallbackTestConfig()` |
| Fixtures | Based on entity schema | `getFallbackFixtures()` |

### Endpoint Detection

Tests automatically detect actual endpoints from generated code:

```typescript
// Detects /api/v1/todos from server.ts
const { basePath } = this.detectApiEndpoints(pluralName);
// basePath = "/api/v1/todos"
```

---

## Task Executor

Run tasks from Dockerfile-style files:

```bash
# Run tasks
./bin/reclapp tasks build.tasks

# Watch mode
./bin/reclapp tasks build.tasks --watch

# Parallel workers
./bin/reclapp tasks build.tasks --workers 5
```

### Task File Format

```bash
# build.tasks
echo "Setup"
npm install
npm run build  # timeout: 120
npm test
```

---

## Generated Files

Both TypeScript and Python implementations now generate identical file structures:

| File | Description |
|------|-------------|
| `Dockerfile` | Root production Dockerfile |
| `docker-compose.yml` | Docker Compose with API service |
| `.github/workflows/ci.yml` | GitHub Actions CI workflow |
| `api/src/server.ts` | Express API server |
| `api/package.json` | API dependencies |
| `api/tsconfig.json` | TypeScript config |
| `api/prisma/schema.prisma` | Prisma database schema |
| `api/.env` | Environment variables |
| `frontend/src/App.tsx` | React frontend |
| `frontend/package.json` | Frontend dependencies |
| `tests/e2e/api.e2e.ts` | E2E API tests |
| `tests/fixtures/*.json` | Test fixtures |
| `tests/test.config.ts` | Test configuration |
| `state/evolution-state.json` | Evolution state |
| `state/multi-level-state.json` | Multi-level analysis snapshot |
| `contract/contract.ai.json` | Generated contract |
| `logs/evolution-*.md` | Evolution logs |
| `README.md` | Project documentation |
| `API.md` | API documentation |

### Python CLI

```bash
# Install Python CLI
pip install -e src/python

# Run evolution
python -m reclapp.cli evolve -p "Create a todo app" -o ./output

# With interactive menu
python -m reclapp.cli evolve -p "Create a todo app" -o ./output --keep-running
```

---

## Related Documentation

- [Architecture Overview](00-architecture-overview.md)
- [Code Generation](31-code-generation.md)
- [Contract AI](contract-ai.md)
- [CLI Reference](cli-reference.md)
- [Testing Guide](21-testing-guide.md)
