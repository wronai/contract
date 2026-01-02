/**
 * Evolution Manager
 * 
 * Manages dynamic code generation, service monitoring, and hot-reload.
 * Enables continuous evolution of applications based on Contract AI.
 * 
 * @version 2.3.1
 */

import { ContractAI, GeneratedCode, GeneratedFile } from '../types';
import { LLMClient } from '../generator/contract-generator';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface EvolutionOptions {
  outputDir: string;
  port: number;
  verbose: boolean;
  maxEvolutionCycles: number;
  healthCheckInterval: number;
  logAnalysisInterval: number;
  autoRestart: boolean;
}

export interface ServiceStatus {
  running: boolean;
  pid?: number;
  port: number;
  healthy: boolean;
  lastCheck: Date;
  errors: string[];
  warnings: string[];
}

export interface EvolutionCycle {
  cycle: number;
  timestamp: Date;
  trigger: 'initial' | 'error' | 'log-analysis' | 'manual';
  changes: FileChange[];
  result: 'success' | 'failure';
  logs: string[];
}

export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  reason: string;
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: string;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: EvolutionOptions = {
  outputDir: './generated',
  port: 3000,
  verbose: false,
  maxEvolutionCycles: 10,
  healthCheckInterval: 5000,
  logAnalysisInterval: 10000,
  autoRestart: true
};

// ============================================================================
// EVOLUTION MANAGER
// ============================================================================

export class EvolutionManager {
  private options: EvolutionOptions;
  private llmClient: LLMClient | null = null;
  private contract: ContractAI | null = null;
  private serviceProcess: ChildProcess | null = null;
  private evolutionHistory: EvolutionCycle[] = [];
  private serviceLogs: LogEntry[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private logAnalysisTimer: NodeJS.Timeout | null = null;

  constructor(options: Partial<EvolutionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Sets LLM client for code generation
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * Sets the contract for evolution
   */
  setContract(contract: ContractAI): void {
    this.contract = contract;
  }

  /**
   * Starts the evolution lifecycle from a prompt (without pre-generated contract)
   */
  async startFromPrompt(prompt: string): Promise<void> {
    if (this.options.verbose) {
      console.log('\n🧬 Starting Evolution Manager (from prompt)');
      console.log(`   Prompt: ${prompt}`);
      console.log(`   Output: ${this.options.outputDir}`);
      console.log(`   Port: ${this.options.port}`);
    }

    // Create a minimal contract from prompt
    this.contract = this.createMinimalContract(prompt);

    // Generate code directly
    const code = await this.generateCode('initial');

    // Write files
    await this.writeFiles(code.files);

    // Start service
    await this.startService();

    // Start monitoring
    this.startMonitoring();

    // Log evolution cycle
    this.logEvolutionCycle({
      cycle: 0,
      timestamp: new Date(),
      trigger: 'initial',
      changes: code.files.map(f => ({
        path: f.path,
        action: 'create' as const,
        reason: 'Initial generation from prompt'
      })),
      result: 'success',
      logs: ['Initial code generation complete']
    });
  }

  /**
   * Creates a minimal contract from prompt
   */
  private createMinimalContract(prompt: string): ContractAI {
    // Extract entity names from prompt
    const words = prompt.toLowerCase().split(/\s+/);
    const entityKeywords = ['app', 'application', 'system', 'service', 'api'];
    let mainEntity = 'Item';
    
    for (let i = 0; i < words.length; i++) {
      if (entityKeywords.includes(words[i]) && i > 0) {
        mainEntity = words[i - 1].charAt(0).toUpperCase() + words[i - 1].slice(1);
        break;
      }
    }

    return {
      definition: {
        app: {
          name: `${mainEntity} App`,
          version: '1.0.0',
          description: prompt
        },
        entities: [{
          name: mainEntity,
          fields: [
            { name: 'id', type: 'UUID', annotations: { primary: true } },
            { name: 'name', type: 'String', annotations: { required: true } },
            { name: 'createdAt', type: 'DateTime', annotations: {} },
            { name: 'updatedAt', type: 'DateTime', annotations: {} }
          ],
          relations: []
        }],
        events: [],
        api: { resources: [] }
      },
      generation: {
        instructions: [{ target: 'api', priority: 'must', content: prompt }],
        patterns: [],
        constraints: [],
        techStack: {
          backend: { framework: 'express', language: 'typescript', runtime: 'node' }
        }
      },
      validation: {
        assertions: [],
        tests: [],
        acceptance: { criteria: [], qualityGates: [] }
      }
    } as ContractAI;
  }

  /**
   * Starts the evolution lifecycle
   */
  async start(contract: ContractAI, initialCode?: GeneratedCode): Promise<void> {
    this.contract = contract;
    
    if (this.options.verbose) {
      console.log('\n🧬 Starting Evolution Manager');
      console.log(`   Output: ${this.options.outputDir}`);
      console.log(`   Port: ${this.options.port}`);
    }

    // Generate initial code if not provided
    let code = initialCode;
    if (!code) {
      code = await this.generateCode('initial');
    }

    // Write files
    await this.writeFiles(code.files);

    // Start service
    await this.startService();

    // Start monitoring
    this.startMonitoring();

    // Log evolution cycle
    this.logEvolutionCycle({
      cycle: 0,
      timestamp: new Date(),
      trigger: 'initial',
      changes: code.files.map(f => ({
        path: f.path,
        action: 'create' as const,
        reason: 'Initial generation'
      })),
      result: 'success',
      logs: ['Initial code generation complete']
    });
  }

  /**
   * Generates code using LLM based on contract
   */
  async generateCode(trigger: EvolutionCycle['trigger'], context?: string): Promise<GeneratedCode> {
    if (!this.contract) {
      throw new Error('Contract not set');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(trigger, context);

    if (this.options.verbose) {
      console.log(`\n🤖 Generating code (trigger: ${trigger})...`);
    }

    let response: string;
    
    if (this.llmClient) {
      response = await this.llmClient.generate({
        system: systemPrompt,
        user: userPrompt,
        temperature: 0.3,
        maxTokens: 8000
      });
    } else {
      // Fallback to template-based generation
      response = this.generateFallbackCode();
    }

    const files = this.parseFilesFromResponse(response);

    return {
      files,
      contract: this.contract,
      metadata: {
        generatedAt: new Date(),
        targets: ['api', 'tests'],
        tokensUsed: 0,
        timeMs: 0
      }
    };
  }

  /**
   * Builds system prompt for LLM
   */
  private buildSystemPrompt(): string {
    return `You are an expert backend developer. Generate production-ready TypeScript code for Express.js APIs.

RULES:
1. Generate complete, working code - no TODOs or placeholders
2. Use TypeScript with proper types
3. Include error handling and validation
4. Use in-memory storage with Map for data
5. Include health check endpoint at /health
6. Include CRUD endpoints for all entities
7. Use proper HTTP status codes
8. Format output as markdown code blocks with file paths

OUTPUT FORMAT:
\`\`\`typescript:api/src/server.ts
// server code
\`\`\`

\`\`\`typescript:api/src/routes/entity.ts
// route code
\`\`\`

\`\`\`json:api/package.json
// dependencies
\`\`\``;
  }

  /**
   * Builds user prompt based on contract and context
   */
  private buildUserPrompt(trigger: EvolutionCycle['trigger'], context?: string): string {
    if (!this.contract) return '';

    const entities = this.contract.definition.entities
      .map(e => `- ${e.name}: ${e.fields.map(f => f.name).join(', ')}`)
      .join('\n');

    let prompt = `Generate a REST API for the following entities:

${entities}

Requirements:
- Express.js with TypeScript
- In-memory storage using Map
- CRUD operations for each entity
- Health check endpoint at /health
- Proper error handling
- Input validation

IMPORTANT - Use EXACTLY these package versions in package.json:
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.14",
    "@types/express": "^4.17.20",
    "@types/node": "^20.9.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.0"
  }
}

DO NOT include socket.io or any other packages not listed above.
DO NOT include comments in package.json - JSON does not support comments.
`;

    if (trigger === 'error' && context) {
      prompt += `\n\nFIX THE FOLLOWING ERROR:\n${context}\n\nGenerate corrected code.`;
    }

    if (trigger === 'log-analysis' && context) {
      prompt += `\n\nADDRESS THE FOLLOWING LOG ISSUES:\n${context}\n\nGenerate improved code.`;
    }

    return prompt;
  }

  /**
   * Parses files from LLM response
   */
  private parseFilesFromResponse(response: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const fileRegex = /```(?:typescript|javascript|json):(.+?)\n([\s\S]*?)```/g;

    let match;
    while ((match = fileRegex.exec(response)) !== null) {
      const filePath = match[1].trim();
      let content = match[2].trim();
      const target = filePath.startsWith('api/') ? 'api' : 
                    filePath.startsWith('tests/') ? 'tests' : 
                    filePath.startsWith('frontend/') ? 'frontend' : 'api';

      // Strip comments from JSON files
      if (filePath.endsWith('.json')) {
        content = this.stripJsonComments(content);
      }

      files.push({ path: filePath, content, target });
    }

    return files;
  }

  /**
   * Strips comments from JSON content
   */
  private stripJsonComments(json: string): string {
    // Remove single-line comments
    let result = json.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove empty lines
    result = result.replace(/^\s*[\r\n]/gm, '');
    return result.trim();
  }

  /**
   * Writes files to disk
   */
  async writeFiles(files: GeneratedFile[]): Promise<void> {
    for (const file of files) {
      const fullPath = path.join(this.options.outputDir, file.path);
      const dir = path.dirname(fullPath);

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, file.content, 'utf-8');

      if (this.options.verbose) {
        console.log(`   📝 ${file.path}`);
      }
    }
  }

  /**
   * Starts the service
   */
  async startService(): Promise<void> {
    const apiDir = path.join(this.options.outputDir, 'api');
    
    if (!fs.existsSync(path.join(apiDir, 'package.json'))) {
      if (this.options.verbose) {
        console.log('   ⚠️ No package.json, skipping service start');
      }
      return;
    }

    // Install dependencies
    if (this.options.verbose) {
      console.log('\n📦 Installing dependencies...');
    }

    await this.runCommand('npm', ['install'], apiDir);

    // Start server
    if (this.options.verbose) {
      console.log(`\n🚀 Starting service on port ${this.options.port}...`);
    }

    const env = this.getNodeEnv();
    env.PORT = String(this.options.port);
    
    this.serviceProcess = spawn('npx', ['ts-node', 'src/server.ts'], {
      cwd: apiDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Capture logs
    this.serviceProcess.stdout?.on('data', (data) => {
      const message = data.toString().trim();
      this.addLog('info', message, 'service');
      if (this.options.verbose) {
        console.log(`   [service] ${message}`);
      }
    });

    this.serviceProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      this.addLog('error', message, 'service');
      if (this.options.verbose) {
        console.log(`   [error] ${message}`);
      }
    });

    this.serviceProcess.on('exit', (code) => {
      if (this.options.verbose) {
        console.log(`   Service exited with code ${code}`);
      }
    });

    // Wait for service to be ready
    const healthy = await this.waitForHealth();
    
    // If service failed to start, try to fix with evolution
    if (!healthy && this.evolutionHistory.length < this.options.maxEvolutionCycles) {
      const recentErrors = this.getRecentErrors();
      if (recentErrors.length > 0) {
        if (this.options.verbose) {
          console.log('\n⚠️ Service failed to start. Attempting auto-fix...');
        }
        
        // Use fallback code instead of LLM for reliability
        const fallbackResponse = this.generateFallbackCode();
        const files = this.parseFilesFromResponse(fallbackResponse);
        
        await this.stopService();
        await this.writeFiles(files);
        
        // Retry npm install and start
        const apiDir = path.join(this.options.outputDir, 'api');
        await this.runCommand('npm', ['install'], apiDir);
        
        const env = this.getNodeEnv();
        env.PORT = String(this.options.port);
        
        this.serviceProcess = spawn('npx', ['ts-node', 'src/server.ts'], {
          cwd: apiDir,
          env,
          stdio: ['ignore', 'pipe', 'pipe']
        });

        this.serviceProcess.stdout?.on('data', (data) => {
          const message = data.toString().trim();
          this.addLog('info', message, 'service');
          if (this.options.verbose) {
            console.log(`   [service] ${message}`);
          }
        });

        this.serviceProcess.stderr?.on('data', (data) => {
          const message = data.toString().trim();
          this.addLog('error', message, 'service');
        });

        await this.waitForHealth();

        this.logEvolutionCycle({
          cycle: this.evolutionHistory.length,
          timestamp: new Date(),
          trigger: 'error',
          changes: files.map(f => ({ path: f.path, action: 'update' as const, reason: 'Auto-fix from compilation errors' })),
          result: 'success',
          logs: recentErrors.map(e => e.message).slice(0, 5)
        });
      }
    }
  }

  /**
   * Stops the service
   */
  async stopService(): Promise<void> {
    if (this.serviceProcess) {
      this.serviceProcess.kill();
      this.serviceProcess = null;
      
      if (this.options.verbose) {
        console.log('   🛑 Service stopped');
      }
    }
  }

  /**
   * Restarts the service
   */
  async restartService(): Promise<void> {
    if (this.options.verbose) {
      console.log('\n🔄 Restarting service...');
    }
    
    await this.stopService();
    await this.startService();
  }

  /**
   * Waits for service health check
   */
  private async waitForHealth(maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`http://localhost:${this.options.port}/health`);
        if (response.ok) {
          if (this.options.verbose) {
            console.log('   ✅ Service is healthy');
          }
          return true;
        }
      } catch {
        // Service not ready yet
      }
      await this.sleep(1000);
    }
    return false;
  }

  /**
   * Starts monitoring loops
   */
  private startMonitoring(): void {
    // Health check loop
    this.healthCheckTimer = setInterval(async () => {
      const healthy = await this.checkHealth();
      if (!healthy && this.options.autoRestart) {
        await this.handleHealthFailure();
      }
    }, this.options.healthCheckInterval);

    // Log analysis loop
    this.logAnalysisTimer = setInterval(async () => {
      const issues = this.analyzeRecentLogs();
      if (issues.length > 0) {
        await this.handleLogIssues(issues);
      }
    }, this.options.logAnalysisInterval);
  }

  /**
   * Stops monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.logAnalysisTimer) {
      clearInterval(this.logAnalysisTimer);
      this.logAnalysisTimer = null;
    }
  }

  /**
   * Checks service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.options.port}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Handles health check failure
   */
  private async handleHealthFailure(): Promise<void> {
    if (this.options.verbose) {
      console.log('\n⚠️ Health check failed, attempting recovery...');
    }

    const recentErrors = this.getRecentErrors();
    
    if (recentErrors.length > 0) {
      // Try to fix errors through code regeneration
      const errorContext = recentErrors.map(e => e.message).join('\n');
      const newCode = await this.generateCode('error', errorContext);
      
      await this.stopService();
      await this.writeFiles(newCode.files);
      await this.startService();

      this.logEvolutionCycle({
        cycle: this.evolutionHistory.length,
        timestamp: new Date(),
        trigger: 'error',
        changes: newCode.files.map(f => ({
          path: f.path,
          action: 'update' as const,
          reason: `Fix error: ${errorContext.substring(0, 100)}`
        })),
        result: 'success',
        logs: recentErrors.map(e => e.message)
      });
    } else {
      // Simple restart
      await this.restartService();
    }
  }

  /**
   * Analyzes recent logs for issues
   */
  private analyzeRecentLogs(): string[] {
    const issues: string[] = [];
    const recentLogs = this.serviceLogs.slice(-50);

    for (const log of recentLogs) {
      if (log.level === 'error') {
        issues.push(log.message);
      }
      // Check for warning patterns
      if (log.message.includes('deprecated')) {
        issues.push(`Deprecation warning: ${log.message}`);
      }
      if (log.message.includes('memory')) {
        issues.push(`Memory issue: ${log.message}`);
      }
    }

    return issues;
  }

  /**
   * Handles log issues through evolution
   */
  private async handleLogIssues(issues: string[]): Promise<void> {
    if (this.evolutionHistory.length >= this.options.maxEvolutionCycles) {
      if (this.options.verbose) {
        console.log('   Max evolution cycles reached, skipping auto-fix');
      }
      return;
    }

    if (this.options.verbose) {
      console.log(`\n🔍 Detected ${issues.length} issues in logs, evolving...`);
    }

    const context = issues.join('\n');
    const newCode = await this.generateCode('log-analysis', context);

    await this.stopService();
    await this.writeFiles(newCode.files);
    await this.startService();

    this.logEvolutionCycle({
      cycle: this.evolutionHistory.length,
      timestamp: new Date(),
      trigger: 'log-analysis',
      changes: newCode.files.map(f => ({
        path: f.path,
        action: 'update' as const,
        reason: 'Log analysis improvement'
      })),
      result: 'success',
      logs: issues
    });
  }

  /**
   * Adds a log entry
   */
  private addLog(level: LogEntry['level'], message: string, source: string): void {
    this.serviceLogs.push({
      timestamp: new Date(),
      level,
      message,
      source
    });

    // Keep only last 1000 logs
    if (this.serviceLogs.length > 1000) {
      this.serviceLogs = this.serviceLogs.slice(-1000);
    }
  }

  /**
   * Gets recent errors
   */
  private getRecentErrors(): LogEntry[] {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.serviceLogs.filter(
      log => log.level === 'error' && log.timestamp > fiveMinutesAgo
    );
  }

  /**
   * Logs an evolution cycle
   */
  private logEvolutionCycle(cycle: EvolutionCycle): void {
    this.evolutionHistory.push(cycle);
    this.writeEvolutionLog();
  }

  /**
   * Writes evolution log to .rcl.md file
   */
  private writeEvolutionLog(): void {
    const logDir = path.join(this.options.outputDir, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(logDir, `evolution_${timestamp}.rcl.md`);

    const content = this.generateEvolutionLogContent();
    fs.writeFileSync(logPath, content, 'utf-8');

    if (this.options.verbose) {
      console.log(`   📝 Evolution log: ${logPath}`);
    }
  }

  /**
   * Generates evolution log content
   */
  private generateEvolutionLogContent(): string {
    const lines: string[] = [
      '# Evolution Log',
      '',
      `> Generated by Reclapp Evolution Manager v2.3.1`,
      '',
      '## Summary',
      '',
      `| Property | Value |`,
      `|----------|-------|`,
      `| Total Cycles | ${this.evolutionHistory.length} |`,
      `| Last Update | ${new Date().toISOString()} |`,
      `| Service Port | ${this.options.port} |`,
      `| Output Dir | ${this.options.outputDir} |`,
      '',
      '---',
      '',
      '## Evolution History',
      ''
    ];

    for (const cycle of this.evolutionHistory) {
      lines.push(`### Cycle ${cycle.cycle} - ${cycle.trigger}`);
      lines.push('');
      lines.push(`- **Timestamp**: ${cycle.timestamp.toISOString()}`);
      lines.push(`- **Result**: ${cycle.result}`);
      lines.push(`- **Changes**: ${cycle.changes.length} files`);
      lines.push('');
      
      if (cycle.changes.length > 0) {
        lines.push('#### Files Changed');
        lines.push('');
        for (const change of cycle.changes) {
          lines.push(`- \`${change.path}\` (${change.action}): ${change.reason}`);
        }
        lines.push('');
      }

      if (cycle.logs.length > 0) {
        lines.push('#### Logs');
        lines.push('');
        lines.push('```');
        lines.push(cycle.logs.slice(0, 10).join('\n'));
        lines.push('```');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generates fallback code when LLM is not available
   */
  private generateFallbackCode(): string {
    if (!this.contract) return '';

    const entities = this.contract.definition.entities;
    const entity = entities[0];
    const entityName = entity?.name || 'Item';
    const lowerName = entityName.toLowerCase();
    const pluralName = lowerName + 's';

    return `
\`\`\`typescript:api/src/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage
const ${pluralName}: Map<string, any> = new Map();
let idCounter = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all
app.get('/api/v1/${pluralName}', (req, res) => {
  res.json(Array.from(${pluralName}.values()));
});

// GET by ID
app.get('/api/v1/${pluralName}/:id', (req, res) => {
  const item = ${pluralName}.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// POST create
app.post('/api/v1/${pluralName}', (req, res) => {
  const id = String(idCounter++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  ${pluralName}.set(id, item);
  res.status(201).json(item);
});

// PUT update
app.put('/api/v1/${pluralName}/:id', (req, res) => {
  if (!${pluralName}.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  const item = { ...${pluralName}.get(req.params.id), ...req.body, updatedAt: new Date().toISOString() };
  ${pluralName}.set(req.params.id, item);
  res.json(item);
});

// DELETE
app.delete('/api/v1/${pluralName}/:id', (req, res) => {
  if (!${pluralName}.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  ${pluralName}.delete(req.params.id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
\`\`\`

\`\`\`json:api/package.json
{
  "name": "generated-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.14",
    "@types/express": "^4.17.20",
    "@types/node": "^20.9.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.0"
  }
}
\`\`\`

\`\`\`json:api/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
\`\`\`
`;
  }

  /**
   * Gets environment with node/npm in PATH
   */
  private getNodeEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env };
    const homeDir = process.env.HOME || '';
    const nvmDir = path.join(homeDir, '.nvm', 'versions', 'node');
    
    // Add common node paths
    const nodePaths = [
      path.join(nvmDir, 'v20.19.5', 'bin'),
      path.join(nvmDir, 'v18.20.8', 'bin'),
      '/usr/local/bin',
      '/usr/bin'
    ];
    
    env.PATH = nodePaths.join(':') + ':' + (env.PATH || '');
    return env;
  }

  /**
   * Runs a command and returns output
   */
  private runCommand(cmd: string, args: string[], cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const env = this.getNodeEnv();
      const proc = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';
      
      proc.stdout?.on('data', (data) => { output += data.toString(); });
      proc.stderr?.on('data', (data) => { output += data.toString(); });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}: ${output}`));
        }
      });
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets service status
   */
  getStatus(): ServiceStatus {
    return {
      running: this.serviceProcess !== null,
      pid: this.serviceProcess?.pid,
      port: this.options.port,
      healthy: this.serviceProcess !== null,
      lastCheck: new Date(),
      errors: this.getRecentErrors().map(e => e.message),
      warnings: []
    };
  }

  /**
   * Gets evolution history
   */
  getHistory(): EvolutionCycle[] {
    return [...this.evolutionHistory];
  }

  /**
   * Manually triggers evolution
   */
  async evolve(reason: string): Promise<void> {
    if (this.options.verbose) {
      console.log(`\n🧬 Manual evolution triggered: ${reason}`);
    }

    const newCode = await this.generateCode('manual', reason);
    await this.stopService();
    await this.writeFiles(newCode.files);
    await this.startService();

    this.logEvolutionCycle({
      cycle: this.evolutionHistory.length,
      timestamp: new Date(),
      trigger: 'manual',
      changes: newCode.files.map(f => ({
        path: f.path,
        action: 'update' as const,
        reason
      })),
      result: 'success',
      logs: [reason]
    });
  }

  /**
   * Shuts down the evolution manager
   */
  async shutdown(): Promise<void> {
    this.stopMonitoring();
    await this.stopService();
    
    if (this.options.verbose) {
      console.log('\n✅ Evolution Manager shut down');
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createEvolutionManager(options?: Partial<EvolutionOptions>): EvolutionManager {
  return new EvolutionManager(options);
}
