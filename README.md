![reclapp.png](reclapp.png)
# Reclapp 2.2.0 - AI-Native Declarative Platform

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/wronai/contract)
[![License](https://img.shields.io/badge/license-Apache-green.svg)](LICENSE) 
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org/)

> **AI-Native Declarative Platform** for building autonomous B2B applications with causal reasoning, verification loops, and production-ready safety rails.

## 🌟 Key Features

- **Python CLI** - `pip install -e .` → `reclapp` command
- **Full Lifecycle** - Single command: prompt → contract → code → service → tests
- **Contract AI 2.2** - 3-layer specification (Definition, Generation, Validation)
- **8-Stage Validation** - Syntax, Schema, Assertions, Static Analysis, Tests, Quality, Security, Runtime
- **Pydantic Contracts** - Python-first contract definitions
- **Auto-fix** - Automatic package.json and tsconfig.json fixes

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (optional)
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/wronai/contract.git
cd contract

# If npm is not available in your shell (e.g. non-interactive/CI), load NVM first:
source ~/.nvm/nvm.sh

# Install Node.js dependencies
npm install

# Install Python CLI (recommended)
pip install -e .

# Or with venv
python3 -m venv venv
source venv/bin/activate
pip install -e .
```

### Python CLI

```bash
# After pip install -e .
reclapp --version                    # Show version
reclapp --help                       # Show help
reclapp --prompt "Create a notes app"  # Full lifecycle
reclapp prompts                      # Show example prompts
reclapp validate                     # Validate Pydantic contracts
```

### Code Analysis & Refactoring (NEW in 2.4)

```bash
# Analyze existing codebase
./bin/reclapp analyze ./src

# Refactor from GitHub (clone + analyze + generate contract)
./bin/reclapp refactor https://github.com/user/repo

# Refactor local directory
./bin/reclapp refactor ./my-project

# Output: refactoring_contract.json, analysis_report.md, todo_list.md
```

### Evolution Mode (NEW in 2.4)

```bash
# Generate full application from prompt
./bin/reclapp evolve -p "Create a todo app" -o ./output2

# With CI/CD and Docker
./bin/reclapp evolve -p "Create a blog with cicd and docker" -o ./output

# Keep running (watch mode)
./bin/reclapp evolve -p "Create an inventory app" -o ./output -k
```

### Full Lifecycle (NEW in 2.3)

```bash
# From prompt - generates contract, code, validates, and tests
./bin/reclapp-full-lifecycle.sh --prompt "Create a notes app"

# From contract file
./bin/reclapp-full-lifecycle.sh examples/crm/contracts/crm-human-readable.rcl.md

# With options
./bin/reclapp-full-lifecycle.sh --prompt "Create a CRM" -o ./my-app --port 4000
```

### Contract AI Generation

```bash
# Generate from prompt
./bin/reclapp generate-ai --prompt "Create a todo app with tasks"

# Generate from contract
./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts -o ./generated
```

### Generate Application from Contract

```bash
# List available contracts
./bin/reclapp list

# Generate full application from contract (RCL format - recommended)
./bin/reclapp generate examples/crm/contracts/crm-human-readable.rcl.md

# Or from compact DSL
./bin/reclapp generate examples/crm/contracts/crm-compact-dsl.reclapp.rcl

# Or from TypeScript (with validation)
./bin/reclapp generate examples/crm/contracts/crm-typescript-validation.reclapp.ts

# Generate and run development servers
./bin/reclapp dev examples/crm/contracts/crm-human-readable.rcl.md
```

### Workflow Strategies (NEW in 2.5)

Reclapp supports two complementary methods of working with contracts:

1.  **Manual-First (RCL Markdown)**:
    *   **Workflow**: You write `.rcl.md` manually (see `examples/b2b-onboarding/contracts/onboarding.rcl.md`).
    *   **Best for**: Clear documentation, human-readable specifications, and explicit control over entities and events.
    *   **Command**: `./bin/reclapp generate <file>.rcl.md`

2.  **AI-First (Evolution Mode)**:
    *   **Workflow**: You provide a natural language prompt, and Reclapp generates a `contract.ai.json` execution plan.
    *   **Best for**: Rapid prototyping, complex logic generation, and automated iteration loops.
    *   **Command**: `reclapp evolve -p "Your prompt" -o ./output`

**Hybrid Integration**:
*   **Markdown → JSON**: You can now embed or extract the AI execution plan (JSON) directly from an `.rcl.md` file. This allows you to have a human-readable spec that also controls the automated evolution process.
*   **JSON → Markdown**: Generated `contract.ai.json` can be converted back to `.rcl.md` for documentation and manual refinement.

### Contract Formats

| Format | Extension | Description | Use Case |
|--------|-----------|-------------|----------|
| **RCL Markdown** | `.rcl.md` | Human-readable with documentation | Best for validation and collaboration |
| **Mini-DSL** | `.reclapp.rcl` | Compact syntax (~87% less code) | Quick prototyping |
| **TypeScript** | `.reclapp.ts` | Type-safe with validation | Production contracts |
| **Full Deployment** | `.reclapp` | Complete deployment config | Full-stack apps |

### Convert Between Formats

```bash
# Convert Mini-DSL to Markdown
./bin/reclapp convert contract.reclapp.rcl --format md

# Convert Markdown to TypeScript
./bin/reclapp convert contract.rcl.md --format ts

# Convert TypeScript to Mini-DSL
./bin/reclapp convert contract.reclapp.ts --format rcl
```

**Note:** `contract.ai.json` from `reclapp evolve` is an internal AI format and cannot be directly converted. Use the chat interface to generate RCL formats.

### Run Generated Application

```bash
# After generation, start the servers
cd examples/crm/target/api && npm install && npm run dev      # API on :8080
cd examples/crm/target/frontend && npm install && npm run dev # UI on :3000
```

### Using Docker

```bash
# Start Docker services (with auto-diagnostics)
make auto-up

# Or use standard commands
make up              # Start services
make logs            # View logs
make down            # Stop services

# Run tests
make test
```

**Data Source:** Example apps typically use JSON fixtures under `data/` and the `modules/data-provider` module.

## 📁 Project Structure

```
reclapp/
├── bin/                      # CLI Tools
│   └── reclapp               # Main Node.js CLI (analyze, refactor, evolve)
│
├── src/core/contract-ai/     # Contract AI Core
│   ├── analysis/             # Code analysis & refactoring
│   │   ├── code-analyzer.ts  # Multi-language parser (9 languages)
│   │   └── refactoring-contract.ts  # Contract generator
│   ├── evolution/            # Evolution pipeline
│   │   ├── evolution-manager.ts  # Main orchestrator
│   │   ├── task-handlers.ts  # Task handlers
│   │   └── llm-orchestrator.ts   # LLM integration
│   ├── types/                # 3-Layer types
│   ├── generator/            # Contract generator
│   └── validation/           # 8-stage validation pipeline
│
├── examples/
│   ├── prompts/              # Example prompts (10 files)
│   ├── contract-ai/          # TypeScript contracts
│   └── pydantic-contracts/   # Python contracts
│
├── pyproject.toml            # Python package config
├── package.json              # Node.js dependencies
└── AGENTS.md                 # Agent specification
```

## 🤖 Contract AI - 3-Layer Specification

```
┌───────────────────────────────────────────────────────────┐
│  Layer 1: DEFINITION     │  app, entities, api           │
│  Layer 2: GENERATION     │  instructions, techStack      │
│  Layer 3: VALIDATION     │  assertions, tests, acceptance│
└───────────────────────────────────────────────────────────┘
```

### Workflow

```
PROMPT → CONTRACT → CODE → VALIDATE → SERVICE → TESTS
         (LLM)     (LLM)   (8 stages)  (Express)  (CRUD)
```

### Example Prompts

```bash
# Simple prompts
reclapp --prompt "Create a notes app"
reclapp --prompt "Create a todo app with tasks"
reclapp --prompt "Create a CRM with contacts and deals"

# From prompt files (more detailed)
reclapp --prompt "$(cat examples/prompts/01-notes-app.txt)"
reclapp --prompt "$(cat examples/prompts/03-contacts-crm.txt)" -o ./my-crm

# Or use the helper script
./bin/reclapp-from-prompt.sh examples/prompts/02-todo-app.txt
```

### Available Prompt Files

| Prompt | Description |
|--------|-------------|
| `01-notes-app.txt` | Simple notes with CRUD |
| `02-todo-app.txt` | Tasks with priorities and categories |
| `03-contacts-crm.txt` | CRM with contacts, companies, deals |
| `04-inventory.txt` | Stock management system |
| `05-booking.txt` | Reservation system |
| `06-blog.txt` | Blog with posts and comments |
| `07-hr-system.txt` | Employee management |
| `08-invoices.txt` | Invoice system |
| `09-support-tickets.txt` | Support ticket system |
| `10-events.txt` | Event registration |

### Example Contracts

| Contract | File |
|----------|------|
| CRM | `examples/contract-ai/crm-contract.ts` |
| Notes | `examples/pydantic-contracts/contracts.py` |
| Todo | `examples/full-lifecycle/02-todo-app.ts` |

## ✅ Reclapp - Full Lifecycle Working

### 📊 Status

| Component | Status |
|-----------|--------|
| Python CLI (`reclapp`) | ✅ Working |
| Shell CLI (`reclapp-full-lifecycle.sh`) | ✅ Working |
| 8-Stage Validation | ✅ All Passing |
| Service Health Check | ✅ Working |
| CRUD Endpoint Tests | ✅ 2/2 Passing |

### 🚀 Quick Test

```bash
# Install Python CLI
pip install -e .

# Run full lifecycle
reclapp --prompt "Create a todo app with tasks"

# Or use shell script
./bin/reclapp-full-lifecycle.sh --prompt "Create a notes app"
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RECLAPP 2.2.0                             │
├─────────────────────────────────────────────────────────────┤
│  INPUT                                                       │
│  ├── Prompt ("Create a CRM system")                         │
│  ├── TypeScript Contract (*.ts)                             │
│  └── Pydantic Contract (Python)                             │
├─────────────────────────────────────────────────────────────┤
│  CONTRACT AI (3 Layers)                                      │
│  ├── Definition (app, entities, api)                        │
│  ├── Generation (instructions, techStack)                   │
│  └── Validation (assertions, tests, acceptance)             │
├─────────────────────────────────────────────────────────────┤
│  VALIDATION PIPELINE (8 Stages)                              │
│  ├── 1. Syntax      5. Tests                                │
│  ├── 2. Schema      6. Quality                              │
│  ├── 3. Assertions  7. Security                             │
│  └── 4. Static      8. Runtime                              │
├─────────────────────────────────────────────────────────────┤
│  OUTPUT                                                      │
│  ├── Generated API (Express.js + TypeScript)                │
│  ├── Health Check (/health)                                 │
│  └── CRUD Endpoints (/api/v1/items)                         │
└─────────────────────────────────────────────────────────────┘
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Project Status](docs/22-project-status.md) | Current status |
| [Testing Guide](docs/21-testing-guide.md) | Testing procedures |
| [LLM Configuration](docs/23-llm-configuration.md) | Multi-provider LLM setup and routing |
| [AGENTS.md](AGENTS.md) | Agent specification |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

Apache 2 License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [GitHub](https://github.com/wronai/contract)
- [Documentation](docs/)
- [Examples](examples/)
- [Apps](apps/)

---

**Reclapp** - *AI-Native Declarative Platform for Autonomous B2B Applications*

Made with ❤️ by [Softreck](https://softreck.com)
