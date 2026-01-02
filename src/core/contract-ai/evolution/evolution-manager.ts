/**
 * Evolution Manager
 * 
 * Manages dynamic code generation, service monitoring, and hot-reload.
 * Enables continuous evolution of applications based on Contract AI.
 * 
 * @version 2.3.1
 */

import { ContractAI, GeneratedCode, GeneratedFile } from '../types';
import { LLMClient, ContractGenerator } from '../generator/contract-generator';
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
   * Creates a minimal contract from prompt with proper entity extraction
   */
  private createMinimalContract(prompt: string): ContractAI {
    // Extract entity names from prompt using multiple patterns
    const entities = this.extractEntitiesFromPrompt(prompt);
    
    // Get app name from prompt
    const appNameMatch = prompt.match(/(?:create|build|make)\s+(?:a|an)?\s*(\w+(?:\s+\w+)?)\s+(?:app|application|system|service|api)/i);
    const appName = appNameMatch ? this.capitalize(appNameMatch[1]) + ' App' : 'Generated App';

    return {
      definition: {
        app: {
          name: appName,
          version: '1.0.0',
          description: prompt
        },
        entities: entities,
        events: [],
        api: { 
          prefix: '/api/v1',
          resources: entities.map(e => ({
            name: e.name.toLowerCase() + 's',
            entity: e.name,
            operations: ['list', 'get', 'create', 'update', 'delete']
          }))
        }
      },
      generation: {
        instructions: [
          { target: 'api', priority: 'must', content: `Generate REST API for: ${prompt}` },
          { target: 'tests', priority: 'must', content: 'Generate comprehensive API tests' },
          { target: 'frontend', priority: 'should', content: 'Generate React frontend with Tailwind CSS' }
        ],
        patterns: [],
        constraints: [],
        techStack: {
          backend: { framework: 'express', language: 'typescript', runtime: 'node' },
          frontend: { framework: 'react', language: 'typescript', styling: 'tailwind' },
          database: { type: 'memory', name: 'in-memory' }
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
   * Extracts entities from prompt using NLP patterns
   */
  private extractEntitiesFromPrompt(prompt: string): Array<{name: string; fields: any[]; relations: any[]}> {
    const entities: Array<{name: string; fields: any[]; relations: any[]}> = [];
    const lowerPrompt = prompt.toLowerCase();
    const foundEntities = new Set<string>();
    
    // Known domain entities (priority)
    const domainEntities: Record<string, string[]> = {
      'contact': ['contact', 'contacts', 'person', 'people'],
      'company': ['company', 'companies', 'organization', 'business'],
      'deal': ['deal', 'deals', 'opportunity', 'opportunities'],
      'task': ['task', 'tasks'],
      'todo': ['todo', 'todos'],
      'note': ['note', 'notes'],
      'category': ['category', 'categories'],
      'user': ['user', 'users', 'account', 'accounts'],
      'product': ['product', 'products', 'item', 'items'],
      'order': ['order', 'orders'],
      'customer': ['customer', 'customers', 'client', 'clients'],
      'project': ['project', 'projects'],
      'invoice': ['invoice', 'invoices', 'bill', 'bills'],
      'employee': ['employee', 'employees', 'staff', 'worker'],
      'booking': ['booking', 'bookings', 'reservation', 'reservations'],
      'event': ['event', 'events'],
      'ticket': ['ticket', 'tickets', 'issue', 'issues'],
      'post': ['post', 'posts', 'article', 'articles'],
      'comment': ['comment', 'comments'],
      'tag': ['tag', 'tags', 'label', 'labels'],
      'inventory': ['inventory', 'stock'],
      'room': ['room', 'rooms'],
      'service': ['service', 'services']
    };

    // Check for domain entities first
    for (const [entity, keywords] of Object.entries(domainEntities)) {
      for (const keyword of keywords) {
        if (lowerPrompt.includes(keyword)) {
          foundEntities.add(this.capitalize(entity));
          break;
        }
      }
    }

    // If no domain entities found, try pattern extraction
    if (foundEntities.size === 0) {
      const entityPatterns = [
        /managing\s+(\w+)/gi,
        /(\w+)\s+with\s+\w+,/gi,
        /(?:create|build)\s+(?:a|an)?\s*(\w+)\s+(?:app|system|api)/gi
      ];

      for (const pattern of entityPatterns) {
        let match;
        while ((match = pattern.exec(lowerPrompt)) !== null) {
          if (match[1]) {
            const entity = this.singularize(match[1]);
            if (this.isValidEntityName(entity)) {
              foundEntities.add(this.capitalize(entity));
            }
          }
        }
      }
    }

    // Default if no entities found
    if (foundEntities.size === 0) {
      foundEntities.add('Item');
    }

    // Create entity definitions
    for (const entityName of foundEntities) {
      entities.push({
        name: entityName,
        fields: [
          { name: 'id', type: 'UUID', annotations: { primary: true } },
          { name: 'name', type: 'String', annotations: { required: true } },
          { name: 'description', type: 'String', annotations: {} },
          { name: 'createdAt', type: 'DateTime', annotations: {} },
          { name: 'updatedAt', type: 'DateTime', annotations: {} }
        ],
        relations: []
      });
    }

    return entities;
  }

  /**
   * Capitalizes first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Simple singularize
   */
  private singularize(str: string): string {
    if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
    if (str.endsWith('es')) return str.slice(0, -2);
    if (str.endsWith('s') && !str.endsWith('ss')) return str.slice(0, -1);
    return str;
  }

  /**
   * Checks if name is a valid entity name
   */
  private isValidEntityName(name: string): boolean {
    const invalidNames = ['a', 'an', 'the', 'and', 'or', 'with', 'for', 'to', 'app', 'application', 'system', 'service', 'api', 'create', 'build', 'make'];
    return name.length > 1 && !invalidNames.includes(name.toLowerCase());
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

    if (this.options.verbose) {
      console.log(`\n🤖 Generating code (trigger: ${trigger})...`);
    }

    let response: string;
    
    // For initial generation, use reliable fallback code
    // LLM is used only for error fixes where it can analyze the specific issue
    if (trigger === 'initial') {
      response = this.generateFallbackCode();
    } else if (this.llmClient && (trigger === 'error' || trigger === 'log-analysis')) {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(trigger, context);
      
      try {
        response = await this.llmClient.generate({
          system: systemPrompt,
          user: userPrompt,
          temperature: 0.3,
          maxTokens: 8000
        });
      } catch {
        // Fallback if LLM fails
        response = this.generateFallbackCode();
      }
    } else {
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
    const mainEntity = entities[0];
    const entityName = mainEntity?.name || 'Item';
    const lowerName = entityName.toLowerCase();
    const pluralName = lowerName + 's';

    // Generate storage and routes for all entities
    const storageDecls = entities.map(e => {
      const plural = e.name.toLowerCase() + 's';
      return `const ${plural}: Map<string, any> = new Map();`;
    }).join('\n');

    const routeBlocks = entities.map(e => {
      const name = e.name;
      const lower = name.toLowerCase();
      const plural = lower + 's';
      return `
// === ${name} Routes ===
app.get('/api/v1/${plural}', (req, res) => {
  res.json(Array.from(${plural}.values()));
});

app.get('/api/v1/${plural}/:id', (req, res) => {
  const item = ${plural}.get(req.params.id);
  if (!item) return res.status(404).json({ error: '${name} not found' });
  res.json(item);
});

app.post('/api/v1/${plural}', (req, res) => {
  const id = String(idCounter++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  ${plural}.set(id, item);
  res.status(201).json(item);
});

app.put('/api/v1/${plural}/:id', (req, res) => {
  if (!${plural}.has(req.params.id)) return res.status(404).json({ error: '${name} not found' });
  const item = { ...${plural}.get(req.params.id), ...req.body, updatedAt: new Date().toISOString() };
  ${plural}.set(req.params.id, item);
  res.json(item);
});

app.delete('/api/v1/${plural}/:id', (req, res) => {
  if (!${plural}.has(req.params.id)) return res.status(404).json({ error: '${name} not found' });
  ${plural}.delete(req.params.id);
  res.status(204).send();
});`;
    }).join('\n');

    return `
\`\`\`typescript:api/src/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory storage for all entities
${storageDecls}
let idCounter = 1;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), entities: ${JSON.stringify(entities.map(e => e.name))} });
});
${routeBlocks}

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

\`\`\`typescript:tests/api.test.ts
import request from 'supertest';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

describe('API Tests for ${entityName}', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const res = await request(BASE_URL).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('CRUD Operations', () => {
    let createdId: string;

    it('should create a ${lowerName}', async () => {
      const res = await request(BASE_URL)
        .post('/api/v1/${pluralName}')
        .send({ name: 'Test ${entityName}' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdId = res.body.id;
    });

    it('should get all ${pluralName}', async () => {
      const res = await request(BASE_URL).get('/api/v1/${pluralName}');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should get ${lowerName} by id', async () => {
      const res = await request(BASE_URL).get(\`/api/v1/${pluralName}/\${createdId}\`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdId);
    });

    it('should update a ${lowerName}', async () => {
      const res = await request(BASE_URL)
        .put(\`/api/v1/${pluralName}/\${createdId}\`)
        .send({ name: 'Updated ${entityName}' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated ${entityName}');
    });

    it('should delete a ${lowerName}', async () => {
      const res = await request(BASE_URL).delete(\`/api/v1/${pluralName}/\${createdId}\`);
      expect(res.status).toBe(204);
    });

    it('should return 404 for non-existent ${lowerName}', async () => {
      const res = await request(BASE_URL).get('/api/v1/${pluralName}/non-existent');
      expect(res.status).toBe(404);
    });
  });
});
\`\`\`

\`\`\`json:tests/package.json
{
  "name": "api-tests",
  "version": "1.0.0",
  "scripts": {
    "test": "jest --runInBand"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0",
    "typescript": "^5.3.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node"
  }
}
\`\`\`

\`\`\`typescript:tests/setup.ts
beforeAll(async () => {
  console.log('Starting API test suite...');
});

afterAll(async () => {
  console.log('API test suite completed.');
});
\`\`\`

\`\`\`typescript:frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
\`\`\`

\`\`\`typescript:frontend/src/App.tsx
import React, { useState, useEffect } from 'react';

interface ${entityName} {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

const API_URL = 'http://localhost:3000/api/v1/${pluralName}';

function App() {
  const [items, setItems] = useState<${entityName}[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const newItem = await res.json();
      setItems([...items, newItem]);
      setName('');
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(\`\${API_URL}/\${id}\`, { method: 'DELETE' });
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">${entityName} Manager</h1>
        
        <form onSubmit={addItem} className="mb-8 flex gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter ${lowerName} name..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add
          </button>
        </form>

        <ul className="space-y-4">
          {items.map(item => (
            <li key={item.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
              <span className="text-gray-800">{item.name}</span>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <p className="text-center text-gray-500">No ${pluralName} yet. Add one above!</p>
        )}
      </div>
    </div>
  );
}

export default App;
\`\`\`

\`\`\`css:frontend/src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;
\`\`\`

\`\`\`json:frontend/package.json
{
  "name": "frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
\`\`\`

\`\`\`typescript:frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});
\`\`\`

\`\`\`javascript:frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: []
};
\`\`\`

\`\`\`html:frontend/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${entityName} App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
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
