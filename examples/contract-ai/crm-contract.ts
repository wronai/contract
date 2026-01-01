/**
 * Example: CRM Contract AI
 * 
 * Kompletny przykład Contract AI dla systemu CRM.
 * 
 * @see todo/14-reclapp-llm-code-generation-spec.md
 */

import { ContractAI } from '../../src/core/contract-ai';

/**
 * Contract AI dla systemu CRM
 */
export const crmContract: ContractAI = {
  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 1: DEFINITION (CO)
  // ═══════════════════════════════════════════════════════════════════════
  
  definition: {
    app: {
      name: 'CRM System',
      version: '1.0.0',
      description: 'Customer Relationship Management System'
    },
    
    entities: [
      {
        name: 'Contact',
        description: 'Customer contact information',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'firstName', type: 'String', annotations: { required: true, min: 1, max: 100 } },
          { name: 'lastName', type: 'String', annotations: { required: true, min: 1, max: 100 } },
          { name: 'phone', type: 'Phone', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'company', type: 'ManyToOne', target: 'Company', foreignKey: 'companyId' }
        ]
      },
      {
        name: 'Company',
        description: 'Company/Organization information',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true, min: 1, max: 200 } },
          { name: 'industry', type: 'String', annotations: { required: false } },
          { name: 'website', type: 'URL', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'contacts', type: 'OneToMany', target: 'Contact' }
        ]
      },
      {
        name: 'Deal',
        description: 'Sales deal/opportunity',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true } },
          { name: 'value', type: 'Money', annotations: { required: true, min: 0 } },
          { name: 'stage', type: 'String', annotations: { 
            required: true, 
            enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] 
          }},
          { name: 'probability', type: 'Int', annotations: { min: 0, max: 100, default: 0 } },
          { name: 'expectedCloseDate', type: 'DateTime', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'contact', type: 'ManyToOne', target: 'Contact', foreignKey: 'contactId' },
          { name: 'company', type: 'ManyToOne', target: 'Company', foreignKey: 'companyId' }
        ]
      }
    ],
    
    api: {
      version: 'v1',
      prefix: '/api/v1',
      resources: [
        { name: 'contacts', entity: 'Contact', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'companies', entity: 'Company', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'deals', entity: 'Deal', operations: ['list', 'get', 'create', 'update', 'delete'] }
      ],
      authentication: {
        type: 'jwt'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 2: GENERATION (JAK GENEROWAĆ)
  // ═══════════════════════════════════════════════════════════════════════
  
  generation: {
    instructions: [
      // MUST - obowiązkowe
      {
        target: 'api',
        priority: 'must',
        instruction: 'Use Express.js with TypeScript. Each entity must have its own route file in routes/ directory.'
      },
      {
        target: 'api',
        priority: 'must',
        instruction: 'Implement proper error handling with try-catch blocks and return appropriate HTTP status codes (200, 201, 400, 404, 500).'
      },
      {
        target: 'api',
        priority: 'must',
        instruction: 'Validate all inputs before processing. Email fields must be validated for format using regex.'
      },
      {
        target: 'all',
        priority: 'must',
        instruction: 'All code must be properly typed with TypeScript. No "any" types allowed except for error handlers.'
      },
      
      // SHOULD - zalecane
      {
        target: 'api',
        priority: 'should',
        instruction: 'Use in-memory storage (Map<string, Entity>) for simplicity. Include full CRUD operations.'
      },
      {
        target: 'api',
        priority: 'should',
        instruction: 'Generate UUID v4 for entity IDs. Set createdAt and updatedAt timestamps automatically.'
      },
      
      // MAY - opcjonalne
      {
        target: 'frontend',
        priority: 'may',
        instruction: 'Create list and form components for each entity using React functional components.'
      }
    ],
    
    patterns: [
      {
        name: 'Express Route Pattern',
        description: 'Standard pattern for Express.js route files',
        appliesTo: ['api'],
        template: `
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const storage = new Map<string, {{EntityType}}>();

// GET all
router.get('/', async (req: Request, res: Response) => {
  try {
    const items = Array.from(storage.values());
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET by id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const item = storage.get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = validate{{EntityType}}(req.body);
    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }
    
    const item: {{EntityType}} = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    storage.set(item.id, item);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
        `,
        variables: [
          { name: 'EntityType', description: 'Name of the entity type', type: 'string', required: true }
        ]
      },
      {
        name: 'Email Validation Pattern',
        description: 'Pattern for validating email fields',
        appliesTo: ['api'],
        template: `
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
        `
      }
    ],
    
    constraints: [
      { type: 'no-any-types', rule: 'No "any" types allowed except in error handlers', severity: 'error' },
      { type: 'no-external-deps', rule: 'Use only express, uuid, and TypeScript standard library', severity: 'warning' },
      { type: 'naming-convention', rule: 'Use camelCase for variables, PascalCase for types/interfaces', severity: 'warning' },
      { type: 'max-file-size', rule: 'Each file should be under 300 lines', severity: 'warning' }
    ],
    
    techStack: {
      backend: {
        runtime: 'node',
        language: 'typescript',
        framework: 'express',
        port: 3000,
        libraries: ['uuid', 'cors']
      },
      frontend: {
        framework: 'react',
        bundler: 'vite',
        styling: 'tailwind',
        uiLibrary: 'shadcn'
      },
      database: {
        type: 'in-memory'
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 3: VALIDATION (JAK SPRAWDZAĆ / KIEDY GOTOWE)
  // ═══════════════════════════════════════════════════════════════════════
  
  validation: {
    assertions: [
      // File existence
      { id: 'A001', description: 'Server entry point exists', check: { type: 'file-exists', path: 'api/src/server.ts' }, errorMessage: 'Missing server.ts', severity: 'error' },
      { id: 'A002', description: 'Contact routes exist', check: { type: 'file-exists', path: 'api/src/routes/contacts.ts' }, errorMessage: 'Missing contacts.ts routes', severity: 'error' },
      { id: 'A003', description: 'Company routes exist', check: { type: 'file-exists', path: 'api/src/routes/companies.ts' }, errorMessage: 'Missing companies.ts routes', severity: 'error' },
      { id: 'A004', description: 'Deal routes exist', check: { type: 'file-exists', path: 'api/src/routes/deals.ts' }, errorMessage: 'Missing deals.ts routes', severity: 'error' },
      { id: 'A005', description: 'Types file exists', check: { type: 'file-exists', path: 'api/src/types/index.ts' }, errorMessage: 'Missing types/index.ts', severity: 'error' },
      
      // Error handling
      { id: 'A010', description: 'Routes have error handling', check: { type: 'file-contains', path: 'api/src/routes/contacts.ts', pattern: 'try.*catch' }, errorMessage: 'Missing try-catch in routes', severity: 'error' },
      
      // Validation
      { id: 'A011', description: 'Email validation implemented', check: { type: 'has-validation', entityName: 'Contact', fieldName: 'email' }, errorMessage: 'Missing email validation', severity: 'error' }
    ],
    
    tests: [
      {
        name: 'Contact API Tests',
        type: 'api',
        target: 'Contact',
        scenarios: [
          {
            name: 'should list all contacts',
            given: 'contacts exist in database',
            when: 'GET /api/v1/contacts',
            then: 'return 200 with array of contacts',
            expectedResult: { status: 200, isArray: true }
          },
          {
            name: 'should create a new contact',
            given: 'valid contact data',
            when: 'POST /api/v1/contacts with body',
            then: 'return 201 with created contact including id',
            testData: { email: 'john@example.com', firstName: 'John', lastName: 'Doe' },
            expectedResult: { status: 201, fields: ['id', 'email', 'firstName', 'lastName', 'createdAt'] }
          },
          {
            name: 'should return 400 for invalid email',
            given: 'contact data with invalid email',
            when: 'POST /api/v1/contacts with invalid email',
            then: 'return 400 with validation error',
            testData: { email: 'invalid-email', firstName: 'John', lastName: 'Doe' },
            expectedResult: { status: 400 }
          },
          {
            name: 'should return 404 for non-existent contact',
            given: 'non-existent contact id',
            when: 'GET /api/v1/contacts/non-existent-id',
            then: 'return 404 not found',
            expectedResult: { status: 404 }
          }
        ]
      },
      {
        name: 'Company API Tests',
        type: 'api',
        target: 'Company',
        scenarios: [
          {
            name: 'should list all companies',
            given: 'companies exist in database',
            when: 'GET /api/v1/companies',
            then: 'return 200 with array of companies',
            expectedResult: { status: 200, isArray: true }
          },
          {
            name: 'should create a new company',
            given: 'valid company data',
            when: 'POST /api/v1/companies with body',
            then: 'return 201 with created company',
            testData: { name: 'Acme Corp', industry: 'Technology' },
            expectedResult: { status: 201, fields: ['id', 'name', 'industry', 'createdAt'] }
          }
        ]
      },
      {
        name: 'Deal API Tests',
        type: 'api',
        target: 'Deal',
        scenarios: [
          {
            name: 'should create a new deal',
            given: 'valid deal data',
            when: 'POST /api/v1/deals with body',
            then: 'return 201 with created deal',
            testData: { title: 'Enterprise License', value: 50000, stage: 'lead' },
            expectedResult: { status: 201, fields: ['id', 'title', 'value', 'stage', 'createdAt'] }
          },
          {
            name: 'should reject invalid stage',
            given: 'deal data with invalid stage',
            when: 'POST /api/v1/deals with invalid stage',
            then: 'return 400 with validation error',
            testData: { title: 'Test Deal', value: 1000, stage: 'invalid-stage' },
            expectedResult: { status: 400 }
          }
        ]
      }
    ],
    
    staticRules: [
      { name: 'no-unused-vars', severity: 'error' },
      { name: 'no-explicit-any', severity: 'warn', options: [{ ignoreRestArgs: true }] },
      { name: 'prefer-const', severity: 'warn' },
      { name: 'eqeqeq', severity: 'error' }
    ],
    
    qualityGates: [
      { name: 'Minimum test coverage', metric: 'test-coverage', threshold: 70, operator: '>=' },
      { name: 'Maximum cyclomatic complexity', metric: 'cyclomatic-complexity', threshold: 15, operator: '<=' },
      { name: 'No code duplication', metric: 'duplication-ratio', threshold: 5, operator: '<=' }
    ],
    
    acceptance: {
      testsPass: true,
      minCoverage: 70,
      maxLintErrors: 0,
      maxResponseTime: 500,
      securityChecks: [
        { type: 'no-hardcoded-secrets', severity: 'error', description: 'No API keys or passwords in code' },
        { type: 'input-validation', severity: 'error', description: 'All inputs must be validated' }
      ],
      custom: []
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════
  
  metadata: {
    version: '1.0.0',
    author: 'Reclapp Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    tags: ['crm', 'sales', 'contacts'],
    source: 'manual'
  }
};

export default crmContract;
