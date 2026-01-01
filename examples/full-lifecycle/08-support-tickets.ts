/**
 * Example 8: Support Ticket System
 * System obsługi zgłoszeń klientów
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const supportContract: ContractAI = {
  metadata: { name: 'Support Tickets', version: '1.0.0', description: 'Customer support ticketing' },
  definition: {
    app: { name: 'Support', version: '1.0.0' },
    entities: [
      {
        name: 'Ticket',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'subject', type: 'String', required: true },
          { name: 'description', type: 'Text', required: true },
          { name: 'status', type: 'String', required: true }, // open, in_progress, resolved, closed
          { name: 'priority', type: 'String', required: true }, // low, medium, high, urgent
          { name: 'customerEmail', type: 'Email', required: true },
          { name: 'assigneeId', type: 'UUID', required: false },
          { name: 'createdAt', type: 'DateTime', required: true }
        ]
      },
      {
        name: 'TicketMessage',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'ticketId', type: 'UUID', required: true },
          { name: 'content', type: 'Text', required: true },
          { name: 'isStaff', type: 'Boolean', required: true },
          { name: 'createdAt', type: 'DateTime', required: true }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'CRUD for tickets and messages' }],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3008 } }
  },
  validation: { assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }], tests: [], qualityGates: [] }
};

export default supportContract;
