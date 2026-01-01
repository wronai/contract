/**
 * Example 3: Inventory Management
 * System zarządzania magazynem
 */
import { ContractAI } from '../../src/core/contract-ai';

export const inventoryContract: ContractAI = {
  definition: {
    app: { name: 'Inventory System', version: '1.0.0', description: 'Warehouse and product inventory management' },
    entities: [
      {
        name: 'Product',
        description: 'Inventory product',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'sku', type: 'String', annotations: { required: true, unique: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'quantity', type: 'Int', annotations: { required: true, min: 0 } },
          { name: 'minStock', type: 'Int', annotations: { required: false, default: 10 } },
          { name: 'price', type: 'Float', annotations: { required: true, min: 0 } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Warehouse',
        description: 'Storage location',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'location', type: 'String', annotations: { required: true } },
          { name: 'capacity', type: 'Int', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'products', entity: 'Product', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'warehouses', entity: 'Warehouse', operations: ['list', 'get', 'create', 'update', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for products and warehouses.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3003 } }
  },
  validation: {
    assertions: [
      { id: 'A001', description: 'Server exists', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', errorMessage: 'Server required' }
    ],
    tests: [],
    staticRules: [],
    qualityGates: [],
    acceptance: { testsPass: true, minCoverage: 0, maxLintErrors: 10, maxResponseTime: 1000, securityChecks: [], custom: [] }
  }
};

export default inventoryContract;
