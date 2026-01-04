/**
 * Shell Interaction Tests for TypeScript reclapp
 * 
 * Tests the evolution pipeline's shell interaction and code generation.
 * Compares with Python implementation for parity.
 * 
 * Run: npx ts-node tests/e2e/shell-interaction.test.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const RECLAPP_BIN = './bin/reclapp';
const TIMEOUT_MS = 900000;
const RUN_EVOLVE_E2E = process.env.RECLAPP_E2E_EVOLVE === '1';

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

function runReclapp(args: string): string {
  const quotedBin = JSON.stringify(RECLAPP_BIN);
  const quotedArgs = args.replace(/"/g, '\\"');
  const cmd = `bash -lc "source ~/.nvm/nvm.sh >/dev/null 2>&1 || true; ${quotedBin} ${quotedArgs}"`;
  return execSync(cmd, { encoding: 'utf-8', timeout: TIMEOUT_MS });
}

// ============================================================================
// SHELL COMMAND TESTS
// ============================================================================

describe('Shell Interaction Tests - TypeScript', () => {
  test(
    'reclapp --help works',
    async () => {
      const output = runReclapp('--help');
      expect(output).toContain('evolve');
    },
    TIMEOUT_MS
  );

  test(
    'reclapp evolve --help works',
    async () => {
      const output = runReclapp('evolve --help');
      expect(output).toMatch(/--prompt|-p/);
    },
    TIMEOUT_MS
  );

  (RUN_EVOLVE_E2E ? describe : describe.skip)('evolve output', () => {
    let tempDir: string;

    beforeAll(async () => {
      tempDir = createTempDir('reclapp-e2e-evolve-');
      runReclapp(`evolve -p \"Create a simple todo app\" -o \"${tempDir}\"`);
    }, TIMEOUT_MS);

    afterAll(() => {
      cleanupDir(tempDir);
    });

    test(
      'evolve generates required files',
      async () => {
        const requiredFiles = [
          'contract/contract.ai.json',
          'state/evolution-state.json'
        ];

        for (const file of requiredFiles) {
          const filePath = path.join(tempDir, file);
          expect(fs.existsSync(filePath)).toBe(true);
        }
      },
      TIMEOUT_MS
    );

    test(
      'evolve creates contract.ai.json with valid structure',
      async () => {
        const contractPath = path.join(tempDir, 'contract', 'contract.ai.json');
        expect(fs.existsSync(contractPath)).toBe(true);

        const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
        expect(contract.definition).toBeDefined();
        expect(contract.definition.app).toBeDefined();
        expect(contract.definition.entities).toBeDefined();
        expect(Array.isArray(contract.definition.entities)).toBe(true);
      },
      TIMEOUT_MS
    );

    test(
      'evolve creates test files',
      async () => {
        const testFiles = [
          'tests/e2e/api.e2e.ts',
          'tests/test.config.ts'
        ];

        for (const file of testFiles) {
          const filePath = path.join(tempDir, file);
          expect(fs.existsSync(filePath)).toBe(true);
        }
      },
      TIMEOUT_MS
    );

    test(
      'evolve creates frontend files',
      async () => {
        const frontendFiles = [
          'frontend/package.json',
          'frontend/src/App.tsx',
          'frontend/index.html'
        ];

        for (const file of frontendFiles) {
          const filePath = path.join(tempDir, file);
          expect(fs.existsSync(filePath)).toBe(true);
        }
      },
      TIMEOUT_MS
    );

    test(
      'evolve creates documentation',
      async () => {
        const docFiles = ['README.md', 'API.md'];

        for (const file of docFiles) {
          const filePath = path.join(tempDir, file);
          expect(fs.existsSync(filePath)).toBe(true);
        }
      },
      TIMEOUT_MS
    );

    test(
      'output structure matches Python (core artifacts)',
      async () => {
        const expectedFiles = [
          'contract/contract.ai.json',
          'state/evolution-state.json',
          'tests/e2e/api.e2e.ts',
          'frontend/package.json',
          'README.md',
          'Dockerfile',
          'docker-compose.yml',
          '.github/workflows/ci.yml'
        ];

        for (const file of expectedFiles) {
          const filePath = path.join(tempDir, file);
          expect(fs.existsSync(filePath)).toBe(true);
        }
      },
      TIMEOUT_MS
    );
  });
});

