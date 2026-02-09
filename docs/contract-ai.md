# Contract AI 2.2 - Dokumentacja

> LLM-driven code generation z 3-warstwową specyfikacją kontraktu.

## Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Architektura](#architektura)
3. [Quick Start](#quick-start)
4. [Tworzenie Contract AI](#tworzenie-contract-ai)
5. [Generowanie kodu](#generowanie-kodu)
6. [Walidacja i naprawianie](#walidacja-i-naprawianie)
7. [CLI Reference](#cli-reference)
8. [Przykłady](#przykłady)
9. [API Reference](#api-reference)

---

## Wprowadzenie

Contract AI 2.2 to system generowania kodu oparty na LLM, który wykorzystuje 3-warstwową specyfikację kontraktu:

| Warstwa | Opis | Pytanie |
|---------|------|---------|
| **Definition** | CO ma być zbudowane | Encje, API, eventy |
| **Generation** | JAK generować kod | Instrukcje, wzorce, ograniczenia |
| **Validation** | KIEDY kod jest gotowy | Asercje, testy, quality gates |

### Zalety

- 🎯 **Precyzyjne specyfikacje** - LLM wie dokładnie co i jak generować
- 🔄 **Self-correction loop** - automatyczne naprawianie błędów
- ✅ **8-stage validation** - kompleksowa walidacja wygenerowanego kodu
- 📊 **Quality gates** - metryki jakości kodu

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTRACT AI 2.2                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ DEFINITION  │    │ GENERATION  │    │ VALIDATION  │         │
│  │    (CO)     │    │   (JAK)     │    │   (KIEDY)   │         │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤         │
│  │ • App       │    │ • Instructions│   │ • Assertions │        │
│  │ • Entities  │    │ • Patterns  │    │ • Tests     │         │
│  │ • Events    │    │ • Constraints│   │ • Quality   │         │
│  │ • API       │    │ • TechStack │    │ • Security  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    GENERATION LOOP                        │  │
│  │                                                           │  │
│  │   Prompt ──► LLM ──► Code ──► Validate ──► Fix ──► Done  │  │
│  │              ▲                    │                       │  │
│  │              └────── Feedback ────┘                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline walidacji (8 stages)

1. **Syntax** - sprawdzenie składni TypeScript
2. **Schema** - weryfikacja zgodności ContractAI z JSON Schema
3. **Assertions** - weryfikacja asercji z kontraktu
4. **Static Analysis** - analiza statyczna (ESLint-like)
5. **Tests** - generowanie i uruchamianie testów
6. **Quality** - metryki jakości (coverage, complexity)
7. **Security** - skanowanie bezpieczeństwa
8. **Runtime** - testy w środowisku Docker

---

## Quick Start

### Od promptu do działającej usługi

```bash
# 1. Wygeneruj kod z natural language promptu
./bin/reclapp generate-ai --prompt "Create a task management API with users, projects and tasks"

# 2. Sprawdź wygenerowane pliki
ls -la generated/

# 3. Uruchom wygenerowaną aplikację
cd generated/api && npm install && npm run dev
```

### Z istniejącego kontraktu

```bash
# 1. Wygeneruj kod z Contract AI
./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts

# 2. Lub z tradycyjnego kontraktu Reclapp
./bin/reclapp generate-ai examples/crm/contracts/main.reclapp.ts
```

### Dry-run (tylko podgląd kontraktu)

```bash
./bin/reclapp generate-ai --prompt "Simple blog with posts and comments" --dry-run
```

---

## Tworzenie Contract AI

### Struktura podstawowa

```typescript
import { ContractAI } from 'reclapp/core/contract-ai';

export const myContract: ContractAI = {
  // ═══════════════════════════════════════════════════════════
  // LAYER 1: DEFINITION (CO)
  // ═══════════════════════════════════════════════════════════
  definition: {
    app: {
      name: 'My App',
      version: '1.0.0',
      description: 'Description of the application'
    },
    entities: [/* ... */],
    events: [/* ... */],
    api: {/* ... */}
  },

  // ═══════════════════════════════════════════════════════════
  // LAYER 2: GENERATION (JAK)
  // ═══════════════════════════════════════════════════════════
  generation: {
    instructions: [/* ... */],
    patterns: [/* ... */],
    constraints: [/* ... */],
    techStack: {/* ... */}
  },

  // ═══════════════════════════════════════════════════════════
  // LAYER 3: VALIDATION (KIEDY)
  // ═══════════════════════════════════════════════════════════
  validation: {
    assertions: [/* ... */],
    tests: [/* ... */],
    staticRules: [/* ... */],
    qualityGates: [/* ... */],
    acceptance: {/* ... */}
  }
};
```

### Layer 1: Definition

```typescript
definition: {
  app: {
    name: 'Task Manager',
    version: '1.0.0',
    description: 'Task management system'
  },
  
  entities: [
    {
      name: 'Task',
      description: 'A task to be completed',
      fields: [
        { name: 'id', type: 'UUID', annotations: { generated: true } },
        { name: 'title', type: 'String', annotations: { required: true, min: 1, max: 200 } },
        { name: 'description', type: 'Text', annotations: { required: false } },
        { name: 'status', type: 'String', annotations: { enum: ['todo', 'in_progress', 'done'] } },
        { name: 'priority', type: 'Int', annotations: { min: 1, max: 5, default: 3 } },
        { name: 'dueDate', type: 'DateTime', annotations: { required: false } },
        { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
      ],
      relations: [
        { name: 'assignee', type: 'ManyToOne', target: 'User', foreignKey: 'assigneeId' },
        { name: 'project', type: 'ManyToOne', target: 'Project', foreignKey: 'projectId' }
      ]
    }
  ],
  
  api: {
    prefix: '/api/v1',
    resources: [
      { name: 'tasks', entity: 'Task', operations: ['list', 'get', 'create', 'update', 'delete'] }
    ]
  }
}
```

### Layer 2: Generation

```typescript
generation: {
  instructions: [
    { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' },
    { target: 'api', priority: 'must', instruction: 'Validate all inputs with Zod schemas' },
    { target: 'api', priority: 'should', instruction: 'Use async/await for all async operations' },
    { target: 'api', priority: 'may', instruction: 'Add request logging middleware' }
  ],
  
  patterns: [
    {
      name: 'repository-pattern',
      description: 'Use repository pattern for data access',
      applies_to: ['api'],
      example: `
class TaskRepository {
  async findAll(): Promise<Task[]> { /* ... */ }
  async findById(id: string): Promise<Task | null> { /* ... */ }
  async create(data: CreateTaskInput): Promise<Task> { /* ... */ }
}
`
    }
  ],
  
  constraints: [
    { type: 'no-raw-sql', description: 'Do not use raw SQL queries', severity: 'error' },
    { type: 'max-function-lines', value: 50, severity: 'warn' }
  ],
  
  techStack: {
    backend: {
      runtime: 'node',
      language: 'typescript',
      framework: 'express',
      port: 3000,
      libraries: ['zod', 'cors', 'helmet']
    },
    frontend: {
      framework: 'react',
      styling: 'tailwind',
      stateManagement: 'zustand'
    }
  }
}
```

### Layer 3: Validation

```typescript
validation: {
  assertions: [
    {
      id: 'A001',
      description: 'Server file exists',
      check: { type: 'file-exists', path: 'api/src/server.ts' },
      severity: 'error',
      errorMessage: 'Missing server.ts entry point'
    },
    {
      id: 'A002',
      description: 'Routes have error handling',
      check: { type: 'has-error-handling', path: 'api/src/routes/*.ts' },
      severity: 'error',
      errorMessage: 'Routes must have try-catch blocks'
    }
  ],
  
  tests: [
    {
      name: 'Task API Tests',
      type: 'api',
      target: 'Task',
      scenarios: [
        {
          name: 'should create a task',
          given: 'valid task data',
          when: 'POST /api/v1/tasks',
          then: 'return 201 with created task',
          testData: { title: 'Test Task', status: 'todo' },
          expectedResult: { status: 201 }
        }
      ]
    }
  ],
  
  staticRules: [
    { name: 'no-explicit-any', severity: 'warn' },
    { name: 'prefer-const', severity: 'warn' }
  ],
  
  qualityGates: [
    { name: 'Test coverage', metric: 'test-coverage', threshold: 70, operator: '>=' },
    { name: 'Complexity', metric: 'cyclomatic-complexity', threshold: 15, operator: '<=' }
  ],
  
  acceptance: {
    testsPass: true,
    minCoverage: 70,
    maxLintErrors: 0,
    maxResponseTime: 500,
    securityChecks: [
      { type: 'no-hardcoded-secrets', severity: 'error' },
      { type: 'input-validation', severity: 'error' }
    ]
  }
}
```

---

## Generowanie kodu

### Programatycznie (TypeScript)

```typescript
import { 
  createContractGenerator,
  createLLMCodeGenerator,
  createDefaultValidationPipeline,
  createFeedbackGenerator
} from 'reclapp/core/contract-ai';

// 1. Wygeneruj Contract AI z promptu
const contractGenerator = createContractGenerator({ verbose: true });
const contractResult = await contractGenerator.generate(
  'Create a blog API with posts, comments, and users'
);

if (!contractResult.success) {
  console.error('Failed to generate contract:', contractResult.errors);
  process.exit(1);
}

const contract = contractResult.contract;

// 2. Wygeneruj kod z Contract AI
const codeGenerator = createLLMCodeGenerator({ verbose: true });
const generatedCode = await codeGenerator.generate(contract);

console.log(`Generated ${generatedCode.files.length} files`);

// 3. Uruchom walidację
const pipeline = createDefaultValidationPipeline();
const validationResult = await pipeline.validate(contract, generatedCode);

if (validationResult.passed) {
  console.log('✅ All validation stages passed!');
} else {
  console.log(`⚠️ ${validationResult.summary.totalErrors} errors found`);
  
  // 4. Wygeneruj feedback do naprawy
  const feedbackGen = createFeedbackGenerator();
  const feedback = feedbackGen.generateFeedback(contract, validationResult);
  
  console.log('Issues to fix:', feedback.issues);
}
```

### Z CLI

```bash
# Podstawowe użycie
./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts

# Z promptem
./bin/reclapp generate-ai --prompt "E-commerce API with products, orders, customers"

# Z opcjami
./bin/reclapp generate-ai --prompt "Blog API" \
  --output ./my-blog \
  --max-iterations 5 \
  --verbose

# Dry-run (tylko podgląd)
./bin/reclapp generate-ai --prompt "Task manager" --dry-run
```

---

## Walidacja i naprawianie

### Pipeline walidacji

```typescript
import { createDefaultValidationPipeline } from 'reclapp/core/contract-ai';

const pipeline = createDefaultValidationPipeline();

// Uruchom walidację
const result = await pipeline.validate(contract, generatedCode);

// Sprawdź wyniki
console.log('Passed:', result.passed);
console.log('Stages:', result.stages.map(s => `${s.stage}: ${s.passed ? '✅' : '❌'}`));
console.log('Errors:', result.summary.totalErrors);
console.log('Warnings:', result.summary.totalWarnings);
```

### Feedback loop (automatyczne naprawianie)

```typescript
import { createIterationManager } from 'reclapp/core/contract-ai';

const iterationManager = createIterationManager({
  maxIterations: 10,
  verbose: true
});

const result = await iterationManager.validateAndCorrect(
  contract,
  initialCode,
  pipeline,
  codeGenerator
);

if (result.success) {
  console.log(`✅ Code validated after ${result.iterations} iterations`);
} else {
  console.log('❌ Max iterations reached, manual fix needed');
  console.log('Remaining issues:', result.validationResult.summary.totalErrors);
}
```

### Custom walidatory

```typescript
import { ValidationPipelineOrchestrator, ValidationStage } from 'reclapp/core/contract-ai';

// Własny stage walidacji
const customStage: ValidationStage = {
  name: 'custom-check',
  critical: false,
  timeout: 10000,
  
  async validator(context) {
    const errors = [];
    const warnings = [];
    
    // Sprawdź czy jest plik README
    const hasReadme = context.code.files.some(f => f.path.includes('README'));
    if (!hasReadme) {
      warnings.push({ message: 'Missing README.md file' });
    }
    
    return {
      stage: 'custom-check',
      passed: errors.length === 0,
      errors,
      warnings,
      timeMs: 0
    };
  }
};

// Dodaj do pipeline
const pipeline = new ValidationPipelineOrchestrator();
pipeline.registerStage(customStage);
```

---

## CLI Reference

### generate-ai (legacy — prefer `reclapp evolve`)

> **Note:** `generate-ai` is a legacy command. For new projects use `reclapp evolve --prompt "..."` which includes auto-healing, E2E tests, and service monitoring.

```bash
./bin/reclapp generate-ai [contract-file] [options]

Arguments:
  contract-file          Path to Contract AI file (.ts)

Options:
  --prompt, -p <text>    Generate from natural language prompt
  --output, -o <dir>     Output directory (default: ./generated)
  --max-iterations <n>   Max validation iterations (default: 10)
  --verbose, -v          Verbose output
  --dry-run              Generate contract only, no code
  --help, -h             Show help

Examples:
  # From contract file
  ./bin/reclapp generate-ai examples/contract-ai/crm-contract.ts
  
  # From prompt
  ./bin/reclapp generate-ai -p "Create a CRM with contacts and deals"
  
  # With options
  ./bin/reclapp generate-ai -p "Blog API" -o ./my-blog -v
```

---

## Przykłady

### 1. Task Manager

```typescript
// examples/contract-ai/task-manager-contract.ts
import { ContractAI } from '../../src/core/contract-ai';

export const taskManagerContract: ContractAI = {
  definition: {
    app: {
      name: 'Task Manager',
      version: '1.0.0',
      description: 'Task management with projects and assignments'
    },
    entities: [
      {
        name: 'User',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'role', type: 'String', annotations: { enum: ['admin', 'manager', 'member'] } }
        ]
      },
      {
        name: 'Project',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text' },
          { name: 'status', type: 'String', annotations: { enum: ['active', 'completed', 'archived'] } }
        ],
        relations: [
          { name: 'owner', type: 'ManyToOne', target: 'User', foreignKey: 'ownerId' }
        ]
      },
      {
        name: 'Task',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text' },
          { name: 'status', type: 'String', annotations: { enum: ['todo', 'in_progress', 'review', 'done'] } },
          { name: 'priority', type: 'Int', annotations: { min: 1, max: 5 } },
          { name: 'dueDate', type: 'DateTime' }
        ],
        relations: [
          { name: 'project', type: 'ManyToOne', target: 'Project', foreignKey: 'projectId' },
          { name: 'assignee', type: 'ManyToOne', target: 'User', foreignKey: 'assigneeId' }
        ]
      }
    ],
    api: {
      prefix: '/api/v1',
      resources: [
        { name: 'users', entity: 'User', operations: ['list', 'get', 'create', 'update'] },
        { name: 'projects', entity: 'Project', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'tasks', entity: 'Task', operations: ['list', 'get', 'create', 'update', 'delete'] }
      ]
    }
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' },
      { target: 'api', priority: 'must', instruction: 'Add input validation with Zod' },
      { target: 'api', priority: 'should', instruction: 'Use async/await pattern' }
    ],
    patterns: [],
    constraints: [],
    techStack: {
      backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3000 }
    }
  },
  validation: {
    assertions: [
      { id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', errorMessage: 'Missing server.ts' }
    ],
    tests: [],
    staticRules: [{ name: 'no-explicit-any', severity: 'warn' }],
    qualityGates: [
      { name: 'Complexity', metric: 'cyclomatic-complexity', threshold: 15, operator: '<=' }
    ],
    acceptance: { testsPass: true, minCoverage: 70, maxLintErrors: 0, maxResponseTime: 500, securityChecks: [], custom: [] }
  }
};
```

### 2. E-Commerce API

```typescript
// examples/contract-ai/ecommerce-contract.ts
import { ContractAI } from '../../src/core/contract-ai';

export const ecommerceContract: ContractAI = {
  definition: {
    app: {
      name: 'E-Commerce API',
      version: '1.0.0',
      description: 'Online store with products, orders, and customers'
    },
    entities: [
      {
        name: 'Product',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'sku', type: 'String', annotations: { required: true, unique: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text' },
          { name: 'price', type: 'Money', annotations: { required: true, min: 0 } },
          { name: 'stock', type: 'Int', annotations: { default: 0, min: 0 } },
          { name: 'status', type: 'String', annotations: { enum: ['draft', 'active', 'archived'] } }
        ]
      },
      {
        name: 'Customer',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'firstName', type: 'String', annotations: { required: true } },
          { name: 'lastName', type: 'String', annotations: { required: true } },
          { name: 'phone', type: 'Phone' }
        ]
      },
      {
        name: 'Order',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'orderNumber', type: 'String', annotations: { generated: true, unique: true } },
          { name: 'status', type: 'String', annotations: { enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] } },
          { name: 'totalAmount', type: 'Money', annotations: { required: true } },
          { name: 'shippingAddress', type: 'JSON', annotations: { required: true } }
        ],
        relations: [
          { name: 'customer', type: 'ManyToOne', target: 'Customer', foreignKey: 'customerId' }
        ]
      },
      {
        name: 'OrderItem',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'quantity', type: 'Int', annotations: { required: true, min: 1 } },
          { name: 'unitPrice', type: 'Money', annotations: { required: true } }
        ],
        relations: [
          { name: 'order', type: 'ManyToOne', target: 'Order', foreignKey: 'orderId' },
          { name: 'product', type: 'ManyToOne', target: 'Product', foreignKey: 'productId' }
        ]
      }
    ],
    api: {
      prefix: '/api/v1',
      resources: [
        { name: 'products', entity: 'Product', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'customers', entity: 'Customer', operations: ['list', 'get', 'create', 'update'] },
        { name: 'orders', entity: 'Order', operations: ['list', 'get', 'create', 'update'] }
      ]
    }
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' },
      { target: 'api', priority: 'must', instruction: 'Implement proper error handling with try-catch' },
      { target: 'api', priority: 'must', instruction: 'Validate all monetary values are positive' },
      { target: 'api', priority: 'should', instruction: 'Add pagination to list endpoints' }
    ],
    patterns: [],
    constraints: [
      { type: 'no-negative-prices', description: 'Prices must be >= 0', severity: 'error' }
    ],
    techStack: {
      backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3000 }
    }
  },
  validation: {
    assertions: [
      { id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', errorMessage: 'Missing server.ts' },
      { id: 'A002', check: { type: 'has-error-handling', path: 'api/src/routes/orders.ts' }, severity: 'error', errorMessage: 'Orders route needs error handling' }
    ],
    tests: [],
    staticRules: [{ name: 'no-explicit-any', severity: 'warn' }],
    qualityGates: [
      { name: 'Complexity', metric: 'cyclomatic-complexity', threshold: 15, operator: '<=' },
      { name: 'Duplication', metric: 'duplication-ratio', threshold: 70, operator: '<=' }
    ],
    acceptance: {
      testsPass: true,
      minCoverage: 70,
      maxLintErrors: 0,
      maxResponseTime: 500,
      securityChecks: [
        { type: 'no-hardcoded-secrets', severity: 'error', description: 'No secrets in code' },
        { type: 'input-validation', severity: 'error', description: 'Validate all inputs' }
      ],
      custom: []
    }
  }
};
```

### 3. Blog Platform

```typescript
// examples/contract-ai/blog-contract.ts
import { ContractAI } from '../../src/core/contract-ai';

export const blogContract: ContractAI = {
  definition: {
    app: {
      name: 'Blog Platform',
      version: '1.0.0',
      description: 'Blog with posts, comments, and categories'
    },
    entities: [
      {
        name: 'Author',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'bio', type: 'Text' },
          { name: 'avatarUrl', type: 'URL' }
        ]
      },
      {
        name: 'Category',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'slug', type: 'String', annotations: { required: true, unique: true } },
          { name: 'description', type: 'Text' }
        ]
      },
      {
        name: 'Post',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true } },
          { name: 'slug', type: 'String', annotations: { required: true, unique: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'excerpt', type: 'String' },
          { name: 'status', type: 'String', annotations: { enum: ['draft', 'published', 'archived'] } },
          { name: 'publishedAt', type: 'DateTime' },
          { name: 'viewCount', type: 'Int', annotations: { default: 0 } }
        ],
        relations: [
          { name: 'author', type: 'ManyToOne', target: 'Author', foreignKey: 'authorId' },
          { name: 'category', type: 'ManyToOne', target: 'Category', foreignKey: 'categoryId' }
        ]
      },
      {
        name: 'Comment',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'authorName', type: 'String', annotations: { required: true } },
          { name: 'authorEmail', type: 'Email', annotations: { required: true } },
          { name: 'approved', type: 'Boolean', annotations: { default: false } }
        ],
        relations: [
          { name: 'post', type: 'ManyToOne', target: 'Post', foreignKey: 'postId' }
        ]
      }
    ],
    api: {
      prefix: '/api/v1',
      resources: [
        { name: 'authors', entity: 'Author', operations: ['list', 'get', 'create', 'update'] },
        { name: 'categories', entity: 'Category', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'posts', entity: 'Post', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'comments', entity: 'Comment', operations: ['list', 'get', 'create', 'update', 'delete'] }
      ]
    }
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' },
      { target: 'api', priority: 'must', instruction: 'Add slug generation for posts and categories' },
      { target: 'api', priority: 'should', instruction: 'Add pagination and filtering' }
    ],
    patterns: [],
    constraints: [],
    techStack: {
      backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3000 }
    }
  },
  validation: {
    assertions: [
      { id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', errorMessage: 'Missing server.ts' }
    ],
    tests: [],
    staticRules: [],
    qualityGates: [],
    acceptance: { testsPass: true, minCoverage: 70, maxLintErrors: 0, maxResponseTime: 500, securityChecks: [], custom: [] }
  }
};
```

---

## API Reference

### Moduły

```typescript
// Główne eksporty
import {
  // Types
  ContractAI,
  DefinitionLayer,
  GenerationLayer,
  ValidationLayer,
  
  // Generators
  createContractGenerator,
  createLLMCodeGenerator,
  
  // Validation
  createDefaultValidationPipeline,
  ValidationPipelineOrchestrator,
  
  // Feedback
  createFeedbackGenerator,
  createIterationManager,
  
  // Helpers
  createEmptyContract,
  isValidContractAI
} from 'reclapp/core/contract-ai';
```

### ContractGenerator

```typescript
const generator = createContractGenerator({
  maxAttempts: 5,      // Max self-correction attempts
  verbose: true        // Log progress
});

// Opcjonalnie: podłącz własny LLM client
generator.setLLMClient({
  generate: async ({ system, user, temperature, maxTokens }) => {
    // Wywołaj swój LLM
    return await myLLM.complete(system + user);
  }
});

const result = await generator.generate('Create a CRM system');
// result: { success: boolean, contract: ContractAI, errors: [], attempts: number }
```

### LLMCodeGenerator

```typescript
const codeGen = createLLMCodeGenerator({
  maxTokens: 8000,
  temperature: 0.3,
  verbose: true
});

const code = await codeGen.generate(contract);
// code: { files: GeneratedFile[], metadata: { generatedAt, targets, timeMs } }
```

### ValidationPipeline

```typescript
const pipeline = createDefaultValidationPipeline();

const result = await pipeline.validate(contract, generatedCode);
// result: {
//   passed: boolean,
//   stages: StageResult[],
//   summary: { totalErrors, totalWarnings, passedStages, failedStages, totalTimeMs }
// }
```

---

## Migracja z tradycyjnych kontraktów

Contract AI jest kompatybilny z tradycyjnymi kontraktami Reclapp. CLI automatycznie konwertuje stary format:

```bash
# Tradycyjny kontrakt zostanie skonwertowany do Contract AI
./bin/reclapp generate-ai examples/crm/contracts/main.reclapp.ts
```

Konwersja ręczna:

```typescript
// Stary format
const oldContract = {
  app: { name: 'My App', version: '1.0.0' },
  entities: [/* ... */]
};

// Nowy format Contract AI
const newContract: ContractAI = {
  definition: {
    app: oldContract.app,
    entities: oldContract.entities,
    events: oldContract.events || []
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'Use Express.js' }],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3000 } }
  },
  validation: {
    assertions: [],
    tests: [],
    staticRules: [],
    qualityGates: [],
    acceptance: { testsPass: true, minCoverage: 70, maxLintErrors: 0, maxResponseTime: 500, securityChecks: [], custom: [] }
  }
};
```

---

## Troubleshooting

### Błąd: "Invalid contract - missing app.name"

Kontrakt nie ma poprawnej struktury. Upewnij się, że eksportujesz `ContractAI` z `definition.app.name`.

### Błąd: "Required file missing"

Pipeline walidacji oczekuje plików zdefiniowanych w assertions. Sprawdź sekcję `validation.assertions`.

### Quality gate failed

Dostosuj progi w `validation.qualityGates` lub popraw wygenerowany kod.

---

## Więcej informacji

- [Specyfikacja Contract AI](../todo/14-reclapp-llm-code-generation-spec.md)
- [Plan implementacji](../todo/16-reclapp-implementation-todo-prompts.md)
- [Architektura](../todo/15-reclapp-architecture-summary.md)
