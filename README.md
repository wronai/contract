![reclapp.png](reclapp.png)
# Reclapp 2.3.1 - AI-Native Declarative Platform

[![Version](https://img.shields.io/badge/version-2.3.1-blue.svg)](https://github.com/wronai/reclapp)
[![License](https://img.shields.io/badge/license-Apache-green.svg)](LICENSE) 
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://python.org/)

> **AI-Native Declarative Platform** for building autonomous B2B applications with causal reasoning, verification loops, and production-ready safety rails.

## 🌟 Key Features

- **Python CLI** - `pip install -e .` → `reclapp` command
- **Full Lifecycle** - Single command: prompt → contract → code → service → tests
- **Contract AI 2.3** - 3-layer specification (Definition, Generation, Validation)
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
git clone https://github.com/softreck/reclapp.git
cd reclapp

# Install Node.js dependencies
npm install

# Install Python CLI (recommended)
pip install -e .

# Or with venv
python3 -m venv venv
source venv/bin/activate
pip install -e .
```

### Python CLI (NEW in 2.3.1)

```bash
# After pip install -e .
reclapp --version                    # Show version
reclapp --help                       # Show help
reclapp --prompt "Create a notes app"  # Full lifecycle
reclapp prompts                      # Show example prompts
reclapp validate                     # Validate Pydantic contracts
```

### Full Lifecycle (NEW in 2.3)

```bash
# From prompt - generates contract, code, validates, and tests
./bin/reclapp-full-lifecycle.sh --prompt "Create a notes app"

# From contract file
./bin/reclapp-full-lifecycle.sh examples/contract-ai/crm-contract.ts

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
reclapp list

# Generate full application from contract
reclapp generate examples/crm/contracts/main.reclapp.ts

# Or generate and run development servers
reclapp dev examples/crm/contracts/main.reclapp.ts
```

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
│   ├── reclapp               # Main Node.js CLI
│   └── reclapp-full-lifecycle.sh  # Full lifecycle runner
│
├── reclapp/                  # Python CLI Package
│   ├── __init__.py
│   └── cli.py                # Click-based CLI
│
├── src/core/contract-ai/     # Contract AI Core
│   ├── types/                # 3-Layer types
│   ├── generator/            # Contract generator
│   ├── code-generator/       # Code generator (LLM)
│   └── validation/           # 8-stage validation pipeline
│
├── examples/
│   ├── contract-ai/          # TypeScript contracts
│   ├── pydantic-contracts/   # Python contracts
│   └── full-lifecycle/       # Full lifecycle examples
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
reclapp --prompt "Create a notes app"
reclapp --prompt "Create a todo app with tasks"
reclapp --prompt "Create a CRM with contacts and deals"
reclapp --prompt "Create an inventory system"
reclapp --prompt "Create a booking system"
```

### Example Contracts

| Contract | File |
|----------|------|
| CRM | `examples/contract-ai/crm-contract.ts` |
| Notes | `examples/pydantic-contracts/contracts.py` |
| Todo | `examples/full-lifecycle/02-todo-app.ts` |

## ✅ Reclapp 2.3.1 - Full Lifecycle Working

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
│                    RECLAPP 2.3.1                             │
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
| [Project Status](docs/22-project-status.md) | Current 2.3.1 status |
| [Testing Guide](docs/21-testing-guide.md) | Testing procedures |
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

- [GitHub](https://github.com/wronai/reclapp)
- [Documentation](docs/)
- [Examples](examples/)
- [Apps](apps/)

---

**Reclapp** - *AI-Native Declarative Platform for Autonomous B2B Applications*

Made with ❤️ by [Softreck](https://softreck.com)
