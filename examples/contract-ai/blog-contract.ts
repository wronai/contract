/**
 * Example: Blog Platform Contract AI
 * 
 * Platforma blogowa z postami, komentarzami i kategoriami.
 * 
 * @version 2.2.0
 */

import { ContractAI } from '../../src/core/contract-ai';

export const blogContract: ContractAI = {
  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 1: DEFINITION (CO)
  // ═══════════════════════════════════════════════════════════════════════
  
  definition: {
    app: {
      name: 'Blog Platform',
      version: '1.0.0',
      description: 'Blog with posts, comments, categories, and authors'
    },
    
    entities: [
      {
        name: 'Author',
        description: 'Blog post author',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'bio', type: 'Text', annotations: { required: false } },
          { name: 'avatarUrl', type: 'URL', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Category',
        description: 'Post category',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'slug', type: 'String', annotations: { required: true, unique: true } },
          { name: 'description', type: 'Text', annotations: { required: false } }
        ]
      },
      {
        name: 'Post',
        description: 'Blog post',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true, max: 200 } },
          { name: 'slug', type: 'String', annotations: { required: true, unique: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'excerpt', type: 'String', annotations: { required: false, max: 500 } },
          { name: 'featuredImage', type: 'URL', annotations: { required: false } },
          { name: 'status', type: 'String', annotations: { enum: ['draft', 'published', 'archived'] } },
          { name: 'publishedAt', type: 'DateTime', annotations: { required: false } },
          { name: 'viewCount', type: 'Int', annotations: { default: 0 } },
          { name: 'tags', type: 'JSON', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'author', type: 'ManyToOne', target: 'Author', foreignKey: 'authorId' },
          { name: 'category', type: 'ManyToOne', target: 'Category', foreignKey: 'categoryId' }
        ]
      },
      {
        name: 'Comment',
        description: 'Comment on a post',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'authorName', type: 'String', annotations: { required: true } },
          { name: 'authorEmail', type: 'Email', annotations: { required: true } },
          { name: 'approved', type: 'Boolean', annotations: { default: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'post', type: 'ManyToOne', target: 'Post', foreignKey: 'postId' },
          { name: 'parent', type: 'ManyToOne', target: 'Comment', foreignKey: 'parentId' }
        ]
      }
    ],
    
    api: {
      prefix: '/api/v1',
      resources: [
        { name: 'authors', entity: 'Author', operations: ['list', 'get', 'create', 'update'] },
        { name: 'categories', entity: 'Category', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'posts', entity: 'Post', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'comments', entity: 'Comment', operations: ['list', 'get', 'create', 'update', 'delete'] }
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 2: GENERATION (JAK)
  // ═══════════════════════════════════════════════════════════════════════
  
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' },
      { target: 'api', priority: 'must', instruction: 'Implement proper error handling' },
      { target: 'api', priority: 'must', instruction: 'Validate email format' },
      { target: 'api', priority: 'must', instruction: 'Auto-generate slugs from titles' },
      { target: 'api', priority: 'should', instruction: 'Add pagination to post list' },
      { target: 'api', priority: 'should', instruction: 'Filter posts by status, category, author' },
      { target: 'api', priority: 'may', instruction: 'Add full-text search for posts' }
    ],
    
    patterns: [
      {
        name: 'slug-generator',
        description: 'Generate URL-friendly slugs',
        appliesTo: ['api'],
        template: `
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
`
      }
    ],
    
    constraints: [],
    
    techStack: {
      backend: {
        runtime: 'node',
        language: 'typescript',
        framework: 'express',
        port: 3000,
        libraries: ['zod', 'cors', 'uuid']
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 3: VALIDATION (KIEDY)
  // ═══════════════════════════════════════════════════════════════════════
  
  validation: {
    assertions: [
      {
        id: 'A001',
        description: 'Server exists',
        check: { type: 'file-exists', path: 'api/src/server.ts' },
        severity: 'error',
        errorMessage: 'Missing server.ts'
      },
      {
        id: 'A002',
        description: 'Post routes exist',
        check: { type: 'file-exists', path: 'api/src/routes/posts.ts' },
        severity: 'error',
        errorMessage: 'Missing posts route'
      },
      {
        id: 'A010',
        description: 'Error handling present',
        check: { type: 'has-error-handling', path: 'api/src/routes/posts.ts' },
        severity: 'error',
        errorMessage: 'Missing try-catch in routes'
      },
      {
        id: 'A011',
        description: 'Email validation',
        check: { type: 'has-validation', entityName: 'Comment', fieldName: 'email' },
        severity: 'warn',
        errorMessage: 'Missing email validation'
      }
    ],
    
    tests: [
      {
        name: 'Post API Tests',
        type: 'api',
        target: 'Post',
        scenarios: [
          {
            name: 'should list posts',
            given: 'posts exist',
            when: 'GET /api/v1/posts',
            then: 'return 200 with array',
            expectedResult: { status: 200, isArray: true }
          },
          {
            name: 'should create a post',
            given: 'valid post data',
            when: 'POST /api/v1/posts',
            then: 'return 201 with slug',
            testData: { title: 'My First Post', content: 'Hello world!', status: 'draft' },
            expectedResult: { status: 201, fields: ['slug'] }
          }
        ]
      }
    ],
    
    staticRules: [
      { name: 'no-explicit-any', severity: 'warn' },
      { name: 'prefer-const', severity: 'warn' }
    ],
    
    qualityGates: [
      { name: 'Complexity', metric: 'cyclomatic-complexity', threshold: 15, operator: '<=' },
      { name: 'Duplication', metric: 'duplication-ratio', threshold: 80, operator: '<=' }
    ],
    
    acceptance: {
      testsPass: true,
      minCoverage: 70,
      maxLintErrors: 0,
      maxResponseTime: 500,
      securityChecks: [
        { type: 'no-hardcoded-secrets', severity: 'error', description: 'No secrets' },
        { type: 'input-validation', severity: 'error', description: 'Validate inputs' }
      ],
      custom: []
    }
  },

  metadata: {
    version: '1.0.0',
    author: 'Reclapp Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    tags: ['blog', 'cms', 'content'],
    source: 'manual'
  }
};

export default blogContract;
