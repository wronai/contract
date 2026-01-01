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
 * @version 2.2.0
 */

export * from './pipeline-orchestrator';
export * from './stages';

import { ValidationPipelineOrchestrator } from './pipeline-orchestrator';
import { createSyntaxValidator } from './stages/syntax-validator';
import { createAssertionValidator } from './stages/assertion-validator';
import { createStaticAnalyzer } from './stages/static-analyzer';
import { createQualityChecker } from './stages/quality-checker';
import { createSecurityScanner } from './stages/security-scanner';

/**
 * Tworzy skonfigurowany pipeline walidacji ze wszystkimi stage'ami
 */
export function createDefaultValidationPipeline(): ValidationPipelineOrchestrator {
  const pipeline = new ValidationPipelineOrchestrator({ verbose: true });

  // Rejestruj stage'y w kolejności
  pipeline.registerStages([
    createSyntaxValidator(),
    createAssertionValidator(),
    createStaticAnalyzer(),
    createQualityChecker(),
    createSecurityScanner()
  ]);

  return pipeline;
}
