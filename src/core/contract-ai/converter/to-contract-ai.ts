/**
 * Converts ContractMarkdown to existing ContractAI format
 * For backward compatibility with current code generation
 * @version 3.0.0
 */

import { ContractMarkdown, MarkdownEntityDefinition } from '../types/contract-markdown';
import { ContractAI } from '../types';

export function convertToContractAI(contract: ContractMarkdown): ContractAI & { app: any; entities: any[] } {
  const contractAI = {
    definition: {
      app: {
        name: contract.frontmatter.contract.name,
        version: contract.frontmatter.contract.version,
        description: contract.frontmatter.contract.description
      },
      entities: contract.entities.map(convertEntity),
      events: [],
      api: {
        version: 'v1',
        prefix: contract.api.baseUrl || '/api/v1',
        resources: extractResources(contract)
      }
    },
    generation: {
      instructions: extractInstructions(contract),
      techStack: {
        backend: {
          framework: contract.tech.backend.framework as 'express' | 'fastify' | 'koa' | 'hono' | 'none',
          language: contract.tech.backend.language as 'typescript' | 'javascript',
          runtime: 'node' as const
        },
        frontend: contract.tech.frontend ? {
          framework: contract.tech.frontend.framework as 'react' | 'vue' | 'svelte' | 'none',
          bundler: contract.tech.frontend.bundler as 'vite' | 'webpack' | 'esbuild',
          styling: contract.tech.frontend.styling as 'tailwind' | 'css' | 'scss' | 'styled-components'
        } : undefined,
        database: {
          type: mapDatabaseType(contract.tech.database.type),
          name: contract.tech.database.path || 'db'
        }
      },
      patterns: [],
      constraints: []
    },
    validation: {
      assertions: contract.rules.assertions.map(a => ({
        id: `assert-${a.name}`,
        description: a.message,
        check: a.rule,
        errorMessage: a.message,
        severity: 'error' as const,
        entity: a.entity,
        field: a.field
      })),
      tests: contract.tests.api.map(t => ({
        target: 'api' as const,
        scenarios: [{
          name: t.name,
          steps: [`${t.method} ${t.path} -> ${t.expect.status}`]
        }]
      })),
      acceptance: {
        testsPass: true,
        minCoverage: 80,
        maxLintErrors: 0,
        maxResponseTime: 1000,
        criteria: contract.tests.acceptance.flatMap(a => 
          a.scenarios.map(s => s.name)
        ),
        qualityGates: []
      }
    }
  } as unknown as ContractAI;

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

function mapDatabaseType(type: string): 'sqlite' | 'postgresql' | 'mysql' | 'mongodb' | 'in-memory' {
  const typeMap: Record<string, 'sqlite' | 'postgresql' | 'mysql' | 'mongodb' | 'in-memory'> = {
    'sqlite': 'sqlite',
    'postgres': 'postgresql',
    'postgresql': 'postgresql',
    'mysql': 'mysql',
    'mongodb': 'mongodb',
    'memory': 'in-memory',
    'json': 'in-memory'
  };
  return typeMap[type] || 'in-memory';
}

function extractResources(contract: ContractMarkdown): any[] {
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

function extractInstructions(contract: ContractMarkdown): any[] {
  const instructions: any[] = [];
  
  // Add instructions based on contract features
  if (contract.frontmatter.runtime?.cors) {
    instructions.push({
      target: 'api' as const,
      priority: 'should' as const,
      description: 'Enable CORS for all routes'
    });
  }
  
  if (contract.frontmatter.runtime?.logging) {
    instructions.push({
      target: 'api' as const,
      priority: 'should' as const,
      description: 'Add request logging with morgan'
    });
  }
  
  // Add entity-specific instructions
  for (const entity of contract.entities) {
    instructions.push({
      target: 'api' as const,
      priority: 'must' as const,
      description: `Generate CRUD operations for ${entity.name}`
    });
  }
  
  return instructions;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export { ContractMarkdown };
