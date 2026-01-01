/**
 * Example 6: Blog Platform
 * Platforma blogowa z postami i komentarzami
 */
import { ContractAI } from '../../src/core/contract-ai/types';

export const blogContract: ContractAI = {
  metadata: { name: 'Blog Platform', version: '1.0.0', description: 'Blog with posts and comments' },
  definition: {
    app: { name: 'Blog', version: '1.0.0' },
    entities: [
      {
        name: 'Post',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'title', type: 'String', required: true },
          { name: 'slug', type: 'String', required: true },
          { name: 'content', type: 'Text', required: true },
          { name: 'published', type: 'Boolean', required: true },
          { name: 'authorId', type: 'UUID', required: true },
          { name: 'createdAt', type: 'DateTime', required: true }
        ]
      },
      {
        name: 'Comment',
        fields: [
          { name: 'id', type: 'UUID', required: true },
          { name: 'postId', type: 'UUID', required: true },
          { name: 'authorName', type: 'String', required: true },
          { name: 'content', type: 'Text', required: true },
          { name: 'createdAt', type: 'DateTime', required: true }
        ]
      }
    ],
    api: { version: 'v1', prefix: '/api' }
  },
  generation: {
    instructions: [{ target: 'api', priority: 'must', instruction: 'CRUD for posts and comments' }],
    techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3006 } }
  },
  validation: { assertions: [{ id: 'A001', check: { type: 'file-exists', path: 'api/src/server.ts' }, severity: 'error', message: 'Required' }], tests: [], qualityGates: [] }
};

export default blogContract;
