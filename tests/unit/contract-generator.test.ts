import { generateFromContract } from '../../generator/core/contract-generator';
import type { ApiConfig, Entity, ReclappContract } from '../../contracts/dsl-types';

describe('ContractGenerator (API)', () => {
  it('generates Zod validation and auth middleware for AUTH required resources', async () => {
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

    const result = await generateFromContract(contract, '/tmp/reclapp-generator-test', {
      dryRun: true
    });

    const authFile = result.files.find(f => f.path.endsWith('api/src/middleware/auth.ts'));
    expect(authFile).toBeDefined();

    const routeFile = result.files.find(f => f.path.endsWith('api/src/routes/contact.ts'));
    expect(routeFile).toBeDefined();

    expect(routeFile!.content).toContain("import { z } from 'zod';");
    expect(routeFile!.content).toContain("import { requireAuth } from '../middleware/auth';");
    expect(routeFile!.content).toContain('router.use(requireAuth);');

    expect(routeFile!.content).toContain('CreateContactSchema.safeParse');
    expect(routeFile!.content).toContain('UpdateContactSchema.safeParse');
    expect(routeFile!.content).toContain("error: 'Validation failed'");
    expect(routeFile!.content).toContain('fieldErrors');

    expect(routeFile!.content).toContain('id: randomUUID()');

    const modelFile = result.files.find(f => f.path.endsWith('api/src/models/contact.ts'));
    expect(modelFile).toBeDefined();

    const createdAtMatches = modelFile!.content.match(/\bcreatedAt\s*:\s*string;/g) || [];
    const updatedAtMatches = modelFile!.content.match(/\bupdatedAt\s*:\s*string;/g) || [];
    expect(createdAtMatches).toHaveLength(1);
    expect(updatedAtMatches).toHaveLength(1);

    const migration = result.files.find(f => f.path.endsWith('database/migrations/001_init.sql'));
    expect(migration).toBeDefined();

    const createdAtColumnMatches = migration!.content.match(/\n\s*created_at\s+TIMESTAMPTZ/g) || [];
    const updatedAtColumnMatches = migration!.content.match(/\n\s*updated_at\s+TIMESTAMPTZ/g) || [];
    expect(createdAtColumnMatches).toHaveLength(1);
    expect(updatedAtColumnMatches).toHaveLength(1);
  });
});
