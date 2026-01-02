/**
 * Tests Prompt Template
 * 
 * Generates test files for the API based on contract definition.
 */

import { ContractAI } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

export interface PromptTemplate {
  buildPrompt(contract: ContractAI): string;
  getRequiredFiles(contract: ContractAI): string[];
  getSystemPrompt(): string;
}

// ============================================================================
// TESTS PROMPT TEMPLATE
// ============================================================================

/**
 * Template for generating API tests
 */
export class TestsPromptTemplate implements PromptTemplate {
  
  /**
   * Builds complete prompt for tests generation
   */
  buildPrompt(contract: ContractAI): string {
    const entities = contract.definition.entities;
    const entityList = entities.map(e => `### ${e.name}\nFields: ${e.fields.map(f => f.name).join(', ')}`).join('\n\n');
    
    return `
TASK: Generate comprehensive tests for the following API entities

## Entities

${entityList}

## Requirements

1. Generate Jest/Vitest compatible tests
2. Test all CRUD operations (GET, POST, PUT, DELETE)
3. Test error cases (404, 400, 500)
4. Test validation (required fields, email format, etc.)
5. Use supertest for HTTP testing
6. Include setup and teardown

## Output Format

Generate files in this exact format:
\`\`\`typescript:tests/api.test.ts
// test code here
\`\`\`

\`\`\`typescript:tests/setup.ts
// setup code here
\`\`\`

\`\`\`json:tests/package.json
// test dependencies
\`\`\`
`;
  }

  /**
   * Returns list of required files for tests generation
   */
  getRequiredFiles(contract: ContractAI): string[] {
    void contract;
    return [
      'tests/api.test.ts',
      'tests/setup.ts',
      'tests/package.json'
    ];
  }

  /**
   * Returns system prompt for tests generation
   */
  getSystemPrompt(): string {
    return `You are an expert test engineer. Generate comprehensive API tests.

Rules:
1. Use Jest or Vitest as test framework
2. Use supertest for HTTP assertions
3. Test all CRUD operations
4. Test error scenarios
5. Test validation
6. Include proper setup and teardown
7. Use TypeScript with proper types
8. Output code in markdown code blocks with file paths

Format each file as:
\`\`\`typescript:tests/filename.ts
// code
\`\`\``;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createTestsPromptTemplate(): TestsPromptTemplate {
  return new TestsPromptTemplate();
}
