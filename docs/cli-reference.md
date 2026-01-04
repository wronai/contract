# Reclapp CLI Reference

Command-line interface for generating applications from:

- `.reclapp.ts` (TypeScript)
- `.reclapp.rcl` (Mini-DSL)
- `.rcl.md` (Markdown with conversation)

For LLM configuration (providers, models, priorities, routing), see:

- **[LLM Configuration](23-llm-configuration.md)**

## Installation

```bash
# Or run directly from repository
./bin/reclapp <command>

# Interactive chat (from repo)
./bin/reclapp chat
./bin/reclapp-chat
```

## Commands

### `reclapp llm`

Manage LLM configuration and routing.

```bash
reclapp llm status
reclapp llm config list
reclapp llm set-provider <provider>
reclapp llm set-model <provider> <model>
reclapp llm key set <provider> <api_key>
reclapp llm key unset <provider>
reclapp llm priority set-provider <provider> <priority>
reclapp llm priority set-model <model_name> <priority>
reclapp llm model add --model-name ... --litellm-model ...
reclapp llm model remove <model_name>
reclapp llm fallbacks list
reclapp llm fallbacks add <model_name>
reclapp llm fallbacks remove <model_name>
```

`reclapp llm set-provider auto` enables automatic fallback selection: providers are tried in priority order.

`reclapp llm model list` is kept as a legacy alias for `reclapp llm config list`.

Details and examples are documented in:

- **[LLM Configuration](23-llm-configuration.md)**

### `reclapp run`

Generate, install dependencies, and start the API server.

```bash
reclapp run <contract.reclapp.ts|contract.reclapp.rcl|contract.rcl.md> [options]

# Aliases: r
```

**What it does:**
1. Generates application from contract
2. Installs npm dependencies
3. Starts API server on port 8080

**Example:**

```bash
reclapp run examples/crm/contracts/main.reclapp.ts
```

---

### `reclapp test`

Generate, run, and automatically test all API endpoints.

```bash
reclapp test <contract.reclapp.ts|contract.reclapp.rcl|contract.rcl.md> [options]

# Aliases: t
```

**What it does:**
1. Generates application from contract
2. Installs npm dependencies
3. Starts API server
4. Runs CRUD tests for each entity
5. Reports results and exits

**Example:**

```bash
reclapp test examples/crm/contracts/main.reclapp.ts

# Output:
# 🧪 Running API tests...
#   ✅ GET /api/health returns 200
#   ✅ GET /api/contacts returns 200
#   ✅ POST /api/contacts creates item
#   ...
# 📊 Results: 11 passed, 0 failed
```

---

### `reclapp deploy`

Generate and deploy with Docker Compose.

```bash
reclapp deploy <contract.reclapp.ts|contract.reclapp.rcl|contract.rcl.md> [options]
```

**What it does:**
1. Generates application from contract
2. Builds Docker containers
3. Starts containers with docker-compose

**Example:**

```bash
reclapp deploy examples/crm/contracts/main.reclapp.ts

# Output:
# ✅ Deployment complete!
#    API:      http://localhost:8080
#    Frontend: http://localhost:3000
```

---

### `reclapp generate`

Generate a full application from a contract file.

```bash
reclapp generate <contract.reclapp.ts|contract.reclapp.rcl|contract.rcl.md> [options]

# Aliases: gen, g
```

**Options:**

| Option | Description |
|--------|-------------|
| `--output, -o <dir>` | Output directory (default: `./target`) |
| `--only <part>` | Generate only: `api`, `frontend`, `database`, `docker` |
| `--verbose, -v` | Show detailed output |

**Examples:**

```bash
# Generate CRM application
reclapp generate examples/crm/contracts/main.reclapp.ts

# Generate from Mini-DSL
reclapp generate examples/crm/contracts/main.reclapp.rcl

# Generate from Markdown
reclapp generate examples/crm/contracts/main.rcl.md

# Generate to custom directory
reclapp generate contracts/app.reclapp.ts --output ./dist

# Generate with verbose output
reclapp generate contracts/app.reclapp.ts -v
```

**Generated Structure:**

```
target/
├── api/
│   ├── src/
│   │   ├── server.ts       # Express server
│   │   ├── routes/         # CRUD routes per entity
│   │   └── models/         # TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx         # React application
│   │   ├── components/     # Entity list components
│   │   └── hooks/          # API data hooks
│   ├── package.json
│   └── vite.config.ts
├── database/
│   └── migrations/         # SQL schema
├── docker/
│   ├── Dockerfile.api
│   └── Dockerfile.frontend
├── docker-compose.yml
├── README.md
└── .env.example
```

---

### `reclapp dev`

Generate application and start development servers (API + Frontend).

```bash
reclapp dev <contract.reclapp.ts|contract.reclapp.rcl|contract.rcl.md> [options]

# Aliases: d
```

**Options:**

| Option | Description |
|--------|-------------|
| `--output, -o <dir>` | Output directory (default: `./target`) |

**Examples:**

```bash
# Generate and start CRM
reclapp dev examples/crm/contracts/main.reclapp.ts

# Start in custom directory
reclapp dev contracts/app.reclapp.ts --output ./my-app
```

This command will:
1. Generate the application
2. Install npm dependencies
3. Start API server on port 8080
4. Start Frontend dev server on port 3000

---

### `reclapp validate`

Validate a contract file without generating code.

```bash
reclapp validate <contract.reclapp.ts|contract.reclapp.rcl|contract.rcl.md>

# Aliases: v
```

**Examples:**

```bash
reclapp validate examples/crm/contracts/main.reclapp.ts
```

**Output:**

```
🔍 Validating examples/crm/contracts/main.reclapp.ts...

✅ Contract is valid!
   App: CRM System v2.1.0
   Entities: 6
   Events: 5
   Dashboards: 4
```

---

### `reclapp list`

List all available `.reclapp.ts` contract files in the current directory.

```bash
reclapp list

# Aliases: ls, l
```

**Output:**

```
📋 Available contracts:

  examples/crm/contracts/main.reclapp.ts
  examples/e-commerce/contracts/main.reclapp.ts
  examples/saas-starter/contracts/main.reclapp.ts
```

---

### `reclapp studio`

Interactive examples browser with generate, test, and deploy capabilities.

```bash
reclapp studio
```

**Features:**
- Lists all available contracts with metadata
- Interactive menu for selecting examples
- Generate, test, or deploy selected examples
- Stop all running containers

**Commands in Studio:**
| Command | Description |
|---------|-------------|
| `[1-N]` | Select example by number |
| `g <n>` | Generate example |
| `t <n>` | Test example |
| `d <n>` | Deploy example |
| `s` | Stop all containers |
| `q` | Quit studio |

---

### `reclapp chat`

Interactive LLM-powered contract designer in terminal.

```bash
reclapp chat

# Aliases: ai
```

**Features:**
- Conversational contract design with local LLM (Ollama)
- Real-time contract validation
- Save and generate applications directly

**Commands in Chat:**
| Command | Description |
|---------|-------------|
| `/save [dir]` | Save contract to directory |
| `/show` | Show current contract |
| `/clear` | Clear conversation history |
| `/model [name]` | Show/switch LLM model |
| `/name <name>` | Set project name |
| `/generate [dir]` | Save and generate application |
| `/quit` | Exit |

**Example Session:**
```bash
💬 You: Create a task management app

🤖 Assistant: I'll design a task manager with projects and tasks...

💬 You: /show
📄 Current Contract:
app "Task Manager" { ... }

💬 You: /generate ./apps/tasks
✅ Saved and generated to ./apps/tasks
```

**Environment Variables:**
- `OLLAMA_HOST` - Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL` - LLM model (default: `deepseek-coder:6.7b`)

---

### `reclapp convert`

Convert contracts between different formats.

```bash
reclapp convert <input> --format <format> [-o output]

# Aliases: conv
```

**Supported Formats:**
| Format | Extension | Description |
|--------|-----------|-------------|
| `ts` | `.reclapp.ts` | TypeScript contract |
| `rcl` | `.reclapp.rcl` | Mini-DSL contract |
| `md` | `.rcl.md` | Markdown contract |

**Examples:**
```bash
# Convert TypeScript to Markdown
reclapp convert contract.reclapp.ts --format md

# Convert Mini-DSL to TypeScript
reclapp convert contract.reclapp.rcl --format ts

# Convert Markdown to Mini-DSL
reclapp convert contract.rcl.md --format rcl
```

---

### `reclapp normalize`

Normalize a Mini-DSL contract file by fixing common LLM mistakes (e.g. `field: type,`, `money PLN`, `@indexed`, `@belongs_to`).

```bash
reclapp normalize <input.reclapp.rcl> [--in-place] [-o <output>]

# Aliases: norm
```

**Examples:**

```bash
# Write normalized output to a new file
reclapp normalize apps/my-app/contracts/main.reclapp.rcl -o /tmp/main.reclapp.rcl

# Normalize in place
reclapp normalize apps/my-app/contracts/main.reclapp.rcl --in-place
```

---

### `reclapp stop`

Stop all running Reclapp Docker containers.

```bash
reclapp stop
```

Stops containers on ports:
- 8080 (API)
- 3000 (Frontend)
- 5432 (PostgreSQL)

---

## Quick Start

```bash
# 1. List available contracts
reclapp list

# 2. Validate a contract
reclapp validate examples/crm/contracts/main.reclapp.ts

# 3. Generate application
reclapp generate examples/crm/contracts/main.reclapp.ts

# 4. Run the generated app
cd examples/crm/target/api && npm install && npm run dev
cd examples/crm/target/frontend && npm install && npm run dev

# Or use dev command to do everything at once
reclapp dev examples/crm/contracts/main.reclapp.ts
```

---

## Contract File Format

Contracts are TypeScript files (`.reclapp.ts`) that export a `ReclappContract`:

```typescript
import type { ReclappContract, Entity } from '@reclapp/contracts';

const User: Entity = {
  name: 'User',
  fields: [
    { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
    { name: 'name', type: 'String', annotations: { required: true } },
    { name: 'role', type: 'String', annotations: { enum: ['admin', 'user'] } }
  ]
};

export const contract: ReclappContract = {
  app: {
    name: 'My App',
    version: '1.0.0',
    description: 'My application'
  },
  entities: [User],
  dashboards: [
    { name: 'Overview', entity: 'User', metrics: ['totalCount', 'activeCount'] }
  ]
};

export default contract;
```

See [DSL TypeScript Reference](./dsl-typescript-reference.md) for complete documentation.

---

---

## Code Analysis & Refactoring (NEW in 2.4)

### `reclapp analyze`

Analyze existing codebase for metrics, complexity, and refactoring opportunities.

```bash
reclapp analyze <directory> [options]

# Options:
#   --json      Output as JSON
#   --contract  Output as contract format
```

**What it does:**
1. Scans source files (TypeScript, JavaScript, Python, C#, Java, Go, C++)
2. Extracts functions, classes, imports
3. Calculates metrics (LOC, cyclomatic complexity, parameters)
4. Identifies refactoring opportunities
5. Generates analysis report

**Example:**
```bash
./bin/reclapp analyze ./src/core
./bin/reclapp analyze ./my-project --json
```

---

### `reclapp refactor`

Clone repository (if URL) and generate refactoring contract.

```bash
reclapp refactor <git-url|directory> [options]

# Options:
#   -o, --output  Output directory for cloned repos
```

**What it does:**
1. Clones repository (if GitHub URL)
2. Analyzes codebase
3. Generates refactoring contract:
   - `refactoring_contract.json` (machine-readable)
   - `analysis_report.md` (human-readable)
   - `todo_list.md` (actionable tasks)

**Example:**
```bash
./bin/reclapp refactor https://github.com/expressjs/express
./bin/reclapp refactor ./my-legacy-project
```

---

### `reclapp evolve`

Evolution mode - generate full application from prompt with auto-healing.

```bash
reclapp evolve --prompt "..." [options]

# Options:
#   -p, --prompt   Natural language description
#   -o, --output   Output directory (default: ./output)
#   -k, --keep     Keep running (watch mode)
#   -v, --verbose  Verbose output
```

**What it does:**
1. Parses prompt into contract
2. Generates API (Express.js + TypeScript)
3. Generates tests (E2E with native fetch)
4. Generates frontend (React + Vite) - optional
5. Generates CI/CD (GitHub Actions) - optional
6. Generates Docker (Dockerfile + compose) - optional
7. Runs tests and validates

**Example:**
```bash
./bin/reclapp evolve -p "Create a todo app" -o ./output
./bin/reclapp evolve -p "Create a blog with cicd and docker" -o ./output
./bin/reclapp evolve -p "Create an inventory app" -o ./output -k
```

---

## Related Documentation

- [Generator Architecture](./generator-architecture.md) - How code generation works
- [DSL TypeScript Reference](./dsl-typescript-reference.md) - Contract format
- [DSL Reference](./dsl-reference.md) - DSL syntax
- [Evolution System](./30-evolution-system.md) - Evolution pipeline details

---

## Environment Variables

The CLI respects these environment variables:

| Variable | Description |
|----------|-------------|
| `RECLAPP_OUTPUT` | Default output directory |
| `RECLAPP_VERBOSE` | Enable verbose output (`1` or `true`) |

---

## Troubleshooting

### TypeScript errors

Ensure `ts-node` is installed:

```bash
npm install -g ts-node typescript
```

### Permission denied

Make the CLI executable:

```bash
chmod +x ./bin/reclapp
```

### Contract not found

Use absolute or relative path from current directory:

```bash
reclapp generate ./contracts/app.reclapp.ts
```
