/**
 * LLM Orchestrator
 * 
 * Handles LLM-based code generation and orchestration.
 * Extracted from evolution-manager.ts for better modularity.
 * 
 * @version 2.4.1
 */

import { ContractAI, GeneratedCode, GeneratedFile } from '../types';
import { LLMClient } from '../generator/contract-generator';
import { ShellRenderer } from './shell-renderer';
import { getStageRequirements } from '../templates/contracts';
import { FallbackTemplates } from './fallback-templates';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface LLMOrchestratorOptions {
  outputDir: string;
  port: number;
  verbose: boolean;
}

export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  error?: string;
  source: 'llm' | 'fallback';
}

// ============================================================================
// LLM ORCHESTRATOR
// ============================================================================

export class LLMOrchestrator {
  private llmClient: LLMClient | null = null;
  private options: LLMOrchestratorOptions;
  private renderer: ShellRenderer;

  constructor(options: LLMOrchestratorOptions, renderer: ShellRenderer) {
    this.options = options;
    this.renderer = renderer;
  }

  /**
   * Set LLM client
   */
  setClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * Get LLM client
   */
  getClient(): LLMClient | null {
    return this.llmClient;
  }

  /**
   * Check if LLM is available
   */
  isAvailable(): boolean {
    return this.llmClient !== null;
  }

  /**
   * Generate code with timeout
   */
  async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    let timedOut = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new Error('timeout'));
      }, ms);
    });

    try {
      const result = await Promise.race([
        promise.finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
        }),
        timeoutPromise
      ]);
      return result as T;
    } catch (e) {
      if (timedOut) {
        promise.catch(() => {});
      }
      throw e;
    }
  }

  /**
   * Generate with retries
   */
  async withRetries<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2,
    delayMs: number = 500
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (e: any) {
        lastError = e;
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Orchestrate frontend layer using LLM
   */
  async orchestrateFrontend(contract: ContractAI): Promise<GenerationResult> {
    if (!this.llmClient) {
      return { success: false, files: [], error: 'No LLM client', source: 'fallback' };
    }

    const entities = contract.definition?.entities || [];
    const stage = getStageRequirements('frontend');
    const entityName = entities[0]?.name || 'Item';
    const pluralName = entityName.toLowerCase() + 's';

    const basePrompt = `Generate a React frontend for managing ${entityName} entities.

Entities: ${entities.map(e => e.name).join(', ')}
API Base: http://localhost:${this.options.port}/api/v1/${pluralName}

Requirements:
- React 18 with TypeScript
- Vite build tool
- TailwindCSS styling
- CRUD operations (list, create, update, delete)
- Clean, modern UI

Output files with \`\`\`typescript:frontend/path/to/file format.`;

    const prompt = stage ? `${basePrompt}\n\n${stage}` : basePrompt;

    try {
      const response = await this.llmClient.generate({
        system: 'You are an expert React developer. Generate clean, minimal code.',
        user: prompt,
        temperature: 0.3,
        maxTokens: 4000
      });

      const files = this.parseFilesFromResponse(response, 'frontend');
      return { success: files.length > 0, files, source: 'llm' };
    } catch (e: any) {
      return { success: false, files: [], error: e.message, source: 'fallback' };
    }
  }

  /**
   * Orchestrate custom layer using LLM
   */
  async orchestrateCustomLayer(contract: ContractAI, layerName: string): Promise<GenerationResult> {
    if (!this.llmClient) {
      return { success: false, files: [], error: 'No LLM client', source: 'fallback' };
    }

    const entityName = contract.definition?.entities?.[0]?.name || 'Item';

    const prompt = `Generate code for the "${layerName}" layer of a ${entityName} management application.

Requirements:
- TypeScript
- Clean, minimal code
- Follow best practices

Output files with \`\`\`filepath:path/to/file format.`;

    try {
      const response = await this.llmClient.generate({
        system: `You are an expert developer generating the ${layerName} layer.`,
        user: prompt,
        temperature: 0.3,
        maxTokens: 3000
      });

      const files = this.parseFilesFromResponse(response, layerName);
      return { success: files.length > 0, files, source: 'llm' };
    } catch (e: any) {
      return { success: false, files: [], error: e.message, source: 'fallback' };
    }
  }

  /**
   * Generate README using LLM
   */
  async generateReadme(contract: ContractAI): Promise<{ content: string; source: 'llm' | 'fallback' }> {
    if (!this.llmClient) {
      return { content: this.getFallbackReadme(contract), source: 'fallback' };
    }

    const entities = contract.definition?.entities || [];
    const targets = contract.generation?.instructions?.map(i => i.target) || ['api'];
    const stage = getStageRequirements('docs');

    const prompt = `Generate a comprehensive README.md for a project with the following specification:

Project: ${contract.definition?.app?.name || 'Generated App'}
Description: ${contract.definition?.app?.description || 'Auto-generated application'}
Entities: ${entities.map(e => e.name).join(', ')}
Tech Stack:
- Backend: Express.js + TypeScript
- Port: ${this.options.port}
${targets.includes('frontend') ? '- Frontend: React + TypeScript' : ''}
${targets.includes('tests') ? '- Tests: E2E tests with native fetch' : ''}

Include sections:
1. Project title and description
2. Quick start commands
3. API endpoints table
4. Project structure
5. Development commands
${stage ? `\nAdditional requirements:\n${stage}` : ''}`;

    try {
      const timeoutMs = Number(process.env.RECLAPP_LLM_TIMEOUT_MS || 45000);
      const response = await this.withTimeout(this.llmClient.generate({
        system: 'You generate professional README.md files in Markdown. Output only the README content.',
        user: prompt,
        temperature: 0.3,
        maxTokens: 2000
      }), timeoutMs);

      const mdMatch = response.match(/```(?:markdown|md)?\n([\s\S]*?)```/);
      const content = mdMatch ? mdMatch[1].trim() : response.trim();
      
      if (content.length < 100) {
        return { content: this.getFallbackReadme(contract), source: 'fallback' };
      }

      return { content, source: 'llm' };
    } catch {
      return { content: this.getFallbackReadme(contract), source: 'fallback' };
    }
  }

  /**
   * Parse files from LLM response
   */
  private parseFilesFromResponse(response: string, target: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const pattern = /```(?:typescript|ts|javascript|js|json):([^\n]+)\n([\s\S]*?)```/g;
    
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      files.push({ path: filePath, content, target });
    }

    return files;
  }

  /**
   * Get fallback README
   */
  private getFallbackReadme(contract: ContractAI): string {
    const appName = contract.definition?.app?.name || 'Generated App';
    const entities = contract.definition?.entities || [];
    const entityName = entities[0]?.name || 'Item';
    const pluralName = entityName.toLowerCase() + 's';

    return `# ${appName}

Auto-generated application with Contract AI.

## Quick Start

\`\`\`bash
cd api && npm install && npm run dev
\`\`\`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /api/v1/${pluralName} | List all |
| GET | /api/v1/${pluralName}/:id | Get by ID |
| POST | /api/v1/${pluralName} | Create |
| PUT | /api/v1/${pluralName}/:id | Update |
| DELETE | /api/v1/${pluralName}/:id | Delete |

## Project Structure

\`\`\`
├── api/           # Backend
├── tests/         # E2E tests
├── frontend/      # React app
└── contract/      # Contract files
\`\`\`
`;
  }
}

export default LLMOrchestrator;
