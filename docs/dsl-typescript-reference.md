# Reclapp DSL TypeScript Reference

## Overview

Reclapp contracts can be defined in three complementary formats:
1. **`.reclapp.rcl`** - Mini-DSL format (human-friendly, source-of-truth for generation)
2. **`.reclapp.ts`** - TypeScript format (type-safe, validated at compile-time)
3. **`.rcl.md`** - Markdown format (readable + chat conversation history)

At runtime, all formats are converted to TypeScript for validation and execution.

## File Formats

### Format Comparison

| Feature | `.reclapp.rcl` | `.reclapp.ts` | `.rcl.md` |
|---------|----------------|--------------|----------|
| Human readable | ✅ Excellent | ✅ Good | ✅ Excellent |
| Type safety | ❌ Runtime only | ✅ Compile-time | ❌ Runtime only |
| IDE support | ⚠️ Limited | ✅ Full | ⚠️ Limited |
| Validation | Runtime | Compile + Runtime | Runtime |
| Refactoring | Manual | IDE-assisted | Manual |

### Recommended Workflow

1. **Interactive design (Studio / Shell Chat)**: generate `.reclapp.rcl` + `.rcl.md`
2. **Development/refactors**: use `.reclapp.ts` for type safety and IDE support
3. **Documentation**: keep `.rcl.md` (includes conversation history)
4. **Generation**: `./bin/reclapp generate <contract>` supports all formats

## TypeScript Contract Structure

### Basic Contract

```typescript
import type { ReclappContract } from '@reclapp/contracts/dsl-types';

export const contract: ReclappContract = {
  app: {
    name: 'My Application',
    version: '1.0.0',
    description: 'Application description'
  },
  
  entities: [
    // Entity definitions
  ],
  
  // Other sections...
};

export default contract;
```

### Complete Contract Sections

```typescript
import type { 
  ReclappContract,
  Entity,
  Event,
  Pipeline,
  Alert,
  Dashboard,
  Workflow,
  ApiConfig,
  EnvVar
} from '@reclapp/contracts/dsl-types';

export const contract: ReclappContract = {
  // Required: Application metadata
  app: {
    name: 'My App',
    version: '1.0.0',
    description: 'Description',
    author: 'Team',
    license: 'MIT'
  },
  
  // Optional: Deployment configuration
  deployment: {
    type: 'web',           // 'web' | 'desktop' | 'mobile' | 'api'
    framework: 'nextjs',
    build: {
      outputDir: 'target',
      nodeVersion: '18'
    },
    hosting: {
      provider: 'vercel',
      domain: { primary: 'app.example.com' }
    }
  },
  
  // Optional: Backend configuration
  backend: {
    runtime: 'node',
    framework: 'express',
    port: '${API_PORT:8080}',
    database: {
      type: 'postgres',
      url: '${DATABASE_URL}'
    },
    auth: {
      type: 'jwt',
      secret: '${JWT_SECRET}'
    }
  },
  
  // Optional: Frontend configuration
  frontend: {
    framework: 'react',
    bundler: 'vite',
    style: 'tailwindcss',
    components: 'shadcn',
    theme: {
      mode: 'light',
      primary: '#3b82f6'
    },
    layout: {
      type: 'sidebar',
      navigation: [
        { icon: 'home', label: 'Dashboard', path: '/' }
      ]
    }
  },
  
  // Optional: Data sources
  sources: [
    {
      name: 'externalApi',
      type: 'rest',
      url: 'https://api.example.com',
      auth: 'bearer',
      cacheDuration: '5m'
    }
  ],
  
  // Required: Entity definitions
  entities: [
    {
      name: 'User',
      fields: [
        { name: 'id', type: 'UUID', annotations: { generated: true } },
        { name: 'email', type: 'String', annotations: { unique: true } },
        { name: 'name', type: 'String' },
        { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
      ]
    }
  ],
  
  // Optional: Events
  events: [
    {
      name: 'UserCreated',
      fields: [
        { name: 'userId', type: 'String' },
        { name: 'email', type: 'String' },
        { name: 'timestamp', type: 'DateTime' }
      ]
    }
  ],
  
  // Optional: Pipelines
  pipelines: [
    {
      name: 'UserAnalytics',
      input: ['User.stream', 'Activity.stream'],
      transform: ['aggregate', 'analyze'],
      output: ['dashboard', 'reports'],
      schedule: '0 * * * *'
    }
  ],
  
  // Optional: Alerts
  alerts: [
    {
      name: 'High Usage Alert',
      entity: 'Usage',
      condition: 'value > 1000',
      target: ['email', 'slack'],
      severity: 'high'
    }
  ],
  
  // Optional: Dashboards
  dashboards: [
    {
      name: 'Overview',
      metrics: ['totalUsers', 'activeUsers'],
      streamMode: 'realtime',
      layout: 'grid'
    }
  ],
  
  // Optional: Workflows
  workflows: [
    {
      name: 'Onboarding',
      trigger: 'UserCreated.event',
      steps: [
        { name: 'sendWelcome', action: 'sendEmail', onSuccess: 'setupProfile' },
        { name: 'setupProfile', action: 'createProfile' }
      ]
    }
  ],
  
  // Optional: API configuration
  api: {
    version: 'v1',
    prefix: '/api/v1',
    resources: [
      {
        name: 'users',
        entity: 'User',
        operations: ['list', 'get', 'create', 'update', 'delete'],
        auth: 'required'
      }
    ]
  },
  
  // Optional: Environment variables
  env: [
    { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
    { name: 'API_PORT', type: 'Int', default: 8080 }
  ],
  
  // Optional: Docker configuration
  docker: {
    services: [
      { name: 'app', build: '.', ports: ['3000:3000'] },
      { name: 'db', image: 'postgres:15' }
    ],
    volumes: ['db_data']
  },
  
  // Optional: Custom configuration
  config: {
    app: {
      defaultCurrency: 'USD',
      maxItems: 100
    }
  }
};
```

## Type Definitions

### Entity Fields

```typescript
interface EntityField {
  name: string;
  type: FieldType | string;
  nullable?: boolean;
  array?: boolean;
  annotations?: FieldAnnotation;
}

interface FieldAnnotation {
  unique?: boolean;
  required?: boolean;
  generated?: boolean;
  index?: boolean;
  secret?: boolean;
  computed?: boolean;
  relation?: string;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: string[];
  default?: any;
}

type FieldType = 
  | 'String' | 'Int' | 'Float' | 'Boolean' 
  | 'DateTime' | 'Date' | 'UUID' | 'JSON' 
  | 'Decimal' | 'Money' | 'Email' | 'URL';
```

### Example Entity Definition

```typescript
const User: Entity = {
  name: 'User',
  description: 'Application user',
  fields: [
    { name: 'id', type: 'UUID', annotations: { generated: true } },
    { name: 'email', type: 'String', annotations: { unique: true, required: true } },
    { name: 'name', type: 'String' },
    { name: 'role', type: 'String', annotations: { enum: ['admin', 'user', 'guest'] } },
    { name: 'score', type: 'Int', annotations: { min: 0, max: 100, default: 0 } },
    { name: 'tags', type: 'String', array: true, nullable: true },
    { name: 'metadata', type: 'JSON', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ],
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role', 'createdAt'] }
  ],
  relations: [
    { name: 'posts', entity: 'Post', type: 'one-to-many' }
  ]
};
```

### Dashboard Widgets

```typescript
interface DashboardWidget {
  type: 'stat' | 'chart' | 'table' | 'pie' | 'map' | 'funnel' | 'custom';
  title?: string;
  metric?: string;
  entity?: string;
  columns?: string[];
  chartType?: 'line' | 'bar' | 'area' | 'scatter';
  format?: 'currency' | 'percent' | 'number';
  colorCoded?: boolean;
  sparkline?: boolean;
  compare?: string;
  span?: number;
}

// Example
const dashboard: Dashboard = {
  name: 'Sales Overview',
  streamMode: 'realtime',
  layout: 'grid',
  widgets: [
    { type: 'stat', title: 'Revenue', metric: 'totalRevenue', format: 'currency', sparkline: true },
    { type: 'chart', title: 'Trend', metric: 'dailyRevenue', chartType: 'line', span: 2 },
    { type: 'pie', title: 'By Region', metric: 'revenueByRegion' },
    { type: 'table', title: 'Top Products', entity: 'Product', columns: ['name', 'revenue', 'quantity'] }
  ]
};
```

## Desktop Application (Electron)

### IPC Configuration

```typescript
interface IpcConfig {
  name: string;
  channels: IpcChannel[];
}

interface IpcChannel {
  name: string;
  direction: 'main->renderer' | 'renderer->main' | 'bidirectional';
  data?: string | Record<string, string>;
}

// Example
const ipc: IpcConfig = {
  name: 'main_renderer',
  channels: [
    { name: 'data:update', direction: 'main->renderer', data: 'MyEntity' },
    { name: 'action:save', direction: 'renderer->main', data: { id: 'String', data: 'JSON' } },
    { name: 'sync', direction: 'bidirectional' }
  ]
};
```

### System Tray

```typescript
interface TrayConfig {
  icon: string;
  tooltip: string;
  menu: TrayMenuItem[];
  clickAction?: string;
}

// Example
const tray: TrayConfig = {
  icon: 'assets/tray.png',
  tooltip: 'My App',
  menu: [
    { label: 'Open', action: 'window:show' },
    { type: 'separator' },
    { label: 'Settings', action: 'window:settings' },
    { label: 'Quit', action: 'app:quit' }
  ],
  clickAction: 'window:toggle'
};
```

## Validation

### Runtime Validation

```typescript
import { validateContract } from '@reclapp/contracts/dsl-types';

const result = validateContract(contract);

if (!result.valid) {
  console.error('Validation errors:');
  for (const error of result.errors) {
    console.error(`  ${error.path}: ${error.message}`);
  }
}

for (const warning of result.warnings) {
  console.warn(`  ${warning.path}: ${warning.message}`);
}
```

### Loading Contracts

```typescript
import { loadContract } from '../contracts/dsl-loader';

// Load from any format
const result = await loadContract('contracts/main.reclapp.rcl', {
  validate: true,
  autoFix: true,
  logLevel: 'info'
});

if (result.validation.valid) {
  console.log('Contract loaded successfully');
  console.log(result.contract);
} else {
  console.error('Errors:', result.errors);
}
```

### Converting Formats

```typescript
import { loadContract, convertToTypeScript } from '../contracts/dsl-loader';

// Load Mini-DSL or Markdown and convert to .reclapp.ts
const result = await loadContract('contracts/main.reclapp.rcl');

if (result.contract) {
  const ts = convertToTypeScript(result.contract);
  fs.writeFileSync('contracts/main.reclapp.ts', ts.typescript);
}
```

## CLI Commands

```bash
# Validate
./bin/reclapp validate contracts/main.reclapp.rcl

# Convert between formats
./bin/reclapp convert contracts/main.reclapp.rcl --format md
./bin/reclapp convert contracts/main.rcl.md --format ts
./bin/reclapp convert contracts/main.reclapp.ts --format rcl
```

## Best Practices

### 1. Use TypeScript for Development

```typescript
// contracts/main.reclapp.ts - Full type safety
import type { ReclappContract, Entity } from '@reclapp/contracts/dsl-types';

const User: Entity = {
  name: 'User',
  fields: [
    // IDE autocomplete and type checking
  ]
};

export const contract: ReclappContract = {
  app: { name: 'My App', version: '1.0.0', description: '' },
  entities: [User]
};
```

### 2. Organize Large Contracts

```typescript
// contracts/entities/user.ts
export const User: Entity = { /* ... */ };

// contracts/entities/post.ts  
export const Post: Entity = { /* ... */ };

// contracts/main.reclapp.ts
import { User } from './entities/user';
import { Post } from './entities/post';

export const contract: ReclappContract = {
  entities: [User, Post]
};
```

### 3. Use Environment Variables

```typescript
// Use ${VAR} or ${VAR:default} syntax
backend: {
  port: '${API_PORT:8080}',
  database: {
    url: '${DATABASE_URL}'  // Required, no default
  }
}
```

### 4. Document with Comments

```typescript
const User: Entity = {
  name: 'User',
  description: 'Application user account',
  fields: [
    // Primary key - auto-generated UUID
    { name: 'id', type: 'UUID', annotations: { generated: true } },
    
    // Unique email for authentication
    { name: 'email', type: 'String', annotations: { unique: true } }
  ]
};
```

## Migration Guide

### From `.reclapp.rcl` to `.reclapp.ts`

Use the built-in converter:

```bash
./bin/reclapp convert contracts/main.reclapp.rcl --format ts
```

### From `.rcl.md` to `.reclapp.ts`

```bash
./bin/reclapp convert contracts/main.rcl.md --format ts
```

## Related Documentation

- [DSL Reference](./dsl-reference.md) - Full DSL (uppercase syntax) + Mini-DSL pointers
- [DSL Generation Proposal](./DSL_GENERATION_PROPOSAL.md) - Full generation system
- [Contract Types](../contracts/dsl-types.ts) - TypeScript type definitions
- [Contract Loader](../contracts/dsl-loader.ts) - Loading and validation utilities
