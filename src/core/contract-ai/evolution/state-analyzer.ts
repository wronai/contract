/**
 * State Analyzer
 * 
 * Multi-level state analysis: Contract ↔ SourceCode ↔ Service ↔ Logs
 * 
 * @version 2.4.1
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
    port: number;
    running: boolean;
    healthEndpoint: boolean;
    respondingEndpoints: string[];
    probes: Array<{ endpoint: string; ok: boolean; status?: number; error?: string }>;
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

  setPort(port: number): void {
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
      
      const apiPrefix = contract.definition?.api?.prefix || '/api/v1';
      const resources: any[] = (contract.definition?.api as any)?.resources || [];

      const endpoints: string[] = ['GET /health'];

      for (const r of resources) {
        const name = String(r?.name || '').trim();
        if (!name) continue;
        const base = `${apiPrefix}/${name}`.replace(/\/+/g, '/');
        const ops: string[] = Array.isArray(r?.operations) ? r.operations : [];

        if (ops.includes('list')) endpoints.push(`GET ${base}`);
        if (ops.includes('create')) endpoints.push(`POST ${base}`);
        if (ops.includes('get')) endpoints.push(`GET ${base}/:id`);
        if (ops.includes('update')) endpoints.push(`PUT ${base}/:id`);
        if (ops.includes('delete')) endpoints.push(`DELETE ${base}/:id`);

        const custom: any[] = Array.isArray(r?.customEndpoints) ? r.customEndpoints : [];
        for (const c of custom) {
          const method = String(c?.method || 'GET').toUpperCase();
          const rel = String(c?.path || '').startsWith('/') ? String(c?.path || '') : `/${String(c?.path || '')}`;
          const full = `${base}${rel}`.replace(/\/+/g, '/');
          endpoints.push(`${method} ${full}`);
        }
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

  async analyzeService(endpointsToProbe: string[]): Promise<{ running: boolean; healthEndpoint: boolean; respondingEndpoints: string[]; probes: Array<{ endpoint: string; ok: boolean; status?: number; error?: string }>; port: number }> {
    const result = { running: false, healthEndpoint: false, respondingEndpoints: [] as string[], probes: [] as Array<{ endpoint: string; ok: boolean; status?: number; error?: string }>, port: this.port };

    const probe = async (endpoint: string, method: string, urlPath: string, timeoutMs: number): Promise<void> => {
      try {
        const res = await fetch(`http://localhost:${this.port}${urlPath}`, {
          method,
          signal: AbortSignal.timeout(timeoutMs)
        });
        const ok = res.ok;
        result.probes.push({ endpoint, ok, status: res.status });
        if (ok) result.respondingEndpoints.push(endpoint);
      } catch (e: any) {
        result.probes.push({ endpoint, ok: false, error: (e && e.message) ? String(e.message) : String(e) });
      }
    };

    // Health probe defines "running" (server responded)
    try {
      const res = await fetch(`http://localhost:${this.port}/health`, { signal: AbortSignal.timeout(2000) });
      result.running = true;
      result.healthEndpoint = res.ok;
      result.probes.push({ endpoint: 'GET /health', ok: res.ok, status: res.status });
      if (res.ok) result.respondingEndpoints.push('GET /health');
    } catch (e: any) {
      result.probes.push({ endpoint: 'GET /health', ok: false, error: (e && e.message) ? String(e.message) : String(e) });
      return result;
    }

    const unique = Array.from(new Set(endpointsToProbe || []));
    const candidates = unique
      .map(s => String(s || '').trim())
      .filter(s => s.includes(' '))
      .slice(0, 20);

    for (const ep of candidates) {
      const [methodRaw, pathRaw] = ep.split(' ', 2);
      const method = String(methodRaw || '').toUpperCase();
      const urlPath = String(pathRaw || '').trim();
      if (method !== 'GET') continue;
      if (!urlPath.startsWith('/')) continue;
      if (urlPath.includes(':')) continue;
      if (urlPath === '/health') continue;
      await probe(`GET ${urlPath}`, 'GET', urlPath, 1500);
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
      const logFiles = fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.rcl.md') || f.endsWith('.log'))
        .map(f => ({
          file: f,
          mtime: fs.statSync(path.join(logsDir, f)).mtimeMs
        }))
        .sort((a, b) => a.mtime - b.mtime)
        .slice(-2)
        .map(x => x.file);

      for (const file of logFiles) {
        const content = fs.readFileSync(path.join(logsDir, file), 'utf-8');
        const tail = content.split('\n').slice(-250);

        for (const line of tail) {
          const t = (line || '').trim();
          if (!t) continue;
          if (t.startsWith('```')) continue;
          if (t.startsWith('# @type')) continue;
          if (t.includes('[error]') || t.startsWith('Error:') || t.includes('EADDRINUSE') || t.includes('TSError') || t.includes('Exception')) {
            errors.push(t.substring(0, 160));
          }
          if (t.includes('[warn]') || t.startsWith('Warning:') || t.startsWith('WARN') || t.includes('Deprecation')) {
            warnings.push(t.substring(0, 160));
          }

          const m = t.match(/(\d{4}-\d{2}-\d{2}T[\d:]+)/);
          if (m) lastActivity = m[1];
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

    const probeMap = new Map<string, { endpoint: string; ok: boolean; status?: number; error?: string }>();
    for (const p of (service as any).probes || []) {
      probeMap.set(String(p.endpoint), p);
    }

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
      // Health must respond if service is marked running
      if (!service.healthEndpoint) {
        const healthProbe = probeMap.get('GET /health');
        discrepancies.push({
          level: 'code-service',
          severity: 'error',
          source: 'service.health',
          expected: 'GET /health should respond',
          actual: healthProbe?.error ? `health probe error: ${healthProbe.error}` : `health status: ${healthProbe?.status ?? 'unknown'}`,
          suggestion: 'Ensure the server registers /health and is listening on the configured port'
        });
      }

      const expectedGets = contract.endpoints
        .map(e => String(e || '').trim())
        .filter(e => e.startsWith('GET '))
        .filter(e => !e.includes(':id'))
        .filter(e => e !== 'GET /health');

      for (const ep of expectedGets.slice(0, 10)) {
        // Only validate endpoints that exist in source code (avoid false positives from contract)
        const existsInCode = sourceCode.detectedEndpoints.includes(ep);
        if (!existsInCode) continue;

        const probe = probeMap.get(ep);
        if (!probe || !probe.ok) {
          const actual = probe
            ? (probe.error ? `probe error: ${probe.error}` : `status: ${probe.status ?? 'unknown'}`)
            : 'not probed';
          discrepancies.push({
            level: 'code-service',
            severity: 'warning',
            source: 'service.probe',
            expected: `${ep} should respond`,
            actual,
            suggestion: 'Check route registration, API prefix, and that the service is still running'
          });
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
      const criticalPatterns = [
        'TSError',
        'Unable to compile TypeScript',
        'Cannot find module',
        'Cannot find name',
        'UnhandledPromiseRejection',
        'ReferenceError',
        'TypeError',
        'SyntaxError',
        'Exception'
      ];
      const critical = logs.errors.filter(e => criticalPatterns.some(p => String(e).includes(p)));
      const severity: StateDiscrepancy['severity'] = critical.length > 0 ? 'error' : 'warning';
      const sample = (critical.length > 0 ? critical : logs.errors)[(critical.length > 0 ? critical : logs.errors).length - 1];
      discrepancies.push({
        level: 'service-logs',
        severity,
        source: 'logs.errors',
        expected: severity === 'error' ? 'No critical errors in logs' : 'No recent warnings in logs',
        actual: `${logs.errors.length} log issues detected. Example: ${String(sample || '').substring(0, 160)}`,
        suggestion: severity === 'error'
          ? 'Fix the critical errors shown in logs'
          : 'Investigate warnings; if they are historical, clear logs or rotate to reduce noise'
      });
    }

    return discrepancies;
  }

  async analyze(): Promise<MultiLevelState> {
    const contract = this.analyzeContract();
    const sourceCode = this.analyzeSourceCode();
    const service = await this.analyzeService(sourceCode.detectedEndpoints);
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
