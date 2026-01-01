/**
 * Pydantic Schema Validator
 * 
 * Validates LLM outputs against JSON Schemas generated from Pydantic contracts.
 * Ensures type safety between Python contracts and TypeScript code.
 * 
 * @version 2.3.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: ValidationError[];
  schemaName: string;
}

export interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $ref?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | JSONSchema;
}

// ============================================================================
// PYDANTIC VALIDATOR
// ============================================================================

export class PydanticValidator {
  private schemas: Map<string, JSONSchema> = new Map();
  private schemasDir: string;

  constructor(schemasDir?: string) {
    this.schemasDir = schemasDir || path.join(process.cwd(), 'contracts/json');
  }

  private normalizeSchemaName(name: string): string {
    return name
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\//, '')
      .replace(/\.json$/i, '')
      .toLowerCase();
  }

  /**
   * Load all schemas from directory
   */
  async loadSchemas(): Promise<void> {
    if (!fs.existsSync(this.schemasDir)) {
      console.warn(`Schemas directory not found: ${this.schemasDir}`);
      return;
    }

    await this.loadSchemasFromDir(this.schemasDir);
  }

  /**
   * Recursively load schemas from directory
   */
  private async loadSchemasFromDir(dir: string): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.loadSchemasFromDir(fullPath);
      } else if (entry.name.endsWith('.json')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const schema = JSON.parse(content) as JSONSchema;
          const rel = path.relative(this.schemasDir, fullPath).replace(/\\/g, '/');
          const schemaName = this.normalizeSchemaName(rel);
          this.schemas.set(schemaName, schema);
        } catch (e) {
          console.warn(`Failed to load schema: ${fullPath}`);
        }
      }
    }
  }

  /**
   * Get loaded schema by name
   */
  getSchema(name: string): JSONSchema | undefined {
    return this.schemas.get(this.normalizeSchemaName(name));
  }

  private resolveJsonPointer(root: any, pointer: string): JSONSchema | undefined {
    const p = pointer.startsWith('#') ? pointer.slice(1) : pointer;
    const parts = p.split('/').filter(Boolean);
    let cur: any = root;
    for (const part of parts) {
      const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
      if (cur && typeof cur === 'object' && key in cur) {
        cur = cur[key];
      } else {
        return undefined;
      }
    }
    return cur as JSONSchema;
  }

  private resolveRef(ref: string, rootSchema: JSONSchema): JSONSchema | undefined {
    // Local ref inside the same schema
    if (ref.startsWith('#')) {
      return this.resolveJsonPointer(rootSchema as any, ref);
    }

    // External ref like "entities/contact.json#/$defs/X"
    const [filePart, pointer = ''] = ref.split('#');
    const schemaName = this.normalizeSchemaName(filePart);
    const external = this.schemas.get(schemaName);
    if (!external) return undefined;

    if (!pointer) return external;
    return this.resolveJsonPointer(external as any, `#${pointer}`);
  }

  /**
   * Validate data against a schema
   */
  validate(schemaName: string, data: unknown): SchemaValidationResult {
    const schema = this.getSchema(schemaName);

    if (!schema) {
      return {
        valid: false,
        errors: [{ path: '', message: `Schema not found: ${schemaName}` }],
        schemaName
      };
    }

    const errors = this.validateValue(data, schema, '', schema);

    return {
      valid: errors.length === 0,
      errors,
      schemaName
    };
  }

  /**
   * Validate a value against a schema
   */
  private validateValue(
    value: unknown,
    schema: JSONSchema,
    path: string,
    rootSchema: JSONSchema
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Handle $ref
    if (schema.$ref) {
      const refSchema = this.resolveRef(schema.$ref, rootSchema);
      if (refSchema) {
        return this.validateValue(value, refSchema, path, rootSchema);
      }
    }

    // Handle anyOf/oneOf
    if (schema.anyOf || schema.oneOf) {
      const options = schema.anyOf || schema.oneOf || [];
      const anyValid = options.some(opt => 
        this.validateValue(value, opt, path, rootSchema).length === 0
      );
      if (!anyValid && options.length > 0) {
        errors.push({
          path,
          message: `Value does not match any of the allowed types`,
          value
        });
      }
      return errors;
    }

    // Handle allOf
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        errors.push(...this.validateValue(value, subSchema, path, rootSchema));
      }
      return errors;
    }

    // Type validation
    if (schema.type) {
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      const actualType = this.getType(value);

      const allowsNull = types.includes('null' as any);
      const isNullish = value === null || value === undefined;

      const typeMatches =
        types.includes(actualType) ||
        (types.includes('integer' as any) && actualType === 'number') ||
        (allowsNull && isNullish);

      if (!typeMatches && !isNullish) {
        errors.push({
          path,
          message: `Expected ${types.join(' | ')}, got ${actualType}`,
          value
        });
        return errors;
      }

      if (types.includes('integer' as any) && actualType === 'number' && typeof value === 'number') {
        if (!Number.isInteger(value)) {
          errors.push({ path, message: 'Expected integer', value });
          return errors;
        }
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        value
      });
    }

    // Const validation
    if (schema.const !== undefined && value !== schema.const) {
      errors.push({
        path,
        message: `Value must be ${JSON.stringify(schema.const)}`,
        value
      });
    }

    // String validations
    if (typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          path,
          message: `String must be at least ${schema.minLength} characters`,
          value
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          path,
          message: `String must be at most ${schema.maxLength} characters`,
          value
        });
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({
            path,
            message: `String must match pattern: ${schema.pattern}`,
            value
          });
        }
      }
      if (schema.format) {
        const formatError = this.validateFormat(value, schema.format, path);
        if (formatError) errors.push(formatError);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          path,
          message: `Number must be >= ${schema.minimum}`,
          value
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          path,
          message: `Number must be <= ${schema.maximum}`,
          value
        });
      }
    }

    // Object validations
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;

      // Required properties
      if (schema.required) {
        for (const req of schema.required) {
          if (!(req in obj)) {
            errors.push({
              path: path ? `${path}.${req}` : req,
              message: `Missing required property: ${req}`
            });
          }
        }
      }

      // Validate properties
      if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
          if (propName in obj) {
            const propPath = path ? `${path}.${propName}` : propName;
            errors.push(...this.validateValue(obj[propName], propSchema, propPath, rootSchema));
          }
        }
      }

      // Additional properties
      if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(obj)) {
          if (!allowed.has(key)) {
            errors.push({
              path: path ? `${path}.${key}` : key,
              message: `Additional property not allowed: ${key}`
            });
          }
        }
      }
    }

    // Array validations
    if (Array.isArray(value) && schema.items) {
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        errors.push(...this.validateValue(item, schema.items!, itemPath, rootSchema));
      });
    }

    return errors;
  }

  /**
   * Get JSON type of a value
   */
  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Validate string format
   */
  private validateFormat(
    value: string,
    format: string,
    path: string
  ): ValidationError | null {
    switch (format) {
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { path, message: 'Invalid email format', value };
        }
        break;
      case 'uri':
      case 'url':
        try {
          new URL(value);
        } catch {
          return { path, message: 'Invalid URL format', value };
        }
        break;
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return { path, message: 'Invalid date format (expected YYYY-MM-DD)', value };
        }
        break;
      case 'date-time':
        if (isNaN(Date.parse(value))) {
          return { path, message: 'Invalid date-time format', value };
        }
        break;
      case 'uuid':
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
          return { path, message: 'Invalid UUID format', value };
        }
        break;
    }
    return null;
  }

  /**
   * Get list of loaded schema names
   */
  getLoadedSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export async function createPydanticValidator(
  schemasDir?: string
): Promise<PydanticValidator> {
  const validator = new PydanticValidator(schemasDir);
  await validator.loadSchemas();
  return validator;
}
