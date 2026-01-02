/**
 * Evolution Manager
 * 
 * Manages dynamic code generation, service monitoring, and hot-reload.
 * Enables continuous evolution of applications based on Contract AI.
 * 
 * @version 2.4.1
 */

import { ContractAI, GeneratedCode, GeneratedFile } from '../types';
import { LLMClient, ContractGenerator } from '../generator/contract-generator';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ShellRenderer } from './shell-renderer';

// ============================================================================
// TASK QUEUE
// ============================================================================

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped';

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  children?: Task[];
}

export class TaskQueue {
  private tasks: Task[] = [];
  private verbose: boolean;
  private lastPrintedStatus: string = '';
  private renderer: ShellRenderer;

  constructor(verbose = true) {
    this.verbose = verbose;
    this.renderer = new ShellRenderer(verbose);
  }

  add(name: string, id?: string): Task {
    const task: Task = {
      id: id || `task-${this.tasks.length + 1}`,
      name,
      status: 'pending'
    };
    this.tasks.push(task);
    return task;
  }

  start(id: string): void {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'running';
      task.startedAt = new Date();
      this.printTodoList();
    }
  }

  done(id: string): void {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'done';
      task.completedAt = new Date();
      // Only print full list when all done, not on each completion
      const allDone = this.tasks.every(t => t.status === 'done' || t.status === 'failed' || t.status === 'skipped');
      if (allDone) {
        this.printTodoList();
      }
    }
  }

  fail(id: string, error: string): void {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'failed';
      task.error = error;
      task.completedAt = new Date();
      this.printTodoList();
    }
  }

  skip(id: string): void {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'skipped';
      task.completedAt = new Date();
    }
  }

  printTodoList(): void {
    if (!this.verbose) return;
    
    const pending = this.tasks.filter(t => t.status === 'pending').length;
    const running = this.tasks.filter(t => t.status === 'running').length;
    const done = this.tasks.filter(t => t.status === 'done').length;
    const failed = this.tasks.filter(t => t.status === 'failed').length;
    
    // Only print full list at start and end
    const allDone = pending === 0 && running === 0;
    const justStarted = done === 0 && running === 1;
    
    if (justStarted) {
      this.renderer.heading(2, 'TODO');
      const yaml = [
        '# @type: task_queue',
        '# @description: Evolution pipeline task list',
        'progress:',
        `  done: ${done}`,
        `  total: ${this.tasks.length}`,
        'tasks:',
        ...this.tasks.map(t => `  - name: "${t.name}"\n    status: ${t.status}`)
      ].join('\n');
      this.renderer.codeblock('yaml', yaml);
    } else if (allDone) {
      this.renderer.heading(2, 'COMPLETED');
      const yaml = [
        '# @type: task_queue_result',
        '# @description: Final task execution results',
        'progress:',
        `  done: ${done}`,
        `  total: ${this.tasks.length}`,
        ...(failed > 0 ? [`  failed: ${failed}`] : []),
        'tasks:',
        ...this.tasks.map(t => {
          const duration = t.startedAt && t.completedAt 
            ? Math.round((t.completedAt.getTime() - t.startedAt.getTime()) / 1000)
            : 0;
          return `  - name: "${t.name}"\n    status: ${t.status}\n    duration_sec: ${duration}`;
        })
      ].join('\n');
      this.renderer.codeblock('yaml', yaml);
    }
  }

  print(): void {
    this.printTodoList();
  }

  private getIcon(status: TaskStatus): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'done': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '•';
    }
  }

  getTasks(): Task[] {
    return [...this.tasks];
  }

  clear(): void {
    this.tasks = [];
  }
}

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
  private taskQueue: TaskQueue;
  private renderer: ShellRenderer;

  constructor(options: Partial<EvolutionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.taskQueue = new TaskQueue(this.options.verbose);
    this.renderer = new ShellRenderer(this.options.verbose);
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

  printTasks(): void {
    this.taskQueue.print();
  }

  getTasks(): Task[] {
    return this.taskQueue.getTasks();
  }

  /**
   * Builds current state context for LLM - what's done, what's pending, what failed
   */
  private buildStateContext(): string {
    const tasks = this.taskQueue.getTasks();
    const done = tasks.filter(t => t.status === 'done').map(t => t.name);
    const failed = tasks.filter(t => t.status === 'failed').map(t => `${t.name}: ${t.error}`);
    const pending = tasks.filter(t => t.status === 'pending').map(t => t.name);
    
    // Get list of existing files
    const existingFiles: string[] = [];
    const apiDir = path.join(this.options.outputDir, 'api');
    if (fs.existsSync(apiDir)) {
      const walk = (dir: string, prefix = '') => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name === 'node_modules') continue;
          const fullPath = path.join(dir, entry.name);
          const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walk(fullPath, relPath);
          } else {
            existingFiles.push(`api/${relPath}`);
          }
        }
      };
      walk(apiDir);
    }

    return JSON.stringify({
      state: {
        completed_tasks: done,
        failed_tasks: failed,
        pending_tasks: pending,
        existing_files: existingFiles,
        service: {
          port: this.options.port,
          running: this.serviceProcess !== null,
          healthy: this.serviceLogs.filter(l => l.level === 'error').length === 0
        }
      },
      instructions: failed.length > 0 
        ? 'Fix the errors and regenerate failed components'
        : pending.length > 0 
          ? 'Continue with pending tasks'
          : 'All tasks complete, verify everything works'
    }, null, 2);
  }

  /**
   * Writes current state to JSON file for LLM context
   */
  private writeStateSnapshot(): void {
    const stateDir = path.join(this.options.outputDir, 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const state = {
      timestamp: new Date().toISOString(),
      tasks: this.taskQueue.getTasks().map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        error: t.error,
        duration_sec: t.startedAt && t.completedAt 
          ? Math.round((t.completedAt.getTime() - t.startedAt.getTime()) / 1000)
          : null
      })),
      contract: this.contract,
      service: {
        port: this.options.port,
        outputDir: this.options.outputDir
      }
    };

    const outPath = path.join(stateDir, 'evolution-state.json');
    fs.writeFileSync(outPath, JSON.stringify(state, null, 2), 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: state_snapshot\n# @description: Evolution state for LLM context\nstate:\n  file: "${outPath}"\n  tasks_done: ${state.tasks.filter(t => t.status === 'done').length}\n  tasks_pending: ${state.tasks.filter(t => t.status === 'pending').length}`);
    }
  }

  /**
   * Iterative evolution - runs LLM in loop until all tasks complete
   */
  async evolveIteratively(prompt: string, maxIterations = 5): Promise<void> {
    this.taskQueue.clear();
    
    // Initial tasks with test generation
    this.taskQueue.add('Parse prompt & create contract', 'contract');
    this.taskQueue.add('Generate code with LLM', 'generate');
    this.taskQueue.add('Generate tests for validation', 'generate-tests');
    this.taskQueue.add('Write files to disk', 'write');
    this.taskQueue.add('Install dependencies', 'install');
    this.taskQueue.add('Start service', 'start');
    this.taskQueue.add('Run tests', 'run-tests');
    this.taskQueue.add('Health check', 'health');

    if (this.options.verbose) {
      this.renderer.heading(2, 'Iterative Evolution');
      this.renderer.codeblock('yaml', `# @type: iterative_config\niterations:\n  max: ${maxIterations}\n  mode: "loop until success"`);
    }

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      if (this.options.verbose) {
        this.renderer.heading(3, `Iteration ${iteration + 1}`);
      }

      // Write current state for LLM context
      this.writeStateSnapshot();

      // Check what needs to be done
      const tasks = this.taskQueue.getTasks();
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const failedTasks = tasks.filter(t => t.status === 'failed');

      if (pendingTasks.length === 0 && failedTasks.length === 0) {
        if (this.options.verbose) {
          this.renderer.codeblock('yaml', `# @type: iteration_complete\nresult: success\nmessage: "All tasks completed"`);
        }
        break;
      }

      // Build context with current state
      const stateContext = this.buildStateContext();

      // Process tasks based on state
      for (const task of tasks) {
        if (task.status !== 'pending' && task.status !== 'failed') continue;

        this.taskQueue.start(task.id);

        try {
          switch (task.id) {
            case 'contract':
              this.contract = this.createMinimalContract(prompt);
              this.writeContractSnapshot();
              this.taskQueue.done(task.id);
              break;

            case 'generate':
              // Pass state context to LLM
              const code = await this.generateCode(
                failedTasks.length > 0 ? 'error' : 'initial',
                stateContext
              );
              if (code.files.length > 0) {
                await this.writeFiles(code.files);
                this.taskQueue.done(task.id);
                // Also mark write as done
                const writeTask = tasks.find(t => t.id === 'write');
                if (writeTask && writeTask.status === 'pending') {
                  this.taskQueue.start('write');
                  this.taskQueue.done('write');
                }
              } else {
                this.taskQueue.fail(task.id, 'No files generated');
              }
              break;

            case 'generate-tests':
              // Generate test files for API validation
              await this.generateTestFiles();
              this.taskQueue.done(task.id);
              break;

            case 'install':
            case 'start':
              await this.startService();
              this.taskQueue.done('install');
              this.taskQueue.done('start');
              break;

            case 'run-tests':
              // Run generated tests
              const testsPassed = await this.runTests();
              if (testsPassed) {
                this.taskQueue.done(task.id);
              } else {
                this.taskQueue.fail(task.id, 'Tests failed');
              }
              break;

            case 'health':
              const healthy = await this.checkHealth();
              if (healthy) {
                this.taskQueue.done(task.id);
              } else {
                this.taskQueue.fail(task.id, 'Service not responding');
                // Add retry task dynamically
                if (iteration < maxIterations - 1) {
                  this.taskQueue.add('Retry health check', 'health-retry');
                }
              }
              break;
          }
        } catch (error: any) {
          this.taskQueue.fail(task.id, error.message);
        }

        // Update state after each task
        this.writeStateSnapshot();
      }
    }

    // Final state
    this.writeStateSnapshot();
    this.startMonitoring();
  }

  /**
   * Generates test files for API validation
   */
  private async generateTestFiles(): Promise<void> {
    if (!this.contract) return;

    const testDir = path.join(this.options.outputDir, 'api', 'tests');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const entities = this.contract.definition?.entities || [];
    const mainEntity = entities[0]?.name || 'Item';
    const lowerName = mainEntity.toLowerCase();
    const pluralName = lowerName + 's';

    // Generate API test file
    const testContent = `/**
 * API Tests - Auto-generated by Reclapp Evolution
 * @type: api_tests
 * @entity: ${mainEntity}
 */

const BASE_URL = 'http://localhost:${this.options.port}';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration_ms: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration_ms: Date.now() - start });
    console.log(\`✅ \${name}\`);
  } catch (error: any) {
    results.push({ name, passed: false, error: error.message, duration_ms: Date.now() - start });
    console.log(\`❌ \${name}: \${error.message}\`);
  }
}

async function runTests(): Promise<void> {
  console.log('\\n## API Tests\\n');

  // Health check
  await test('Health endpoint responds', async () => {
    const res = await fetch(\`\${BASE_URL}/health\`);
    if (!res.ok) throw new Error(\`Status: \${res.status}\`);
  });

  // CRUD tests for ${mainEntity}
  let createdId: string | null = null;

  await test('POST /${pluralName} - create', async () => {
    const res = await fetch(\`\${BASE_URL}/${pluralName}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test ${mainEntity}' })
    });
    if (!res.ok) throw new Error(\`Status: \${res.status}\`);
    const data = await res.json();
    createdId = data.id;
    if (!createdId) throw new Error('No ID returned');
  });

  await test('GET /${pluralName} - list', async () => {
    const res = await fetch(\`\${BASE_URL}/${pluralName}\`);
    if (!res.ok) throw new Error(\`Status: \${res.status}\`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  await test('GET /${pluralName}/:id - read', async () => {
    if (!createdId) throw new Error('No ID from create test');
    const res = await fetch(\`\${BASE_URL}/${pluralName}/\${createdId}\`);
    if (!res.ok) throw new Error(\`Status: \${res.status}\`);
  });

  await test('DELETE /${pluralName}/:id - delete', async () => {
    if (!createdId) throw new Error('No ID from create test');
    const res = await fetch(\`\${BASE_URL}/${pluralName}/\${createdId}\`, { method: 'DELETE' });
    if (!res.ok) throw new Error(\`Status: \${res.status}\`);
  });

  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(\`\\n## Test Results\\n\`);
  console.log(\`\\\`\\\`\\\`yaml\`);
  console.log(\`# @type: test_results\`);
  console.log(\`summary:\`);
  console.log(\`  total: \${results.length}\`);
  console.log(\`  passed: \${passed}\`);
  console.log(\`  failed: \${failed}\`);
  console.log(\`tests:\`);
  for (const r of results) {
    console.log(\`  - name: "\${r.name}"\`);
    console.log(\`    passed: \${r.passed}\`);
    console.log(\`    duration_ms: \${r.duration_ms}\`);
    if (r.error) console.log(\`    error: "\${r.error}"\`);
  }
  console.log(\`\\\`\\\`\\\`\`);

  // Exit with error if tests failed
  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});
`;

    const testPath = path.join(testDir, 'api.test.ts');
    fs.writeFileSync(testPath, testContent, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: tests_generated\ntests:\n  dir: "${testDir}"\n  files:\n    - api.test.ts\n  entity: "${mainEntity}"`);
    }
  }

  /**
   * Runs the generated tests
   */
  private async runTests(): Promise<boolean> {
    const testFile = path.join(this.options.outputDir, 'api', 'tests', 'api.test.ts');
    
    if (!fs.existsSync(testFile)) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: test_skip\nreason: "No test files found"`);
      }
      return true; // Skip if no tests
    }

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: test_run\nfile: "${testFile}"`);
    }

    return new Promise((resolve) => {
      const testProcess = spawn('npx', ['tsx', testFile], {
        cwd: path.join(this.options.outputDir, 'api'),
        stdio: 'pipe'
      });

      let output = '';
      testProcess.stdout?.on('data', (data) => {
        output += data.toString();
        if (this.options.verbose) {
          process.stdout.write(data);
        }
      });
      testProcess.stderr?.on('data', (data) => {
        output += data.toString();
      });

      testProcess.on('close', (code) => {
        resolve(code === 0);
      });

      testProcess.on('error', () => {
        resolve(false);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        testProcess.kill();
        resolve(false);
      }, 30000);
    });
  }

  private writeContractSnapshot(): void {
    if (!this.contract) {
      return;
    }

    const contractDir = path.join(this.options.outputDir, 'contract');
    if (!fs.existsSync(contractDir)) {
      fs.mkdirSync(contractDir, { recursive: true });
    }

    const outPath = path.join(contractDir, 'contract.ai.json');
    fs.writeFileSync(outPath, JSON.stringify(this.contract, null, 2), 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: contract_snapshot\n# @description: ContractAI snapshot\ncontract:\n  file: "${outPath}"`);
    }
  }

  /**
   * Starts the evolution lifecycle from a prompt (without pre-generated contract)
   */
  async startFromPrompt(prompt: string): Promise<void> {
    // Initialize task queue
    this.taskQueue.clear();
    
    // Add initial tasks
    const taskContract = this.taskQueue.add('Parse prompt & create contract', 'contract');
    const taskContractWrite = this.taskQueue.add('Write contract to disk', 'contract-write');
    const taskGenerate = this.taskQueue.add('Generate code with LLM', 'generate');
    const taskWrite = this.taskQueue.add('Write files to disk', 'write');
    const taskInstall = this.taskQueue.add('Install dependencies', 'install');
    const taskStart = this.taskQueue.add('Start service', 'start');
    const taskHealth = this.taskQueue.add('Health check', 'health');

    if (this.options.verbose) {
      this.renderer.heading(2, 'Config');
      const configYaml = [
        '# @type: evolution_config',
        '# @description: Evolution pipeline configuration',
        'evolution:',
        `  prompt: "${prompt.substring(0, 50)}"`,
        `  output: "${this.options.outputDir}"`,
        `  port: ${this.options.port}`
      ].join('\n');
      this.renderer.codeblock('yaml', configYaml);
    }

    // Task 1: Create contract
    this.taskQueue.start('contract');
    this.contract = this.createMinimalContract(prompt);
    this.taskQueue.done('contract');

    this.taskQueue.start('contract-write');
    this.writeContractSnapshot();
    this.taskQueue.done('contract-write');

    // Task 2: Generate code
    this.taskQueue.start('generate');
    const code = await this.generateCode('initial');
    if (code.files.length > 0) {
      this.taskQueue.done('generate');
    } else {
      this.taskQueue.fail('generate', 'No files generated');
      return;
    }

    // Task 3: Write files
    this.taskQueue.start('write');
    await this.writeFiles(code.files);
    this.taskQueue.done('write');

    // Task 4 & 5: Install and Start
    this.taskQueue.start('install');
    this.taskQueue.start('start');
    await this.startService();
    this.taskQueue.done('install');
    this.taskQueue.done('start');

    // Task 6: Health check
    this.taskQueue.start('health');
    const healthy = await this.checkHealth();
    if (healthy) {
      this.taskQueue.done('health');
    } else {
      this.taskQueue.fail('health', 'Service not responding');
    }

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
          version: 'v1',
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
    } as unknown as ContractAI;
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
      this.writeContractSnapshot();
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

    let response: string;
    
    // Use LLM for code generation when available
    if (this.llmClient) {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(trigger, context);
      
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: llm_request\n# @description: LLM code generation request\nllm:\n  trigger: "${trigger}"\n  status: calling`);
      }
      
      try {
        response = await this.llmClient.generate({
          system: systemPrompt,
          user: userPrompt,
          temperature: 0.2,
          maxTokens: 16000
        });
        
        if (this.options.verbose) {
          this.renderer.codeblock('yaml', `# @type: llm_response\n# @description: LLM response received\nllm:\n  status: success\n  response_chars: ${response.length}`);
        }
        
        // Validate response has actual code
        if (!response.includes('```') || response.length < 500) {
          if (this.options.verbose) {
            this.renderer.codeblock('yaml', `llm:\n  status: invalid_response\n  fallback: true`);
          }
          response = this.generateFallbackCode();
        }
      } catch (error: any) {
        // Dynamically add task for missing model
        if (error.message.includes('not found') || error.message.includes('Pull with')) {
          const modelMatch = error.message.match(/Model '([^']+)'/);
          const modelName = modelMatch ? modelMatch[1] : 'unknown';
          this.taskQueue.add(`Pull LLM model: ${modelName}`, 'pull-model');
          this.taskQueue.fail('pull-model', `Run: ollama pull ${modelName}`);
        }
        
        // Add fallback task
        this.taskQueue.add('Use fallback code generator', 'fallback');
        this.taskQueue.start('fallback');
        
        if (this.options.verbose) {
          this.renderer.codeblock('yaml', `llm:\n  status: error\n  error: "${error.message.substring(0, 60)}"\n  fallback: true`);
        }
        response = this.generateFallbackCode();
        this.taskQueue.done('fallback');
      }
    } else {
      // No LLM available - add task and use fallback
      this.taskQueue.add('Use fallback code generator', 'fallback');
      this.taskQueue.start('fallback');
      response = this.generateFallbackCode();
      this.taskQueue.done('fallback');
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
    return `You are an expert TypeScript developer. Generate a REST API.

RULES:
1. Use ONLY these packages: express, cors (NO moment, NO uuid, NO other packages)
2. Use in-memory Map for storage
3. Include /health endpoint
4. Include CRUD: GET /api/v1/{entity}s, POST, PUT, DELETE

OUTPUT FORMAT (use EXACTLY):

\`\`\`typescript:api/src/server.ts
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const items = new Map<string, any>();
let idCounter = 1;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// CRUD routes here...

app.listen(PORT, () => console.log(\`Server on port \${PORT}\`));
\`\`\`

\`\`\`json:api/package.json
{"name":"api","version":"1.0.0","scripts":{"dev":"ts-node src/server.ts"},"dependencies":{"cors":"^2.8.5","express":"^4.18.2"},"devDependencies":{"@types/cors":"^2.8.14","@types/express":"^4.17.20","@types/node":"^20.9.0","ts-node":"^10.9.2","typescript":"^5.3.0"}}
\`\`\`

\`\`\`json:api/tsconfig.json
{"compilerOptions":{"target":"ES2020","module":"commonjs","strict":true,"esModuleInterop":true,"skipLibCheck":true}}
\`\`\`

IMPORTANT: Copy package.json EXACTLY as shown above. Do NOT add moment, uuid, or any other packages.`;
  }

  /**
   * Builds user prompt based on contract and context
   */
  private buildUserPrompt(trigger: EvolutionCycle['trigger'], context?: string): string {
    if (!this.contract) return '';

    const entities = this.contract.definition.entities;
    const entityDescriptions = entities
      .map(e => {
        const fields = e.fields.map(f => `${f.name}: ${f.type || 'string'}`).join(', ');
        return `- ${e.name} { ${fields} }`;
      })
      .join('\n');

    const entityNames = entities.map(e => e.name.toLowerCase() + 's').join(', ');

    let prompt = `Generate a COMPLETE REST API for a TODO application with these entities:

${entityDescriptions}

REQUIRED ENDPOINTS for each entity (e.g., for "Todo" entity):
- GET /api/v1/todos - list all todos (return array)
- GET /api/v1/todos/:id - get single todo by id
- POST /api/v1/todos - create new todo (return created object with id)
- PUT /api/v1/todos/:id - update todo
- DELETE /api/v1/todos/:id - delete todo

REQUIRED FILES:
1. api/src/server.ts - Express server with ALL routes, using Map for storage
2. api/package.json - dependencies (ONLY express, cors, and typescript-related)
3. api/tsconfig.json - TypeScript config

The server.ts MUST include:
- import express from 'express';
- import cors from 'cors';
- const app = express();
- app.use(cors());
- app.use(express.json());
- const PORT = process.env.PORT || 3000;
- In-memory storage: const ${entities[0]?.name?.toLowerCase() || 'item'}s = new Map<string, any>();
- let idCounter = 1;
- All CRUD routes for: ${entityNames}
- Health endpoint: app.get('/health', ...)
- app.listen(PORT, ...)

Generate the COMPLETE code now. Do not use placeholders or comments like "// add more routes here".`;

    if (trigger === 'error' && context) {
      prompt += `\n\n⚠️ FIX THIS ERROR:\n${context}\n\nGenerate the COMPLETE corrected code.`;
    }

    if (trigger === 'log-analysis' && context) {
      prompt += `\n\n⚠️ FIX THESE ISSUES:\n${context}\n\nGenerate the COMPLETE fixed code.`;
    }

    if (trigger === 'manual' && context) {
      prompt += `\n\n📝 USER REQUEST:\n${context}\n\nModify the code to implement this request.`;
    }

    return prompt;
  }

  /**
   * Parses files from LLM response
   */
  private parseFilesFromResponse(response: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    
    // Try multiple regex patterns to handle different LLM output formats
    const patterns = [
      /```(?:typescript|ts|javascript|js|json):([^\n]+)\n([\s\S]*?)```/g,  // ```ts:path
      /```([^\n]*?)\n\/\/ ?(?:file|path): ?([^\n]+)\n([\s\S]*?)```/g,       // // file: path
      /```\n?([^\n]*?)\n\/\*\* ?@file ?([^\n]+) ?\*\/\n([\s\S]*?)```/g,     // /** @file path */
    ];

    // First pattern: ```typescript:api/src/server.ts
    let match;
    const pattern1 = /```(?:typescript|ts|javascript|js|json):([^\n]+)\n([\s\S]*?)```/g;
    while ((match = pattern1.exec(response)) !== null) {
      const filePath = match[1].trim();
      let content = match[2].trim();
      const target = filePath.startsWith('api/') ? 'api' : 
                    filePath.startsWith('tests/') ? 'tests' : 
                    filePath.startsWith('frontend/') ? 'frontend' : 'api';

      if (filePath.endsWith('.json')) {
        content = this.stripJsonComments(content);
      }

      files.push({ path: filePath, content, target });
    }

    // Print parsed files summary
    if (this.options.verbose && files.length > 0) {
      const yaml = [
        '# @type: parsed_files',
        '# @description: Files extracted from LLM response',
        'parsed:',
        `  count: ${files.length}`,
        '  files:',
        ...files.map(f => `    - path: "${f.path}"\n      chars: ${f.content.length}`)
      ].join('\n');
      this.renderer.codeblock('yaml', yaml);
    }

    // If no files found with first pattern, try to extract from plain code blocks
    if (files.length === 0) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: parse_error\n# @description: No files parsed\nparsed:\n  count: 0\n  error: "no files parsed"\n  response_length: ${response.length}`);
      }
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
    const writtenFiles: { path: string; bytes: number; error?: string }[] = [];

    if (files.length === 0) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `files:\n  output: "${this.options.outputDir}"\n  count: 0\n  error: "no files to write"`);
      }
      return;
    }

    for (const file of files) {
      const fullPath = path.join(this.options.outputDir, file.path);
      const dir = path.dirname(fullPath);

      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, file.content, 'utf-8');
        writtenFiles.push({ path: file.path, bytes: file.content.length });
      } catch (error: any) {
        writtenFiles.push({ path: file.path, bytes: 0, error: error.message });
      }
    }
    
    if (this.options.verbose) {
      const yaml = [
        '# @type: written_files',
        '# @description: Files written to disk',
        'files:',
        `  output: "${this.options.outputDir}"`,
        `  count: ${files.length}`,
        '  written:',
        ...writtenFiles.map(f => f.error 
          ? `    - path: "${f.path}"\n      error: "${f.error}"`
          : `    - path: "${f.path}"\n      bytes: ${f.bytes}`)
      ].join('\n');
      this.renderer.codeblock('yaml', yaml);
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

    // Kill any existing process on the port first
    await this.killProcessOnPort(this.options.port);

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

    this.serviceProcess.on('exit', (code, signal) => {
      if (this.options.verbose) {
        if (signal) {
          console.log(`   Service stopped (signal: ${signal}) - graceful shutdown`);
        } else if (code === 0) {
          console.log(`   Service exited normally (code: 0)`);
        } else if (code === null) {
          console.log(`   Service stopped (graceful shutdown)`);
        } else {
          console.log(`   ⚠️ Service exited with code ${code}`);
          console.log(`   💡 Check logs: ${path.join(this.options.outputDir, 'logs')}/*.rcl.md`);
        }
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
   * Kills any process running on the specified port
   */
  private async killProcessOnPort(port: number): Promise<void> {
    try {
      const { execSync } = require('child_process');
      // Try to find and kill process on port (Linux/Mac)
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || fuser -k ${port}/tcp 2>/dev/null || true`, {
        stdio: 'ignore'
      });
      // Give it a moment to release the port
      await this.sleep(500);
    } catch {
      // Ignore errors - port might not be in use
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
   * Evolve with user feedback (ticket/issue)
   * Allows user to describe a problem and have LLM fix it
   */
  async evolveWithFeedback(issueDescription: string): Promise<void> {
    if (this.options.verbose) {
      console.log(`\n🎫 Processing fix ticket: "${issueDescription}"`);
    }

    if (this.evolutionHistory.length >= this.options.maxEvolutionCycles) {
      if (this.options.verbose) {
        console.log('   ⚠️ Max evolution cycles reached');
      }
      return;
    }

    // Generate fix based on issue description
    const newCode = await this.generateCode('manual', issueDescription);

    if (newCode.files.length === 0) {
      if (this.options.verbose) {
        console.log('   ⚠️ No code changes generated');
      }
      return;
    }

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
        reason: `Fix ticket: ${issueDescription.substring(0, 50)}`
      })),
      result: 'success',
      logs: [`User ticket: ${issueDescription}`]
    });

    if (this.options.verbose) {
      console.log(`   ✅ Applied ${newCode.files.length} file changes`);
    }
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

    // Check if issues are TypeScript/compilation errors - use fallback code
    const isTypeScriptError = issues.some(i => 
      i.includes('TSError') || 
      i.includes('Cannot find name') || 
      i.includes('Unable to compile TypeScript') ||
      i.includes('error TS')
    );

    // Check if issues are port-related - just restart without regenerating
    const isPortError = issues.some(i => 
      i.includes('EADDRINUSE') || 
      i.includes('address already in use')
    );

    if (isPortError) {
      if (this.options.verbose) {
        console.log('\n🔄 Port conflict detected, restarting service...');
      }
      await this.stopService();
      await this.startService();
      return;
    }

    if (this.options.verbose) {
      console.log(`\n🔍 Detected ${issues.length} issues in logs, evolving...`);
    }

    let newCode;
    
    if (isTypeScriptError) {
      // Use fallback code for TypeScript errors - LLM generated broken code
      if (this.options.verbose) {
        console.log('   ⚠️ TypeScript error detected - using fallback code generator');
      }
      const fallbackResponse = this.generateFallbackCode();
      newCode = { files: this.parseFilesFromResponse(fallbackResponse) };
    } else {
      // Try LLM for other issues
      const context = issues.join('\n');
      newCode = await this.generateCode('log-analysis', context);
    }

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
        reason: isTypeScriptError ? 'Fallback code (TypeScript fix)' : 'Log analysis improvement'
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
      `> Generated by Reclapp Evolution Manager v2.4.1`,
      '',
      '## Summary',
      '',
      '```yaml',
      '# @type: evolution_summary',
      '# @description: Evolution session summary',
      'summary:',
      `  total_cycles: ${this.evolutionHistory.length}`,
      `  last_update: "${new Date().toISOString()}"`,
      `  service_port: ${this.options.port}`,
      `  output_dir: "${this.options.outputDir}"`,
      '```',
      '',
      '---',
      '',
      '## Evolution History',
      ''
    ];

    for (const cycle of this.evolutionHistory) {
      lines.push(`### Cycle ${cycle.cycle} - ${cycle.trigger}`);
      lines.push('');
      lines.push('```yaml');
      lines.push('cycle:');
      lines.push(`  number: ${cycle.cycle}`);
      lines.push(`  trigger: "${cycle.trigger}"`);
      lines.push(`  timestamp: "${cycle.timestamp.toISOString()}"`);
      lines.push(`  result: ${cycle.result}`);
      lines.push(`  files_changed: ${cycle.changes.length}`);
      
      if (cycle.changes.length > 0) {
        lines.push('  changes:');
        for (const change of cycle.changes) {
          lines.push(`    - path: "${change.path}"`);
          lines.push(`      action: ${change.action}`);
          lines.push(`      reason: "${change.reason}"`);
        }
      }

      if (cycle.logs.length > 0) {
        lines.push('  logs:');
        for (const log of cycle.logs.slice(0, 10)) {
          lines.push(`    - "${log}"`);
        }
      }
      lines.push('```');
      lines.push('');
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
      console.log('\n✅ Evolution Manager shut down\n');
      console.log('## Summary\n');
      console.log('```yaml');
      console.log('evolution:');
      console.log(`  cycles: ${this.evolutionHistory.length}`);
      console.log(`  output: "${this.options.outputDir}"`);
      console.log(`  logs: "${path.join(this.options.outputDir, 'logs')}"`);
      console.log(`  port: ${this.options.port}`);
      console.log('```\n');
      console.log('## Next Steps\n');
      console.log('```bash');
      console.log(`# Start service`);
      console.log(`cd ${this.options.outputDir}/api && npm run dev`);
      console.log('');
      console.log(`# Run tests`);
      console.log(`cd ${this.options.outputDir}/tests && npm test`);
      console.log('');
      console.log(`# View logs`);
      console.log(`cat ${this.options.outputDir}/logs/*.rcl.md`);
      console.log('');
      console.log(`# Keep running mode`);
      console.log(`./bin/reclapp evolve -p "..." -k`);
      console.log('```\n');
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createEvolutionManager(options?: Partial<EvolutionOptions>): EvolutionManager {
  return new EvolutionManager(options);
}
