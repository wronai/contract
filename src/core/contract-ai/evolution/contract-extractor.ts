/**
 * Contract Extractor
 *
 * Extracts ContractAI from natural language prompts by detecting
 * entities, fields, relations, and tech stack preferences.
 *
 * Extracted from EvolutionManager (R01).
 * @version 2.4.1
 */

import { ContractAI } from '../types';

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Create a minimal ContractAI from a natural language prompt.
 */
export function createMinimalContract(prompt: string): ContractAI {
  const entities = extractEntitiesFromPrompt(prompt);
  const lower = prompt.toLowerCase();

  const appNameMatch = prompt.match(
    /(?:create|build|make)\s+(?:a|an)?\s*(\w+(?:\s+\w+)?)\s+(?:app|application|system|service|api)/i
  );
  const appName = appNameMatch ? capitalize(appNameMatch[1]) + ' App' : 'Generated App';

  const wantsPostgres = lower.includes('postgres') || lower.includes('postgresql');
  const wantsMysql = lower.includes('mysql');
  const wantsSqlite = lower.includes('sqlite');
  const wantsMongo = lower.includes('mongodb') || lower.includes('mongo');
  const wantsDocker =
    lower.includes('docker') || lower.includes('docker compose') || lower.includes('docker-compose');
  const wantsCicd =
    lower.includes('cicd') ||
    lower.includes('ci/cd') ||
    lower.includes('github actions') ||
    lower.includes('github workflow') ||
    (lower.includes('ci') && lower.includes('github'));

  // Detect backend language/framework preferences
  const wantsPython =
    lower.includes('python') || lower.includes('flask') || lower.includes('fastapi') || lower.includes('django');
  const wantsGo = lower.includes('golang') || lower.includes(' go ') || lower.includes('gin') || lower.includes('fiber');
  const wantsRust = lower.includes('rust') || lower.includes('actix') || lower.includes('axum');
  const wantsJava = lower.includes('java') || lower.includes('spring') || lower.includes('quarkus');
  const wantsFastify = lower.includes('fastify');
  const wantsNest = lower.includes('nestjs') || lower.includes('nest.js');
  const wantsKoa = lower.includes('koa');

  // Detect frontend framework preferences
  const wantsVue = lower.includes('vue') || lower.includes('vuejs');
  const wantsSvelte = lower.includes('svelte') || lower.includes('sveltekit');
  const wantsAngular = lower.includes('angular');
  const wantsNextjs = lower.includes('nextjs') || lower.includes('next.js');

  // Determine backend config
  let backendFramework = 'express';
  let backendLanguage = 'typescript';
  let backendRuntime = 'node';

  if (wantsPython) {
    backendLanguage = 'python';
    backendRuntime = 'python';
    backendFramework = lower.includes('fastapi') ? 'fastapi' : lower.includes('django') ? 'django' : 'flask';
  } else if (wantsGo) {
    backendLanguage = 'go';
    backendRuntime = 'go';
    backendFramework = lower.includes('fiber') ? 'fiber' : 'gin';
  } else if (wantsRust) {
    backendLanguage = 'rust';
    backendRuntime = 'rust';
    backendFramework = lower.includes('axum') ? 'axum' : 'actix';
  } else if (wantsJava) {
    backendLanguage = 'java';
    backendRuntime = 'jvm';
    backendFramework = lower.includes('quarkus') ? 'quarkus' : 'spring';
  } else if (wantsFastify) {
    backendFramework = 'fastify';
  } else if (wantsNest) {
    backendFramework = 'nestjs';
  } else if (wantsKoa) {
    backendFramework = 'koa';
  }

  // Determine frontend config
  let frontendFramework = 'react';
  let frontendStyling = 'tailwind';

  if (wantsVue) {
    frontendFramework = 'vue';
  } else if (wantsSvelte) {
    frontendFramework = 'svelte';
  } else if (wantsAngular) {
    frontendFramework = 'angular';
  } else if (wantsNextjs) {
    frontendFramework = 'nextjs';
  }

  const dbType = wantsPostgres
    ? 'postgresql'
    : wantsMysql
      ? 'mysql'
      : wantsSqlite
        ? 'sqlite'
        : wantsMongo
          ? 'mongodb'
          : 'in-memory';

  const instructions: any[] = [
    { target: 'api', priority: 'must', content: `Generate REST API for: ${prompt}` },
    { target: 'tests', priority: 'must', content: 'Generate comprehensive API tests' },
    { target: 'frontend', priority: 'must', content: 'Generate React frontend with Tailwind CSS' },
  ];

  if (dbType !== 'in-memory') {
    instructions.push({
      target: 'database',
      priority: 'should',
      content: `Generate database artifacts (migrations + env) for ${dbType}`,
    });
  }
  if (wantsDocker) {
    instructions.push({
      target: 'docker',
      priority: 'should',
      content: 'Generate Dockerfiles and docker-compose.yml for API (and frontend if present)',
    });
  }
  if (wantsCicd) {
    instructions.push({
      target: 'cicd',
      priority: 'should',
      content: 'Generate CI workflow (GitHub Actions) for API (and frontend if present)',
    });
  }

  return {
    definition: {
      app: {
        name: appName,
        version: '1.0.0',
        description: prompt,
      },
      entities: entities,
      events: [],
      api: {
        version: 'v1',
        prefix: '/api/v1',
        resources: entities.map((e) => ({
          name: e.name.toLowerCase() + 's',
          entity: e.name,
          operations: ['list', 'get', 'create', 'update', 'delete'],
        })),
      },
    },
    generation: {
      instructions,
      patterns: [],
      constraints: [],
      techStack: {
        backend: { framework: backendFramework, language: backendLanguage, runtime: backendRuntime },
        frontend: { framework: frontendFramework, language: 'typescript', styling: frontendStyling },
        database: { type: dbType },
      },
    },
    validation: {
      assertions: [],
      tests: [],
      acceptance: { criteria: [], qualityGates: [] },
    },
  } as unknown as ContractAI;
}

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

/**
 * Extracts entities from prompt using NLP patterns
 */
export function extractEntitiesFromPrompt(
  prompt: string
): Array<{ name: string; fields: any[]; relations: any[] }> {
  const entities: Array<{ name: string; fields: any[]; relations: any[] }> = [];
  const lowerPrompt = prompt.toLowerCase();
  const foundEntities = new Set<string>();

  const hasKeyword = (keyword: string): boolean => {
    if (!keyword) return false;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    return re.test(lowerPrompt);
  };

  // Known domain entities (priority)
  const domainEntities: Record<string, string[]> = {
    contact: ['contact', 'contacts', 'person', 'people'],
    company: ['company', 'companies', 'organization', 'business'],
    deal: ['deal', 'deals', 'opportunity', 'opportunities'],
    task: ['task', 'tasks'],
    todo: ['todo', 'todos'],
    note: ['note', 'notes'],
    category: ['category', 'categories'],
    user: ['user', 'users', 'account', 'accounts'],
    product: ['product', 'products', 'item', 'items'],
    order: ['order', 'orders'],
    customer: ['customer', 'customers', 'client', 'clients'],
    project: ['project', 'projects'],
    invoice: ['invoice', 'invoices', 'bill', 'bills'],
    employee: ['employee', 'employees', 'staff', 'worker'],
    booking: ['booking', 'bookings', 'reservation', 'reservations'],
    event: ['event', 'events'],
    ticket: ['ticket', 'tickets', 'issue', 'issues'],
    post: ['post', 'posts', 'article', 'articles'],
    comment: ['comment', 'comments'],
    tag: ['tag', 'tags', 'label', 'labels'],
    inventory: ['inventory', 'stock'],
    room: ['room', 'rooms'],
    service: ['service', 'services'],
  };

  // Check for domain entities first
  for (const [entity, keywords] of Object.entries(domainEntities)) {
    for (const keyword of keywords) {
      if (hasKeyword(keyword)) {
        foundEntities.add(capitalize(entity));
        break;
      }
    }
  }

  // If no domain entities found, try pattern extraction
  if (foundEntities.size === 0) {
    const entityPatterns = [
      /managing\s+(\w+)/gi,
      /(\w+)\s+with\s+\w+,/gi,
      /(?:create|build)\s+(?:a|an)?\s*(\w+)\s+(?:app|system|api)/gi,
    ];

    for (const pattern of entityPatterns) {
      let match;
      while ((match = pattern.exec(lowerPrompt)) !== null) {
        if (match[1]) {
          const entity = singularize(match[1]);
          if (isValidEntityName(entity)) {
            foundEntities.add(capitalize(entity));
          }
        }
      }
    }
  }

  // Default if no entities found
  if (foundEntities.size === 0) {
    foundEntities.add('Item');
  }

  // Create entity definitions with domain-specific fields
  for (const entityName of foundEntities) {
    entities.push({
      name: entityName,
      fields: getEntityFields(entityName, lowerPrompt),
      relations: getEntityRelations(entityName, foundEntities),
    });
  }

  return entities;
}

// ============================================================================
// FIELD / RELATION HELPERS
// ============================================================================

/**
 * Get domain-specific fields for entity
 */
export function getEntityFields(entityName: string, _prompt: string): any[] {
  const baseFields = [
    { name: 'id', type: 'UUID', annotations: { primary: true } },
    { name: 'createdAt', type: 'DateTime', annotations: {} },
    { name: 'updatedAt', type: 'DateTime', annotations: {} },
  ];

  const domainFields: Record<string, any[]> = {
    Ticket: [
      { name: 'subject', type: 'String', annotations: { required: true } },
      { name: 'description', type: 'String', annotations: {} },
      { name: 'status', type: 'String', annotations: { enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' } },
      { name: 'priority', type: 'String', annotations: { enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' } },
      { name: 'customerEmail', type: 'Email', annotations: {} },
    ],
    Task: [
      { name: 'title', type: 'String', annotations: { required: true } },
      { name: 'description', type: 'String', annotations: {} },
      { name: 'status', type: 'String', annotations: { enum: ['todo', 'in_progress', 'done'], default: 'todo' } },
      { name: 'priority', type: 'String', annotations: { enum: ['low', 'medium', 'high'], default: 'medium' } },
      { name: 'dueDate', type: 'DateTime', annotations: {} },
    ],
    Todo: [
      { name: 'title', type: 'String', annotations: { required: true } },
      { name: 'completed', type: 'Boolean', annotations: { default: false } },
      { name: 'dueDate', type: 'DateTime', annotations: {} },
    ],
    Note: [
      { name: 'title', type: 'String', annotations: { required: true } },
      { name: 'content', type: 'String', annotations: {} },
    ],
    Post: [
      { name: 'title', type: 'String', annotations: { required: true } },
      { name: 'content', type: 'String', annotations: {} },
      { name: 'slug', type: 'String', annotations: { unique: true } },
      { name: 'published', type: 'Boolean', annotations: { default: false } },
    ],
    Product: [
      { name: 'name', type: 'String', annotations: { required: true } },
      { name: 'description', type: 'String', annotations: {} },
      { name: 'price', type: 'Decimal', annotations: { required: true } },
      { name: 'sku', type: 'String', annotations: { unique: true } },
      { name: 'quantity', type: 'Integer', annotations: { default: 0 } },
    ],
    Order: [
      { name: 'orderNumber', type: 'String', annotations: { unique: true } },
      { name: 'status', type: 'String', annotations: { enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], default: 'pending' } },
      { name: 'total', type: 'Decimal', annotations: {} },
    ],
    Invoice: [
      { name: 'invoiceNumber', type: 'String', annotations: { unique: true } },
      { name: 'amount', type: 'Decimal', annotations: { required: true } },
      { name: 'status', type: 'String', annotations: { enum: ['draft', 'sent', 'paid', 'overdue'], default: 'draft' } },
      { name: 'dueDate', type: 'DateTime', annotations: {} },
    ],
    Customer: [
      { name: 'name', type: 'String', annotations: { required: true } },
      { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
      { name: 'phone', type: 'String', annotations: {} },
    ],
    Employee: [
      { name: 'name', type: 'String', annotations: { required: true } },
      { name: 'email', type: 'Email', annotations: { required: true, unique: true } },
      { name: 'department', type: 'String', annotations: {} },
      { name: 'position', type: 'String', annotations: {} },
    ],
    Booking: [
      { name: 'guestName', type: 'String', annotations: { required: true } },
      { name: 'guestEmail', type: 'Email', annotations: {} },
      { name: 'checkIn', type: 'DateTime', annotations: { required: true } },
      { name: 'checkOut', type: 'DateTime', annotations: { required: true } },
      { name: 'status', type: 'String', annotations: { enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' } },
    ],
    Event: [
      { name: 'title', type: 'String', annotations: { required: true } },
      { name: 'description', type: 'String', annotations: {} },
      { name: 'startDate', type: 'DateTime', annotations: { required: true } },
      { name: 'endDate', type: 'DateTime', annotations: {} },
      { name: 'location', type: 'String', annotations: {} },
    ],
    Contact: [
      { name: 'firstName', type: 'String', annotations: { required: true } },
      { name: 'lastName', type: 'String', annotations: { required: true } },
      { name: 'email', type: 'Email', annotations: { unique: true } },
      { name: 'phone', type: 'String', annotations: {} },
      { name: 'company', type: 'String', annotations: {} },
    ],
    Comment: [
      { name: 'content', type: 'String', annotations: { required: true } },
      { name: 'authorName', type: 'String', annotations: {} },
    ],
    Category: [
      { name: 'name', type: 'String', annotations: { required: true, unique: true } },
      { name: 'description', type: 'String', annotations: {} },
    ],
  };

  const specificFields = domainFields[entityName] || [
    { name: 'name', type: 'String', annotations: { required: true } },
    { name: 'description', type: 'String', annotations: {} },
  ];

  return [...baseFields.slice(0, 1), ...specificFields, ...baseFields.slice(1)];
}

/**
 * Get relations between entities
 */
export function getEntityRelations(entityName: string, allEntities: Set<string>): any[] {
  const relations: any[] = [];

  const relationMap: Record<string, string[]> = {
    Ticket: ['Customer', 'Employee'],
    Order: ['Customer', 'Product'],
    Invoice: ['Customer'],
    Task: ['User', 'Project'],
    Comment: ['Post', 'User'],
    Booking: ['Room', 'Customer'],
    Post: ['Category', 'User'],
  };

  const entityRelations = relationMap[entityName] || [];
  for (const relatedEntity of entityRelations) {
    if (allEntities.has(relatedEntity)) {
      relations.push({
        name: relatedEntity.toLowerCase(),
        type: 'belongsTo',
        target: relatedEntity,
      });
    }
  }

  return relations;
}

// ============================================================================
// STRING HELPERS
// ============================================================================

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function singularize(str: string): string {
  if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
  if (str.endsWith('es')) return str.slice(0, -2);
  if (str.endsWith('s') && !str.endsWith('ss')) return str.slice(0, -1);
  return str;
}

export function isValidEntityName(name: string): boolean {
  const invalidNames = [
    'a', 'an', 'the', 'and', 'or', 'with', 'for', 'to',
    'app', 'application', 'system', 'service', 'api', 'create', 'build', 'make',
  ];
  return name.length > 1 && !invalidNames.includes(name.toLowerCase());
}
