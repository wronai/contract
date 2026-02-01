/**
 * Validation Module
 * 
 * 7-stage validation pipeline dla wygenerowanego kodu.
 * 
 * Stages:
 * 1. Syntax - TypeScript compile check
 * 2. Assertions - Contract assertions verification
 * 3. Static Analysis - ESLint-like rules
 * 4. Tests - Generate & run tests (placeholder)
 * 5. Quality - Coverage, complexity metrics
 * 6. Security - Security vulnerability scan
 * 7. Runtime - Docker deploy & test (placeholder)
 * 
 * @version 2.4.1
 */

export * from './pipeline-orchestrator';
export * from './stages';

import { ValidationPipelineOrchestrator } from './pipeline-orchestrator';
import type { PipelineOptions } from './pipeline-orchestrator';
import { createSyntaxValidator } from './stages/syntax-validator';
import { createSchemaValidator } from './stages/schema-validator';
import { createAssertionValidator } from './stages/assertion-validator';
import { createStaticAnalyzer } from './stages/static-analyzer';
import { createTestRunner } from './stages/test-runner';
import { createQualityChecker } from './stages/quality-checker';
import { createSecurityScanner } from './stages/security-scanner';
import { createRuntimeValidator } from './stages/runtime-validator';

/**
 * Tworzy skonfigurowany pipeline walidacji ze wszystkimi stage'ami
 */
export function createDefaultValidationPipeline(
  options: Partial<PipelineOptions> = {}
): ValidationPipelineOrchestrator {
  const pipeline = new ValidationPipelineOrchestrator({ verbose: true, ...options });

  // Rejestruj stage'y w kolejności
  pipeline.registerStages([
    createSyntaxValidator(),
    createSchemaValidator(),
    createAssertionValidator(),
    createStaticAnalyzer(),
    createTestRunner(),
    createQualityChecker(),
    createSecurityScanner(),
    createRuntimeValidator()
  ]);

  return pipeline;
}
