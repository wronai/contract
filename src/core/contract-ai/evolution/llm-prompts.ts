/**
 * LLM Prompts
 * 
 * Prompt building utilities for LLM-powered code generation.
 * 
 * @version 2.4.1
 */

import { ContractAI } from '../types';
import { getStageRequirements } from '../templates/contracts';

// ============================================================================
// TYPES
// ============================================================================

export type EvolutionTrigger = 'initial' | 'error' | 'log-analysis' | 'manual';

export interface PromptContext {
  trigger: EvolutionTrigger;
  context?: string;
  port?: number;
}

// ============================================================================
// PROMPT BUILDER CLASS
// ============================================================================

export class PromptBuilder {
  /**
   * Build system prompt for code generation
   */
  static buildSystemPrompt(): string {
    const stage = getStageRequirements('api');
    const base = `You are an expert TypeScript developer. Generate a REST API.

RULES:
1. Use ONLY these packages: express, cors (NO moment, NO uuid, NO other packages)
2. Use in-memory Map for storage
3. Include /health endpoint
4. Include CRUD: GET /api/v1/{entity}s, POST, PUT, DELETE

OUTPUT FORMAT (use EXACTLY):

\`\`\`typescript:api/src/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const items = new Map<string, any>();
let idCounter = 1;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// CRUD routes here...

app.listen(PORT, () => console.log(\`Server on port \${PORT}\`));
\`\`\`

\`\`\`json:api/package.json
{"name":"api","version":"1.0.0","scripts":{"dev":"ts-node src/server.ts"},"dependencies":{"cors":"^2.8.5","express":"^4.18.2"},"devDependencies":{"@types/cors":"^2.8.14","@types/express":"^4.17.20","@types/node":"^20.9.0","ts-node":"^10.9.2","typescript":"^5.3.0"}}
\`\`\`

\`\`\`json:api/tsconfig.json
{"compilerOptions":{"target":"ES2020","module":"commonjs","strict":true,"esModuleInterop":true,"skipLibCheck":true}}
\`\`\`

IMPORTANT: Copy package.json EXACTLY as shown above. Do NOT add moment, uuid, or any other packages.`;
    return stage ? `${base}\n\n${stage}` : base;
  }

  /**
   * Build user prompt based on contract and context
   */
  static buildUserPrompt(contract: ContractAI, ctx: PromptContext): string {
    const entities = contract.definition?.entities || [];
    const entityDescriptions = entities
      .map(e => {
        const fields = e.fields?.map(f => `${f.name}: ${f.type || 'string'}`).join(', ') || 'id, name';
        return `- ${e.name} { ${fields} }`;
      })
      .join('\n');

    const entityNames = entities.map(e => e.name.toLowerCase() + 's').join(', ') || 'items';
    const mainEntity = entities[0]?.name?.toLowerCase() || 'item';

    let prompt = `Generate a COMPLETE REST API for a TODO application with these entities:

${entityDescriptions || '- Item { id, name, description }'}

REQUIRED ENDPOINTS for each entity (e.g., for "Todo" entity):
- GET /api/v1/todos - list all todos (return array)
- GET /api/v1/todos/:id - get single todo by id
- POST /api/v1/todos - create new todo (return created object with id)
- PUT /api/v1/todos/:id - update todo
- DELETE /api/v1/todos/:id - delete todo

REQUIRED FILES:
1. api/src/server.ts - Express server with ALL routes, using Map for storage
2. api/package.json - dependencies (ONLY express, cors, and typescript-related)
3. api/tsconfig.json - TypeScript config

The server.ts MUST include:
- import express from 'express';
- import cors from 'cors';
- const app = express();
- app.use(cors());
- app.use(express.json());
- const PORT = process.env.PORT || ${ctx.port || 3000};
- In-memory storage: const ${mainEntity}s = new Map<string, any>();
- let idCounter = 1;
- All CRUD routes for: ${entityNames}
- Health endpoint: app.get('/health', ...)
- app.listen(PORT, ...)

Generate the COMPLETE code now. Do not use placeholders or comments like "// add more routes here".`;

    if (ctx.trigger === 'error' && ctx.context) {
      prompt += `\n\n⚠️ FIX THIS ERROR:\n${ctx.context}\n\nGenerate the COMPLETE corrected code.`;
    }

    if (ctx.trigger === 'log-analysis' && ctx.context) {
      prompt += `\n\n⚠️ FIX THESE ISSUES:\n${ctx.context}\n\nGenerate the COMPLETE fixed code.`;
    }

    if (ctx.trigger === 'manual' && ctx.context) {
      prompt += `\n\n📝 USER REQUEST:\n${ctx.context}\n\nModify the code to implement this request.`;
    }

    const stage = getStageRequirements('api');
    return stage ? `${prompt}\n\n${stage}` : prompt;
  }

  /**
   * Build contract-driven prompt (technology-agnostic)
   */
  static buildContractDrivenPrompt(contract: ContractAI, task: string, port: number): string {
    const sections: string[] = [];

    sections.push(`## Task\n${task}`);

    // Contract context
    const techStack = contract.generation?.techStack;
    if (techStack) {
      sections.push(`## Tech Stack (from contract)
- Language: ${techStack.backend?.language || 'typescript'}
- Framework: ${techStack.backend?.framework || 'express'}
- Port: ${port}`);
    }

    // Entities
    const entities = contract.definition?.entities || [];
    if (entities.length > 0) {
      sections.push('\n## Entities');
      for (const entity of entities) {
        const fields = entity.fields?.map(f => `${f.name}: ${f.type}${f.annotations?.required ? ' (required)' : ''}`).join(', ') || 'id, name';
        sections.push(`- **${entity.name}**: { ${fields} }`);
      }
    }

    sections.push(`
## Guidelines
- Choose appropriate technology based on contract hints
- If no tech specified, use simple and minimal solution
- Implement all CRUD operations for each entity
- Include health check endpoint
- Use proper error handling
- Generate clean, readable code
`);

    return sections.join('\n');
  }

  /**
   * Build fix prompt for error recovery
   */
  static buildFixPrompt(error: string, codeContext?: string): string {
    return `Fix the following error in the code:

ERROR:
${error}

${codeContext ? `CURRENT CODE:\n${codeContext}` : ''}

Requirements:
1. Identify the root cause
2. Provide the minimal fix
3. Explain what was wrong

Output format:
\`\`\`fix
// The corrected code
\`\`\`

confidence: 0.X (your confidence in the fix)
reusable: true/false (if this fix applies to similar errors)`;
  }
}

export default PromptBuilder;
