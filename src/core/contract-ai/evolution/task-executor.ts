/**
 * Dynamic Task Executor
 * 
 * Watches task files and executes commands with live markdown output.
 * Similar to Dockerfile-style execution with parallel workers.
 * 
 * @version 1.0.0
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type TaskState = 'pending' | 'running' | 'done' | 'failed' | 'timeout';

export interface ExecutorTask {
  id: string;
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
  state: TaskState;
  startedAt?: Date;
  completedAt?: Date;
  exitCode?: number | null;
  stdout: string[];
  stderr: string[];
  error?: string;
}

export interface TaskExecutorOptions {
  maxWorkers: number;
  taskFile?: string;
  pollInterval: number;
  logBufferSize: number;
  verbose: boolean;
}

// ============================================================================
// RING BUFFER FOR LOGS
// ============================================================================

export class RingBuffer<T> {
  private buffer: T[] = [];
  private size: number;

  constructor(size: number) {
    this.size = size;
  }

  append(item: T): void {
    if (this.buffer.length >= this.size) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  getAll(): T[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}

// ============================================================================
// TASK EXECUTOR
// ============================================================================

export class TaskExecutor extends EventEmitter {
  private options: TaskExecutorOptions;
  private tasks: Map<string, ExecutorTask> = new Map();
  private queue: string[] = [];
  private running: Set<string> = new Set();
  private logs: RingBuffer<string>;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastModTime: number = 0;
  private taskCounter: number = 0;

  constructor(options: Partial<TaskExecutorOptions> = {}) {
    super();
    this.options = {
      maxWorkers: 3,
      pollInterval: 2000,
      logBufferSize: 100,
      verbose: true,
      ...options
    };
    this.logs = new RingBuffer(this.options.logBufferSize);
  }

  // -------------------------------------------------------------------------
  // Task Management
  // -------------------------------------------------------------------------

  addTask(command: string, options: Partial<ExecutorTask> = {}): ExecutorTask {
    const id = options.id || `task-${++this.taskCounter}`;
    const task: ExecutorTask = {
      id,
      command,
      args: options.args || [],
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 60000,
      state: 'pending',
      stdout: [],
      stderr: []
    };
    
    this.tasks.set(id, task);
    this.queue.push(id);
    
    this.log(`⏳ [QUEUED] ${command}`);
    this.emit('task:queued', task);
    
    // Try to start next task
    this.processQueue();
    
    return task;
  }

  addTasksFromFile(filePath: string): void {
    if (!fs.existsSync(filePath)) {
      this.log(`❌ [ERROR] File not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Parse command and timeout
      const timeoutMatch = trimmed.match(/^(.+?)\s+#\s*timeout:\s*(\d+)$/);
      if (timeoutMatch) {
        this.addTask(timeoutMatch[1], { timeout: parseInt(timeoutMatch[2]) * 1000 });
      } else {
        this.addTask(trimmed);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Execution
  // -------------------------------------------------------------------------

  private async processQueue(): Promise<void> {
    while (this.running.size < this.options.maxWorkers && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (taskId) {
        this.executeTask(taskId);
      }
    }
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.state = 'running';
    task.startedAt = new Date();
    this.running.add(taskId);

    this.log(`🔄 [START] ${task.command}`);
    this.printMarkdown();
    this.emit('task:start', task);

    return new Promise((resolve) => {
      const proc = spawn(task.command, task.args || [], {
        cwd: task.cwd,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let timeoutHandle: NodeJS.Timeout | null = null;
      if (task.timeout) {
        timeoutHandle = setTimeout(() => {
          proc.kill('SIGTERM');
          task.state = 'timeout';
          task.error = `Timeout after ${task.timeout}ms`;
          this.log(`⏱️ [TIMEOUT] ${task.command}`);
        }, task.timeout);
      }

      proc.stdout?.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        task.stdout.push(...lines);
        for (const line of lines) {
          this.log(`   ${line}`);
        }
      });

      proc.stderr?.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        task.stderr.push(...lines);
        for (const line of lines) {
          this.log(`   ⚠️ ${line}`);
        }
      });

      proc.on('close', (code) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        task.completedAt = new Date();
        task.exitCode = code;
        this.running.delete(taskId);

        if (task.state !== 'timeout') {
          task.state = code === 0 ? 'done' : 'failed';
        }

        const duration = task.completedAt.getTime() - (task.startedAt?.getTime() || 0);
        const icon = task.state === 'done' ? '✅' : task.state === 'timeout' ? '⏱️' : '❌';
        this.log(`${icon} [${task.state.toUpperCase()}] ${task.command} (${Math.round(duration / 1000)}s)`);
        
        this.printMarkdown();
        this.emit('task:complete', task);
        
        // Process next task
        this.processQueue();
        resolve();
      });

      proc.on('error', (err) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        task.completedAt = new Date();
        task.state = 'failed';
        task.error = err.message;
        this.running.delete(taskId);
        
        this.log(`❌ [ERROR] ${task.command}: ${err.message}`);
        this.emit('task:error', task, err);
        
        this.processQueue();
        resolve();
      });
    });
  }

  // -------------------------------------------------------------------------
  // File Watching
  // -------------------------------------------------------------------------

  startWatching(filePath: string): void {
    this.options.taskFile = filePath;
    
    // Initial load
    if (fs.existsSync(filePath)) {
      this.lastModTime = fs.statSync(filePath).mtimeMs;
      this.addTasksFromFile(filePath);
    }

    // Start polling
    this.pollTimer = setInterval(() => {
      this.checkFileChanges();
    }, this.options.pollInterval);

    this.log(`👁️ [WATCHING] ${filePath}`);
  }

  stopWatching(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private checkFileChanges(): void {
    if (!this.options.taskFile || !fs.existsSync(this.options.taskFile)) return;

    const currentModTime = fs.statSync(this.options.taskFile).mtimeMs;
    if (currentModTime > this.lastModTime) {
      this.lastModTime = currentModTime;
      this.log(`📝 [FILE CHANGED] Reloading tasks...`);
      this.addTasksFromFile(this.options.taskFile);
    }
  }

  // -------------------------------------------------------------------------
  // Logging & Markdown
  // -------------------------------------------------------------------------

  private log(message: string): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const entry = `[${timestamp}] ${message}`;
    this.logs.append(entry);
    
    if (this.options.verbose) {
      console.log(message);
    }
    
    this.emit('log', entry);
  }

  printMarkdown(): void {
    if (!this.options.verbose) return;

    const tasks = Array.from(this.tasks.values());
    const pending = tasks.filter(t => t.state === 'pending').length;
    const running = tasks.filter(t => t.state === 'running').length;
    const done = tasks.filter(t => t.state === 'done').length;
    const failed = tasks.filter(t => t.state === 'failed' || t.state === 'timeout').length;

    console.log('\n## Task Status\n');
    console.log('```yaml');
    console.log('tasks:');
    console.log(`  total: ${tasks.length}`);
    console.log(`  pending: ${pending}`);
    console.log(`  running: ${running}`);
    console.log(`  done: ${done}`);
    console.log(`  failed: ${failed}`);
    console.log('');
    console.log('queue:');
    
    for (const task of tasks) {
      const icon = this.getIcon(task.state);
      const duration = task.startedAt && task.completedAt
        ? ` # ${Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 1000)}s`
        : task.startedAt ? ' # running...' : '';
      console.log(`  - ${icon} "${task.command}": ${task.state}${duration}`);
      if (task.error) {
        console.log(`      error: "${task.error.substring(0, 50)}"`);
      }
    }
    console.log('```\n');
  }

  private getIcon(state: TaskState): string {
    switch (state) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'done': return '✅';
      case 'failed': return '❌';
      case 'timeout': return '⏱️';
      default: return '•';
    }
  }

  renderMarkdown(): string {
    const logs = this.logs.getAll();
    let md = '## Task Execution Logs\n\n';
    
    for (const entry of logs) {
      if (entry.includes('[START]') || entry.includes('[DONE]') || entry.includes('[QUEUED]')) {
        md += `\`\`\`bash\n${entry}\n\`\`\`\n\n`;
      } else if (entry.includes('[ERROR]') || entry.includes('[TIMEOUT]') || entry.includes('⚠️')) {
        md += `\`\`\`text\n${entry}\n\`\`\`\n\n`;
      } else {
        md += `${entry}\n`;
      }
    }
    
    return md;
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  getStatus(): { tasks: ExecutorTask[]; logs: string[] } {
    return {
      tasks: Array.from(this.tasks.values()),
      logs: this.logs.getAll()
    };
  }

  async waitForAll(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.running.size === 0 && this.queue.length === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  clear(): void {
    this.tasks.clear();
    this.queue = [];
    this.running.clear();
    this.logs.clear();
    this.taskCounter = 0;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createTaskExecutor(options?: Partial<TaskExecutorOptions>): TaskExecutor {
  return new TaskExecutor(options);
}
