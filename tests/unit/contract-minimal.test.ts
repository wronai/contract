/**
 * Minimal Contract Requirements Tests
 * 
 * Tests to determine what fields are REQUIRED vs OPTIONAL in contracts.
 */

import { parseContractMarkdown, validateContract } from '../../src/core/contract-ai/parser/markdown-parser';

describe('Contract Minimal Requirements', () => {
  
  describe('REQUIRED Fields', () => {
    
    it('contract.name is REQUIRED', () => {
      const noName = `---
contract:
  version: 1.0.0
---
# App
`;
      const parsed = parseContractMarkdown(noName);
      expect(parsed.frontmatter.contract?.name).toBeUndefined();
      
      const validation = validateContract(parsed);
      // Should have error or warning about missing name
      expect(validation.errors.length + validation.warnings.length).toBeGreaterThan(0);
    });

    it('contract.version is REQUIRED', () => {
      const noVersion = `---
contract:
  name: test-app
---
# App
`;
      const parsed = parseContractMarkdown(noVersion);
      expect(parsed.frontmatter.contract?.version).toBeUndefined();
    });

    it('at least one entity is REQUIRED', () => {
      const noEntities = `---
contract:
  name: empty-app
  version: 1.0.0
---
# Empty App
`;
      const parsed = parseContractMarkdown(noEntities);
      expect(parsed.entities.length).toBe(0);
      
      // Validation fails without entities
      const validation = validateContract(parsed);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least one entity is required');
    });
  });

  describe('OPTIONAL Sections', () => {
    
    const minimalValid = `---
contract:
  name: minimal-app
  version: 1.0.0
  description: Minimal valid contract
---

# Minimal App

## Entities

### Item

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | auto | ID |
| name | string | yes | Name |
`;

    it('generation section is OPTIONAL (defaults applied)', () => {
      const parsed = parseContractMarkdown(minimalValid);
      // Defaults are auto-applied even if not in source
      expect(parsed.frontmatter.generation).toBeDefined();
      expect(parsed.frontmatter.generation.mode).toBe('full-stack');
      expect(parsed.frontmatter.generation.output).toBe('./generated');
      
      const validation = validateContract(parsed);
      expect(validation.valid).toBe(true);
    });

    it('tech section is OPTIONAL (uses defaults)', () => {
      const parsed = parseContractMarkdown(minimalValid);
      expect(parsed.frontmatter.tech).toBeUndefined();
      
      // But tech object is populated with defaults
      expect(parsed.tech).toBeDefined();
      expect(parsed.tech.backend.framework).toBe('express');
    });

    it('runtime section is OPTIONAL (defaults applied)', () => {
      const parsed = parseContractMarkdown(minimalValid);
      // Defaults are auto-applied even if not in source
      expect(parsed.frontmatter.runtime).toBeDefined();
      expect(parsed.frontmatter.runtime.port).toBe(3000);
      expect(parsed.frontmatter.runtime.healthCheck).toBe('/health');
      
      const validation = validateContract(parsed);
      expect(validation.valid).toBe(true);
    });

    it('API section is OPTIONAL', () => {
      const parsed = parseContractMarkdown(minimalValid);
      expect(parsed.api.endpoints.length).toBe(0);
      
      const validation = validateContract(parsed);
      expect(validation.valid).toBe(true);
    });

    it('tests section is OPTIONAL', () => {
      const parsed = parseContractMarkdown(minimalValid);
      expect(parsed.tests.api.length).toBe(0);
      expect(parsed.tests.acceptance.length).toBe(0);
      
      const validation = validateContract(parsed);
      expect(validation.valid).toBe(true);
    });

    it('business rules section is OPTIONAL', () => {
      const parsed = parseContractMarkdown(minimalValid);
      expect(parsed.rules.assertions.length).toBe(0);
      
      const validation = validateContract(parsed);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Minimal Valid Contract', () => {
    
    it('parses with only contract metadata and one entity', () => {
      const minimal = `---
contract:
  name: simple-app
  version: 1.0.0
  description: Just the basics
---

# Simple App

## Entities

### Task

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | auto | Unique ID |
| title | string | yes | Task title |
`;

      const parsed = parseContractMarkdown(minimal);
      const validation = validateContract(parsed);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(parsed.frontmatter.contract.name).toBe('simple-app');
      expect(parsed.entities.length).toBe(1);
      expect(parsed.entities[0].fields.length).toBe(2);
    });
  });

  describe('Summary: What is Required?', () => {
    /*
     * REQUIRED for valid contract:
     * - contract.name
     * - contract.version  
     * - contract.description
     * - At least 1 entity (warning if missing)
     * 
     * OPTIONAL (uses defaults):
     * - generation section (defaults: mode=full-stack, output=./generated)
     * - tech section (defaults: express-typescript, react-vite, json-file, jest)
     * - runtime section (defaults: port=3000, healthCheck=/health)
     * - API section (auto-generated from entities)
     * - tests section (optional, for validation)
     * - business rules section (optional, for validation)
     */
    
    it('documents what is truly required', () => {
      const absoluteMinimal = `---
contract:
  name: x
  version: 1.0.0
  description: x
---
# X
## Entities
### Y
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | uuid | auto | x |
`;
      const parsed = parseContractMarkdown(absoluteMinimal);
      const validation = validateContract(parsed);
      
      expect(validation.valid).toBe(true);
      
      // All these are populated with defaults:
      expect(parsed.tech.backend.framework).toBe('express');
      expect(parsed.tech.backend.language).toBe('typescript');
    });
  });
});
