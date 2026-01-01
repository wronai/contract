/**
 * Contract AI - Prompt Builder
 * 
 * Buduje prompty dla LLM do generowania Contract AI.
 * 
 * @version 2.2.0
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import { ContractAI, ContractValidationError } from '../types';

// ============================================================================
// PROMPT BUILDER CLASS
// ============================================================================

/**
 * Buduje prompty do generowania Contract AI przez LLM
 */
export class ContractPromptBuilder {
  
  /**
   * Buduje system prompt dla LLM generującego Contract AI
   */
  buildSystemPrompt(): string {
    return `
You are a Contract AI generator for the Reclapp platform.
Your task is to generate a complete Contract AI specification based on user requirements.

## Contract AI Structure

The Contract AI must include THREE layers:

### LAYER 1: DEFINITION (CO)
Defines WHAT should be implemented:
- app: Application metadata (name, version, description)
- entities: Domain entities with fields and relations
- events: Domain events (optional)
- workflows: Business workflows (optional)
- api: REST API definition

### LAYER 2: GENERATION (JAK GENEROWAĆ)
Instructions for code generation:
- instructions: Specific instructions for LLM (target, priority, instruction)
- patterns: Code patterns to follow
- constraints: Technical constraints
- techStack: Technology stack configuration

### LAYER 3: VALIDATION (JAK SPRAWDZAĆ)
How to validate and when code is complete:
- assertions: Code assertions to verify
- tests: Test specifications with scenarios
- staticRules: Static analysis rules
- qualityGates: Quality metrics thresholds
- acceptance: Acceptance criteria

## Supported Field Types

Basic: String, Int, Float, Boolean, UUID, DateTime
Extended: Email, URL, Phone, Money, JSON, Text

## Field Annotations

- required: Field is mandatory
- unique: Value must be unique
- generated: Auto-generated value
- default: Default value
- min/max: Value constraints
- pattern: Regex validation
- enum: Allowed values
- relation: Reference to another entity

## Output Format

Output valid JSON matching the ContractAI interface.
Do not include any markdown formatting or code blocks in your response.
Only output the raw JSON object.

## Key Principles

1. Be specific in generation instructions
2. Include concrete test scenarios with testData
3. Define measurable acceptance criteria
4. Anticipate common failure modes in assertions
5. All entities should have id, createdAt, updatedAt fields
6. Use appropriate field types (Email for emails, UUID for ids)
7. Include error handling patterns in generation instructions
`.trim();
  }

  /**
   * Buduje user prompt z wymaganiami
   */
  buildUserPrompt(requirements: string): string {
    return `
Generate a complete Contract AI specification for the following requirements:

${requirements}

Requirements for the output:
1. Generate valid JSON matching ContractAI interface
2. Include all three layers: definition, generation, validation
3. Add appropriate assertions for generated code
4. Include at least 3 test scenarios per entity
5. Set realistic quality gates

Output only the JSON object, no markdown formatting.
`.trim();
  }

  /**
   * Buduje prompt do korekty kontraktu po błędach walidacji
   */
  buildCorrectionPrompt(
    originalPrompt: string,
    contract: Partial<ContractAI>,
    errors: ContractValidationError[]
  ): string {
    const errorList = errors.map(e => 
      `- [${e.code}] ${e.path}: ${e.message}${e.suggestion ? ` (Suggestion: ${e.suggestion})` : ''}`
    ).join('\n');

    return `
The previously generated Contract AI has validation errors that need to be fixed.

## Original Requirements
${originalPrompt}

## Current Contract (with errors)
${JSON.stringify(contract, null, 2)}

## Validation Errors
${errorList}

## Instructions
1. Fix ALL listed errors
2. Maintain the overall structure and intent
3. Ensure all three layers are complete and valid
4. Output only the corrected JSON, no explanations

Generate the corrected Contract AI JSON:
`.trim();
  }

  /**
   * Generuje przykładowe kontrakty różnej złożoności
   */
  buildExampleContracts(): string {
    return `
## Example 1: Simple CRM (Basic)

{
  "definition": {
    "app": { "name": "Simple CRM", "version": "1.0.0", "description": "Basic customer management" },
    "entities": [
      {
        "name": "Contact",
        "fields": [
          { "name": "id", "type": "UUID", "annotations": { "generated": true } },
          { "name": "email", "type": "Email", "annotations": { "required": true, "unique": true } },
          { "name": "firstName", "type": "String", "annotations": { "required": true } },
          { "name": "lastName", "type": "String", "annotations": { "required": true } },
          { "name": "createdAt", "type": "DateTime", "annotations": { "generated": true } }
        ]
      }
    ],
    "api": {
      "version": "v1",
      "prefix": "/api/v1",
      "resources": [
        { "name": "contacts", "entity": "Contact", "operations": ["list", "get", "create", "update", "delete"] }
      ]
    }
  },
  "generation": {
    "instructions": [
      { "target": "api", "priority": "must", "instruction": "Use Express.js with TypeScript" },
      { "target": "api", "priority": "must", "instruction": "Implement try-catch error handling" },
      { "target": "all", "priority": "must", "instruction": "No any types allowed" }
    ],
    "patterns": [],
    "constraints": [
      { "type": "no-any-types", "rule": "All code must be properly typed", "severity": "error" }
    ],
    "techStack": {
      "backend": { "runtime": "node", "language": "typescript", "framework": "express", "port": 3000 }
    }
  },
  "validation": {
    "assertions": [
      { "id": "A001", "description": "Server file exists", "check": { "type": "file-exists", "path": "src/server.ts" }, "errorMessage": "Missing server.ts", "severity": "error" }
    ],
    "tests": [
      {
        "name": "Contact API",
        "type": "api",
        "target": "Contact",
        "scenarios": [
          { "name": "list contacts", "given": "contacts exist", "when": "GET /api/v1/contacts", "then": "return 200 with array" }
        ]
      }
    ],
    "staticRules": [{ "name": "no-unused-vars", "severity": "error" }],
    "qualityGates": [{ "name": "Coverage", "metric": "test-coverage", "threshold": 70, "operator": ">=" }],
    "acceptance": {
      "testsPass": true,
      "minCoverage": 70,
      "maxLintErrors": 0,
      "maxResponseTime": 500,
      "securityChecks": [],
      "custom": []
    }
  }
}
`.trim();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createPromptBuilder(): ContractPromptBuilder {
  return new ContractPromptBuilder();
}
