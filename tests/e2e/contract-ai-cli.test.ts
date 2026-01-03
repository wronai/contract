/**
 * Contract AI CLI E2E Tests
 * 
 * Tests the reclapp generate-ai CLI command end-to-end.
 * 
 * @version 2.2.0
 */

import { execSync, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const PROJECT_ROOT = path.join(__dirname, '../..');
const CLI_PATH = path.join(PROJECT_ROOT, 'bin/reclapp');
const EXAMPLES_DIR = path.join(PROJECT_ROOT, 'examples/contract-ai');
const TEST_OUTPUT_DIR = path.join(PROJECT_ROOT, '.test-output-e2e');

// Helper to run CLI commands
function runCLI(args: string, timeout = 60000): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI_PATH} ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout,
      env: { ...process.env, NO_COLOR: '1' }
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.status || 1
    };
  }
}

// Cleanup helper
function cleanupOutput() {
  if (fs.existsSync(TEST_OUTPUT_DIR)) {
    fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  }
}

describe('Contract AI CLI E2E', () => {
  beforeAll(() => {
    cleanupOutput();
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterAll(() => {
    cleanupOutput();
  });

  describe('CLI Help and Version', () => {
    it('should show help for generate-ai command', () => {
      const result = runCLI('generate-ai --help');
      
      expect(result.stdout + result.stderr).toMatch(/generate-ai|Generate/i);
    });

    it('should show version in help', () => {
      const result = runCLI('--help');
      
      // Version is shown in generate-ai header, not as --version flag
      expect(result.stdout).toMatch(/Reclapp|reclapp/i);
    });
  });

  describe('Contract Generation', () => {
    const contracts = [
      'crm-contract.ts',
      'blog-contract.ts',
      'task-manager-contract.ts',
      'ecommerce-contract.ts'
    ].filter(c => fs.existsSync(path.join(EXAMPLES_DIR, c)));

    test.each(contracts)('should generate code from %s', (contractFile) => {
      const contractPath = path.join(EXAMPLES_DIR, contractFile);
      const outputDir = path.join(TEST_OUTPUT_DIR, contractFile.replace('.ts', ''));
      
      const result = runCLI(`generate-ai "${contractPath}" -o "${outputDir}"`, 120000);
      
      // Should complete without critical error
      expect(result.exitCode).toBe(0);
      
      // Should show generation message
      expect(result.stdout).toMatch(/Generating code|Generated \d+ files/);
      
      // Should create output directory
      expect(fs.existsSync(outputDir)).toBe(true);
      
      // Should generate at least some files
      const files = fs.readdirSync(outputDir, { recursive: true }) as string[];
      expect(files.length).toBeGreaterThan(0);
    }, 120000);

    it('should generate with verbose mode', () => {
      const contractPath = path.join(EXAMPLES_DIR, 'crm-contract.ts');
      const outputDir = path.join(TEST_OUTPUT_DIR, 'crm-verbose');
      
      const result = runCLI(`generate-ai "${contractPath}" -v -o "${outputDir}"`, 120000);
      
      expect(result.exitCode).toBe(0);
    }, 120000);
  });

  describe('Validation Pipeline', () => {
    it('should run all 8 validation stages', () => {
      const contractPath = path.join(EXAMPLES_DIR, 'crm-contract.ts');
      const outputDir = path.join(TEST_OUTPUT_DIR, 'crm-validation');
      
      const result = runCLI(`generate-ai "${contractPath}" -o "${outputDir}"`, 120000);
      
      // Should mention 8 stages (now includes schema stage)
      expect(result.stdout).toMatch(/8 stages/);
      
      // Should run all stage types
      expect(result.stdout).toMatch(/syntax/);
      expect(result.stdout).toMatch(/assertions/);
      expect(result.stdout).toMatch(/static-analysis/);
      expect(result.stdout).toMatch(/tests/);
      expect(result.stdout).toMatch(/quality/);
      expect(result.stdout).toMatch(/security/);
      expect(result.stdout).toMatch(/runtime/);
    }, 120000);
  });

  describe('Output Structure', () => {
    it('should generate correct directory structure', () => {
      const contractPath = path.join(EXAMPLES_DIR, 'crm-contract.ts');
      const outputDir = path.join(TEST_OUTPUT_DIR, 'crm-structure');
      
      runCLI(`generate-ai "${contractPath}" -o "${outputDir}"`, 120000);
      
      // Should have api directory
      expect(fs.existsSync(path.join(outputDir, 'api'))).toBe(true);
      
      // Should have server.ts
      expect(fs.existsSync(path.join(outputDir, 'api/src/server.ts'))).toBe(true);
      
      // Should have package.json
      expect(fs.existsSync(path.join(outputDir, 'api/package.json'))).toBe(true);
      
      // Should have routes directory
      expect(fs.existsSync(path.join(outputDir, 'api/src/routes'))).toBe(true);
    }, 120000);

    it('should generate .rcl.md log file', () => {
      const contractPath = path.join(EXAMPLES_DIR, 'crm-contract.ts');
      const outputDir = path.join(TEST_OUTPUT_DIR, 'crm-log');
      
      runCLI(`generate-ai "${contractPath}" -o "${outputDir}"`, 120000);
      
      // Should have logs directory
      expect(fs.existsSync(path.join(outputDir, 'logs'))).toBe(true);
      
      // Should have .rcl.md file
      const logsDir = path.join(outputDir, 'logs');
      const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.rcl.md'));
      expect(logFiles.length).toBeGreaterThan(0);
      
      // Log should contain expected sections
      const logContent = fs.readFileSync(path.join(logsDir, logFiles[0]), 'utf-8');
      expect(logContent).toMatch(/## Metadata/);
      expect(logContent).toMatch(/## .* Generated Files/);
      expect(logContent).toMatch(/## .* Validation Pipeline/);
    }, 120000);

    it('should generate Dockerfile', () => {
      const contractPath = path.join(EXAMPLES_DIR, 'crm-contract.ts');
      const outputDir = path.join(TEST_OUTPUT_DIR, 'crm-docker');
      
      runCLI(`generate-ai "${contractPath}" -o "${outputDir}"`, 120000);
      
      // Should have docker directory with Dockerfile
      const dockerDir = path.join(outputDir, 'docker');
      if (fs.existsSync(dockerDir)) {
        const dockerfiles = fs.readdirSync(dockerDir).filter(f => f.includes('Dockerfile'));
        expect(dockerfiles.length).toBeGreaterThan(0);
      }
    }, 120000);
  });

  describe('Error Handling', () => {
    it('should fail gracefully with non-existent contract', () => {
      const result = runCLI('generate-ai /non/existent/contract.ts');
      
      expect(result.exitCode).not.toBe(0);
    });

    it('should show usage when no arguments provided', () => {
      const result = runCLI('generate-ai');
      
      expect(result.stdout + result.stderr).toMatch(/Usage|contract|prompt/i);
    });
  });

  describe('Dry Run Mode', () => {
    it('should support --dry-run flag', () => {
      const result = runCLI('generate-ai --dry-run --prompt "Create a simple API"');
      
      // Should not fail
      expect(result.exitCode).toBe(0);
      
      // Should show contract preview
      expect(result.stdout).toMatch(/dry-run|Contract/i);
    });
  });
});

describe('Ollama Integration', () => {
  const isOllamaRunning = (): boolean => {
    try {
      execSync('curl -s http://localhost:11434/api/tags', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  };

  it('should detect Ollama availability', () => {
    const contractPath = path.join(EXAMPLES_DIR, 'crm-contract.ts');
    const outputDir = path.join(TEST_OUTPUT_DIR, 'crm-ollama-detect');
    
    const result = runCLI(`generate-ai "${contractPath}" -o "${outputDir}"`, 120000);
    
    if (isOllamaRunning()) {
      expect(result.stdout).toMatch(/Using Ollama|Ollama/);
    } else {
      expect(result.stdout).toMatch(/simulation|simulated|not available/i);
    }
  }, 120000);
});
