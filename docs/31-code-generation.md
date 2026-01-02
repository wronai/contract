# Code Generation

> Multi-layer code generation from Contract AI definitions

**Related docs:** [Architecture Overview](00-architecture-overview.md) | [Evolution System](30-evolution-system.md) | [Contract AI](contract-ai.md)

---

## Overview

The code generation system transforms Contract AI definitions into working code across 3 architecture layers:

```
Contract AI ──▶ API Layer ──▶ Tests Layer ──▶ Frontend Layer
```

---

## Generated Architecture

```
generated/
├── api/                      # Backend API
│   ├── src/
│   │   └── server.ts         # Express REST API
│   ├── package.json
│   └── tsconfig.json
├── tests/                    # API Tests
│   ├── api.test.ts           # Jest test suite
│   ├── setup.ts
│   └── package.json
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx           # Main component
│   │   └── index.css         # Tailwind CSS
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── logs/
    └── evolution_*.rcl.md    # Generation logs
```

---

## API Layer

**File:** `generated/api/src/server.ts`

### Features

- Express.js with TypeScript
- CORS enabled
- In-memory storage (Map)
- Health check endpoint
- Full CRUD for each entity

### Generated Endpoints

For each entity (e.g., `Contact`):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/contacts` | List all contacts |
| GET | `/api/v1/contacts/:id` | Get contact by ID |
| POST | `/api/v1/contacts` | Create contact |
| PUT | `/api/v1/contacts/:id` | Update contact |
| DELETE | `/api/v1/contacts/:id` | Delete contact |

### Example Generated Code

```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage for all entities
const contacts: Map<string, any> = new Map();
const companys: Map<string, any> = new Map();
let idCounter = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    entities: ["Contact", "Company"]
  });
});

// === Contact Routes ===
app.get('/api/v1/contacts', (req, res) => {
  res.json(Array.from(contacts.values()));
});

app.post('/api/v1/contacts', (req, res) => {
  const id = String(idCounter++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  contacts.set(id, item);
  res.status(201).json(item);
});

// ... more routes

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### Dependencies

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.14",
    "@types/express": "^4.17.20",
    "@types/node": "^20.9.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.0"
  }
}
```

---

## Tests Layer

**File:** `generated/tests/api.test.ts`

### Features

- Jest test framework
- Supertest for HTTP assertions
- Health check tests
- Full CRUD operation tests

### Example Generated Tests

```typescript
import request from 'supertest';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Tests for Contact', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(BASE_URL).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('CRUD Operations', () => {
    let createdId: string;

    it('should create a contact', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/contacts')
        .send({ name: 'Test Contact' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdId = res.body.id;
    });

    it('should get all contacts', async () => {
      const res = await request(BASE_URL).get('/api/v1/contacts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should delete a contact', async () => {
      const res = await request(BASE_URL)
        .delete(`/api/v1/contacts/${createdId}`);
      expect(res.status).toBe(204);
    });
  });
});
```

### Dependencies

```json
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Frontend Layer

**File:** `generated/frontend/src/App.tsx`

### Features

- React 18 with TypeScript
- Vite for build/dev
- Tailwind CSS styling
- CRUD operations via fetch API
- Responsive design

### Example Generated Component

```tsx
import React, { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

const API_URL = 'http://localhost:3000/api/v1/contacts';

function App() {
  const [items, setItems] = useState<Contact[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const res = await fetch(API_URL);
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const newItem = await res.json();
    setItems([...items, newItem]);
    setName('');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Contact Manager
        </h1>
        
        <form onSubmit={addItem} className="mb-8 flex gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg">
            Add
          </button>
        </form>

        <ul className="space-y-4">
          {items.map(item => (
            <li key={item.id} className="bg-white p-4 rounded-lg shadow">
              {item.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
```

### Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

## Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CODE GENERATION FLOW                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Contract Input                                          │
│     │                                                       │
│     ▼                                                       │
│  2. Determine Targets                                       │
│     ├── API (always)                                        │
│     ├── Tests (always)                                      │
│     └── Frontend (if techStack.frontend defined)            │
│     │                                                       │
│     ▼                                                       │
│  3. For Each Target:                                        │
│     ├── Build Prompt Template                               │
│     ├── Call LLM / Use Fallback                             │
│     └── Parse Generated Files                               │
│     │                                                       │
│     ▼                                                       │
│  4. Validate Generated Code                                 │
│     ├── Syntax check                                        │
│     ├── Brace matching                                      │
│     └── Import validation                                   │
│     │                                                       │
│     ▼                                                       │
│  5. Write Files to Disk                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## LLM vs Fallback Generation

### LLM Generation

Used when Ollama/LLM is available:
- More sophisticated code structure
- Context-aware naming
- Custom business logic

### Fallback Generation

Used when LLM is unavailable or fails:
- Reliable template-based code
- Guaranteed valid TypeScript
- All CRUD operations

**The system automatically falls back to templates when:**
- LLM client not configured
- LLM response parsing fails
- Generated code has compilation errors

---

## Customization

### Tech Stack

Configure in contract's `generation.techStack`:

```typescript
techStack: {
  backend: {
    framework: 'express',    // express | fastify | koa
    language: 'typescript',  // typescript | javascript
    runtime: 'node'
  },
  frontend: {
    framework: 'react',      // react | vue | svelte
    language: 'typescript',
    styling: 'tailwind'      // tailwind | css | scss
  },
  database: {
    type: 'memory',          // memory | postgres | mongodb
    name: 'in-memory'
  }
}
```

### Prompt Templates

**Files:** `src/core/contract-ai/code-generator/prompt-templates/`

| Template | Purpose |
|----------|---------|
| `api.ts` | Backend API generation |
| `frontend.ts` | React frontend generation |
| `tests.ts` | Test suite generation |

---

## Running Generated Code

### API Server

```bash
cd generated/api
npm install
npm run dev
# Server running on http://localhost:3000
```

### Tests

```bash
cd generated/tests
npm install
npm test
```

### Frontend

```bash
cd generated/frontend
npm install
npm run dev
# Frontend running on http://localhost:5173
```

---

## Related Documentation

- [Architecture Overview](00-architecture-overview.md)
- [Evolution System](30-evolution-system.md)
- [Contract AI](contract-ai.md)
- [Generator Architecture](generator-architecture.md)
- [Testing Guide](21-testing-guide.md)
