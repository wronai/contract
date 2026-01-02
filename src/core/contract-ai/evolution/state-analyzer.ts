/**
 * State Analyzer
 * 
 * Multi-level state analysis: Contract ↔ SourceCode ↔ Service ↔ Logs
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContractAI } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface StateDiscrepancy {
  level: 'contract-code' | 'code-service' | 'service-logs';
  severity: 'info' | 'warning' | 'error';
  source: string;
  expected: string;
  actual: string;
  suggestion: string;
}

export interface MultiLevelState {
  contract: {
    entities: string[];
    endpoints: string[];
    targets: string[];
  };
  sourceCode: {
    files: string[];
    detectedEndpoints: string[];
    detectedEntities: string[];
  };
  service: {
    running: boolean;
    healthEndpoint: boolean;
    respondingEndpoints: string[];
  };
  logs: {
    errors: string[];
    warnings: string[];
    lastActivity: string | null;
  };
  discrepancies: StateDiscrepancy[];
  reconciled: boolean;
}

// ============================================================================
// STATE ANALYZER CLASS
// ============================================================================

export class StateAnalyzer {
  private outputDir: string;
  private port: number;

  constructor(outputDir: string, port: number) {
    this.outputDir = outputDir;
    this.port = port;
  }

  analyzeContract(): { entities: string[]; endpoints: string[]; targets: string[] } {
    const contractPath = path.join(this.outputDir, 'contract', 'contract.ai.json');
    if (!fs.existsSync(contractPath)) {
      return { entities: [], endpoints: [], targets: [] };
    }

    try {
      const contract = JSON.parse(fs.readFileSync(contractPath, 'utf-8')) as ContractAI;
      const entities = (contract.definition?.entities || []).map(e => e.name);
      const targets = Array.from(new Set(
        (contract.generation?.instructions || [])
          .map(i => i.target)
          .filter(t => t && t !== 'all')
      ));
      
      const endpoints: string[] = ['/health'];
      for (const entity of entities) {
        const plural = entity.toLowerCase() + 's';
        endpoints.push(`GET /${plural}`, `POST /${plural}`, `GET /${plural}/:id`, `PUT /${plural}/:id`, `DELETE /${plural}/:id`);
      }

      return { entities, endpoints, targets };
    } catch {
      return { entities: [], endpoints: [], targets: [] };
    }
  }

  analyzeSourceCode(): { files: string[]; detectedEndpoints: string[]; detectedEntities: string[] } {
    const files: string[] = [];
    const detectedEndpoints: string[] = [];
    const detectedEntities: string[] = [];

    const apiDir = path.join(this.outputDir, 'api');
    if (fs.existsSync(apiDir)) {
      this.scanDir(apiDir, files);
    }

    const serverPath = path.join(this.outputDir, 'api', 'src', 'server.ts');
    if (fs.existsSync(serverPath)) {
      const content = fs.readFileSync(serverPath, 'utf-8');
      
      const routePatterns = content.matchAll(/app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi);
      for (const match of routePatterns) {
        detectedEndpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
      }

      const entityPatterns = content.matchAll(/(?:const|let)\s+(\w+)s?\s*(?:=\s*new\s+Map|:\s*\w+\[\]|=\s*\[\])/gi);
      for (const match of entityPatterns) {
        const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        if (!['Next', 'Result', 'Error'].includes(name)) {
          detectedEntities.push(name);
        }
      }

      const interfacePatterns = content.matchAll(/interface\s+(\w+)\s*\{/g);
      for (const match of interfacePatterns) {
        if (!['Request', 'Response', 'TestResult'].includes(match[1])) {
          detectedEntities.push(match[1]);
        }
      }
    }

    return { 
      files: files.map(f => f.replace(this.outputDir + '/', '')), 
      detectedEndpoints: [...new Set(detectedEndpoints)],
      detectedEntities: [...new Set(detectedEntities)]
    };
  }

  private scanDir(dir: string, files: string[]): void {
    try {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && !entry.includes('node_modules')) {
          this.scanDir(fullPath, files);
        } else if (stat.isFile()) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  async analyzeService(): Promise<{ running: boolean; healthEndpoint: boolean; respondingEndpoints: string[] }> {
    const result = { running: false, healthEndpoint: false, respondingEndpoints: [] as string[] };

    try {
      const healthRes = await fetch(`http://localhost:${this.port}/health`, { signal: AbortSignal.timeout(2000) });
      result.running = true;
      result.healthEndpoint = healthRes.ok;
    } catch {
      return result;
    }

    const testEndpoints = ['/', '/api', '/todos', '/items', '/users'];
    for (const endpoint of testEndpoints) {
      try {
        const res = await fetch(`http://localhost:${this.port}${endpoint}`, { 
          method: 'GET',
          signal: AbortSignal.timeout(1000) 
        });
        if (res.ok || res.status === 200 || res.status === 404) {
          result.respondingEndpoints.push(`GET ${endpoint}`);
        }
      } catch {
        // Endpoint not responding
      }
    }

    return result;
  }

  analyzeLogs(): { errors: string[]; warnings: string[]; lastActivity: string | null } {
    const logsDir = path.join(this.outputDir, 'logs');
    const errors: string[] = [];
    const warnings: string[] = [];
    let lastActivity: string | null = null;

    if (!fs.existsSync(logsDir)) {
      return { errors, warnings, lastActivity };
    }

    try {
      const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log') || f.endsWith('.md'));
      for (const file of logFiles.slice(-3)) {
        const content = fs.readFileSync(path.join(logsDir, file), 'utf-8');
        
        const errorMatches = content.matchAll(/(?:error|Error|ERROR)[:\s]+(.+?)(?:\n|$)/g);
        for (const match of errorMatches) {
          errors.push(match[1].substring(0, 100));
        }

        const warnMatches = content.matchAll(/(?:warn|Warning|WARN)[:\s]+(.+?)(?:\n|$)/g);
        for (const match of warnMatches) {
          warnings.push(match[1].substring(0, 100));
        }

        const timeMatches = content.matchAll(/(\d{4}-\d{2}-\d{2}T[\d:]+)/g);
        for (const match of timeMatches) {
          lastActivity = match[1];
        }
      }
    } catch {
      // Ignore errors
    }

    return { errors: errors.slice(-10), warnings: warnings.slice(-10), lastActivity };
  }

  findDiscrepancies(
    contract: ReturnType<typeof this.analyzeContract>,
    sourceCode: ReturnType<typeof this.analyzeSourceCode>,
    service: Awaited<ReturnType<typeof this.analyzeService>>,
    logs: ReturnType<typeof this.analyzeLogs>
  ): StateDiscrepancy[] {
    const discrepancies: StateDiscrepancy[] = [];

    for (const entity of contract.entities) {
      const found = sourceCode.detectedEntities.some(e => 
        e.toLowerCase() === entity.toLowerCase() || 
        e.toLowerCase().includes(entity.toLowerCase())
      );
      if (!found) {
        discrepancies.push({
          level: 'contract-code',
          severity: 'error',
          source: 'contract.entities',
          expected: `Entity "${entity}" defined in contract`,
          actual: `Entity not found in source code`,
          suggestion: `Add ${entity} model and CRUD endpoints to server.ts`
        });
      }
    }

    for (const endpoint of contract.endpoints) {
      const found = sourceCode.detectedEndpoints.some(e => 
        e.toLowerCase().includes(endpoint.split(' ')[1]?.toLowerCase() || '')
      );
      if (!found && !endpoint.includes(':id')) {
        discrepancies.push({
          level: 'contract-code',
          severity: 'warning',
          source: 'contract.endpoints',
          expected: endpoint,
          actual: 'Endpoint not found in source code',
          suggestion: `Add ${endpoint} handler to server.ts`
        });
      }
    }

    if (service.running) {
      for (const endpoint of sourceCode.detectedEndpoints.slice(0, 5)) {
        const method = endpoint.split(' ')[0];
        const path = endpoint.split(' ')[1];
        if (method === 'GET' && path && !path.includes(':')) {
          const found = service.respondingEndpoints.some(e => e.includes(path));
          if (!found) {
            discrepancies.push({
              level: 'code-service',
              severity: 'warning',
              source: 'sourceCode.endpoints',
              expected: `${endpoint} should respond`,
              actual: 'Endpoint not responding or returning errors',
              suggestion: 'Check if service started correctly and endpoint is registered'
            });
          }
        }
      }
    } else {
      discrepancies.push({
        level: 'code-service',
        severity: 'error',
        source: 'service.running',
        expected: 'Service should be running',
        actual: 'Service is not running',
        suggestion: 'Start the service with npm start or check for startup errors'
      });
    }

    if (logs.errors.length > 0) {
      discrepancies.push({
        level: 'service-logs',
        severity: 'error',
        source: 'logs.errors',
        expected: 'No errors in logs',
        actual: `${logs.errors.length} errors found: ${logs.errors[0]}`,
        suggestion: 'Fix the errors shown in logs'
      });
    }

    return discrepancies;
  }

  async analyze(): Promise<MultiLevelState> {
    const contract = this.analyzeContract();
    const sourceCode = this.analyzeSourceCode();
    const service = await this.analyzeService();
    const logs = this.analyzeLogs();
    const discrepancies = this.findDiscrepancies(contract, sourceCode, service, logs);

    return {
      contract,
      sourceCode,
      service,
      logs,
      discrepancies,
      reconciled: discrepancies.filter(d => d.severity === 'error').length === 0
    };
  }

  generateReconciliationPlan(state: MultiLevelState): string[] {
    const plan: string[] = [];

    const contractCode = state.discrepancies.filter(d => d.level === 'contract-code');
    const codeService = state.discrepancies.filter(d => d.level === 'code-service');
    const serviceLogs = state.discrepancies.filter(d => d.level === 'service-logs');

    if (contractCode.length > 0) {
      plan.push('Contract ↔ Code reconciliation needed:');
      for (const d of contractCode) {
        plan.push(`  - ${d.suggestion}`);
      }
    }

    if (codeService.length > 0) {
      plan.push('Code ↔ Service reconciliation needed:');
      for (const d of codeService) {
        plan.push(`  - ${d.suggestion}`);
      }
    }

    if (serviceLogs.length > 0) {
      plan.push('Service ↔ Logs reconciliation needed:');
      for (const d of serviceLogs) {
        plan.push(`  - ${d.suggestion}`);
      }
    }

    if (plan.length === 0) {
      plan.push('All levels are reconciled - no discrepancies found');
    }

    return plan;
  }
}

export default StateAnalyzer;
