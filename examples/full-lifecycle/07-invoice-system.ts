/**
 * Example 7: Invoice System
 * System fakturowania
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const invoiceContract: ContractAI = {
  metadata: { name: 'Invoice System', version: '1.0.0', description: 'Invoicing and billing' },
  definition: {
    app: { name: 'Invoices', version: '1.0.0' },
    entities: [
      {
        name: 'Invoice',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'number', type: 'String', required: true },
          { name: 'customerId', type: 'UUID', required: true },
          { name: 'issueDate', type: 'DateTime', required: true },
          { name: 'dueDate', type: 'DateTime', required: true },
          { name: 'total', type: 'Float', required: true },
          { name: 'status', type: 'String', required: true } // draft, sent, paid, overdue
        ]
      },
      {
        name: 'InvoiceItem',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'invoiceId', type: 'UUID', required: true },
          { name: 'description', type: 'String', required: true },
          { name: 'quantity', type: 'Int', required: true },
          { name: 'unitPrice', type: 'Float', required: true }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'CRUD for invoices and items' }],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3007 } }
  },
  validation: { assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }], tests: [], qualityGates: [] }
};

export default invoiceContract;
