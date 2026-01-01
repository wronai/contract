/**
 * Example: Task Manager Contract AI
 * 
 * System zarządzania zadaniami z projektami, użytkownikami i przypisaniami.
 * Oparty na examples/apps/task-manager.
 * 
 * @version 2.2.0
 */

import { ContractAI } from '../../src/core/contract-ai';

export const taskManagerContract: ContractAI = {
  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 1: DEFINITION (CO)
  // ═══════════════════════════════════════════════════════════════════════
  
  definition: {
    app: {
      name: 'Task Manager',
      version: '1.0.0',
      description: 'Task management system with projects, users, and assignments'
    },
    
    entities: [
      {
        name: 'User',
        description: 'System user who can be assigned to tasks',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
          { name: 'name', type: 'String', annotations: { required: true, min: 1, max: 100 } },
          { name: 'avatar', type: 'URL', annotations: { required: false } },
          { name: 'role', type: 'String', annotations: { enum: ['admin', 'manager', 'member'] } },
          { name: 'active', type: 'Boolean', annotations: { default: true } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ]
      },
      {
        name: 'Project',
        description: 'Project containing multiple tasks',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'name', type: 'String', annotations: { required: true, min: 1, max: 200 } },
          { name: 'description', type: 'Text', annotations: { required: false } },
          { name: 'status', type: 'String', annotations: { enum: ['active', 'on_hold', 'completed', 'archived'] } },
          { name: 'startDate', type: 'DateTime', annotations: { required: false } },
          { name: 'endDate', type: 'DateTime', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'owner', type: 'ManyToOne', target: 'User', foreignKey: 'ownerId' }
        ]
      },
      {
        name: 'Task',
        description: 'Individual task within a project',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'title', type: 'String', annotations: { required: true, min: 1, max: 300 } },
          { name: 'description', type: 'Text', annotations: { required: false } },
          { name: 'status', type: 'String', annotations: { enum: ['todo', 'in_progress', 'review', 'done', 'cancelled'] } },
          { name: 'priority', type: 'String', annotations: { enum: ['low', 'medium', 'high', 'urgent'] } },
          { name: 'dueDate', type: 'DateTime', annotations: { required: false } },
          { name: 'estimatedHours', type: 'Float', annotations: { required: false, min: 0 } },
          { name: 'actualHours', type: 'Float', annotations: { required: false, min: 0 } },
          { name: 'tags', type: 'JSON', annotations: { required: false } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
          { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'project', type: 'ManyToOne', target: 'Project', foreignKey: 'projectId' },
          { name: 'assignee', type: 'ManyToOne', target: 'User', foreignKey: 'assigneeId' },
          { name: 'createdBy', type: 'ManyToOne', target: 'User', foreignKey: 'createdById' }
        ]
      },
      {
        name: 'Comment',
        description: 'Comment on a task',
        fields: [
          { name: 'id', type: 'UUID', annotations: { generated: true } },
          { name: 'content', type: 'Text', annotations: { required: true } },
          { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
        ],
        relations: [
          { name: 'task', type: 'ManyToOne', target: 'Task', foreignKey: 'taskId' },
          { name: 'author', type: 'ManyToOne', target: 'User', foreignKey: 'authorId' }
        ]
      }
    ],
    
    api: {
      prefix: '/api/v1',
      resources: [
        { name: 'users', entity: 'User', operations: ['list', 'get', 'create', 'update'] },
        { name: 'projects', entity: 'Project', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'tasks', entity: 'Task', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'comments', entity: 'Comment', operations: ['list', 'get', 'create', 'delete'] }
      ]
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LAYER 2: GENERATION (JAK)
  // ═══════════════════════════════════════════════════════════════════════
  
  generation: {
    instructions: [
      { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' },
      { target: 'api', priority: 'must', instruction: 'Implement proper error handling with try-catch in all routes' },
      { target: 'api', priority: 'must', instruction: 'Validate email format for User entity' },
      { target: 'api', priority: 'must', instruction: 'Use Zod schemas for input validation' },
      { target: 'api', priority: 'should', instruction: 'Add pagination to list endpoints (limit, offset)' },
      { target: 'api', priority: 'should', instruction: 'Filter tasks by status, priority, assignee' },
      { target: 'api', priority: 'may', instruction: 'Add search functionality for tasks by title' }
    ],
    
    patterns: [
      {
        name: 'service-layer',
        description: 'Use service layer for business logic',
        applies_to: ['api'],
        example: `
class TaskService {
  async create(data: CreateTaskInput): Promise<Task> {
    // Validate business rules
    // Create task
    // Return result
  }
}
`
      }
    ],
    
    constraints: [
      { type: 'no-raw-sql', description: 'Use ORM or query builder instead of raw SQL', severity: 'error' },
      { type: 'max-function-lines', value: 50, description: 'Keep functions under 50 lines', severity: 'warn' }
    ],
    
    techStack: {
      backend: {
        runtime: 'node',
        language: 'typescript',
        framework: 'express',
        port: 3000,
        libraries: ['zod', 'cors', 'helmet', 'uuid']
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
        description: 'Server entry point exists',
        check: { type: 'file-exists', path: 'api/src/server.ts' },
        severity: 'error',
        errorMessage: 'Missing server.ts entry point'
      },
      {
        id: 'A002',
        description: 'User routes exist',
        check: { type: 'file-exists', path: 'api/src/routes/users.ts' },
        severity: 'error',
        errorMessage: 'Missing users route file'
      },
      {
        id: 'A003',
        description: 'Task routes exist',
        check: { type: 'file-exists', path: 'api/src/routes/tasks.ts' },
        severity: 'error',
        errorMessage: 'Missing tasks route file'
      },
      {
        id: 'A004',
        description: 'Project routes exist',
        check: { type: 'file-exists', path: 'api/src/routes/projects.ts' },
        severity: 'error',
        errorMessage: 'Missing projects route file'
      },
      {
        id: 'A010',
        description: 'Routes have error handling',
        check: { type: 'has-error-handling', path: 'api/src/routes/tasks.ts' },
        severity: 'error',
        errorMessage: 'Missing try-catch in routes'
      },
      {
        id: 'A011',
        description: 'Email validation present',
        check: { type: 'has-validation', entityName: 'User', fieldName: 'email' },
        severity: 'error',
        errorMessage: 'Missing email validation'
      }
    ],
    
    tests: [
      {
        name: 'User API Tests',
        type: 'api',
        target: 'User',
        scenarios: [
          {
            name: 'should list all users',
            given: 'users exist in database',
            when: 'GET /api/v1/users',
            then: 'return 200 with array of users',
            expectedResult: { status: 200, isArray: true }
          },
          {
            name: 'should create a new user',
            given: 'valid user data',
            when: 'POST /api/v1/users with body',
            then: 'return 201 with created user',
            testData: { email: 'test@example.com', name: 'Test User', role: 'member' },
            expectedResult: { status: 201, fields: ['id', 'email', 'name'] }
          },
          {
            name: 'should reject invalid email',
            given: 'user data with invalid email',
            when: 'POST /api/v1/users with invalid email',
            then: 'return 400 with validation error',
            testData: { email: 'not-an-email', name: 'Test' },
            expectedResult: { status: 400 }
          }
        ]
      },
      {
        name: 'Task API Tests',
        type: 'api',
        target: 'Task',
        scenarios: [
          {
            name: 'should create a task',
            given: 'valid task data and existing project',
            when: 'POST /api/v1/tasks',
            then: 'return 201 with created task',
            testData: { title: 'Implement feature', status: 'todo', priority: 'high' },
            expectedResult: { status: 201 }
          },
          {
            name: 'should update task status',
            given: 'existing task',
            when: 'PUT /api/v1/tasks/:id with new status',
            then: 'return 200 with updated task',
            testData: { status: 'in_progress' },
            expectedResult: { status: 200 }
          }
        ]
      }
    ],
    
    staticRules: [
      { name: 'no-unused-vars', severity: 'error' },
      { name: 'no-explicit-any', severity: 'warn', options: [{ ignoreRestArgs: true }] },
      { name: 'prefer-const', severity: 'warn' },
      { name: 'eqeqeq', severity: 'error' }
    ],
    
    qualityGates: [
      { name: 'Minimum test coverage', metric: 'test-coverage', threshold: 70, operator: '>=' },
      { name: 'Maximum cyclomatic complexity', metric: 'cyclomatic-complexity', threshold: 15, operator: '<=' },
      { name: 'Acceptable code duplication', metric: 'duplication-ratio', threshold: 70, operator: '<=' }
    ],
    
    acceptance: {
      testsPass: true,
      minCoverage: 70,
      maxLintErrors: 0,
      maxResponseTime: 500,
      securityChecks: [
        { type: 'no-hardcoded-secrets', severity: 'error', description: 'No API keys or passwords in code' },
        { type: 'input-validation', severity: 'error', description: 'All inputs must be validated' }
      ],
      custom: []
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // METADATA
  // ═══════════════════════════════════════════════════════════════════════
  
  metadata: {
    version: '1.0.0',
    author: 'Reclapp Team',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    tags: ['task-management', 'projects', 'productivity'],
    source: 'manual'
  }
};

export default taskManagerContract;
