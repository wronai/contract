/**
 * Reclapp AI Contract System
 * 
 * TypeScript-based declarative contracts for AI agents with:
 * - Full type safety and compile-time validation
 * - Runtime validation with Zod schemas
 * - Causal reasoning integration
 * - Safety rails and enforcement
 * - Contract execution engine
 * 
 * @example
 * ```typescript
 * import { defineContract, createExecutor, validateContract } from '@reclapp/contracts';
 * 
 * // Define a contract
 * const myAgent = defineContract('MyAgent', '1.0.0')
 *   .description('My autonomous agent')
 *   .addEntity(myEntity)
 *   .workflow(myWorkflow)
 *   .verification(myVerification)
 *   .build();
 * 
 * // Validate
 * const validation = validateContract(myAgent);
 * if (!validation.valid) {
 *   console.error(validation.errors);
 * }
 * 
 * // Execute
 * const executor = createExecutor(myAgent);
 * const result = await executor.execute();
 * ```
 * 
 * @version 2.1.0
 */

// Type definitions
export * from './types';

// Validation
export {
  validateContract,
  validateEntity,
  validateWorkflow,
  validateSafetyRails,
  AgentContractSchema,
  EntitySchema,
  WorkflowSchema,
  SafetyRailsSchema,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning
} from './validator';

// Executor
export {
  ContractExecutor,
  createExecutor,
  type ExecutionContext,
  type ExecutionState,
  type ExecutionResult,
  type ExecutionMetrics,
  type ActionRequest,
  type ActionResponse,
  type AppliedIntervention,
  type Anomaly,
  type VerificationResult as ExecutionVerificationResult,
  type Recommendation
} from './executor';

// Re-export builder for convenience
export { defineContract, AgentContractBuilder } from './types';
