/**
 * Contract AI Module
 * 
 * LLM-driven code generation z 3-warstwową specyfikacją Contract AI.
 * 
 * ## Architektura
 * 
 * Contract AI składa się z 3 warstw:
 * - **Layer 1: Definition** - CO ma być zaimplementowane (encje, eventy, API)
 * - **Layer 2: Generation** - JAK LLM ma generować kod (instrukcje, patterns, constraints)
 * - **Layer 3: Validation** - JAK sprawdzać i KIEDY kod jest gotowy (assertions, tests, quality gates)
 * 
 * ## Użycie
 * 
 * ```typescript
 * import { createContractGenerator, ContractAI } from './core/contract-ai';
 * 
 * const generator = createContractGenerator({ verbose: true });
 * generator.setLLMClient(myLLMClient);
 * 
 * const result = await generator.generate('Create a CRM system with contacts and companies');
 * 
 * if (result.success) {
 *   console.log('Contract generated:', result.contract);
 * }
 * ```
 * 
 * @version 2.2.0
 * @see todo/14-reclapp-llm-code-generation-spec.md
 * @see todo/15-reclapp-architecture-summary.md
 * @see todo/16-reclapp-implementation-todo-prompts.md
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export * from './types';

// ============================================================================
// GENERATOR EXPORTS
// ============================================================================

export * from './generator';

// ============================================================================
// CODE GENERATOR EXPORTS
// ============================================================================

export * from './code-generator';

// ============================================================================
// VALIDATION EXPORTS
// ============================================================================

export * from './validation';

// ============================================================================
// FEEDBACK EXPORTS
// ============================================================================

export * from './feedback';

// ============================================================================
// LLM CLIENT EXPORTS
// ============================================================================

export * from './llm';

// ============================================================================
// SDK EXPORTS
// ============================================================================

export * from './sdk';
