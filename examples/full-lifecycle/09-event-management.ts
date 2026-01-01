/**
 * Example 9: Event Management
 * System zarządzania wydarzeniami
 */
import { ContractAI } from '../../src/core/contract-ai';

export const eventContract: ContractAI = {
  definition: {
    app: { name: 'Event Management', version: '1.0.0', description: 'Events and registrations' },
    entities: [
      {
        name: 'Event',
        description: 'Event or conference',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text', annotations: { required: true } },
          { name: 'location', type: 'String', annotations: { required: true } },
          { name: 'startDate', type: 'DateTime', annotations: { required: true } },
          { name: 'endDate', type: 'DateTime', annotations: { required: true } },
          { name: 'capacity', type: 'Int', annotations: { required: false, min: 0 } },
          { name: 'price', type: 'Money', annotations: { required: false, min: 0 } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Registration',
        description: 'Event registration',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'attendeeName', type: 'String', annotations: { required: true } },
          { name: 'attendeeEmail', type: 'Email', annotations: { required: true } },
          { name: 'status', type: 'String', annotations: { required: true, enum: ['pending', 'confirmed', 'cancelled'] } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'event', type: 'ManyToOne', target: 'Event', foreignKey: 'eventId' }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'events', entity: 'Event', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'registrations', entity: 'Registration', operations: ['list', 'get', 'create', 'update', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for events and registrations.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3009 } }
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

export default eventContract;
