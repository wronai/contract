# Reclapp Contract Format 3.0 - Human & LLM Optimized

**Project:** Reclapp  
**Status:** 🟡 Proposal  
**Version:** 3.0-draft  
**Date:** January 2, 2026  
**Author:** Softreck  

---

## Executive Summary

This document proposes a new contract format for Reclapp that optimizes for both human readability and LLM processing. The format combines Markdown's accessibility with structured YAML metadata and TypeScript type definitions.

## Current State Analysis

### Existing Contract Formats in Reclapp

| Format | File Extension | Pros | Cons |
|--------|---------------|------|------|
| TypeScript | `.reclapp.ts` | Type-safe, IDE support | Verbose, intimidating for non-devs |
| RCL DSL | `.reclapp.rcl` | Compact | Custom syntax learning curve |
| Markdown Log | `.rcl.md` | Human readable | No structure for parsing |
| Pydantic | `.py` | Python ecosystem | Python-only |

### Pain Points

1. **LLM Compatibility**: TypeScript contracts require understanding of complex type syntax
2. **Human Editing**: RCL DSL has a learning curve
3. **Validation**: No unified validation across formats
4. **Portability**: Different formats for different use cases

---

## Proposed Solution: Contract Markdown (`.contract.md`)

### Design Principles

1. **Markdown First**: Use familiar syntax everyone knows
2. **Structured Metadata**: YAML frontmatter for machine parsing
3. **Inline Types**: TypeScript/JSON Schema in fenced code blocks
4. **Self-Documenting**: Examples and descriptions inline
5. **LLM-Optimized**: Clear sections with semantic headings

### File Structure

```
┌─────────────────────────────────────────┐
│ YAML Frontmatter                        │
│ (metadata, version, config)             │
├─────────────────────────────────────────┤
│ ## App Definition                       │
│ (name, description, domain)             │
├─────────────────────────────────────────┤
│ ## Entities                             │
│ (data models with fields)               │
├─────────────────────────────────────────┤
│ ## API                                  │
│ (endpoints, methods, responses)         │
├─────────────────────────────────────────┤
│ ## Business Rules                       │
│ (validations, constraints)              │
├─────────────────────────────────────────┤
│ ## Tech Stack                           │
│ (backend, frontend, database)           │
├─────────────────────────────────────────┤
│ ## Tests                                │
│ (acceptance criteria, test cases)       │
└─────────────────────────────────────────┘
```

---

## Complete Example: Todo App Contract

```markdown
---
# Contract Metadata
contract:
  name: todo-app
  version: 1.0.0
  description: Simple todo application with task management
  author: user
  created: 2026-01-02
  
# Generation Settings  
generation:
  mode: full-stack
  output: ./generated
  
# Technology Stack
tech:
  backend: express-typescript
  frontend: react-vite
  database: json-file
  testing: jest
  
# Runtime Settings
runtime:
  port: 3000
  healthCheck: /health
---

# Todo App Contract

> A simple task management application with CRUD operations, 
> categories, and priority levels.

## App Definition

**Domain:** Task Management  
**Type:** B2B Internal Tool  
**Users:** Team members, Project managers

### Features

- [ ] Create, read, update, delete tasks
- [ ] Organize tasks by category
- [ ] Set priority levels (low, medium, high)
- [ ] Mark tasks as complete
- [ ] Filter and search tasks

---

## Entities

### Task

The primary entity representing a todo item.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Unique identifier |
| `title` | string | yes | Task title (max 200 chars) |
| `description` | text | no | Detailed description |
| `status` | enum | yes | pending, in_progress, completed |
| `priority` | enum | yes | low, medium, high |
| `categoryId` | uuid | no | Reference to Category |
| `dueDate` | datetime | no | Task deadline |
| `createdAt` | datetime | auto | Creation timestamp |
| `updatedAt` | datetime | auto | Last update timestamp |

**TypeScript Definition:**

\`\`\`typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  categoryId?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
\`\`\`

**Example:**

\`\`\`json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Implement user authentication",
  "description": "Add JWT-based auth to the API",
  "status": "in_progress",
  "priority": "high",
  "categoryId": "cat-001",
  "dueDate": "2026-01-15T00:00:00Z",
  "createdAt": "2026-01-02T10:00:00Z",
  "updatedAt": "2026-01-02T10:00:00Z"
}
\`\`\`

---

### Category

Groups tasks into logical categories.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Unique identifier |
| `name` | string | yes | Category name (max 100 chars) |
| `color` | string | no | Hex color code for UI |
| `createdAt` | datetime | auto | Creation timestamp |

**TypeScript Definition:**

\`\`\`typescript
interface Category {
  id: string;
  name: string;
  color?: string;
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

#### Tasks

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | `/tasks` | List all tasks | - | Task[] |
| GET | `/tasks/:id` | Get task by ID | - | Task |
| POST | `/tasks` | Create new task | CreateTask | Task |
| PUT | `/tasks/:id` | Update task | UpdateTask | Task |
| DELETE | `/tasks/:id` | Delete task | - | { success: true } |

**Create Task Request:**

\`\`\`typescript
interface CreateTask {
  title: string;           // required
  description?: string;
  status?: TaskStatus;     // default: 'pending'
  priority?: TaskPriority; // default: 'medium'
  categoryId?: string;
  dueDate?: string;        // ISO 8601 format
}
\`\`\`

**Query Parameters for GET /tasks:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |
| `categoryId` | string | Filter by category |
| `search` | string | Search in title/description |
| `limit` | number | Pagination limit (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

#### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List all categories |
| POST | `/categories` | Create category |
| DELETE | `/categories/:id` | Delete category |

#### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

---

## Business Rules

### Validation Rules

1. **Task Title**
   - Required
   - Minimum 3 characters
   - Maximum 200 characters
   - No leading/trailing whitespace

2. **Task Status Transitions**
   - `pending` → `in_progress` ✓
   - `pending` → `completed` ✓
   - `in_progress` → `completed` ✓
   - `completed` → `pending` ✓ (reopen)
   - `completed` → `in_progress` ✗

3. **Category Deletion**
   - Cannot delete category with associated tasks
   - Must reassign or delete tasks first

4. **Due Date**
   - Must be in the future when creating
   - Can be in the past when updating (for overdue tracking)

### Assertions

\`\`\`yaml
assertions:
  - name: task-title-required
    entity: Task
    field: title
    rule: required
    message: "Task title is required"
    
  - name: task-title-length
    entity: Task
    field: title
    rule: length(3, 200)
    message: "Title must be between 3 and 200 characters"
    
  - name: valid-status-transition
    entity: Task
    field: status
    rule: custom
    validator: validateStatusTransition
    message: "Invalid status transition"
\`\`\`

---

## Tech Stack

### Backend

\`\`\`yaml
backend:
  framework: express
  language: typescript
  runtime: node >= 18
  features:
    - cors
    - helmet (security)
    - morgan (logging)
    - compression
  validation: zod
\`\`\`

### Frontend

\`\`\`yaml
frontend:
  framework: react
  bundler: vite
  styling: tailwind
  state: react-query
  features:
    - Dark mode
    - Responsive design
    - Optimistic updates
\`\`\`

### Database

\`\`\`yaml
database:
  type: json-file
  path: ./data/db.json
  backup: true
  # Alternative: sqlite, postgres
\`\`\`

---

## Tests

### Acceptance Criteria

\`\`\`gherkin
Feature: Task Management

  Scenario: Create a new task
    Given I have no tasks
    When I create a task with title "Buy groceries"
    Then I should see the task in the list
    And the task status should be "pending"
    
  Scenario: Complete a task
    Given I have a task with status "pending"
    When I update the status to "completed"
    Then the task status should be "completed"
    And the updatedAt timestamp should change
    
  Scenario: Filter tasks by status
    Given I have 3 pending tasks and 2 completed tasks
    When I filter by status "pending"
    Then I should see 3 tasks
\`\`\`

### API Tests

\`\`\`yaml
tests:
  - name: health-check
    method: GET
    path: /health
    expect:
      status: 200
      body:
        status: ok
        
  - name: create-task
    method: POST
    path: /api/v1/tasks
    body:
      title: "Test task"
      priority: "high"
    expect:
      status: 201
      body:
        title: "Test task"
        status: "pending"
        
  - name: list-tasks
    method: GET
    path: /api/v1/tasks
    expect:
      status: 200
      body: array
\`\`\`

---

## Generation Instructions

### For LLM Code Generation

When generating code from this contract:

1. **Parse the YAML frontmatter** for configuration
2. **Extract entities** from the Entities section tables
3. **Generate types** matching the TypeScript definitions
4. **Create routes** for each API endpoint
5. **Implement validations** from Business Rules
6. **Generate tests** from the Tests section

### Output Structure

\`\`\`
generated/
├── api/
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── tasks.ts
│   │   │   └── categories.ts
│   │   ├── models/
│   │   │   ├── task.ts
│   │   │   └── category.ts
│   │   └── validators/
│   │       └── task.ts
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── api.test.ts
│   └── setup.ts
├── frontend/
│   └── src/
│       ├── App.tsx
│       └── components/
└── logs/
    └── generation.rcl.md
\`\`\`

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-02 | Initial contract |

```

---

## Benefits of This Format

### For Humans

1. **Familiar Syntax**: Markdown is universal
2. **Self-Documenting**: Examples inline with definitions
3. **Version Control Friendly**: Clean diffs in git
4. **Editable in Any Editor**: No special tooling needed
5. **Renderable**: GitHub/GitLab renders it beautifully

### For LLMs

1. **Clear Structure**: Semantic sections with headers
2. **Type Definitions**: Explicit TypeScript blocks
3. **Examples**: JSON samples for understanding
4. **Context**: Descriptions explain intent
5. **Parseable**: YAML frontmatter + structured tables

### For Code Generation

1. **Deterministic Parsing**: YAML + tables are structured
2. **Extensible**: Add custom sections as needed
3. **Validatable**: Schema can verify structure
4. **Portable**: Convert to TypeScript/Pydantic programmatically

---

## Implementation Roadmap

### Phase 1: Parser (Week 1)

```typescript
// src/core/contract-ai/parser/markdown-parser.ts

interface ContractMarkdown {
  frontmatter: ContractFrontmatter;
  sections: {
    app: AppDefinition;
    entities: EntityDefinition[];
    api: ApiDefinition;
    rules: BusinessRule[];
    tech: TechStack;
    tests: TestDefinition[];
  };
}

function parseContractMarkdown(content: string): ContractMarkdown {
  const { frontmatter, body } = parseFrontmatter(content);
  const sections = parseSections(body);
  return { frontmatter, sections };
}
```

### Phase 2: Validator (Week 2)

- JSON Schema for frontmatter
- Entity field type validation
- API endpoint consistency check
- Cross-reference validation (categoryId exists)

### Phase 3: Generator Integration (Week 3)

- Convert parsed contract to existing ContractAI format
- Or directly generate from new format
- Backward compatibility with `.reclapp.ts`

### Phase 4: CLI Commands (Week 4)

```bash
reclapp init --format markdown    # Create new .contract.md
reclapp convert old.reclapp.ts    # Convert to new format
reclapp validate app.contract.md  # Validate contract
reclapp generate app.contract.md  # Generate from contract
```

---

## Migration Guide

### Converting Existing Contracts

```bash
# Automatic conversion
reclapp convert examples/crm/contracts/main.reclapp.ts \
  --output examples/crm/contracts/main.contract.md

# Manual: copy TypeScript types to code blocks
# Manual: extract entities to tables
```

### Backward Compatibility

The system should support all formats:
- `.contract.md` (new, preferred)
- `.reclapp.ts` (TypeScript)
- `.reclapp.rcl` (DSL)
- Natural language prompts

---

## Next Steps

1. **Review this proposal** with team
2. **Create parser prototype** for `.contract.md`
3. **Test with existing examples** (CRM, E-commerce)
4. **Gather feedback** from LLM generation quality
5. **Iterate on format** based on results

---

## References

- [Reclapp Project Status](docs/22-project-status.md)
- [Contract AI Documentation](docs/contract-ai.md)
- [TypeSpec](https://typespec.io/) - Similar approach for APIs
- [OpenAPI](https://openapis.org/) - Industry standard
