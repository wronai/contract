/**
 * Example 5: HR System
 * System zarządzania pracownikami
 */
import { ContractAI } from '../../src/core/contract-ai';

export const hrContract: ContractAI = {
  definition: {
    app: { name: 'HR System', version: '1.0.0', description: 'Employee management' },
    entities: [
      {
        name: 'Employee',
        description: 'Company employee',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'firstName', type: 'String', annotations: { required: true } },
          { name: 'lastName', type: 'String', annotations: { required: true } },
          { name: 'position', type: 'String', annotations: { required: true } },
          { name: 'salary', type: 'Float', annotations: { required: false, min: 0 } },
          { name: 'hireDate', type: 'DateTime', annotations: { required: true } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'department', type: 'ManyToOne', target: 'Department', foreignKey: 'departmentId' }
        ]
      },
      {
        name: 'Department',
        description: 'Company department',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'code', type: 'String', annotations: { required: true, unique: true } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'employees', entity: 'Employee', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'departments', entity: 'Department', operations: ['list', 'get', 'create', 'update', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for employees and departments.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3005 } }
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

export default hrContract;
