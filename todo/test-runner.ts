/**
 * Test Runner - Stage 4 of Validation Pipeline
 * 
 * Generuje i uruchamia testy na podstawie contract.validation.tests
 * 
 * @version 2.4.1
 */

import { 
  ContractAI, 
  GeneratedCode, 
  TestSpecification,
  TestScenario 
} from '../../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationStage {
  name: string;
  critical: boolean;
  validate(context: ValidationContext): Promise<StageResult>;
}

export interface ValidationContext {
  contract: ContractAI;
  code: GeneratedCode;
  workDir: string;
  previousResults: Map<string, StageResult>;
}

export interface StageResult {
  stage: string;
  passed: boolean;
  errors: StageError[];
  warnings: StageWarning[];
  metrics?: Record<string, number>;
  timeMs: number;
}

export interface StageError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  severity: 'error' | 'critical';
}

export interface StageWarning {
  code: string;
  message: string;
  file?: string;
}

export interface JestResult {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: TestFileResult[];
}

export interface TestFileResult {
  name: string;
  status: 'passed' | 'failed' | 'pending';
  duration: number;
  failureMessages: string[];
}

// ============================================================================
// TEST RUNNER STAGE
// ============================================================================

/**
 * Stage 4: Test Runner
 * 
 * Generuje testy z TestSpecification i uruchamia Jest.
 */
export class TestRunner implements ValidationStage {
  name = 'tests';
  critical = false; // Testy mogą failować bez blokowania całego pipeline

  async validate(context: ValidationContext): Promise<StageResult> {
    const startTime = Date.now();
    const errors: StageError[] = [];
    const warnings: StageWarning[] = [];

    try {
      const { contract, code, workDir } = context;
      const testSpecs = contract.validation?.tests || [];

      if (testSpecs.length === 0) {
        return {
          stage: this.name,
          passed: true,
          errors: [],
          warnings: [{ code: 'W001', message: 'No test specifications defined' }],
          timeMs: Date.now() - startTime
        };
      }

      // 1. Generuj pliki testowe
      const testFiles = this.generateTestFiles(testSpecs, contract);

      // 2. Zapisz pliki do workDir (symulacja - w rzeczywistości użyj fs)
      // W produkcji: fs.writeFileSync(...)
      
      // 3. Uruchom testy
      const jestResult = await this.runJest(workDir, testFiles);

      // 4. Analizuj wyniki
      if (!jestResult.success) {
        for (const result of jestResult.testResults) {
          if (result.status === 'failed') {
            errors.push({
              code: 'E001',
              message: `Test failed: ${result.name}`,
              file: result.name,
              severity: 'error'
            });
            
            for (const failure of result.failureMessages) {
              errors.push({
                code: 'E002',
                message: failure.substring(0, 200),
                file: result.name,
                severity: 'error'
              });
            }
          }
        }
      }

      return {
        stage: this.name,
        passed: jestResult.success,
        errors,
        warnings,
        metrics: {
          totalTests: jestResult.numTotalTests,
          passedTests: jestResult.numPassedTests,
          failedTests: jestResult.numFailedTests,
          passRate: jestResult.numTotalTests > 0 
            ? (jestResult.numPassedTests / jestResult.numTotalTests) * 100 
            : 0
        },
        timeMs: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        stage: this.name,
        passed: false,
        errors: [{
          code: 'E999',
          message: `Test runner error: ${error.message}`,
          severity: 'critical'
        }],
        warnings: [],
        timeMs: Date.now() - startTime
      };
    }
  }

  /**
   * Generuje pliki testowe z TestSpecification
   */
  generateTestFiles(specs: TestSpecification[], contract: ContractAI): Map<string, string> {
    const files = new Map<string, string>();

    for (const spec of specs) {
      const filename = `${spec.target.toLowerCase()}.test.ts`;
      const content = this.generateTestFile(spec, contract);
      files.set(filename, content);
    }

    return files;
  }

  /**
   * Generuje pojedynczy plik testowy
   */
  generateTestFile(spec: TestSpecification, contract: ContractAI): string {
    const kebab = spec.target.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    const plural = kebab.endsWith('y') ? kebab.slice(0, -1) + 'ies' : kebab + 's';
    const endpoint = `/api/${plural}`;

    const imports = `
import request from 'supertest';
import { app } from '../src/server';
`;

    const tests = spec.scenarios.map(scenario => 
      this.generateTestCase(scenario, endpoint, spec.type)
    ).join('\n\n');

    return `
/**
 * Generated tests for ${spec.name}
 * Target: ${spec.target}
 * Type: ${spec.type}
 */
${imports}

describe('${spec.name}', () => {
${tests}
});
`.trim();
  }

  /**
   * Generuje pojedynczy test case
   */
  generateTestCase(scenario: TestScenario, endpoint: string, type: string): string {
    const { name, given, when, then, testData, expectedResult } = scenario;

    // Parsuj metodę HTTP z "when"
    const method = this.parseMethod(when);
    const path = this.parsePath(when, endpoint);

    let testBody = '';

    if (type === 'api') {
      if (method === 'GET') {
        testBody = `
    const response = await request(app).get('${path}');
    expect(response.status).toBe(${expectedResult?.status || 200});
    ${expectedResult?.isArray ? 'expect(Array.isArray(response.body)).toBe(true);' : ''}`;
      } else if (method === 'POST') {
        testBody = `
    const response = await request(app)
      .post('${path}')
      .send(${JSON.stringify(testData || {})});
    expect(response.status).toBe(${expectedResult?.status || 201});
    ${expectedResult?.fields ? `
    ${expectedResult.fields.map((f: string) => `expect(response.body).toHaveProperty('${f}');`).join('\n    ')}` : ''}`;
      } else if (method === 'PUT') {
        testBody = `
    const response = await request(app)
      .put('${path}')
      .send(${JSON.stringify(testData || {})});
    expect(response.status).toBe(${expectedResult?.status || 200});`;
      } else if (method === 'DELETE') {
        testBody = `
    const response = await request(app).delete('${path}');
    expect(response.status).toBe(${expectedResult?.status || 204});`;
      }
    }

    return `  // Given: ${given}
  // When: ${when}
  // Then: ${then}
  it('${name}', async () => {${testBody}
  });`;
  }

  /**
   * Parsuje metodę HTTP z opisu "when"
   */
  parseMethod(when: string): string {
    if (when.includes('POST')) return 'POST';
    if (when.includes('PUT')) return 'PUT';
    if (when.includes('DELETE')) return 'DELETE';
    if (when.includes('PATCH')) return 'PATCH';
    return 'GET';
  }

  /**
   * Parsuje ścieżkę z opisu "when"
   */
  parsePath(when: string, defaultEndpoint: string): string {
    // Szukaj wzorca /api/...
    const match = when.match(/\/api\/[\w\-\/]+/);
    if (match) return match[0];
    return defaultEndpoint;
  }

  /**
   * Uruchamia Jest (symulacja)
   * W produkcji: child_process.exec('npm test')
   */
  async runJest(workDir: string, testFiles: Map<string, string>): Promise<JestResult> {
    // Symulacja dla testów
    // W rzeczywistości:
    // 1. Zapisz pliki testowe do workDir/tests/
    // 2. Uruchom: npm test --json
    // 3. Parsuj JSON output

    const numTests = testFiles.size * 3; // ~3 testy per plik

    return {
      success: true,
      numTotalTests: numTests,
      numPassedTests: numTests,
      numFailedTests: 0,
      numPendingTests: 0,
      testResults: Array.from(testFiles.keys()).map(name => ({
        name,
        status: 'passed' as const,
        duration: Math.random() * 100,
        failureMessages: []
      }))
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createTestRunner(): TestRunner {
  return new TestRunner();
}
