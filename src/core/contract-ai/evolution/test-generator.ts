/**
 * Test Generator
 * 
 * Generates E2E tests, fixtures, and test configurations.
 * LLM-powered with fallback templates.
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContractAI } from '../types';
import { LLMClient } from '../generator/contract-generator';
import { FallbackTemplates } from './fallback-templates';
import { ShellRenderer } from './shell-renderer';
import { getStageRequirements } from '../templates/contracts';

// ============================================================================
// TYPES
// ============================================================================

export interface TestGeneratorOptions {
  outputDir: string;
  port: number;
  verbose: boolean;
}

export interface TestRunResult {
  passed: boolean;
  error?: string;
  output?: string;
}

// ============================================================================
// TEST GENERATOR CLASS
// ============================================================================

export class TestGenerator {
  private options: TestGeneratorOptions;
  private llmClient: LLMClient | null;
  private renderer: ShellRenderer;

  constructor(options: TestGeneratorOptions, llmClient: LLMClient | null = null) {
    this.options = options;
    this.llmClient = llmClient;
    this.renderer = new ShellRenderer(options.verbose);
  }

  /**
   * Generate all test files for a contract
   */
  async generateTestFiles(contract: ContractAI): Promise<void> {
    const testDir = path.join(this.options.outputDir, 'tests');
    const e2eDir = path.join(testDir, 'e2e');
    const fixturesDir = path.join(testDir, 'fixtures');
    
    for (const dir of [testDir, e2eDir, fixturesDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const entities = contract.definition?.entities || [];
    const mainEntity = entities[0]?.name || 'Item';
    const lowerName = mainEntity.toLowerCase();
    const pluralName = lowerName + 's';

    await this.generateTestConfig(testDir);
    await this.generateApiE2ETests(e2eDir, mainEntity, pluralName);
    await this.generateFixtures(fixturesDir, mainEntity);

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: e2e_tests_generated\ntests:\n  dir: "${testDir}"\n  structure:\n    - e2e/api.e2e.ts\n    - fixtures/${lowerName}.fixture.json\n    - test.config.ts\n  entity: "${mainEntity}"`);
    }
  }

  /**
   * Generate test configuration file
   */
  async generateTestConfig(testDir: string): Promise<void> {
    let configContent: string;

    if (this.llmClient) {
      try {
        const stage = getStageRequirements('tests');
        const prompt = `Generate a TypeScript test configuration file for E2E tests.

Requirements:
- Port: ${this.options.port}
- Base URL: http://localhost:${this.options.port}
- Timeout: 30000ms
- Retries: 2
- Layers: api (enabled), frontend (disabled), integration (enabled)
- Export config and endpoints objects

Output ONLY the TypeScript code, no explanation.

${stage ? stage : ''}`;

        const response = await this.llmClient.generate({
          system: 'You generate clean TypeScript configuration files. Output only code.',
          user: prompt,
          temperature: 0.2,
          maxTokens: 500
        });

        const codeMatch = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        configContent = codeMatch ? codeMatch[1] : response;
        
        if (!configContent.includes('export') || !configContent.includes('config')) {
          throw new Error('Invalid config generated');
        }
      } catch {
        configContent = this.getFallbackTestConfig();
      }
    } else {
      configContent = this.getFallbackTestConfig();
    }

    fs.writeFileSync(path.join(testDir, 'test.config.ts'), configContent, 'utf-8');
  }

  private getFallbackTestConfig(): string {
    return `/**
 * Test Configuration - Reclapp E2E Tests
 * @type: test_config
 */

export const config = {
  baseUrl: 'http://localhost:${this.options.port}',
  timeout: 30000,
  retries: 2,
  layers: {
    api: { enabled: true, port: ${this.options.port} },
    frontend: { enabled: false, port: 3001 },
    integration: { enabled: true }
  }
};

export const endpoints = {
  health: '/health',
  api: '/api'
};
`;
  }

  /**
   * Generate API E2E tests
   */
  async generateApiE2ETests(e2eDir: string, entityName: string, pluralName: string): Promise<void> {
    const port = this.options.port;
    const basePath = this.detectApiBasePath(pluralName);
    
    let testContent: string;

    if (this.llmClient) {
      try {
        const stage = getStageRequirements('tests');
        const basePrompt = `Generate TypeScript E2E tests for a REST API.

Entity: ${entityName}
Base URL: http://localhost:${port}
API Path: ${basePath}

CRITICAL REQUIREMENTS:
1. Use ONLY native fetch API - NO playwright, NO jest, NO mocha, NO supertest
2. NO import statements for test frameworks
3. Test health endpoint at /health
4. Test CRUD operations: POST, GET (list), GET (by id), PUT, DELETE
5. Track test results with pass/fail status in an array
6. Output YAML summary at the end
7. Exit with process.exit(1) if any tests fail

Structure:
- Define TestResult interface
- Create e2e() helper function
- Create runE2ETests() async function
- Call runE2ETests() at the end

Output ONLY the TypeScript code, no explanation.`;

        const prompt = stage ? `${basePrompt}\n\n${stage}` : basePrompt;

        const response = await this.llmClient.generate({
          system: 'You generate E2E test files in TypeScript. Output only code.',
          user: prompt,
          temperature: 0.3,
          maxTokens: 2000
        });

        const codeMatch = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
        testContent = codeMatch ? codeMatch[1] : response;
        
        // Validate: must use fetch, must be async, must NOT use playwright/jest/mocha
        if (!testContent.includes('fetch') || !testContent.includes('async')) {
          throw new Error('Invalid test code generated - missing fetch or async');
        }
        if (testContent.includes('@playwright') || testContent.includes('playwright')) {
          throw new Error('Invalid test code - must use native fetch, not playwright');
        }
        if (testContent.includes('jest') || testContent.includes('mocha') || testContent.includes('describe(')) {
          throw new Error('Invalid test code - must use native fetch runner, not test frameworks');
        }
        // Validate: must have createdId variable declared at top level for CRUD tests
        if (!testContent.includes('let createdId') && !testContent.includes('var createdId')) {
          throw new Error('Invalid test code - missing createdId variable for CRUD flow');
        }
        // Validate: must have runE2ETests function
        if (!testContent.includes('runE2ETests')) {
          throw new Error('Invalid test code - missing runE2ETests function');
        }
      } catch {
        testContent = FallbackTemplates.generateE2ETests(port, entityName, basePath);
      }
    } else {
      testContent = FallbackTemplates.generateE2ETests(port, entityName, basePath);
    }

    fs.writeFileSync(path.join(e2eDir, 'api.e2e.ts'), testContent, 'utf-8');
  }

  /**
   * Detect API base path from generated server code
   */
  private detectApiBasePath(pluralName: string): string {
    const serverPath = path.join(this.options.outputDir, 'api', 'src', 'server.ts');
    let basePath = `/${pluralName}`;
    
    if (fs.existsSync(serverPath)) {
      const content = fs.readFileSync(serverPath, 'utf-8');
      
      // Check for /api/v1 prefix pattern
      const apiV1Match = content.match(/['"`]\/api\/v1\/\w+['"`]/);
      if (apiV1Match) {
        basePath = `/api/v1/${pluralName}`;
      }
      
      // Check for /api prefix pattern
      const apiMatch = content.match(/['"`]\/api\/\w+['"`]/);
      if (apiMatch && !apiV1Match) {
        basePath = `/api/${pluralName}`;
      }
    }
    
    return basePath;
  }


  /**
   * Generate test fixtures
   */
  async generateFixtures(fixturesDir: string, entityName: string): Promise<void> {
    const lowerName = entityName.toLowerCase();
    let fixture: Record<string, any>;

    if (this.llmClient) {
      try {
        const prompt = `Generate JSON test fixtures for a "${entityName}" entity.

Create 3 fixtures:
1. valid_${lowerName} - valid data with name and description
2. invalid_${lowerName} - invalid data (empty name)
3. updated_${lowerName} - data for update tests

Output ONLY valid JSON, no explanation.`;

        const response = await this.llmClient.generate({
          system: 'You generate JSON test fixtures. Output only valid JSON.',
          user: prompt,
          temperature: 0.3,
          maxTokens: 500
        });

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          fixture = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found');
        }
      } catch {
        fixture = this.getFallbackFixtures(entityName, lowerName);
      }
    } else {
      fixture = this.getFallbackFixtures(entityName, lowerName);
    }
    
    fs.writeFileSync(
      path.join(fixturesDir, `${lowerName}.fixture.json`),
      JSON.stringify(fixture, null, 2),
      'utf-8'
    );
  }

  private getFallbackFixtures(entityName: string, lowerName: string): Record<string, any> {
    return {
      [`valid_${lowerName}`]: {
        name: `Test ${entityName}`,
        description: `A test ${lowerName} for E2E testing`
      },
      [`invalid_${lowerName}`]: {
        name: ''
      },
      [`updated_${lowerName}`]: {
        name: `Updated ${entityName}`,
        description: 'Updated description'
      }
    };
  }
}

export default TestGenerator;
