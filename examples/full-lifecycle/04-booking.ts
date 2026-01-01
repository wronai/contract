/**
 * Example 4: Booking System
 * System rezerwacji (hotel, restauracja, usługi)
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const bookingContract: ContractAI = {
  metadata: { name: 'Booking System', version: '1.0.0', description: 'Reservation management' },
  definition: {
    app: { name: 'Booking', version: '1.0.0' },
    entities: [
      {
        name: 'Resource',
        description: 'Bookable resource (room, table, service)',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'name', type: 'String', required: true },
          { name: 'type', type: 'String', required: true },
          { name: 'capacity', type: 'Int', required: false },
          { name: 'pricePerHour', type: 'Float', required: true }
        ]
      },
      {
        name: 'Booking',
        description: 'Reservation',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'resourceId', type: 'UUID', required: true },
          { name: 'customerName', type: 'String', required: true },
          { name: 'customerEmail', type: 'Email', required: true },
          { name: 'startTime', type: 'DateTime', required: true },
          { name: 'endTime', type: 'DateTime', required: true },
          { name: 'status', type: 'String', required: true }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'CRUD for resources and bookings' }],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3004 } }
  },
  validation: { assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }], tests: [], qualityGates: [] }
};

export default bookingContract;
