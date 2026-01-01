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
import dotenv from 'dotenv';

${imports}

dotenv.config();

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

export function routeTemplate(
  entityName: string,
  fields: Array<{ name: string; type: string; nullable?: boolean; array?: boolean; annotations?: any; [key: string]: any }> = [],
  authRequired: boolean = false
): string {
  const lower = camel(entityName);
  const nameKebab = kebab(entityName);
  const sampleData = generateSampleData(entityName, fields);

  const creatableFields = fields
    .filter(f => !isSystemFieldName(f.name))
    .filter(f => !isFieldGenerated(f));

  const createSchemaShape = creatableFields
    .map(f => `  ${f.name}: ${fieldToZod(f, 'create')}`)
    .join(',\n');

  const updateSchemaShape = creatableFields
    .map(f => `  ${f.name}: ${fieldToZod(f, 'update')}`)
    .join(',\n');

  const generatedFields = fields
    .filter(f => !isSystemFieldName(f.name))
    .filter(f => isFieldGenerated(f))
    .map(f => `    ${f.name}: ${generatedFieldValueExpr(f)},`)
    .join('\n');

  const authImport = authRequired ? `import { requireAuth } from '../middleware/auth';\n` : '';
  const authUse = authRequired ? `\nrouter.use(requireAuth);\n` : '';

  return `import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { ${entityName}, Create${entityName}Input, Update${entityName}Input } from '../models/${nameKebab}';
${authImport}

const router = Router();
const Create${entityName}Schema = z.object({
${createSchemaShape}
}).strict();

const Update${entityName}Schema = z.object({
${updateSchemaShape}
}).strict();

let ${lower}s: ${entityName}[] = ${sampleData};
${authUse}

router.get('/', (req, res) => res.json({ data: ${lower}s, total: ${lower}s.length }));

router.get('/:id', (req, res) => {
  const item = ${lower}s.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ data: item });
});

router.post('/', (req, res) => {
  const parseResult = Create${entityName}Schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  const input: Create${entityName}Input = parseResult.data;
  const item: ${entityName} = {
    id: randomUUID(),
    ...input,
${generatedFields ? generatedFields + '\n' : ''}
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  ${lower}s.push(item);
  res.status(201).json({ data: item });
});

router.put('/:id', (req, res) => {
  const idx = ${lower}s.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const parseResult = Update${entityName}Schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  const input: Update${entityName}Input = parseResult.data;
  ${lower}s[idx] = { ...${lower}s[idx], ...input, updatedAt: new Date().toISOString() };
  res.json({ data: ${lower}s[idx] });
});

router.patch('/:id', (req, res) => {
  const idx = ${lower}s.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const parseResult = Update${entityName}Schema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.flatten().fieldErrors
    });
  }

  ${lower}s[idx] = { ...${lower}s[idx], ...parseResult.data, updatedAt: new Date().toISOString() };
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
  fields: Array<{ name: string; type: string; nullable?: boolean; annotations?: any; [key: string]: any }>
): string {
  const modelFields = fields.filter(f => !isSystemFieldName(f.name));
  const fieldDefs = modelFields
    .map(f => {
      const required = isFieldRequired(f);
      const optional = !required || !!f.nullable ? '?' : '';
      const baseType = tsFieldType(f);
      const nullableSuffix = f.nullable ? ' | null' : '';
      return `  ${f.name}${optional}: ${baseType}${nullableSuffix};`;
    })
    .join('\n');

  const createFieldDefs = modelFields
    .filter(f => !isFieldGenerated(f))
    .map(f => {
      const required = isFieldRequired(f);
      const optional = !required || !!f.nullable || fieldDefaultValue(f) !== undefined ? '?' : '';
      const baseType = tsFieldType(f);
      const nullableSuffix = f.nullable ? ' | null' : '';
      return `  ${f.name}${optional}: ${baseType}${nullableSuffix};`;
    })
    .join('\n');

  return `export interface ${entityName} {
  id: string;
${fieldDefs}
  createdAt: string;
  updatedAt: string;
}

export interface Create${entityName}Input {
${createFieldDefs}
}

export interface Update${entityName}Input extends Partial<Create${entityName}Input> {}
`;
}

export function apiPackageJson(name: string, version: string, authEnabled: boolean = false): string {
  return JSON.stringify({
    name: `${kebab(name)}-api`,
    version,
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
      ...(authEnabled ? { jsonwebtoken: "^9.0.2" } : {})
    },
    devDependencies: {
      "@types/express": "^4.17.21", "@types/cors": "^2.8.17",
      "@types/node": "^20.10.0",
      ...(authEnabled ? { "@types/jsonwebtoken": "^9.0.6" } : {}),
      typescript: "^5.3.2",
      "ts-node-dev": "^2.0.0"
    }
  }, null, 2);
}

export function authMiddlewareTemplate(): string {
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

function tsFieldType(field: any): string {
  const base = tsType(String(field?.type || 'any'));
  return field?.array ? `${base}[]` : base;
}

function isSystemFieldName(name: string): boolean {
  return name === 'id' || name === 'createdAt' || name === 'updatedAt';
}

function isFieldRequired(field: any): boolean {
  const requiredFlag = field?.annotations?.required;
  if (typeof requiredFlag === 'boolean') return requiredFlag;
  if (typeof field?.required === 'boolean') return field.required;
  return true;
}

function isFieldGenerated(field: any): boolean {
  if (field?.annotations?.generated) return true;
  if (field?.generated) return true;
  return field?.annotations?.some?.((a: any) => a?.name === 'generated') || false;
}

function generatedFieldValueExpr(field: any): string {
  const type = String(field?.type || '');
  const name = String(field?.name || '').toLowerCase();

  if (field?.array) {
    return '[]';
  }

  if (type === 'DateTime' || type === 'Date') {
    return 'new Date().toISOString()';
  }

  if (type === 'UUID') {
    return 'randomUUID()';
  }

  if (type === 'Int' || type === 'Float' || type === 'Decimal' || type === 'Money') {
    return '0';
  }

  if (type === 'Boolean') {
    return 'false';
  }

  if (type === 'JSON') {
    return '{}';
  }

  if (name.includes('token') || name.includes('key')) {
    return 'Math.random().toString(36).slice(2)';
  }

  return "''";
}

function fieldDefaultValue(field: any): any {
  if (field?.annotations?.default !== undefined) return field.annotations.default;
  if (field?.default !== undefined) return field.default;
  return undefined;
}

function fieldTypeToZod(field: any): string {
  const type = String(field?.type || 'unknown');
  const base = {
    String: 'z.string()',
    Int: 'z.number().int()',
    Float: 'z.number()',
    Decimal: 'z.number()',
    Money: 'z.number()',
    Boolean: 'z.boolean()',
    DateTime: 'z.string().datetime()',
    Date: 'z.string()',
    Email: 'z.string().email()',
    URL: 'z.string().url()',
    UUID: 'z.string().uuid()',
    JSON: 'z.record(z.string(), z.unknown())'
  }[type] || 'z.unknown()';

  return base;
}

function fieldToZod(field: any, mode: 'create' | 'update'): string {
  let zodType = fieldTypeToZod(field);

  const fieldType = String(field?.type || '');

  const enumValues = field?.annotations?.enum ?? field?.enum;
  if (Array.isArray(enumValues) && enumValues.length > 0 && fieldType === 'String') {
    zodType = `z.enum(${JSON.stringify(enumValues)} as [string, ...string[]])`;
  }

  const pattern = field?.annotations?.pattern ?? field?.pattern;
  if (typeof pattern === 'string' && fieldType === 'String') {
    zodType += `.regex(new RegExp(${JSON.stringify(pattern)}))`;
  }

  if (field?.array) {
    zodType = `z.array(${zodType})`;
  }

  const min = field?.annotations?.min ?? field?.min;
  const max = field?.annotations?.max ?? field?.max;
  const supportsMinMax = field?.array || ['String', 'Int', 'Float', 'Decimal', 'Money'].includes(fieldType);
  if (supportsMinMax && typeof min === 'number') {
    zodType += `.min(${min})`;
  }
  if (supportsMinMax && typeof max === 'number') {
    zodType += `.max(${max})`;
  }

  if (field?.nullable) {
    zodType += '.nullable()';
  }

  if (mode === 'create') {
    const def = fieldDefaultValue(field);
    if (def !== undefined) {
      zodType += `.default(${JSON.stringify(def)})`;
    } else if (field?.nullable || !isFieldRequired(field)) {
      zodType += '.optional()';
    }
  } else {
    zodType += '.optional()';
  }

  return zodType;
}

function generateSampleData(
  entityName: string,
  fields: Array<{ name: string; type: string; array?: boolean; nullable?: boolean }>
): string {
  const samples: any[] = [];
  const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'];
  
  for (let i = 0; i < 5; i++) {
    const item: Record<string, any> = {
      id: String(i + 1),
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - i * 86400000).toISOString()
    };
    
    for (const field of fields) {
      if (field.name === 'createdAt' || field.name === 'updatedAt' || field.name === 'id') continue;

      if (field.array) {
        switch (field.type) {
          case 'UUID':
            item[field.name] = [
              `${i + 1}`.padStart(8, '0') + '-0000-0000-0000-000000000000',
              `${i + 2}`.padStart(8, '0') + '-0000-0000-0000-000000000000'
            ];
            break;
          case 'Int':
          case 'Float':
          case 'Decimal':
          case 'Money':
            item[field.name] = [
              Math.floor(Math.random() * 1000) + i * 100,
              Math.floor(Math.random() * 1000) + i * 100 + 1
            ];
            break;
          case 'Boolean':
            item[field.name] = [i % 2 === 0, i % 2 !== 0];
            break;
          case 'DateTime':
          case 'Date':
            item[field.name] = [
              new Date(Date.now() - i * 86400000).toISOString(),
              new Date(Date.now() - (i + 1) * 86400000).toISOString()
            ];
            break;
          case 'JSON':
            item[field.name] = [{ sample: `${names[i]} ${field.name}` }];
            break;
          default:
            item[field.name] = [`${names[i]} ${field.name}`, `${names[i]} ${field.name} 2`];
        }
        continue;
      }
      
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
        case 'JSON':
          item[field.name] = { sample: `${names[i]} ${field.name}` };
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
