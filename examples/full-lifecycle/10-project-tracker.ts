/**
 * Example 10: Project Tracker
 * System śledzenia projektów i milestone'ów
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const projectContract: ContractAI = {
  metadata: { name: 'Project Tracker', version: '1.0.0', description: 'Project and milestone tracking' },
  definition: {
    app: { name: 'Projects', version: '1.0.0' },
    entities: [
      {
        name: 'Project',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'name', type: 'String', required: true },
          { name: 'description', type: 'Text', required: false },
          { name: 'status', type: 'String', required: true }, // planning, active, on_hold, completed
          { name: 'startDate', type: 'DateTime', required: true },
          { name: 'endDate', type: 'DateTime', required: false },
          { name: 'budget', type: 'Float', required: false },
          { name: 'ownerId', type: 'UUID', required: true }
        ]
      },
      {
        name: 'Milestone',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'projectId', type: 'UUID', required: true },
          { name: 'title', type: 'String', required: true },
          { name: 'dueDate', type: 'DateTime', required: true },
          { name: 'completed', type: 'Boolean', required: true }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'CRUD for projects and milestones' }],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3010 } }
  },
  validation: { assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }], tests: [], qualityGates: [] }
};

export default projectContract;
