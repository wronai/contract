/**
 * LLM Code Generator
 * 
 * Główna klasa generująca kod z LLM na podstawie Contract AI.
 * 
 * @version 2.4.1
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import { 
  ContractAI, 
  GeneratedCode, 
  GeneratedFile,
  GenerationTarget 
} from '../types';
import { ApiPromptTemplate, PromptTemplate } from './prompt-templates/api';
import { FrontendPromptTemplate } from './prompt-templates/frontend';
import { TestsPromptTemplate } from './prompt-templates/tests';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Opcje generatora kodu
 */
export interface CodeGeneratorOptions {
  /** Maksymalna liczba tokenów na request */
  maxTokens: number;
  /** Temperatura LLM (0.0 - 1.0) */
  temperature: number;
  /** Model LLM */
  model: string;
  /** Czy logować szczegóły */
  verbose: boolean;
}

// LLMClient is imported from generator module to avoid duplication
import { LLMClient } from '../generator/contract-generator';
export { LLMClient };

/**
 * Błąd składniowy
 */
export interface SyntaxError {
  file: string;
  line: number;
  column: number;
  message: string;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: CodeGeneratorOptions = {
  maxTokens: 8000,
  temperature: 0.3, // niższa dla kodu
  model: 'llama3',
  verbose: false
};

// ============================================================================
// LLM CODE GENERATOR
// ============================================================================

/**
 * Generator kodu używający LLM
 */
export class LLMCodeGenerator {
  private options: CodeGeneratorOptions;
  private promptTemplates: Map<GenerationTarget, PromptTemplate>;
  private llmClient: LLMClient | null = null;

  constructor(options: Partial<CodeGeneratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.promptTemplates = new Map();
    
    // Rejestruj domyślne szablony
    this.promptTemplates.set('api', new ApiPromptTemplate());
    this.promptTemplates.set('frontend', new FrontendPromptTemplate());
    this.promptTemplates.set('tests', new TestsPromptTemplate());
  }

  /**
   * Ustawia klienta LLM
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  getLLMClient(): LLMClient | null {
    return this.llmClient;
  }

  /**
   * Rejestruje szablon promptu dla danego targetu
   */
  registerTemplate(target: GenerationTarget, template: PromptTemplate): void {
    this.promptTemplates.set(target, template);
  }

  /**
   * Główna metoda generująca kod
   */
  async generate(contract: ContractAI): Promise<GeneratedCode> {
    const startTime = Date.now();
    const files: GeneratedFile[] = [];
    let totalTokens = 0;

    // Określ cele generacji
    const targets = this.determineTargets(contract);

    if (this.options.verbose) {
      console.log(`\n🚀 Starting code generation for targets: ${targets.join(', ')}`);
    }

    // Generuj każdy target osobno
    for (const target of targets) {
      if (this.options.verbose) {
        console.log(`\n📦 Generating ${target}...`);
      }

      try {
        const targetFiles = await this.generateTarget(contract, target);
        files.push(...targetFiles);
        
        if (this.options.verbose) {
          console.log(`   ✅ Generated ${targetFiles.length} files for ${target}`);
        }
      } catch (error: any) {
        if (this.options.verbose) {
          console.log(`   ❌ Error generating ${target}: ${error.message}`);
        }
      }
    }

    return {
      files,
      contract,
      metadata: {
        generatedAt: new Date(),
        targets,
        tokensUsed: totalTokens,
        timeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Generuje kod dla pojedynczego targetu
   */
  async generateTarget(
    contract: ContractAI,
    target: GenerationTarget
  ): Promise<GeneratedFile[]> {
    const template = this.promptTemplates.get(target);
    
    if (!template) {
      throw new Error(`No template registered for target: ${target}`);
    }

    const systemPrompt = template.getSystemPrompt();
    const userPrompt = template.buildPrompt(contract);

    // Wywołaj LLM
    const response = await this.callLLM(systemPrompt, userPrompt);

    // Parsuj pliki z odpowiedzi
    const files = this.parseFilesFromResponse(response, target);

    // Waliduj podstawową składnię
    for (const file of files) {
      const errors = this.validateBasicSyntax(file);
      if (errors.length > 0) {
        file.syntaxErrors = errors;
      }
    }

    return files;
  }

  /**
   * Określa cele generacji na podstawie kontraktu
   */
  determineTargets(contract: ContractAI): GenerationTarget[] {
    const targets: GenerationTarget[] = [];
    const { techStack } = contract.generation;

    // Backend jest zawsze generowany
    if (techStack.backend) {
      targets.push('api');
    }

    // Tests są zawsze generowane
    targets.push('tests');

    // Frontend tylko jeśli zdefiniowany
    if (techStack.frontend && techStack.frontend.framework !== 'none') {
      targets.push('frontend');
    }

    return targets;
  }

  /**
   * Wywołuje LLM
   */
  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.llmClient) {
      // Fallback - symulacja dla testów
      return this.simulateLLMResponse(userPrompt);
    }

    return this.llmClient.generate({
      system: systemPrompt,
      user: userPrompt,
      temperature: this.options.temperature,
      maxTokens: this.options.maxTokens
    });
  }

  /**
   * Parsuje pliki z odpowiedzi LLM
   */
  parseFilesFromResponse(response: string, target: GenerationTarget): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    
    // Regex do wyciągania plików z markdown code blocks
    // Format: ```typescript:path/to/file.ts lub ```dockerfile:path/to/Dockerfile
    const fileRegex = /```(?:typescript|javascript|json|html|css|dockerfile):(.+?)\n([\s\S]*?)```/g;

    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const path = match[1].trim();
      const content = match[2].trim();

      files.push({
        path,
        content,
        target
      });
    }

    // Fallback: spróbuj prostszego formatu
    if (files.length === 0) {
      const simpleRegex = /```(\w+)\n([\s\S]*?)```/g;
      let index = 0;
      
      while ((match = simpleRegex.exec(response)) !== null) {
        const lang = match[1];
        const content = match[2].trim();
        
        // Generuj nazwę pliku
        const ext = lang === 'typescript' ? 'ts' : lang === 'javascript' ? 'js' : lang;
        const path = `${target}/src/file${index}.${ext}`;
        
        files.push({
          path,
          content,
          target
        });
        index++;
      }
    }

    return files;
  }

  /**
   * Waliduje podstawową składnię pliku
   */
  validateBasicSyntax(file: GeneratedFile): SyntaxError[] {
    const errors: SyntaxError[] = [];

    // Sprawdź rozszerzenie
    const ext = file.path.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      try {
        JSON.parse(file.content);
      } catch (e: any) {
        errors.push({
          file: file.path,
          line: 1,
          column: 1,
          message: `Invalid JSON: ${e.message}`
        });
      }
    }

    // Podstawowe sprawdzenia dla TypeScript/JavaScript
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      // Sprawdź niezamknięte nawiasy
      const openBraces = (file.content.match(/{/g) || []).length;
      const closeBraces = (file.content.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        errors.push({
          file: file.path,
          line: 1,
          column: 1,
          message: `Unbalanced braces: ${openBraces} open, ${closeBraces} close`
        });
      }

      const openParens = (file.content.match(/\(/g) || []).length;
      const closeParens = (file.content.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        errors.push({
          file: file.path,
          line: 1,
          column: 1,
          message: `Unbalanced parentheses: ${openParens} open, ${closeParens} close`
        });
      }
    }

    return errors;
  }

  /**
   * Symulacja odpowiedzi LLM (dla testów)
   */
  private simulateLLMResponse(prompt: string): string {
    // Guard against undefined prompt
    if (!prompt) {
      prompt = '';
    }
    
    // Wykryj typ generacji
    const isApi = prompt.includes('TASK: API');
    const isTests = prompt.includes('TASK: Generate comprehensive tests');
    
    // Wyciągnij nazwy encji z promptu (format: ### EntityName)
    const entityMatches = prompt.match(/###\s+(\w+)\n/g) || [];
    const entities = entityMatches.map(m => m.replace(/###\s+/, '').replace('\n', ''));
    
    // Tests generation
    if (isTests) {
      return `
\`\`\`typescript:tests/api.test.ts
import request from 'supertest';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(BASE_URL).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('CRUD Operations', () => {
    let createdId: string;

    it('should create an item', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/items')
        .send({ name: 'Test Item' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdId = res.body.id;
    });

    it('should get all items', async () => {
      const res = await request(BASE_URL).get('/api/v1/items');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should get item by id', async () => {
      const res = await request(BASE_URL).get(\`/api/v1/items/\${createdId}\`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdId);
    });

    it('should update an item', async () => {
      const res = await request(BASE_URL)
        .put(\`/api/v1/items/\${createdId}\`)
        .send({ name: 'Updated Item' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Item');
    });

    it('should delete an item', async () => {
      const res = await request(BASE_URL).delete(\`/api/v1/items/\${createdId}\`);
      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(BASE_URL).get('/api/v1/items/non-existent');
      expect(res.status).toBe(404);
    });
  });
});
\`\`\`

\`\`\`json:tests/package.json
{
  "name": "api-tests",
  "version": "1.0.0",
  "scripts": {
    "test": "jest --runInBand",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/*.test.ts"]
  }
}
\`\`\`

\`\`\`typescript:tests/setup.ts
import { beforeAll, afterAll } from '@jest/globals';

beforeAll(async () => {
  console.log('Starting test suite...');
});

afterAll(async () => {
  console.log('Test suite completed.');
});
\`\`\`
`;
    }
    
    if (isApi) {
      // Generuj route files dla każdej encji
      let routeFiles = '';
      let routeImports = '';
      let routeUses = '';
      
      for (const entity of entities) {
        const kebab = entity.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        // Simple pluralization: y -> ies, otherwise add s
        const plural = kebab.endsWith('y') 
          ? kebab.slice(0, -1) + 'ies' 
          : kebab + 's';
        routeImports += `import ${kebab}Router from './routes/${plural}';\n`;
        routeUses += `app.use('/api/${plural}', ${kebab}Router);\n`;
        
        routeFiles += `
\`\`\`typescript:api/src/routes/${plural}.ts
import { Router, Request, Response } from 'express';

const router = Router();

// In-memory storage
let items: any[] = [];
let nextId = 1;

// Email validation helper
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};

// GET all
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = items.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate email if present
    if (req.body.email && !validateEmail(req.body.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const item = { id: String(nextId++), ...req.body, createdAt: new Date().toISOString() };
    items.push(item);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const index = items.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    // Validate email if present
    if (req.body.email && !validateEmail(req.body.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    items[index] = { ...items[index], ...req.body, updatedAt: new Date().toISOString() };
    res.json(items[index]);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const index = items.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    items.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
\`\`\`
`;
      }

      return `
\`\`\`typescript:api/src/server.ts
import express from 'express';
import cors from 'cors';
${routeImports}
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

${routeUses}
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
\`\`\`

\`\`\`typescript:api/src/types/index.ts
export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
\`\`\`
${routeFiles}
\`\`\`json:api/package.json
{
  "name": "api",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^2.0.16",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.2"
  }
}
\`\`\`

\`\`\`dockerfile:docker/Dockerfile.api
FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm install

COPY api/ ./

RUN npm run build || true

EXPOSE 3000

CMD ["npm", "run", "dev"]
\`\`\`
`;
    }

    // Frontend response
    return `
\`\`\`typescript:frontend/src/App.tsx
import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        Application
      </h1>
    </div>
  );
};

export default App;
\`\`\`

\`\`\`typescript:frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
\`\`\`
`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createLLMCodeGenerator(options?: Partial<CodeGeneratorOptions>): LLMCodeGenerator {
  return new LLMCodeGenerator(options);
}
