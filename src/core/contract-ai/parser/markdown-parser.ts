/**
 * Contract Markdown Parser
 * Parses .contract.md files into ContractMarkdown structure
 * @version 3.0.0
 */

import * as yaml from 'js-yaml';
import { 
  ContractMarkdown, 
  ContractFrontmatter,
  MarkdownEntityDefinition,
  EntityField,
  FieldType,
  ApiEndpoint,
  MarkdownAssertion,
  TestCase,
  AcceptanceTest,
  ContractValidationResult
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
    throw new Error('Contract must have YAML frontmatter between --- markers');
  }
  
  // Remove comments from YAML
  const yamlContent = match[1]
    .split('\n')
    .filter(line => !line.trim().startsWith('#'))
    .join('\n');
  
  const frontmatter = yaml.load(yamlContent) as ContractFrontmatter;
  const body = content.slice(match[0].length).trim();
  
  // Set defaults
  frontmatter.generation = frontmatter.generation || { mode: 'full-stack', output: './generated' };
  frontmatter.runtime = frontmatter.runtime || { port: 3000, healthCheck: '/health' };
  
  return { frontmatter, body };
}

// ============================================
// SECTION PARSERS
// ============================================

function parseAppSection(body: string): ContractMarkdown['app'] {
  const section = extractSection(body, '## App Definition');
  
  const domain = extractField(section, 'Domain') || 'General';
  const type = extractField(section, 'Type') || 'Application';
  const users = extractListFromField(section, 'Users');
  const features = extractCheckboxList(section);
  
  return { domain, type, users, features };
}

function parseEntitiesSection(body: string): MarkdownEntityDefinition[] {
  const section = extractSection(body, '## Entities');
  const entities: MarkdownEntityDefinition[] = [];
  
  // Find all ### Entity subsections
  const entityRegex = /### (\w+)\n([\s\S]*?)(?=###|\n## |$)/g;
  let match;
  
  while ((match = entityRegex.exec(section)) !== null) {
    const [, name, content] = match;
    entities.push(parseEntityContent(name, content));
  }
  
  return entities;
}

function parseEntityContent(name: string, content: string): MarkdownEntityDefinition {
  // Extract description (first paragraph before table)
  const descMatch = content.match(/^([^\n|#]+)\n/);
  const description = descMatch ? descMatch[1].trim() : undefined;
  
  // Parse markdown table
  const fields = parseMarkdownTable(content);
  
  // Extract TypeScript definition
  const tsMatch = content.match(/```typescript\n([\s\S]*?)\n```/);
  const typescript = tsMatch ? tsMatch[1] : undefined;
  
  // Extract example JSON
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  let example: Record<string, unknown> | undefined;
  if (jsonMatch) {
    try {
      example = JSON.parse(jsonMatch[1]);
    } catch {
      // Ignore JSON parse errors
    }
  }
  
  return { name, description, fields, typescript, example };
}

function parseMarkdownTable(content: string): EntityField[] {
  // Match table with header and separator
  const tableRegex = /\|([^\n]+)\|\n\|[-:| ]+\|\n((?:\|[^\n]+\|\n?)+)/;
  const match = content.match(tableRegex);
  
  if (!match) return [];
  
  const headers = match[1].split('|').map(h => h.trim().toLowerCase());
  const rows = match[2].trim().split('\n');
  
  const fieldIdx = headers.indexOf('field');
  const typeIdx = headers.indexOf('type');
  const requiredIdx = headers.indexOf('required');
  const descIdx = headers.indexOf('description');
  
  return rows.map(row => {
    const cells = row.split('|').filter(c => c !== '').map(c => c.trim());
    const requiredValue = cells[requiredIdx]?.toLowerCase() || '';
    
    return {
      name: cells[fieldIdx]?.replace(/`/g, '') || '',
      type: parseFieldType(cells[typeIdx] || 'string'),
      required: requiredValue === 'yes' || requiredValue === 'true',
      auto: requiredValue === 'auto',
      description: cells[descIdx] || undefined
    };
  }).filter(f => f.name); // Filter out empty rows
}

function parseFieldType(typeStr: string): FieldType {
  const normalized = typeStr.toLowerCase().trim();
  
  const typeMap: Record<string, FieldType> = {
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
  
  // Match tables that have Method column
  const tableRegex = /\|\s*Method\s*\|[^\n]+\n\|[-:| ]+\n((?:\|[^\n]+\n?)+)/gi;
  
  let match;
  while ((match = tableRegex.exec(section)) !== null) {
    const rows = match[1].trim().split('\n');
    
    for (const row of rows) {
      const cells = row.split('|').filter(c => c !== '').map(c => c.trim());
      if (cells.length >= 3 && cells[0].match(/^(GET|POST|PUT|PATCH|DELETE)$/)) {
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
  let assertions: MarkdownAssertion[] = [];
  
  if (yamlMatch) {
    try {
      const parsed = yaml.load(yamlMatch[1]) as { assertions?: MarkdownAssertion[] };
      assertions = parsed?.assertions || [];
    } catch {
      // Ignore YAML parse errors
    }
  }
  
  return { validations: [], assertions };
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
  
  let backend = {
    framework: 'express',
    language: 'typescript',
    runtime: 'node >= 18',
    features: ['cors'],
    validation: 'zod'
  };
  
  if (backendMatch) {
    try {
      const parsed = yaml.load(backendMatch[1]) as any;
      backend = { ...backend, ...parsed.backend || parsed };
    } catch {
      // Use defaults
    }
  } else if (frontmatter.tech?.backend) {
    // Parse from frontmatter like "express-typescript"
    const parts = frontmatter.tech.backend.split('-');
    backend.framework = parts[0] || 'express';
    backend.language = parts[1] || 'typescript';
  }
  
  let frontend = undefined;
  if (frontendMatch) {
    try {
      const parsed = yaml.load(frontendMatch[1]) as any;
      frontend = parsed.frontend || parsed;
    } catch {
      // Ignore
    }
  } else if (frontmatter.tech?.frontend) {
    const parts = frontmatter.tech.frontend.split('-');
    frontend = {
      framework: parts[0] || 'react',
      bundler: parts[1] || 'vite',
      styling: 'tailwind',
      state: 'useState',
      features: []
    };
  }
  
  let database = { type: frontmatter.tech?.database || 'json-file' };
  if (databaseMatch) {
    try {
      const parsed = yaml.load(databaseMatch[1]) as any;
      database = parsed.database || parsed;
    } catch {
      // Use defaults
    }
  }
  
  return { backend, frontend, database };
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
  let api: TestCase[] = [];
  
  if (testsMatch) {
    try {
      const parsed = yaml.load(testsMatch[1]) as { tests?: TestCase[] };
      api = parsed?.tests || [];
    } catch {
      // Ignore YAML parse errors
    }
  }
  
  return { acceptance, api };
}

function parseGherkin(content: string): AcceptanceTest[] {
  const features: AcceptanceTest[] = [];
  
  const featureMatch = content.match(/Feature:\s*(.+)/);
  if (!featureMatch) return features;
  
  const feature = featureMatch[1].trim();
  const scenarios: AcceptanceTest['scenarios'] = [];
  
  const scenarioRegex = /Scenario:\s*(.+)\n([\s\S]*?)(?=\s*Scenario:|$)/g;
  let match;
  
  while ((match = scenarioRegex.exec(content)) !== null) {
    const [, name, stepsContent] = match;
    const steps = stepsContent
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.match(/^(Given|When|Then|And)\s/));
    
    scenarios.push({ name: name.trim(), steps });
  }
  
  features.push({ feature, scenarios });
  return features;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function extractSection(body: string, header: string): string {
  const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedHeader}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = body.match(regex);
  return match ? match[1] : '';
}

function extractField(section: string, label: string): string {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`);
  const match = section.match(regex);
  return match ? match[1].trim() : '';
}

function extractListFromField(section: string, label: string): string[] {
  const value = extractField(section, label);
  if (!value) return [];
  return value.split(',').map(s => s.trim());
}

function extractCheckboxList(section: string): string[] {
  const items: string[] = [];
  const checkboxRegex = /- \[[x ]\] (.+)/gi;
  let match;
  
  while ((match = checkboxRegex.exec(section)) !== null) {
    items.push(match[1].trim());
  }
  
  return items;
}

// ============================================
// VALIDATION
// ============================================

export function validateContract(contract: ContractMarkdown): ContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!contract.frontmatter.contract?.name) {
    errors.push('Contract name is required in frontmatter');
  }
  
  if (!contract.frontmatter.contract?.version) {
    warnings.push('Contract version is recommended');
  }
  
  if (contract.entities.length === 0) {
    errors.push('At least one entity is required');
  }
  
  // Entity validation
  for (const entity of contract.entities) {
    if (!entity.fields.some(f => f.name === 'id')) {
      warnings.push(`Entity "${entity.name}" has no 'id' field`);
    }
    
    if (entity.fields.length === 0) {
      errors.push(`Entity "${entity.name}" has no fields defined`);
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

// ============================================
// EXPORTS
// ============================================

export { ContractMarkdown, ContractFrontmatter, MarkdownEntityDefinition };
