# Contract Markdown 3.0

> LLM-optimized contract format for human and AI collaboration

**Related docs:** [Architecture Overview](00-architecture-overview.md) | [Code Generation](31-code-generation.md) | [CLI Reference](cli-reference.md)

---

## Overview

Contract Markdown (`.contract.md`) is a new format that combines:
- **YAML frontmatter** - structured configuration
- **Markdown sections** - human-readable documentation
- **TypeScript blocks** - type definitions
- **Tables** - entity and API definitions

---

## Quick Start

```bash
# Generate from Contract Markdown
./bin/reclapp examples/contract-ai/todo.contract.md

# Output: examples/target/
#   ├── api/
#   ├── frontend/
#   └── README.md
```

---

## File Structure

```
┌─────────────────────────────────────────┐
│ --- (YAML Frontmatter)                  │
│ contract, generation, tech, runtime     │
│ ---                                     │
├─────────────────────────────────────────┤
│ # App Title                             │
│ > Description                           │
├─────────────────────────────────────────┤
│ ## App Definition                       │
│ Domain, Type, Users, Features           │
├─────────────────────────────────────────┤
│ ## Entities                             │
│ ### EntityName                          │
│ | Field | Type | Required | Description │
├─────────────────────────────────────────┤
│ ## API                                  │
│ | Method | Path | Description |         │
├─────────────────────────────────────────┤
│ ## Business Rules                       │
│ Validation rules, assertions (YAML)     │
├─────────────────────────────────────────┤
│ ## Tech Stack                           │
│ Backend, Frontend, Database (YAML)      │
├─────────────────────────────────────────┤
│ ## Tests                                │
│ Gherkin scenarios, API tests (YAML)     │
└─────────────────────────────────────────┘
```

---

## Example Contract

```markdown
---
contract:
  name: todo-app
  version: 1.0.0
  description: Simple todo application

generation:
  mode: full-stack
  output: ./generated

tech:
  backend: express-typescript
  frontend: react-vite
  database: json-file
  testing: jest

runtime:
  port: 3000
  healthCheck: /health
---

# Todo App Contract

> A task management application with categories.

## App Definition

**Domain:** Task Management  
**Type:** B2B Internal Tool  
**Users:** Team members

### Features

- [x] Create, read, update, delete tasks
- [x] Organize tasks by category
- [ ] Due date reminders

---

## Entities

### Task

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Unique identifier |
| `title` | string | yes | Task title |
| `status` | enum | yes | pending, in_progress, completed |
| `createdAt` | datetime | auto | Creation timestamp |

**TypeScript Definition:**

\`\`\`typescript
interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}
\`\`\`

---

## API

### Base URL

\`\`\`
http://localhost:3000/api/v1
\`\`\`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List all tasks |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |

---

## Business Rules

\`\`\`yaml
assertions:
  - name: task-title-required
    entity: Task
    field: title
    rule: required
    message: "Task title is required"
\`\`\`

---

## Tests

### API Tests

\`\`\`yaml
tests:
  - name: health-check
    method: GET
    path: /health
    expect:
      status: 200
\`\`\`
```

---

## Frontmatter Reference

### contract

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Application name |
| `version` | string | yes | Semantic version |
| `description` | string | yes | App description |
| `author` | string | no | Author name |
| `created` | date | no | Creation date |

### generation

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `mode` | enum | full-stack | full-stack, backend-only, api-only |
| `output` | string | ./generated | Output directory |
| `overwrite` | boolean | true | Overwrite existing files |

### tech

| Field | Type | Options |
|-------|------|---------|
| `backend` | string | express-typescript, fastify-typescript |
| `frontend` | string | react-vite, vue-vite, none |
| `database` | string | json-file, sqlite, postgres |
| `testing` | string | jest, vitest |

### runtime

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | 3000 | API server port |
| `healthCheck` | string | /health | Health check path |
| `cors` | boolean | true | Enable CORS |
| `logging` | boolean | true | Enable request logging |

---

## Entity Tables

Define entities using Markdown tables:

```markdown
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Primary key |
| `name` | string | yes | Required field |
| `email` | string | no | Optional field |
```

### Supported Types

| Type | TypeScript | Description |
|------|------------|-------------|
| `uuid` | string | UUID identifier |
| `string` | string | Text (max 255) |
| `text` | string | Long text |
| `number` | number | Numeric |
| `boolean` | boolean | True/false |
| `datetime` | Date | Date and time |
| `date` | Date | Date only |
| `enum` | union | Enumerated values |
| `json` | object | JSON object |

### Required Values

| Value | Meaning |
|-------|---------|
| `yes` | Required field |
| `no` | Optional field |
| `auto` | Auto-generated (id, timestamps) |

---

## API Tables

Define endpoints using tables:

```markdown
| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/items` | List items | - | Item[] |
| POST | `/items` | Create item | CreateItem | Item |
```

---

## Parser Implementation

**Files:**
- `@/home/tom/github/wronai/contract/src/core/contract-ai/types/contract-markdown.ts` - TypeScript types
- `@/home/tom/github/wronai/contract/src/core/contract-ai/parser/markdown-parser.ts` - Parser
- `@/home/tom/github/wronai/contract/src/core/contract-ai/converter/to-contract-ai.ts` - Converter

### Usage in Code

```typescript
import { parseContractMarkdown, validateContract } from './parser/markdown-parser';
import { convertToContractAI } from './converter/to-contract-ai';

const content = fs.readFileSync('app.contract.md', 'utf-8');
const parsed = parseContractMarkdown(content);
const validation = validateContract(parsed);

if (validation.valid) {
  const contractAI = convertToContractAI(parsed);
  // Use with code generator
}
```

---

## Benefits

### For Humans
- Familiar Markdown syntax
- Self-documenting with examples
- Git-friendly diffs
- Editable in any editor

### For LLMs
- Clear structure with headers
- Explicit TypeScript types
- JSON examples for context
- Parseable YAML + tables

### For Generation
- Deterministic parsing
- Extensible sections
- Validatable schema
- Portable to other formats

---

## Related Documentation

- [Architecture Overview](00-architecture-overview.md)
- [Code Generation](31-code-generation.md)
- [Evolution System](30-evolution-system.md)
- [CLI Reference](cli-reference.md)
