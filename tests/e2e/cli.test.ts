/**
 * CLI Tests - Reclapp Command Line Interface
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CWD = path.resolve(__dirname, '../..');
const CLI = path.join(CWD, 'bin/reclapp');
const TEST_CONTRACT = 'examples/crm/contracts/crm-typescript-validation.reclapp.ts';
const TEST_OUTPUT = 'examples/crm/target';

function run(args: string): string {
  try {
    return execSync(`${CLI} ${args}`, { cwd: CWD, encoding: 'utf-8', stdio: 'pipe' });
  } catch (e: any) {
    return e.stdout || e.stderr || e.message;
  }
}

describe('Reclapp CLI', () => {
  
  describe('help', () => {
    it('should show help with --help', () => {
      const output = run('--help');
      expect(output).toContain('Reclapp CLI');
      expect(output).toContain('generate');
      expect(output).toContain('deploy');
      expect(output).toContain('studio');
    });

    it('should show help with -h', () => {
      const output = run('-h');
      expect(output).toContain('Reclapp CLI');
    });

    it('should show help with no args', () => {
      const output = run('');
      expect(output).toContain('Reclapp CLI');
    });
  });

  describe('list', () => {
    it('should list contracts', () => {
      const output = run('list');
      expect(output).toContain('Available Contracts');
      expect(output).toContain('.reclapp.ts');
    });

    it('should work with ls alias', () => {
      const output = run('ls');
      expect(output).toContain('Available Contracts');
    });
  });

  describe('validate', () => {
    it('should validate a valid contract', () => {
      const output = run(`validate ${TEST_CONTRACT}`);
      expect(output).toContain('Contract is valid');
    });

    it('should fail for missing file', () => {
      const output = run('validate nonexistent.reclapp.ts');
      expect(output).toMatch(/not found|Validating/);
    });
  });

  describe('generate', () => {
    beforeAll(() => {
      // Clean up before tests
      if (fs.existsSync(path.join(CWD, TEST_OUTPUT))) {
        fs.rmSync(path.join(CWD, TEST_OUTPUT), { recursive: true });
      }
    });

    it('should generate files from contract', () => {
      const output = run(`generate ${TEST_CONTRACT}`);
      expect(output).toContain('Generated');
      expect(output).toContain('files');
    });

    it('should create api directory', () => {
      expect(fs.existsSync(path.join(CWD, TEST_OUTPUT, 'api'))).toBe(true);
    });

    it('should create frontend directory', () => {
      expect(fs.existsSync(path.join(CWD, TEST_OUTPUT, 'frontend'))).toBe(true);
    });

    it('should create docker-compose.yml', () => {
      expect(fs.existsSync(path.join(CWD, TEST_OUTPUT, 'docker-compose.yml'))).toBe(true);
    });

    it('should create server.ts', () => {
      expect(fs.existsSync(path.join(CWD, TEST_OUTPUT, 'api/src/server.ts'))).toBe(true);
    });

    it('should create App.tsx', () => {
      expect(fs.existsSync(path.join(CWD, TEST_OUTPUT, 'frontend/src/App.tsx'))).toBe(true);
    });

    it('should work with direct contract path', () => {
      const output = run(TEST_CONTRACT);
      expect(output).toContain('Generated');
    });
  });

  describe('stop', () => {
    it('should stop containers without error', () => {
      const output = run('stop');
      expect(output).toContain('Stopping');
    });
  });

});

describe('Generated Code Quality', () => {
  const apiDir = path.join(CWD, TEST_OUTPUT, 'api');

  it('should have valid package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(apiDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBeDefined();
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
  });

  it('should have valid tsconfig.json', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(apiDir, 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.compilerOptions).toBeDefined();
  });

  it('should have entity routes', () => {
    const routesDir = path.join(apiDir, 'src/routes');
    const routes = fs.readdirSync(routesDir);
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have entity models', () => {
    const modelsDir = path.join(apiDir, 'src/models');
    const models = fs.readdirSync(modelsDir);
    expect(models.length).toBeGreaterThan(0);
  });

  it('models should not have duplicate createdAt/updatedAt', () => {
    const modelsDir = path.join(apiDir, 'src/models');
    const models = fs.readdirSync(modelsDir);
    
    for (const model of models) {
      const content = fs.readFileSync(path.join(modelsDir, model), 'utf-8');
      const createdAtCount = (content.match(/createdAt/g) || []).length;
      const updatedAtCount = (content.match(/updatedAt/g) || []).length;
      
      // Should have exactly one of each
      expect(createdAtCount).toBe(1);
      expect(updatedAtCount).toBeLessThanOrEqual(1);
    }
  });
});

describe('API Build', () => {
  const apiDir = path.join(CWD, TEST_OUTPUT, 'api');

  it('should install dependencies', () => {
    execSync('npm install', { cwd: apiDir, stdio: 'pipe' });
    expect(fs.existsSync(path.join(apiDir, 'node_modules'))).toBe(true);
  }, 60000);

  it('should build without errors', () => {
    const result = execSync('npm run build', { cwd: apiDir, encoding: 'utf-8', stdio: 'pipe' });
    expect(fs.existsSync(path.join(apiDir, 'dist'))).toBe(true);
  }, 30000);
});
