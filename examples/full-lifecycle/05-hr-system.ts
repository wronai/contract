/**
 * Example 5: HR System
 * System zarządzania pracownikami
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const hrContract: ContractAI = {
  metadata: { name: 'HR System', version: '1.0.0', description: 'Employee management' },
  definition: {
    app: { name: 'HR', version: '1.0.0' },
    entities: [
      {
        name: 'Employee',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'email', type: 'Email', required: true },
          { name: 'firstName', type: 'String', required: true },
          { name: 'lastName', type: 'String', required: true },
          { name: 'position', type: 'String', required: true },
          { name: 'departmentId', type: 'UUID', required: false },
          { name: 'salary', type: 'Float', required: false },
          { name: 'hireDate', type: 'DateTime', required: true }
        ]
      },
      {
        name: 'Department',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'name', type: 'String', required: true },
          { name: 'code', type: 'String', required: true },
          { name: 'managerId', type: 'UUID', required: false }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'CRUD for employees and departments' }],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3005 } }
  },
  validation: { assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }], tests: [], qualityGates: [] }
};

export default hrContract;
