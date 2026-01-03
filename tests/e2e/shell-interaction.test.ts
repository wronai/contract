/**
 * Shell Interaction Tests for TypeScript reclapp
 * 
 * Tests the evolution pipeline's shell interaction and code generation.
 * Compares with Python implementation for parity.
 * 
 * Run: npx ts-node tests/e2e/shell-interaction.test.ts
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const RECLAPP_BIN = './bin/reclapp';
const TIMEOUT_MS = 120000;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration_ms: number;
}

const results: TestResult[] = [];

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanupDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

async function runTest(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration_ms: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message, duration_ms: Date.now() - start });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

// ============================================================================
// SHELL COMMAND TESTS
// ============================================================================

async function testReclappHelp(): Promise<void> {
  const output = execSync(`${RECLAPP_BIN} --help`, { encoding: 'utf-8' });
  if (!output.includes('evolve')) {
    throw new Error('Help should contain evolve command');
  }
}

async function testReclappEvolveHelp(): Promise<void> {
  const output = execSync(`${RECLAPP_BIN} evolve --help`, { encoding: 'utf-8' });
  if (!output.includes('--prompt') && !output.includes('-p')) {
    throw new Error('Evolve help should contain --prompt option');
  }
}

// ============================================================================
// CODE GENERATION TESTS
// ============================================================================

async function testEvolveGeneratesFiles(): Promise<void> {
  const tempDir = createTempDir('reclapp-test-');
  try {
    execSync(
      `${RECLAPP_BIN} evolve -p "Create a simple todo app" -o ${tempDir}`,
      { encoding: 'utf-8', timeout: TIMEOUT_MS }
    );
    
    // Check key files exist
    const requiredFiles = [
      'contract/contract.ai.json',
      'state/evolution-state.json',
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(tempDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required file: ${file}`);
      }
    }
  } finally {
    cleanupDir(tempDir);
  }
}

async function testEvolveCreatesContract(): Promise<void> {
  const tempDir = createTempDir('reclapp-contract-');
  try {
    execSync(
      `${RECLAPP_BIN} evolve -p "Create a blog with posts" -o ${tempDir}`,
      { encoding: 'utf-8', timeout: TIMEOUT_MS }
    );
    
    const contractPath = path.join(tempDir, 'contract', 'contract.ai.json');
    if (!fs.existsSync(contractPath)) {
      throw new Error('contract.ai.json not created');
    }
    
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
    if (!contract.definition || !contract.definition.app) {
      throw new Error('Contract missing definition.app');
    }
  } finally {
    cleanupDir(tempDir);
  }
}

async function testEvolveCreatesTests(): Promise<void> {
  const tempDir = createTempDir('reclapp-tests-');
  try {
    execSync(
      `${RECLAPP_BIN} evolve -p "Create a user app" -o ${tempDir}`,
      { encoding: 'utf-8', timeout: TIMEOUT_MS }
    );
    
    const testFiles = [
      'tests/e2e/api.e2e.ts',
      'tests/test.config.ts',
    ];
    
    for (const file of testFiles) {
      const filePath = path.join(tempDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing test file: ${file}`);
      }
    }
  } finally {
    cleanupDir(tempDir);
  }
}

async function testEvolveCreatesFrontend(): Promise<void> {
  const tempDir = createTempDir('reclapp-frontend-');
  try {
    execSync(
      `${RECLAPP_BIN} evolve -p "Create a notes app" -o ${tempDir}`,
      { encoding: 'utf-8', timeout: TIMEOUT_MS }
    );
    
    const frontendFiles = [
      'frontend/package.json',
      'frontend/src/App.tsx',
      'frontend/index.html',
    ];
    
    for (const file of frontendFiles) {
      const filePath = path.join(tempDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing frontend file: ${file}`);
      }
    }
  } finally {
    cleanupDir(tempDir);
  }
}

async function testEvolveCreatesDocs(): Promise<void> {
  const tempDir = createTempDir('reclapp-docs-');
  try {
    execSync(
      `${RECLAPP_BIN} evolve -p "Create a project app" -o ${tempDir}`,
      { encoding: 'utf-8', timeout: TIMEOUT_MS }
    );
    
    const docFiles = ['README.md', 'API.md'];
    
    for (const file of docFiles) {
      const filePath = path.join(tempDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing doc file: ${file}`);
      }
    }
  } finally {
    cleanupDir(tempDir);
  }
}

// ============================================================================
// COMPARISON WITH PYTHON TESTS
// ============================================================================

async function testOutputStructureMatchesPython(): Promise<void> {
  const tempDir = createTempDir('reclapp-compare-');
  try {
    execSync(
      `${RECLAPP_BIN} evolve -p "Create a todo app" -o ${tempDir}`,
      { encoding: 'utf-8', timeout: TIMEOUT_MS }
    );
    
    // These files should exist in both TS and Python outputs
    const expectedFiles = [
      'contract/contract.ai.json',
      'state/evolution-state.json',
      'tests/e2e/api.e2e.ts',
      'frontend/package.json',
      'README.md',
      'Dockerfile',
      'docker-compose.yml',
      '.github/workflows/ci.yml',
    ];
    
    for (const file of expectedFiles) {
      const filePath = path.join(tempDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file that Python generates: ${file}`);
      }
    }
  } finally {
    cleanupDir(tempDir);
  }
}

async function testContractStructureValid(): Promise<void> {
  const tempDir = createTempDir('reclapp-struct-');
  try {
    execSync(
      `${RECLAPP_BIN} evolve -p "Create a task manager" -o ${tempDir}`,
      { encoding: 'utf-8', timeout: TIMEOUT_MS }
    );
    
    const contractPath = path.join(tempDir, 'contract', 'contract.ai.json');
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
    
    // Validate structure matches Python output format
    if (!contract.definition) throw new Error('Missing definition');
    if (!contract.definition.app) throw new Error('Missing definition.app');
    if (!contract.definition.entities) throw new Error('Missing definition.entities');
    if (!Array.isArray(contract.definition.entities)) throw new Error('entities should be array');
    
  } finally {
    cleanupDir(tempDir);
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function main(): Promise<void> {
  console.log('\n## Shell Interaction Tests - TypeScript\n');
  
  // Shell command tests
  await runTest('reclapp --help works', testReclappHelp);
  await runTest('reclapp evolve --help works', testReclappEvolveHelp);
  
  // Code generation tests
  await runTest('evolve generates required files', testEvolveGeneratesFiles);
  await runTest('evolve creates contract.ai.json', testEvolveCreatesContract);
  await runTest('evolve creates test files', testEvolveCreatesTests);
  await runTest('evolve creates frontend files', testEvolveCreatesFrontend);
  await runTest('evolve creates documentation', testEvolveCreatesDocs);
  
  // Comparison tests
  await runTest('output structure matches Python', testOutputStructureMatchesPython);
  await runTest('contract structure is valid', testContractStructureValid);
  
  // Summary
  console.log('\n## Test Results\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('```yaml');
  console.log(`total: ${results.length}`);
  console.log(`passed: ${passed}`);
  console.log(`failed: ${failed}`);
  console.log('```');
  
  if (failed > 0) {
    console.log('\n## Failed Tests\n');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`- ${r.name}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);
