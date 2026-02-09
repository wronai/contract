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
import { spawn, ChildProcess, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { ShellRenderer } from './shell-renderer';
import { CodeRAG, CodeChunk, SearchResult } from './code-rag';
import { TemplateRAG, Template } from '../templates';
import { TaskQueue, Task, TaskStatus } from './task-queue';
import { GitAnalyzer, GitState } from './git-analyzer';
import { StateAnalyzer, StateDiscrepancy, MultiLevelState } from './state-analyzer';
import { TestGenerator } from './test-generator';
import { DocGenerator } from './doc-generator';
import { PromptBuilder } from './llm-prompts';
import { FallbackTemplates } from './fallback-templates';
import { getStageRequirements } from '../templates/contracts';
import { handleFolders, handleValidateApi, TaskContext } from './task-handlers';
import { LLMOrchestrator } from './llm-orchestrator';
import {
  createMinimalContract as _createMinimalContract,
  extractEntitiesFromPrompt as _extractEntitiesFromPrompt,
  getEntityFields as _getEntityFields,
  getEntityRelations as _getEntityRelations,
  capitalize as _capitalize,
  singularize as _singularize,
  isValidEntityName as _isValidEntityName,
} from './contract-extractor';
import { 
  ParallelExecutor, 
  createFreeModelsExecutor,
  LLMManager,
  createLLMManagerFromEnv,
  ContextGenerator
} from '../llm';

// Re-export types for backward compatibility
export { GitState } from './git-analyzer';
export { StateDiscrepancy, MultiLevelState } from './state-analyzer';
export { Task, TaskStatus } from './task-queue';
export { TestGenerator } from './test-generator';
export { DocGenerator } from './doc-generator';
export { PromptBuilder } from './llm-prompts';
export { FallbackTemplates } from './fallback-templates';

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

// NOTE: The following classes have been extracted to separate files:
// - GitAnalyzer -> git-analyzer.ts
// - StateAnalyzer -> state-analyzer.ts  
// - TaskQueue -> task-queue.ts

// Placeholder - the old code between here and EvolutionManager class was removed
export class EvolutionManager {
  private options: EvolutionOptions;
  private llmClient: LLMClient | null = null;
  private contract: ContractAI | null = null;
  private serviceProcess: ChildProcess | null = null;
  private lastServiceExit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
  private evolutionHistory: EvolutionCycle[] = [];
  private serviceLogs: LogEntry[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private logAnalysisTimer: NodeJS.Timeout | null = null;
  private taskQueue: TaskQueue;
  private renderer: ShellRenderer;
  private gitAnalyzer: GitAnalyzer;
  private stateAnalyzer: StateAnalyzer;
  private codeRag: CodeRAG | null = null;
  private templateRag: TemplateRAG;
  private importMode: boolean = false;
  
  // Multi-LLM parallel execution
  private parallelExecutor: ParallelExecutor | null = null;
  private llmManager: LLMManager | null = null;
  private contextGenerator: ContextGenerator | null = null;

  constructor(options: Partial<EvolutionOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.taskQueue = new TaskQueue(this.options.verbose);
    this.renderer = new ShellRenderer(this.options.verbose);
    this.gitAnalyzer = new GitAnalyzer(this.options.outputDir);
    this.stateAnalyzer = new StateAnalyzer(this.options.outputDir, this.options.port);
    this.templateRag = new TemplateRAG();
  }

  // ============================================================================
  // CODE RAG - Intelligent code navigation and understanding
  // ============================================================================

  /**
   * Initialize CodeRAG for intelligent code navigation
   */
  async initCodeRAG(): Promise<{ files: number; chunks: number }> {
    this.codeRag = new CodeRAG(this.llmClient || undefined);
    
    if (this.options.verbose) {
      this.narrate('Initializing CodeRAG', 'Building semantic index of codebase');
    }

    const stats = await this.codeRag.index(this.options.outputDir);

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: code_rag_indexed',
        '# @description: Semantic code index built for intelligent navigation',
        'index:',
        `  files: ${stats.files}`,
        `  chunks: ${stats.chunks}`,
        '  capabilities:',
        '    - semantic_search',
        '    - call_graph',
        '    - hierarchical_navigation'
      ].join('\n'));
    }

    return stats;
  }

  /**
   * Ask a question about the codebase
   */
  async askCode(question: string): Promise<{ answer: string; sources: SearchResult[] }> {
    if (!this.codeRag) {
      await this.initCodeRAG();
    }

    if (this.options.verbose) {
      this.narrate('Querying codebase', question.substring(0, 50) + '...');
    }

    const result = await this.codeRag!.ask(question);

    if (this.options.verbose && result.sources.length > 0) {
      this.renderer.codeblock('yaml', [
        '# @type: code_rag_search',
        '# @description: Found relevant code sections',
        'sources:',
        ...result.sources.slice(0, 5).map(s => [
          `  - type: "${s.chunk.type}"`,
          `    name: "${s.chunk.name}"`,
          `    file: "${s.chunk.filePath}"`,
          `    lines: ${s.chunk.startLine}-${s.chunk.endLine}`,
          `    score: ${s.score.toFixed(2)}`
        ].join('\n'))
      ].join('\n'));
    }

    return result;
  }

  /**
   * Find usages of a symbol in the codebase
   */
  findSymbolUsages(symbol: string): CodeChunk[] {
    if (!this.codeRag) {
      return [];
    }
    return this.codeRag.findUsages(symbol);
  }

  /**
   * Get hierarchical structure of the codebase
   */
  getCodeStructure(): { level: number; name: string; count: number }[] {
    if (!this.codeRag) {
      return [];
    }
    return this.codeRag.getStructure().map(l => ({
      level: l.level,
      name: l.name,
      count: l.chunks.length
    }));
  }

  /**
   * Build context for LLM using CodeRAG
   */
  async buildRAGContext(query: string, maxChunks: number = 5): Promise<string> {
    if (!this.codeRag) {
      await this.initCodeRAG();
    }

    const result = await this.codeRag!.ask(query);
    
    if (result.sources.length === 0) {
      return 'No relevant code found for context.';
    }

    const context = result.sources.slice(0, maxChunks).map(s => 
      `### ${s.chunk.type}: ${s.chunk.name}\n` +
      `File: ${s.chunk.filePath}:${s.chunk.startLine}\n` +
      (s.chunk.summary ? `Summary: ${s.chunk.summary}\n` : '') +
      `\`\`\`${s.chunk.language}\n${s.chunk.code.substring(0, 1000)}\n\`\`\``
    ).join('\n\n');

    return context;
  }

  // ============================================================================
  // TEMPLATE RAG - Technology-agnostic prompt building
  // ============================================================================

  /**
   * Build technology-agnostic prompt from contract and templates
   * LLM decides technology based on contract hints, not hardcoded values
   */
  private buildContractDrivenPrompt(task: string): string {
    if (!this.contract) {
      return `Generate code for: ${task}`;
    }

    const sections: string[] = [];

    // 1. Task description (no tech specified)
    sections.push(`## Task\n${task}`);

    // 2. Contract context (hints, not requirements)
    sections.push(this.templateRag.buildContextFromContract(this.contract));

    // 3. Relevant templates as examples
    const templates = this.templateRag.getRelevantTemplates(this.contract, task);
    if (templates.length > 0) {
      sections.push(this.templateRag.exportAsContext(templates));
    }

    // 4. Entities from contract
    const entities = this.contract.definition?.entities || [];
    if (entities.length > 0) {
      sections.push('\n## Entities to implement');
      for (const entity of entities) {
        const fields = entity.fields?.map(f => `${f.name}: ${f.type}${f.annotations?.required ? ' (required)' : ''}`).join(', ') || 'id, name';
        sections.push(`- **${entity.name}**: { ${fields} }`);
      }
    }

    // 5. Guidelines (no tech-specific)
    sections.push(`
## Guidelines
- Choose appropriate technology based on contract hints
- If no tech specified, use simple and minimal solution
- Implement all CRUD operations for each entity
- Include health check endpoint
- Use proper error handling
- Generate clean, readable code
`);

    return sections.join('\n');
  }

  /**
   * Get tech stack from contract or return defaults
   */
  private getTechStackFromContract(): { language: string; framework: string; database?: string } {
    const techStack = this.contract?.generation?.techStack;
    
    return {
      language: techStack?.backend?.language || 'typescript',
      framework: techStack?.backend?.framework || 'express',
      database: techStack?.database?.type
    };
  }

  /**
   * Run multi-level state analysis to detect discrepancies
   */
  async analyzeState(): Promise<MultiLevelState> {
    // Ensure analyzer uses the latest selected port
    this.stateAnalyzer.setPort(this.options.port);
    const state = await this.stateAnalyzer.analyze();
    
    if (this.options.verbose) {
      this.narrate('Running multi-level state analysis', 'Comparing Contract ↔ Code ↔ Service ↔ Logs');
      
      this.renderer.codeblock('yaml', [
        '# @type: multi_level_analysis',
        '# @description: Compares contract, sourcecode, service, and logs for discrepancies',
        'analysis:',
        '  contract:',
        `    entities: [${state.contract.entities.join(', ')}]`,
        `    endpoints: ${state.contract.endpoints.length}`,
        '  sourcecode:',
        `    files: ${state.sourceCode.files.length}`,
        `    detected_endpoints: ${state.sourceCode.detectedEndpoints.length}`,
        `    detected_entities: [${state.sourceCode.detectedEntities.join(', ')}]`,
        '  service:',
        `    port: ${state.service.port ?? this.options.port}`,
        `    running: ${state.service.running}`,
        `    health: ${state.service.healthEndpoint}`,
        '  logs:',
        `    errors: ${state.logs.errors.length}`,
        `    warnings: ${state.logs.warnings.length}`,
        '  reconciliation:',
        `    reconciled: ${state.reconciled}`,
        `    discrepancies: ${state.discrepancies.length}`
      ].join('\n'));

      const errCount = state.discrepancies.filter(d => d.severity === 'error').length;
      const warnCount = state.discrepancies.filter(d => d.severity === 'warning').length;
      const probes = (state.service as any).probes || [];
      const probesOk = probes.filter((p: any) => p && p.ok).length;
      const probesFail = probes.filter((p: any) => p && !p.ok).length;
      const lastLogError = state.logs.errors.length > 0 ? state.logs.errors[state.logs.errors.length - 1] : '';

      this.renderer.codeblock('yaml', [
        '# @type: decision_trace',
        'decision:',
        `  service_port: ${state.service.port ?? this.options.port}`,
        `  service_running: ${state.service.running}`,
        `  health_ok: ${state.service.healthEndpoint}`,
        `  probes_total: ${probes.length}`,
        `  probes_ok: ${probesOk}`,
        `  probes_failed: ${probesFail}`,
        `  discrepancies_total: ${state.discrepancies.length}`,
        `  discrepancies_errors: ${errCount}`,
        `  discrepancies_warnings: ${warnCount}`,
        `  logs_errors: ${state.logs.errors.length}`,
        `  logs_last_error: ${JSON.stringify(lastLogError).substring(0, 220)}`
      ].join('\n'));

      if (probes.length > 0) {
        const sample = probes.slice(0, 12).map((p: any) => {
          const base = [`  - endpoint: ${JSON.stringify(String(p.endpoint || ''))}`];
          base.push(`    ok: ${Boolean(p.ok)}`);
          if (typeof p.status === 'number') base.push(`    status: ${p.status}`);
          if (p.error) base.push(`    error: ${JSON.stringify(String(p.error)).substring(0, 220)}`);
          return base.join('\n');
        });
        this.renderer.codeblock('yaml', [
          '# @type: service_probes',
          `port: ${state.service.port ?? this.options.port}`,
          `count: ${probes.length}`,
          'probes:',
          ...sample
        ].join('\n'));
      }

      try {
        const statePath = path.join(this.options.outputDir, 'state', 'evolution-state.json');
        if (fs.existsSync(statePath)) {
          const snap = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
          const tasks = Array.isArray(snap.tasks) ? snap.tasks : [];
          const done = tasks.filter((t: any) => t && t.status === 'done').length;
          const pending = tasks.filter((t: any) => t && t.status === 'pending').length;
          const failed = tasks.filter((t: any) => t && t.status === 'failed').length;
          this.renderer.codeblock('yaml', [
            '# @type: state_snapshot',
            `file: ${JSON.stringify(statePath)}`,
            `timestamp: ${JSON.stringify(String(snap.timestamp || ''))}`,
            'tasks:',
            `  done: ${done}`,
            `  pending: ${pending}`,
            `  failed: ${failed}`,
            'service:',
            `  port: ${Number((snap.service || {}).port || 0) || this.options.port}`,
            `  outputDir: ${JSON.stringify(String((snap.service || {}).outputDir || this.options.outputDir))}`
          ].join('\n'));
        }
      } catch {}

      if (state.discrepancies.length > 0) {
        this.renderer.codeblock('yaml', [
          '# @type: discrepancies',
          '# @description: Found mismatches between contract and actual state',
          'discrepancies:',
          ...state.discrepancies.map(d => [
            `  - level: "${d.level}"`,
            `    severity: "${d.severity}"`,
            `    expected: "${d.expected}"`,
            `    actual: "${d.actual}"`,
            `    suggestion: "${d.suggestion}"`
          ].join('\n'))
        ].join('\n'));
      }
    }

    return state;
  }

  /**
   * Reconcile state - fix discrepancies using LLM
   */
  async reconcileState(): Promise<{ fixed: number; remaining: number }> {
    const state = await this.analyzeState();
    let fixed = 0;

    if (state.reconciled) {
      this.narrate('State is reconciled', 'No discrepancies found');
      return { fixed: 0, remaining: 0 };
    }

    const plan = this.stateAnalyzer.generateReconciliationPlan(state);
    this.narrate('Reconciliation plan', plan.join('\n'));

    // Try to fix discrepancies
    for (const discrepancy of state.discrepancies) {
      if (discrepancy.severity === 'error') {
        const recovery = await this.attemptRecovery(
          discrepancy.level,
          `${discrepancy.expected} but ${discrepancy.actual}`,
          JSON.stringify(state)
        );
        if (recovery.fixed) {
          fixed++;
          this.narrate('Fixed discrepancy', `${discrepancy.level}: ${recovery.action}`);
        }
      }
    }

    return { fixed, remaining: state.discrepancies.length - fixed };
  }

  /**
   * Import existing project - creates contract from Git state
   */
  async importFromGit(targetDir?: string): Promise<ContractAI | null> {
    const dir = targetDir || this.options.outputDir;
    const analyzer = new GitAnalyzer(dir);
    
    if (!analyzer.isGitRepo()) {
      if (this.options.verbose) {
        this.narrate('Not a Git repository', `${dir} is not a Git repository`);
      }
      return null;
    }

    this.importMode = true;
    this.gitAnalyzer = analyzer;

    if (this.options.verbose) {
      this.narrate('Importing from Git', `Analyzing existing codebase at ${dir}`);
      const state = analyzer.getFullState();
      this.renderer.codeblock('yaml', [
        '# @type: git_import',
        '# @description: Importing project state from Git repository',
        'git:',
        `  branch: "${state.branch}"`,
        `  last_commit: "${state.lastCommit?.hash || 'none'}"`,
        `  files_tracked: ${state.fileStructure.filter(f => f.type === 'file').length}`,
        'detected_stack:',
        `  language: "${state.detectedStack.language}"`,
        `  framework: "${state.detectedStack.framework}"`,
        `  dependencies: ${state.detectedStack.dependencies.length}`
      ].join('\n'));
    }

    const contract = await analyzer.generateContractFromCode(this.llmClient || undefined);
    if (contract) {
      this.contract = contract;
      this.writeContractSnapshot();
      
      if (this.options.verbose) {
        this.narrate('Contract generated from codebase', `Found ${contract.definition?.entities?.length || 0} entities`);
      }
    }

    return contract;
  }

  /**
   * Get current Git state
   */
  getGitState(): GitState | null {
    if (!this.gitAnalyzer.isGitRepo()) return null;
    return this.gitAnalyzer.getFullState();
  }

  /**
   * Sets LLM client for code generation
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * Initialize parallel LLM execution for multi-provider generation
   */
  async initParallelLLM(): Promise<{ providers: number; available: number }> {
    try {
      // Create parallel executor with free models
      this.parallelExecutor = createFreeModelsExecutor();
      
      // Create LLM manager from env
      this.llmManager = createLLMManagerFromEnv();
      const statuses = await this.llmManager.checkAvailability();
      
      // Create context generator
      this.contextGenerator = new ContextGenerator(this.llmManager);
      
      const available = statuses.filter(s => s.available).length;
      
      if (this.options.verbose) {
        this.narrate('Parallel LLM initialized', `${available}/${statuses.length} providers available`);
        for (const status of statuses) {
          console.log(`   ${status.available ? '✅' : '❌'} ${status.provider}${status.latencyMs ? ` (${status.latencyMs}ms)` : ''}`);
        }
      }
      
      return { providers: statuses.length, available };
    } catch (error) {
      if (this.options.verbose) {
        console.log('   ⚠️  Parallel LLM init failed, using single provider');
      }
      return { providers: 0, available: 0 };
    }
  }

  /**
   * Generate code for multiple entities in parallel
   */
  async generateEntitiesParallel(): Promise<GeneratedFile[]> {
    if (!this.contract || !this.parallelExecutor) {
      return [];
    }

    const entities = this.contract.definition?.entities || [];
    if (entities.length === 0) return [];

    if (this.options.verbose) {
      this.narrate('Parallel generation', `Generating ${entities.length} entities across multiple LLMs`);
    }

    const prompts = entities.map(entity => ({
      messages: [
        {
          role: 'system' as const,
          content: `You are an expert TypeScript developer. Generate Express.js CRUD API code for the ${entity.name} entity. Output only TypeScript code.`
        },
        {
          role: 'user' as const,
          content: `Generate complete CRUD API routes for entity:\n${JSON.stringify(entity, null, 2)}\n\nInclude: GET all, GET by id, POST create, PUT update, DELETE. Use in-memory Map storage.`
        }
      ]
    }));

    try {
      const responses = await this.parallelExecutor.parallelGenerate(prompts, {
        onProgress: (completed, total) => {
          if (this.options.verbose) {
            process.stdout.write(`\r   → Generated ${completed}/${total} entities`);
          }
        }
      });

      if (this.options.verbose) {
        console.log(''); // newline after progress
      }

      // Parse responses into files
      const files: GeneratedFile[] = [];
      for (let i = 0; i < responses.length; i++) {
        const entity = entities[i];
        const response = responses[i];
        if (response?.content) {
          files.push({
            path: `api/src/routes/${entity.name.toLowerCase()}.routes.ts`,
            content: this.extractCode(response.content),
            target: 'api'
          });
        }
      }

      return files;
    } catch (error) {
      if (this.options.verbose) {
        console.log('   ⚠️  Parallel generation failed, falling back to sequential');
      }
      return [];
    }
  }

  /**
   * Generate contract using context-based LLM (no templates)
   */
  async generateContractFromPrompt(prompt: string): Promise<ContractAI | null> {
    if (!this.contextGenerator) {
      await this.initParallelLLM();
    }
    
    if (!this.contextGenerator) {
      return null;
    }

    if (this.options.verbose) {
      this.narrate('Context-based generation', 'Using LLM to generate contract from prompt');
    }

    return this.contextGenerator.generateContract(prompt);
  }

  /**
   * Extract code from LLM response
   */
  private extractCode(content: string): string {
    const codeMatch = content.match(/```(?:typescript|ts|javascript|js)?\n?([\s\S]*?)```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
    return content.trim();
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

  private lastStateLogTime = 0;

  /**
   * Writes current state to JSON file for LLM context
   * Includes Git state as additional source of truth
   * @param forceLog - force logging even if recent (for important milestones)
   */
  private writeStateSnapshot(forceLog = false): void {
    const stateDir = path.join(this.options.outputDir, 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // Get Git state if available
    let gitState: Partial<GitState> | null = null;
    if (this.gitAnalyzer.isGitRepo()) {
      const fullGit = this.gitAnalyzer.getFullState();
      gitState = {
        isGitRepo: true,
        branch: fullGit.branch,
        lastCommit: fullGit.lastCommit,
        status: fullGit.status,
        detectedStack: fullGit.detectedStack
      };
    }

    const tasks = this.taskQueue.getTasks();
    const state = {
      timestamp: new Date().toISOString(),
      mode: this.importMode ? 'import' : 'create',
      tasks: tasks.map(t => ({
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
      },
      git: gitState
    };

    const outPath = path.join(stateDir, 'evolution-state.json');
    fs.writeFileSync(outPath, JSON.stringify(state, null, 2), 'utf-8');

    const todoPath = path.join(stateDir, 'todo.json');
    fs.writeFileSync(todoPath, JSON.stringify(state.tasks, null, 2), 'utf-8');

    // Only log state snapshot every 5 seconds or on force (to reduce noise)
    const now = Date.now();
    const shouldLog = forceLog || (now - this.lastStateLogTime > 5000);
    
    if (this.options.verbose && shouldLog) {
      this.lastStateLogTime = now;
      const done = tasks.filter(t => t.status === 'done').length;
      const pending = tasks.filter(t => t.status === 'pending').length;
      const failed = tasks.filter(t => t.status === 'failed').length;
      
      // Compact single-line progress
      this.renderer.codeblock('log', `📊 Progress: ${done}/${tasks.length} done${failed > 0 ? `, ${failed} failed` : ''}`);
    }
  }

  private readOutputFileSnippet(relPath: string, maxChars: number): string {
    try {
      const fullPath = path.join(this.options.outputDir, relPath);
      if (!fs.existsSync(fullPath)) return '';
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.length <= maxChars) return content;
      return content.substring(0, maxChars) + '\n…';
    } catch {
      return '';
    }
  }

  private validateApiOutput(): { required: string[]; missing: string[] } {
    const required = ['api/src/server.ts', 'api/package.json', 'api/tsconfig.json'];
    const missing = required.filter(p => !fs.existsSync(path.join(this.options.outputDir, p)));
    return { required, missing };
  }

  private getMustNonApiTargets(): string[] {
    const targets = new Set<string>();
    const instructions = this.contract?.generation?.instructions || [];
    for (const inst of instructions) {
      if (inst.priority !== 'must') continue;
      if (inst.target === 'all' || inst.target === 'api') continue;
      targets.add(inst.target);
    }
    return Array.from(targets);
  }

  private validateLayer2Output(): { mustTargets: string[]; missingTargets: string[] } {
    const mustTargets = this.getMustNonApiTargets();
    const missingTargets: string[] = [];

    for (const t of mustTargets) {
      if (t === 'tests') {
        const testsDir = path.join(this.options.outputDir, 'tests');
        const hasTests = fs.existsSync(testsDir) && fs.readdirSync(testsDir).length > 0;
        if (!hasTests) missingTargets.push('tests');
      } else if (t === 'frontend') {
        const feDir = path.join(this.options.outputDir, 'frontend');
        const hasFrontend = fs.existsSync(feDir) && fs.readdirSync(feDir).length > 0;
        if (!hasFrontend) missingTargets.push('frontend');
      } else if (t === 'database') {
        const dbDir = path.join(this.options.outputDir, 'database');
        const hasDb = fs.existsSync(dbDir) && fs.readdirSync(dbDir).length > 0;
        if (!hasDb) missingTargets.push('database');
      } else if (t === 'docker') {
        const composePath = path.join(this.options.outputDir, 'docker-compose.yml');
        const dockerDir = path.join(this.options.outputDir, 'docker');
        const hasCompose = fs.existsSync(composePath);
        const hasDockerDir = fs.existsSync(dockerDir) && fs.readdirSync(dockerDir).length > 0;
        if (!hasCompose || !hasDockerDir) missingTargets.push('docker');
      } else if (t === 'cicd') {
        const wf = path.join(this.options.outputDir, '.github', 'workflows', 'ci.yml');
        if (!fs.existsSync(wf)) missingTargets.push('cicd');
      }
    }

    return { mustTargets, missingTargets };
  }

  private getTargetPriority(target: string): 'must' | 'should' | 'may' | null {
    const instructions = (this.contract?.generation?.instructions || []) as any[];
    const priorities = instructions
      .filter(i => i && i.target === target)
      .map(i => i.priority)
      .filter(Boolean);
    if (priorities.includes('must')) return 'must';
    if (priorities.includes('should')) return 'should';
    if (priorities.includes('may')) return 'may';
    return null;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;
    let timedOut = false;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new Error('timeout'));
      }, ms);
    });

    try {
      const result = await Promise.race([
        promise.finally(() => {
          if (timeoutId) clearTimeout(timeoutId);
        }),
        timeoutPromise
      ]);
      return result as T;
    } catch (e) {
      if (timedOut) {
        promise.catch(() => {});
      }
      throw e;
    }
  }

  private async withRetries<T>(
    fn: () => Promise<T>,
    attempts: number,
    delayMs: number,
    shouldRetry?: (e: any) => boolean
  ): Promise<T> {
    let lastError: any;
    const maxAttempts = Math.max(1, Number(attempts || 1));
    const baseDelay = Math.max(0, Number(delayMs || 0));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (e: any) {
        lastError = e;
        const retryAllowed = shouldRetry ? shouldRetry(e) : true;
        if (!retryAllowed || attempt === maxAttempts) {
          throw e;
        }
        const sleepMs = baseDelay * Math.pow(2, attempt - 1);
        if (sleepMs > 0) await this.sleep(sleepMs);
      }
    }

    throw lastError;
  }

  private yamlEscape(value: string): string {
    return (value ?? '').toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private getErrorHints(errorMsg: string): { type: string; hints: string[] } {
    const msg = (errorMsg || '').toString();
    const lower = msg.toLowerCase();

    if (lower.includes('eaddrinuse') || lower.includes('address already in use')) {
      return {
        type: 'port_in_use',
        hints: [
          'Run with a different port: ./bin/reclapp evolve --port 3001',
          'Kill process on the port: lsof -ti:3000 | xargs kill -9'
        ]
      };
    }

    if (lower.includes('model') && (lower.includes('not found') || lower.includes('pull with'))) {
      return {
        type: 'llm_model_missing',
        hints: [
          'Start Ollama: ollama serve',
          'Pull model: ollama pull <model>'
        ]
      };
    }

    if (lower.includes('timeout')) {
      return {
        type: 'timeout',
        hints: [
          'Increase timeout via RECLAPP_LLM_TIMEOUT_MS (e.g. 90000)',
          'Or rely on fallback output (no LLM)'
        ]
      };
    }

    const missingModuleMatch = msg.match(/Cannot find module '([^']+)'/);
    if (missingModuleMatch) {
      const mod = missingModuleMatch[1];
      return {
        type: 'missing_dependency',
        hints: [
          `Install dependency: cd ${this.options.outputDir}/api && npm i ${mod}`,
          'If this is a test dependency, install under output/tests instead',
          'Prefer Node 18+ built-in fetch over node-fetch (remove dependency when possible)'
        ]
      };
    }

    if (lower.includes('npm') || lower.includes('command failed') || lower.includes('enoent')) {
      return {
        type: 'command_failed',
        hints: [
          'Verify Node.js version (requires 18+): node --version',
          'Try running the failing command manually in the output folder',
          'Check logs in output/logs/*.rcl.md'
        ]
      };
    }

    if (lower.includes('health_not_ok') || lower.includes('service not responding')) {
      return {
        type: 'health_check_failed',
        hints: [
          `curl -v http://localhost:${this.options.port}/health`,
          `tail -n 200 ${this.options.outputDir}/logs/*.rcl.md`,
          'Verify the server registers /health and is listening on PORT'
        ]
      };
    }

    return {
      type: 'unknown',
      hints: [
        `Check logs: ${this.options.outputDir}/logs/*.rcl.md`,
        'Re-run with --verbose for more context'
      ]
    };
  }

  private logErrorHints(scope: string, taskId: string, errorMsg: string): void {
    if (!this.options.verbose) return;

    const info = this.getErrorHints(errorMsg);
    const yaml = [
      '# @type: error_hints',
      'error:',
      `  scope: "${this.yamlEscape(scope)}"`,
      `  task: "${this.yamlEscape(taskId)}"`,
      `  type: "${this.yamlEscape(info.type)}"`,
      `  message: "${this.yamlEscape((errorMsg || '').toString().substring(0, 220))}"`,
      '  hints:',
      ...info.hints.map(h => `    - "${this.yamlEscape(h)}"`)
    ].join('\n');

    this.renderer.codeblock('yaml', yaml);
  }

  // ============================================================
  // MULTI-LEVEL ERROR RECOVERY SYSTEM
  // Level 1: Heuristic/Algorithm fixes (pattern-based, instant)
  // Level 2: Fallback generators (deterministic, no LLM)
  // Level 3: LLM fix request (ask LLM to fix specific error)
  // Level 4: LLM-generated fix functions (create reusable fixes)
  // ============================================================

  private fixRegistry: Map<string, { code: string; successCount: number }> = new Map();

  /**
   * Multi-level error recovery - tries increasingly complex strategies
   */
  private async attemptRecovery(taskId: string, error: string, context: string): Promise<{ fixed: boolean; strategy: string; action?: string }> {
    // Level 1: Heuristic fixes (instant, pattern-based)
    const heuristicFix = this.tryHeuristicFix(taskId, error);
    if (heuristicFix.fixed) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: recovery_level1\nstrategy: "heuristic"\npattern: "${heuristicFix.pattern}"\naction: "${heuristicFix.action}"`);
      }
      return { fixed: true, strategy: 'heuristic', action: heuristicFix.action };
    }

    // Level 2: Check fix registry for known solutions
    const registryFix = this.tryRegistryFix(taskId, error);
    if (registryFix.fixed) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: recovery_level2\nstrategy: "registry"\nfix_id: "${registryFix.fixId}"`);
      }
      return { fixed: true, strategy: 'registry', action: registryFix.action };
    }

    // Level 3: Fallback generator (deterministic)
    const fallbackFix = await this.tryFallbackFix(taskId, error);
    if (fallbackFix.fixed) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: recovery_level3\nstrategy: "fallback"\ngenerator: "${fallbackFix.generator}"`);
      }
      return { fixed: true, strategy: 'fallback', action: fallbackFix.action };
    }

    // Level 4: Ask LLM to fix (expensive, but intelligent)
    const llmFix = await this.tryLLMFix(taskId, error, context);
    if (llmFix.fixed) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: recovery_level4\nstrategy: "llm_fix"\nconfidence: ${llmFix.confidence}`);
      }
      // Store successful fix in registry for future use
      if (llmFix.reusableFix) {
        this.fixRegistry.set(`${taskId}:${this.hashError(error)}`, {
          code: llmFix.reusableFix,
          successCount: 1
        });
      }
      return { fixed: true, strategy: 'llm_fix', action: llmFix.action };
    }

    return { fixed: false, strategy: 'none' };
  }

  /**
   * Level 1: Heuristic fixes - pattern matching for common errors
   */
  private tryHeuristicFix(taskId: string, error: string): { fixed: boolean; pattern?: string; action?: string } {
    const patterns: Array<{ regex: RegExp; taskIds: string[]; fix: () => { action: string; apply: () => void } }> = [
      // Missing module/dependency
      {
        regex: /Cannot find module ['"]([^'"]+)['"]/,
        taskIds: ['install', 'llm-api', 'run-tests'],
        fix: () => ({
          action: 'install_missing_dep',
          apply: () => {
            const match = error.match(/Cannot find module ['"]([^'"]+)['"]/);
            if (match) {
              const dep = match[1].split('/')[0];
              // Add to package.json
              const pkgPath = path.join(this.options.outputDir, 'api', 'package.json');
              if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                pkg.dependencies = pkg.dependencies || {};
                pkg.dependencies[dep] = '*';
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
              }
            }
          }
        })
      },
      // Port already in use
      {
        regex: /EADDRINUSE|address already in use/i,
        taskIds: ['start', 'health'],
        fix: () => ({
          action: 'kill_port_process',
          apply: () => {
            // Will retry with same port after killing
            try {
              require('child_process').execSync(`lsof -ti:${this.options.port} | xargs kill -9 2>/dev/null || true`);
            } catch {}
          }
        })
      },
      // TypeScript compilation error
      {
        regex: /TS\d+:|error TS/,
        taskIds: ['validate-api', 'run-tests'],
        fix: () => ({
          action: 'add_tsconfig_loose',
          apply: () => {
            const tsconfigPath = path.join(this.options.outputDir, 'api', 'tsconfig.json');
            const tsconfig = {
              compilerOptions: {
                target: 'ES2020',
                module: 'commonjs',
                strict: false,
                skipLibCheck: true,
                esModuleInterop: true,
                resolveJsonModule: true,
                outDir: './dist'
              }
            };
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
          }
        })
      },
      // File not found
      {
        regex: /ENOENT|no such file/i,
        taskIds: ['save-api', 'validate-api'],
        fix: () => ({
          action: 'create_missing_dirs',
          apply: () => {
            const dirs = ['api/src', 'api/dist', 'tests/e2e'];
            for (const dir of dirs) {
              const fullPath = path.join(this.options.outputDir, dir);
              if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
              }
            }
          }
        })
      }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(error) && pattern.taskIds.includes(taskId)) {
        const fix = pattern.fix();
        fix.apply();
        return { fixed: true, pattern: pattern.regex.source, action: fix.action };
      }
    }

    return { fixed: false };
  }

  private hashError(error: string): string {
    return error
      .replace(/[0-9]/g, 'N')
      .replace(/['"][^'"]+['"]/g, 'STR')
      .substring(0, 80);
  }

  private async generateDynamicServerCode(): Promise<string> {
    const entity = this.contract?.definition?.entities?.[0]?.name || 'Item';
    const plural = entity.toLowerCase() + 's';
    const apiPrefix = this.contract?.definition?.api?.prefix || '';
    const basePath = `${apiPrefix}/${plural}`.replace(/\/\/+/, '/');

    return `import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const store = new Map<string, any>();
let nextId = 1;

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('${basePath}', (_req, res) => res.json(Array.from(store.values())));
app.post('${basePath}', (req, res) => {
  const id = String(nextId++);
  const item = { id, ...req.body, createdAt: new Date().toISOString() };
  store.set(id, item);
  res.status(201).json(item);
});
app.get('${basePath}/:id', (req, res) => {
  const item = store.get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});
app.put('${basePath}/:id', (req, res) => {
  const existing = store.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  store.set(req.params.id, updated);
  res.json(updated);
});
app.delete('${basePath}/:id', (req, res) => {
  if (!store.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  store.delete(req.params.id);
  res.status(204).send();
});

app.listen(${this.options.port}, () => console.log('Server on port ${this.options.port}'));
`;
  }

  private async generateDynamicPackageJson(): Promise<string> {
    return JSON.stringify({
      name: 'api',
      private: true,
      type: 'module',
      scripts: {
        dev: 'tsx watch src/server.ts',
        start: 'tsx src/server.ts'
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        tsx: '^4.7.0',
        typescript: '^5.3.0',
        '@types/express': '^4.17.21',
        '@types/cors': '^2.8.17'
      }
    }, null, 2);
  }

  /**
   * Level 2: Registry fix - use previously successful LLM-generated fixes
   */
  private tryRegistryFix(taskId: string, error: string): { fixed: boolean; fixId?: string; action?: string } {
    const key = `${taskId}:${this.hashError(error)}`;
    const fix = this.fixRegistry.get(key);
    
    if (fix && fix.successCount > 0) {
      try {
        // Execute stored fix code
        eval(fix.code);
        fix.successCount++;
        return { fixed: true, fixId: key, action: 'registry_fix_applied' };
      } catch {
        fix.successCount = 0; // Mark as broken
      }
    }

    return { fixed: false };
  }

  /**
   * Level 3: Fallback generators - uses LLM when available, otherwise deterministic
   */
  private async tryFallbackFix(taskId: string, error: string): Promise<{ fixed: boolean; generator?: string; action?: string }> {
    const fallbacks: Record<string, () => Promise<boolean>> = {
      'llm-api': async () => {
        // Try LLM-powered generation first, then fallback
        const serverCode = await this.generateDynamicServerCode();
        const packageJson = await this.generateDynamicPackageJson();
        
        const serverPath = path.join(this.options.outputDir, 'api', 'src', 'server.ts');
        const pkgPath = path.join(this.options.outputDir, 'api', 'package.json');
        
        fs.mkdirSync(path.dirname(serverPath), { recursive: true });
        fs.writeFileSync(serverPath, serverCode);
        fs.writeFileSync(pkgPath, packageJson);
        
        return true;
      },
      'save-api': async () => {
        // Same as llm-api fallback
        const serverCode = await this.generateDynamicServerCode();
        const packageJson = await this.generateDynamicPackageJson();
        
        const serverPath = path.join(this.options.outputDir, 'api', 'src', 'server.ts');
        const pkgPath = path.join(this.options.outputDir, 'api', 'package.json');
        
        fs.mkdirSync(path.dirname(serverPath), { recursive: true });
        fs.writeFileSync(serverPath, serverCode);
        fs.writeFileSync(pkgPath, packageJson);
        
        return true;
      },
      'validate-api': async () => {
        // Create missing required files with dynamic content
        const required = ['api/src/server.ts', 'api/package.json', 'api/tsconfig.json'];
        for (const file of required) {
          const fullPath = path.join(this.options.outputDir, file);
          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });
            if (file.endsWith('server.ts')) {
              fs.writeFileSync(fullPath, await this.generateDynamicServerCode());
            } else if (file.endsWith('package.json')) {
              fs.writeFileSync(fullPath, await this.generateDynamicPackageJson());
            } else if (file.endsWith('tsconfig.json')) {
              fs.writeFileSync(fullPath, JSON.stringify({
                compilerOptions: {
                  target: 'ES2020',
                  module: 'NodeNext',
                  moduleResolution: 'NodeNext',
                  strict: false,
                  skipLibCheck: true,
                  esModuleInterop: true,
                  outDir: './dist'
                }
              }, null, 2));
            }
          }
        }
        return true;
      },
      'generate-tests': async () => {
        await this.generateTestFiles();
        return true;
      },
      'install': async () => {
        // Ensure package.json exists before install
        const pkgPath = path.join(this.options.outputDir, 'api', 'package.json');
        if (!fs.existsSync(pkgPath)) {
          fs.writeFileSync(pkgPath, await this.generateDynamicPackageJson());
        }
        return true;
      },
      'start': async () => {
        // Ensure all files exist before start
        const serverPath = path.join(this.options.outputDir, 'api', 'src', 'server.ts');
        if (!fs.existsSync(serverPath)) {
          fs.mkdirSync(path.dirname(serverPath), { recursive: true });
          fs.writeFileSync(serverPath, await this.generateDynamicServerCode());
        }
        return true;
      }
    };

    const fallback = fallbacks[taskId];
    if (fallback) {
      try {
        const success = await fallback();
        if (success) {
          return { fixed: true, generator: taskId, action: 'fallback_generated' };
        }
      } catch (e) {
        // Fallback itself failed
      }
    }

    return { fixed: false };
  }

  /**
   * Level 4: Ask LLM to create a fix
   */
  private async tryLLMFix(taskId: string, error: string, context: string): Promise<{ fixed: boolean; confidence?: number; action?: string; reusableFix?: string }> {
    if (!this.llmClient) return { fixed: false };

    const fixPrompt = `You are debugging a code generation error.

TASK: ${taskId}
ERROR: ${error}

CONTEXT:
${context.substring(0, 4000)}

Generate a fix. Respond with:
1. ANALYSIS: What caused the error
2. FIX_CODE: TypeScript code to fix it (will be eval'd)
3. CONFIDENCE: 0.0-1.0 how likely this fixes it
4. REUSABLE: true/false if this fix can be reused for similar errors

Format:
\`\`\`yaml
analysis: "..."
confidence: 0.8
reusable: true
\`\`\`

\`\`\`typescript
// FIX_CODE - will be executed
// Use 'this' to access EvolutionManager
// Available: this.options.outputDir, fs, path
\`\`\``;

    try {
      const response = await this.llmClient.generate({
        system: 'You are an expert debugger. Generate minimal, safe fixes.',
        user: fixPrompt,
        temperature: 0.3,
        maxTokens: 2000
      });

      // Parse response
      const confidenceMatch = response.match(/confidence:\s*([\d.]+)/);
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5;
      
      const codeMatch = response.match(/```typescript\n([\s\S]*?)```/);
      const fixCode = codeMatch ? codeMatch[1] : null;

      if (fixCode && confidence > 0.5) {
        try {
          // Execute fix code in context
          const fixFn = new Function('manager', 'fs', 'path', fixCode);
          fixFn(this, fs, path);
          
          const reusableMatch = response.match(/reusable:\s*(true|false)/);
          const isReusable = reusableMatch ? reusableMatch[1] === 'true' : false;

          return {
            fixed: true,
            confidence,
            action: 'llm_fix_applied',
            reusableFix: isReusable ? fixCode : undefined
          };
        } catch (e) {
          // Fix code failed to execute
        }
      }
    } catch {
      // LLM request failed
    }

    return { fixed: false };
  }

  /**
   * Orchestrate tests layer
   */
  private async orchestrateTestsLayer(): Promise<boolean> {
    await this.generateTestFiles();
    const testResult = await this.runTests();
    return testResult.passed;
  }

  /**
   * Orchestrate frontend layer using LLM
   */
  private async orchestrateFrontendLayer(): Promise<boolean> {
    if (!this.llmClient) return false;

    const entities = this.contract?.definition?.entities || [];
    const stage = getStageRequirements('frontend');
    const basePrompt = `Generate a minimal React frontend for a ${entities[0]?.name || 'Item'} management app.

Requirements:
- Use Vite + React + TypeScript
- Connect to API at http://localhost:${this.options.port}
- Include list view and create form
- Use fetch for API calls

Generate files:
1. frontend/package.json
2. frontend/vite.config.ts
3. frontend/index.html
4. frontend/src/main.tsx
5. frontend/src/App.tsx

Output each file with \`\`\`filepath:path/to/file format.`;
    const prompt = stage ? `${basePrompt}\n\n${stage}` : basePrompt;

    try {
      const response = await this.llmClient.generate({
        system: 'You are an expert React developer. Generate clean, minimal code.',
        user: prompt,
        temperature: 0.3,
        maxTokens: 4000
      });

      const files = this.parseFilesFromResponse(response);
      if (files.length > 0) {
        await this.writeFiles(files);
        return true;
      }
    } catch {
      // Failed
    }

    return false;
  }

  /**
   * Orchestrate custom layer using LLM
   */
  private async orchestrateCustomLayer(layerName: string): Promise<boolean> {
    if (!this.llmClient) return false;

    const prompt = `Generate code for the "${layerName}" layer of a ${this.contract?.definition?.entities?.[0]?.name || 'Item'} management application.

Based on the contract and existing code, generate appropriate files for this layer.

Output files with \`\`\`filepath:path/to/file format.`;

    try {
      const response = await this.llmClient.generate({
        system: `You are an expert developer generating the ${layerName} layer.`,
        user: prompt,
        temperature: 0.3,
        maxTokens: 4000
      });

      const files = this.parseFilesFromResponse(response);
      if (files.length > 0) {
        await this.writeFiles(files);
        return true;
      }
    } catch {
      // Failed
    }

    return false;
  }

  // ============================================================
  // END ORCHESTRATION SYSTEM
  // ============================================================

  private buildLayer2Context(stateContext: string, missingTargets: string[]): string {
    const contractStr = this.contract ? JSON.stringify(this.contract, null, 2) : '';
    const contractSnippet = contractStr.length > 8000 ? contractStr.substring(0, 8000) + '\n…' : contractStr;

    const recentServer = this.readOutputFileSnippet('api/src/server.ts', 3000);
    const recentPkg = this.readOutputFileSnippet('api/package.json', 2000);
    const recentTs = this.readOutputFileSnippet('api/tsconfig.json', 2000);

    return [
      'Missing contract targets detected. Generate ONLY the missing targets and files.',
      'Do not delete existing files. Do not change dependencies unless required.',
      '',
      'Missing targets:',
      missingTargets.map(t => `- ${t}`).join('\n'),
      '',
      'ContractAI (snippet):',
      contractSnippet,
      '',
      'Recent output files (snippets):',
      recentServer ? `\n[api/src/server.ts]\n${recentServer}` : '\n[api/src/server.ts]\n<missing>',
      recentPkg ? `\n[api/package.json]\n${recentPkg}` : '\n[api/package.json]\n<missing>',
      recentTs ? `\n[api/tsconfig.json]\n${recentTs}` : '\n[api/tsconfig.json]\n<missing>',
      '',
      'Current state:',
      stateContext
    ].join('\n');
  }

  /**
   * Prints a human-readable action description between codeblocks
   */
  private narrate(action: string, details?: string): void {
    if (this.options.verbose) {
      const msg = details ? `${action}: ${details}` : action;
      this.renderer.codeblock('log', `→ ${msg}`);
    }
  }

  /**
   * Log LLM reasoning - what we're about to do and why
   */
  private logReasoning(task: string, problem?: string, approach?: string): void {
    if (!this.options.verbose) return;

    const lines: string[] = [];
    lines.push(`## 🤔 Reasoning: ${task}`);
    if (problem) lines.push(`- **Problem**: ${problem}`);
    if (approach) lines.push(`- **Approach**: ${approach}`);
    this.renderer.codeblock('markdown', lines.join('\n'));
  }

  /**
   * Log LLM request with truncated prompt (max 100 chars)
   */
  private logLLMRequest(purpose: string, prompt: string): void {
    if (!this.options.verbose) return;
    
    const truncated = prompt.length > 100 
      ? prompt.substring(0, 97).replace(/\n/g, ' ') + '...'
      : prompt.replace(/\n/g, ' ');
    
    this.renderer.codeblock('yaml', [
      '# @type: llm_request',
      `# @purpose: ${purpose}`,
      'request:',
      `  prompt: "${truncated}"`,
      `  prompt_length: ${prompt.length}`,
      '  status: sending'
    ].join('\n'));
  }

  /**
   * Log LLM response summary
   */
  private logLLMResponse(success: boolean, chars: number, source: 'llm' | 'fallback'): void {
    if (!this.options.verbose) return;
    
    this.renderer.codeblock('yaml', [
      '# @type: llm_response',
      'response:',
      `  success: ${success}`,
      `  source: "${source}"`,
      `  chars: ${chars}`
    ].join('\n'));
  }

  /**
   * Validates TODO list against contract to ensure correct plan
   */
  private validatePlanAgainstContract(): { valid: boolean; issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    if (!this.contract) {
      issues.push('No contract available for validation');
      return { valid: false, issues, suggestions };
    }

    const entities = this.contract.definition?.entities || [];
    const instructions = this.contract.generation?.instructions || [];
    const tasks = this.taskQueue.getTasks();

    // Check if we have API tasks for entities
    if (entities.length > 0 && !tasks.some(t => t.id === 'llm-api')) {
      issues.push(`Contract has ${entities.length} entities but no API generation task`);
      suggestions.push('Add "Ask LLM for API code" task');
    }

    // Check if required layers from instructions are covered
    for (const inst of instructions) {
      if (inst.priority === 'must') {
        if (inst.target === 'frontend' && !tasks.some(t => t.name.toLowerCase().includes('frontend'))) {
          suggestions.push(`Contract requires frontend (priority: must) - consider adding frontend task`);
        }
        if (inst.target === 'tests' && !tasks.some(t => t.id.includes('test'))) {
          issues.push(`Contract requires tests (priority: must) but no test tasks found`);
        }
      }
    }

    // Validate task order makes sense
    const apiIdx = tasks.findIndex(t => t.id === 'llm-api');
    const installIdx = tasks.findIndex(t => t.id === 'install');
    const testIdx = tasks.findIndex(t => t.id === 'run-tests');
    
    if (apiIdx > installIdx) {
      issues.push('API generation should come before installation');
    }
    if (installIdx > testIdx && testIdx !== -1) {
      issues.push('Installation should come before running tests');
    }

    return { valid: issues.length === 0, issues, suggestions };
  }

  /**
   * Iterative evolution - runs LLM in loop until all tasks complete
   * Task queue shows granular LLM-centric steps for transparency
   */
  async evolveIteratively(prompt: string, maxIterations = 5): Promise<void> {
    this.taskQueue.clear();
    
    // Enable log buffering for markdown export
    this.renderer.enableLog();
    
    // Technology-agnostic task queue - LLM decides implementation
    // Phase 1: Setup & Contract
    this.taskQueue.add('Create output folders', 'folders');
    this.taskQueue.add('Create evolution state file', 'state-file');
    this.taskQueue.add('Parse prompt into contract', 'contract');
    this.taskQueue.add('Save contract.ai.json', 'contract-save');
    this.taskQueue.add('Validate plan against contract', 'validate-plan');
    
    // Phase 2: Backend Generation (tech from contract)
    this.taskQueue.add('Generate backend code', 'llm-api');
    this.taskQueue.add('Save generated files', 'save-api');
    this.taskQueue.add('Validate generated output', 'validate-api');
    
    // Phase 3: Build & Run
    this.taskQueue.add('Install dependencies', 'install');
    this.taskQueue.add('Start service', 'start');
    this.taskQueue.add('Verify service health', 'health');
    
    // Phase 4: Testing
    this.taskQueue.add('Generate tests', 'generate-tests');
    this.taskQueue.add('Run tests', 'run-tests');

    // Phase 5: Database (from contract / tech stack) - best effort unless priority=must
    this.taskQueue.add('Generate database', 'generate-database');

    // Phase 6: Docker (from contract) - best effort unless priority=must
    this.taskQueue.add('Generate Docker', 'generate-docker');

    // Phase 7: CI/CD templates (from contract) - best effort unless priority=must
    this.taskQueue.add('Generate CI/CD templates', 'generate-cicd');

    // Phase 8: Frontend (from contract) - best effort unless priority=must
    this.taskQueue.add('Generate frontend', 'generate-frontend');
    
    // Phase 9: Documentation
    this.taskQueue.add('Generate documentation', 'generate-readme');
    
    // Phase 10: Additional layers (from contract)
    this.taskQueue.add('Validate additional targets', 'layer2');

    // Phase 11: Verification & Reconciliation
    this.taskQueue.add('Verify contract ↔ code ↔ service', 'verify-state');
    this.taskQueue.add('Reconcile discrepancies', 'reconcile');

    if (this.options.verbose) {
      this.renderer.heading(2, 'Iterative Evolution');
      this.narrate('Configuring evolution pipeline', `${maxIterations} max iterations`);
      this.renderer.codeblock('yaml', `# @type: iterative_config\niterations:\n  max: ${maxIterations}\n  mode: "loop until success"\nphases:\n  - setup\n  - api_generation\n  - build_test\n  - e2e_tests\n  - layer2\n  - verification`);
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

      // All done - no pending or failed
      if (pendingTasks.length === 0 && failedTasks.length === 0) {
        if (this.options.verbose) {
          this.renderer.codeblock('yaml', `# @type: iteration_complete\nresult: success\nmessage: "All tasks completed"`);
        }
        break;
      }

      // Reset failed tasks to pending for retry (except on first iteration)
      if (iteration > 0 && failedTasks.length > 0) {
        if (this.options.verbose) {
          this.renderer.codeblock('yaml', `# @type: retry_failed\nfailed_tasks: ${failedTasks.length}\naction: "resetting to pending for retry"`);
        }
        for (const task of failedTasks) {
          task.status = 'pending';
        }
      }

      // Build context with current state
      const stateContext = this.buildStateContext();

      // Process tasks based on state
      for (const task of tasks) {
        if (task.status !== 'pending' && task.status !== 'failed') continue;

        this.taskQueue.start(task.id);

        try {
          switch (task.id) {
            // Phase 1: Setup
            case 'folders':
              this.narrate('Creating project structure', 'Setting up output directories for API, tests, contract, and state');
              const foldersCtx: TaskContext = {
                outputDir: this.options.outputDir,
                port: this.options.port,
                verbose: this.options.verbose,
                contract: this.contract,
                renderer: this.renderer,
                taskQueue: this.taskQueue,
                stateContext,
                prompt
              };
              await handleFolders(foldersCtx);
              this.taskQueue.done(task.id);
              break;

            case 'state-file':
              this.narrate('Initializing state tracking', 'Creating evolution-state.json for LLM context synchronization');
              this.writeStateSnapshot();
              this.taskQueue.done(task.id);
              break;

            case 'contract':
              this.narrate('Parsing user prompt', `Extracting entities and requirements from: "${prompt.substring(0, 50)}..."`);
              this.contract = this.createMinimalContract(prompt);
              this.taskQueue.done(task.id);
              break;

            case 'contract-save':
              this.narrate('Persisting contract', 'Saving contract.ai.json as source of truth for code generation');
              this.writeContractSnapshot();
              this.taskQueue.done(task.id);
              break;

            case 'validate-plan':
              this.narrate('Validating execution plan', 'Checking if TODO list aligns with contract requirements');
              const planValidation = this.validatePlanAgainstContract();
              if (this.options.verbose) {
                this.renderer.codeblock('yaml', [
                  '# @type: plan_validation',
                  '# @description: Ensures TODO list matches contract requirements',
                  `valid: ${planValidation.valid}`,
                  planValidation.issues.length > 0 ? `issues:\n${planValidation.issues.map(i => `  - "${i}"`).join('\n')}` : 'issues: []',
                  planValidation.suggestions.length > 0 ? `suggestions:\n${planValidation.suggestions.map(s => `  - "${s}"`).join('\n')}` : 'suggestions: []'
                ].join('\n'));
              }
              if (!planValidation.valid) {
                this.taskQueue.fail(task.id, planValidation.issues.join('; '));
              } else {
                this.taskQueue.done(task.id);
              }
              break;

            // Phase 2: API Layer Generation
            case 'llm-api':
              this.narrate('Requesting code from LLM', 'Sending contract and context to generate API implementation');
              const code = await this.generateCode(
                failedTasks.length > 0 ? 'error' : 'initial',
                stateContext
              );
              // Store for next task
              (this as any)._lastLlmCode = code;
              if (code.files.length > 0) {
                this.taskQueue.done(task.id);
              } else {
                this.taskQueue.fail(task.id, 'LLM returned no files');
              }
              break;

            case 'save-api':
              this.narrate('Writing generated files', 'Saving LLM output to disk (server.ts, package.json, tsconfig.json)');
              const llmCode = (this as any)._lastLlmCode;
              if (llmCode && llmCode.files.length > 0) {
                await this.writeFiles(llmCode.files);
                this.taskQueue.done(task.id);
              } else {
                this.taskQueue.fail(task.id, 'No files to save');
              }
              break;

            case 'validate-api':
              this.narrate('Validating API artifacts', 'Checking if all required files were generated correctly');
              const apiValidation = this.validateApiOutput();
              if (this.options.verbose) {
                this.renderer.codeblock('yaml', [
                  '# @type: api_validation',
                  '# @description: Verifies presence of required API files',
                  'api:',
                  `  required: ${apiValidation.required.length}`,
                  `  missing: ${apiValidation.missing.length}`,
                  ...(apiValidation.missing.length > 0 ? ['  missing_files:', ...apiValidation.missing.map(p => `    - "${p}"`)] : [])
                ].join('\n'));
              }
              if (apiValidation.missing.length > 0) {
                this.taskQueue.fail(task.id, `Missing: ${apiValidation.missing.join(', ')}`);
              } else {
                this.taskQueue.done(task.id);
              }
              break;

            case 'layer2':
              this.narrate('Checking additional layers', 'Validating if contract requires frontend, tests, or other layers');
              const layer2 = this.validateLayer2Output();
              if (layer2.mustTargets.length === 0) {
                this.narrate('No additional layers required', 'Contract does not specify must-have non-API targets');
                this.taskQueue.done(task.id);
                break;
              }

              if (this.options.verbose) {
                this.renderer.codeblock('yaml', [
                  '# @type: layer2_validation',
                  '# @description: Checks if non-API must targets from contract are satisfied',
                  'layer2:',
                  `  must_targets: ${layer2.mustTargets.length}`,
                  ...(layer2.mustTargets.length > 0 ? ['  targets:', ...layer2.mustTargets.map(t => `    - "${t}"`)] : []),
                  `  missing_targets: ${layer2.missingTargets.length}`,
                  ...(layer2.missingTargets.length > 0 ? ['  missing:', ...layer2.missingTargets.map(t => `    - "${t}"`)] : [])
                ].join('\n'));
              }

              if (layer2.missingTargets.length === 0) {
                this.taskQueue.done(task.id);
                break;
              }

              this.narrate('Generating missing layers', `Asking LLM to create: ${layer2.missingTargets.join(', ')}`);
              
              // Try LLM first, then fallback for frontend
              const layer2Context = this.buildLayer2Context(stateContext, layer2.missingTargets);
              const layer2Code = await this.generateCode('manual', layer2Context);
              if (layer2Code.files.length > 0) {
                await this.writeFiles(layer2Code.files);
              }

              // Fallback: If frontend still missing, use template
              if (layer2.missingTargets.includes('frontend')) {
                const feDir = path.join(this.options.outputDir, 'frontend');
                if (!fs.existsSync(feDir) || fs.readdirSync(feDir).length === 0) {
                  const entityName = this.contract?.definition?.entities?.[0]?.name || 'Item';
                  const frontendFiles = FallbackTemplates.generateFrontend(this.options.port, entityName);
                  for (const [filePath, content] of Object.entries(frontendFiles)) {
                    const fullPath = path.join(this.options.outputDir, filePath);
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(fullPath, content, 'utf-8');
                  }
                  if (this.options.verbose) {
                    this.renderer.codeblock('yaml', `# @type: frontend_fallback\nfiles: ${Object.keys(frontendFiles).length}`);
                  }
                }
              }

              const layer2After = this.validateLayer2Output();
              if (layer2After.missingTargets.length > 0) {
                this.taskQueue.fail(task.id, `Missing targets: ${layer2After.missingTargets.join(', ')}`);
              } else {
                this.taskQueue.done(task.id);
              }
              break;

            case 'generate-tests':
              this.narrate('Creating E2E test suite', 'Generating API tests in tests/e2e/api.e2e.ts');
              await this.generateTestFiles();
              this.taskQueue.done(task.id);
              break;

            case 'install':
              this.narrate('Installing dependencies', 'Running npm install in api directory');
              // Fall through to start
            case 'start':
              await this.startService();
              this.taskQueue.done('install');
              this.taskQueue.done('start');
              break;

            case 'run-tests':
              this.narrate('Executing E2E tests', 'Running API tests to validate CRUD operations');
              const testResult = await this.runTests();
              if (testResult.passed) {
                this.narrate('Tests passed', 'All E2E tests completed successfully');
                this.taskQueue.done(task.id);
              } else {
                throw new Error(testResult.error || 'Tests failed');
              }
              break;

            case 'generate-database': {
              // Always generate database (Prisma schema + .env) like Python does
              this.narrate('Generating database', 'Creating Prisma schema and .env');

              const ok = await this.generateDatabaseArtifacts();
              if (ok) {
                this.taskQueue.done(task.id);
              } else {
                // Don't fail - just skip if generation fails
                this.taskQueue.skip(task.id);
              }
              break;
            }

            case 'generate-cicd': {
              // Always generate CI/CD like Python does (not conditional on priority)
              this.narrate('Generating CI/CD templates', 'Creating GitHub Actions workflow');

              const ok = await this.generateCicdArtifacts();
              if (ok) {
                this.taskQueue.done(task.id);
              } else {
                // Don't fail - just skip if generation fails
                this.taskQueue.skip(task.id);
                if (this.options.verbose) {
                  this.renderer.codeblock('yaml', `# @type: cicd_skip\nreason: "CI/CD generation skipped - no api package.json yet"`);
                }
              }
              break;
            }

            case 'generate-docker': {
              // Always generate Docker like Python does (not conditional on priority)
              this.narrate('Generating Docker', 'Creating Dockerfile and docker-compose.yml');

              const ok = await this.generateDockerArtifacts();
              if (ok) {
                this.taskQueue.done(task.id);
              } else {
                // Don't fail - just skip if generation fails
                this.taskQueue.skip(task.id);
                if (this.options.verbose) {
                  this.renderer.codeblock('yaml', `# @type: docker_skip\nreason: "Docker generation skipped - no api package.json yet"`);
                }
              }
              break;
            }

            case 'generate-frontend': {
              const priority = this.getTargetPriority('frontend');
              if (!priority) {
                this.taskQueue.skip(task.id);
                break;
              }

              this.narrate('Generating frontend', `Contract target: frontend (priority: ${priority})`);

              let ok = false;
              try {
                ok = await this.orchestrateFrontendLayer();
              } catch {
                ok = false;
              }

              // Fallback template if LLM didn't generate frontend
              const feDir = path.join(this.options.outputDir, 'frontend');
              if (!ok) {
                try {
                  const entityName = this.contract?.definition?.entities?.[0]?.name || 'Item';
                  const frontendFiles = FallbackTemplates.generateFrontend(this.options.port, entityName);
                  for (const [filePath, content] of Object.entries(frontendFiles)) {
                    const fullPath = path.join(this.options.outputDir, filePath);
                    const dir = path.dirname(fullPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(fullPath, content, 'utf-8');
                  }
                  ok = true;
                } catch {
                  ok = false;
                }
              }

              const hasFrontend = fs.existsSync(feDir) && fs.readdirSync(feDir).length > 0;
              if (hasFrontend) {
                this.taskQueue.done(task.id);
              } else if (priority === 'must') {
                throw new Error('Frontend generation failed (required by contract)');
              } else {
                this.taskQueue.skip(task.id);
                if (this.options.verbose) {
                  this.renderer.codeblock('yaml', `# @type: frontend_skip\nreason: "Frontend generation failed but target is optional"\npriority: "${priority}"`);
                }
              }
              break;
            }

            case 'generate-readme':
              this.narrate('Generating README.md', 'Creating project documentation from contract');
              await this.generateReadme();
              this.taskQueue.done(task.id);
              break;

            case 'health':
              this.narrate('Health check', `Verifying API responds at http://localhost:${this.options.port}/health`);
              const healthy = await this.checkHealth();
              if (healthy) {
                this.narrate('Service healthy', 'API is responding correctly');
                this.taskQueue.done(task.id);
              } else {
                this.taskQueue.fail(task.id, 'Service not responding');
                if (iteration < maxIterations - 1) {
                  this.taskQueue.add('Retry health check', 'health-retry');
                }
              }
              break;

            // Phase 6: Verification & Reconciliation
            case 'verify-state':
              this.narrate('Multi-level verification', 'Analyzing Contract ↔ SourceCode ↔ Service ↔ Logs');
              const multiState = await this.analyzeState();
              if (multiState.reconciled) {
                this.narrate('State verified', 'All levels are consistent');
                this.taskQueue.done(task.id);
              } else {
                const errorCount = multiState.discrepancies.filter(d => d.severity === 'error').length;
                if (errorCount > 0) {
                  this.taskQueue.fail(task.id, `${errorCount} critical discrepancies found`);
                } else {
                  this.narrate('Minor discrepancies', `${multiState.discrepancies.length} warnings found`);
                  this.taskQueue.done(task.id);
                }
              }
              break;

            case 'reconcile':
              this.narrate('Reconciling state', 'Attempting to fix discrepancies automatically');
              const reconcileResult = await this.reconcileState();
              if (reconcileResult.remaining === 0) {
                this.narrate('Reconciliation complete', `Fixed ${reconcileResult.fixed} discrepancies`);
                this.taskQueue.done(task.id);
              } else {
                this.taskQueue.fail(task.id, `${reconcileResult.remaining} discrepancies could not be fixed`);
              }
              break;
          }
        } catch (error: any) {
          const errorMsg = error.message || String(error);
          this.narrate('Task error encountered', `Attempting recovery for: ${task.id}`);
          if (this.options.verbose) {
            this.renderer.codeblock('yaml', `# @type: task_error\n# @description: Error occurred during task execution\ntask: "${task.id}"\nerror: "${errorMsg.substring(0, 100)}"`);
            const stack = (error && error.stack) ? String(error.stack) : '';
            if (stack) {
              this.renderer.codeblock('log', stack);
            }
          }

          this.logErrorHints('task', task.id, errorMsg);

          const recoveryTaskId = `recovery-${task.id}`;
          if (!this.taskQueue.getTasks().some(t => t.id === recoveryTaskId)) {
            this.taskQueue.add(`Auto-recover: ${task.name}`, recoveryTaskId);
          }
          this.taskQueue.start(recoveryTaskId);

          // Try multi-level recovery before marking as failed
          const recovery = await this.attemptRecovery(task.id, errorMsg, stateContext);
          if (recovery.fixed) {
            this.narrate('Recovery successful', `Fixed using ${recovery.strategy}: ${recovery.action}`);
            if (this.options.verbose) {
              this.renderer.codeblock('yaml', `# @type: recovery_success\n# @description: Error was automatically fixed\ntask: "${task.id}"\nstrategy: "${recovery.strategy}"\naction: "${recovery.action}"`);
            }
            this.taskQueue.done(recoveryTaskId);
            // Reset to pending for immediate retry
            task.status = 'pending';
          } else {
            this.narrate('Recovery failed', 'Will retry on next iteration if available');
            this.taskQueue.fail(recoveryTaskId, 'Unable to recover automatically');
            this.taskQueue.fail(task.id, errorMsg);
          }
        }

        // Update state after each task
        this.writeStateSnapshot();
      }
    }

    // Final state
    this.writeStateSnapshot();
    
    // Save multi-level state snapshot like Python does
    await this.saveMultiLevelStateSnapshot();
    
    // Save evolution log as markdown
    const logPath = path.join(this.options.outputDir, 'logs', `evolution-${Date.now()}.md`);
    this.renderer.saveLog(logPath);
    if (this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: log_saved\nlog:\n  path: "${logPath}"\n  format: "markdown"`);
    }
    
    this.startMonitoring();
  }

  /**
   * Generates E2E test files (delegates to TestGenerator)
   */
  private async generateTestFiles(): Promise<void> {
    if (!this.contract) return;
    const testGen = new TestGenerator(
      { outputDir: this.options.outputDir, port: this.options.port, verbose: this.options.verbose },
      this.llmClient
    );
    await testGen.generateTestFiles(this.contract);
  }


  /**
   * Generates README.md - LLM-powered with fallback
   */
  private async generateReadme(): Promise<void> {
    if (!this.contract) return;

    let readme: string;

    if (this.llmClient) {
      try {
        const stage = getStageRequirements('docs');
        const entities = this.contract.definition?.entities || [];
        const targets = Array.from(new Set((this.contract.generation?.instructions || []).map(i => i.target).filter(t => t && t !== 'all')));
        const projectName = this.contract.definition?.app?.name || 'Generated App';
        const projectDescription = this.contract.definition?.app?.description || 'A generated application';
        const projectVersion = this.contract.definition?.app?.version || '1.0.0';

        // Log reasoning
        this.logReasoning(
          'Generate README.md',
          'Project needs documentation for users and developers',
          'Ask LLM to create README from contract spec, fallback to template if fails'
        );

        const basePrompt = `Generate a comprehensive README.md for a project with the following specification:

Project: ${projectName}
Description: ${projectDescription}
Version: ${projectVersion}

Entities:
${entities.map(e => `- ${e.name}: ${e.fields?.map(f => f.name).join(', ') || 'id, name'}`).join('\n')}

API Endpoints (for each entity):
- GET /{entities} - List all
- POST /{entities} - Create new
- GET /{entities}/:id - Get by ID
- PUT /{entities}/:id - Update
- DELETE /{entities}/:id - Delete

Tech Stack:
- Backend: Express.js + TypeScript
- Port: ${this.options.port}
${targets.includes('frontend') ? '- Frontend: React + TypeScript' : ''}
${targets.includes('tests') ? '- Tests: E2E tests with native fetch' : ''}

Include sections:
1. Project title and description
2. Features (based on entities)
3. Quick Start (installation & running)
4. API Documentation (endpoints table)
5. Project Structure
6. Development commands
7. License (MIT)

Output ONLY the Markdown content, no explanation.`;

        const prompt = stage ? `${basePrompt}\n\n${stage}` : basePrompt;

        this.logLLMRequest('Generate README.md', prompt);

        const timeoutMs = Number(process.env.RECLAPP_LLM_TIMEOUT_MS || 45000);
        const response = await this.withTimeout(this.llmClient.generate({
          system: 'You generate professional README.md files in Markdown. Output only the README content.',
          user: prompt,
          temperature: 0.3,
          maxTokens: 2000
        }), timeoutMs);

        // Extract markdown from response
        const mdMatch = response.match(/```(?:markdown|md)?\n([\s\S]*?)```/);
        readme = mdMatch ? mdMatch[1] : response;

        // Validate
        if (!readme.includes('#') || readme.length < 200) {
          throw new Error('Invalid README generated');
        }
        
        this.logLLMResponse(true, readme.length, 'llm');
      } catch (e: any) {
        if (this.options.verbose && e && e.message === 'timeout') {
          this.renderer.codeblock('yaml', [
            '# @type: llm_timeout',
            '# @description: LLM call exceeded timeout and fallback was used',
            'llm:',
            '  purpose: "Generate README.md"',
            `  timeout_ms: ${Number(process.env.RECLAPP_LLM_TIMEOUT_MS || 45000)}`
          ].join('\n'));
        }
        readme = this.getFallbackReadme();
        this.logLLMResponse(false, readme.length, 'fallback');
      }
    } else {
      readme = this.getFallbackReadme();
      this.logLLMResponse(false, readme.length, 'fallback');
    }

    const readmePath = path.join(this.options.outputDir, 'README.md');
    fs.writeFileSync(readmePath, readme, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: readme_generated',
        '# @description: Project README.md created from contract',
        'readme:',
        `  path: "${readmePath}"`,
        `  bytes: ${readme.length}`,
        `  source: "${this.llmClient ? 'llm' : 'fallback'}"`
      ].join('\n'));
    }

    await this.generateApiDocs();
  }

  private async generateApiDocs(): Promise<void> {
    if (!this.contract) return;
    const api = this.contract.definition?.api;
    if (!api) return;

    const baseUrl = `http://localhost:${this.options.port}`;
    const prefix = api.prefix || '/api';
    const resources = api.resources || [];

    const opToEndpoint = (resourceName: string, op: string): { method: string; path: string } | null => {
      const base = `${prefix}/${resourceName}`.replace(/\/+/g, '/');
      switch (op) {
        case 'list':
          return { method: 'GET', path: base };
        case 'get':
          return { method: 'GET', path: `${base}/:id` };
        case 'create':
          return { method: 'POST', path: base };
        case 'update':
          return { method: 'PUT', path: `${base}/:id` };
        case 'delete':
          return { method: 'DELETE', path: `${base}/:id` };
        default:
          return null;
      }
    };

    const lines: string[] = [];
    lines.push('# API Documentation');
    lines.push('');
    lines.push(`Base URL: \`${baseUrl}\``);
    lines.push('');
    lines.push('## Health');
    lines.push('');
    lines.push('```');
    lines.push('GET /health');
    lines.push('```');
    lines.push('');
    lines.push('## Endpoints');
    lines.push('');
    lines.push('| Method | Path | Resource | Operation |');
    lines.push('|--------|------|----------|-----------|');

    for (const r of resources) {
      const ops = r.operations || [];
      for (const op of ops) {
        const ep = opToEndpoint(r.name, op);
        if (!ep) continue;
        lines.push(`| ${ep.method} | \`${ep.path}\` | ${r.name} | ${op} |`);
      }
      const custom = r.customEndpoints || [];
      for (const c of custom) {
        const base = `${prefix}/${r.name}`.replace(/\/+/g, '/');
        const rel = (c.path || '').startsWith('/') ? c.path : `/${c.path || ''}`;
        const full = `${base}${rel}`.replace(/\/+/g, '/');
        lines.push(`| ${c.method} | \`${full}\` | ${r.name} | custom |`);
      }
    }

    const apiDocs = lines.join('\n');
    const apiPath = path.join(this.options.outputDir, 'API.md');
    fs.writeFileSync(apiPath, apiDocs, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: api_docs_generated',
        'api_docs:',
        `  path: "${apiPath}"`,
        `  bytes: ${apiDocs.length}`,
        `  resources: ${resources.length}`
      ].join('\n'));
    }
  }

  /**
   * Generate Prisma schema like Python does
   */
  private async generatePrismaSchema(): Promise<void> {
    if (!this.contract) return;

    const entities = this.contract.definition?.entities || [];
    const prismaDir = path.join(this.options.outputDir, 'api', 'prisma');
    fs.mkdirSync(prismaDir, { recursive: true });

    const mapPrismaType = (t: string): string => {
      const lower = (t || 'String').toLowerCase();
      if (lower === 'uuid' || lower === 'id') return 'String @id @default(cuid())';
      if (lower === 'int' || lower === 'integer') return 'Int';
      if (lower === 'float' || lower === 'number') return 'Float';
      if (lower === 'boolean' || lower === 'bool') return 'Boolean';
      if (lower === 'datetime' || lower === 'date') return 'DateTime';
      if (lower === 'json') return 'Json';
      return 'String';
    };

    const models: string[] = [];
    for (const entity of entities) {
      const fields: string[] = [];
      const entityFields = entity.fields || [];
      
      // Ensure id field exists
      const hasId = entityFields.some(f => f.name === 'id');
      if (!hasId) {
        fields.push('  id        String   @id @default(cuid())');
      }

      for (const field of entityFields) {
        const prismaType = mapPrismaType(String((field as any).type || 'String'));
        const isId = field.name === 'id';
        if (isId) {
          fields.push(`  ${field.name}        String   @id @default(cuid())`);
        } else {
          fields.push(`  ${field.name}        ${prismaType}`);
        }
      }

      // Add timestamps
      if (!entityFields.some(f => f.name === 'createdAt')) {
        fields.push('  createdAt DateTime @default(now())');
      }
      if (!entityFields.some(f => f.name === 'updatedAt')) {
        fields.push('  updatedAt DateTime @updatedAt');
      }

      models.push(`model ${entity.name} {\n${fields.join('\n')}\n}`);
    }

    // Default model if no entities
    if (models.length === 0) {
      models.push(`model Item {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`);
    }

    const schema = `// Prisma schema generated by Reclapp Evolution
// https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

${models.join('\n\n')}
`;

    fs.writeFileSync(path.join(prismaDir, 'schema.prisma'), schema, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: prisma_schema_generated',
        'prisma:',
        `  path: "${path.join(prismaDir, 'schema.prisma')}"`,
        `  models: ${models.length}`
      ].join('\n'));
    }
  }

  /**
   * Generate api/.env like Python does
   */
  private async generateApiEnv(): Promise<void> {
    const apiDir = path.join(this.options.outputDir, 'api');
    fs.mkdirSync(apiDir, { recursive: true });

    const envContent = [
      '# Environment variables',
      '# Generated by Reclapp Evolution',
      '',
      `PORT=${this.options.port}`,
      'DATABASE_URL="file:./dev.db"',
      ''
    ].join('\n');

    fs.writeFileSync(path.join(apiDir, '.env'), envContent, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: env_generated',
        'env:',
        `  path: "${path.join(apiDir, '.env')}"`,
        `  port: ${this.options.port}`
      ].join('\n'));
    }
  }

  /**
   * Save multi-level state snapshot like Python does
   */
  private async saveMultiLevelStateSnapshot(): Promise<void> {
    const stateDir = path.join(this.options.outputDir, 'state');
    fs.mkdirSync(stateDir, { recursive: true });

    try {
      const state = await this.stateAnalyzer.analyze();
      const snapshot = {
        timestamp: new Date().toISOString(),
        contract: state.contract,
        sourceCode: {
          files: state.sourceCode.files.length,
          detectedEndpoints: state.sourceCode.detectedEndpoints,
          detectedEntities: state.sourceCode.detectedEntities
        },
        service: state.service,
        logs: {
          errors: state.logs.errors.length,
          warnings: state.logs.warnings.length
        },
        reconciled: state.reconciled,
        discrepancies: state.discrepancies
      };

      fs.writeFileSync(
        path.join(stateDir, 'multi-level-state.json'),
        JSON.stringify(snapshot, null, 2),
        'utf-8'
      );

      if (this.options.verbose) {
        this.renderer.codeblock('yaml', [
          '# @type: multi_level_state_saved',
          'state:',
          `  discrepancies: ${state.discrepancies.length}`,
          `  reconciled: ${state.reconciled}`
        ].join('\n'));
      }
    } catch (e) {
      // Silently fail - state snapshot is optional
    }
  }

  private async generateDatabaseArtifacts(): Promise<boolean> {
    if (!this.contract) return false;

    const entities = this.contract.definition?.entities || [];
    
    // Always generate Prisma schema and .env like Python does
    await this.generatePrismaSchema();
    await this.generateApiEnv();
    
    const db = this.contract.generation?.techStack?.database;
    const dbType = db?.type;
    if (!dbType || dbType === 'in-memory') return true; // Still success - we generated Prisma

    if (entities.length === 0) return true;

    const dbDir = path.join(this.options.outputDir, 'database');
    const migDir = path.join(dbDir, 'migrations');
    fs.mkdirSync(migDir, { recursive: true });

    const mapType = (t: string): string => {
      const type = (t || '').toString();
      const lower = type.toLowerCase();

      if (dbType === 'postgresql') {
        if (lower === 'uuid') return 'UUID';
        if (lower === 'int' || lower === 'integer') return 'INTEGER';
        if (lower === 'float' || lower === 'number') return 'DOUBLE PRECISION';
        if (lower === 'boolean' || lower === 'bool') return 'BOOLEAN';
        if (lower === 'datetime' || lower === 'date') return 'TIMESTAMPTZ';
        if (lower === 'json') return 'JSONB';
        return 'TEXT';
      }

      if (dbType === 'mysql') {
        if (lower === 'uuid') return 'CHAR(36)';
        if (lower === 'int' || lower === 'integer') return 'INT';
        if (lower === 'float' || lower === 'number') return 'DOUBLE';
        if (lower === 'boolean' || lower === 'bool') return 'TINYINT(1)';
        if (lower === 'datetime' || lower === 'date') return 'DATETIME';
        if (lower === 'json') return 'JSON';
        return 'VARCHAR(255)';
      }

      // sqlite / mongodb (document) fallback: keep SQL-friendly minimal mapping
      if (lower === 'int' || lower === 'integer') return 'INTEGER';
      if (lower === 'float' || lower === 'number') return 'REAL';
      if (lower === 'boolean' || lower === 'bool') return 'INTEGER';
      return 'TEXT';
    };

    const sqlTables: string[] = [];
    for (const e of entities) {
      const table = e.name.toLowerCase() + 's';
      const cols: string[] = [];

      for (const f of (e.fields || [])) {
        const ann: any = (f as any).annotations || {};
        const isPrimary = Boolean(ann.primary) || f.name === 'id';
        const isRequired = Boolean(ann.required) || isPrimary;
        const colType = mapType(String((f as any).type || 'String'));

        let line = `  ${f.name} ${colType}`;
        if (isPrimary) {
          if (dbType === 'postgresql') {
            line += ' PRIMARY KEY';
          } else if (dbType === 'mysql') {
            line += ' PRIMARY KEY';
          } else {
            line += ' PRIMARY KEY';
          }
        }
        if (isRequired && !isPrimary) {
          line += ' NOT NULL';
        }
        cols.push(line);
      }

      // Ensure timestamps exist
      if (!cols.some(c => c.includes('createdAt'))) {
        cols.push(`  createdAt ${mapType('DateTime')}`);
      }
      if (!cols.some(c => c.includes('updatedAt'))) {
        cols.push(`  updatedAt ${mapType('DateTime')}`);
      }

      sqlTables.push(`CREATE TABLE IF NOT EXISTS ${table} (\n${cols.join(',\n')}\n);`);
    }

    const migration = [
      '-- @type: migration',
      `-- database: ${dbType}`,
      '-- generated by reclapp evolve',
      '',
      ...sqlTables,
      ''
    ].join('\n');
    fs.writeFileSync(path.join(migDir, '001_init.sql'), migration, 'utf-8');

    const envExample = [
      '# Database connection',
      `# type: ${dbType}`,
      '',
      dbType === 'postgresql'
        ? 'DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app'
        : dbType === 'mysql'
          ? 'DATABASE_URL=mysql://root:root@localhost:3306/app'
          : dbType === 'sqlite'
            ? 'DATABASE_URL=file:./database/app.db'
            : 'DATABASE_URL='
    ].join('\n');
    fs.writeFileSync(path.join(dbDir, '.env.example'), envExample, 'utf-8');

    const readme = [
      '# Database',
      '',
      `Type: **${dbType}**`,
      '',
      '## Migrations',
      '',
      '- `database/migrations/001_init.sql`',
      '',
      '## Environment',
      '',
      '- Copy `database/.env.example` to `.env` and adjust `DATABASE_URL`',
      '',
      '## Notes',
      '',
      '- This folder contains generated database artifacts.',
      '- Application runtime integration depends on the generated API layer.'
    ].join('\n');
    fs.writeFileSync(path.join(dbDir, 'README.md'), readme, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: database_generated',
        'database:',
        `  type: "${dbType}"`,
        `  dir: "${dbDir}"`,
        '  files:',
        '    - "database/migrations/001_init.sql"',
        '    - "database/.env.example"',
        '    - "database/README.md"'
      ].join('\n'));
    }

    return true;
  }

  private async generateCicdArtifacts(): Promise<boolean> {
    if (!this.contract) return false;

    const outDir = this.options.outputDir;
    const apiPkg = path.join(outDir, 'api', 'package.json');
    if (!fs.existsSync(apiPkg)) return false;

    const hasFrontend = fs.existsSync(path.join(outDir, 'frontend', 'package.json'));
    const wfDir = path.join(outDir, '.github', 'workflows');
    fs.mkdirSync(wfDir, { recursive: true });

    const lines: string[] = [];
    lines.push('name: CI');
    lines.push('');
    lines.push('on:');
    lines.push('  push:');
    lines.push('  pull_request:');
    lines.push('');
    lines.push('jobs:');
    lines.push('  api:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('    defaults:');
    lines.push('      run:');
    lines.push('        working-directory: api');
    lines.push('    steps:');
    lines.push('      - uses: actions/checkout@v4');
    lines.push('      - uses: actions/setup-node@v4');
    lines.push('        with:');
    lines.push('          node-version: 20');
    lines.push('          cache: npm');
    lines.push('          cache-dependency-path: api/package-lock.json');
    lines.push('      - name: Install');
    lines.push('        run: npm ci || npm install');
    lines.push('      - name: Typecheck');
    lines.push('        run: npm run typecheck || echo "no typecheck"');
    lines.push('      - name: Tests');
    lines.push('        run: npm test || echo "no tests"');

    if (hasFrontend) {
      lines.push('');
      lines.push('  frontend:');
      lines.push('    runs-on: ubuntu-latest');
      lines.push('    defaults:');
      lines.push('      run:');
      lines.push('        working-directory: frontend');
      lines.push('    steps:');
      lines.push('      - uses: actions/checkout@v4');
      lines.push('      - uses: actions/setup-node@v4');
      lines.push('        with:');
      lines.push('          node-version: 20');
      lines.push('          cache: npm');
      lines.push('          cache-dependency-path: frontend/package-lock.json');
      lines.push('      - name: Install');
      lines.push('        run: npm ci || npm install');
      lines.push('      - name: Build');
      lines.push('        run: npm run build || echo "no build"');
    }

    const wf = lines.join('\n') + '\n';
    const wfPath = path.join(wfDir, 'ci.yml');
    fs.writeFileSync(wfPath, wf, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: cicd_generated',
        'cicd:',
        `  path: "${wfPath}"`,
        '  workflows:',
        '    - "ci.yml"'
      ].join('\n'));
    }

    return true;
  }

  private async generateDockerArtifacts(): Promise<boolean> {
    if (!this.contract) return false;

    const outDir = this.options.outputDir;
    const dockerDir = path.join(outDir, 'docker');
    fs.mkdirSync(dockerDir, { recursive: true });

    const hasApi = fs.existsSync(path.join(outDir, 'api', 'package.json'));
    // Generate even if no api - create basic structure
    
    const hasFrontend = fs.existsSync(path.join(outDir, 'frontend', 'package.json'));
    const dbType = this.contract.generation?.techStack?.database?.type;

    // Generate ROOT Dockerfile (like Python does)
    const rootDockerfile = [
      'FROM node:20-alpine',
      '',
      'WORKDIR /app',
      '',
      'COPY api/package*.json ./api/',
      'RUN cd api && npm install --production',
      '',
      'COPY api ./api',
      '',
      'WORKDIR /app/api',
      'ENV NODE_ENV=production',
      `ENV PORT=${this.options.port}`,
      `EXPOSE ${this.options.port}`,
      '',
      'CMD ["npm", "start"]'
    ].join('\n');
    fs.writeFileSync(path.join(outDir, 'Dockerfile'), rootDockerfile, 'utf-8');

    const dockerfileApi = [
      'FROM node:20-alpine',
      '',
      'WORKDIR /app',
      '',
      'COPY api/package.json api/package-lock.json* ./api/',
      'RUN cd api && npm install',
      '',
      'COPY api ./api',
      '',
      'WORKDIR /app/api',
      'ENV HOST=0.0.0.0',
      'ENV PORT=8080',
      'EXPOSE 8080',
      'CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]'
    ].join('\n');
    fs.writeFileSync(path.join(dockerDir, 'Dockerfile.api'), dockerfileApi, 'utf-8');

    if (hasFrontend) {
      const dockerfileFrontend = [
        'FROM node:20-alpine',
        '',
        'WORKDIR /app',
        '',
        'COPY frontend/package.json frontend/package-lock.json* ./frontend/',
        'RUN cd frontend && npm install',
        '',
        'COPY frontend ./frontend',
        '',
        'WORKDIR /app/frontend',
        'ENV HOST=0.0.0.0',
        'ENV PORT=3000',
        'EXPOSE 3000',
        'CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]'
      ].join('\n');
      fs.writeFileSync(path.join(dockerDir, 'Dockerfile.frontend'), dockerfileFrontend, 'utf-8');
    }

    const services: string[] = [];
    services.push('services:');
    services.push('  api:');
    services.push('    build:');
    services.push('      context: .');
    services.push('      dockerfile: docker/Dockerfile.api');
    services.push('    ports:');
    services.push('      - "8080:8080"');
    services.push('    environment:');
    services.push('      - PORT=8080');
    if (dbType && dbType !== 'in-memory') {
      services.push('      - DATABASE_URL=${DATABASE_URL}');
    }

    if (hasFrontend) {
      services.push('');
      services.push('  frontend:');
      services.push('    build:');
      services.push('      context: .');
      services.push('      dockerfile: docker/Dockerfile.frontend');
      services.push('    ports:');
      services.push('      - "3000:3000"');
      services.push('    environment:');
      services.push('      - VITE_API_URL=http://localhost:8080');
      services.push('    depends_on:');
      services.push('      - api');
    }

    if (dbType === 'postgresql') {
      services.push('');
      services.push('  db:');
      services.push('    image: postgres:16-alpine');
      services.push('    ports:');
      services.push('      - "5432:5432"');
      services.push('    environment:');
      services.push('      - POSTGRES_USER=postgres');
      services.push('      - POSTGRES_PASSWORD=postgres');
      services.push('      - POSTGRES_DB=app');
      services.push('    volumes:');
      services.push('      - postgres-data:/var/lib/postgresql/data');
      services.push('');
      services.push('volumes:');
      services.push('  postgres-data:');
    } else if (dbType === 'mysql') {
      services.push('');
      services.push('  db:');
      services.push('    image: mysql:8');
      services.push('    ports:');
      services.push('      - "3306:3306"');
      services.push('    environment:');
      services.push('      - MYSQL_ROOT_PASSWORD=root');
      services.push('      - MYSQL_DATABASE=app');
      services.push('    volumes:');
      services.push('      - mysql-data:/var/lib/mysql');
      services.push('');
      services.push('volumes:');
      services.push('  mysql-data:');
    }

    fs.writeFileSync(path.join(outDir, 'docker-compose.yml'), services.join('\n') + '\n', 'utf-8');

    const envExample = [
      '# Docker compose environment',
      '',
      dbType === 'postgresql'
        ? 'DATABASE_URL=postgresql://postgres:postgres@db:5432/app'
        : dbType === 'mysql'
          ? 'DATABASE_URL=mysql://root:root@db:3306/app'
          : 'DATABASE_URL='
    ].join('\n');
    fs.writeFileSync(path.join(outDir, '.env.example'), envExample, 'utf-8');

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', [
        '# @type: docker_generated',
        'docker:',
        `  dir: "${dockerDir}"`,
        '  files:',
        '    - "docker-compose.yml"',
        '    - "docker/Dockerfile.api"',
        ...(hasFrontend ? ['    - "docker/Dockerfile.frontend"'] : []),
        '    - ".env.example"'
      ].join('\n'));
    }

    return true;
  }

  /**
   * Fallback README generator - analyzes contract and generates markdown
   */
  private getFallbackReadme(): string {
    const name = this.contract?.definition?.app?.name || 'Generated App';
    const description = this.contract?.definition?.app?.description || 'A generated application';
    const version = this.contract?.definition?.app?.version || '1.0.0';
    const entities = this.contract?.definition?.entities || [];
    const targets = Array.from(new Set((this.contract?.generation?.instructions || []).map(i => i.target).filter(t => t && t !== 'all')));
    const port = this.options.port;

    const mainEntity = entities[0]?.name || 'Item';
    const pluralEntity = mainEntity.toLowerCase() + 's';

    // Build entities section
    const entitiesSection = entities.length > 0
      ? entities.map(e => {
          const fields = e.fields?.map(f => `\`${f.name}\` (${f.type})`).join(', ') || '`id`, `name`';
          return `### ${e.name}\n\nFields: ${fields}`;
        }).join('\n\n')
      : `### ${mainEntity}\n\nFields: \`id\`, \`name\`, \`createdAt\``;

    // Build API endpoints table
    const apiTable = entities.length > 0
      ? entities.map(e => {
          const plural = e.name.toLowerCase() + 's';
          return `| GET | /${plural} | List all ${e.name}s |
| POST | /${plural} | Create ${e.name} |
| GET | /${plural}/:id | Get ${e.name} by ID |
| PUT | /${plural}/:id | Update ${e.name} |
| DELETE | /${plural}/:id | Delete ${e.name} |`;
        }).join('\n')
      : `| GET | /${pluralEntity} | List all |
| POST | /${pluralEntity} | Create new |
| GET | /${pluralEntity}/:id | Get by ID |
| PUT | /${pluralEntity}/:id | Update |
| DELETE | /${pluralEntity}/:id | Delete |`;

    return `# ${name}

> ${description}

**Version:** ${version}  
**Generated by:** Reclapp Evolution v2.4.1

## Features

${entities.map(e => `- **${e.name} Management** - Full CRUD operations`).join('\n') || `- **${mainEntity} Management** - Full CRUD operations`}
- RESTful API with Express.js
- TypeScript for type safety
- Health check endpoint
${targets.includes('tests') ? '- E2E tests included' : ''}
${targets.includes('frontend') ? '- React frontend' : ''}

## Quick Start

\`\`\`bash
# Install dependencies
cd api && npm install

# Start development server
npm run dev

# Or start production
npm start
\`\`\`

The API will be available at \`http://localhost:${port}\`

## API Documentation

### Health Check

\`\`\`
GET /health
\`\`\`

Returns: \`{ "status": "ok" }\`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
${apiTable}

## Entities

${entitiesSection}

## Project Structure

\`\`\`
${this.options.outputDir}/
├── api/
│   ├── src/
│   │   └── server.ts      # Main API server
│   ├── package.json
│   └── tsconfig.json
├── tests/
│   ├── e2e/
│   │   └── api.e2e.ts     # E2E tests
│   └── fixtures/
├── contract/
│   └── contract.ai.json   # Source contract
├── state/
│   └── evolution-state.json
└── README.md
\`\`\`

## Development

\`\`\`bash
# Run in development mode (with hot reload)
cd api && npm run dev

# Run tests
cd tests && npx tsx e2e/api.e2e.ts

# Check health
curl http://localhost:${port}/health
\`\`\`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | ${port} | API server port |

## License

MIT
`;
  }

  /**
   * Detect actual API endpoints from generated server.ts
   */
  private detectApiEndpoints(pluralName: string): { basePath: string; endpoints: Record<string, string> } {
    const serverPath = path.join(this.options.outputDir, 'api', 'src', 'server.ts');
    let basePath = `/${pluralName}`;
    
    if (fs.existsSync(serverPath)) {
      const content = fs.readFileSync(serverPath, 'utf-8');
      
      // Detect if using /api/v1 prefix or similar
      const apiPrefixMatch = content.match(/app\.(get|post)\s*\(\s*['"`](\/api(?:\/v\d+)?)\//);
      if (apiPrefixMatch) {
        basePath = `${apiPrefixMatch[2]}/${pluralName}`;
      }
      
      // Try to find the actual endpoint pattern for this entity
      const endpointMatch = content.match(new RegExp(`app\\.(?:get|post)\\s*\\(\\s*['"\`]((?:/[\\w/-]+)?/${pluralName})['"\`]`));
      if (endpointMatch) {
        basePath = endpointMatch[1];
      }
    }

    return {
      basePath,
      endpoints: {
        list: basePath,
        create: basePath,
        get: `${basePath}/:id`,
        update: `${basePath}/:id`,
        delete: `${basePath}/:id`
      }
    };
  }


  /**
   * Runs the generated E2E tests from central tests folder
   */
  private async runTests(): Promise<{ passed: boolean; error?: string }> {
    const absOut = path.resolve(this.options.outputDir);
    const relTestFile = path.join('tests', 'e2e', 'api.e2e.ts');
    const testFile = path.join(absOut, relTestFile);
    
    if (!fs.existsSync(testFile)) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: e2e_skip\nreason: "No E2E test files found"`);
      }
      return { passed: true };
    }

    if (this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: e2e_run\nfile: "${testFile}"\nlayer: "api"`);
    }

    return new Promise((resolve) => {
      let stdoutBuf = '';
      let stderrBuf = '';

      const testProcess = spawn('npx', ['tsx', relTestFile], {
        cwd: absOut,
        stdio: 'pipe'
      });

      testProcess.stdout?.on('data', (data) => {
        const s = data.toString();
        stdoutBuf += s;
        if (this.options.verbose) {
          // Print to console and capture in log buffer
          for (const line of s.split('\n')) {
            if (line.trim()) this.renderer.print(line);
          }
        }
      });
      testProcess.stderr?.on('data', (data) => {
        const s = data.toString();
        stderrBuf += s;
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ passed: true });
          return;
        }

        const err = (stderrBuf || stdoutBuf).trim();
        if (this.options.verbose && err) {
          this.renderer.codeblock('yaml', `# @type: e2e_failure\nexit_code: ${code === null ? 'null' : code}`);
          this.renderer.renderMarkdownWithFences(err.length > 8000 ? err.substring(0, 8000) + '\n…' : err, 'log');
        }
        resolve({ passed: false, error: err ? err.substring(0, 240) : `E2E tests failed (exit_code=${code})` });
      });

      testProcess.on('error', (e: any) => {
        const msg = e && e.message ? e.message : String(e);
        if (this.options.verbose) {
          this.renderer.codeblock('yaml', `# @type: e2e_failure\nexit_code: null\nerror: "${msg.replace(/\"/g, '\\"').substring(0, 180)}"`);
        }
        resolve({ passed: false, error: msg });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        testProcess.kill();
        if (this.options.verbose) {
          this.renderer.codeblock('yaml', `# @type: e2e_failure\nexit_code: null\nerror: "timeout"`);
        }
        resolve({ passed: false, error: 'timeout' });
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

  // Delegates to contract-extractor.ts (R01)
  private createMinimalContract(prompt: string): ContractAI { return _createMinimalContract(prompt); }
  private extractEntitiesFromPrompt(prompt: string) { return _extractEntitiesFromPrompt(prompt); }
  private getEntityFields(entityName: string, prompt: string) { return _getEntityFields(entityName, prompt); }
  private getEntityRelations(entityName: string, allEntities: Set<string>) { return _getEntityRelations(entityName, allEntities); }
  private capitalize(str: string): string { return _capitalize(str); }
  private singularize(str: string): string { return _singularize(str); }
  private isValidEntityName(name: string): boolean { return _isValidEntityName(name); }

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
        const llmRetryAttempts = Number(process.env.RECLAPP_LLM_RETRY_ATTEMPTS || 2);
        const llmRetryDelayMs = Number(process.env.RECLAPP_LLM_RETRY_DELAY_MS || 500);
        response = await this.withRetries(
          () => this.llmClient!.generate({
            system: systemPrompt,
            user: userPrompt,
            temperature: 0.2,
            maxTokens: 16000
          }),
          llmRetryAttempts,
          llmRetryDelayMs,
          (e: any) => {
            const msg = e && e.message ? String(e.message) : String(e);
            return !(msg.includes('not found') || msg.includes('Pull with'));
          }
        );
        
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
        this.logErrorHints('llm', `generateCode:${trigger}`, error.message || String(error));
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
   * Builds system prompt for LLM (delegates to PromptBuilder)
   */
  private buildSystemPrompt(): string {
    return PromptBuilder.buildSystemPrompt();
  }

  /**
   * Builds user prompt based on contract and context (delegates to PromptBuilder)
   */
  private buildUserPrompt(trigger: EvolutionCycle['trigger'], context?: string): string {
    if (!this.contract) return '';
    return PromptBuilder.buildUserPrompt(this.contract, { 
      trigger, 
      context, 
      port: this.options.port 
    });
  }

  /**
   * Parses files from LLM response (delegates to FallbackTemplates)
   */
  private parseFilesFromResponse(response: string): GeneratedFile[] {
    const files = FallbackTemplates.parseFiles(response);
    
    if (this.options.verbose && files.length > 0) {
      this.renderer.codeblock('yaml', [
        '# @type: parsed_files',
        'parsed:',
        `  count: ${files.length}`,
        '  files:',
        ...files.map(f => `    - path: "${f.path}"\n      chars: ${f.content.length}`)
      ].join('\n'));
    }

    if (files.length === 0 && this.options.verbose) {
      this.renderer.codeblock('yaml', `# @type: parse_error\nparsed:\n  count: 0\n  response_length: ${response.length}`);
    }

    return files;
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
        this.renderer.codeblock('log', '⚠️ No package.json, skipping service start');
      }
      return;
    }

    // Install dependencies
    if (this.options.verbose) {
      this.renderer.codeblock('log', '📦 Installing dependencies...');
    }

    await this.runCommand('npm', ['install'], apiDir);

    // Start server
    if (this.options.verbose) {
      this.renderer.codeblock('log', `🚀 Starting service on port ${this.options.port}...`);
    }

    this.lastServiceExit = null;

    // If port is busy, try to free it, otherwise fall back to a free port.
    const initialPort = this.options.port;
    if (!(await this.isPortAvailable(initialPort))) {
      if (this.options.verbose) {
        this.renderer.codeblock('yaml', `# @type: port_conflict\nport: ${initialPort}\naction: "attempt_kill_then_find_free_port"`);
      }

      await this.killProcessOnPort(initialPort);

      if (!(await this.isPortAvailable(initialPort))) {
        const next = await this.findAvailablePort(initialPort + 1, 25);
        if (next !== null) {
          if (this.options.verbose) {
            this.renderer.codeblock('yaml', `# @type: port_changed\nfrom: ${initialPort}\nto: ${next}`);
          }
          this.options.port = next;
          this.stateAnalyzer.setPort(next);
        } else {
          throw new Error(`EADDRINUSE: port ${initialPort} is busy and no free port was found`);
        }
      }
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

    this.serviceProcess.on('exit', (code, signal) => {
      this.lastServiceExit = { code, signal };
      this.serviceProcess = null;
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
        this.renderer.codeblock('log', '🛑 Service stopped');
      }
    }
  }

  /**
   * Restarts the service
   */
  async restartService(): Promise<void> {
    if (this.options.verbose) {
      this.renderer.codeblock('log', '🔄 Restarting service...');
    }
    
    await this.stopService();
    await this.startService();
  }

  /**
   * Waits for service health check
   */
  private async waitForHealth(maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      if (!this.serviceProcess) {
        return false;
      }
      const ok = await this.checkHealth();
      if (ok) {
        if (this.options.verbose) {
          this.renderer.codeblock('log', '✅ Service is healthy');
        }
        return true;
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
    if (!this.serviceProcess) return false;
    const attempts = Number(process.env.RECLAPP_HEALTH_RETRY_ATTEMPTS || 3);
    const delayMs = Number(process.env.RECLAPP_HEALTH_RETRY_DELAY_MS || 250);
    try {
      await this.withRetries(
        async () => {
          const response = await fetch(`http://localhost:${this.options.port}/health`);
          if (!response.ok) {
            throw new Error(`health_not_ok:${response.status}`);
          }
          return true;
        },
        attempts,
        delayMs
      );
      return true;
    } catch {
      return false;
    }
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const srv = net.createServer();
      srv.once('error', () => resolve(false));
      srv.once('listening', () => {
        srv.close(() => resolve(true));
      });
      srv.listen(port, '0.0.0.0');
    });
  }

  private async findAvailablePort(startPort: number, tries: number): Promise<number | null> {
    const max = Math.max(1, tries);
    for (let p = startPort; p < startPort + max; p++) {
      if (await this.isPortAvailable(p)) return p;
    }
    return null;
  }

  /**
   * Handles health check failure
   */
  private async handleHealthFailure(): Promise<void> {
    if (this.options.verbose) {
      this.renderer.codeblock('log', '⚠️ Health check failed, attempting recovery...');
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
      this.renderer.codeblock('log', `🎫 Processing fix ticket: "${issueDescription}"`);
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
   * Generates fallback code when LLM is not available (delegates to FallbackTemplates)
   */
  private generateFallbackCode(): string {
    if (!this.contract) return '';
    return FallbackTemplates.generate(this.contract, { port: this.options.port });
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
          const out = (output || '').toString().trim();
          const tail = out.length > 2000 ? '…\n' + out.slice(-2000) : out;
          const cmdStr = [cmd, ...args].join(' ');
          reject(new Error(`Command failed (code ${code}): ${cmdStr}\nCWD: ${cwd}\n${tail}`.trim()));
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

      this.renderer.heading(2, 'Summary');
      this.renderer.codeblock('yaml', [
        '# @type: evolution_shutdown_summary',
        'evolution:',
        `  cycles: ${this.evolutionHistory.length}`,
        `  output: "${this.options.outputDir}"`,
        `  logs: "${path.join(this.options.outputDir, 'logs')}"`,
        `  port: ${this.options.port}`
      ].join('\n'));

      this.renderer.heading(2, 'Next Steps');
      this.renderer.codeblock('bash', [
        '# Start service',
        `cd ${this.options.outputDir}/api && npm run dev`,
        '',
        '# Run tests',
        `cd ${this.options.outputDir}/tests && npm test`,
        '',
        '# View logs',
        `cat ${this.options.outputDir}/logs/*.rcl.md`,
        '',
        '# Keep running mode',
        './bin/reclapp evolve -p "..." -k'
      ].join('\n'));
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createEvolutionManager(options?: Partial<EvolutionOptions>): EvolutionManager {
  return new EvolutionManager(options);
}
