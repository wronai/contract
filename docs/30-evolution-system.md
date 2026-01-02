# Evolution System

> Dynamic code generation, monitoring, and self-healing for Contract AI applications

**Related docs:** [Architecture Overview](00-architecture-overview.md) | [Code Generation](31-code-generation.md) | [CLI Reference](cli-reference.md)

---

## Overview

The Evolution System enables continuous improvement of generated applications through:

1. **Dynamic Code Generation** - Generate code from natural language prompts
2. **Service Monitoring** - Health checks and log analysis
3. **Auto-Fix Cycles** - Detect and fix issues automatically
4. **Evolution History** - Track all changes in `.rcl.md` logs

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

> Generated by Reclapp Evolution Manager v2.3.1

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

## Task Queue (NEW in 2.4.1)

The evolution system now shows live task status in YAML format:

```yaml
## Config

evolution:
  prompt: "Create a todo app"
  output: "./output"
  port: 3000

🔄 Parse prompt & create contract
✅ Parse prompt & create contract (0s)
🔄 Generate code with LLM
✅ Generate code with LLM (20s)
🔄 Write files to disk
✅ Write files to disk (0s)
🔄 Install dependencies
🔄 Start service
✅ Install dependencies (7s)
✅ Start service (7s)
🔄 Health check
✅ Health check (0s)
```

### Dynamic Task Adding

When issues are detected (e.g., missing LLM model), tasks are added dynamically:

```yaml
❌ Pull LLM model: qwen2.5-coder:14b
   └─ Run: ollama pull qwen2.5-coder:14b
🔄 Use fallback code generator
✅ Use fallback code generator (0s)
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

## Related Documentation

- [Architecture Overview](00-architecture-overview.md)
- [Code Generation](31-code-generation.md)
- [Contract AI](contract-ai.md)
- [CLI Reference](cli-reference.md)
- [Testing Guide](21-testing-guide.md)
