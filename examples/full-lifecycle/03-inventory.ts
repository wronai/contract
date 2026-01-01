/**
 * Example 3: Inventory Management
 * System zarządzania magazynem
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const inventoryContract: ContractAI = {
  metadata: {
    name: 'Inventory System',
    version: '1.0.0',
    description: 'Warehouse and product inventory management'
  },
  definition: {
    app: { name: 'Inventory', version: '1.0.0' },
    entities: [
      {
        name: 'Product',
        description: 'Inventory product',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'sku', type: 'String', required: true },
          { name: 'name', type: 'String', required: true },
          { name: 'quantity', type: 'Int', required: true },
          { name: 'minStock', type: 'Int', required: false },
          { name: 'price', type: 'Float', required: true },
          { name: 'categoryId', type: 'UUID', required: false }
        ]
      },
      {
        name: 'Warehouse',
        description: 'Storage location',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'name', type: 'String', required: true },
          { name: 'location', type: 'String', required: true },
          { name: 'capacity', type: 'Int', required: false }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'CRUD for products and warehouses' }
    ],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3003 } }
  },
  validation: {
    assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }],
    tests: [], qualityGates: []
  }
};

export default inventoryContract;
