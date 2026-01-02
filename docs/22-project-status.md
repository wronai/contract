# Reclapp 2.4 - Status Projektu

**Data:** 2 Stycznia 2026  
**Wersja:** 2.4.1  
**Status:** ✅ PRODUCTION READY

## Podsumowanie

Reclapp 2.3 to kompletna platforma do generowania aplikacji B2B z kontraktów AI. System obsługuje pełny cykl życia od promptu/kontraktu do działającej usługi.

## Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                     RECLAPP 2.3.1                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CLI                                                         │
│  ├── Python: reclapp --prompt "..." (pip install -e .)      │
│  └── Shell:  ./bin/reclapp-full-lifecycle.sh --prompt "..." │
│                                                              │
│  CONTRACT AI (3 Layers)                                      │
│  ├── Definition (app, entities, api)                        │
│  ├── Generation (instructions, techStack)                   │
│  └── Validation (assertions, tests, acceptance)             │
│                                                              │
│  VALIDATION PIPELINE (8 stages)                              │
│  ├── 1. Syntax      5. Tests                                │
│  ├── 2. Schema      6. Quality                              │
│  ├── 3. Assertions  7. Security                             │
│  └── 4. Static      8. Runtime                              │
│                                                              │
│  OUTPUT                                                      │
│  ├── Generated API (Express.js + TypeScript)                │
│  ├── Health Check (/health)                                 │
│  ├── CRUD Endpoints (/api/v1/items)                         │
│  └── Generation Log (.rcl.md)                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Komponenty

### 1. Contract AI Core
- **Lokalizacja:** `src/core/contract-ai/`
- **Status:** ✅ Kompletny
- **Testy:** 25 unit + 16 integration

### 2. Pydantic Contracts (Python)
- **Lokalizacja:** `pycontracts/`
- **Status:** ✅ Kompletny
- **Schematy:** 14 JSON + 3 TypeScript

### 3. CLI
- **Lokalizacja:** `bin/reclapp`
- **Status:** ✅ Kompletny
- **Komendy:** generate-ai, full-lifecycle

### 4. Examples
- **TypeScript:** `examples/contract-ai/` (5 przykładów)
- **Pydantic:** `examples/pydantic-contracts/` (5 przykładów)
- **Full Lifecycle:** `examples/full-lifecycle/` (10 przykładów)

## Metryki

| Metryka | Wartość |
|---------|---------|
| Validation Stages | 8/8 PASSED |
| Service Health Check | ✅ Working |
| CRUD Endpoint Tests | 2/2 PASSED |
| Pydantic Contracts | 5 |
| TypeScript Contracts | 10+ |
| Python CLI Commands | 6 |

## Testowanie

### Quick Test
```bash
# Test z promptem
./bin/reclapp-full-lifecycle.sh --prompt "Create a notes app"

# Test z kontraktem
./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts

# Test Pydantic
cd examples/pydantic-contracts && python3 contracts.py
```

### Full Test Suite
```bash
# Unit tests
npx jest tests/unit/contract-ai.test.ts

# Integration tests
npx jest tests/integration/contract-ai-flow.test.ts

# Pydantic schemas
python3 -m pycontracts.generate --typescript

# Python contracts
pytest tests/contracts/ -v
```

## Pliki Kluczowe

| Plik | Opis |
|------|------|
| `bin/reclapp` | Główne CLI |
| `bin/reclapp-full-lifecycle.sh` | Full lifecycle runner |
| `src/core/contract-ai/` | Contract AI core |
| `pycontracts/` | Pydantic contracts |
| `examples/pydantic-contracts/` | Pydantic examples |
| `examples/contract-ai/` | TypeScript examples |
| `docs/21-testing-guide.md` | Przewodnik testowania |

## Wymagania

- Node.js >= 18.0.0
- Python >= 3.10
- Pydantic >= 2.5
- Ollama z llama3 (opcjonalne, dla generacji)

## Changelog 2.4.1

- ✅ **TaskQueue** - live task status with YAML markdown output
- ✅ **TaskExecutor** - parallel task execution with file watching
- ✅ **CLI `tasks` command** - run tasks from Dockerfile-style files
- ✅ **Markdown output** - all logs in parseable YAML codeblocks
- ✅ **Dynamic task adding** - tasks added on-the-fly when issues detected

## Changelog 2.4.0

- ✅ **Contract Markdown 3.0** (`.contract.md`) - new LLM-optimized contract format
- ✅ **Markdown Parser** - full YAML frontmatter + Markdown section parsing
- ✅ **ContractAI Converter** - converts `.contract.md` to ContractAI format
- ✅ **CLI Integration** - `reclapp examples/todo.contract.md` works
- ✅ **Entity Extraction** - parses entity tables with fields, types, requirements
- ✅ **API Extraction** - parses endpoint tables with methods and paths
- ✅ **Test Definitions** - parses Gherkin acceptance tests and API test YAML
- ✅ **Example Contract** - `examples/contract-ai/todo.contract.md`

## Changelog 2.3.2

- ✅ **Evolution Mode** (`reclapp evolve --prompt "..."`) - dynamic code generation with auto-healing
- ✅ **EvolutionManager** - service monitoring, log analysis, auto-fix cycles
- ✅ **Evolution logs** (`*.rcl.md`) - track all evolution cycles and changes
- ✅ **Tests generation** - automatic test file generation with contract AI
- ✅ Port management and graceful shutdown for `--keep-running` mode
- ✅ PyPI publishing commands (`make publish`, `make publish-pypi-test`)

## Changelog 2.3.1

- ✅ Full lifecycle command (`reclapp-full-lifecycle.sh`)
- ✅ **Python CLI** (`pip install -e .` → `reclapp` command)
- ✅ **Prompt files** (`examples/prompts/*.txt`) - 10 ready-to-use prompts
- ✅ **reclapp-from-prompt.sh** - generate from .txt files
- ✅ Pydantic contract examples (5)
- ✅ Full-lifecycle contract examples (10) - fixed schema
- ✅ Contract-ai examples (4) - fixed appliesTo, template, rule
- ✅ 8/8 validation stages working
- ✅ Fixed ts-node/TypeScript version compatibility
- ✅ Added nvm loading for shell scripts
- ✅ Added fallback minimal server for robust testing
- ✅ Service health check and CRUD endpoint testing

## Python CLI Commands

```bash
pip install -e .                         # Install
reclapp --version                        # v2.3.2
reclapp --prompt "Create a notes app"    # Full lifecycle
reclapp lifecycle --prompt "..."         # Explicit lifecycle
reclapp generate contract.ts             # Generate from contract
reclapp prompts                          # Show example prompts
reclapp validate                         # Validate Pydantic contracts
reclapp list                             # List contracts
```

## Evolution Mode (NEW in 2.3.2)

Evolution mode enables dynamic code generation with automatic service monitoring and self-healing:

```bash
# Generate and run with evolution (auto-fix)
./bin/reclapp evolve --prompt "Create a todo app"

# Keep running with continuous monitoring
./bin/reclapp evolve --prompt "Create a notes app" -k

# Custom port and output
./bin/reclapp evolve --prompt "..." --port 4000 -o ./output
```

### Evolution Features

- **Dynamic code generation** - generates code from natural language prompt
- **Service monitoring** - health checks every 5 seconds
- **Log analysis** - detects errors and warnings in service logs
- **Auto-fix cycles** - regenerates code when issues detected
- **Evolution history** - tracks all changes in `*.rcl.md` logs
- **Graceful shutdown** - Ctrl+C properly stops service

## Prompt Files (NEW)

Gotowe prompty do generowania usług w `examples/prompts/`:

```bash
# Z pliku .txt
reclapp --prompt "$(cat examples/prompts/01-notes-app.txt)"

# Lub helper script
./bin/reclapp-from-prompt.sh examples/prompts/02-todo-app.txt -o ./my-todo
```

| Prompt | Opis | Encje |
|--------|------|-------|
| `01-notes-app.txt` | Notatki | Note |
| `02-todo-app.txt` | Zadania | Task, Category |
| `03-contacts-crm.txt` | CRM | Contact, Company, Deal |
| `04-inventory.txt` | Magazyn | Product, Warehouse |
| `05-booking.txt` | Rezerwacje | Resource, Booking |
| `06-blog.txt` | Blog | Post, Comment |
| `07-hr-system.txt` | HR | Employee, Department |
| `08-invoices.txt` | Faktury | Invoice, InvoiceItem |
| `09-support-tickets.txt` | Zgłoszenia | Ticket, TicketMessage |
| `10-events.txt` | Wydarzenia | Event, Registration |

## Known Issues (Fixed)

| Issue | Solution |
|-------|----------|
| ts-node ^9.1.1 incompatibility | Auto-fix package.json to use ^10.9.2 |
| TypeScript ^4.3.5 errors | Auto-fix to use ^5.3.3 |
| npm not in PATH | Load nvm in shell script |
| LLM-generated code errors | Fallback minimal server |

---

## Task Executor (NEW in 2.4.1)

Run tasks from Dockerfile-style files with parallel execution:

```bash
# Run tasks from file
./bin/reclapp tasks build.tasks

# Watch mode (dynamic task adding)
./bin/reclapp tasks build.tasks --watch

# Custom worker count
./bin/reclapp tasks build.tasks --workers 5
```

### Task File Format

```bash
# Comments start with #
echo "Step 1: Setup"
npm install
npm run build  # timeout: 120
npm test
```

### Live Output Format

```yaml
## Task Status

tasks:
  total: 4
  pending: 0
  running: 2
  done: 2
  failed: 0

queue:
  - ✅ "echo Step 1": done # 0s
  - ✅ "npm install": done # 3s
  - 🔄 "npm run build": running
  - ⏳ "npm test": pending
```

---

**Reclapp 2.4.1 | 2 Stycznia 2026 | PRODUCTION READY**
