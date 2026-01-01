# Reclapp 2.1.0 - File Manifest

Generated: 2026-01-01

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RECLAPP PLATFORM                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Studio    │  │  CLI Tools  │  │    Generated Apps   │ │
│  │  (Web UI)   │  │             │  │                     │ │
│  │  :7861      │  │ reclapp     │  │  API :8080          │ │
│  │             │  │ reclapp-chat│  │  Frontend :3000     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              lib/chat-core.js (Shared)                  ││
│  │  - ReclappChat class                                    ││
│  │  - Contract extraction, validation, formatting          ││
│  │  - TypeScript & Markdown generation                     ││
│  │  - Ollama LLM integration                               ││
│  └─────────────────────────────────────────────────────────┘│
│                          ▼                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  contracts/  │  │    core/     │  │     dsl/     │      │
│  │  TypeScript  │  │  AI-Native   │  │   Parser     │      │
│  │  Contracts   │  │  Components  │  │   Grammar    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Statistics

| Type | Count |
|------|-------|
| TypeScript files | 32 |
| JavaScript files | 6 |
| Test files | 12 |
| Markdown files | 15 |
| Config files | 8 |

## Source Files

### Shared Library

```text
./lib/
└── chat-core.js        # Shared ReclappChat class
    ├── chat()          # LLM conversation
    ├── extractContract()
    ├── formatContract()
    ├── validateContract()
    ├── saveContract()  # Save in 3 formats
    ├── toMarkdown()    # With conversation history
    └── toTypeScript()  # Type-safe contracts
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
├── reclapp             # Main CLI (generate, list, dev)
├── reclapp-chat        # AI chat (uses lib/chat-core)
└── reclapp-validate-ts # TypeScript validator
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
