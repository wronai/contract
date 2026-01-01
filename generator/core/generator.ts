/**
 * Core Generator - Orchestrates code generation from DSL AST
 */

import { Program, EntityDeclaration, EventDeclaration, PipelineDeclaration, 
         AlertDeclaration, DashboardDeclaration, SourceDeclaration } from '../../dsl/ast/types';

export interface GeneratorOptions {
  target: 'api' | 'frontend' | 'docker' | 'kubernetes' | 'database' | 'cicd' | 'full-stack';
  output: string;
  framework?: {
    api?: 'express' | 'fastify' | 'hono';
    frontend?: 'react' | 'vue' | 'svelte';
    database?: 'postgresql' | 'mongodb' | 'sqlite';
  };
  features?: {
    authentication?: boolean;
    websocket?: boolean;
    eventSourcing?: boolean;
    caching?: boolean;
    monitoring?: boolean;
  };
  deployment?: {
    platform?: 'docker' | 'kubernetes' | 'vercel' | 'netlify' | 'aws';
    registry?: string;
    namespace?: string;
  };
}

export interface GeneratorResult {
  success: boolean;
  files: GeneratedFile[];
  errors: GeneratorError[];
  warnings: string[];
  summary: GenerationSummary;
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'source' | 'config' | 'docker' | 'manifest' | 'script';
  overwrite: boolean;
}

export interface GeneratorError {
  code: string;
  message: string;
  node?: string;
}

export interface GenerationSummary {
  filesGenerated: number;
  entities: number;
  endpoints: number;
  dashboards: number;
  alerts: number;
  pipelines: number;
}

export class Generator {
  private ast: Program;
  private options: GeneratorOptions;
  private files: GeneratedFile[] = [];
  private errors: GeneratorError[] = [];
  private warnings: string[] = [];

  constructor(ast: Program, options: Partial<GeneratorOptions> = {}) {
    this.ast = ast;
    this.options = {
      target: 'full-stack',
      output: './generated',
      framework: {
        api: 'express',
        frontend: 'react',
        database: 'postgresql',
        ...options.framework
      },
      features: {
        authentication: true,
        websocket: true,
        eventSourcing: true,
        caching: true,
        monitoring: true,
        ...options.features
      },
      deployment: {
        platform: 'docker',
        ...options.deployment
      },
      ...options
    };
  }

  async generate(): Promise<GeneratorResult> {
    const entities = this.getEntities();
    const events = this.getEvents();
    const pipelines = this.getPipelines();
    const alerts = this.getAlerts();
    const dashboards = this.getDashboards();
    const sources = this.getSources();

    try {
      switch (this.options.target) {
        case 'api':
          await this.generateApi(entities, events, sources);
          break;
        case 'frontend':
          await this.generateFrontend(entities, dashboards);
          break;
        case 'docker':
          await this.generateDocker();
          break;
        case 'kubernetes':
          await this.generateKubernetes();
          break;
        case 'database':
          await this.generateDatabase(entities);
          break;
        case 'cicd':
          await this.generateCiCd();
          break;
        case 'full-stack':
          await this.generateFullStack(entities, events, pipelines, alerts, dashboards, sources);
          break;
      }
    } catch (error) {
      this.errors.push({
        code: 'GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return {
      success: this.errors.length === 0,
      files: this.files,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        filesGenerated: this.files.length,
        entities: entities.length,
        endpoints: entities.length * 5, // CRUD + list
        dashboards: dashboards.length,
        alerts: alerts.length,
        pipelines: pipelines.length
      }
    };
  }

  private getEntities(): EntityDeclaration[] {
    return this.ast.statements.filter(
      (s): s is EntityDeclaration => s.type === 'EntityDeclaration'
    );
  }

  private getEvents(): EventDeclaration[] {
    return this.ast.statements.filter(
      (s): s is EventDeclaration => s.type === 'EventDeclaration'
    );
  }

  private getPipelines(): PipelineDeclaration[] {
    return this.ast.statements.filter(
      (s): s is PipelineDeclaration => s.type === 'PipelineDeclaration'
    );
  }

  private getAlerts(): AlertDeclaration[] {
    return this.ast.statements.filter(
      (s): s is AlertDeclaration => s.type === 'AlertDeclaration'
    );
  }

  private getDashboards(): DashboardDeclaration[] {
    return this.ast.statements.filter(
      (s): s is DashboardDeclaration => s.type === 'DashboardDeclaration'
    );
  }

  private getSources(): SourceDeclaration[] {
    return this.ast.statements.filter(
      (s): s is SourceDeclaration => s.type === 'SourceDeclaration'
    );
  }

  private async generateFullStack(
    entities: EntityDeclaration[],
    events: EventDeclaration[],
    pipelines: PipelineDeclaration[],
    alerts: AlertDeclaration[],
    dashboards: DashboardDeclaration[],
    sources: SourceDeclaration[]
  ): Promise<void> {
    // Generate all components
    await this.generateApi(entities, events, sources);
    await this.generateFrontend(entities, dashboards);
    await this.generateDatabase(entities);
    await this.generateDocker();
    
    if (this.options.deployment?.platform === 'kubernetes') {
      await this.generateKubernetes();
    }
    
    await this.generateCiCd();
    
    // Generate package.json and README
    this.generatePackageJson(entities);
    this.generateReadme(entities, dashboards);
    this.generateMakefile();
  }

  private async generateApi(
    entities: EntityDeclaration[],
    events: EventDeclaration[],
    sources: SourceDeclaration[]
  ): Promise<void> {
    // Main server file
    this.files.push({
      path: `${this.options.output}/api/src/server.ts`,
      content: this.generateApiServer(entities, sources),
      type: 'source',
      overwrite: true
    });

    if (this.options.features?.authentication) {
      this.files.push({
        path: `${this.options.output}/api/src/middleware/auth.ts`,
        content: this.generateAuthMiddlewareTs(),
        type: 'source',
        overwrite: true
      });
    }

    // Entity routes
    for (const entity of entities) {
      this.files.push({
        path: `${this.options.output}/api/src/routes/${this.toKebabCase(entity.name)}.ts`,
        content: this.generateEntityRoutes(entity),
        type: 'source',
        overwrite: true
      });

      // Entity model
      this.files.push({
        path: `${this.options.output}/api/src/models/${this.toKebabCase(entity.name)}.ts`,
        content: this.generateEntityModel(entity),
        type: 'source',
        overwrite: true
      });
    }

    // Event handlers
    if (events.length > 0) {
      this.files.push({
        path: `${this.options.output}/api/src/events/handlers.ts`,
        content: this.generateEventHandlers(events),
        type: 'source',
        overwrite: true
      });
    }

    // Source connectors
    for (const source of sources) {
      this.files.push({
        path: `${this.options.output}/api/src/sources/${this.toKebabCase(source.name)}.ts`,
        content: this.generateSourceConnector(source),
        type: 'source',
        overwrite: true
      });
    }

    // API package.json
    this.files.push({
      path: `${this.options.output}/api/package.json`,
      content: this.generateApiPackageJson(),
      type: 'config',
      overwrite: true
    });

    // tsconfig.json
    this.files.push({
      path: `${this.options.output}/api/tsconfig.json`,
      content: this.generateTsConfig(),
      type: 'config',
      overwrite: true
    });
  }

  private async generateFrontend(
    entities: EntityDeclaration[],
    dashboards: DashboardDeclaration[]
  ): Promise<void> {
    // Main App component
    this.files.push({
      path: `${this.options.output}/frontend/src/App.tsx`,
      content: this.generateAppComponent(entities, dashboards),
      type: 'source',
      overwrite: true
    });

    // Entity components
    for (const entity of entities) {
      this.files.push({
        path: `${this.options.output}/frontend/src/components/${entity.name}List.tsx`,
        content: this.generateEntityListComponent(entity),
        type: 'source',
        overwrite: true
      });

      this.files.push({
        path: `${this.options.output}/frontend/src/components/${entity.name}Form.tsx`,
        content: this.generateEntityFormComponent(entity),
        type: 'source',
        overwrite: true
      });
    }

    // Dashboard components
    for (const dashboard of dashboards) {
      const name = typeof dashboard.name === 'object' ? dashboard.name.value : dashboard.name;
      this.files.push({
        path: `${this.options.output}/frontend/src/components/dashboards/${this.toPascalCase(name)}Dashboard.tsx`,
        content: this.generateDashboardComponent(dashboard),
        type: 'source',
        overwrite: true
      });
    }

    // API hooks
    this.files.push({
      path: `${this.options.output}/frontend/src/hooks/useApi.ts`,
      content: this.generateApiHooks(entities),
      type: 'source',
      overwrite: true
    });

    // Frontend package.json
    this.files.push({
      path: `${this.options.output}/frontend/package.json`,
      content: this.generateFrontendPackageJson(),
      type: 'config',
      overwrite: true
    });

    // Vite config
    this.files.push({
      path: `${this.options.output}/frontend/vite.config.ts`,
      content: this.generateViteConfig(),
      type: 'config',
      overwrite: true
    });

    // Index HTML
    this.files.push({
      path: `${this.options.output}/frontend/index.html`,
      content: this.generateIndexHtml(),
      type: 'source',
      overwrite: true
    });
  }

  private async generateDatabase(entities: EntityDeclaration[]): Promise<void> {
    const db = this.options.framework?.database || 'postgresql';
    
    if (db === 'postgresql') {
      // SQL migrations
      this.files.push({
        path: `${this.options.output}/database/migrations/001_init.sql`,
        content: this.generateSqlMigration(entities),
        type: 'source',
        overwrite: true
      });
    } else if (db === 'mongodb') {
      // MongoDB schemas
      this.files.push({
        path: `${this.options.output}/database/schemas/index.ts`,
        content: this.generateMongoSchemas(entities),
        type: 'source',
        overwrite: true
      });
    }
  }

  private async generateDocker(): Promise<void> {
    // API Dockerfile
    this.files.push({
      path: `${this.options.output}/docker/Dockerfile.api`,
      content: this.generateApiDockerfile(),
      type: 'docker',
      overwrite: true
    });

    // Frontend Dockerfile
    this.files.push({
      path: `${this.options.output}/docker/Dockerfile.frontend`,
      content: this.generateFrontendDockerfile(),
      type: 'docker',
      overwrite: true
    });

    // Docker Compose
    this.files.push({
      path: `${this.options.output}/docker-compose.yml`,
      content: this.generateDockerCompose(),
      type: 'docker',
      overwrite: true
    });

    // .env.example
    this.files.push({
      path: `${this.options.output}/.env.example`,
      content: this.generateEnvExample(),
      type: 'config',
      overwrite: true
    });
  }

  private async generateKubernetes(): Promise<void> {
    const namespace = this.options.deployment?.namespace || 'reclapp';

    // Namespace
    this.files.push({
      path: `${this.options.output}/k8s/namespace.yaml`,
      content: this.generateK8sNamespace(namespace),
      type: 'manifest',
      overwrite: true
    });

    // API deployment
    this.files.push({
      path: `${this.options.output}/k8s/api-deployment.yaml`,
      content: this.generateK8sApiDeployment(namespace),
      type: 'manifest',
      overwrite: true
    });

    // Frontend deployment
    this.files.push({
      path: `${this.options.output}/k8s/frontend-deployment.yaml`,
      content: this.generateK8sFrontendDeployment(namespace),
      type: 'manifest',
      overwrite: true
    });

    // Services
    this.files.push({
      path: `${this.options.output}/k8s/services.yaml`,
      content: this.generateK8sServices(namespace),
      type: 'manifest',
      overwrite: true
    });

    // Ingress
    this.files.push({
      path: `${this.options.output}/k8s/ingress.yaml`,
      content: this.generateK8sIngress(namespace),
      type: 'manifest',
      overwrite: true
    });
  }

  private async generateCiCd(): Promise<void> {
    // GitHub Actions
    this.files.push({
      path: `${this.options.output}/.github/workflows/ci.yml`,
      content: this.generateGitHubActionsCI(),
      type: 'config',
      overwrite: true
    });

    this.files.push({
      path: `${this.options.output}/.github/workflows/deploy.yml`,
      content: this.generateGitHubActionsDeploy(),
      type: 'config',
      overwrite: true
    });
  }

  // ============================================================
  // TEMPLATE METHODS
  // ============================================================

  private generateApiServer(entities: EntityDeclaration[], sources: SourceDeclaration[]): string {
    const entityImports = entities.map(e => 
      `import ${this.toCamelCase(e.name)}Routes from './routes/${this.toKebabCase(e.name)}';`
    ).join('\n');

    const routeRegistrations = entities.map(e =>
      `app.use('/api/${this.toKebabCase(e.name)}s', ${this.toCamelCase(e.name)}Routes);`
    ).join('\n  ');

    return `/**
 * Generated API Server
 * Generated by Reclapp Generator
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';
${this.options.features?.websocket ? "import { Server as SocketIOServer } from 'socket.io';" : ''}

${entityImports}

dotenv.config();

const app = express();
const server = createServer(app);
${this.options.features?.websocket ? `
const io = new SocketIOServer(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*' }
});
` : ''}

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
${routeRegistrations}

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

${this.options.features?.websocket ? `
// WebSocket events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe', (channel: string) => {
    socket.join(channel);
    console.log(\`Client \${socket.id} subscribed to \${channel}\`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in routes
export { io };
` : ''}

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(\`
╔═══════════════════════════════════════════════════════════════╗
║              Reclapp API Server - Generated                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:        \${PORT}                                          ║
║  Environment: \${process.env.NODE_ENV || 'development'}         ║
╚═══════════════════════════════════════════════════════════════╝
  \`);
});

export default app;
`;
  }

  private generateEntityRoutes(entity: EntityDeclaration): string {
    const name = entity.name;
    const nameLower = this.toCamelCase(name);
    const nameKebab = this.toKebabCase(name);

    const authEnabled = !!this.options.features?.authentication;

    const creatableFields = entity.fields
      .filter(f => !this.isSystemFieldName(f.name))
      .filter(f => !f.annotations.some(a => a.name === 'generated'));

    const createSchemaShape = creatableFields
      .map(f => `  ${f.name}: ${this.fieldToZod(f, 'create')}`)
      .join(',\n');

    const updateSchemaShape = creatableFields
      .map(f => `  ${f.name}: ${this.fieldToZod(f, 'update')}`)
      .join(',\n');

    const authImport = authEnabled ? `import { requireAuth } from '../middleware/auth';\n` : '';
    const authUse = authEnabled ? `\nrouter.use(requireAuth);\n` : '';

    return `/**
 * ${name} Routes
 * Generated by Reclapp Generator
 */

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { ${name}, Create${name}Input, Update${name}Input } from '../models/${nameKebab}';
${authImport}

const router = Router();

const Create${name}Schema = z.object({
${createSchemaShape}
}).strict();

const Update${name}Schema = z.object({
${updateSchemaShape}
}).strict();

// In-memory storage (replace with database)
let ${nameLower}s: ${name}[] = [];
${authUse}

// List all
router.get('/', (req: Request, res: Response) => {
  res.json({ ${nameLower}s, total: ${nameLower}s.length });
});

// Get by ID
router.get('/:id', (req: Request, res: Response) => {
  const item = ${nameLower}s.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: '${name} not found' });
  }
  res.json({ ${nameLower}: item });
});

// Create
router.post('/', (req: Request, res: Response) => {
  const parseResult = Create${name}Schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  const input: Create${name}Input = parseResult.data;
  const item: ${name} = {
    id: randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  ${nameLower}s.push(item);
  res.status(201).json({ ${nameLower}: item });
});

// Update
router.put('/:id', (req: Request, res: Response) => {
  const index = ${nameLower}s.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '${name} not found' });
  }

  const parseResult = Update${name}Schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  const input: Update${name}Input = parseResult.data;
  ${nameLower}s[index] = {
    ...${nameLower}s[index],
    ...input,
    updatedAt: new Date().toISOString()
  };
  res.json({ ${nameLower}: ${nameLower}s[index] });
});

router.patch('/:id', (req: Request, res: Response) => {
  const index = ${nameLower}s.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '${name} not found' });
  }

  const parseResult = Update${name}Schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  ${nameLower}s[index] = {
    ...${nameLower}s[index],
    ...parseResult.data,
    updatedAt: new Date().toISOString()
  };

  res.json({ ${nameLower}: ${nameLower}s[index] });
});

// Delete
router.delete('/:id', (req: Request, res: Response) => {
  const index = ${nameLower}s.findIndex(i => i.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '${name} not found' });
  }
  ${nameLower}s.splice(index, 1);
  res.status(204).send();
});

export default router;
`;
  }

  private generateEntityModel(entity: EntityDeclaration): string {
    const modelFields = entity.fields.filter(f => !this.isSystemFieldName(f.name));
    const fields = modelFields.map(f => {
      const tsType = this.fieldTypeToTs(f.fieldType);
      return `  ${f.name}${f.fieldType.nullable ? '?' : ''}: ${tsType};`;
    }).join('\n');

    const createFields = modelFields
      .filter(f => !f.annotations.some(a => a.name === 'generated'))
      .map(f => {
        const tsType = this.fieldTypeToTs(f.fieldType);
        const optional = f.fieldType.nullable || f.defaultValue !== undefined ? '?' : '';
        return `  ${f.name}${optional}: ${tsType};`;
      })
      .join('\n');

    return `/**
 * ${entity.name} Model
 * Generated by Reclapp Generator
 */

export interface ${entity.name} {
  id: string;
${fields}
  createdAt: string;
  updatedAt: string;
}

export interface Create${entity.name}Input {
${createFields}
}

export interface Update${entity.name}Input extends Partial<Create${entity.name}Input> {}
`;
  }

  private generateEventHandlers(events: EventDeclaration[]): string {
    const handlers = events.map(e => `
export async function handle${e.name}(event: ${e.name}Event): Promise<void> {
  console.log('Handling ${e.name}:', event);
  // TODO: Implement event handling logic
}
`).join('\n');

    const interfaces = events.map(e => {
      const fields = e.fields.map(f => 
        `  ${f.name}: ${this.fieldTypeToTs(f.fieldType)};`
      ).join('\n');
      return `
export interface ${e.name}Event {
${fields}
  timestamp: string;
}`;
    }).join('\n');

    return `/**
 * Event Handlers
 * Generated by Reclapp Generator
 */

${interfaces}
${handlers}
`;
  }

  private generateSourceConnector(source: SourceDeclaration): string {
    const url = source.url ? (typeof source.url === 'object' ? source.url.value : source.url) : '';
    
    return `/**
 * ${source.name} Source Connector
 * Generated by Reclapp Generator
 */

export interface ${source.name}Config {
  url: string;
  auth?: string;
  cacheDuration?: number;
}

export class ${source.name}Connector {
  private config: ${source.name}Config;
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config: Partial<${source.name}Config> = {}) {
    this.config = {
      url: config.url || '${url}',
      auth: config.auth || process.env.${source.name.toUpperCase()}_AUTH,
      cacheDuration: config.cacheDuration || 300000 // 5 minutes
    };
  }

  async fetch<T>(endpoint: string = ''): Promise<T> {
    const cacheKey = \`\${this.config.url}\${endpoint}\`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.auth) {
      headers['Authorization'] = \`Bearer \${this.config.auth}\`;
    }

    const response = await fetch(\`\${this.config.url}\${endpoint}\`, { headers });
    
    if (!response.ok) {
      throw new Error(\`${source.name} fetch failed: \${response.status}\`);
    }

    const data = await response.json();
    
    this.cache.set(cacheKey, {
      data,
      expires: Date.now() + this.config.cacheDuration!
    });

    return data as T;
  }
}

export const ${this.toCamelCase(source.name)}Connector = new ${source.name}Connector();
`;
  }

  private generateAppComponent(entities: EntityDeclaration[], dashboards: DashboardDeclaration[]): string {
    const imports = entities.map(e =>
      `import ${e.name}List from './components/${e.name}List';`
    ).join('\n');

    const dashboardImports = dashboards.map(d => {
      const name = typeof d.name === 'object' ? d.name.value : d.name;
      return `import ${this.toPascalCase(name)}Dashboard from './components/dashboards/${this.toPascalCase(name)}Dashboard';`;
    }).join('\n');

    return `/**
 * Main App Component
 * Generated by Reclapp Generator
 */

import React, { useState } from 'react';
${imports}
${dashboardImports}

type Tab = ${entities.map(e => `'${this.toKebabCase(e.name)}s'`).concat(dashboards.map(d => {
  const name = typeof d.name === 'object' ? d.name.value : d.name;
  return `'${this.toKebabCase(name)}'`;
})).join(' | ')};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('${entities.length > 0 ? this.toKebabCase(entities[0].name) + 's' : 'dashboard'}');

  const tabs: { id: Tab; label: string }[] = [
${entities.map(e => `    { id: '${this.toKebabCase(e.name)}s', label: '${e.name}s' },`).join('\n')}
${dashboards.map(d => {
  const name = typeof d.name === 'object' ? d.name.value : d.name;
  return `    { id: '${this.toKebabCase(name)}', label: '${name}' },`;
}).join('\n')}
  ];

  const renderContent = () => {
    switch (activeTab) {
${entities.map(e => `      case '${this.toKebabCase(e.name)}s':
        return <${e.name}List />;`).join('\n')}
${dashboards.map(d => {
  const name = typeof d.name === 'object' ? d.name.value : d.name;
  return `      case '${this.toKebabCase(name)}':
        return <${this.toPascalCase(name)}Dashboard />;`;
}).join('\n')}
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-4">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={\`px-4 py-3 text-sm font-medium \${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }\`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 px-4">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
`;
  }

  private generateEntityListComponent(entity: EntityDeclaration): string {
    const name = entity.name;
    const nameLower = this.toCamelCase(name);

    return `/**
 * ${name} List Component
 * Generated by Reclapp Generator
 */

import React, { useEffect, useState } from 'react';
import { use${name}s, useCreate${name}, useDelete${name} } from '../hooks/useApi';

interface ${name} {
  id: string;
${entity.fields.map(f => `  ${f.name}: ${this.fieldTypeToTs(f.fieldType)};`).join('\n')}
}

function ${name}List() {
  const { data, loading, error, refetch } = use${name}s();
  const { create, loading: creating } = useCreate${name}();
  const { remove } = useDelete${name}();
  const [showForm, setShowForm] = useState(false);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500 py-8">Error: {error}</div>;

  const handleCreate = async (formData: Partial<${name}>) => {
    await create(formData);
    refetch();
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await remove(id);
      refetch();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">${name}s</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add ${name}
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
${entity.fields.slice(0, 4).map(f => `              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">${f.name}</th>`).join('\n')}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.${nameLower}s?.map((item: ${name}) => (
              <tr key={item.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
${entity.fields.slice(0, 4).map(f => `                <td className="px-6 py-4 text-sm text-gray-500">{String(item.${f.name})}</td>`).join('\n')}
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ${name}List;
`;
  }

  private generateEntityFormComponent(entity: EntityDeclaration): string {
    const name = entity.name;

    return `/**
 * ${name} Form Component
 * Generated by Reclapp Generator
 */

import React, { useState } from 'react';

interface ${name}FormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

function ${name}Form({ onSubmit, onCancel, initialData }: ${name}FormProps) {
  const [formData, setFormData] = useState(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium">{initialData ? 'Edit' : 'Create'} ${name}</h3>
      
${entity.fields.filter(f => !f.annotations.some(a => a.name === 'generated')).map(f => `      <div>
        <label className="block text-sm font-medium text-gray-700">${f.name}</label>
        <input
          type="${this.getInputType(f.fieldType)}"
          value={formData.${f.name} || ''}
          onChange={(e) => setFormData({ ...formData, ${f.name}: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          ${!f.fieldType.nullable ? 'required' : ''}
        />
      </div>`).join('\n')}

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {initialData ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default ${name}Form;
`;
  }

  private generateDashboardComponent(dashboard: DashboardDeclaration): string {
    const name = typeof dashboard.name === 'object' ? dashboard.name.value : String(dashboard.name);
    const entityName = dashboard.entity?.name 
      ? (typeof dashboard.entity.name === 'object' ? dashboard.entity.name.value : dashboard.entity.name)
      : 'Data';

    return `/**
 * ${name} Dashboard
 * Generated by Reclapp Generator
 */

import React, { useEffect, useState } from 'react';

interface DashboardData {
  total: number;
  items: any[];
}

function ${this.toPascalCase(name)}Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    ${dashboard.streamMode === 'realtime' ? `
    // WebSocket for real-time updates
    const ws = new WebSocket(\`ws://\${window.location.host}/ws\`);
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === '${entityName.toLowerCase()}_update') {
        fetchData();
      }
    };
    return () => ws.close();
    ` : ''}
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/${this.toKebabCase(entityName)}s');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">${name}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total ${entityName}s</h3>
          <p className="text-3xl font-bold text-gray-900">{data?.total || 0}</p>
        </div>
        
        ${(dashboard.metrics || []).map((m, i) => `
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">${m}</h3>
          <p className="text-3xl font-bold text-gray-900">--</p>
        </div>`).join('')}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Recent ${entityName}s</h3>
        <div className="space-y-2">
          {data?.items?.slice(0, 5).map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span>{item.name || item.id}</span>
              <span className="text-sm text-gray-500">{item.createdAt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ${this.toPascalCase(name)}Dashboard;
`;
  }

  private generateApiHooks(entities: EntityDeclaration[]): string {
    const hooks = entities.map(e => {
      const name = e.name;
      const nameLower = this.toCamelCase(name);
      const nameKebab = this.toKebabCase(name);

      return `
// ${name} hooks
export function use${name}s() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch${name}s = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/${nameKebab}s');
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch${name}s(); }, []);

  return { data, loading, error, refetch: fetch${name}s };
}

export function useCreate${name}() {
  const [loading, setLoading] = useState(false);

  const create = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/${nameKebab}s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await response.json();
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}

export function useDelete${name}() {
  const remove = async (id: string) => {
    await fetch(\`/api/${nameKebab}s/\${id}\`, { method: 'DELETE' });
  };
  return { remove };
}
`;
    }).join('\n');

    return `/**
 * API Hooks
 * Generated by Reclapp Generator
 */

import { useState, useEffect } from 'react';

const API_BASE = process.env.VITE_API_URL || '';

${hooks}
`;
  }

  // Continue with more generator methods...
  private generateApiPackageJson(): string {
    return JSON.stringify({
      name: "reclapp-api",
      version: "1.0.0",
      scripts: {
        dev: "ts-node-dev --respawn src/server.ts",
        build: "tsc",
        start: "node dist/server.js"
      },
      dependencies: {
        dotenv: "^16.4.5",
        express: "^4.18.2",
        cors: "^2.8.5",
        helmet: "^7.1.0",
        zod: "^4.3.2",
        ...(this.options.features?.authentication ? { jsonwebtoken: "^9.0.2" } : {}),
        ...(this.options.features?.websocket ? { "socket.io": "^4.7.2" } : {})
      },
      devDependencies: {
        "@types/express": "^4.17.21",
        "@types/cors": "^2.8.17",
        "@types/node": "^20.10.0",
        ...(this.options.features?.authentication ? { "@types/jsonwebtoken": "^9.0.6" } : {}),
        typescript: "^5.3.2",
        "ts-node-dev": "^2.0.0"
      }
    }, null, 2);
  }

  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "commonjs",
        lib: ["ES2022"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"]
    }, null, 2);
  }

  private generateFrontendPackageJson(): string {
    return JSON.stringify({
      name: "reclapp-frontend",
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        preview: "vite preview"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0"
      },
      devDependencies: {
        "@types/react": "^18.2.43",
        "@types/react-dom": "^18.2.17",
        "@vitejs/plugin-react": "^4.2.1",
        autoprefixer: "^10.4.16",
        postcss: "^8.4.32",
        tailwindcss: "^3.3.6",
        typescript: "^5.3.2",
        vite: "^5.0.8"
      }
    }, null, 2);
  }

  private generateViteConfig(): string {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        ws: true
      }
    }
  }
});
`;
  }

  private generateIndexHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reclapp Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  }

  private generateSqlMigration(entities: EntityDeclaration[]): string {
    const tables = entities.map(e => {
      const columns = e.fields
        .filter(f => !this.isSystemFieldName(f.name))
        .map(f => {
        const sqlType = this.fieldTypeToSql(f.fieldType);
        const nullable = f.fieldType.nullable ? '' : ' NOT NULL';
        const unique = f.annotations.some(a => a.name === 'unique') ? ' UNIQUE' : '';
        return `  ${this.toSnakeCase(f.name)} ${sqlType}${nullable}${unique}`;
      })
        .join(',\n');

      return `CREATE TABLE IF NOT EXISTS ${this.toSnakeCase(e.name)}s (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
${columns},
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`;
    }).join('\n\n');

    return `-- Reclapp Database Migration
-- Generated by Reclapp Generator

${tables}
`;
  }

  private generateMongoSchemas(entities: EntityDeclaration[]): string {
    return entities.map(e => `
import mongoose from 'mongoose';

const ${e.name}Schema = new mongoose.Schema({
${e.fields
  .filter(f => !this.isSystemFieldName(f.name))
  .map(f => `  ${f.name}: { type: ${this.fieldTypeToMongoose(f.fieldType)}, required: ${!f.fieldType.nullable} },`)
  .join('\n')}
}, { timestamps: true });

export const ${e.name} = mongoose.model('${e.name}', ${e.name}Schema);
`).join('\n');
  }

  private generateAuthMiddlewareTs(): string {
    return `import * as jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

interface JWTPayload {
  userId: string;
  email?: string;
  roles?: string[];
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'MISSING_TOKEN'
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || '') as JWTPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles
      });
    }

    next();
  };
};
`;
  }

  private generateApiDockerfile(): string {
    return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 8080
CMD ["node", "dist/server.js"]
`;
  }

  private generateFrontendDockerfile(): string {
    return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
`;
  }

  private generateDockerCompose(): string {
    return `version: '3.8'

services:
  api:
    build:
      context: ./api
      dockerfile: ../docker/Dockerfile.api
    ports:
      - "\${API_PORT:-8080}:8080"
    environment:
      - NODE_ENV=\${NODE_ENV:-production}
      - DATABASE_URL=\${DATABASE_URL}
    depends_on:
      - postgres
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/Dockerfile.frontend
    ports:
      - "\${FRONTEND_PORT:-3000}:3000"
    environment:
      - VITE_API_URL=http://api:8080
    depends_on:
      - api
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=\${POSTGRES_USER:-reclapp}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-reclapp}
      - POSTGRES_DB=\${POSTGRES_DB:-reclapp}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
`;
  }

  private generateEnvExample(): string {
    return `# API Configuration
NODE_ENV=development
API_PORT=8080
FRONTEND_PORT=3000

# Database
DATABASE_URL=postgresql://reclapp:reclapp@postgres:5432/reclapp
POSTGRES_USER=reclapp
POSTGRES_PASSWORD=reclapp
POSTGRES_DB=reclapp

# Security
JWT_SECRET=change-in-production
CORS_ORIGIN=http://localhost:3000
`;
  }

  private generateK8sNamespace(namespace: string): string {
    return `apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
`;
  }

  private generateK8sApiDeployment(namespace: string): string {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: ${namespace}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: reclapp/api:latest
          ports:
            - containerPort: 8080
          env:
            - name: NODE_ENV
              value: production
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /api/health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
`;
  }

  private generateK8sFrontendDeployment(namespace: string): string {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: ${namespace}
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: reclapp/frontend:latest
          ports:
            - containerPort: 3000
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
`;
  }

  private generateK8sServices(namespace: string): string {
    return `apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: ${namespace}
spec:
  selector:
    app: api
  ports:
    - port: 8080
      targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: ${namespace}
spec:
  selector:
    app: frontend
  ports:
    - port: 3000
      targetPort: 3000
`;
  }

  private generateK8sIngress(namespace: string): string {
    return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: reclapp-ingress
  namespace: ${namespace}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
    - host: reclapp.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
`;
  }

  private generateGitHubActionsCI(): string {
    return `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm test
      
      - name: Build
        run: npm run build

  build-docker:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build API image
        run: docker build -f docker/Dockerfile.api -t reclapp/api:${{ github.sha }} ./api
      
      - name: Build Frontend image
        run: docker build -f docker/Dockerfile.frontend -t reclapp/frontend:${{ github.sha }} ./frontend
`;
  }

  private generateGitHubActionsDeploy(): string {
    return `name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to Registry
        run: echo "${{ secrets.REGISTRY_TOKEN }}" | docker login -u "${{ secrets.REGISTRY_USER }}" --password-stdin
      
      - name: Build and push API
        run: |
          docker build -f docker/Dockerfile.api -t reclapp/api:latest ./api
          docker push reclapp/api:latest
      
      - name: Build and push Frontend
        run: |
          docker build -f docker/Dockerfile.frontend -t reclapp/frontend:latest ./frontend
          docker push reclapp/frontend:latest
      
      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/
`;
  }

  private generatePackageJson(entities: EntityDeclaration[]): void {
    this.files.push({
      path: `${this.options.output}/package.json`,
      content: JSON.stringify({
        name: "reclapp-generated",
        version: "1.0.0",
        private: true,
        workspaces: ["api", "frontend"],
        scripts: {
          dev: "concurrently \"npm run dev:api\" \"npm run dev:frontend\"",
          "dev:api": "npm run dev -w api",
          "dev:frontend": "npm run dev -w frontend",
          build: "npm run build -w api && npm run build -w frontend",
          "docker:up": "docker-compose up -d",
          "docker:down": "docker-compose down"
        },
        devDependencies: {
          concurrently: "^8.2.2"
        }
      }, null, 2),
      type: 'config',
      overwrite: true
    });
  }

  private generateReadme(entities: EntityDeclaration[], dashboards: DashboardDeclaration[]): void {
    const entityList = entities.map(e => `- **${e.name}**: ${e.fields.length} fields`).join('\n');
    const dashboardList = dashboards.map(d => {
      const name = typeof d.name === 'object' ? d.name.value : d.name;
      return `- ${name}`;
    }).join('\n');

    this.files.push({
      path: `${this.options.output}/README.md`,
      content: `# Reclapp Generated Application

Generated from DSL contract by Reclapp Generator.

## Entities
${entityList}

## Dashboards
${dashboardList}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Development
npm run dev

# Docker
docker-compose up -d
\`\`\`

## API Endpoints

${entities.map(e => `
### ${e.name}
- GET /api/${this.toKebabCase(e.name)}s - List all
- GET /api/${this.toKebabCase(e.name)}s/:id - Get by ID
- POST /api/${this.toKebabCase(e.name)}s - Create
- PUT /api/${this.toKebabCase(e.name)}s/:id - Update
- DELETE /api/${this.toKebabCase(e.name)}s/:id - Delete
`).join('')}

## License
MIT
`,
      type: 'source',
      overwrite: true
    });
  }

  private generateMakefile(): void {
    this.files.push({
      path: `${this.options.output}/Makefile`,
      content: `.PHONY: dev build up down logs clean

dev:
\tnpm run dev

build:
\tnpm run build

up:
\tdocker-compose up -d --build

down:
\tdocker-compose down

logs:
\tdocker-compose logs -f

clean:
\tdocker-compose down -v
\trm -rf node_modules api/node_modules frontend/node_modules
`,
      type: 'config',
      overwrite: true
    });
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  private fieldTypeToTs(type: any): string {
    const base = type.baseType?.toLowerCase() || 'any';
    const tsType = {
      string: 'string',
      int: 'number',
      integer: 'number',
      float: 'number',
      number: 'number',
      decimal: 'number',
      boolean: 'boolean',
      bool: 'boolean',
      date: 'string',
      datetime: 'string',
      timestamp: 'string',
      uuid: 'string',
      json: 'Record<string, any>'
    }[base] || 'any';
    
    return type.isArray ? `${tsType}[]` : tsType;
  }

  private fieldTypeToSql(type: any): string {
    const base = type.baseType?.toLowerCase() || 'text';
    return {
      string: 'TEXT',
      int: 'INTEGER',
      integer: 'INTEGER',
      float: 'REAL',
      number: 'NUMERIC',
      decimal: 'DECIMAL(10,2)',
      boolean: 'BOOLEAN',
      bool: 'BOOLEAN',
      date: 'DATE',
      datetime: 'TIMESTAMPTZ',
      timestamp: 'TIMESTAMPTZ',
      uuid: 'UUID',
      json: 'JSONB'
    }[base] || 'TEXT';
  }

  private fieldTypeToMongoose(type: any): string {
    const base = type.baseType?.toLowerCase() || 'String';
    return {
      string: 'String',
      int: 'Number',
      integer: 'Number',
      float: 'Number',
      number: 'Number',
      decimal: 'Number',
      boolean: 'Boolean',
      bool: 'Boolean',
      date: 'Date',
      datetime: 'Date',
      timestamp: 'Date',
      uuid: 'String',
      json: 'Object'
    }[base] || 'String';
  }

  private getInputType(type: any): string {
    const base = type.baseType?.toLowerCase() || 'text';
    return {
      string: 'text',
      int: 'number',
      integer: 'number',
      float: 'number',
      number: 'number',
      decimal: 'number',
      boolean: 'checkbox',
      bool: 'checkbox',
      date: 'date',
      datetime: 'datetime-local',
      timestamp: 'datetime-local',
      email: 'email',
      url: 'url'
    }[base] || 'text';
  }

  private isSystemFieldName(name: string): boolean {
    return name === 'id' || name === 'createdAt' || name === 'updatedAt';
  }

  private literalToJs(value: any): any {
    if (!value) return undefined;
    if (typeof value !== 'object') return value;

    switch (value.type) {
      case 'StringLiteral':
      case 'NumberLiteral':
      case 'BooleanLiteral':
      case 'NullLiteral':
        return value.value;
      case 'ArrayLiteral':
        return (value.items || []).map((i: any) => this.literalToJs(i));
      default:
        return (value as any).value;
    }
  }

  private fieldTypeToZod(type: any): string {
    const base = type.baseType?.toLowerCase() || 'unknown';
    const zodType = {
      string: 'z.string()',
      text: 'z.string()',
      int: 'z.number().int()',
      integer: 'z.number().int()',
      float: 'z.number()',
      number: 'z.number()',
      decimal: 'z.number()',
      money: 'z.number()',
      boolean: 'z.boolean()',
      bool: 'z.boolean()',
      date: 'z.string()',
      datetime: 'z.string().datetime()',
      timestamp: 'z.string().datetime()',
      uuid: 'z.string().uuid()',
      json: 'z.unknown()',
      email: 'z.string().email()',
      url: 'z.string().url()'
    }[base] || 'z.unknown()';

    if (type.isArray) {
      return `z.array(${zodType})`;
    }

    return zodType;
  }

  private fieldToZod(field: any, mode: 'create' | 'update'): string {
    let zodType = this.fieldTypeToZod(field.fieldType);

    const enumAnn = field.annotations?.find((a: any) => a.name === 'enum');
    const enumValues = (enumAnn?.params || [])
      .map((p: any) => this.literalToJs(p.value ?? p))
      .flat();
    if (enumValues && enumValues.length > 0 && zodType.startsWith('z.string()')) {
      zodType = `z.enum(${JSON.stringify(enumValues)} as [string, ...string[]])`;
      if (field.fieldType.isArray) {
        zodType = `z.array(${zodType})`;
      }
    }

    const patternAnn = field.annotations?.find((a: any) => a.name === 'pattern');
    const pattern = patternAnn?.params?.[0] ? this.literalToJs(patternAnn.params[0].value ?? patternAnn.params[0]) : undefined;
    if (pattern && zodType.includes('z.string()')) {
      zodType += `.regex(new RegExp(${JSON.stringify(pattern)}))`;
    }

    const minAnn = field.annotations?.find((a: any) => a.name === 'min');
    const maxAnn = field.annotations?.find((a: any) => a.name === 'max');
    const min = minAnn?.params?.[0] ? this.literalToJs(minAnn.params[0].value ?? minAnn.params[0]) : undefined;
    const max = maxAnn?.params?.[0] ? this.literalToJs(maxAnn.params[0].value ?? maxAnn.params[0]) : undefined;
    if (typeof min === 'number') {
      zodType += `.min(${min})`;
    }
    if (typeof max === 'number') {
      zodType += `.max(${max})`;
    }

    if (field.fieldType?.nullable) {
      zodType += '.nullable()';
    }

    if (mode === 'create') {
      const hasDefault = field.defaultValue !== undefined && field.defaultValue !== null;
      const defaultValue = hasDefault ? this.literalToJs(field.defaultValue) : undefined;
      if (hasDefault) {
        zodType += `.default(${JSON.stringify(defaultValue)})`;
      } else if (!field.annotations?.some((a: any) => a.name === 'required')) {
        zodType += '.optional()';
      }
    } else {
      zodType += '.optional()';
    }

    return zodType;
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  private toPascalCase(str: string): string {
    return str.replace(/(^|[-_\s])(\w)/g, (_, __, c) => c.toUpperCase());
  }

  private toKebabCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }
}
