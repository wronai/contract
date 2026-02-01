/**
 * Documentation Generator
 * 
 * Generates README.md and other documentation files.
 * LLM-powered with fallback templates.
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContractAI } from '../types';
import { LLMClient } from '../generator/contract-generator';
import { ShellRenderer } from './shell-renderer';
import { getStageRequirements } from '../templates/contracts';

// ============================================================================
// TYPES
// ============================================================================

export interface DocGeneratorOptions {
  outputDir: string;
  port: number;
  verbose: boolean;
}

// ============================================================================
// DOC GENERATOR CLASS
// ============================================================================

export class DocGenerator {
  private options: DocGeneratorOptions;
  private llmClient: LLMClient | null;
  private renderer: ShellRenderer;

  constructor(options: DocGeneratorOptions, llmClient: LLMClient | null = null) {
    this.options = options;
    this.llmClient = llmClient;
    this.renderer = new ShellRenderer(options.verbose);
  }

  /**
   * Generate README.md - LLM-powered with fallback
   */
  async generateReadme(contract: ContractAI): Promise<void> {
    let readme: string;

    if (this.llmClient) {
      try {
        const stage = getStageRequirements('docs');
        const entities = contract.definition?.entities || [];
        const targets = Array.from(new Set(
          (contract.generation?.instructions || [])
            .map(i => i.target)
            .filter(t => t && t !== 'all')
        ));

        const projectName = contract.definition?.app?.name || 'Generated App';
        const projectDescription = contract.definition?.app?.description || 'A generated application';
        const projectVersion = contract.definition?.app?.version || '1.0.0';

        const prompt = `Generate a comprehensive README.md for a project with the following specification:

Project: ${projectName}
Description: ${projectDescription}
Version: ${projectVersion}

Entities:
${entities.map(e => `- ${e.name}: ${e.fields?.map(f => f.name).join(', ') || 'id, name'}`).join('\n')}

API Endpoints (for each entity):
- GET /{entities} - List all
- POST /{entities} - Create new
- GET /{entities}/:id - Get by ID
- PUT /{entities}/:id - Update
- DELETE /{entities}/:id - Delete

Tech Stack:
- Backend: Express.js + TypeScript
- Port: ${this.options.port}
${targets.includes('frontend') ? '- Frontend: React + TypeScript' : ''}
${targets.includes('tests') ? '- Tests: E2E tests with native fetch' : ''}

Include sections:
1. Project title and description
2. Features (based on entities)
3. Quick Start (installation & running)
4. API Documentation (endpoints table)
5. Project Structure
6. Development commands
7. License (MIT)

Output ONLY the Markdown content, no explanation.

${stage ? stage : ''}`;

        const response = await this.llmClient.generate({
          system: 'You generate professional README.md files in Markdown. Output only the README content.',
          user: prompt,
          temperature: 0.3,
          maxTokens: 2000
        });

        const mdMatch = response.match(/```(?:markdown|md)?\n([\s\S]*?)```/);
        readme = mdMatch ? mdMatch[1] : response;

        if (!readme.includes('#') || readme.length < 200) {
          throw new Error('Invalid README generated');
        }
      } catch {
        readme = this.getFallbackReadme(contract);
      }
    } else {
      readme = this.getFallbackReadme(contract);
    }

    const readmePath = path.join(this.options.outputDir, 'README.md');
    fs.writeFileSync(readmePath, readme, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: readme_generated',
        'readme:',
        `  path: "${readmePath}"`,
        `  bytes: ${readme.length}`,
        `  source: "${this.llmClient ? 'llm' : 'fallback'}"`
      ].join('\n'));
    }
  }

  /**
   * Fallback README generator
   */
  getFallbackReadme(contract: ContractAI): string {
    const name = contract?.definition?.app?.name || 'Generated App';
    const description = contract?.definition?.app?.description || 'A generated application';
    const version = contract?.definition?.app?.version || '1.0.0';
    const entities = contract?.definition?.entities || [];
    const targets = Array.from(new Set(
      (contract?.generation?.instructions || [])
        .map(i => i.target)
        .filter(t => t && t !== 'all')
    ));
    const port = this.options.port;

    const mainEntity = entities[0]?.name || 'Item';
    const pluralEntity = mainEntity.toLowerCase() + 's';

    const entitiesSection = entities.length > 0
      ? entities.map(e => {
          const fields = e.fields?.map(f => `\`${f.name}\` (${f.type})`).join(', ') || '`id`, `name`';
          return `### ${e.name}\n\nFields: ${fields}`;
        }).join('\n\n')
      : `### ${mainEntity}\n\nFields: \`id\`, \`name\`, \`createdAt\``;

    const apiTable = entities.length > 0
      ? entities.map(e => {
          const plural = e.name.toLowerCase() + 's';
          return `| GET | /${plural} | List all ${e.name}s |
| POST | /${plural} | Create ${e.name} |
| GET | /${plural}/:id | Get ${e.name} by ID |
| PUT | /${plural}/:id | Update ${e.name} |
| DELETE | /${plural}/:id | Delete ${e.name} |`;
        }).join('\n')
      : `| GET | /${pluralEntity} | List all |
| POST | /${pluralEntity} | Create new |
| GET | /${pluralEntity}/:id | Get by ID |
| PUT | /${pluralEntity}/:id | Update |
| DELETE | /${pluralEntity}/:id | Delete |`;

    return `# ${name}

> ${description}

**Version:** ${version}  
**Generated by:** Reclapp Evolution v2.4.1

## Features

${entities.map(e => `- **${e.name} Management** - Full CRUD operations`).join('\n') || `- **${mainEntity} Management** - Full CRUD operations`}
- RESTful API with Express.js
- TypeScript for type safety
- Health check endpoint
${targets.includes('tests') ? '- E2E tests included' : ''}
${targets.includes('frontend') ? '- React frontend' : ''}

## Quick Start

\`\`\`bash
# Install dependencies
cd api && npm install

# Start development server
npm run dev

# Or start production
npm start
\`\`\`

The API will be available at \`http://localhost:${port}\`

## API Documentation

### Health Check

\`\`\`
GET /health
\`\`\`

Returns: \`{ "status": "ok" }\`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
${apiTable}

## Entities

${entitiesSection}

## Project Structure

\`\`\`
${this.options.outputDir}/
├── api/
│   ├── src/
│   │   └── server.ts      # Main API server
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── e2e/
│   │   └── api.e2e.ts     # E2E tests
│   └── fixtures/
├── contract/
│   └── contract.ai.json   # Source contract
├── state/
│   └── evolution-state.json
└── README.md
\`\`\`

## Development

\`\`\`bash
# Run in development mode (with hot reload)
cd api && npm run dev

# Run tests
cd tests && npx tsx e2e/api.e2e.ts

# Check health
curl http://localhost:${port}/health
\`\`\`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | ${port} | API server port |

## License

MIT
`;
  }
}

export default DocGenerator;
