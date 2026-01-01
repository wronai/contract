/**
 * Example 1: Simple Notes App
 * Minimalistyczna aplikacja do notatek
 */
import { ContractAI } from '../../src/core/contract-ai';

export const simpleNotesContract: ContractAI = {
  definition: {
    app: { name: 'Simple Notes', version: '1.0.0', description: 'Minimalistyczna aplikacja do notatek' },
    entities: [
      {
        name: 'Note',
        description: 'A simple note',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true, min: 1, max: 200 } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ]
      }
    ],
    api: {
      version: 'v1',
      prefix: '/api/v1',
      resources: [
        { name: 'notes', entity: 'Note', operations: ['list', 'get', 'create', 'update', 'delete'] }
      ]
    }
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD endpoints for notes.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage (Map<string, Note>) for simplicity.' },
      { target: 'api', priority: 'should', instruction: 'Generate UUID v4 for note IDs. Set timestamps automatically.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3001 } }
  },
  validation: {
    assertions: [
      { id: 'A001', description: 'Server exists', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', errorMessage: 'Server file required' },
      { id: 'A002', description: 'Note routes exist', check: { type: 'file-exists', path: 'api/src/routes/notes.ts' }, severity: 'error', errorMessage: 'Note routes required' }
    ],
    tests: [],
    staticRules: [],
    qualityGates: [],
    acceptance: { testsPass: true, minCoverage: 0, maxLintErrors: 10, maxResponseTime: 1000, securityChecks: [], custom: [] }
  }
};

export default simpleNotesContract;
