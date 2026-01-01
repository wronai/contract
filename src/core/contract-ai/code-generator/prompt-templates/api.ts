/**
 * API Prompt Template
 * 
 * Szablony promptów do generowania kodu API przez LLM.
 * 
 * @version 2.2.0
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import { ContractAI, EntityDefinition, ApiDefinition } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

export interface PromptTemplate {
  buildPrompt(contract: ContractAI): string;
  getRequiredFiles(contract: ContractAI): string[];
  getSystemPrompt(): string;
}

// ============================================================================
// API PROMPT TEMPLATE
// ============================================================================

/**
 * Szablon promptów dla generowania kodu API
 */
export class ApiPromptTemplate implements PromptTemplate {
  
  /**
   * Buduje kompletny prompt do generowania API
   */
  buildPrompt(contract: ContractAI): string {
    const { definition, generation, validation } = contract;
    
    return `
# CODE GENERATION TASK: API

## APPLICATION
Name: ${definition.app.name}
Version: ${definition.app.version}
Description: ${definition.app.description || 'N/A'}

## TECH STACK
${this.formatTechStack(generation.techStack)}

## ENTITIES

${this.formatEntities(definition.entities)}

## API ENDPOINTS

${this.formatApi(definition.api)}

## INSTRUCTIONS (sorted by priority)

${this.formatInstructions(generation.instructions, 'api')}

## CODE PATTERNS TO FOLLOW

${this.formatPatterns(generation.patterns, 'api')}

## CONSTRAINTS

${this.formatConstraints(generation.constraints)}

## VALIDATION REQUIREMENTS

Generated code MUST pass these checks:
${validation.assertions.map(a => `- [${a.id}] ${a.description}`).join('\n')}

## TEST SCENARIOS TO SUPPORT

${this.formatTestScenarios(validation.tests)}

## OUTPUT FORMAT

Generate complete, working TypeScript code files. Each file should be in format:
\`\`\`typescript:path/to/file.ts
// code here
\`\`\`

## REQUIRED FILES

${this.getRequiredFiles(contract).map(f => `- ${f}`).join('\n')}

Generate ALL files listed above. Each file must be complete and runnable.
`.trim();
  }

  /**
   * Zwraca listę wymaganych plików do wygenerowania
   */
  getRequiredFiles(contract: ContractAI): string[] {
    const files: string[] = [
      'api/src/server.ts',
      'api/src/types/index.ts',
      'api/package.json',
      'api/tsconfig.json'
    ];

    // Dodaj pliki routes dla każdej encji
    for (const entity of contract.definition.entities) {
      const routeName = this.toKebabCase(entity.name);
      files.push(`api/src/routes/${routeName}.ts`);
      files.push(`api/src/validators/${routeName}.ts`);
    }

    return files;
  }

  /**
   * Zwraca system prompt dla generowania API
   */
  getSystemPrompt(): string {
    return `
You are an expert Node.js/Express developer specializing in TypeScript.
Your task is to generate production-ready API code based on the Contract AI specification.

## Key Requirements:

1. **TypeScript First**: All code must be properly typed. No "any" types except in error handlers.

2. **Error Handling**: Every route must have try-catch blocks with appropriate HTTP status codes:
   - 200: Success (GET, PUT)
   - 201: Created (POST)
   - 204: No Content (DELETE)
   - 400: Bad Request (validation errors)
   - 404: Not Found
   - 500: Internal Server Error

3. **Validation**: Validate all inputs before processing. Use the validator functions.

4. **Code Style**:
   - Use async/await, not callbacks
   - Use const for variables that don't change
   - Use meaningful variable names
   - Add minimal but useful comments

5. **File Structure**:
   - server.ts: Main entry point with Express setup
   - routes/*.ts: One file per entity
   - validators/*.ts: Validation functions per entity
   - types/index.ts: TypeScript interfaces

6. **Output Format**: Generate each file with the path prefix:
   \`\`\`typescript:api/src/server.ts
   // code here
   \`\`\`

Generate complete, working code that can be run immediately with "npm install && npm start".
`.trim();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private formatTechStack(techStack: ContractAI['generation']['techStack']): string {
    const { backend } = techStack;
    return `
- Runtime: ${backend.runtime}
- Language: ${backend.language}
- Framework: ${backend.framework}
- Port: ${backend.port}
${backend.libraries ? `- Libraries: ${backend.libraries.join(', ')}` : ''}
`.trim();
  }

  private formatEntities(entities: EntityDefinition[]): string {
    return entities.map(entity => {
      const fieldsTable = entity.fields.map(f => {
        const annotations = f.annotations || {};
        return `| ${f.name} | ${f.type} | ${annotations.required ? 'yes' : 'no'} | ${annotations.unique ? 'yes' : 'no'} | ${annotations.generated ? 'auto' : ''} |`;
      }).join('\n');

      return `
### ${entity.name}
${entity.description || ''}

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
${fieldsTable}

${entity.relations ? `**Relations:** ${entity.relations.map(r => `${r.name} -> ${r.target} (${r.type})`).join(', ')}` : ''}
`;
    }).join('\n');
  }

  private formatApi(api?: ApiDefinition): string {
    if (!api) return 'No API definition provided.';

    return `
Base URL: ${api.prefix}

| Resource | Entity | Operations |
|----------|--------|------------|
${api.resources.map(r => `| /${r.name} | ${r.entity} | ${r.operations.join(', ')} |`).join('\n')}
`;
  }

  private formatInstructions(
    instructions: ContractAI['generation']['instructions'],
    target: string
  ): string {
    const priorityOrder = { must: 0, should: 1, may: 2 };
    
    return instructions
      .filter(i => i.target === target || i.target === 'all')
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .map(i => `[${i.priority.toUpperCase()}] ${i.instruction}`)
      .join('\n');
  }

  private formatPatterns(
    patterns: ContractAI['generation']['patterns'],
    target: string
  ): string {
    const relevantPatterns = patterns.filter(p => 
      p.appliesTo.includes(target as any) || p.appliesTo.includes('all' as any)
    );

    if (relevantPatterns.length === 0) {
      return 'No specific patterns defined. Follow standard Express.js conventions.';
    }

    return relevantPatterns.map(p => `
### ${p.name}
${p.description}

\`\`\`typescript
${p.template}
\`\`\`
`).join('\n');
  }

  private formatConstraints(constraints: ContractAI['generation']['constraints']): string {
    return constraints.map(c => 
      `- [${c.severity.toUpperCase()}] ${c.rule}`
    ).join('\n');
  }

  private formatTestScenarios(tests: ContractAI['validation']['tests']): string {
    return tests.map(test => `
### ${test.name} (${test.type})
Target: ${test.target}

${test.scenarios.map(s => `- **${s.name}**: ${s.when} → ${s.then}`).join('\n')}
`).join('\n');
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createApiPromptTemplate(): ApiPromptTemplate {
  return new ApiPromptTemplate();
}
