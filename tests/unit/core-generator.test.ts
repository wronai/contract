import { Generator } from '../../generator/core/generator';
import type {
  Annotation,
  AnnotationParam,
  EntityDeclaration,
  FieldDeclaration,
  LiteralValue,
  Location,
  NumberLiteral,
  Program,
  StringLiteral,
  TypeExpression
} from '../../dsl/ast/types';

describe('Generator (CLI) - API output', () => {
  const loc: Location = {
    start: { offset: 0, line: 1, column: 1 },
    end: { offset: 0, line: 1, column: 1 }
  };

  const t = (baseType: string, nullable = false, isArray = false): TypeExpression => ({
    type: 'TypeExpression',
    baseType,
    nullable,
    isArray,
    location: loc
  });

  const str = (value: string): StringLiteral => ({
    type: 'StringLiteral',
    value,
    location: loc
  });

  const num = (value: number): NumberLiteral => ({
    type: 'NumberLiteral',
    value,
    location: loc
  });

  const param = (value: LiteralValue): AnnotationParam => ({
    value
  });

  const ann = (name: string, params: AnnotationParam[] = []): Annotation => ({
    type: 'Annotation',
    name,
    params,
    location: loc
  });

  const baseAst = (): Program => {
    const fields: FieldDeclaration[] = [
      {
        type: 'FieldDeclaration',
        name: 'id',
        fieldType: t('UUID'),
        annotations: [ann('generated')],
        location: loc
      },
      {
        type: 'FieldDeclaration',
        name: 'email',
        fieldType: t('String'),
        annotations: [ann('required'), ann('pattern', [param(str('[^@]+@[^@]+\\.[^@]+'))])],
        location: loc
      },
      {
        type: 'FieldDeclaration',
        name: 'age',
        fieldType: t('Int', true),
        annotations: [],
        defaultValue: num(18),
        location: loc
      },
      {
        type: 'FieldDeclaration',
        name: 'createdAt',
        fieldType: t('DateTime'),
        annotations: [ann('generated')],
        location: loc
      },
      {
        type: 'FieldDeclaration',
        name: 'updatedAt',
        fieldType: t('DateTime'),
        annotations: [ann('generated')],
        location: loc
      }
    ];

    const entity: EntityDeclaration = {
      type: 'EntityDeclaration',
      name: 'Customer',
      fields,
      location: loc
    };

    return {
      type: 'Program',
      version: '2.4.1',
      statements: [entity],
      location: loc
    };
  };

  it('generates Zod validation, auth middleware and avoids duplicate system fields', async () => {
    const generator = new Generator(baseAst(), {
      target: 'full-stack',
      output: '/tmp/reclapp-cli-generator-test',
      features: {
        authentication: true,
        websocket: false,
        eventSourcing: false,
        caching: false,
        monitoring: false
      },
      framework: {
        api: 'express',
        database: 'postgresql',
        frontend: 'react'
      }
    });

    const result = await generator.generate();
    expect(result.success).toBe(true);

    const authFile = result.files.find(f => f.path.endsWith('/api/src/middleware/auth.ts'));
    expect(authFile).toBeDefined();

    const routeFile = result.files.find(f => f.path.endsWith('/api/src/routes/customer.ts'));
    expect(routeFile).toBeDefined();

    expect(routeFile!.content).toContain("import { z } from 'zod';");
    expect(routeFile!.content).toContain("import { requireAuth } from '../middleware/auth';");
    expect(routeFile!.content).toContain('router.use(requireAuth);');
    expect(routeFile!.content).toContain('CreateCustomerSchema.safeParse');
    expect(routeFile!.content).toContain('UpdateCustomerSchema.safeParse');
    expect(routeFile!.content).toContain('router.patch');
    expect(routeFile!.content).toContain('id: randomUUID()');

    const modelFile = result.files.find(f => f.path.endsWith('/api/src/models/customer.ts'));
    expect(modelFile).toBeDefined();

    const createdAtMatches = modelFile!.content.match(/\bcreatedAt\s*:\s*string;/g) || [];
    const updatedAtMatches = modelFile!.content.match(/\bupdatedAt\s*:\s*string;/g) || [];
    expect(createdAtMatches).toHaveLength(1);
    expect(updatedAtMatches).toHaveLength(1);

    const migration = result.files.find(f => f.path.endsWith('/database/migrations/001_init.sql'));
    expect(migration).toBeDefined();

    const createdAtColumnMatches = migration!.content.match(/\n\s*created_at\s+TIMESTAMPTZ/g) || [];
    const updatedAtColumnMatches = migration!.content.match(/\n\s*updated_at\s+TIMESTAMPTZ/g) || [];
    expect(createdAtColumnMatches).toHaveLength(1);
    expect(updatedAtColumnMatches).toHaveLength(1);

    const apiPackage = result.files.find(f => f.path.endsWith('/api/package.json'));
    expect(apiPackage).toBeDefined();
    expect(apiPackage!.content).toContain('"zod"');
    expect(apiPackage!.content).toContain('"dotenv"');
    expect(apiPackage!.content).toContain('"jsonwebtoken"');
  });

  it('does not include auth middleware when authentication feature is disabled', async () => {
    const generator = new Generator(baseAst(), {
      target: 'api',
      output: '/tmp/reclapp-cli-generator-test',
      features: {
        authentication: false,
        websocket: false,
        eventSourcing: false,
        caching: false,
        monitoring: false
      },
      framework: {
        api: 'express',
        database: 'postgresql',
        frontend: 'react'
      }
    });

    const result = await generator.generate();
    expect(result.success).toBe(true);

    const authFile = result.files.find(f => f.path.endsWith('/api/src/middleware/auth.ts'));
    expect(authFile).toBeUndefined();

    const routeFile = result.files.find(f => f.path.endsWith('/api/src/routes/customer.ts'));
    expect(routeFile).toBeDefined();

    expect(routeFile!.content).not.toContain("import { requireAuth }");
    expect(routeFile!.content).not.toContain('router.use(requireAuth)');
  });
});
