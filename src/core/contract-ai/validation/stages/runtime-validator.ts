/**
 * Runtime Validator - Stage 7 of Validation Pipeline
 * 
 * Buduje Docker image, uruchamia kontener i testuje endpoints.
 * 
 * @version 2.4.1
 */

import { execSync } from 'child_process';
import * as http from 'http';
import { EntityDefinition } from '../../types';
import { ValidationContext, ValidationStage, StageResult } from '../pipeline-orchestrator';

// ============================================================================
// TYPES
// ============================================================================

export interface ContainerInfo {
  containerId: string;
  port: number;
  image: string;
  startedAt: Date;
}

export interface EndpointTestResult {
  endpoint: string;
  method: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  responseTime: number;
  error?: string;
}

// ============================================================================
// RUNTIME VALIDATOR STAGE
// ============================================================================

/**
 * Stage 7: Runtime Validator
 * 
 * Buduje Docker image, uruchamia i testuje API w kontenerze.
 */
export class RuntimeValidator implements ValidationStage {
  name = 'runtime';
  critical = false;
  timeout = 120000; // 2 min timeout
  
  private healthCheckInterval = 500; // ms
  private healthCheckTimeout = 30000; // 30s

  async validator(context: ValidationContext): Promise<StageResult> {
    const startTime = Date.now();
    const errors: StageResult['errors'] = [];
    const warnings: StageResult['warnings'] = [];
    let container: ContainerInfo | null = null;

    try {
      const { contract, workDir } = context;
      const entities = contract.definition?.entities || [];

      // 1. Sprawdź czy Docker jest dostępny
      if (!this.isDockerAvailable()) {
        return {
          stage: this.name,
          passed: true, // Skip ale nie fail
          errors: [],
          warnings: [{ message: 'Docker not available, skipping runtime validation' }],
          timeMs: Date.now() - startTime
        };
      }

      // 2. Sprawdź czy workDir istnieje i ma Dockerfile
      if (!workDir || !this.hasDockerfile(workDir)) {
        return {
          stage: this.name,
          passed: true,
          errors: [],
          warnings: [{ message: 'No Dockerfile found, skipping runtime validation' }],
          timeMs: Date.now() - startTime
        };
      }

      // 3. Zbuduj i uruchom kontener
      container = await this.buildAndRun(workDir);

      // 4. Poczekaj na health check
      const healthy = await this.waitForHealthy(container.port);
      if (!healthy) {
        errors.push({
          code: 'RUNTIME_HEALTH_FAILED',
          message: 'Container failed to become healthy within timeout'
        });
        return this.createResult(errors, warnings, startTime);
      }

      // 5. Testuj endpoints
      const results = await this.testEndpoints(container.port, entities);

      // 6. Analizuj wyniki
      for (const result of results) {
        if (!result.passed) {
          errors.push({
            code: 'RUNTIME_ENDPOINT_FAILED',
            message: `${result.method} ${result.endpoint}: expected ${result.expectedStatus}, got ${result.actualStatus}`
          });
        }
      }

      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;

      return {
        stage: this.name,
        passed: errors.length === 0,
        errors,
        warnings,
        metrics: {
          endpointsTested: totalCount,
          endpointsPassed: passedCount,
          passRate: totalCount > 0 ? (passedCount / totalCount) * 100 : 0,
          avgResponseTime: results.length > 0 
            ? results.reduce((sum, r) => sum + r.responseTime, 0) / totalCount 
            : 0
        },
        timeMs: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        stage: this.name,
        passed: false,
        errors: [{
          code: 'RUNTIME_ERROR',
          message: `Runtime validation error: ${error.message}`
        }],
        warnings: [],
        timeMs: Date.now() - startTime
      };
    } finally {
      // Cleanup
      if (container) {
        await this.cleanup(container.containerId);
      }
    }
  }

  /**
   * Sprawdza czy Docker jest dostępny
   */
  isDockerAvailable(): boolean {
    try {
      execSync('docker --version', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sprawdza czy workDir ma Dockerfile
   */
  hasDockerfile(workDir: string): boolean {
    try {
      execSync(`test -f ${workDir}/Dockerfile || test -f ${workDir}/docker/Dockerfile.api`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Buduje i uruchamia kontener Docker
   */
  async buildAndRun(workDir: string): Promise<ContainerInfo> {
    const imageName = `reclapp-test-${Date.now()}`;
    const port = this.getRandomPort();

    // Determine Dockerfile location
    let dockerfilePath = `${workDir}/Dockerfile`;
    try {
      execSync(`test -f ${dockerfilePath}`, { stdio: 'pipe' });
    } catch {
      dockerfilePath = `${workDir}/docker/Dockerfile.api`;
    }

    // Build
    execSync(`docker build -t ${imageName} -f ${dockerfilePath} ${workDir}/api`, {
      stdio: 'pipe',
      timeout: 120000
    });

    // Run
    const output = execSync(
      `docker run -d -p ${port}:3000 ${imageName}`,
      { encoding: 'utf-8' }
    ).trim();

    return {
      containerId: output,
      port,
      image: imageName,
      startedAt: new Date()
    };
  }

  /**
   * Czeka aż kontener będzie healthy
   */
  async waitForHealthy(port: number): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.healthCheckTimeout) {
      try {
        const result = await this.httpRequest('GET', `http://localhost:${port}/health`);
        if (result.status === 200) {
          return true;
        }
      } catch {
        // Ignoruj błędy - kontener może jeszcze nie być gotowy
      }

      await this.sleep(this.healthCheckInterval);
    }

    return false;
  }

  /**
   * Testuje endpoints dla każdej encji
   */
  async testEndpoints(port: number, entities: EntityDefinition[]): Promise<EndpointTestResult[]> {
    const results: EndpointTestResult[] = [];
    const baseUrl = `http://localhost:${port}`;

    // Test health endpoint
    results.push(await this.testEndpoint(baseUrl, 'GET', '/health', 200));

    // Test CRUD dla każdej encji
    for (const entity of entities) {
      const kebab = entity.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
      const plural = kebab.endsWith('y') ? kebab.slice(0, -1) + 'ies' : kebab + 's';
      const endpoint = `/api/${plural}`;

      // GET list
      results.push(await this.testEndpoint(baseUrl, 'GET', endpoint, 200));

      // POST create
      const createResult = await this.testEndpoint(
        baseUrl, 
        'POST', 
        endpoint, 
        201,
        { name: `Test ${entity.name}` }
      );
      results.push(createResult);

      // GET single (jeśli create się udał)
      if (createResult.passed) {
        results.push(await this.testEndpoint(baseUrl, 'GET', `${endpoint}/1`, 200));
      }

      // PUT update
      results.push(await this.testEndpoint(
        baseUrl,
        'PUT',
        `${endpoint}/1`,
        200,
        { name: 'Updated' }
      ));

      // DELETE
      results.push(await this.testEndpoint(baseUrl, 'DELETE', `${endpoint}/1`, 204));
    }

    return results;
  }

  /**
   * Testuje pojedynczy endpoint
   */
  async testEndpoint(
    baseUrl: string,
    method: string,
    path: string,
    expectedStatus: number,
    body?: any
  ): Promise<EndpointTestResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.httpRequest(method, `${baseUrl}${path}`, body);
      
      return {
        endpoint: path,
        method,
        expectedStatus,
        actualStatus: result.status,
        passed: result.status === expectedStatus,
        responseTime: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        endpoint: path,
        method,
        expectedStatus,
        actualStatus: 0,
        passed: false,
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Wykonuje HTTP request
   */
  httpRequest(
    method: string, 
    url: string, 
    body?: any
  ): Promise<{ status: number; data: any }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 0,
              data: data ? JSON.parse(data) : null
            });
          } catch {
            resolve({
              status: res.statusCode || 0,
              data
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  /**
   * Cleanup - usuwa kontener
   */
  async cleanup(containerId: string): Promise<void> {
    try {
      execSync(`docker stop ${containerId}`, { stdio: 'pipe' });
      execSync(`docker rm ${containerId}`, { stdio: 'pipe' });
    } catch {
      // Ignoruj błędy cleanup
    }
  }

  /**
   * Zwraca losowy port z zakresu 10000-60000
   */
  private getRandomPort(): number {
    return Math.floor(Math.random() * 50000) + 10000;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Tworzy wynik
   */
  private createResult(
    errors: StageResult['errors'],
    warnings: StageResult['warnings'],
    startTime: number
  ): StageResult {
    return {
      stage: this.name,
      passed: errors.length === 0,
      errors,
      warnings,
      timeMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createRuntimeValidator(): RuntimeValidator {
  return new RuntimeValidator();
}
