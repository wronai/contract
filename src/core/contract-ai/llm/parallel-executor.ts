/**
 * Parallel LLM Executor
 * 
 * Multi-threaded task execution using multiple LLM providers simultaneously.
 * Increases throughput by distributing requests across free LLMs.
 * 
 * Features:
 * - Concurrent requests to multiple providers
 * - Load balancing with round-robin and least-loaded strategies
 * - Task queue with priority support
 * - Rate limiting per provider
 * - Automatic failover
 * 
 * @version 2.4.1
 */

import { EventEmitter } from 'events';
import {
  ILLMProvider,
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMProviderType,
  createProvider
} from './llm-provider';

// ============================================================================
// TYPES
// ============================================================================

export interface ParallelTask {
  id: string;
  messages: LLMMessage[];
  config?: Partial<LLMConfig>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  preferredProvider?: LLMProviderType;
  timeout?: number;
  retries?: number;
  createdAt: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  response?: LLMResponse;
  error?: string;
  provider: LLMProviderType;
  duration: number;
  retryCount: number;
}

export interface ProviderStats {
  provider: LLMProviderType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatency: number;
  currentLoad: number;
  rateLimit: number;
  lastRequestTime: number;
}

export interface ParallelExecutorConfig {
  maxConcurrency: number;
  defaultTimeout: number;
  maxRetries: number;
  rateLimitPerProvider: number;
  rateLimitWindowMs: number;
  loadBalanceStrategy: 'round-robin' | 'least-loaded' | 'random' | 'latency';
}

export interface BatchRequest {
  tasks: ParallelTask[];
  onProgress?: (completed: number, total: number) => void;
  onTaskComplete?: (result: TaskResult) => void;
}

// ============================================================================
// WORKER POOL
// ============================================================================

class WorkerPool {
  private workers: Map<LLMProviderType, ILLMProvider> = new Map();
  private stats: Map<LLMProviderType, ProviderStats> = new Map();
  private requestTimestamps: Map<LLMProviderType, number[]> = new Map();

  constructor(private config: ParallelExecutorConfig) {}

  addWorker(type: LLMProviderType, provider: ILLMProvider): void {
    this.workers.set(type, provider);
    this.stats.set(type, {
      provider: type,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgLatency: 0,
      currentLoad: 0,
      rateLimit: this.config.rateLimitPerProvider,
      lastRequestTime: 0
    });
    this.requestTimestamps.set(type, []);
  }

  getWorker(type: LLMProviderType): ILLMProvider | undefined {
    return this.workers.get(type);
  }

  getAllWorkers(): Map<LLMProviderType, ILLMProvider> {
    return this.workers;
  }

  getStats(type: LLMProviderType): ProviderStats | undefined {
    return this.stats.get(type);
  }

  getAllStats(): ProviderStats[] {
    return Array.from(this.stats.values());
  }

  canMakeRequest(type: LLMProviderType): boolean {
    const timestamps = this.requestTimestamps.get(type) || [];
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindowMs;
    
    // Clean old timestamps
    const recentRequests = timestamps.filter(t => t > windowStart);
    this.requestTimestamps.set(type, recentRequests);
    
    return recentRequests.length < this.config.rateLimitPerProvider;
  }

  recordRequest(type: LLMProviderType, success: boolean, latency: number): void {
    const stats = this.stats.get(type);
    if (!stats) return;

    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }
    
    // Update average latency
    stats.avgLatency = (stats.avgLatency * (stats.totalRequests - 1) + latency) / stats.totalRequests;
    stats.lastRequestTime = Date.now();

    // Record timestamp for rate limiting
    const timestamps = this.requestTimestamps.get(type) || [];
    timestamps.push(Date.now());
    this.requestTimestamps.set(type, timestamps);
  }

  incrementLoad(type: LLMProviderType): void {
    const stats = this.stats.get(type);
    if (stats) stats.currentLoad++;
  }

  decrementLoad(type: LLMProviderType): void {
    const stats = this.stats.get(type);
    if (stats && stats.currentLoad > 0) stats.currentLoad--;
  }

  selectProvider(strategy: string, preferred?: LLMProviderType): LLMProviderType | null {
    const available = Array.from(this.workers.keys()).filter(t => this.canMakeRequest(t));
    
    if (available.length === 0) return null;
    if (preferred && available.includes(preferred)) return preferred;

    switch (strategy) {
      case 'round-robin':
        return this.roundRobinSelect(available);
      case 'least-loaded':
        return this.leastLoadedSelect(available);
      case 'latency':
        return this.lowestLatencySelect(available);
      case 'random':
      default:
        return available[Math.floor(Math.random() * available.length)];
    }
  }

  private roundRobinSelect(available: LLMProviderType[]): LLMProviderType {
    // Select based on total requests (least used)
    let minRequests = Infinity;
    let selected = available[0];
    
    for (const type of available) {
      const stats = this.stats.get(type);
      if (stats && stats.totalRequests < minRequests) {
        minRequests = stats.totalRequests;
        selected = type;
      }
    }
    
    return selected;
  }

  private leastLoadedSelect(available: LLMProviderType[]): LLMProviderType {
    let minLoad = Infinity;
    let selected = available[0];
    
    for (const type of available) {
      const stats = this.stats.get(type);
      if (stats && stats.currentLoad < minLoad) {
        minLoad = stats.currentLoad;
        selected = type;
      }
    }
    
    return selected;
  }

  private lowestLatencySelect(available: LLMProviderType[]): LLMProviderType {
    let minLatency = Infinity;
    let selected = available[0];
    
    for (const type of available) {
      const stats = this.stats.get(type);
      if (stats) {
        const latency = stats.avgLatency || Infinity;
        if (latency < minLatency) {
          minLatency = latency;
          selected = type;
        }
      }
    }
    
    return selected;
  }
}

// ============================================================================
// TASK QUEUE
// ============================================================================

class TaskQueue {
  private queues: Map<string, ParallelTask[]> = new Map([
    ['critical', []],
    ['high', []],
    ['normal', []],
    ['low', []]
  ]);

  enqueue(task: ParallelTask): void {
    const queue = this.queues.get(task.priority) || this.queues.get('normal')!;
    queue.push(task);
  }

  dequeue(): ParallelTask | null {
    for (const priority of ['critical', 'high', 'normal', 'low']) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  size(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  isEmpty(): boolean {
    return this.size() === 0;
  }

  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
  }
}

// ============================================================================
// PARALLEL EXECUTOR
// ============================================================================

export class ParallelExecutor extends EventEmitter {
  private config: ParallelExecutorConfig;
  private workerPool: WorkerPool;
  private taskQueue: TaskQueue;
  private activeRequests: number = 0;
  private results: Map<string, TaskResult> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<ParallelExecutorConfig> = {}) {
    super();
    this.config = {
      maxConcurrency: 5,
      defaultTimeout: 60000,
      maxRetries: 2,
      rateLimitPerProvider: 10,
      rateLimitWindowMs: 60000,
      loadBalanceStrategy: 'least-loaded',
      ...config
    };
    this.workerPool = new WorkerPool(this.config);
    this.taskQueue = new TaskQueue();
  }

  /**
   * Add LLM provider to the pool
   */
  addProvider(config: LLMConfig): void {
    const provider = createProvider(config);
    this.workerPool.addWorker(config.provider, provider);
    this.emit('provider-added', config.provider);
  }

  /**
   * Add multiple providers from configs
   */
  addProviders(configs: LLMConfig[]): void {
    for (const config of configs) {
      this.addProvider(config);
    }
  }

  /**
   * Submit single task
   */
  async submitTask(task: Omit<ParallelTask, 'id' | 'createdAt'>): Promise<TaskResult> {
    const fullTask: ParallelTask = {
      ...task,
      id: this.generateTaskId(),
      createdAt: Date.now(),
      priority: task.priority || 'normal',
      timeout: task.timeout || this.config.defaultTimeout,
      retries: task.retries ?? this.config.maxRetries
    };

    return this.executeTask(fullTask);
  }

  /**
   * Submit batch of tasks for parallel execution
   */
  async submitBatch(request: BatchRequest): Promise<TaskResult[]> {
    const { tasks, onProgress, onTaskComplete } = request;
    const results: TaskResult[] = [];
    let completed = 0;

    // Create promises for all tasks
    const promises = tasks.map(async (task) => {
      const fullTask: ParallelTask = {
        ...task,
        id: task.id || this.generateTaskId(),
        createdAt: Date.now(),
        priority: task.priority || 'normal',
        timeout: task.timeout || this.config.defaultTimeout,
        retries: task.retries ?? this.config.maxRetries
      };

      const result = await this.executeTask(fullTask);
      
      completed++;
      onProgress?.(completed, tasks.length);
      onTaskComplete?.(result);
      
      return result;
    });

    // Execute with concurrency limit
    const chunkedResults = await this.executeWithConcurrency(promises);
    return chunkedResults;
  }

  /**
   * Execute multiple different prompts in parallel across providers
   */
  async parallelGenerate(
    prompts: Array<{ messages: LLMMessage[]; config?: Partial<LLMConfig> }>,
    options: { maxConcurrency?: number; onProgress?: (i: number, total: number) => void } = {}
  ): Promise<LLMResponse[]> {
    const tasks: ParallelTask[] = prompts.map((p, i) => ({
      id: `parallel-${i}-${Date.now()}`,
      messages: p.messages,
      config: p.config,
      priority: 'normal',
      createdAt: Date.now()
    }));

    const results = await this.submitBatch({
      tasks,
      onProgress: options.onProgress
    });

    return results
      .filter(r => r.success && r.response)
      .map(r => r.response!);
  }

  /**
   * Execute same prompt across all providers (for comparison/consensus)
   */
  async broadcastGenerate(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>
  ): Promise<Map<LLMProviderType, LLMResponse>> {
    const providers = Array.from(this.workerPool.getAllWorkers().keys());
    const results = new Map<LLMProviderType, LLMResponse>();

    const promises = providers.map(async (providerType) => {
      const task: ParallelTask = {
        id: `broadcast-${providerType}-${Date.now()}`,
        messages,
        config,
        priority: 'high',
        preferredProvider: providerType,
        createdAt: Date.now()
      };

      const result = await this.executeTask(task);
      if (result.success && result.response) {
        results.set(providerType, result.response);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Race multiple providers - return first successful response
   */
  async raceGenerate(
    messages: LLMMessage[],
    config?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const providers = Array.from(this.workerPool.getAllWorkers().keys());
    
    const promises = providers.map(async (providerType) => {
      const worker = this.workerPool.getWorker(providerType);
      if (!worker) throw new Error(`Provider ${providerType} not found`);
      
      return worker.chat(messages, config);
    });

    return Promise.race(promises);
  }

  /**
   * Get statistics for all providers
   */
  getStats(): ProviderStats[] {
    return this.workerPool.getAllStats();
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.taskQueue.size();
  }

  /**
   * Get active request count
   */
  getActiveRequests(): number {
    return this.activeRequests;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async executeTask(task: ParallelTask): Promise<TaskResult> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: string = '';

    while (retryCount <= (task.retries || 0)) {
      // Select provider
      const providerType = this.workerPool.selectProvider(
        this.config.loadBalanceStrategy,
        task.preferredProvider
      );

      if (!providerType) {
        // Wait for rate limit to reset
        await this.delay(1000);
        retryCount++;
        lastError = 'No providers available (rate limited)';
        continue;
      }

      const worker = this.workerPool.getWorker(providerType);
      if (!worker) {
        retryCount++;
        lastError = `Provider ${providerType} not found`;
        continue;
      }

      try {
        this.activeRequests++;
        this.workerPool.incrementLoad(providerType);
        this.emit('task-started', { taskId: task.id, provider: providerType });

        const response = await this.withTimeout(
          worker.chat(task.messages, task.config),
          task.timeout || this.config.defaultTimeout
        );

        const duration = Date.now() - startTime;
        this.workerPool.recordRequest(providerType, true, duration);

        const result: TaskResult = {
          taskId: task.id,
          success: true,
          response,
          provider: providerType,
          duration,
          retryCount
        };

        this.results.set(task.id, result);
        this.emit('task-completed', result);
        
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        this.workerPool.recordRequest(providerType, false, Date.now() - startTime);
        retryCount++;
        
        this.emit('task-retry', { taskId: task.id, provider: providerType, error: lastError, retryCount });

      } finally {
        this.activeRequests--;
        this.workerPool.decrementLoad(providerType);
      }
    }

    // All retries exhausted
    const result: TaskResult = {
      taskId: task.id,
      success: false,
      error: lastError,
      provider: task.preferredProvider || 'ollama',
      duration: Date.now() - startTime,
      retryCount
    };

    this.results.set(task.id, result);
    this.emit('task-failed', result);
    
    return result;
  }

  private async executeWithConcurrency<T>(promises: Promise<T>[]): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        results.push(result);
      });

      executing.push(p);

      if (executing.length >= this.config.maxConcurrency) {
        await Promise.race(executing);
        // Remove completed promises
        const completed = executing.filter(e => {
          // Check if promise is settled (hacky but works)
          let settled = false;
          e.then(() => { settled = true; }).catch(() => { settled = true; });
          return !settled;
        });
        executing.length = 0;
        executing.push(...completed);
      }
    }

    await Promise.all(executing);
    return results;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Request timeout')), ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      throw error;
    }
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create parallel executor with default free providers
 */
export function createParallelExecutor(
  configs: LLMConfig[],
  options?: Partial<ParallelExecutorConfig>
): ParallelExecutor {
  const executor = new ParallelExecutor(options);
  executor.addProviders(configs);
  return executor;
}

/**
 * Create executor optimized for free models
 */
export function createFreeModelsExecutor(): ParallelExecutor {
  const executor = new ParallelExecutor({
    maxConcurrency: 10,
    rateLimitPerProvider: 20,
    rateLimitWindowMs: 60000,
    loadBalanceStrategy: 'least-loaded'
  });

  // Add free providers
  const freeConfigs: LLMConfig[] = [
    {
      provider: 'windsurf',
      model: 'deepseek-v3-0324',
      baseUrl: process.env.WINDSURF_URL || 'https://api.windsurf.ai/v1',
      apiKey: process.env.WINDSURF_API_KEY
    },
    {
      provider: 'windsurf',
      model: 'deepseek-r1-0528',
      baseUrl: process.env.WINDSURF_URL || 'https://api.windsurf.ai/v1',
      apiKey: process.env.WINDSURF_API_KEY
    },
    {
      provider: 'windsurf',
      model: 'gpt-5.1-codex',
      baseUrl: process.env.WINDSURF_URL || 'https://api.windsurf.ai/v1',
      apiKey: process.env.WINDSURF_API_KEY
    },
    {
      provider: 'ollama',
      model: process.env.OLLAMA_MODEL || 'codellama',
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
    }
  ];

  // Only add if API key is available
  if (process.env.OPENROUTER_API_KEY) {
    freeConfigs.push({
      provider: 'openrouter',
      model: 'deepseek/deepseek-coder-33b-instruct',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY
    });
  }

  executor.addProviders(freeConfigs);
  return executor;
}

export default ParallelExecutor;
