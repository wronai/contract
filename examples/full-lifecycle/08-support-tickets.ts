/**
 * Example 8: Support Ticket System
 * System obsługi zgłoszeń klientów
 */
import { ContractAI } from '../../src/core/contract-ai';

export const supportContract: ContractAI = {
  definition: {
    app: { name: 'Support Tickets', version: '1.0.0', description: 'Customer support ticketing' },
    entities: [
      {
        name: 'Ticket',
        description: 'Support ticket',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'subject', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text', annotations: { required: true } },
          { name: 'status', type: 'String', annotations: { required: true, enum: ['open', 'in_progress', 'resolved', 'closed'] } },
          { name: 'priority', type: 'String', annotations: { required: true, enum: ['low', 'medium', 'high', 'urgent'] } },
          { name: 'customerEmail', type: 'Email', annotations: { required: true } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'TicketMessage',
        description: 'Message in ticket',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'isStaff', type: 'Boolean', annotations: { required: true, default: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'ticket', type: 'ManyToOne', target: 'Ticket', foreignKey: 'ticketId' }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'tickets', entity: 'Ticket', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'messages', entity: 'TicketMessage', operations: ['list', 'get', 'create', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for tickets and messages.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3008 } }
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

export default supportContract;
