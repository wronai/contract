/**
 * Task Queue
 * 
 * Manages task execution pipeline with status tracking and YAML output.
 * 
 * @version 1.0.0
 */

import { ShellRenderer } from './shell-renderer';

// ============================================================================
// TYPES
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

// ============================================================================
// TASK QUEUE CLASS
// ============================================================================

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
      this.printTodoList(true);
    }
  }

  skip(id: string): void {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'skipped';
      task.completedAt = new Date();
    }
  }

  printTodoList(force = false): void {
    if (!this.verbose) return;
    
    const pending = this.tasks.filter(t => t.status === 'pending').length;
    const running = this.tasks.filter(t => t.status === 'running').length;
    const done = this.tasks.filter(t => t.status === 'done').length;
    const failed = this.tasks.filter(t => t.status === 'failed').length;
    
    const allDone = pending === 0 && running === 0;
    const justStarted = done === 0 && running === 1;
    
    if (justStarted || force) {
      this.renderer.heading(2, 'TODO');
      const yaml = [
        '# @type: task_queue',
        '# @description: Evolution pipeline task list',
        'progress:',
        `  done: ${done}`,
        `  total: ${this.tasks.length}`,
        ...(failed > 0 ? [`  failed: ${failed}`] : []),
        'tasks:',
        ...this.tasks.map(t => {
          const err = t.status === 'failed' && t.error
            ? `\n    error: "${t.error.substring(0, 180).replace(/\"/g, '\\"')}"`
            : '';
          return `  - name: "${t.name}"\n    status: ${t.status}${err}`;
        })
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
          const err = t.status === 'failed' && t.error ? `\n    error: "${t.error.substring(0, 180).replace(/\"/g, '\\"')}"` : '';
          return `  - name: "${t.name}"\n    status: ${t.status}\n    duration_sec: ${duration}${err}`;
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

export default TaskQueue;
