/**
 * Contract AI - Main Types Export
 * 
 * Łączy 3 warstwy Contract AI w jeden interfejs:
 * - Layer 1: Definition (CO)
 * - Layer 2: Generation (JAK GENEROWAĆ)
 * - Layer 3: Validation (JAK SPRAWDZAĆ / KIEDY GOTOWE)
 * 
 * @version 2.2.0
 * @see todo/14-reclapp-llm-code-generation-spec.md
 * @see todo/15-reclapp-architecture-summary.md
 */

// ============================================================================
// RE-EXPORTS
// ============================================================================

export * from './definition';
export * from './generation';
export * from './validation';

// ============================================================================
// IMPORTS FOR MAIN INTERFACE
// ============================================================================

import { DefinitionLayer } from './definition';
import { GenerationLayer } from './generation';
import { ValidationLayer } from './validation';

// ============================================================================
// CONTRACT METADATA
// ============================================================================

/**
 * Metadane kontraktu
 */
export interface ContractMetadata {
  /** Wersja kontraktu */
  version: string;
  /** Autor kontraktu */
  author?: string;
  /** Data utworzenia */
  createdAt: Date;
  /** Data ostatniej aktualizacji */
  updatedAt: Date;
  /** Tagi dla kategoryzacji */
  tags?: string[];
  /** Źródło kontraktu (np. 'llm-generated', 'manual') */
  source?: 'llm-generated' | 'manual' | 'imported';
  /** ID sesji generacji */
  sessionId?: string;
}

// ============================================================================
// MAIN CONTRACT AI INTERFACE
// ============================================================================

/**
 * Contract AI - kompletna specyfikacja dla LLM code generation
 * 
 * Contract AI to nie tylko schemat danych, ale pełna specyfikacja procesów:
 * - CO ma być zaimplementowane (definition)
 * - JAK ma być wygenerowane (generation)
 * - JAK sprawdzić i KIEDY jest gotowe (validation)
 * 
 * @example
 * ```typescript
 * const crmContract: ContractAI = {
 *   definition: {
 *     app: { name: 'CRM System', version: '1.0.0' },
 *     entities: [
 *       { name: 'Contact', fields: [...] },
 *       { name: 'Company', fields: [...] }
 *     ],
 *     api: { version: 'v1', prefix: '/api/v1', resources: [...] }
 *   },
 *   generation: {
 *     instructions: [
 *       { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' }
 *     ],
 *     patterns: [...],
 *     constraints: [...],
 *     techStack: { backend: { runtime: 'node', language: 'typescript', framework: 'express', port: 3000 } }
 *   },
 *   validation: {
 *     assertions: [...],
 *     tests: [...],
 *     staticRules: [...],
 *     qualityGates: [...],
 *     acceptance: { testsPass: true, minCoverage: 70, ... }
 *   },
 *   metadata: {
 *     version: '1.0.0',
 *     createdAt: new Date(),
 *     updatedAt: new Date()
 *   }
 * };
 * ```
 */
export interface ContractAI {
  /** Layer 1: Definition - CO ma być zaimplementowane */
  definition: DefinitionLayer;
  
  /** Layer 2: Generation - JAK LLM ma generować kod */
  generation: GenerationLayer;
  
  /** Layer 3: Validation - JAK sprawdzać i KIEDY gotowe */
  validation: ValidationLayer;
  
  /** Metadane kontraktu (opcjonalne) */
  metadata?: ContractMetadata;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Sprawdza czy obiekt jest poprawnym ContractAI
 */
export function isValidContractAI(obj: unknown): obj is ContractAI {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const contract = obj as Partial<ContractAI>;
  
  return (
    hasDefinitionLayer(contract) &&
    hasGenerationLayer(contract) &&
    hasValidationLayer(contract)
  );
}

/**
 * Sprawdza czy kontrakt ma warstwę Definition
 */
export function hasDefinitionLayer(contract: Partial<ContractAI>): boolean {
  if (!contract.definition) return false;
  
  const def = contract.definition;
  return (
    typeof def.app === 'object' &&
    typeof def.app.name === 'string' &&
    Array.isArray(def.entities)
  );
}

/**
 * Sprawdza czy kontrakt ma warstwę Generation
 */
export function hasGenerationLayer(contract: Partial<ContractAI>): boolean {
  if (!contract.generation) return false;
  
  const gen = contract.generation;
  return (
    Array.isArray(gen.instructions) &&
    Array.isArray(gen.patterns) &&
    Array.isArray(gen.constraints) &&
    typeof gen.techStack === 'object'
  );
}

/**
 * Sprawdza czy kontrakt ma warstwę Validation
 */
export function hasValidationLayer(contract: Partial<ContractAI>): boolean {
  if (!contract.validation) return false;
  
  const val = contract.validation;
  return (
    Array.isArray(val.assertions) &&
    Array.isArray(val.tests) &&
    Array.isArray(val.staticRules) &&
    Array.isArray(val.qualityGates) &&
    typeof val.acceptance === 'object'
  );
}

// ============================================================================
// BUILDER HELPERS
// ============================================================================

/**
 * Tworzy pusty kontrakt z domyślnymi wartościami
 */
export function createEmptyContract(appName: string, version: string = '1.0.0'): ContractAI {
  const now = new Date();
  
  return {
    definition: {
      app: {
        name: appName,
        version,
        description: ''
      },
      entities: []
    },
    generation: {
      instructions: [],
      patterns: [],
      constraints: [],
      techStack: {
        backend: {
          runtime: 'node',
          language: 'typescript',
          framework: 'express',
          port: 3000
        }
      }
    },
    validation: {
      assertions: [],
      tests: [],
      staticRules: [],
      qualityGates: [],
      acceptance: {
        testsPass: true,
        minCoverage: 70,
        maxLintErrors: 0,
        maxResponseTime: 500,
        securityChecks: [],
        custom: []
      }
    },
    metadata: {
      version,
      createdAt: now,
      updatedAt: now,
      source: 'manual'
    }
  };
}

/**
 * Aktualizuje metadane kontraktu (updatedAt)
 */
export function touchContract(contract: ContractAI): ContractAI {
  return {
    ...contract,
    metadata: {
      ...contract.metadata,
      version: contract.metadata?.version || '1.0.0',
      createdAt: contract.metadata?.createdAt || new Date(),
      updatedAt: new Date()
    }
  };
}

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

/**
 * Błąd walidacji kontraktu
 */
export interface ContractValidationError {
  /** Kod błędu (np. 'E001') */
  code: string;
  /** Wiadomość błędu */
  message: string;
  /** Ścieżka do pola z błędem (np. 'definition.entities[0].fields[2]') */
  path: string;
  /** Poziom błędu */
  severity: 'error' | 'warning';
  /** Sugestia naprawy */
  suggestion?: string;
}

/**
 * Wynik walidacji kontraktu
 */
export interface ContractValidationResult {
  /** Czy kontrakt jest poprawny */
  valid: boolean;
  /** Lista błędów */
  errors: ContractValidationError[];
  /** Lista ostrzeżeń */
  warnings: ContractValidationError[];
}

// ============================================================================
// GENERATION RESULT TYPES
// ============================================================================

/**
 * Wygenerowany plik
 */
export interface GeneratedFile {
  /** Ścieżka pliku */
  path: string;
  /** Zawartość pliku */
  content: string;
  /** Cel generacji */
  target?: string;
  /** Błędy składniowe (jeśli wykryte) */
  syntaxErrors?: Array<{
    line: number;
    column: number;
    message: string;
  }>;
}

/**
 * Wynik generacji kodu
 */
export interface GeneratedCode {
  /** Wygenerowane pliki */
  files: GeneratedFile[];
  /** Kontrakt źródłowy */
  contract: ContractAI;
  /** Metadane generacji */
  metadata: {
    /** Data generacji */
    generatedAt: Date;
    /** Data korekty (jeśli kod był poprawiany) */
    correctedAt?: Date;
    /** Cele generacji */
    targets: string[];
    /** Zużyte tokeny */
    tokensUsed?: number;
    /** Czas generacji (ms) */
    timeMs?: number;
  };
}

// ============================================================================
// PIPELINE RESULT TYPES
// ============================================================================

/**
 * Wynik pojedynczego etapu walidacji
 */
export interface StageResult {
  /** Nazwa etapu */
  stage: string;
  /** Czy etap przeszedł */
  passed: boolean;
  /** Lista błędów */
  errors: Array<{
    message: string;
    file?: string;
    line?: number;
    code?: string;
  }>;
  /** Lista ostrzeżeń */
  warnings: Array<{
    message: string;
    file?: string;
    line?: number;
  }>;
  /** Metryki etapu */
  metrics?: Record<string, number>;
  /** Czas wykonania (ms) */
  timeMs: number;
}

/**
 * Wynik całego pipeline'u walidacji
 */
export interface PipelineResult {
  /** Czy wszystkie etapy przeszły */
  passed: boolean;
  /** Wyniki poszczególnych etapów */
  stages: StageResult[];
  /** Podsumowanie */
  summary: {
    totalErrors: number;
    totalWarnings: number;
    passedStages: number;
    failedStages: number;
    totalTimeMs: number;
  };
}
