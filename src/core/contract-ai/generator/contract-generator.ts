/**
 * Contract AI - Contract Generator
 * 
 * Główna klasa generująca Contract AI z LLM z self-correction loop.
 * 
 * @version 2.2.0
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

import { ContractAI, ContractValidationError } from '../types';
import { ContractPromptBuilder } from './prompt-builder';
import { ContractValidator } from './contract-validator';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Opcje generatora kontraktów
 */
export interface ContractGeneratorOptions {
  /** Maksymalna liczba prób */
  maxAttempts: number;
  /** Temperatura LLM (0.0 - 1.0) */
  temperature: number;
  /** Model LLM */
  model: string;
  /** Timeout na pojedynczą próbę (ms) */
  timeout: number;
  /** Czy logować szczegóły */
  verbose: boolean;
}

/**
 * Poziom feedbacku dla korekcji
 */
export type FeedbackLevel = 'general' | 'detailed' | 'explicit';

/**
 * Prompt dla LLM
 */
export interface LLMPrompt {
  system: string;
  user: string;
}

/**
 * Klient LLM (interfejs)
 */
export interface LLMClient {
  generate(options: {
    system: string;
    user: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'json' | 'text';
  }): Promise<string>;
}

/**
 * Wynik generacji kontraktu
 */
export interface ContractGenerationResult {
  /** Czy generacja się powiodła */
  success: boolean;
  /** Wygenerowany kontrakt */
  contract?: ContractAI;
  /** Liczba prób */
  attempts: number;
  /** Błędy walidacji (z ostatniej próby) */
  errors: ContractValidationError[];
  /** Zużyte tokeny */
  tokensUsed: number;
  /** Czas generacji (ms) */
  timeMs: number;
}

// ============================================================================
// DEFAULT OPTIONS
// ============================================================================

const DEFAULT_OPTIONS: ContractGeneratorOptions = {
  maxAttempts: 5,
  temperature: 0.7,
  model: 'llama3',
  timeout: 60000,
  verbose: false
};

// ============================================================================
// CONTRACT GENERATOR CLASS
// ============================================================================

/**
 * Generator Contract AI z self-correction loop
 */
export class ContractGenerator {
  private promptBuilder: ContractPromptBuilder;
  private validator: ContractValidator;
  private options: ContractGeneratorOptions;
  private llmClient: LLMClient | null = null;

  constructor(options: Partial<ContractGeneratorOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.promptBuilder = new ContractPromptBuilder();
    this.validator = new ContractValidator();
  }

  /**
   * Ustawia klienta LLM
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * Główna metoda generująca kontrakt
   */
  async generate(userPrompt: string): Promise<ContractGenerationResult> {
    const startTime = Date.now();
    let tokensUsed = 0;
    let attempts = 0;
    let currentContract: Partial<ContractAI> | null = null;
    let lastErrors: ContractValidationError[] = [];

    while (attempts < this.options.maxAttempts) {
      attempts++;
      
      if (this.options.verbose) {
        console.log(`\n📋 Contract generation attempt ${attempts}/${this.options.maxAttempts}`);
      }

      try {
        // Buduj prompt
        const prompt = attempts === 1
          ? this.buildInitialPrompt(userPrompt)
          : this.buildCorrectionPrompt(userPrompt, currentContract!, lastErrors, attempts);

        // Wywołaj LLM
        const response = await this.callLLM(prompt);
        tokensUsed += this.estimateTokens(response);

        // Parsuj odpowiedź
        const parsedContract = this.parseContractFromResponse(response);
        
        if (!parsedContract) {
          lastErrors = [{
            code: 'E000',
            message: 'Failed to parse JSON from LLM response',
            path: '',
            severity: 'error'
          }];
          continue;
        }

        currentContract = parsedContract;

        // Waliduj kontrakt
        const validationResult = this.validator.validate(currentContract);

        if (validationResult.valid) {
          if (this.options.verbose) {
            console.log(`\n✅ Contract generated successfully after ${attempts} attempt(s)`);
          }

          return {
            success: true,
            contract: currentContract as ContractAI,
            attempts,
            errors: [],
            tokensUsed,
            timeMs: Date.now() - startTime
          };
        }

        lastErrors = validationResult.errors;

        if (this.options.verbose) {
          console.log(`\n❌ Validation failed. ${lastErrors.length} error(s) found.`);
          lastErrors.slice(0, 5).forEach(e => {
            console.log(`   - [${e.code}] ${e.path}: ${e.message}`);
          });
        }

      } catch (error: any) {
        lastErrors = [{
          code: 'E000',
          message: `Generation error: ${error.message}`,
          path: '',
          severity: 'error'
        }];

        if (this.options.verbose) {
          console.log(`\n⚠️ Error during generation: ${error.message}`);
        }
      }
    }

    // Max attempts reached
    return {
      success: false,
      contract: currentContract as ContractAI | undefined,
      attempts,
      errors: lastErrors,
      tokensUsed,
      timeMs: Date.now() - startTime
    };
  }

  /**
   * Buduje początkowy prompt
   */
  private buildInitialPrompt(userPrompt: string): LLMPrompt {
    return {
      system: this.promptBuilder.buildSystemPrompt(),
      user: this.promptBuilder.buildUserPrompt(userPrompt)
    };
  }

  /**
   * Buduje prompt korygujący
   */
  private buildCorrectionPrompt(
    userPrompt: string,
    contract: Partial<ContractAI>,
    errors: ContractValidationError[],
    attempt: number
  ): LLMPrompt {
    const feedbackLevel = this.generateFeedbackLevel(attempt);
    
    let correctionPrompt = this.promptBuilder.buildCorrectionPrompt(
      userPrompt,
      contract,
      errors
    );

    // Dodaj dodatkowy kontekst w zależności od poziomu feedbacku
    if (feedbackLevel === 'detailed') {
      correctionPrompt += '\n\nPay special attention to the error paths and fix each one specifically.';
    } else if (feedbackLevel === 'explicit') {
      correctionPrompt += '\n\nThis is the final attempt. Fix EXACTLY these issues:\n';
      errors.forEach((e, i) => {
        correctionPrompt += `${i + 1}. At "${e.path}": ${e.suggestion || e.message}\n`;
      });
    }

    return {
      system: this.promptBuilder.buildSystemPrompt(),
      user: correctionPrompt
    };
  }

  /**
   * Wywołuje LLM
   */
  private async callLLM(prompt: LLMPrompt): Promise<string> {
    if (!this.llmClient) {
      // Fallback - symulacja dla testów
      return this.simulateLLMResponse(prompt);
    }

    return this.llmClient.generate({
      system: prompt.system,
      user: prompt.user,
      temperature: this.options.temperature,
      responseFormat: 'json'
    });
  }

  /**
   * Parsuje kontrakt z odpowiedzi LLM
   */
  private parseContractFromResponse(response: string): Partial<ContractAI> | null {
    try {
      // Usuń markdown code blocks jeśli istnieją
      let jsonStr = response.trim();
      
      // Obsłuż ```json ... ```
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Znajdź pierwszy { i ostatni }
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }

      return JSON.parse(jsonStr);
    } catch (error) {
      if (this.options.verbose) {
        console.log('Failed to parse JSON response');
      }
      return null;
    }
  }

  /**
   * Określa poziom feedbacku na podstawie numeru próby
   */
  private generateFeedbackLevel(attempt: number): FeedbackLevel {
    if (attempt <= 2) return 'general';
    if (attempt <= 4) return 'detailed';
    return 'explicit';
  }

  /**
   * Estymuje liczbę tokenów
   */
  private estimateTokens(text: string): number {
    // Prosta estymacja: ~4 znaki na token
    return Math.ceil(text.length / 4);
  }

  /**
   * Symulacja odpowiedzi LLM (dla testów)
   */
  private simulateLLMResponse(prompt: LLMPrompt): string {
    // Zwróć przykładowy kontrakt dla testów
    return JSON.stringify({
      definition: {
        app: {
          name: 'Generated App',
          version: '1.0.0',
          description: 'Auto-generated contract'
        },
        entities: [
          {
            name: 'Item',
            fields: [
              { name: 'id', type: 'UUID', annotations: { generated: true } },
              { name: 'name', type: 'String', annotations: { required: true } },
              { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
            ]
          }
        ],
        api: {
          version: 'v1',
          prefix: '/api/v1',
          resources: [
            { name: 'items', entity: 'Item', operations: ['list', 'get', 'create', 'update', 'delete'] }
          ]
        }
      },
      generation: {
        instructions: [
          { target: 'api', priority: 'must', instruction: 'Use Express.js with TypeScript' }
        ],
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
        assertions: [
          {
            id: 'A001',
            description: 'Server file exists',
            check: { type: 'file-exists', path: 'src/server.ts' },
            errorMessage: 'Missing server.ts',
            severity: 'error'
          }
        ],
        tests: [
          {
            name: 'Item API Tests',
            type: 'api',
            target: 'Item',
            scenarios: [
              {
                name: 'should list items',
                given: 'items exist in database',
                when: 'GET /api/v1/items',
                then: 'return 200 with array of items'
              }
            ]
          }
        ],
        staticRules: [
          { name: 'no-unused-vars', severity: 'error' }
        ],
        qualityGates: [
          { name: 'Coverage', metric: 'test-coverage', threshold: 70, operator: '>=' }
        ],
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
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'llm-generated'
      }
    }, null, 2);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createContractGenerator(options?: Partial<ContractGeneratorOptions>): ContractGenerator {
  return new ContractGenerator(options);
}
