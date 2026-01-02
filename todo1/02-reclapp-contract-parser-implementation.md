# Reclapp Contract Parser Implementation Guide

**Project:** Reclapp  
**Status:** 🟢 Active Development  
**Version:** 2.3.2  
**Date:** January 2, 2026  

---

## Overview

This guide provides step-by-step instructions for implementing the new Contract Markdown (`.contract.md`) parser in Reclapp.

## Implementation Files

### 1. Contract Types (`src/core/contract-ai/types/contract-markdown.ts`)

```typescript
/**
 * Contract Markdown Types
 * Defines the structure of .contract.md files
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
  };
  generation: {
    mode: 'full-stack' | 'backend-only' | 'api-only';
    output: string;
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
  enumValues?: string[];      // For enum types
  maxLength?: number;         // For string/text
  min?: number;               // For number
  max?: number;               // For number
  default?: unknown;          // Default value
  reference?: {               // For foreign keys
    entity: string;
    field: string;
  };
}

export interface EntityDefinition {
  name: string;
  description?: string;
  fields: EntityField[];
  typescript?: string;        // Raw TypeScript interface
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
  requestBody?: string;       // TypeScript interface name
  responseBody?: string;      // TypeScript interface or 'array'
  queryParams?: QueryParam[];
}

export interface QueryParam {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface ApiDefinition {
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
  rule: string;               // 'required' | 'length(min,max)' | 'custom'
  validator?: string;         // Custom validator function name
  message: string;
}

export interface BusinessRules {
  validations: ValidationRule[];
  assertions: Assertion[];
}

export interface Assertion {
  name: string;
  description: string;
  condition: string;
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
  };
  frontend?: {
    framework: string;
    bundler: string;
    styling: string;
    state: string;
    features: string[];
  };
  database: {
    type: string;
    path?: string;
    connectionString?: string;
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
  expect: {
    status: number;
    body?: Record<string, unknown> | 'array';
  };
}

export interface AcceptanceTest {
  feature: string;
  scenarios: {
    name: string;
    steps: string[];
  }[];
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
  entities: EntityDefinition[];
  api: ApiDefinition;
  rules: BusinessRules;
  tech: TechStackConfig;
  tests: {
    acceptance: AcceptanceTest[];
    api: TestCase[];
  };
  raw: string;                // Original markdown content
}
```

### 2. Markdown Parser (`src/core/contract-ai/parser/markdown-parser.ts`)

```typescript
/**
 * Contract Markdown Parser
 * Parses .contract.md files into ContractMarkdown structure
 */

import * as yaml from 'js-yaml';
import { 
  ContractMarkdown, 
  ContractFrontmatter,
  EntityDefinition,
  EntityField,
  ApiEndpoint,
  TestCase
} from '../types/contract-markdown';

// ============================================
// MAIN PARSER
// ============================================

export function parseContractMarkdown(content: string): ContractMarkdown {
  const { frontmatter, body } = extractFrontmatter(content);
  
  return {
    frontmatter,
    app: parseAppSection(body),
    entities: parseEntitiesSection(body),
    api: parseApiSection(body),
    rules: parseRulesSection(body),
    tech: parseTechSection(body, frontmatter),
    tests: parseTestsSection(body),
    raw: content
  };
}

// ============================================
// FRONTMATTER EXTRACTION
// ============================================

function extractFrontmatter(content: string): { 
  frontmatter: ContractFrontmatter; 
  body: string 
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Contract must have YAML frontmatter');
  }
  
  const frontmatter = yaml.load(match[1]) as ContractFrontmatter;
  const body = content.slice(match[0].length).trim();
  
  return { frontmatter, body };
}

// ============================================
// SECTION PARSERS
// ============================================

function parseAppSection(body: string): ContractMarkdown['app'] {
  const section = extractSection(body, '## App Definition');
  
  // Parse domain, type, users from the section
  const domain = extractField(section, 'Domain');
  const type = extractField(section, 'Type');
  const users = extractList(section, 'Users');
  const features = extractCheckboxList(section, 'Features');
  
  return { domain, type, users, features };
}

function parseEntitiesSection(body: string): EntityDefinition[] {
  const section = extractSection(body, '## Entities');
  const entities: EntityDefinition[] = [];
  
  // Find all ### Entity subsections
  const entityRegex = /### (\w+)\n([\s\S]*?)(?=###|$)/g;
  let match;
  
  while ((match = entityRegex.exec(section)) !== null) {
    const [, name, content] = match;
    entities.push(parseEntityContent(name, content));
  }
  
  return entities;
}

function parseEntityContent(name: string, content: string): EntityDefinition {
  // Extract description (first paragraph)
  const descMatch = content.match(/^([^\n|]+)\n/);
  const description = descMatch ? descMatch[1].trim() : undefined;
  
  // Parse markdown table
  const fields = parseMarkdownTable(content);
  
  // Extract TypeScript definition
  const tsMatch = content.match(/```typescript\n([\s\S]*?)\n```/);
  const typescript = tsMatch ? tsMatch[1] : undefined;
  
  // Extract example JSON
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  const example = jsonMatch ? JSON.parse(jsonMatch[1]) : undefined;
  
  return { name, description, fields, typescript, example };
}

function parseMarkdownTable(content: string): EntityField[] {
  const tableRegex = /\|([^\n]+)\|\n\|[-| ]+\|\n((?:\|[^\n]+\|\n?)+)/;
  const match = content.match(tableRegex);
  
  if (!match) return [];
  
  const headers = match[1].split('|').map(h => h.trim().toLowerCase());
  const rows = match[2].trim().split('\n');
  
  return rows.map(row => {
    const cells = row.split('|').filter(c => c.trim()).map(c => c.trim());
    
    return {
      name: cells[headers.indexOf('field')]?.replace(/`/g, '') || '',
      type: parseFieldType(cells[headers.indexOf('type')] || 'string'),
      required: cells[headers.indexOf('required')]?.toLowerCase() === 'yes',
      auto: cells[headers.indexOf('required')]?.toLowerCase() === 'auto',
      description: cells[headers.indexOf('description')] || undefined
    };
  });
}

function parseFieldType(typeStr: string): EntityField['type'] {
  const normalized = typeStr.toLowerCase().trim();
  
  const typeMap: Record<string, EntityField['type']> = {
    'uuid': 'uuid',
    'string': 'string',
    'text': 'text',
    'number': 'number',
    'integer': 'number',
    'boolean': 'boolean',
    'bool': 'boolean',
    'datetime': 'datetime',
    'date': 'date',
    'enum': 'enum',
    'json': 'json',
    'object': 'json'
  };
  
  return typeMap[normalized] || 'string';
}

function parseApiSection(body: string): ContractMarkdown['api'] {
  const section = extractSection(body, '## API');
  
  // Extract base URL
  const baseUrlMatch = section.match(/```\n(http[^\n]+)\n```/);
  const baseUrl = baseUrlMatch ? baseUrlMatch[1] : 'http://localhost:3000/api/v1';
  
  // Parse endpoint tables
  const endpoints = parseEndpointTables(section);
  
  return { baseUrl, endpoints };
}

function parseEndpointTables(section: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  const tableRegex = /\|\s*Method\s*\|[^\n]+\n\|[-| ]+\n((?:\|[^\n]+\n?)+)/gi;
  
  let match;
  while ((match = tableRegex.exec(section)) !== null) {
    const rows = match[1].trim().split('\n');
    
    for (const row of rows) {
      const cells = row.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.length >= 3) {
        endpoints.push({
          method: cells[0] as ApiEndpoint['method'],
          path: cells[1].replace(/`/g, ''),
          description: cells[2],
          requestBody: cells[3] || undefined,
          responseBody: cells[4] || undefined
        });
      }
    }
  }
  
  return endpoints;
}

function parseRulesSection(body: string): ContractMarkdown['rules'] {
  const section = extractSection(body, '## Business Rules');
  
  // Parse assertions from YAML block
  const yamlMatch = section.match(/```yaml\n([\s\S]*?)\n```/);
  const assertions = yamlMatch 
    ? (yaml.load(yamlMatch[1]) as any).assertions || []
    : [];
  
  // Parse validation rules from numbered list
  const validations = parseValidationRules(section);
  
  return { validations, assertions };
}

function parseValidationRules(section: string): ContractMarkdown['rules']['validations'] {
  // This is a simplified parser - enhance as needed
  return [];
}

function parseTechSection(
  body: string, 
  frontmatter: ContractFrontmatter
): ContractMarkdown['tech'] {
  const section = extractSection(body, '## Tech Stack');
  
  // Parse YAML blocks in the section
  const backendMatch = section.match(/### Backend[\s\S]*?```yaml\n([\s\S]*?)\n```/);
  const frontendMatch = section.match(/### Frontend[\s\S]*?```yaml\n([\s\S]*?)\n```/);
  const databaseMatch = section.match(/### Database[\s\S]*?```yaml\n([\s\S]*?)\n```/);
  
  return {
    backend: backendMatch 
      ? yaml.load(backendMatch[1]) as any 
      : { framework: frontmatter.tech.backend, language: 'typescript', runtime: 'node >= 18', features: [], validation: 'zod' },
    frontend: frontendMatch 
      ? yaml.load(frontendMatch[1]) as any 
      : undefined,
    database: databaseMatch 
      ? yaml.load(databaseMatch[1]) as any 
      : { type: frontmatter.tech.database }
  };
}

function parseTestsSection(body: string): ContractMarkdown['tests'] {
  const section = extractSection(body, '## Tests');
  
  // Parse Gherkin acceptance tests
  const gherkinMatch = section.match(/```gherkin\n([\s\S]*?)\n```/);
  const acceptance = gherkinMatch 
    ? parseGherkin(gherkinMatch[1]) 
    : [];
  
  // Parse API tests from YAML
  const testsMatch = section.match(/### API Tests[\s\S]*?```yaml\n([\s\S]*?)\n```/);
  const api = testsMatch 
    ? (yaml.load(testsMatch[1]) as any).tests || []
    : [];
  
  return { acceptance, api };
}

function parseGherkin(content: string): ContractMarkdown['tests']['acceptance'] {
  // Simplified Gherkin parser
  const features: ContractMarkdown['tests']['acceptance'] = [];
  
  const featureMatch = content.match(/Feature: (.+)/);
  if (!featureMatch) return features;
  
  const feature = featureMatch[1];
  const scenarios: ContractMarkdown['tests']['acceptance'][0]['scenarios'] = [];
  
  const scenarioRegex = /Scenario: (.+)\n([\s\S]*?)(?=Scenario:|$)/g;
  let match;
  
  while ((match = scenarioRegex.exec(content)) !== null) {
    const [, name, stepsContent] = match;
    const steps = stepsContent
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.match(/^(Given|When|Then|And)/));
    
    scenarios.push({ name, steps });
  }
  
  features.push({ feature, scenarios });
  return features;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function extractSection(body: string, header: string): string {
  const regex = new RegExp(`${header}\\n([\\s\\S]*?)(?=## |$)`);
  const match = body.match(regex);
  return match ? match[1] : '';
}

function extractField(section: string, label: string): string {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`);
  const match = section.match(regex);
  return match ? match[1].trim() : '';
}

function extractList(section: string, label: string): string[] {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`);
  const match = section.match(regex);
  if (!match) return [];
  return match[1].split(',').map(s => s.trim());
}

function extractCheckboxList(section: string, label: string): string[] {
  const sectionStart = section.indexOf(`### ${label}`);
  if (sectionStart === -1) return [];
  
  const subsection = section.slice(sectionStart);
  const items: string[] = [];
  const checkboxRegex = /- \[[x ]\] (.+)/gi;
  let match;
  
  while ((match = checkboxRegex.exec(subsection)) !== null) {
    items.push(match[1]);
  }
  
  return items;
}

// ============================================
// VALIDATION
// ============================================

export function validateContract(contract: ContractMarkdown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!contract.frontmatter.contract.name) {
    errors.push('Contract name is required in frontmatter');
  }
  
  if (contract.entities.length === 0) {
    errors.push('At least one entity is required');
  }
  
  // Entity validation
  for (const entity of contract.entities) {
    if (!entity.fields.some(f => f.name === 'id')) {
      warnings.push(`Entity "${entity.name}" has no 'id' field`);
    }
  }
  
  // API validation
  if (contract.api.endpoints.length === 0) {
    warnings.push('No API endpoints defined');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### 3. Contract Converter (`src/core/contract-ai/converter/to-contract-ai.ts`)

```typescript
/**
 * Converts ContractMarkdown to existing ContractAI format
 * For backward compatibility with current code generation
 */

import { ContractMarkdown } from '../types/contract-markdown';
import { ContractAI, EntityDefinition as CAEntityDefinition } from '../types';

export function convertToContractAI(contract: ContractMarkdown): ContractAI {
  return {
    definition: {
      app: {
        name: contract.frontmatter.contract.name,
        version: contract.frontmatter.contract.version,
        description: contract.frontmatter.contract.description
      },
      entities: contract.entities.map(convertEntity),
      events: [],  // Extract from rules if needed
      api: {
        baseUrl: contract.api.baseUrl,
        resources: extractResources(contract)
      }
    },
    generation: {
      instructions: [],
      techStack: {
        backend: contract.tech.backend.framework,
        frontend: contract.tech.frontend?.framework,
        database: contract.tech.database.type,
        language: contract.tech.backend.language as 'typescript' | 'javascript'
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
        type: 'api',
        endpoint: t.path,
        method: t.method,
        expectedStatus: t.expect.status
      })),
      acceptance: contract.tests.acceptance.flatMap(a => 
        a.scenarios.map(s => s.name)
      )
    }
  };
}

function convertEntity(entity: ContractMarkdown['entities'][0]): CAEntityDefinition {
  return {
    name: entity.name,
    description: entity.description,
    fields: entity.fields.map(f => ({
      name: f.name,
      type: mapFieldType(f.type),
      required: f.required,
      auto: f.auto,
      description: f.description
    }))
  };
}

function mapFieldType(type: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'datetime': 'Date',
    'date': 'Date',
    'enum': 'string'
  };
  return typeMap[type] || type;
}

function extractResources(contract: ContractMarkdown) {
  // Group endpoints by resource
  const resources = new Map<string, any[]>();
  
  for (const endpoint of contract.api.endpoints) {
    const resource = endpoint.path.split('/')[1] || 'items';
    if (!resources.has(resource)) {
      resources.set(resource, []);
    }
    resources.get(resource)!.push({
      method: endpoint.method,
      path: endpoint.path,
      description: endpoint.description
    });
  }
  
  return Array.from(resources.entries()).map(([name, endpoints]) => ({
    name,
    endpoints
  }));
}
```

---

## Testing the Implementation

### 1. Unit Tests (`tests/unit/markdown-parser.test.ts`)

```typescript
import { parseContractMarkdown, validateContract } from '../../src/core/contract-ai/parser/markdown-parser';
import * as fs from 'fs';
import * as path from 'path';

describe('Contract Markdown Parser', () => {
  const sampleContract = `---
contract:
  name: test-app
  version: 1.0.0
  description: Test application
generation:
  mode: full-stack
  output: ./generated
tech:
  backend: express-typescript
  frontend: react-vite
  database: json-file
  testing: jest
runtime:
  port: 3000
  healthCheck: /health
---

# Test App Contract

## App Definition

**Domain:** Testing  
**Type:** Internal Tool  
**Users:** Developers

### Features

- [x] Create items
- [ ] Update items

---

## Entities

### Item

A test item entity.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`id\` | uuid | auto | Unique identifier |
| \`name\` | string | yes | Item name |
| \`createdAt\` | datetime | auto | Creation time |

---

## API

### Base URL

\`\`\`
http://localhost:3000/api/v1
\`\`\`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | \`/items\` | List all items |
| POST | \`/items\` | Create item |

---

## Business Rules

### Validation Rules

1. **Item Name**
   - Required

---

## Tech Stack

### Backend

\`\`\`yaml
backend:
  framework: express
  language: typescript
  runtime: node >= 18
  features:
    - cors
  validation: zod
\`\`\`

---

## Tests

### API Tests

\`\`\`yaml
tests:
  - name: health-check
    method: GET
    path: /health
    expect:
      status: 200
\`\`\`
`;

  test('parses frontmatter correctly', () => {
    const contract = parseContractMarkdown(sampleContract);
    
    expect(contract.frontmatter.contract.name).toBe('test-app');
    expect(contract.frontmatter.contract.version).toBe('1.0.0');
    expect(contract.frontmatter.tech.backend).toBe('express-typescript');
    expect(contract.frontmatter.runtime.port).toBe(3000);
  });

  test('parses entities from table', () => {
    const contract = parseContractMarkdown(sampleContract);
    
    expect(contract.entities).toHaveLength(1);
    expect(contract.entities[0].name).toBe('Item');
    expect(contract.entities[0].fields).toHaveLength(3);
    
    const idField = contract.entities[0].fields.find(f => f.name === 'id');
    expect(idField?.type).toBe('uuid');
    expect(idField?.auto).toBe(true);
  });

  test('parses API endpoints', () => {
    const contract = parseContractMarkdown(sampleContract);
    
    expect(contract.api.baseUrl).toBe('http://localhost:3000/api/v1');
    expect(contract.api.endpoints).toHaveLength(2);
    expect(contract.api.endpoints[0].method).toBe('GET');
    expect(contract.api.endpoints[0].path).toBe('/items');
  });

  test('parses test definitions', () => {
    const contract = parseContractMarkdown(sampleContract);
    
    expect(contract.tests.api).toHaveLength(1);
    expect(contract.tests.api[0].name).toBe('health-check');
    expect(contract.tests.api[0].expect.status).toBe(200);
  });

  test('validates contract structure', () => {
    const contract = parseContractMarkdown(sampleContract);
    const result = validateContract(contract);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('catches missing contract name', () => {
    const invalidContract = sampleContract.replace('name: test-app', 'name: ');
    const contract = parseContractMarkdown(invalidContract);
    const result = validateContract(contract);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Contract name is required in frontmatter');
  });
});
```

### 2. Integration Test (`tests/integration/contract-markdown-flow.test.ts`)

```typescript
import { parseContractMarkdown } from '../../src/core/contract-ai/parser/markdown-parser';
import { convertToContractAI } from '../../src/core/contract-ai/converter/to-contract-ai';
import { generateCode } from '../../src/core/contract-ai/code-generator';
import * as fs from 'fs';
import * as path from 'path';

describe('Contract Markdown Full Flow', () => {
  test('parses, converts, and generates code', async () => {
    // Read contract file
    const contractPath = path.join(__dirname, '../../examples/todo.contract.md');
    const content = fs.readFileSync(contractPath, 'utf-8');
    
    // Parse
    const parsed = parseContractMarkdown(content);
    expect(parsed.entities.length).toBeGreaterThan(0);
    
    // Convert to ContractAI format
    const contractAI = convertToContractAI(parsed);
    expect(contractAI.definition.entities.length).toBe(parsed.entities.length);
    
    // Generate code (mock LLM if needed)
    const result = await generateCode(contractAI, {
      outputDir: './test-output',
      dryRun: true
    });
    
    expect(result.files.length).toBeGreaterThan(0);
  });
});
```

---

## CLI Integration

### Add New Commands (`bin/reclapp`)

```bash
#!/usr/bin/env node

// Add to existing CLI

program
  .command('parse <file>')
  .description('Parse a .contract.md file and show structure')
  .action(async (file) => {
    const content = fs.readFileSync(file, 'utf-8');
    const contract = parseContractMarkdown(content);
    console.log(JSON.stringify(contract, null, 2));
  });

program
  .command('convert <input> [output]')
  .description('Convert between contract formats')
  .option('--from <format>', 'Input format (ts, md, rcl)', 'auto')
  .option('--to <format>', 'Output format (ts, md, rcl)', 'md')
  .action(async (input, output, options) => {
    // Implementation
  });

program
  .command('init')
  .description('Create a new contract file')
  .option('--format <format>', 'Contract format (md, ts)', 'md')
  .option('--name <name>', 'App name', 'my-app')
  .action(async (options) => {
    const template = generateContractTemplate(options.name);
    const filename = `${options.name}.contract.md`;
    fs.writeFileSync(filename, template);
    console.log(`Created ${filename}`);
  });
```

---

## Verification Checklist

After implementing the changes, run these commands to verify:

```bash
# 1. Run unit tests
npm test -- tests/unit/markdown-parser.test.ts

# 2. Run integration tests  
npm test -- tests/integration/contract-markdown-flow.test.ts

# 3. Parse an example contract
reclapp parse examples/todo.contract.md

# 4. Generate from new format
reclapp --contract examples/todo.contract.md

# 5. Compare output with existing format
reclapp generate examples/contract-ai/crm-contract.ts -o ./test-ts
reclapp --contract examples/crm.contract.md -o ./test-md
diff -r ./test-ts ./test-md

# 6. Run full lifecycle
reclapp --contract examples/todo.contract.md --keep-running
```

---

## Deployment Steps

1. **Create feature branch**
   ```bash
   git checkout -b feature/contract-markdown-parser
   ```

2. **Add new files**
   ```bash
   git add src/core/contract-ai/types/contract-markdown.ts
   git add src/core/contract-ai/parser/markdown-parser.ts
   git add src/core/contract-ai/converter/to-contract-ai.ts
   ```

3. **Run all tests**
   ```bash
   npm test
   ```

4. **Update documentation**
   ```bash
   # Update docs/contract-ai.md with new format info
   ```

5. **Create PR and merge**
   ```bash
   git push origin feature/contract-markdown-parser
   # Create PR on GitHub
   ```

6. **Tag release**
   ```bash
   git tag v2.4.0
   git push --tags
   ```

---

## Next Steps

1. Implement the parser code in your project
2. Create example `.contract.md` files
3. Test with existing examples
4. Gather feedback on LLM generation quality
5. Iterate on the format based on results
