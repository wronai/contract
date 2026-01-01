/**
 * Example 2: Todo App
 * Aplikacja do zarządzania zadaniami z priorytetami
 */
import { ContractAI } from '../../src/core/contract-ai';

export const todoAppContract: ContractAI = {
  definition: {
    app: { name: 'Todo App', version: '1.0.0', description: 'Task management with priorities and due dates' },
    entities: [
      {
        name: 'Task',
        description: 'A todo task',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'Text', annotations: { required: false } },
          { name: 'status', type: 'String', annotations: { required: true } },
          { name: 'priority', type: 'String', annotations: { required: true } },
          { name: 'dueDate', type: 'DateTime', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Category',
        description: 'Task category',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'color', type: 'String', annotations: { required: false } }
        ]
      }
    ],
    api: {
      version: 'v1',
      prefix: '/api/v1',
      resources: [
        { name: 'tasks', entity: 'Task', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'categories', entity: 'Category', operations: ['list', 'get', 'create', 'update', 'delete'] }
      ]
    }
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD endpoints for tasks and categories.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3002 } }
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

export default todoAppContract;
