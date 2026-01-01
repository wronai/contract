/**
 * Example 10: Project Tracker
 * System śledzenia projektów i milestone'ów
 */
import { ContractAI } from '../../src/core/contract-ai';

export const projectContract: ContractAI = {
  definition: {
    app: { name: 'Project Tracker', version: '1.0.0', description: 'Project and milestone tracking' },
    entities: [
      {
        name: 'Project',
        description: 'Project with budget and timeline',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text', annotations: { required: false } },
          { name: 'status', type: 'String', annotations: { required: true, enum: ['planning', 'active', 'on_hold', 'completed'] } },
          { name: 'startDate', type: 'DateTime', annotations: { required: true } },
          { name: 'endDate', type: 'DateTime', annotations: { required: false } },
          { name: 'budget', type: 'Money', annotations: { required: false, min: 0 } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Milestone',
        description: 'Project milestone',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true } },
          { name: 'dueDate', type: 'DateTime', annotations: { required: true } },
          { name: 'completed', type: 'Boolean', annotations: { required: true, default: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'project', type: 'ManyToOne', target: 'Project', foreignKey: 'projectId' }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'projects', entity: 'Project', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'milestones', entity: 'Milestone', operations: ['list', 'get', 'create', 'update', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for projects and milestones.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3010 } }
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

export default projectContract;
