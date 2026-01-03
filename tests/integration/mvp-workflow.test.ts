/**
 * MVP Workflow Integration Tests
 * 
 * Tests the complete self-correcting code generation workflow:
 * PROMPT → CONTRACT → CODE → SERVICE → MONITOR → FIX (loop)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawn, ChildProcess } from 'child_process';

const TEST_OUTPUT_DIR = './test-mvp-workflow';
const TEST_PORT = 3099;

describe('MVP Self-Correcting Workflow', () => {
  
  beforeAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup
    try {
      execSync(`pkill -f "port.*${TEST_PORT}" 2>/dev/null || true`);
    } catch {}
  });

  describe('Step 1: Prompt → Contract (Entity Extraction)', () => {
    it('extracts entities from natural language prompt', () => {
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ outputDir: TEST_OUTPUT_DIR, port: TEST_PORT });
      
      // Test entity extraction via createMinimalContract (private method accessed via any)
      const contract = (manager as any).createMinimalContract('Create a todo app with tasks and categories');
      
      expect(contract.definition.entities.length).toBeGreaterThanOrEqual(1);
      const entityNames = contract.definition.entities.map((e: any) => e.name.toLowerCase());
      expect(entityNames.some((n: string) => n.includes('task') || n.includes('todo'))).toBe(true);
    });

    it('extracts multiple entities from complex prompt', () => {
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ outputDir: TEST_OUTPUT_DIR, port: TEST_PORT });
      const contract = (manager as any).createMinimalContract('Build a CRM with contacts, companies, and deals');
      
      expect(contract.definition.entities.length).toBeGreaterThanOrEqual(2);
    });

    it('provides default entity when none detected', () => {
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ outputDir: TEST_OUTPUT_DIR, port: TEST_PORT });
      const contract = (manager as any).createMinimalContract('Build something amazing');
      
      expect(contract.definition.entities.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 2: Contract → Code (Generation)', () => {
    it('generates API code from contract', async () => {
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ 
        outputDir: TEST_OUTPUT_DIR, 
        port: TEST_PORT,
        verbose: false 
      });
      
      // Set minimal contract
      const contract = (manager as any).createMinimalContract('Create a notes app');
      (manager as any).contract = contract;
      
      // Generate code
      const code = await (manager as any).generateCode('initial');
      
      expect(code.files.length).toBeGreaterThan(0);
      
      // Should have server.ts
      const serverFile = code.files.find((f: any) => f.path.includes('server.ts'));
      expect(serverFile).toBeDefined();
      expect(serverFile.content).toContain('express');
      expect(serverFile.content).toContain('/health');
    });

    it('generates API code from contract (tests generated separately)', async () => {
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ 
        outputDir: TEST_OUTPUT_DIR, 
        port: TEST_PORT,
        verbose: false 
      });
      
      const contract = (manager as any).createMinimalContract('Create a todo app');
      (manager as any).contract = contract;
      
      const code = await (manager as any).generateCode('initial');
      
      // generateCode returns API files; tests are generated separately via generateTestFiles
      const apiFile = code.files.find((f: any) => f.path.includes('server'));
      expect(apiFile).toBeDefined();
    });

    it('generates API code (frontend generated separately via pipeline)', async () => {
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ 
        outputDir: TEST_OUTPUT_DIR, 
        port: TEST_PORT,
        verbose: false 
      });
      
      const contract = (manager as any).createMinimalContract('Create a task manager app');
      (manager as any).contract = contract;
      
      const code = await (manager as any).generateCode('initial');
      
      // generateCode returns API files; frontend is generated separately via generate-frontend task
      const apiFiles = code.files.filter((f: any) => f.path.includes('api'));
      expect(apiFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Step 3: Code → Files (Writing)', () => {
    it('writes generated files to output directory', async () => {
      const testDir = TEST_OUTPUT_DIR + '-write-test';
      
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ 
        outputDir: testDir, 
        port: TEST_PORT + 1,
        verbose: false 
      });
      
      const contract = (manager as any).createMinimalContract('Create a simple app');
      (manager as any).contract = contract;
      
      const code = await (manager as any).generateCode('initial');
      await (manager as any).writeFiles(code.files);
      
      // Verify files exist
      expect(fs.existsSync(testDir)).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'api/src/server.ts'))).toBe(true);
      
      // Cleanup
      fs.rmSync(testDir, { recursive: true });
    });
  });

  describe('Step 4: Health Check System', () => {
    it('health check returns false when service not running', async () => {
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ 
        outputDir: TEST_OUTPUT_DIR, 
        port: TEST_PORT + 10,  // Unused port
        verbose: false 
      });
      
      const healthy = await manager.checkHealth();
      expect(healthy).toBe(false);
    });
  });

  describe('Step 5: Evolution Log', () => {
    it('creates evolution log file', async () => {
      const testDir = TEST_OUTPUT_DIR + '-log-test';
      
      const { EvolutionManager } = require('../../src/core/contract-ai/evolution/evolution-manager');
      
      const manager = new EvolutionManager({ 
        outputDir: testDir, 
        port: TEST_PORT + 2,
        verbose: false 
      });
      
      // Manually trigger log writing
      (manager as any).evolutionHistory = [{
        cycle: 0,
        timestamp: new Date(),
        trigger: 'initial',
        changes: [{ path: 'test.ts', action: 'create', reason: 'test' }],
        result: 'success',
        logs: ['Test log']
      }];
      
      (manager as any).writeEvolutionLog();
      
      // Verify log directory exists
      const logDir = path.join(testDir, 'logs');
      expect(fs.existsSync(logDir)).toBe(true);
      
      // Verify log file exists
      const logFiles = fs.readdirSync(logDir);
      expect(logFiles.some(f => f.startsWith('evolution_'))).toBe(true);
      
      // Cleanup
      fs.rmSync(testDir, { recursive: true });
    });
  });

  describe('Complete Workflow Summary', () => {
    it('documents the MVP flow', () => {
      /**
       * MVP Self-Correcting Code Generator Flow:
       * 
       * 1. PROMPT → CONTRACT
       *    - Natural language prompt parsed
       *    - Entities extracted (tasks, notes, etc.)
       *    - Contract structure created
       * 
       * 2. CONTRACT → CODE
       *    - API layer generated (Express + TypeScript)
       *    - Test files generated
       *    - Frontend generated (React + Tailwind)
       * 
       * 3. CODE → FILES
       *    - Files written to output directory
       *    - Package.json with dependencies
       *    - TypeScript configs
       * 
       * 4. FILES → SERVICE
       *    - npm install
       *    - Service started on configured port
       * 
       * 5. SERVICE → MONITOR
       *    - Health check loop (every 5s)
       *    - Log analysis loop (every 10s)
       * 
       * 6. MONITOR → FIX (if issues detected)
       *    - Error patterns analyzed
       *    - Code regenerated with context
       *    - Service restarted
       *    - Loop back to step 5
       * 
       * 7. SUCCESS or MAX_ITERATIONS reached
       */
      expect(true).toBe(true);
    });
  });
});

describe('Error Pattern Detection', () => {
  it('identifies syntax errors', () => {
    const errorPatterns = [
      { pattern: /SyntaxError/, type: 'syntax' },
      { pattern: /Cannot find module/, type: 'import' },
      { pattern: /TypeError/, type: 'type' },
      { pattern: /EADDRINUSE/, type: 'port' },
    ];
    
    const testError = "SyntaxError: Unexpected token 'const'";
    const match = errorPatterns.find(p => p.pattern.test(testError));
    
    expect(match).toBeDefined();
    expect(match?.type).toBe('syntax');
  });

  it('identifies import errors', () => {
    const errorPatterns = [
      { pattern: /Cannot find module/, type: 'import' },
      { pattern: /Module not found/, type: 'import' },
    ];
    
    const testError = "Cannot find module 'express'";
    const match = errorPatterns.find(p => p.pattern.test(testError));
    
    expect(match).toBeDefined();
    expect(match?.type).toBe('import');
  });
});
