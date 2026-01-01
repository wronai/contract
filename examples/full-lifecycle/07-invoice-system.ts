/**
 * Example 7: Invoice System
 * System fakturowania
 */
import { ContractAI } from '../../src/core/contract-ai';

export const invoiceContract: ContractAI = {
  definition: {
    app: { name: 'Invoice System', version: '1.0.0', description: 'Invoicing and billing' },
    entities: [
      {
        name: 'Invoice',
        description: 'Customer invoice',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'number', type: 'String', annotations: { required: true, unique: true } },
          { name: 'issueDate', type: 'DateTime', annotations: { required: true } },
          { name: 'dueDate', type: 'DateTime', annotations: { required: true } },
          { name: 'total', type: 'Money', annotations: { required: true, min: 0 } },
          { name: 'status', type: 'String', annotations: { required: true, enum: ['draft', 'sent', 'paid', 'overdue'] } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'InvoiceItem',
        description: 'Invoice line item',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'description', type: 'String', annotations: { required: true } },
          { name: 'quantity', type: 'Int', annotations: { required: true, min: 1 } },
          { name: 'unitPrice', type: 'Money', annotations: { required: true, min: 0 } }
        ],
        relations: [
          { name: 'invoice', type: 'ManyToOne', target: 'Invoice', foreignKey: 'invoiceId' }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'invoices', entity: 'Invoice', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'invoice-items', entity: 'InvoiceItem', operations: ['list', 'get', 'create', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for invoices and items.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3007 } }
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

export default invoiceContract;
