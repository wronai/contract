---
# ==============================================
# CONTRACT METADATA
# ==============================================
contract:
  name: todo-app
  version: 1.0.0
  description: Simple todo application with task management, categories, and priorities
  author: Softreck
  created: 2026-01-02
  license: Apache-2.0

# ==============================================
# GENERATION SETTINGS
# ==============================================
generation:
  mode: full-stack        # full-stack | backend-only | api-only
  output: ./generated
  overwrite: true

# ==============================================
# TECHNOLOGY STACK (Quick Config)
# ==============================================
tech:
  backend: express-typescript
  frontend: react-vite
  database: json-file
  testing: jest

# ==============================================
# RUNTIME SETTINGS
# ==============================================
runtime:
  port: 3000
  healthCheck: /health
  cors: true
  logging: true
---

# 📋 Todo App Contract

> A simple task management application with CRUD operations, categories, 
> and priority levels. Built with Express.js backend and React frontend.

## App Definition

**Domain:** Task Management  
**Type:** B2B Internal Tool  
**Users:** Team members, Project managers, Individual users

### Features

- [x] Create, read, update, delete tasks
- [x] Organize tasks by category
- [x] Set priority levels (low, medium, high)
- [x] Mark tasks as complete
- [x] Filter tasks by status/priority
- [ ] Search tasks by title/description
- [ ] Due date reminders
- [ ] Task assignments

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

```typescript
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

type CreateTaskInput = Pick<Task, 'title'> & Partial<Pick<Task, 'description' | 'status' | 'priority' | 'categoryId' | 'dueDate'>>;
type UpdateTaskInput = Partial<CreateTaskInput>;
```

**Example:**

```json
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
```

---

### Category

Groups tasks into logical categories for organization.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | uuid | auto | Unique identifier |
| `name` | string | yes | Category name (max 100 chars) |
| `color` | string | no | Hex color code (#RRGGBB) |
| `description` | string | no | Category description |
| `createdAt` | datetime | auto | Creation timestamp |

**TypeScript Definition:**

```typescript
interface Category {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: Date;
}

type CreateCategoryInput = Pick<Category, 'name'> & Partial<Pick<Category, 'color' | 'description'>>;
```

**Example:**

```json
{
  "id": "cat-001",
  "name": "Work",
  "color": "#3B82F6",
  "description": "Work-related tasks",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

---

## API

### Base URL

```
http://localhost:3000/api/v1
```

### Health Check

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/health` | Health check | `{ status: "ok", timestamp: "..." }` |

### Tasks Endpoints

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/tasks` | List all tasks | Query params | Task[] |
| GET | `/tasks/:id` | Get task by ID | - | Task |
| POST | `/tasks` | Create new task | CreateTaskInput | Task |
| PUT | `/tasks/:id` | Update task | UpdateTaskInput | Task |
| DELETE | `/tasks/:id` | Delete task | - | `{ success: true }` |

**Query Parameters for GET /tasks:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | - | Filter: pending, in_progress, completed |
| `priority` | string | - | Filter: low, medium, high |
| `categoryId` | string | - | Filter by category |
| `search` | string | - | Search in title/description |
| `limit` | number | 50 | Max results per page |
| `offset` | number | 0 | Pagination offset |
| `sort` | string | createdAt | Sort field |
| `order` | string | desc | Sort order: asc, desc |

### Categories Endpoints

| Method | Path | Description | Request | Response |
|--------|------|-------------|---------|----------|
| GET | `/categories` | List categories | - | Category[] |
| GET | `/categories/:id` | Get category | - | Category |
| POST | `/categories` | Create category | CreateCategoryInput | Category |
| PUT | `/categories/:id` | Update category | Partial<Category> | Category |
| DELETE | `/categories/:id` | Delete category | - | `{ success: true }` |

---

## Business Rules

### Validation Rules

1. **Task Title**
   - Required field
   - Minimum 1 character
   - Maximum 200 characters
   - Trimmed of whitespace

2. **Task Status**
   - Default value: `pending`
   - Valid values: `pending`, `in_progress`, `completed`

3. **Task Priority**
   - Default value: `medium`
   - Valid values: `low`, `medium`, `high`

4. **Category Name**
   - Required field
   - Unique (no duplicate names)
   - Maximum 100 characters

5. **Category Color**
   - Optional field
   - Must be valid hex color (#RRGGBB or #RGB)

6. **Category Deletion**
   - Cannot delete category with associated tasks
   - Return error listing affected tasks

### Assertions

```yaml
assertions:
  - name: task-title-required
    entity: Task
    field: title
    rule: required
    message: "Task title is required"
    
  - name: task-title-length
    entity: Task
    field: title
    rule: maxLength(200)
    message: "Title cannot exceed 200 characters"
    
  - name: task-status-valid
    entity: Task
    field: status
    rule: enum(pending, in_progress, completed)
    message: "Invalid task status"
    
  - name: task-priority-valid
    entity: Task
    field: priority
    rule: enum(low, medium, high)
    message: "Invalid task priority"
    
  - name: category-name-required
    entity: Category
    field: name
    rule: required
    message: "Category name is required"
    
  - name: category-name-unique
    entity: Category
    field: name
    rule: unique
    message: "Category name must be unique"
    
  - name: category-color-format
    entity: Category
    field: color
    rule: regex(^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$)
    message: "Color must be a valid hex code"
```

---

## Tech Stack

### Backend

```yaml
backend:
  framework: express
  language: typescript
  runtime: node >= 18
  features:
    - cors
    - helmet
    - morgan
    - compression
  validation: zod
  structure:
    - src/server.ts        # Entry point
    - src/routes/          # Route handlers
    - src/models/          # Type definitions
    - src/validators/      # Zod schemas
    - src/middleware/      # Custom middleware
```

### Frontend

```yaml
frontend:
  framework: react
  version: "18"
  bundler: vite
  styling: tailwind
  state: useState + useReducer
  features:
    - TypeScript
    - Responsive design
    - Loading states
    - Error handling
    - Optimistic updates
  components:
    - TaskList
    - TaskForm
    - TaskCard
    - CategorySelector
    - FilterBar
```

### Database

```yaml
database:
  type: json-file
  path: ./data/db.json
  backup: false
  schema:
    tasks: Task[]
    categories: Category[]
```

---

## Tests

### Acceptance Criteria

```gherkin
Feature: Task Management

  Scenario: Create a new task
    Given I have no tasks
    When I create a task with title "Buy groceries"
    Then I should see the task in the list
    And the task status should be "pending"
    And the task priority should be "medium"
    
  Scenario: Complete a task
    Given I have a task with status "pending"
    When I update the status to "completed"
    Then the task status should be "completed"
    And the updatedAt timestamp should change
    
  Scenario: Filter tasks by status
    Given I have 3 pending tasks and 2 completed tasks
    When I filter by status "pending"
    Then I should see 3 tasks
    
  Scenario: Delete a task
    Given I have a task with id "task-123"
    When I delete the task
    Then the task should not exist
    And GET /tasks/task-123 should return 404
    
  Scenario: Create a category
    Given I have no categories
    When I create a category with name "Work" and color "#3B82F6"
    Then I should see the category in the list
    
  Scenario: Cannot delete category with tasks
    Given I have a category "Work" with 2 tasks
    When I try to delete the category
    Then I should receive an error
    And the error message should mention the associated tasks
```

### API Tests

```yaml
tests:
  # Health Check
  - name: health-check
    method: GET
    path: /health
    expect:
      status: 200
      body:
        status: ok
        
  # Task CRUD
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
        priority: "high"
        
  - name: list-tasks
    method: GET
    path: /api/v1/tasks
    expect:
      status: 200
      body: array
      
  - name: get-task
    method: GET
    path: /api/v1/tasks/:id
    setup: create-task
    expect:
      status: 200
      body:
        id: $created.id
        
  - name: update-task
    method: PUT
    path: /api/v1/tasks/:id
    setup: create-task
    body:
      status: "completed"
    expect:
      status: 200
      body:
        status: "completed"
        
  - name: delete-task
    method: DELETE
    path: /api/v1/tasks/:id
    setup: create-task
    expect:
      status: 200
      body:
        success: true
        
  # Validation Tests
  - name: create-task-without-title
    method: POST
    path: /api/v1/tasks
    body: {}
    expect:
      status: 400
      body:
        error: "Task title is required"
        
  - name: create-task-title-too-long
    method: POST
    path: /api/v1/tasks
    body:
      title: "x".repeat(201)
    expect:
      status: 400
      body:
        error: "Title cannot exceed 200 characters"
        
  # Category CRUD
  - name: create-category
    method: POST
    path: /api/v1/categories
    body:
      name: "Test Category"
      color: "#FF5733"
    expect:
      status: 201
      body:
        name: "Test Category"
        color: "#FF5733"
        
  - name: list-categories
    method: GET
    path: /api/v1/categories
    expect:
      status: 200
      body: array
      
  # Filter Tests
  - name: filter-tasks-by-status
    method: GET
    path: /api/v1/tasks?status=pending
    expect:
      status: 200
      body: array
      
  - name: filter-tasks-by-priority
    method: GET
    path: /api/v1/tasks?priority=high
    expect:
      status: 200
      body: array
```

---

## Generation Instructions

### For LLM Code Generation

When generating code from this contract, follow these steps:

1. **Parse Frontmatter**: Extract configuration from YAML header
2. **Generate Types**: Create TypeScript interfaces from entity tables
3. **Create Validators**: Generate Zod schemas from assertions
4. **Build Routes**: Create Express routes for each API endpoint
5. **Implement Storage**: Set up JSON file database
6. **Add Middleware**: Include CORS, logging, error handling
7. **Generate Tests**: Create Jest tests from test definitions
8. **Build Frontend**: Create React components for each entity

### Output Structure

```
generated/
├── api/
│   ├── src/
│   │   ├── server.ts           # Express app entry
│   │   ├── routes/
│   │   │   ├── tasks.ts        # Task routes
│   │   │   └── categories.ts   # Category routes
│   │   ├── models/
│   │   │   ├── task.ts         # Task type
│   │   │   └── category.ts     # Category type
│   │   ├── validators/
│   │   │   ├── task.ts         # Zod schema
│   │   │   └── category.ts     # Zod schema
│   │   └── data/
│   │       └── db.json         # Initial empty database
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   ├── CategoryList.tsx
│   │   │   └── FilterBar.tsx
│   │   ├── hooks/
│   │   │   └── useApi.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── tests/
│   ├── api.test.ts
│   └── setup.ts
└── logs/
    └── generation.rcl.md
```

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-02 | Softreck | Initial contract |

---

## Notes

- This contract uses the new `.contract.md` format optimized for both human editing and LLM parsing
- All fields marked as `auto` are generated server-side
- The JSON file database is suitable for development; switch to SQLite/PostgreSQL for production
- Frontend state management uses React hooks for simplicity; consider Redux or Zustand for complex apps
