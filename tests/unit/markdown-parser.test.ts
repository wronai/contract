import { parseContractMarkdown, validateContract } from '../../src/core/contract-ai/parser/markdown-parser';

describe('Contract Markdown Parser (.contract.md)', () => {
  it('parses frontmatter, entities, api and tests sections', () => {
    const content = `---
contract:
  name: test-app
  version: 1.0.0
  description: Test app

generation:
  mode: full-stack
  output: ./generated

tech:
  backend: express-typescript
  database: json-file
  testing: jest

runtime:
  port: 3000
  healthCheck: /health
---

# Test App

## App Definition

**Domain:** Testing  
**Type:** Internal Tool  
**Users:** Developers, QA

### Features

- [x] Create items

## Entities

### Item

Item entity.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| \`id\` | uuid | auto | Unique id |
| \`name\` | string | yes | Name |

## API

\`\`\`
http://localhost:3000/api/v1
\`\`\`

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| GET | \`/items\` | List items | - | Item[] |

## Business Rules

\`\`\`yaml
assertions:
  - name: item-name-required
    entity: Item
    field: name
    rule: required
    message: "Item name is required"
\`\`\`

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

    const parsed = parseContractMarkdown(content);
    const validation = validateContract(parsed);

    expect(parsed.frontmatter.contract.name).toBe('test-app');
    expect(parsed.frontmatter.runtime.port).toBe(3000);

    expect(parsed.entities).toHaveLength(1);
    expect(parsed.entities[0].name).toBe('Item');
    expect(parsed.entities[0].fields).toHaveLength(2);

    const idField = parsed.entities[0].fields.find(f => f.name === 'id');
    expect(idField?.auto).toBe(true);

    expect(parsed.api.baseUrl).toContain('http://localhost:3000');
    expect(parsed.api.endpoints.length).toBeGreaterThan(0);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('throws when frontmatter is missing', () => {
    expect(() => parseContractMarkdown('# No frontmatter')).toThrow(/frontmatter/i);
  });
});
