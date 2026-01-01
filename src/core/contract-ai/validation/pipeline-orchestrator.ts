/**
 * Validation Pipeline Orchestrator
 * 
 * Zarządza 7-stage'owym pipeline'em walidacji wygenerowanego kodu.
 * 
 * @version 2.2.0
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import {
  ContractAI,
  GeneratedCode,
  PipelineResult,
  StageResult
} from '../types';

// Re-export StageResult for use by validation stages
export { StageResult } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Kontekst walidacji przekazywany między stage'ami
 */
export interface ValidationContext {
  /** Kontrakt źródłowy */
  contract: ContractAI;
  /** Wygenerowany kod */
  code: GeneratedCode;
  /** Katalog roboczy */
  workDir: string;
  /** Wyniki poprzednich stage'ów */
  previousResults: Map<string, StageResult>;
}

/**
 * Definicja stage'a walidacji
 */
export interface ValidationStage {
  /** Nazwa stage'a */
  name: string;
  /** Funkcja walidująca */
  validator: (context: ValidationContext) => Promise<StageResult>;
  /** Czy stage jest krytyczny (fail-fast) */
  critical: boolean;
  /** Timeout w ms */
  timeout?: number;
}

/**
 * Opcje pipeline'a
 */
export interface PipelineOptions {
  /** Przerwij na pierwszym błędzie krytycznym */
  failFast: boolean;
  /** Timeout na stage (ms) */
  timeout: number;
  /** Czy logować szczegóły */
  verbose: boolean;
  /** Katalog roboczy */
  workDir: string;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: PipelineOptions = {
  failFast: true,
  timeout: 60000,
  verbose: false,
  workDir: '/tmp/reclapp-validation'
};

// ============================================================================
// CRITICAL STAGES
// ============================================================================

const CRITICAL_STAGES = new Set(['syntax', 'assertions', 'security']);

// ============================================================================
// PIPELINE ORCHESTRATOR
// ============================================================================

/**
 * Orkiestrator 7-stage'owego pipeline'u walidacji
 */
export class ValidationPipelineOrchestrator {
  private stages: ValidationStage[] = [];
  private options: PipelineOptions;

  constructor(options: Partial<PipelineOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Rejestruje stage walidacji
   */
  registerStage(stage: ValidationStage): void {
    this.stages.push(stage);
  }

  /**
   * Rejestruje wiele stage'ów
   */
  registerStages(stages: ValidationStage[]): void {
    this.stages.push(...stages);
  }

  /**
   * Główna metoda walidacji
   */
  async validate(
    contract: ContractAI,
    code: GeneratedCode
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const results: StageResult[] = [];
    const previousResults = new Map<string, StageResult>();

    const context: ValidationContext = {
      contract,
      code,
      workDir: this.options.workDir,
      previousResults
    };

    if (this.options.verbose) {
      console.log(`\n🔍 Starting validation pipeline with ${this.stages.length} stages`);
    }

    for (const stage of this.stages) {
      if (this.options.verbose) {
        console.log(`\n   Running stage: ${stage.name}...`);
      }

      const stageResult = await this.runStage(stage, context);
      results.push(stageResult);
      previousResults.set(stage.name, stageResult);

      if (this.options.verbose) {
        const icon = stageResult.passed ? '✅' : '❌';
        console.log(`   ${icon} ${stage.name}: ${stageResult.passed ? 'PASSED' : 'FAILED'} (${stageResult.timeMs}ms)`);
        
        if (!stageResult.passed) {
          stageResult.errors.slice(0, 3).forEach(e => {
            console.log(`      - ${e.message}`);
          });
        }
      }

      // Fail-fast dla stage'ów krytycznych
      if (!stageResult.passed && this.shouldContinue(stage.name, stageResult) === false) {
        if (this.options.verbose) {
          console.log(`\n   ⛔ Pipeline stopped at ${stage.name} (critical stage failed)`);
        }
        break;
      }
    }

    const passedStages = results.filter(r => r.passed).length;
    const failedStages = results.filter(r => !r.passed).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    return {
      passed: failedStages === 0,
      stages: results,
      summary: {
        totalErrors,
        totalWarnings,
        passedStages,
        failedStages,
        totalTimeMs: Date.now() - startTime
      }
    };
  }

  /**
   * Uruchamia pojedynczy stage z obsługą timeout
   */
  private async runStage(
    stage: ValidationStage,
    context: ValidationContext
  ): Promise<StageResult> {
    const startTime = Date.now();
    const timeout = stage.timeout || this.options.timeout;

    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const timeoutPromise: Promise<StageResult> = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Stage "${stage.name}" timed out after ${timeout}ms`));
        }, timeout);
      });

      const result = await Promise.race([stage.validator(context), timeoutPromise]);

      return {
        ...result,
        timeMs: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        stage: stage.name,
        passed: false,
        errors: [{
          message: `Stage error: ${error.message}`,
          code: 'STAGE_ERROR'
        }],
        warnings: [],
        timeMs: Date.now() - startTime
      };
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Określa czy kontynuować po błędzie
   */
  private shouldContinue(stageName: string, result: StageResult): boolean {
    if (!this.options.failFast) {
      return true;
    }

    // Stage'y krytyczne zatrzymują pipeline
    if (CRITICAL_STAGES.has(stageName) && !result.passed) {
      return false;
    }

    return true;
  }

  /**
   * Zwraca zarejestrowane stage'y
   */
  getStages(): ValidationStage[] {
    return [...this.stages];
  }

  /**
   * Czyści zarejestrowane stage'y
   */
  clearStages(): void {
    this.stages = [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createValidationPipeline(
  options?: Partial<PipelineOptions>
): ValidationPipelineOrchestrator {
  return new ValidationPipelineOrchestrator(options);
}
