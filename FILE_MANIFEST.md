# Reclapp 2.4.1 - File Manifest

Generated: 2026-02-09 (updated)

## Architecture

> See [README.md](README.md) and [docs/00-architecture-overview.md](docs/00-architecture-overview.md) for the canonical architecture diagrams.

## Statistics

> Note: Counts are approximate. Use `project.functions.toon` for accurate analysis.

| Type | Count (approx) |
|------|--------|
| TypeScript files | 50+ |
| JavaScript files | 10+ |
| Python files | 40+ |
| Test files | 20+ |
| Markdown docs | 20+ |
| Config files | 10+ |

## Source Files

### Shared Library

```text
./lib/
├── chat-core.js        # Shared ReclappChat class (delegates to rcl-utils)
│   ├── chat()          # LLM conversation
│   ├── extractContract()
│   ├── formatContract()
│   ├── validateContract()
│   ├── saveContract()  # Save in 3 formats
│   ├── toMarkdown()    # With conversation history
│   └── toTypeScript()  # Type-safe contracts
└── rcl-utils.js        # Shared RCL utilities (R04)
    ├── callOllamaRaw()  # Ollama API wrapper
    ├── extractContractFromResponse()
    ├── isLikelyRcl()
    ├── coerceToRclString()
    └── convertLegacyJsonContractToRcl()
```

### Reclapp Studio (Web UI)

```text
./studio/
├── server.js           # Express server (API endpoints)
├── public/
│   └── index.html      # Vanilla JS UI (tabs, accordions)
├── chat-shell.js       # Terminal chat (uses lib/chat-core)
├── package.json
└── projects/           # Generated projects
    └── logs/           # Session logs (.rcl.md)
```

**Web UI Features:**
- 💬 Chat tab - AI contract generation with example prompts
- 📁 Projects tab - Browse apps/ and examples/
- 📋 Formats tab - Documentation on contract formats
- Accordion UI for contract, TypeScript, Markdown previews

### CLI Tools

```text
./bin/
├── reclapp                    # Main CLI (evolve, generate, list, dev, ...)
├── commands/
│   └── evolution.js           # Extracted cmdEvolution (R02)
├── reclapp-chat               # AI chat (uses lib/chat-core)
├── reclapp-from-prompt.sh     # Helper: evolve from .txt prompt file
└── reclapp-full-lifecycle.sh   # Full lifecycle runner
```

### Contracts System

```text
./contracts/
├── types.ts            # 450+ type definitions
├── validator.ts        # Zod validation schemas
├── executor.ts         # Runtime executor
├── index.ts            # Public exports
└── examples/
    └── risk-monitoring-agent.ts
```

### Core Engine

```text
./core/
├── ai-contract/        # AI Contract Enforcer
├── causal/             # Causal Verification Loop
├── cqrs/               # CQRS Infrastructure
├── eventstore/         # Event Sourcing
├── mcp/                # MCP Protocol Server
├── ontology/           # Semantic-Causal Ontology
├── planner/            # Execution DAG Planner
└── verification/       # Verification Engine
```

### DSL Parser

```text
./dsl/
├── ast/types.ts        # AST type definitions
├── grammar/reclapp.pegjs  # PEG.js grammar
├── parser/index.ts     # Parser implementation
└── validator/index.ts  # Semantic validator
```

### Tests

```text
./tests/
├── e2e/
│   ├── studio.test.ts       # Studio API tests
│   ├── chat-shell.test.sh   # Chat module tests
│   ├── contracts.test.ts
│   └── causal-loop.test.ts
├── unit/
│   ├── ai-contract.test.ts
│   ├── parser.test.ts
│   └── validator.test.ts
└── setup.ts
```

### Documentation

```text
./articles/
├── 01-reclapp-overview.md
├── 02-reclapp-dsl-reference.md
├── 03-reclapp-mvp-docker.md
├── 04-reclapp-ai-native-roadmap.md
├── 05-reclapp-typescript-ai-contracts.md
├── 06-reclapp-mcp-integration.md
└── 07-reclapp-causal-verification-loop.md
```

### Shared Modules (Refactored Feb 2026)

```text
./generator/shared/
└── type-mappers.ts        # Unified TS/SQL/Zod/Mongoose type mappers (R05)

./src/core/contract-ai/evolution/
├── contract-extractor.ts  # Entity extraction from prompts (R01)
└── ...                    # See 00-architecture-overview.md for full list
```

## Contract Formats

| Format | Extension | Purpose | Example |
|--------|-----------|---------|---------|
| Mini-DSL | `.reclapp.rcl` | Storage, generation | [examples/crm/contracts/](examples/crm/contracts/) |
| Markdown | `.rcl.md` | Documentation, chat logs | [studio/projects/logs/](studio/projects/logs/) |
| TypeScript | `.reclapp.ts` | Validation, types | [contracts/examples/](contracts/examples/) |

## Key URLs

| Service | URL | Description |
|---------|-----|-------------|
| Reclapp Studio | http://localhost:7861 | Web UI for contract design |
| API | http://localhost:8080 | REST API |
| Frontend | http://localhost:3000 | React Dashboard |

## Make Commands

```bash
# Reclapp Studio
make studio-up        # Start
make studio-down      # Stop
make studio-restart   # Restart
make studio-status    # Check status
make studio-chat      # Terminal chat
make studio-logs      # View session logs
make studio-test      # Run Studio tests

# Development
make install          # Install dependencies
make dev              # Start dev server
make test             # Run all tests
make build            # Build project

# Docker Examples
make auto-up          # Start main stack
make auto-b2b         # B2B Risk Monitoring
make auto-crm         # CRM example
