/**
 * Context-Based Contract Generator
 * 
 * Generates contracts and code step-by-step using contextual information
 * instead of templates. Uses LLM for intelligent generation.
 * 
 * @version 1.0.0
 */

import { LLMManager, TaskContext } from './llm-manager';
import { LLMMessage, LLMResponse } from './llm-provider';
import { ContractAI, GeneratedFile } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface GenerationStep {
  id: string;
  name: string;
  type: 'contract' | 'schema' | 'api' | 'service' | 'test' | 'frontend';
  dependencies: string[];
  context: string;
  output?: GeneratedFile[];
}

export interface GenerationPlan {
  steps: GenerationStep[];
  totalSteps: number;
  estimatedTokens: number;
}

export interface ContextInfo {
  projectState?: any;
  existingFiles?: string[];
  contract?: ContractAI;
  previousOutputs?: Map<string, GeneratedFile[]>;
}

// ============================================================================
// PROMPTS
// ============================================================================

const SYSTEM_PROMPTS = {
  contract: `You are an expert software architect. Generate a detailed contract specification in JSON format.
Focus on:
- Clear entity definitions with appropriate fields and types
- RESTful API design with proper endpoints
- Relationships between entities
- Validation rules and constraints

Output ONLY valid JSON, no explanations.`,

  schema: `You are a database schema expert. Generate TypeScript interfaces and types.
Focus on:
- Type safety
- Proper field types (string, number, boolean, Date, etc.)
- Optional vs required fields
- Enum types for status fields

Output ONLY TypeScript code.`,

  api: `You are an API developer expert. Generate Express.js API code.
Focus on:
- RESTful endpoints (GET, POST, PUT, DELETE)
- Proper error handling
- Input validation
- Clean, readable code

Output ONLY TypeScript code with Express.js.`,

  service: `You are a backend services expert. Generate service layer code.
Focus on:
- Business logic separation
- Repository pattern
- Error handling
- Testability

Output ONLY TypeScript code.`,

  test: `You are a testing expert. Generate E2E tests.
Focus on:
- CRUD operation tests
- Edge cases
- Error scenarios
- Clear assertions

Output ONLY TypeScript test code.`,

  frontend: `You are a frontend developer expert. Generate React components.
Focus on:
- Functional components with hooks
- TypeScript types
- Tailwind CSS styling
- Clean, reusable code

Output ONLY TypeScript/TSX code.`
};

// ============================================================================
// CONTEXT GENERATOR
// ============================================================================

export class ContextGenerator {
  private llmManager: LLMManager;
  private context: ContextInfo;
  private generatedFiles: Map<string, GeneratedFile[]> = new Map();

  constructor(llmManager: LLMManager, context: ContextInfo = {}) {
    this.llmManager = llmManager;
    this.context = context;
  }

  /**
   * Create generation plan from prompt
   */
  async createPlan(prompt: string): Promise<GenerationPlan> {
    const steps: GenerationStep[] = [
      {
        id: 'contract',
        name: 'Generate Contract',
        type: 'contract',
        dependencies: [],
        context: prompt
      },
      {
        id: 'schema',
        name: 'Generate TypeScript Types',
        type: 'schema',
        dependencies: ['contract'],
        context: 'Based on contract entities'
      },
      {
        id: 'api',
        name: 'Generate API Endpoints',
        type: 'api',
        dependencies: ['schema'],
        context: 'Based on contract API spec'
      },
      {
        id: 'service',
        name: 'Generate Services',
        type: 'service',
        dependencies: ['schema'],
        context: 'Business logic layer'
      },
      {
        id: 'test',
        name: 'Generate E2E Tests',
        type: 'test',
        dependencies: ['api'],
        context: 'Test all CRUD operations'
      }
    ];

    // Estimate tokens based on complexity
    const estimatedTokens = this.estimateTokens(prompt);

    return {
      steps,
      totalSteps: steps.length,
      estimatedTokens
    };
  }

  /**
   * Execute single generation step
   */
  async executeStep(step: GenerationStep): Promise<GeneratedFile[]> {
    const taskContext: TaskContext = {
      type: step.type === 'contract' ? 'contract' : 'code',
      complexity: this.determineComplexity(step),
      tokensRequired: 4000,
      language: 'typescript'
    };

    const systemPrompt = SYSTEM_PROMPTS[step.type] || SYSTEM_PROMPTS.api;
    const userPrompt = this.buildUserPrompt(step);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.llmManager.chat(messages, taskContext, {
        temperature: 0.3,
        maxTokens: 8000
      });

      const files = this.parseResponse(response, step);
      this.generatedFiles.set(step.id, files);
      
      return files;
    } catch (error) {
      console.error(`Step ${step.id} failed:`, error);
      return [];
    }
  }

  /**
   * Execute full generation plan
   */
  async executePlan(
    plan: GenerationPlan,
    onProgress?: (step: GenerationStep, index: number) => void
  ): Promise<Map<string, GeneratedFile[]>> {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      // Check dependencies
      const depsReady = step.dependencies.every(dep => this.generatedFiles.has(dep));
      if (!depsReady) {
        console.warn(`Skipping ${step.id}: dependencies not ready`);
        continue;
      }

      onProgress?.(step, i);
      
      await this.executeStep(step);
    }

    return this.generatedFiles;
  }

  /**
   * Generate contract from prompt using LLM
   */
  async generateContract(prompt: string): Promise<ContractAI | null> {
    const taskContext: TaskContext = {
      type: 'contract',
      complexity: 'high',
      tokensRequired: 8000
    };

    const systemPrompt = `You are an expert software architect. Generate a detailed contract specification.

Output a JSON object with this structure:
{
  "definition": {
    "app": { "name": "...", "version": "1.0.0", "description": "..." },
    "entities": [
      {
        "name": "EntityName",
        "fields": [
          { "name": "id", "type": "UUID", "annotations": { "primary": true } },
          { "name": "fieldName", "type": "String", "annotations": { "required": true } }
        ],
        "relations": []
      }
    ],
    "api": {
      "prefix": "/api/v1",
      "endpoints": [
        { "entity": "EntityName", "operations": ["list", "get", "create", "update", "delete"] }
      ]
    }
  },
  "generation": {
    "techStack": {
      "backend": { "framework": "express", "language": "typescript" },
      "frontend": { "framework": "react", "language": "typescript" },
      "database": { "type": "in-memory" }
    }
  }
}

Extract entities from the user's description. Use appropriate field types.
Output ONLY valid JSON.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a contract for: ${prompt}` }
    ];

    try {
      const response = await this.llmManager.chat(messages, taskContext, {
        temperature: 0.2,
        maxTokens: 8000
      });

      // Parse JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ContractAI;
      }
    } catch (error) {
      console.error('Contract generation failed:', error);
    }

    return null;
  }

  /**
   * Generate code file using LLM
   */
  async generateCodeFile(
    fileType: 'api' | 'service' | 'test' | 'frontend',
    contract: ContractAI,
    entityName: string
  ): Promise<GeneratedFile | null> {
    const taskContext: TaskContext = {
      type: 'code',
      complexity: 'medium',
      tokensRequired: 4000,
      language: 'typescript'
    };

    const entity = contract.definition?.entities?.find(e => e.name === entityName);
    if (!entity) return null;

    const systemPrompt = SYSTEM_PROMPTS[fileType];
    const userPrompt = this.buildCodePrompt(fileType, entity, contract);

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.llmManager.chat(messages, taskContext, {
        temperature: 0.3,
        maxTokens: 4000
      });

      const content = this.extractCode(response.content);
      const filePath = this.getFilePath(fileType, entityName);

      return {
        path: filePath,
        content,
        target: fileType === 'frontend' ? 'frontend' : 'api'
      };
    } catch (error) {
      console.error(`Code generation failed for ${entityName}:`, error);
    }

    return null;
  }

  /**
   * Refactor code using LLM
   */
  async refactorCode(
    code: string,
    instructions: string,
    context: string = ''
  ): Promise<string> {
    const taskContext: TaskContext = {
      type: 'refactor',
      complexity: 'medium',
      tokensRequired: 6000,
      language: 'typescript'
    };

    const systemPrompt = `You are an expert code refactoring assistant.
Apply the requested changes while:
- Maintaining functionality
- Improving code quality
- Following best practices
- Preserving existing tests

Output ONLY the refactored code, no explanations.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${context}\n\nCode to refactor:\n\`\`\`typescript\n${code}\n\`\`\`\n\nInstructions: ${instructions}` }
    ];

    try {
      const response = await this.llmManager.chat(messages, taskContext, {
        temperature: 0.2,
        maxTokens: 6000
      });

      return this.extractCode(response.content);
    } catch (error) {
      console.error('Refactoring failed:', error);
      return code; // Return original on failure
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private buildUserPrompt(step: GenerationStep): string {
    let prompt = `Task: ${step.name}\n\n`;
    prompt += `Context: ${step.context}\n\n`;

    // Add dependency outputs
    for (const depId of step.dependencies) {
      const depFiles = this.generatedFiles.get(depId);
      if (depFiles && depFiles.length > 0) {
        prompt += `Previous output (${depId}):\n`;
        for (const file of depFiles.slice(0, 2)) {
          prompt += `\`\`\`${file.path}\n${file.content.substring(0, 2000)}\n\`\`\`\n`;
        }
      }
    }

    // Add project state if available
    if (this.context.projectState) {
      prompt += `\nProject state:\n${JSON.stringify(this.context.projectState, null, 2).substring(0, 1000)}\n`;
    }

    return prompt;
  }

  private buildCodePrompt(
    fileType: string,
    entity: any,
    contract: ContractAI
  ): string {
    const entityJson = JSON.stringify(entity, null, 2);
    const techStack = contract.generation?.techStack;

    return `Generate ${fileType} code for entity:

${entityJson}

Tech Stack:
- Backend: ${techStack?.backend?.framework || 'express'} with ${techStack?.backend?.language || 'typescript'}
- Database: ${techStack?.database?.type || 'in-memory'}

Requirements:
- Full CRUD operations
- Proper error handling
- Type safety
- Clean code`;
  }

  private parseResponse(response: LLMResponse, step: GenerationStep): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const content = response.content;

    // Extract code blocks with file paths
    const codeBlockPattern = /```(?:typescript|ts|javascript|js)?:?([^\n]*)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockPattern.exec(content)) !== null) {
      const filePath = match[1].trim() || this.getDefaultFilePath(step);
      const code = match[2].trim();

      if (code) {
        files.push({
          path: filePath,
          content: code,
          target: step.type === 'frontend' ? 'frontend' : step.type === 'test' ? 'tests' : 'api'
        });
      }
    }

    // If no code blocks found, treat entire response as code
    if (files.length === 0 && content.trim()) {
      files.push({
        path: this.getDefaultFilePath(step),
        content: this.extractCode(content),
        target: step.type === 'frontend' ? 'frontend' : 'api'
      });
    }

    return files;
  }

  private extractCode(content: string): string {
    // Remove markdown code fences
    const codeMatch = content.match(/```(?:typescript|ts|javascript|js)?\n?([\s\S]*?)```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    return content.trim();
  }

  private getDefaultFilePath(step: GenerationStep): string {
    const paths: Record<string, string> = {
      contract: 'contract/contract.ai.json',
      schema: 'api/src/types/entities.ts',
      api: 'api/src/server.ts',
      service: 'api/src/services/index.ts',
      test: 'tests/e2e/api.e2e.ts',
      frontend: 'frontend/src/App.tsx'
    };
    return paths[step.type] || 'generated/output.ts';
  }

  private getFilePath(fileType: string, entityName: string): string {
    const lower = entityName.toLowerCase();
    const paths: Record<string, string> = {
      api: `api/src/routes/${lower}.routes.ts`,
      service: `api/src/services/${lower}.service.ts`,
      test: `tests/e2e/${lower}.e2e.ts`,
      frontend: `frontend/src/components/${entityName}.tsx`
    };
    return paths[fileType] || `generated/${lower}.ts`;
  }

  private determineComplexity(step: GenerationStep): 'low' | 'medium' | 'high' {
    if (step.type === 'contract') return 'high';
    if (step.dependencies.length > 2) return 'high';
    return 'medium';
  }

  private estimateTokens(prompt: string): number {
    // Rough estimation: ~4 chars per token
    const promptTokens = Math.ceil(prompt.length / 4);
    const outputTokens = 8000; // Estimated output
    return promptTokens + outputTokens;
  }
}

export default ContextGenerator;
