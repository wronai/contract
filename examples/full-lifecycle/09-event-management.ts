/**
 * Example 9: Event Management
 * System zarządzania wydarzeniami
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const eventContract: ContractAI = {
  metadata: { name: 'Event Management', version: '1.0.0', description: 'Events and registrations' },
  definition: {
    app: { name: 'Events', version: '1.0.0' },
    entities: [
      {
        name: 'Event',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'title', type: 'String', required: true },
          { name: 'description', type: 'Text', required: true },
          { name: 'location', type: 'String', required: true },
          { name: 'startDate', type: 'DateTime', required: true },
          { name: 'endDate', type: 'DateTime', required: true },
          { name: 'capacity', type: 'Int', required: false },
          { name: 'price', type: 'Float', required: false }
        ]
      },
      {
        name: 'Registration',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'eventId', type: 'UUID', required: true },
          { name: 'attendeeName', type: 'String', required: true },
          { name: 'attendeeEmail', type: 'Email', required: true },
          { name: 'status', type: 'String', required: true }, // pending, confirmed, cancelled
          { name: 'registeredAt', type: 'DateTime', required: true }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'CRUD for events and registrations' }],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3009 } }
  },
  validation: { assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }], tests: [], qualityGates: [] }
};

export default eventContract;
