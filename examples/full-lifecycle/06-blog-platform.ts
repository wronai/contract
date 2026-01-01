/**
 * Example 6: Blog Platform
 * Platforma blogowa z postami i komentarzami
 */
import { ContractAI } from '../../src/core/contract-ai';

export const blogContract: ContractAI = {
  definition: {
    app: { name: 'Blog Platform', version: '1.0.0', description: 'Blog with posts and comments' },
    entities: [
      {
        name: 'Post',
        description: 'Blog post',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true } },
          { name: 'slug', type: 'String', annotations: { required: true, unique: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'published', type: 'Boolean', annotations: { required: true, default: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Comment',
        description: 'Post comment',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'authorName', type: 'String', annotations: { required: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'post', type: 'ManyToOne', target: 'Post', foreignKey: 'postId' }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api/v1', resources: [
      { name: 'posts', entity: 'Post', operations: ['list', 'get', 'create', 'update', 'delete'] },
      { name: 'comments', entity: 'Comment', operations: ['list', 'get', 'create', 'delete'] }
    ]}
  },
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript. Create CRUD for posts and comments.' },
      { target: 'api', priority: 'must', instruction: 'Use in-memory storage for simplicity.' }
    ],
    patterns: [],
    constraints: [],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3006 } }
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

export default blogContract;
