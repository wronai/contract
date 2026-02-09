# Reclapp - Status Projektu

**Data:** 1 Lutego 2026  
**Wersja:** 2.4.1  
**Status:** ✅ PRODUCTION READY (with recent hotfixes)

## Podsumowanie

Reclapp to kompletna platforma do generowania aplikacji B2B z kontraktów AI. System obsługuje pełny cykl życia od promptu/kontraktu do działającej usługi z **LLM-powered code generation**, **multi-level state verification**, i **CodeRAG navigation**.

### Ostatnie Poprawki (Luty 2026)
- ✅ **Naprawa Testów Python**: Rozwiązano problemy z importami w `pydantic-contracts` oraz `shell_interaction`.
- ✅ **Stabilizacja Evolution Mode**: Zsynchronizowano rozszerzenia plików E2E (`.ts`) między generatorem a testami.
- ✅ **Poprawka Generatora API**: Wyeliminowano błąd cudzysłowów w domyślnych wartościach `boolean` w schematach Zod.
- ✅ **LLM Test Robustness**: Poprawiono mockowanie providerów w testach jednostkowych.
- ✅ **Clickmd Fix**: Rozwiązano problem z kolekcją testów w narzędziach pomocniczych.

## Architektura

```
┌─────────────────────────────────────────────────────────────┐
│                     RECLAPP 2.4.1                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CLI                                                        │
│  ├── reclapp evolve -p "..." (LLM-powered)                  │
│  ├── reclapp reverse /path/to/project (Contract extraction) │
│  └── reclapp tasks build.tasks (Task executor)              │
│                                                             │
│  EVOLUTION SYSTEM                                           │
│  ├── LLM Code Generation (with fallbacks)                   │
│  ├── Multi-Level State Analysis                             │
│  ├── CodeRAG Navigation                                     │
│  ├── Git Integration                                        │
│  └── 4-Level Error Recovery                                 │
│                                                             │
│  VERIFICATION PIPELINE                                      │
│  ├── Contract ↔ SourceCode verification                     │
│  ├── SourceCode ↔ Service verification                      │
│  ├── Service ↔ Logs verification                            │
│  └── Automatic reconciliation                               │
│                                                             │
│  OUTPUT                                                     │
│  ├── api/ (LLM-generated Express.js + TypeScript)           │
│  ├── tests/e2e/ (LLM-generated E2E tests)                   │
│  ├── contract/contract.ai.json                              │
│  ├── state/evolution-state.json                             │
│  └── logs/*.rcl.md                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Komponenty

### 1. Contract AI Core
- **Lokalizacja:** `src/core/contract-ai/`
- **Status:** ✅ Kompletny
- **Testy:** 25 unit + 16 integration

### 2. Modular Contracts (Python)
- **Lokalizacja:** `reclapp-contracts/`
- **Status:** ✅ Kompletny
- **Schematy:** 4 core JSON schemas

### 3. CLI
- **Lokalizacja:** `bin/reclapp`
- **Status:** ✅ Kompletny
- **Komendy:** evolve, generate, generate-ai (legacy), validate, list, stop, chat, convert, normalize, analyze, reverse, refactor, tasks, setup, studio

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
./bin/reclapp evolve -p "Create a CRM with contacts and deals" -o ./crm

# Test Pydantic
cd examples/pydantic-contracts && python3 contracts.py
```

### Full Test Suite
```bash
# Unit tests
npx jest tests/unit/contract-ai.test.ts

# Integration tests
npx jest tests/integration/contract-ai-flow.test.ts

# Contract schemas
PYTHONPATH=reclapp-contracts:. python3 scripts/generate_schemas.py

# Python contracts
pytest tests/contracts/ -v
```

## Pliki Kluczowe

| Plik | Opis |
|------|------|
| `bin/reclapp` | Główne CLI |
| `bin/reclapp-full-lifecycle.sh` | Full lifecycle runner |
| `src/core/contract-ai/` | Contract AI core |
| `reclapp-contracts/` | Modular Contract AI models |
| `reclapp-llm/` | Unified LLM provider layer |
| `examples/pydantic-contracts/` | Pydantic examples |
| `examples/contract-ai/` | TypeScript examples |
| `docs/21-testing-guide.md` | Przewodnik testowania |

## Wymagania

- Node.js >= 18.0.0
- Python >= 3.10
- Pydantic >= 2.5
- Ollama z llama3 (opcjonalne, dla generacji)

## Changelog 2.4.1 (Current)

- ✅ **Unified Python CLI** - Native Python implementation of all commands
- ✅ **Modular Architecture** - Split into `reclapp-contracts` and `reclapp-llm`
- ✅ **LLM-Powered Generation** - All code generated by LLM with fallback templates
- ✅ **Multi-Level State Analysis** - Contract ↔ Code ↔ Service ↔ Logs verification
- ✅ **CodeRAG Navigation** - Semantic code search and indexing
- ✅ **Automated Build** - `publish.sh` for all modular packages
- ✅ **Markdown Parser 2.4.1** - Support for complex `.rcl.md` contracts

## Changelog 2.4.0

- ✅ **Contract Markdown 3.0** (`.contract.md`) - new LLM-optimized contract format
- ✅ **Markdown Parser** - full YAML frontmatter + Markdown section parsing
- ✅ **ContractAI Converter** - converts `.contract.md` to ContractAI format
- ✅ **CLI Integration** - `reclapp examples/todo.contract.md` works
- ✅ **Entity Extraction** - parses entity tables with fields, types, requirements
- ✅ **API Extraction** - parses endpoint tables with methods and paths
- ✅ **Test Definitions** - parses Gherkin acceptance tests and API test YAML
- ✅ **Example Contract** - `examples/contract-ai/todo.contract.md`

## Changelog 2.3.x (Legacy)

- ✅ Full lifecycle command (`reclapp-full-lifecycle.sh`)
- ✅ Evolution Mode - dynamic code generation with auto-healing
- ✅ **Python CLI** (`pip install -e .` → `reclapp` command)
- ✅ **Prompt files** (`examples/prompts/*.txt`) - 10 ready-to-use prompts
- ✅ Pydantic contract examples
- ✅ 8/8 validation stages working
- ✅ Port management and graceful shutdown

## Python CLI Commands

```bash
pip install -e .                         # Install
reclapp --version                        # v2.4.1
reclapp --prompt "Create a notes app"    # Full lifecycle
reclapp lifecycle --prompt "..."         # Explicit lifecycle
reclapp generate contract.ts             # Generate from contract
reclapp prompts                          # Show example prompts
reclapp validate                         # Validate Pydantic contracts
reclapp list                             # List contracts
```

## Evolution Mode (NEW in 2.4.1)

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
  running: 0
  done: 4
  failed: 0

queue:
  - ✅ "echo Step 1": done # 0s
  - ✅ "npm install": done # 3s
  - ✅ "npm run build": done
  - ✅ "npm test": done
```

---

## New in 2.4.1: CodeRAG

Semantic code search and navigation:

```typescript
// Initialize
await evolutionManager.initCodeRAG();

// Ask about code
const result = await evolutionManager.askCode("Where is validation?");

// Find usages
const usages = evolutionManager.findSymbolUsages("createTodo");

// Get structure
const structure = evolutionManager.getCodeStructure();
```

---

## New in 2.4.1: Multi-Level Analysis

```yaml
# @type: multi_level_analysis
analysis:
  contract:
    entities: [Todo]
    endpoints: 6
  sourcecode:
    files: 4
    detected_endpoints: 6
  service:
    running: true
    health: true
  logs:
    errors: 0
  reconciliation:
    reconciled: true
    discrepancies: 0
```

---

**Reclapp 2.4.1 | 1 Lutego 2026 | PRODUCTION READY**
