/**
 * API Templates - Express Server Generation
 */

export interface TemplateContext {
  appName: string;
  appVersion: string;
  entities: Array<{ name: string; fields: Array<{ name: string; type: string; nullable?: boolean }> }>;
}

export function serverTemplate(ctx: TemplateContext): string {
  const imports = ctx.entities.map(e => 
    `import ${camel(e.name)}Routes from './routes/${kebab(e.name)}';`
  ).join('\n');

  const routes = ctx.entities.map(e =>
    `app.use('/api/${kebab(e.name)}s', ${camel(e.name)}Routes);`
  ).join('\n  ');

  return `import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

${imports}

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', name: '${ctx.appName}', version: '${ctx.appVersion}' });
});

${routes}

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(\`🚀 API running on http://localhost:\${PORT}\`));

export default app;
`;
}

export function routeTemplate(entityName: string, fields: Array<{ name: string; type: string }> = []): string {
  const lower = camel(entityName);
  const sampleData = generateSampleData(entityName, fields);

  return `import { Router, Request, Response } from 'express';

const router = Router();
let ${lower}s: any[] = ${sampleData};
let nextId = ${lower}s.length + 1;

router.get('/', (req, res) => res.json({ data: ${lower}s, total: ${lower}s.length }));

router.get('/:id', (req, res) => {
  const item = ${lower}s.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ data: item });
});

router.post('/', (req, res) => {
  const item = { id: String(nextId++), ...req.body, createdAt: new Date().toISOString() };
  ${lower}s.push(item);
  res.status(201).json({ data: item });
});

router.put('/:id', (req, res) => {
  const idx = ${lower}s.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  ${lower}s[idx] = { ...${lower}s[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json({ data: ${lower}s[idx] });
});

router.delete('/:id', (req, res) => {
  const idx = ${lower}s.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  ${lower}s.splice(idx, 1);
  res.status(204).send();
});

export default router;
`;
}

export function modelTemplate(
  entityName: string, 
  fields: Array<{ name: string; type: string; nullable?: boolean }>
): string {
  const filteredFields = fields.filter(f => f.name !== 'createdAt' && f.name !== 'updatedAt');
  const fieldDefs = filteredFields
    .map(f => `  ${f.name}${f.nullable ? '?' : ''}: ${tsType(f.type)};`)
    .join('\n');

  return `export interface ${entityName} {
  id: string;
${fieldDefs}
  createdAt: string;
  updatedAt?: string;
}
`;
}

export function apiPackageJson(name: string, version: string): string {
  return JSON.stringify({
    name: `${kebab(name)}-api`,
    version,
    scripts: {
      dev: "ts-node-dev --respawn src/server.ts",
      build: "tsc",
      start: "node dist/server.js"
    },
    dependencies: { express: "^4.18.2", cors: "^2.8.5", helmet: "^7.1.0" },
    devDependencies: {
      "@types/express": "^4.17.21", "@types/cors": "^2.8.17",
      "@types/node": "^20.10.0", typescript: "^5.3.2", "ts-node-dev": "^2.0.0"
    }
  }, null, 2);
}

export function apiTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: "ES2022", module: "commonjs", outDir: "./dist", rootDir: "./src",
      strict: true, esModuleInterop: true, skipLibCheck: true
    },
    include: ["src/**/*"]
  }, null, 2);
}

// Utility functions
function kebab(s: string): string { 
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(); 
}

function camel(s: string): string { 
  return s.charAt(0).toLowerCase() + s.slice(1); 
}

function tsType(t: string): string {
  const map: Record<string, string> = {
    String: 'string', Int: 'number', Float: 'number', Decimal: 'number',
    Boolean: 'boolean', DateTime: 'string', Date: 'string', UUID: 'string',
    JSON: 'Record<string, any>', Money: 'number', Email: 'string', URL: 'string'
  };
  return map[t] || 'any';
}

function generateSampleData(entityName: string, fields: Array<{ name: string; type: string }>): string {
  const samples: any[] = [];
  const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
  
  for (let i = 0; i < 5; i++) {
    const item: Record<string, any> = {
      id: String(i + 1),
      createdAt: new Date(Date.now() - i * 86400000).toISOString()
    };
    
    for (const field of fields) {
      if (field.name === 'createdAt' || field.name === 'updatedAt' || field.name === 'id') continue;
      
      switch (field.type) {
        case 'String':
        case 'Email':
          if (field.name.toLowerCase().includes('email')) {
            item[field.name] = `${names[i].toLowerCase()}@example.com`;
          } else if (field.name.toLowerCase().includes('name')) {
            item[field.name] = `${names[i]} ${entityName}`;
          } else if (field.name.toLowerCase().includes('key')) {
            item[field.name] = `key_${Math.random().toString(36).slice(2, 10)}`;
          } else if (field.name.toLowerCase().includes('domain') || field.name.toLowerCase().includes('url')) {
            item[field.name] = `https://${names[i].toLowerCase()}.example.com`;
          } else if (field.name.toLowerCase().includes('status')) {
            item[field.name] = ['active', 'pending', 'completed'][i % 3];
          } else {
            item[field.name] = `${names[i]} ${field.name}`;
          }
          break;
        case 'Int':
        case 'Float':
        case 'Decimal':
        case 'Money':
          item[field.name] = Math.floor(Math.random() * 1000) + i * 100;
          break;
        case 'Boolean':
          item[field.name] = i % 2 === 0;
          break;
        case 'DateTime':
        case 'Date':
          item[field.name] = new Date(Date.now() - i * 86400000).toISOString();
          break;
        case 'UUID':
          item[field.name] = `${i + 1}`.padStart(8, '0') + '-0000-0000-0000-000000000000';
          break;
        default:
          item[field.name] = `${names[i]}`;
      }
    }
    samples.push(item);
  }
  
  return JSON.stringify(samples, null, 2);
}

export { kebab, camel, tsType, generateSampleData };
