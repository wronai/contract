/**
 * Example 4: Booking System
 * System rezerwacji (hotel, restauracja, usługi)
 */
import { ContractAI } from '../../src/core/contract-ai';

export const bookingContract: ContractAI = {
  definition: {
    app: { name: 'Booking System', version: '1.0.0', description: 'Reservation management' },
    entities: [
      {
        name: 'Resource',
        description: 'Bookable resource (room, table, service)',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'type', type: 'String', annotations: { required: true } },
          { name: 'capacity', type: 'Int', annotations: { required: false } },
          { name: 'pricePerHour', type: 'Float', annotations: { required: true, min: 0 } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Booking',
        description: 'Reservation',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'customerName', type: 'String', annotations: { required: true } },
          { name: 'customerEmail', type: 'Email', annotations: { required: true } },
          { name: 'startTime', type: 'DateTime', annotations: { required: true } },
          { name: 'endTime', type: 'DateTime', annotations: { required: true } },
          { name: 'status', type: 'String', annotations: { required: true, enum: ['pending', 'confirmed', 'cancelled'] } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'resource', type: 'ManyToOne', target: 'Resource', foreignKey: 'resourceId' }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'resources', entity: 'Resource', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'bookings', entity: 'Booking', operations: ['list', 'get', 'create', 'update', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for resources and bookings.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3004 } }
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

export default bookingContract;
