/**
 * Reclapp AI Contract System - TypeScript DSL
 * 
 * TypeScript-based declarative contracts for AI agents with:
 * - Full type safety and validation
 * - Causal reasoning integration
 * - Safety rails and enforcement
 * - Runtime validation with Zod schemas
 * 
 * @version 2.1.0
 */

// ============================================================================
// CORE TYPE DEFINITIONS
// ============================================================================

/**
 * Field definition for entities
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'datetime' | 'uuid' | 'json' | 'money';

export interface Field {
  name: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
  default?: any;
  description?: string;
}

/**
 * Causal influence definition with decay
 */
export interface CausalInfluence {
  field: string;                    // Source field path (e.g., "financialHealth.profitMargin")
  weight: number;                   // Influence weight (-1.0 to 1.0)
  decay: number;                    // Confidence decay rate per day (e.g., 0.01 = 1%/day)
  mechanism?: string;               // Description of causal mechanism
  conditions?: CausalCondition[];   // When this influence applies
}

export interface CausalCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

/**
 * Intervention definition for causal actions
 */
export interface Intervention {
  name: string;
  description?: string;
  adjust: Record<string, any>;              // Parameters to adjust
  expectedEffect: Record<string, number>;   // Expected changes (negative = decrease)
  confidence: number;                       // Initial confidence (0-1)
  sandbox: boolean;                         // Run in sandbox first
  cost?: number;                            // Cost/effort estimate
  cooldownMs?: number;                      // Minimum time between applications
  maxApplications?: number;                 // Maximum times to apply
  prerequisites?: string[];                 // Required conditions
  contraindications?: string[];             // When NOT to apply
}

/**
 * Entity definition with causal reasoning
 */
export interface Entity {
  name: string;
  description?: string;
  fields: Field[];
  causalInfluences: CausalInfluence[];
  interventions: Intervention[];
  events?: EntityEvent[];
  computed?: ComputedField[];
}

export interface EntityEvent {
  name: string;
  fields: Field[];
  description?: string;
}

export interface ComputedField {
  name: string;
  formula: string;              // Expression to compute
  dependencies: string[];       // Fields this depends on
}

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

export type WorkflowStepType = 
  | 'fetch_data'
  | 'transform'
  | 'validate'
  | 'compute'
  | 'apply_intervention'
  | 'verify'
  | 'notify'
  | 'log'
  | 'decision'
  | 'custom';

export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  description?: string;
  config?: Record<string, any>;
  onSuccess?: string;           // Next step ID
  onFailure?: string;           // Step ID on failure
  timeout?: number;             // Timeout in ms
  retries?: number;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  expression: string;
  description?: string;
}

export interface SafetyRails {
  maxAdjustmentPerCycle: number;        // Max change per iteration (0-1)
  rollbackOnAnomaly: boolean;           // Auto-rollback on anomaly
  sandboxExperimental: boolean;         // Test experimental changes in sandbox
  maxIterations: number;                // Max learning iterations
  cooldownBetweenAdjustments: number;   // Ms between adjustments
  requireHumanApprovalAbove: number;    // Confidence threshold for auto-apply
  freezeOnCriticalAnomaly: boolean;     // Freeze system on critical issues
  anomalyThreshold: number;             // Deviation triggering anomaly (0-1)
}

export interface Workflow {
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  safety: SafetyRails;
  triggers?: WorkflowTrigger[];
  schedule?: string;                    // Cron expression
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'condition' | 'manual';
  config: Record<string, any>;
}

// ============================================================================
// VERIFICATION DEFINITIONS
// ============================================================================

export interface VerificationMetric {
  name: string;
  description: string;
  formula?: string;
  threshold?: number;
  direction?: 'higher_better' | 'lower_better' | 'target';
  target?: number;
}

export interface VerificationThresholds {
  anomalyDetection: number;             // Deviation threshold (0-1)
  intentMatch: number;                  // Min intent match score (0-1)
  causalValidity: number;               // Min causal path validity (0-1)
  confidenceDecay: boolean;             // Enable confidence decay
  confidenceDecayRate: number;          // Decay rate per day
  minConfidence: number;                // Confidence floor
  maxConfidence: number;                // Confidence ceiling
}

export interface Verification {
  enabled: boolean;
  causalLoop: boolean;
  metrics: VerificationMetric[];
  thresholds: VerificationThresholds;
  feedbackSources: FeedbackSource[];
  learningConfig: LearningConfig;
}

export interface FeedbackSource {
  name: string;
  type: 'metric' | 'event' | 'human' | 'external';
  config: Record<string, any>;
  weight: number;                       // Importance weight (0-1)
}

export interface LearningConfig {
  enabled: boolean;
  minObservations: number;              // Min data points before learning
  learningRate: number;                 // How fast to adjust (0-1)
  lockedBeforeApproval: boolean;        // Require human approval
  batchSize: number;                    // Observations per learning batch
  validationSplit: number;              // % of data for validation
}

// ============================================================================
// PERMISSION & ENFORCEMENT DEFINITIONS
// ============================================================================

export type PermissionAction = 
  | 'generate_dsl'
  | 'modify_entity'
  | 'create_alert'
  | 'update_dashboard'
  | 'execute_pipeline'
  | 'send_notification'
  | 'access_external'
  | 'delete_resource'
  | 'modify_workflow'
  | 'apply_intervention'
  | 'query_data'
  | '*';

export interface Permission {
  action: PermissionAction;
  resources: string[];                  // Resource patterns (* = all)
  conditions?: PermissionCondition[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
  value: any;
}

export interface UncertaintyProtocol {
  confidenceThreshold: number;          // Min confidence for autonomous action
  onLowConfidence: {
    askForClarification: boolean;
    provideAlternatives: boolean;
    maxAlternatives: number;
    escalateAfterAttempts: number;
  };
  onMissingData: {
    listRequirements: boolean;
    suggestSources: boolean;
    proceedWithAssumptions: boolean;
    markAsUncertain: boolean;
  };
}

export interface NegotiationProtocol {
  maxIterations: number;
  onRejection: {
    askForFeedback: boolean;
    proposeAlternative: boolean;
    explainReasoning: boolean;
  };
  onPartialApproval: {
    executeApproved: boolean;
    queueRejected: boolean;
  };
  timeoutSeconds: number;
}

export interface Enforcement {
  logAllDecisions: boolean;
  overrideRequiresApproval: boolean;
  feedbackLockedBeforeLearning: boolean;
  causalVerificationRequired: boolean;
  auditRetentionDays: number;
  alertOnViolation: boolean;
  freezeOnRepeatedViolations: boolean;
  maxViolationsBeforeFreeze: number;
}

export interface RateLimits {
  actionsPerMinute: number;
  actionsPerHour: number;
  actionsPerDay: number;
  concurrentActions: number;
  costPerDay?: number;
}

// ============================================================================
// COMPLETE AGENT CONTRACT
// ============================================================================

export interface AgentContract {
  // Metadata
  name: string;
  version: string;
  description: string;
  author?: string;
  created?: Date;
  updated?: Date;
  
  // Domain Model
  entities: Entity[];
  
  // Execution
  workflow: Workflow;
  
  // Permissions
  canAutonomously: Permission[];
  requiresApproval: Permission[];
  prohibited: Permission[];
  
  // Protocols
  uncertaintyProtocol: UncertaintyProtocol;
  negotiationProtocol: NegotiationProtocol;
  
  // Verification & Learning
  verification: Verification;
  
  // Enforcement & Safety
  enforcement: Enforcement;
  rateLimits: RateLimits;
  
  // Extensions
  extensions?: Record<string, any>;
}

// ============================================================================
// DEFAULT VALUES & BUILDERS
// ============================================================================

export const DEFAULT_SAFETY_RAILS: SafetyRails = {
  maxAdjustmentPerCycle: 0.1,
  rollbackOnAnomaly: true,
  sandboxExperimental: true,
  maxIterations: 100,
  cooldownBetweenAdjustments: 60000,    // 1 minute
  requireHumanApprovalAbove: 0.3,
  freezeOnCriticalAnomaly: true,
  anomalyThreshold: 0.3
};

export const DEFAULT_VERIFICATION_THRESHOLDS: VerificationThresholds = {
  anomalyDetection: 0.05,
  intentMatch: 0.7,
  causalValidity: 0.6,
  confidenceDecay: true,
  confidenceDecayRate: 0.01,
  minConfidence: 0.3,
  maxConfidence: 0.99
};

export const DEFAULT_ENFORCEMENT: Enforcement = {
  logAllDecisions: true,
  overrideRequiresApproval: true,
  feedbackLockedBeforeLearning: true,
  causalVerificationRequired: true,
  auditRetentionDays: 365,
  alertOnViolation: true,
  freezeOnRepeatedViolations: true,
  maxViolationsBeforeFreeze: 5
};

export const DEFAULT_RATE_LIMITS: RateLimits = {
  actionsPerMinute: 60,
  actionsPerHour: 1000,
  actionsPerDay: 10000,
  concurrentActions: 10
};

export const DEFAULT_UNCERTAINTY_PROTOCOL: UncertaintyProtocol = {
  confidenceThreshold: 0.7,
  onLowConfidence: {
    askForClarification: true,
    provideAlternatives: true,
    maxAlternatives: 3,
    escalateAfterAttempts: 3
  },
  onMissingData: {
    listRequirements: true,
    suggestSources: true,
    proceedWithAssumptions: false,
    markAsUncertain: true
  }
};

export const DEFAULT_NEGOTIATION_PROTOCOL: NegotiationProtocol = {
  maxIterations: 3,
  onRejection: {
    askForFeedback: true,
    proposeAlternative: true,
    explainReasoning: true
  },
  onPartialApproval: {
    executeApproved: true,
    queueRejected: true
  },
  timeoutSeconds: 3600
};

// ============================================================================
// CONTRACT BUILDER
// ============================================================================

export class AgentContractBuilder {
  private contract: Partial<AgentContract> = {};

  constructor(name: string, version: string = '1.0.0') {
    this.contract = {
      name,
      version,
      description: '',
      entities: [],
      canAutonomously: [],
      requiresApproval: [],
      prohibited: [],
      uncertaintyProtocol: { ...DEFAULT_UNCERTAINTY_PROTOCOL },
      negotiationProtocol: { ...DEFAULT_NEGOTIATION_PROTOCOL },
      enforcement: { ...DEFAULT_ENFORCEMENT },
      rateLimits: { ...DEFAULT_RATE_LIMITS }
    };
  }

  description(desc: string): this {
    this.contract.description = desc;
    return this;
  }

  author(author: string): this {
    this.contract.author = author;
    return this;
  }

  addEntity(entity: Entity): this {
    this.contract.entities!.push(entity);
    return this;
  }

  workflow(workflow: Workflow): this {
    this.contract.workflow = workflow;
    return this;
  }

  canDo(permission: Permission): this {
    this.contract.canAutonomously!.push(permission);
    return this;
  }

  needsApproval(permission: Permission): this {
    this.contract.requiresApproval!.push(permission);
    return this;
  }

  cannotDo(permission: Permission): this {
    this.contract.prohibited!.push(permission);
    return this;
  }

  verification(config: Verification): this {
    this.contract.verification = config;
    return this;
  }

  safetyRails(rails: Partial<SafetyRails>): this {
    if (this.contract.workflow) {
      this.contract.workflow.safety = { ...DEFAULT_SAFETY_RAILS, ...rails };
    }
    return this;
  }

  enforcement(config: Partial<Enforcement>): this {
    this.contract.enforcement = { ...DEFAULT_ENFORCEMENT, ...config };
    return this;
  }

  rateLimits(limits: Partial<RateLimits>): this {
    this.contract.rateLimits = { ...DEFAULT_RATE_LIMITS, ...limits };
    return this;
  }

  build(): AgentContract {
    this.contract.created = new Date();
    this.contract.updated = new Date();
    
    // Validate required fields
    if (!this.contract.name) throw new Error('Contract name is required');
    if (!this.contract.workflow) throw new Error('Workflow is required');
    if (!this.contract.verification) throw new Error('Verification config is required');
    
    return this.contract as AgentContract;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createEntity(config: {
  name: string;
  description?: string;
  fields: Field[];
  causalInfluences?: CausalInfluence[];
  interventions?: Intervention[];
}): Entity {
  return {
    name: config.name,
    description: config.description,
    fields: config.fields,
    causalInfluences: config.causalInfluences || [],
    interventions: config.interventions || []
  };
}

export function createWorkflow(config: {
  name: string;
  steps: WorkflowStep[];
  safety?: Partial<SafetyRails>;
  schedule?: string;
}): Workflow {
  return {
    name: config.name,
    version: '1.0.0',
    steps: config.steps,
    safety: { ...DEFAULT_SAFETY_RAILS, ...config.safety },
    schedule: config.schedule
  };
}

export function createVerification(config: {
  metrics: VerificationMetric[];
  thresholds?: Partial<VerificationThresholds>;
  learningConfig?: Partial<LearningConfig>;
}): Verification {
  return {
    enabled: true,
    causalLoop: true,
    metrics: config.metrics,
    thresholds: { ...DEFAULT_VERIFICATION_THRESHOLDS, ...config.thresholds },
    feedbackSources: [],
    learningConfig: {
      enabled: true,
      minObservations: 10,
      learningRate: 0.1,
      lockedBeforeApproval: true,
      batchSize: 100,
      validationSplit: 0.2,
      ...config.learningConfig
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export function defineContract(name: string, version?: string): AgentContractBuilder {
  return new AgentContractBuilder(name, version);
}
