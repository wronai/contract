/**
 * Fallback Templates
 * 
 * Generates fallback code when LLM is not available.
 * Loads templates from src/core/contract-ai/templates/ folder.
 * 
 * @version 2.0.0
 */

import { ContractAI, GeneratedFile } from '../types';
import { e2eTestsTemplate } from '../templates/tests/e2e-native.template';
import { 
  serverTemplate, 
  entityStorageTemplate, 
  entityRoutesTemplate 
} from '../templates/api/server.template';
import {
  mainTsxTemplate,
  appTsxTemplate,
  indexCssTemplate,
  indexHtmlTemplate,
  viteConfigTemplate,
  tailwindConfigTemplate,
  frontendPackageTemplate
} from '../templates/frontend/react-app.template';

// ============================================================================
// TYPES
// ============================================================================

export interface FallbackOptions {
  port?: number;
}

// ============================================================================
// FALLBACK TEMPLATE GENERATOR
// ============================================================================

export class FallbackTemplates {
  /**
   * Generate complete fallback code for a contract
   */
  static generate(contract: ContractAI, options: FallbackOptions = {}): string {
    const port = options.port || 3000;
    const entities = contract.definition?.entities || [];
    const mainEntity = entities[0];
    const entityName = mainEntity?.name || 'Item';
    const lowerName = entityName.toLowerCase();
    const pluralName = lowerName + 's';

    const storageDecls = entities.map(e => {
      const plural = e.name.toLowerCase() + 's';
      return `const ${plural}: Map<string, any> = new Map();`;
    }).join('\n');

    const routeBlocks = entities.map(e => {
      const name = e.name;
      const lower = name.toLowerCase();
      const plural = lower + 's';
      return `
// === ${name} Routes ===
app.get('/api/v1/${plural}', (req, res) => {
  res.json(Array.from(${plural}.values()));
});

app.get('/api/v1/${plural}/:id', (req, res) => {
  const item = ${plural}.get(req.params.id);
  if (!item) return res.status(404).json({ error: '${name} not found' });
  res.json(item);
});

app.post('/api/v1/${plural}', (req, res) => {
  const id = String(idCounter++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  ${plural}.set(id, item);
  res.status(201).json(item);
});

app.put('/api/v1/${plural}/:id', (req, res) => {
  if (!${plural}.has(req.params.id)) return res.status(404).json({ error: '${name} not found' });
  const item = { ...${plural}.get(req.params.id), ...req.body, updatedAt: new Date().toISOString() };
  ${plural}.set(req.params.id, item);
  res.json(item);
});

app.delete('/api/v1/${plural}/:id', (req, res) => {
  if (!${plural}.has(req.params.id)) return res.status(404).json({ error: '${name} not found' });
  ${plural}.delete(req.params.id);
  res.status(204).send();
});`;
    }).join('\n');

    return `
\`\`\`typescript:api/src/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || ${port};

app.use(cors());
app.use(express.json());

// In-memory storage
${storageDecls}
let idCounter = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
${routeBlocks}

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
\`\`\`

\`\`\`json:api/package.json
{
  "name": "generated-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "start": "node dist/server.js"
  },
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
\`\`\`

\`\`\`json:api/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
\`\`\`
`;
  }

  /**
   * Generate server.ts content directly
   */
  static generateServer(contract: ContractAI, port: number = 3000): string {
    const entities = contract.definition?.entities || [];
    
    const storageDecls = entities.map(e => {
      const plural = e.name.toLowerCase() + 's';
      return `const ${plural}: Map<string, any> = new Map();`;
    }).join('\n');

    const routeBlocks = entities.map(e => {
      const name = e.name;
      const plural = name.toLowerCase() + 's';
      return `
// ${name} CRUD
app.get('/api/v1/${plural}', (req, res) => res.json(Array.from(${plural}.values())));
app.get('/api/v1/${plural}/:id', (req, res) => {
  const item = ${plural}.get(req.params.id);
  item ? res.json(item) : res.status(404).json({ error: 'Not found' });
});
app.post('/api/v1/${plural}', (req, res) => {
  const id = String(idCounter++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  ${plural}.set(id, item);
  res.status(201).json(item);
});
app.put('/api/v1/${plural}/:id', (req, res) => {
  if (!${plural}.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const item = { ...${plural}.get(req.params.id), ...req.body };
  ${plural}.set(req.params.id, item);
  res.json(item);
});
app.delete('/api/v1/${plural}/:id', (req, res) => {
  ${plural}.delete(req.params.id) ? res.status(204).send() : res.status(404).json({ error: 'Not found' });
});`;
    }).join('\n');

    return `import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || ${port};

app.use(cors());
app.use(express.json());

${storageDecls}
let idCounter = 1;

app.get('/health', (req, res) => res.json({ status: 'ok' }));
${routeBlocks}

app.listen(PORT, () => console.log(\`Server on port \${PORT}\`));
`;
  }

  /**
   * Generate package.json content
   */
  static generatePackageJson(): string {
    return JSON.stringify({
      name: "generated-api",
      version: "1.0.0",
      scripts: {
        dev: "ts-node src/server.ts",
        start: "node dist/server.js"
      },
      dependencies: {
        cors: "^2.8.5",
        express: "^4.18.2"
      },
      devDependencies: {
        "@types/cors": "^2.8.14",
        "@types/express": "^4.17.20",
        "@types/node": "^20.9.0",
        "ts-node": "^10.9.2",
        typescript: "^5.3.0"
      }
    }, null, 2);
  }

  /**
   * Generate tsconfig.json content
   */
  static generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "commonjs",
        lib: ["ES2022"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true
      },
      include: ["src/**/*"]
    }, null, 2);
  }

  /**
   * Parse files from LLM response format
   */
  static parseFiles(response: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pattern = /```(?:typescript|ts|javascript|js|json):([^\n]+)\n([\s\S]*?)```/g;
    
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const filePath = match[1].trim();
      let content = match[2].trim();
      const target = filePath.startsWith('api/') ? 'api' : 
                    filePath.startsWith('tests/') ? 'tests' : 
                    filePath.startsWith('frontend/') ? 'frontend' : 'api';

      if (filePath.endsWith('.json')) {
        content = this.stripJsonComments(content);
      }

      files.push({ path: filePath, content, target });
    }

    return files;
  }

  /**
   * Strip comments from JSON
   */
  private static stripJsonComments(json: string): string {
    return json
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  /**
   * Generate E2E tests using template
   */
  static generateE2ETests(port: number, entityName: string, basePath: string): string {
    return e2eTestsTemplate
      .replace(/\{\{PORT\}\}/g, String(port))
      .replace(/\{\{ENTITY\}\}/g, entityName)
      .replace(/\{\{PLURAL\}\}/g, entityName.toLowerCase() + 's')
      .replace(/\{\{BASE_PATH\}\}/g, basePath);
  }

  /**
   * Generate frontend files
   */
  static generateFrontend(port: number, entityName: string): Record<string, string> {
    const plural = entityName.toLowerCase() + 's';
    
    const replace = (template: string) => template
      .replace(/\{\{PORT\}\}/g, String(port))
      .replace(/\{\{ENTITY\}\}/g, entityName)
      .replace(/\{\{PLURAL\}\}/g, plural);

    return {
      'frontend/src/main.tsx': replace(mainTsxTemplate),
      'frontend/src/App.tsx': replace(appTsxTemplate),
      'frontend/src/index.css': indexCssTemplate,
      'frontend/index.html': replace(indexHtmlTemplate),
      'frontend/vite.config.ts': replace(viteConfigTemplate),
      'frontend/tailwind.config.js': tailwindConfigTemplate,
      'frontend/package.json': JSON.stringify(frontendPackageTemplate, null, 2)
    };
  }

  /**
   * Generate complete fallback with frontend
   */
  static generateWithFrontend(contract: ContractAI, options: FallbackOptions = {}): string {
    const port = options.port || 3000;
    const entities = contract.definition?.entities || [];
    const mainEntity = entities[0]?.name || 'Item';
    
    // Generate API code
    let result = this.generate(contract, options);
    
    // Add frontend files
    const frontendFiles = this.generateFrontend(port, mainEntity);
    for (const [path, content] of Object.entries(frontendFiles)) {
      const ext = path.endsWith('.json') ? 'json' : 
                  path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' :
                  path.endsWith('.css') ? 'css' :
                  path.endsWith('.html') ? 'html' : 'javascript';
      result += `\n\`\`\`${ext}:${path}\n${content}\n\`\`\`\n`;
    }
    
    return result;
  }
}

export default FallbackTemplates;
