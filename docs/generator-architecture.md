# Reclapp Generator Architecture

This document describes the code generation system architecture.

## Module Structure

```
generator/
├── core/
│   ├── generator.ts           # AST-based generator (legacy)
│   ├── simple-generator.ts    # Contract-based generator (new)
│   └── contract-generator.ts  # Full generator with all features
├── templates/
│   ├── index.ts               # Template exports and utilities
│   ├── api.ts                 # Express server templates
│   ├── frontend.ts            # React + Vite templates
│   ├── docker.ts              # Dockerfile and Compose templates
│   └── database.ts            # SQL migration templates
├── targets/
│   ├── api.ts                 # API-specific generation
│   ├── frontend.ts            # Frontend-specific generation
│   ├── docker.ts              # Docker generation
│   ├── kubernetes.ts          # K8s manifests
│   ├── database.ts            # Database schemas
│   └── cicd.ts                # CI/CD pipelines
├── utils/
│   └── index.ts               # Shared utilities
└── index.ts                   # Main exports
```

## Key Components

### SimpleGenerator

The primary generator for creating applications from validated contracts.

Supported input formats via `./bin/reclapp generate`:

- `.reclapp.ts`
- `.reclapp.rcl`
- `.rcl.md`

```typescript
import { SimpleGenerator } from './generator/core/simple-generator';

const generator = new SimpleGenerator(contract, outputDir);
generator.generate();
generator.writeFiles(verbose);
```

### Templates

Modular TypeScript templates for each generated component:

- **`api.ts`** - Express server, routes, models
- **`frontend.ts`** - React app, components, hooks
- **`docker.ts`** - Dockerfiles, docker-compose.yml
- **`database.ts`** - SQL migrations

### Usage Flow

```
.reclapp.ts / .reclapp.rcl / .rcl.md Contract
        │
        ▼
  ┌─────────────┐
  │ bin/reclapp │  CLI entry point
  └─────────────┘
        │
        ▼
  ┌─────────────────────┐
  │ SimpleGenerator     │  Uses templates
  └─────────────────────┘
        │
        ├── api.ts templates
        ├── frontend.ts templates
        ├── docker.ts templates
        └── database.ts templates
        │
        ▼
   Generated Files
   (target/ folder)
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `reclapp <contract>` | Generate application |
| `reclapp run <contract>` | Generate + install + run |
| `reclapp test <contract>` | Generate + run + test API |
| `reclapp deploy <contract>` | Generate + docker compose |

See [CLI Reference](./cli-reference.md) for full documentation.

## Related Documentation

- [CLI Reference](./cli-reference.md) - Command line interface
- [DSL TypeScript Reference](./dsl-typescript-reference.md) - Contract format
- [DSL Reference](./dsl-reference.md) - DSL syntax
- [DSL Generation Proposal](./DSL_GENERATION_PROPOSAL.md) - Design rationale

## Adding New Templates

1. Create template file in `generator/templates/`
2. Export functions from template file
3. Add export to `generator/templates/index.ts`
4. Use in `generator/core/simple-generator.ts`

Example template:

```typescript
// generator/templates/mytemplate.ts
export function myTemplate(name: string): string {
  return `// Generated: ${name}`;
}
```

## Generated Output Structure

```
target/
├── api/
│   ├── src/
│   │   ├── server.ts      # Express server
│   │   ├── routes/        # Entity CRUD routes
│   │   └── models/        # TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # React app
│   │   ├── components/    # Entity list components
│   │   └── hooks/         # API data hooks
│   ├── package.json
│   └── vite.config.ts
├── database/
│   └── migrations/        # SQL schema
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.frontend
├── docker-compose.yml
└── README.md
```
