import { SimpleGenerator } from '../../generator/core/simple-generator';
import type { ApiConfig, Entity, ReclappContract } from '../../contracts/dsl-types';

describe('SimpleGenerator (bin/reclapp path)', () => {
  it('generates Zod validation + auth middleware for AUTH required resources and avoids duplicate system fields', async () => {
    const Contact: Entity = {
      name: 'Contact',
      fields: [
        { name: 'email', type: 'Email' },
        { name: 'firstName', type: 'String' },
        { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
        { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
      ]
    };

    const api: ApiConfig = {
      version: 'v1',
      prefix: '/api/v1',
      resources: [
        {
          name: 'contacts',
          entity: 'Contact',
          operations: ['list', 'get', 'create', 'update', 'delete'],
          auth: 'required'
        }
      ]
    };

    const contract: ReclappContract = {
      app: {
        name: 'Test App',
        version: '2.1.0',
        description: 'Test'
      },
      entities: [Contact],
      api
    };

    const generator = new SimpleGenerator(contract, '/tmp/reclapp-simple-generator-test');
    const files = generator.generate();

    const authFile = files.find(f => f.path.endsWith('api/src/middleware/auth.ts'));
    expect(authFile).toBeDefined();

    const routeFile = files.find(f => f.path.endsWith('api/src/routes/contact.ts'));
    expect(routeFile).toBeDefined();

    expect(routeFile!.content).toContain("import { z } from 'zod';");
    expect(routeFile!.content).toContain("import { requireAuth } from '../middleware/auth';");
    expect(routeFile!.content).toContain('router.use(requireAuth);');

    expect(routeFile!.content).toContain('CreateContactSchema.safeParse');
    expect(routeFile!.content).toContain('UpdateContactSchema.safeParse');
    expect(routeFile!.content).toContain("error: 'Validation failed'");
    expect(routeFile!.content).toContain('fieldErrors');

    expect(routeFile!.content).toContain('id: randomUUID()');

    const modelFile = files.find(f => f.path.endsWith('api/src/models/contact.ts'));
    expect(modelFile).toBeDefined();

    const createdAtMatches = modelFile!.content.match(/\bcreatedAt\s*:\s*string;/g) || [];
    const updatedAtMatches = modelFile!.content.match(/\bupdatedAt\s*:\s*string;/g) || [];
    expect(createdAtMatches).toHaveLength(1);
    expect(updatedAtMatches).toHaveLength(1);

    const migrationFile = files.find(f => f.path.endsWith('database/migrations/001_init.sql'));
    expect(migrationFile).toBeDefined();

    const createdAtColumnMatches = migrationFile!.content.match(/\n\s*created_at\s+TIMESTAMPTZ/g) || [];
    const updatedAtColumnMatches = migrationFile!.content.match(/\n\s*updated_at\s+TIMESTAMPTZ/g) || [];
    expect(createdAtColumnMatches).toHaveLength(1);
    expect(updatedAtColumnMatches).toHaveLength(1);

    const apiPackage = files.find(f => f.path.endsWith('api/package.json'));
    expect(apiPackage).toBeDefined();
    expect(apiPackage!.content).toContain('"zod"');
    expect(apiPackage!.content).toContain('"dotenv"');
    expect(apiPackage!.content).toContain('"jsonwebtoken"');
  });

  it('does not generate auth middleware if no resources require auth', async () => {
    const Contact: Entity = {
      name: 'Contact',
      fields: [{ name: 'email', type: 'Email' }]
    };

    const api: ApiConfig = {
      version: 'v1',
      prefix: '/api/v1',
      resources: [
        {
          name: 'contacts',
          entity: 'Contact',
          operations: ['list', 'get', 'create', 'update', 'delete']
        }
      ]
    };

    const contract: ReclappContract = {
      app: {
        name: 'Test App',
        version: '2.1.0',
        description: 'Test'
      },
      entities: [Contact],
      api
    };

    const generator = new SimpleGenerator(contract, '/tmp/reclapp-simple-generator-test');
    const files = generator.generate();

    const authFile = files.find(f => f.path.endsWith('api/src/middleware/auth.ts'));
    expect(authFile).toBeUndefined();

    const routeFile = files.find(f => f.path.endsWith('api/src/routes/contact.ts'));
    expect(routeFile).toBeDefined();

    expect(routeFile!.content).not.toContain("import { requireAuth }");
    expect(routeFile!.content).not.toContain('router.use(requireAuth)');
  });

  it('handles JSON + nullable + generated fields in a way that compiles (schema/types/sample data)', async () => {
    const Thing: Entity = {
      name: 'Thing',
      fields: [
        { name: 'name', type: 'String' },
        { name: 'payload', type: 'JSON' },
        { name: 'note', type: 'String', nullable: true },
        { name: 'recordedAt', type: 'DateTime', annotations: { generated: true } }
      ]
    };

    const api: ApiConfig = {
      version: 'v1',
      prefix: '/api/v1',
      resources: [
        {
          name: 'things',
          entity: 'Thing',
          operations: ['list', 'get', 'create', 'update', 'delete']
        }
      ]
    };

    const contract: ReclappContract = {
      app: {
        name: 'Test App',
        version: '2.1.0',
        description: 'Test'
      },
      entities: [Thing],
      api
    };

    const generator = new SimpleGenerator(contract, '/tmp/reclapp-simple-generator-test');
    const files = generator.generate();

    const modelFile = files.find(f => f.path.endsWith('api/src/models/thing.ts'));
    expect(modelFile).toBeDefined();
    expect(modelFile!.content).toContain('payload: Record<string, any>');
    expect(modelFile!.content).toContain('note?: string | null;');

    const routeFile = files.find(f => f.path.endsWith('api/src/routes/thing.ts'));
    expect(routeFile).toBeDefined();

    expect(routeFile!.content).toContain('name: z.string()');

    const createSchemaBlock = routeFile!.content.match(/const CreateThingSchema[\s\S]*?\)\.strict\(\);/);
    expect(createSchemaBlock).toBeTruthy();
    expect(createSchemaBlock![0]).not.toContain('name: z.string().optional()');

    expect(routeFile!.content).toContain('payload: z.record(z.string(), z.unknown())');
    expect(routeFile!.content).not.toMatch(/"payload"\s*:\s*"/);

    expect(routeFile!.content).toContain('recordedAt: new Date().toISOString()');
  });
});
