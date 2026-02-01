/**
 * Iteration Manager
 * 
 * Zarządza pętlą walidacji i korekcji kodu.
 * 
 * @version 2.4.1
 */

import { ContractAI, GeneratedCode, PipelineResult } from '../types';
import { ValidationPipelineOrchestrator } from '../validation/pipeline-orchestrator';
import { FeedbackGenerator, ValidationFeedback } from './feedback-generator';
import { LLMCodeGenerator } from '../code-generator/llm-generator';
import { CodeCorrector } from './code-corrector';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Opcje menedżera iteracji
 */
export interface IterationManagerOptions {
  /** Maksymalna liczba iteracji */
  maxIterations: number;
  /** Czy logować szczegóły */
  verbose: boolean;
  /** Przerwij po pierwszym sukcesie */
  stopOnSuccess: boolean;
}

/**
 * Wynik pętli walidacji
 */
export interface IterationResult {
  /** Czy walidacja przeszła */
  success: boolean;
  /** Finalny kod */
  code: GeneratedCode;
  /** Liczba wykonanych iteracji */
  iterations: number;
  /** Wynik ostatniej walidacji */
  validationResult: PipelineResult;
  /** Błąd (jeśli wystąpił) */
  error?: string;
  /** Historia iteracji */
  history: IterationHistoryEntry[];
}

/**
 * Wpis historii iteracji
 */
export interface IterationHistoryEntry {
  iteration: number;
  passed: boolean;
  errorCount: number;
  warningCount: number;
  filesChanged: string[];
  timeMs: number;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: IterationManagerOptions = {
  maxIterations: 10,
  verbose: false,
  stopOnSuccess: true
};

// ============================================================================
// ITERATION MANAGER
// ============================================================================

/**
 * Zarządza pętlą walidacji i korekcji kodu
 */
export class IterationManager {
  private options: IterationManagerOptions;
  private feedbackGenerator: FeedbackGenerator;
  private codeCorrector: CodeCorrector;

  constructor(options: Partial<IterationManagerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.feedbackGenerator = new FeedbackGenerator();
    this.codeCorrector = new CodeCorrector({ verbose: this.options.verbose });
  }

  /**
   * Uruchamia pętlę walidacji i korekcji
   */
  async validateAndCorrect(
    contract: ContractAI,
    initialCode: GeneratedCode,
    pipeline: ValidationPipelineOrchestrator,
    codeGenerator: LLMCodeGenerator
  ): Promise<IterationResult> {
    let currentCode = initialCode;
    const history: IterationHistoryEntry[] = [];
    let iteration = 0;

    const llmClient = codeGenerator.getLLMClient();
    if (llmClient) {
      this.codeCorrector.setLLMClient(llmClient);
    }

    if (this.options.verbose) {
      console.log(`\n🔄 Starting validation loop (max ${this.options.maxIterations} iterations)`);
    }

    while (iteration < this.options.maxIterations) {
      iteration++;
      const iterationStart = Date.now();

      if (this.options.verbose) {
        console.log(`\n━━━ Iteration ${iteration}/${this.options.maxIterations} ━━━`);
      }

      // Uruchom walidację
      const validationResult = await pipeline.validate(contract, currentCode);

      // Zapisz w historii
      history.push({
        iteration,
        passed: validationResult.passed,
        errorCount: validationResult.summary.totalErrors,
        warningCount: validationResult.summary.totalWarnings,
        filesChanged: [],
        timeMs: Date.now() - iterationStart
      });

      // Sprawdź czy przeszło
      if (this.meetsAcceptanceCriteria(contract, validationResult)) {
        if (this.options.verbose) {
          console.log(`\n✅ Validation passed after ${iteration} iteration(s)`);
        }

        return {
          success: true,
          code: currentCode,
          iterations: iteration,
          validationResult,
          history
        };
      }

      // Generuj feedback
      const feedback = this.feedbackGenerator.generateFeedback(contract, validationResult);

      if (feedback.filesToFix.length === 0) {
        return {
          success: false,
          code: currentCode,
          iterations: iteration,
          validationResult,
          error: 'No file-scoped errors to fix (cannot continue correction loop)',
          history
        };
      }

      if (this.options.verbose) {
        console.log(`\n❌ Validation failed. ${feedback.issues.length} issue(s) to fix.`);
        feedback.issues.slice(0, 5).forEach(issue => {
          console.log(`   - [${issue.severity}] ${issue.message}`);
        });
      }

      // Spróbuj naprawić kod
      try {
        currentCode = await this.correctCode(
          contract,
          currentCode,
          feedback,
          codeGenerator
        );

        // Zapisz zmienione pliki w historii
        history[history.length - 1].filesChanged = feedback.filesToFix;
      } catch (error: any) {
        if (this.options.verbose) {
          console.log(`\n⚠️ Error during code correction: ${error.message}`);
        }
      }
    }

    // Osiągnięto maksymalną liczbę iteracji
    const finalValidation = await pipeline.validate(contract, currentCode);

    if (this.options.verbose) {
      console.log(`\n⚠️ Max iterations (${this.options.maxIterations}) reached`);
    }

    return {
      success: false,
      code: currentCode,
      iterations: iteration,
      validationResult: finalValidation,
      error: 'Max iterations reached',
      history
    };
  }

  /**
   * Sprawdza czy spełnione są kryteria akceptacji
   */
  private meetsAcceptanceCriteria(
    contract: ContractAI,
    result: PipelineResult
  ): boolean {
    const { acceptance } = contract.validation;

    // Wszystkie stage'y muszą przejść
    if (!result.passed) {
      return false;
    }

    // Sprawdź custom criteria (placeholder)
    for (const criterion of acceptance.custom || []) {
      // W pełnej implementacji sprawdzałoby się custom criteria
    }

    return true;
  }

  /**
   * Koryguje kod na podstawie feedbacku
   */
  private async correctCode(
    contract: ContractAI,
    currentCode: GeneratedCode,
    feedback: ValidationFeedback,
    codeGenerator: LLMCodeGenerator
  ): Promise<GeneratedCode> {
    void codeGenerator;
    return this.codeCorrector.correct(currentCode, feedback, contract);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createIterationManager(
  options?: Partial<IterationManagerOptions>
): IterationManager {
  return new IterationManager(options);
}
