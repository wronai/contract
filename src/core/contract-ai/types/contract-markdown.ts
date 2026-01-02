/**
 * Contract Markdown Types
 * Defines the structure of .contract.md files
 * @version 3.0.0
 */

// ============================================
// FRONTMATTER TYPES
// ============================================

export interface ContractFrontmatter {
  contract: {
    name: string;
    version: string;
    description: string;
    author?: string;
    created?: string;
    license?: string;
  };
  generation: {
    mode: 'full-stack' | 'backend-only' | 'api-only';
    output: string;
    overwrite?: boolean;
  };
  tech: {
    backend: string;
    frontend?: string;
    database: string;
    testing: string;
  };
  runtime: {
    port: number;
    healthCheck: string;
    cors?: boolean;
    logging?: boolean;
  };
}

// ============================================
// ENTITY TYPES
// ============================================

export type FieldType = 
  | 'uuid' 
  | 'string' 
  | 'text' 
  | 'number' 
  | 'boolean' 
  | 'datetime' 
  | 'date'
  | 'enum'
  | 'json';

export interface EntityField {
  name: string;
  type: FieldType;
  required: boolean;
  auto?: boolean;
  description?: string;
  enumValues?: string[];
  maxLength?: number;
  min?: number;
  max?: number;
  default?: unknown;
  reference?: {
    entity: string;
    field: string;
  };
}

export interface MarkdownEntityDefinition {
  name: string;
  description?: string;
  fields: EntityField[];
  typescript?: string;
  example?: Record<string, unknown>;
}

// ============================================
// API TYPES
// ============================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
  queryParams?: QueryParam[];
}

export interface QueryParam {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface MarkdownApiDefinition {
  baseUrl: string;
  endpoints: ApiEndpoint[];
}

// ============================================
// BUSINESS RULES
// ============================================

export interface ValidationRule {
  name: string;
  entity: string;
  field: string;
  rule: string;
  validator?: string;
  message: string;
}

export interface MarkdownAssertion {
  name: string;
  entity: string;
  field: string;
  rule: string;
  message: string;
}

export interface BusinessRules {
  validations: ValidationRule[];
  assertions: MarkdownAssertion[];
}

// ============================================
// TECH STACK
// ============================================

export interface TechStackConfig {
  backend: {
    framework: string;
    language: string;
    runtime: string;
    features: string[];
    validation: string;
    structure?: string[];
  };
  frontend?: {
    framework: string;
    version?: string;
    bundler: string;
    styling: string;
    state: string;
    features: string[];
    components?: string[];
  };
  database: {
    type: string;
    path?: string;
    connectionString?: string;
    schema?: Record<string, string>;
  };
}

// ============================================
// TESTS
// ============================================

export interface TestCase {
  name: string;
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
  setup?: string;
  expect: {
    status: number;
    body?: Record<string, unknown> | 'array';
  };
}

export interface AcceptanceScenario {
  name: string;
  steps: string[];
}

export interface AcceptanceTest {
  feature: string;
  scenarios: AcceptanceScenario[];
}

// ============================================
// COMPLETE CONTRACT
// ============================================

export interface ContractMarkdown {
  frontmatter: ContractFrontmatter;
  app: {
    domain: string;
    type: string;
    users: string[];
    features: string[];
  };
  entities: MarkdownEntityDefinition[];
  api: MarkdownApiDefinition;
  rules: BusinessRules;
  tech: TechStackConfig;
  tests: {
    acceptance: AcceptanceTest[];
    api: TestCase[];
  };
  raw: string;
}

// ============================================
// VALIDATION RESULT
// ============================================

export interface ContractValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
