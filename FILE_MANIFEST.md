# Reclapp 2.1.0 - File Manifest

Generated: 2026-01-01

## Statistics

| Type | Count |
|------|-------|
| TypeScript files | 32 |
| JavaScript files | 5 |
| Test files | 9 |
| Markdown files | 15 |
| Config files | 8 |
| Total source files | ~70 |

## Source Files

### Contracts System

```text
./contracts/examples/risk-monitoring-agent.ts
./contracts/executor.ts
./contracts/index.ts
./contracts/types.ts
./contracts/validator.ts
```

### Core Engine

```text
./core/ai-contract/index.ts
./core/causal/verification-loop.ts
./core/cqrs/index.ts
./core/eventstore/index.ts
./core/mcp/index.ts
./core/ontology/types.ts
./core/planner/index.ts
./core/verification/index.ts
```

### DSL Parser

```text
./dsl/ast/types.ts
./dsl/grammar/reclapp.pegjs
./dsl/parser/index.ts
./dsl/validator/index.ts
```

### Studio (Web UI)

```text
./studio/
├── server.js           # Express server with chat, projects, validation APIs
├── public/
│   └── index.html      # Vanilla JS UI with accordions, tabs
├── chat-shell.js       # Terminal chat client
├── package.json
└── projects/           # Generated projects and logs
    └── logs/           # Session logs in .rcl.md format
```

### CLI Tools

```text
./bin/reclapp           # Main CLI
./bin/reclapp-chat      # AI chat for contract generation
./bin/reclapp-validate-ts  # TypeScript contract validator
```

### Tests

```text
./tests/e2e/causal-loop.test.ts
./tests/e2e/contracts.test.ts
./tests/e2e/mcp-protocol.test.ts
./tests/e2e/onboarding.test.ts
./tests/e2e/setup.ts
./tests/setup.ts
./tests/unit/ai-contract.test.ts
./tests/unit/eventstore.test.ts
./tests/unit/parser.test.ts
./tests/unit/validator.test.ts
./tests/unit/verification.test.ts
```

### Documentation

```text
./articles/00-index.md
./articles/01-reclapp-overview.md
./articles/02-reclapp-dsl-reference.md
./articles/03-reclapp-mvp-docker.md
./articles/04-reclapp-ai-native-roadmap.md
./articles/05-reclapp-typescript-ai-contracts.md
./articles/06-reclapp-mcp-integration.md
./articles/07-reclapp-causal-verification-loop.md
```

## Contract Formats

| Format | Extension | Purpose |
|--------|-----------|---------|
| Mini-DSL | `.reclapp.rcl` | Storage, generation |
| Markdown | `.rcl.md` | Documentation, AI chat logs |
| TypeScript | `.reclapp.ts` | Validation, type checking |

## Key URLs

| Service | URL | Description |
|---------|-----|-------------|
| Studio | http://localhost:7861 | Web UI for contract design |
| Gradio Studio | http://localhost:7860 | Full-featured Studio (Docker) |
| API | http://localhost:8080 | REST API |
| Frontend | http://localhost:3000 | React Dashboard |

## Make Commands

```bash
# Studio
make studio-up       # Start
make studio-down     # Stop
make studio-restart  # Restart
make studio-status   # Check status
make studio-chat     # Terminal chat
make studio-logs     # View logs

# Development
make install              # Install deps
make dev                  # Start dev
make test                 # Run tests
make build                # Build

# Docker
make up                   # Start services
make down                 # Stop services
make logs                 # View logs
```
