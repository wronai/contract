/**
 * CLI Runner
 * 
 * Standardized CLI execution with TaskQueue, markdown logs, and consistent output.
 * Used by all reclapp commands for uniform experience.
 * 
 * @version 2.4.1
 */

import { ShellRenderer } from '../evolution/shell-renderer';
import { TaskQueue, Task, TaskStatus } from '../evolution/task-queue';

// ============================================================================
// TYPES
// ============================================================================

export interface CLITask {
  id: string;
  name: string;
  description?: string;
  category?: string;
  run: () => Promise<CLITaskResult>;
  skip?: () => boolean;
}

export interface CLITaskResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface CLIRunnerOptions {
  name: string;
  version: string;
  verbose?: boolean;
  showProgress?: boolean;
  continueOnError?: boolean;
}

export interface CLIRunnerResult {
  success: boolean;
  completed: number;
  failed: number;
  skipped: number;
  total: number;
  duration: number;
  tasks: Array<{
    name: string;
    status: 'done' | 'failed' | 'skipped';
    duration: number;
    error?: string;
  }>;
}

// ============================================================================
// CLI RUNNER
// ============================================================================

export class CLIRunner {
  private renderer: ShellRenderer;
  private taskQueue: TaskQueue;
  private options: CLIRunnerOptions;
  private tasks: CLITask[] = [];
  private results: CLIRunnerResult['tasks'] = [];
  private startTime: number = 0;

  constructor(options: CLIRunnerOptions) {
    this.options = {
      verbose: true,
      showProgress: true,
      continueOnError: true,
      ...options
    };
    this.renderer = new ShellRenderer(this.options.verbose ?? true);
    // TaskQueue prints its own TODO blocks when verbose=true.
    // CLIRunner is responsible for printing TODO/progress, so keep TaskQueue silent.
    this.taskQueue = new TaskQueue(false);
  }

  /**
   * Print header
   */
  header(): void {
    this.renderer.heading(2, `${this.options.name} v${this.options.version}`);
  }

  /**
   * Add task to queue
   */
  addTask(task: CLITask): this {
    this.tasks.push(task);
    this.taskQueue.add(task.name, task.id);
    return this;
  }

  /**
   * Add multiple tasks
   */
  addTasks(tasks: CLITask[]): this {
    for (const task of tasks) {
      this.addTask(task);
    }
    return this;
  }

  /**
   * Log message
   */
  log(message: string): void {
    this.renderer.codeblock('log', message);
  }

  /**
   * Log YAML data
   */
  yaml(type: string, description: string, data: Record<string, unknown>): void {
    const lines = [
      `# @type: ${type}`,
      `# @description: ${description}`
    ];
    
    const formatValue = (value: unknown, indent: number = 0): string[] => {
      const prefix = '  '.repeat(indent);
      
      if (value === null || value === undefined) {
        return ['null'];
      }
      if (typeof value === 'string') {
        const escaped = value
          .replace(/\\/g, '\\\\')
          .replace(/\r/g, '\\r')
          .replace(/\n/g, '\\n')
          .replace(/\t/g, '\\t')
          .replace(/"/g, '\\"');
        return [`"${escaped}"`];
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        return [String(value)];
      }
      if (Array.isArray(value)) {
        if (value.length === 0) return ['[]'];
        const result: string[] = [];
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const objLines = formatObject(item as Record<string, unknown>, indent + 1);
            result.push(`${prefix}- ${objLines[0].trim()}`);
            result.push(...objLines.slice(1));
          } else {
            result.push(`${prefix}- ${formatValue(item)[0]}`);
          }
        }
        return result;
      }
      if (typeof value === 'object') {
        return formatObject(value as Record<string, unknown>, indent);
      }
      return [String(value)];
    };

    const formatObject = (obj: Record<string, unknown>, indent: number = 0): string[] => {
      const result: string[] = [];
      const prefix = '  '.repeat(indent);
      
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          result.push(`${prefix}${key}:`);
          result.push(...formatObject(val as Record<string, unknown>, indent + 1));
        } else if (Array.isArray(val)) {
          result.push(`${prefix}${key}:`);
          result.push(...formatValue(val, indent + 1));
        } else {
          result.push(`${prefix}${key}: ${formatValue(val)[0]}`);
        }
      }
      return result;
    };

    lines.push(...formatObject(data));
    this.renderer.codeblock('yaml', lines.join('\n'));
  }

  /**
   * Print current TODO list
   */
  printTodo(): void {
    const tasks = this.taskQueue.getTasks();
    const done = tasks.filter(t => t.status === 'done').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const total = tasks.length;

    const todoData: Record<string, unknown> = {
      progress: { done, failed, total },
      tasks: tasks.map(t => ({
        name: t.name,
        status: t.status,
        ...(t.error ? { error: t.error } : {})
      }))
    };

    this.yaml('task_queue', 'Current task status', todoData);
  }

  /**
   * Run all tasks
   */
  async run(): Promise<CLIRunnerResult> {
    this.startTime = Date.now();
    this.header();

    // Print initial TODO
    if (this.options.showProgress) {
      this.printTodo();
    }

    let completed = 0;
    let failed = 0;
    let skipped = 0;

    for (const task of this.tasks) {
      // Check if should skip
      if (task.skip && task.skip()) {
        this.taskQueue.skip(task.id);
        skipped++;
        this.results.push({
          name: task.name,
          status: 'skipped',
          duration: 0
        });
        continue;
      }

      // Start task
      this.taskQueue.start(task.id);
      this.log(`→ ${task.name}${task.description ? `: ${task.description}` : ''}`);
      
      const taskStart = Date.now();
      
      try {
        const result = await task.run();
        const duration = Date.now() - taskStart;

        if (result.success) {
          this.taskQueue.done(task.id);
          completed++;
          
          // Log result data if present
          if (result.data) {
            this.yaml(`${task.id}_result`, result.message || 'Task completed', result.data);
          }
          
          this.results.push({
            name: task.name,
            status: 'done',
            duration
          });
        } else {
          this.taskQueue.fail(task.id, result.error || 'Unknown error');
          failed++;
          
          this.results.push({
            name: task.name,
            status: 'failed',
            duration,
            error: result.error
          });

          if (!this.options.continueOnError) {
            break;
          }
        }
      } catch (error) {
        const duration = Date.now() - taskStart;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        this.taskQueue.fail(task.id, errorMsg);
        failed++;
        
        this.results.push({
          name: task.name,
          status: 'failed',
          duration,
          error: errorMsg
        });

        if (!this.options.continueOnError) {
          break;
        }
      }

      // Progress update
      if (this.options.showProgress) {
        const progress = completed + failed + skipped;
        this.log(`📊 Progress: ${progress}/${this.tasks.length} (${completed} done, ${failed} failed, ${skipped} skipped)`);
      }
    }

    const totalDuration = Date.now() - this.startTime;

    // Final TODO
    if (this.options.showProgress) {
      console.log('\n## Final Status\n');
      this.printTodo();
    }

    // Summary
    this.yaml('run_summary', 'Execution summary', {
      success: failed === 0,
      completed,
      failed,
      skipped,
      total: this.tasks.length,
      duration_ms: totalDuration
    });

    return {
      success: failed === 0,
      completed,
      failed,
      skipped,
      total: this.tasks.length,
      duration: totalDuration,
      tasks: this.results
    };
  }

  /**
   * Get renderer for direct access
   */
  getRenderer(): ShellRenderer {
    return this.renderer;
  }

  /**
   * Get task queue for direct access
   */
  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export function createCLIRunner(name: string, version: string, options?: Partial<CLIRunnerOptions>): CLIRunner {
  return new CLIRunner({
    name,
    version,
    ...options
  });
}

export default CLIRunner;
