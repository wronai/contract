# Reclapp Architecture Overview

> Complete guide to the Reclapp Contract AI system architecture

## Quick Links

| Category | Document | Description |
|----------|----------|-------------|
| **Getting Started** | [README](README.md) | Quick start guide |
| **CLI** | [CLI Reference](cli-reference.md) | Command line interface |
| **DSL** | [DSL Reference](dsl-reference.md) | Domain Specific Language |
| **Contract AI** | [Contract AI](contract-ai.md) | AI-driven contract generation |
| **Evolution** | [Evolution System](30-evolution-system.md) | Dynamic code evolution |
| **Code Generation** | [Code Generation](31-code-generation.md) | Multi-layer code generation |
| **Testing** | [Testing Guide](21-testing-guide.md) | Test execution and validation |
| **Status** | [Project Status](22-project-status.md) | Current version and changelog |
| **Contract Markdown** | [Contract Markdown 3.0](32-contract-markdown.md) | LLM-optimized `.contract.md` format (NEW) |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RECLAPP SYSTEM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Prompt    │───▶│  Contract   │───▶│    Code Generation      │  │
│  │   Input     │    │  Generator  │    │    (3-Layer)            │  │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘  │
│        │                  │                       │                 │
│        ▼                  ▼                       ▼                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Entity    │    │  Contract   │    │  ┌─────┐ ┌─────┐ ┌────┐ │  │
│  │  Extraction │    │  Validation │    │  │ API │ │Tests│ │ UI │ │  │
│  └─────────────┘    └─────────────┘    │  └─────┘ └─────┘ └────┘ │  │
│                                        └─────────────────────────┘  │
│                                                    │                │
│                                       ┌────────────┘                │
│                                       ▼                             │
│                    ┌─────────────────────────────────────┐          │
│                    │        Evolution Manager            │          │
│                    │  ┌──────────┐  ┌──────────────────┐ │          │
│                    │  │ Service  │  │   Log Analysis   │ │          │
│                    │  │ Monitor  │  │   & Auto-Fix     │ │          │
│                    │  └──────────┘  └──────────────────┘ │          │
│                    └─────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Contract Definition Layer

**Files:** `src/core/contract-ai/types/`

The contract defines what the application should do:

```typescript
interface ContractAI {
  definition: {    // What entities exist
    app: AppDefinition;
    entities: EntityDefinition[];
    events: EventDefinition[];
    api: ApiDefinition;
  };
  generation: {    // How to generate code
    instructions: Instruction[];
    techStack: TechStack;
    patterns: Pattern[];
  };
  validation: {    // How to validate
    assertions: Assertion[];
    tests: TestDefinition[];
  };
}
```

📚 **See:** [Contract AI Documentation](contract-ai.md)

---

### 2. Code Generation Layer

**Files:** `src/core/contract-ai/code-generator/`

Generates 3 architecture layers from contract:

| Layer | Output | Technology |
|-------|--------|------------|
| **API** | `generated/api/` | Express + TypeScript |
| **Tests** | `generated/tests/` | Jest + Supertest |
| **Frontend** | `generated/frontend/` | React + Vite + Tailwind |

📚 **See:** [Code Generation Documentation](31-code-generation.md)

---

### 3. Evolution System

**Files:** `src/core/contract-ai/evolution/`

Monitors and evolves running applications:

```
┌───────────────────────────────────────────────────────┐
│                 Evolution Cycle                       │
│                                                       │
│   Generate ──▶ Deploy ──▶ Monitor ──▶ Analyze ──┐     │
│       ▲                                         │     │
│       └─────────── Fix & Regenerate ◀───────────┘     │
│                                                       │
└───────────────────────────────────────────────────────┘
```

📚 **See:** [Evolution System Documentation](30-evolution-system.md)

---

## Dependency Injection (DI)

This codebase uses a lightweight approach (no DI container).

- **LLM client wiring**: `EvolutionManager` exposes `setLLMClient(...)` (setter injection) and the CLI (`bin/reclapp`) configures the LLM and injects it into the manager.
- **Internal services**: core helpers (e.g. `TaskQueue`, `ShellRenderer`, analyzers) are created inside constructors.

If you are looking for `EvolutionSetupService` / `createEvolutionSetupService` or `evolution-setup.ts`, those are not present in the current repository.

---

### 4. Validation Pipeline

**Files:** `src/core/contract-ai/validation/`

8-stage validation pipeline:

1. **Schema** - JSON schema validation
2. **Syntax** - TypeScript syntax check
3. **Semantic** - Logical consistency
4. **Assertions** - Contract assertions
5. **Static Analysis** - Code quality
6. **Tests** - Unit test execution
7. **Quality** - Code coverage
8. **Security** - Vulnerability scan

📚 **See:** [Testing Guide](21-testing-guide.md)

---

## Data Flow

```
User Prompt
    │
    ▼
┌───────────────────┐
│ Entity Extraction │  ◀── NLP patterns + domain keywords
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Contract Creation │  ◀── Tech stack, API resources
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Code Generation   │  ◀── Templates + LLM
└───────────────────┘
    │
    ├──▶ api/src/server.ts
    ├──▶ tests/api.test.ts
    └──▶ frontend/src/App.tsx
    │
    ▼
┌───────────────────┐
│ Service Startup   │  ◀── npm install + ts-node
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Health Monitoring │  ◀── Every 5 seconds
└───────────────────┘
    │
    ▼
┌───────────────────┐
│ Log Analysis      │  ◀── Error detection
└───────────────────┘
    │
    ▼ (if errors found)
┌───────────────────┐
│ Auto-Fix Cycle    │  ◀── Regenerate + restart
└───────────────────┘
```

---

## Directory Structure

```
reclapp/
├── bin/
│   └── reclapp              # CLI entry point
├── src/
│   └── core/
│       └── contract-ai/
│           ├── types/       # TypeScript interfaces
│           │   └── contract-markdown.ts  # .contract.md types
│           ├── parser/      # Contract parsers
│           │   └── markdown-parser.ts    # .contract.md parser
│           ├── converter/   # Format converters
│           │   └── to-contract-ai.ts     # Markdown to ContractAI
│           ├── generator/   # Contract generation
│           ├── code-generator/
│           │   ├── llm-generator.ts
│           │   └── prompt-templates/
│           ├── validation/  # 8-stage pipeline
│           └── evolution/   # Evolution manager
├── contracts/
│   └── json/               # JSON schemas
├── examples/
│   ├── prompts/            # Example prompts
│   └── contract-ai/        # Example contracts
├── docs/                   # Documentation
└── generated/              # Output directory
    ├── api/
    ├── tests/
    ├── frontend/
    └── logs/
```

---

## Related Documentation

- **[DSL Reference](dsl-reference.md)** - Mini-DSL syntax
- **[TypeScript DSL](dsl-typescript-reference.md)** - Full TypeScript contracts
- **[Generator Architecture](generator-architecture.md)** - Code generation internals
- **[Contract Lifecycle](contract-lifecycle-workflow.md)** - Full workflow
- **[Studio Guide](studio-guide.md)** - Interactive examples browser

---

## Supported Contract Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| **Contract Markdown 3.0** | `.contract.md` | LLM-optimized with YAML + Markdown (NEW) |
| **TypeScript** | `.reclapp.ts` | Type-safe contracts |
| **Mini-DSL** | `.reclapp.rcl` | Compact syntax (~87% less code) |
| **Markdown** | `.rcl.md` | Human-readable logs |

📚 **See:** [Contract Markdown Documentation](32-contract-markdown.md) for the new format

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 2.4.1 | 2026-02 | Python CLI Unification, Modular Packages |
| 2.4.0 | 2026-01 | Contract Markdown 3.0 parser |
| 2.3.x | 2026-01 | Evolution mode, Full lifecycle |
| 2.2.x | 2025-12 | Contract AI, LLM integration |

📚 **See:** [Project Status](22-project-status.md) for full changelog
