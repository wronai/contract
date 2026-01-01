/**
 * SDK TypeScript Generator
 * 
 * Generates TypeScript types, API client, and React hooks from ContractAI.
 * Ensures frontend stays synchronized with contract definitions.
 * 
 * @version 2.2.0
 */

import { ContractAI, EntityDefinition, FieldDefinition } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface SDKGeneratorOptions {
  /** Include React hooks */
  generateHooks?: boolean;
  /** Include API client */
  generateClient?: boolean;
  /** Include Zod schemas */
  generateZodSchemas?: boolean;
  /** Base API URL for client */
  baseUrl?: string;
  /** Output format */
  format?: 'single-file' | 'multi-file';
}

export interface GeneratedSDK {
  /** TypeScript type definitions */
  types: string;
  /** API client code */
  client?: string;
  /** React hooks */
  hooks?: string;
  /** Zod validation schemas */
  zodSchemas?: string;
  /** All files for multi-file output */
  files: Map<string, string>;
}

// ============================================================================
// SDK GENERATOR
// ============================================================================

export class SDKGenerator {
  private options: Required<SDKGeneratorOptions>;

  constructor(options: SDKGeneratorOptions = {}) {
    this.options = {
      generateHooks: options.generateHooks ?? true,
      generateClient: options.generateClient ?? true,
      generateZodSchemas: options.generateZodSchemas ?? true,
      baseUrl: options.baseUrl ?? 'http://localhost:3000',
      format: options.format ?? 'multi-file'
    };
  }

  /**
   * Generate complete SDK from contract
   */
  generate(contract: ContractAI): GeneratedSDK {
    const files = new Map<string, string>();
    
    // Generate types
    const types = this.generateTypes(contract);
    files.set('types.ts', types);

    // Generate Zod schemas
    let zodSchemas: string | undefined;
    if (this.options.generateZodSchemas) {
      zodSchemas = this.generateZodSchemas(contract);
      files.set('schemas.ts', zodSchemas);
    }

    // Generate API client
    let client: string | undefined;
    if (this.options.generateClient) {
      client = this.generateClient(contract);
      files.set('client.ts', client);
    }

    // Generate React hooks
    let hooks: string | undefined;
    if (this.options.generateHooks) {
      hooks = this.generateHooks(contract);
      files.set('hooks.ts', hooks);
    }

    // Generate index file
    const index = this.generateIndex(contract);
    files.set('index.ts', index);

    return {
      types,
      client,
      hooks,
      zodSchemas,
      files
    };
  }

  /**
   * Generate TypeScript type definitions
   */
  private generateTypes(contract: ContractAI): string {
    const lines: string[] = [
      '/**',
      ` * ${contract.definition.app.name} - TypeScript Types`,
      ` * Generated from Contract AI v${contract.definition.app.version}`,
      ' * ',
      ' * DO NOT EDIT - This file is auto-generated from the contract.',
      ' */',
      '',
    ];

    // Generate entity types
    for (const entity of contract.definition.entities) {
      lines.push(...this.generateEntityType(entity));
      lines.push('');
    }

    // Generate input types for create/update
    for (const entity of contract.definition.entities) {
      lines.push(...this.generateInputTypes(entity));
      lines.push('');
    }

    // Generate API response types
    lines.push(...this.generateApiResponseTypes(contract));

    return lines.join('\n');
  }

  /**
   * Generate type for a single entity
   */
  private generateEntityType(entity: EntityDefinition): string[] {
    const lines: string[] = [];
    
    if (entity.description) {
      lines.push(`/** ${entity.description} */`);
    }
    
    lines.push(`export interface ${entity.name} {`);
    
    for (const field of entity.fields) {
      const tsType = this.fieldTypeToTS(field);
      const optional = field.annotations?.required === false ? '?' : '';
      const comment = field.annotations ? this.formatFieldComment(field) : '';
      
      if (comment) {
        lines.push(`  /** ${comment} */`);
      }
      lines.push(`  ${field.name}${optional}: ${tsType};`);
    }
    
    lines.push('}');
    return lines;
  }

  /**
   * Generate Create/Update input types
   */
  private generateInputTypes(entity: EntityDefinition): string[] {
    const lines: string[] = [];
    
    // Create input (exclude generated fields)
    const createFields = entity.fields.filter(f => !f.annotations?.generated);
    
    lines.push(`/** Input for creating ${entity.name} */`);
    lines.push(`export interface Create${entity.name}Input {`);
    
    for (const field of createFields) {
      const tsType = this.fieldTypeToTS(field);
      const optional = field.annotations?.required === false ? '?' : '';
      lines.push(`  ${field.name}${optional}: ${tsType};`);
    }
    
    lines.push('}');
    lines.push('');
    
    // Update input (all fields optional except id)
    lines.push(`/** Input for updating ${entity.name} */`);
    lines.push(`export interface Update${entity.name}Input {`);
    lines.push('  id: string;');
    
    for (const field of createFields) {
      if (field.name !== 'id') {
        const tsType = this.fieldTypeToTS(field);
        lines.push(`  ${field.name}?: ${tsType};`);
      }
    }
    
    lines.push('}');
    
    return lines;
  }

  /**
   * Generate API response wrapper types
   */
  private generateApiResponseTypes(contract: ContractAI): string[] {
    const lines: string[] = [
      '// API Response Types',
      '',
      'export interface ApiResponse<T> {',
      '  data: T;',
      '  success: boolean;',
      '  error?: string;',
      '}',
      '',
      'export interface PaginatedResponse<T> {',
      '  data: T[];',
      '  total: number;',
      '  page: number;',
      '  pageSize: number;',
      '  hasMore: boolean;',
      '}',
      '',
    ];

    // Generate list response types for each entity
    for (const entity of contract.definition.entities) {
      lines.push(`export type ${entity.name}ListResponse = PaginatedResponse<${entity.name}>;`);
    }

    return lines;
  }

  /**
   * Generate Zod validation schemas
   */
  private generateZodSchemas(contract: ContractAI): string {
    const lines: string[] = [
      '/**',
      ` * ${contract.definition.app.name} - Zod Schemas`,
      ' * Generated from Contract AI',
      ' */',
      '',
      "import { z } from 'zod';",
      '',
    ];

    for (const entity of contract.definition.entities) {
      lines.push(...this.generateEntitySchema(entity));
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate Zod schema for entity
   */
  private generateEntitySchema(entity: EntityDefinition): string[] {
    const lines: string[] = [];
    const schemaName = `${entity.name.charAt(0).toLowerCase()}${entity.name.slice(1)}Schema`;
    
    lines.push(`export const ${schemaName} = z.object({`);
    
    for (const field of entity.fields) {
      const zodType = this.fieldTypeToZod(field);
      lines.push(`  ${field.name}: ${zodType},`);
    }
    
    lines.push('});');
    lines.push('');
    lines.push(`export type ${entity.name}Validated = z.infer<typeof ${schemaName}>;`);
    
    // Create input schema
    const createFields = entity.fields.filter(f => !f.annotations?.generated);
    const createSchemaName = `create${entity.name}Schema`;
    
    lines.push('');
    lines.push(`export const ${createSchemaName} = z.object({`);
    
    for (const field of createFields) {
      const zodType = this.fieldTypeToZod(field);
      lines.push(`  ${field.name}: ${zodType},`);
    }
    
    lines.push('});');
    
    return lines;
  }

  /**
   * Generate API client
   */
  private generateClient(contract: ContractAI): string {
    const lines: string[] = [
      '/**',
      ` * ${contract.definition.app.name} - API Client`,
      ' * Generated from Contract AI',
      ' */',
      '',
      "import type {",
    ];

    // Import types
    for (const entity of contract.definition.entities) {
      lines.push(`  ${entity.name},`);
      lines.push(`  Create${entity.name}Input,`);
      lines.push(`  Update${entity.name}Input,`);
    }
    lines.push("  ApiResponse,");
    lines.push("  PaginatedResponse,");
    lines.push("} from './types';");
    lines.push('');

    // Client class
    lines.push('export class ApiClient {');
    lines.push('  private baseUrl: string;');
    lines.push('');
    lines.push(`  constructor(baseUrl: string = '${this.options.baseUrl}') {`);
    lines.push('    this.baseUrl = baseUrl;');
    lines.push('  }');
    lines.push('');

    // Generic fetch method
    lines.push('  private async fetch<T>(');
    lines.push('    endpoint: string,');
    lines.push("    options: RequestInit = {}");
    lines.push('  ): Promise<ApiResponse<T>> {');
    lines.push('    try {');
    lines.push('      const response = await fetch(`${this.baseUrl}${endpoint}`, {');
    lines.push("        headers: { 'Content-Type': 'application/json', ...options.headers },");
    lines.push('        ...options,');
    lines.push('      });');
    lines.push('      const data = await response.json();');
    lines.push('      return { data, success: response.ok };');
    lines.push('    } catch (error) {');
    lines.push('      return { data: null as T, success: false, error: String(error) };');
    lines.push('    }');
    lines.push('  }');
    lines.push('');

    // Generate CRUD methods for each entity
    for (const entity of contract.definition.entities) {
      lines.push(...this.generateEntityClientMethods(entity));
    }

    lines.push('}');
    lines.push('');
    lines.push('export const apiClient = new ApiClient();');

    return lines.join('\n');
  }

  /**
   * Generate CRUD methods for entity
   */
  private generateEntityClientMethods(entity: EntityDefinition): string[] {
    const lines: string[] = [];
    const name = entity.name;
    const plural = this.pluralize(name.toLowerCase());
    
    lines.push(`  // ${name} CRUD`);
    lines.push('');
    
    // List
    lines.push(`  async list${name}s(page = 1, pageSize = 20): Promise<PaginatedResponse<${name}>> {`);
    lines.push(`    const response = await this.fetch<PaginatedResponse<${name}>>(`);
    lines.push(`      \`/api/${plural}?page=\${page}&pageSize=\${pageSize}\``);
    lines.push('    );');
    lines.push('    return response.data;');
    lines.push('  }');
    lines.push('');
    
    // Get by ID
    lines.push(`  async get${name}(id: string): Promise<${name} | null> {`);
    lines.push(`    const response = await this.fetch<${name}>(\`/api/${plural}/\${id}\`);`);
    lines.push('    return response.success ? response.data : null;');
    lines.push('  }');
    lines.push('');
    
    // Create
    lines.push(`  async create${name}(input: Create${name}Input): Promise<${name} | null> {`);
    lines.push(`    const response = await this.fetch<${name}>(\`/api/${plural}\`, {`);
    lines.push("      method: 'POST',");
    lines.push('      body: JSON.stringify(input),');
    lines.push('    });');
    lines.push('    return response.success ? response.data : null;');
    lines.push('  }');
    lines.push('');
    
    // Update
    lines.push(`  async update${name}(input: Update${name}Input): Promise<${name} | null> {`);
    lines.push(`    const response = await this.fetch<${name}>(\`/api/${plural}/\${input.id}\`, {`);
    lines.push("      method: 'PUT',");
    lines.push('      body: JSON.stringify(input),');
    lines.push('    });');
    lines.push('    return response.success ? response.data : null;');
    lines.push('  }');
    lines.push('');
    
    // Delete
    lines.push(`  async delete${name}(id: string): Promise<boolean> {`);
    lines.push(`    const response = await this.fetch<void>(\`/api/${plural}/\${id}\`, {`);
    lines.push("      method: 'DELETE',");
    lines.push('    });');
    lines.push('    return response.success;');
    lines.push('  }');
    lines.push('');
    
    return lines;
  }

  /**
   * Generate React hooks
   */
  private generateHooks(contract: ContractAI): string {
    const lines: string[] = [
      '/**',
      ` * ${contract.definition.app.name} - React Hooks`,
      ' * Generated from Contract AI',
      ' */',
      '',
      "import { useState, useEffect, useCallback } from 'react';",
      "import { apiClient } from './client';",
      "import type {",
    ];

    for (const entity of contract.definition.entities) {
      lines.push(`  ${entity.name},`);
      lines.push(`  Create${entity.name}Input,`);
      lines.push(`  Update${entity.name}Input,`);
    }
    lines.push("} from './types';");
    lines.push('');

    // Generate hooks for each entity
    for (const entity of contract.definition.entities) {
      lines.push(...this.generateEntityHooks(entity));
    }

    return lines.join('\n');
  }

  /**
   * Generate React hooks for entity
   */
  private generateEntityHooks(entity: EntityDefinition): string[] {
    const lines: string[] = [];
    const name = entity.name;
    
    // useList hook
    lines.push(`// ${name} Hooks`);
    lines.push('');
    lines.push(`export function use${name}List(initialPage = 1) {`);
    lines.push(`  const [items, setItems] = useState<${name}[]>([]);`);
    lines.push('  const [loading, setLoading] = useState(true);');
    lines.push('  const [error, setError] = useState<string | null>(null);');
    lines.push('  const [page, setPage] = useState(initialPage);');
    lines.push('  const [total, setTotal] = useState(0);');
    lines.push('');
    lines.push('  const fetchItems = useCallback(async () => {');
    lines.push('    setLoading(true);');
    lines.push('    try {');
    lines.push(`      const response = await apiClient.list${name}s(page);`);
    lines.push('      setItems(response.data);');
    lines.push('      setTotal(response.total);');
    lines.push('    } catch (e) {');
    lines.push('      setError(String(e));');
    lines.push('    } finally {');
    lines.push('      setLoading(false);');
    lines.push('    }');
    lines.push('  }, [page]);');
    lines.push('');
    lines.push('  useEffect(() => { fetchItems(); }, [fetchItems]);');
    lines.push('');
    lines.push('  return { items, loading, error, page, setPage, total, refetch: fetchItems };');
    lines.push('}');
    lines.push('');

    // useSingle hook
    lines.push(`export function use${name}(id: string | null) {`);
    lines.push(`  const [item, setItem] = useState<${name} | null>(null);`);
    lines.push('  const [loading, setLoading] = useState(!!id);');
    lines.push('  const [error, setError] = useState<string | null>(null);');
    lines.push('');
    lines.push('  useEffect(() => {');
    lines.push('    if (!id) return;');
    lines.push('    setLoading(true);');
    lines.push(`    apiClient.get${name}(id)`);
    lines.push('      .then(setItem)');
    lines.push('      .catch(e => setError(String(e)))');
    lines.push('      .finally(() => setLoading(false));');
    lines.push('  }, [id]);');
    lines.push('');
    lines.push('  return { item, loading, error };');
    lines.push('}');
    lines.push('');

    // useMutations hook
    lines.push(`export function use${name}Mutations() {`);
    lines.push('  const [loading, setLoading] = useState(false);');
    lines.push('  const [error, setError] = useState<string | null>(null);');
    lines.push('');
    lines.push(`  const create = async (input: Create${name}Input) => {`);
    lines.push('    setLoading(true);');
    lines.push('    try {');
    lines.push(`      return await apiClient.create${name}(input);`);
    lines.push('    } catch (e) {');
    lines.push('      setError(String(e));');
    lines.push('      return null;');
    lines.push('    } finally {');
    lines.push('      setLoading(false);');
    lines.push('    }');
    lines.push('  };');
    lines.push('');
    lines.push(`  const update = async (input: Update${name}Input) => {`);
    lines.push('    setLoading(true);');
    lines.push('    try {');
    lines.push(`      return await apiClient.update${name}(input);`);
    lines.push('    } catch (e) {');
    lines.push('      setError(String(e));');
    lines.push('      return null;');
    lines.push('    } finally {');
    lines.push('      setLoading(false);');
    lines.push('    }');
    lines.push('  };');
    lines.push('');
    lines.push('  const remove = async (id: string) => {');
    lines.push('    setLoading(true);');
    lines.push('    try {');
    lines.push(`      return await apiClient.delete${name}(id);`);
    lines.push('    } catch (e) {');
    lines.push('      setError(String(e));');
    lines.push('      return false;');
    lines.push('    } finally {');
    lines.push('      setLoading(false);');
    lines.push('    }');
    lines.push('  };');
    lines.push('');
    lines.push('  return { create, update, remove, loading, error };');
    lines.push('}');
    lines.push('');

    return lines;
  }

  /**
   * Generate index file
   */
  private generateIndex(contract: ContractAI): string {
    const lines: string[] = [
      '/**',
      ` * ${contract.definition.app.name} SDK`,
      ' * Generated from Contract AI',
      ' */',
      '',
      "export * from './types';",
    ];

    if (this.options.generateZodSchemas) {
      lines.push("export * from './schemas';");
    }

    if (this.options.generateClient) {
      lines.push("export * from './client';");
    }

    if (this.options.generateHooks) {
      lines.push("export * from './hooks';");
    }

    return lines.join('\n');
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Convert field type to TypeScript type
   */
  private fieldTypeToTS(field: FieldDefinition): string {
    const typeMap: Record<string, string> = {
      'UUID': 'string',
      'String': 'string',
      'Text': 'string',
      'Email': 'string',
      'URL': 'string',
      'Phone': 'string',
      'Int': 'number',
      'Integer': 'number',
      'Float': 'number',
      'Decimal': 'number',
      'Number': 'number',
      'Boolean': 'boolean',
      'Date': 'string',
      'DateTime': 'string',
      'Timestamp': 'string',
      'JSON': 'Record<string, unknown>',
      'Array': 'unknown[]',
    };

    return typeMap[field.type] || 'unknown';
  }

  /**
   * Convert field type to Zod schema
   */
  private fieldTypeToZod(field: FieldDefinition): string {
    const base = this.getZodBase(field.type);
    let schema = base;

    // Add constraints
    if (field.annotations?.required === false) {
      schema += '.optional()';
    }

    if (field.annotations?.unique) {
      schema = `${schema} /* unique */`;
    }

    return schema;
  }

  /**
   * Get base Zod type
   */
  private getZodBase(type: string): string {
    const typeMap: Record<string, string> = {
      'UUID': 'z.string().uuid()',
      'String': 'z.string()',
      'Text': 'z.string()',
      'Email': 'z.string().email()',
      'URL': 'z.string().url()',
      'Phone': 'z.string()',
      'Int': 'z.number().int()',
      'Integer': 'z.number().int()',
      'Float': 'z.number()',
      'Decimal': 'z.number()',
      'Number': 'z.number()',
      'Boolean': 'z.boolean()',
      'Date': 'z.string().datetime()',
      'DateTime': 'z.string().datetime()',
      'Timestamp': 'z.string().datetime()',
      'JSON': 'z.record(z.unknown())',
      'Array': 'z.array(z.unknown())',
    };

    return typeMap[type] || 'z.unknown()';
  }

  /**
   * Format field comment from annotations
   */
  private formatFieldComment(field: FieldDefinition): string {
    const parts: string[] = [];
    
    if (field.annotations?.generated) parts.push('auto-generated');
    if (field.annotations?.unique) parts.push('unique');
    if (field.annotations?.required) parts.push('required');
    
    return parts.join(', ');
  }

  /**
   * Simple pluralization
   */
  private pluralize(word: string): string {
    if (word.endsWith('y')) {
      return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch')) {
      return word + 'es';
    }
    return word + 's';
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createSDKGenerator(options?: SDKGeneratorOptions): SDKGenerator {
  return new SDKGenerator(options);
}
