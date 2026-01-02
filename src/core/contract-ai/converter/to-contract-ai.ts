/**
 * Converts ContractMarkdown to existing ContractAI format
 * For backward compatibility with current code generation
 * @version 3.0.0
 */

import { ContractMarkdown, MarkdownEntityDefinition } from '../types/contract-markdown';
import { ContractAI } from '../types';

export function convertToContractAI(contract: ContractMarkdown): ContractAI & { app: any; entities: any[] } {
  const contractAI: ContractAI = {
    definition: {
      app: {
        name: contract.frontmatter.contract.name,
        version: contract.frontmatter.contract.version,
        description: contract.frontmatter.contract.description
      },
      entities: contract.entities.map(convertEntity),
      events: [],
      api: {
        baseUrl: contract.api.baseUrl,
        resources: extractResources(contract)
      }
    },
    generation: {
      instructions: extractInstructions(contract),
      techStack: {
        backend: {
          framework: contract.tech.backend.framework,
          language: contract.tech.backend.language as 'typescript' | 'javascript',
          runtime: 'node'
        },
        frontend: contract.tech.frontend ? {
          framework: contract.tech.frontend.framework,
          language: 'typescript',
          styling: contract.tech.frontend.styling
        } : undefined,
        database: {
          type: contract.tech.database.type as 'memory' | 'json' | 'sqlite' | 'postgres',
          name: contract.tech.database.path || 'db'
        }
      },
      patterns: []
    },
    validation: {
      assertions: contract.rules.assertions.map(a => ({
        name: a.name,
        entity: a.entity,
        field: a.field,
        rule: a.rule,
        message: a.message
      })),
      tests: contract.tests.api.map(t => ({
        name: t.name,
        type: 'api' as const,
        endpoint: t.path,
        method: t.method,
        expectedStatus: t.expect.status
      })),
      acceptance: contract.tests.acceptance.flatMap(a => 
        a.scenarios.map(s => s.name)
      )
    }
  };

  // Add flattened properties for compatibility with existing generators
  return {
    ...contractAI,
    app: contractAI.definition.app,
    entities: contractAI.definition.entities
  };
}

function convertEntity(entity: MarkdownEntityDefinition): ContractAI['definition']['entities'][0] {
  return {
    name: entity.name,
    description: entity.description,
    fields: entity.fields.map(f => ({
      name: f.name,
      type: mapFieldType(f.type),
      annotations: {
        required: f.required,
        primary: f.name === 'id',
        auto: f.auto
      }
    })),
    relations: []
  };
}

function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'UUID',
    'string': 'String',
    'text': 'String',
    'number': 'Int',
    'boolean': 'Boolean',
    'datetime': 'DateTime',
    'date': 'Date',
    'enum': 'String',
    'json': 'Json'
  };
  return typeMap[type] || 'String';
}

function extractResources(contract: ContractMarkdown): ContractAI['definition']['api']['resources'] {
  // Group endpoints by resource (first path segment after /api/v1/)
  const resourceMap = new Map<string, any[]>();
  
  for (const endpoint of contract.api.endpoints) {
    // Extract resource name from path like /tasks or /api/v1/tasks
    const pathParts = endpoint.path.replace(/^\/api\/v\d+\//, '/').split('/').filter(Boolean);
    const resource = pathParts[0] || 'items';
    
    if (!resourceMap.has(resource)) {
      resourceMap.set(resource, []);
    }
    
    resourceMap.get(resource)!.push({
      method: endpoint.method,
      path: endpoint.path,
      description: endpoint.description,
      handler: `${endpoint.method.toLowerCase()}${capitalize(resource)}`
    });
  }
  
  return Array.from(resourceMap.entries()).map(([name, endpoints]) => ({
    name: capitalize(name),
    path: `/${name}`,
    endpoints: endpoints.map(e => ({
      method: e.method,
      path: e.path,
      description: e.description
    }))
  }));
}

function extractInstructions(contract: ContractMarkdown): ContractAI['generation']['instructions'] {
  const instructions: ContractAI['generation']['instructions'] = [];
  
  // Add instructions based on contract features
  if (contract.frontmatter.runtime?.cors) {
    instructions.push({
      type: 'middleware',
      target: 'api',
      content: 'Enable CORS for all routes'
    });
  }
  
  if (contract.frontmatter.runtime?.logging) {
    instructions.push({
      type: 'middleware',
      target: 'api',
      content: 'Add request logging with morgan'
    });
  }
  
  // Add entity-specific instructions
  for (const entity of contract.entities) {
    instructions.push({
      type: 'entity',
      target: entity.name,
      content: `Generate CRUD operations for ${entity.name}`
    });
  }
  
  return instructions;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export { ContractMarkdown };
