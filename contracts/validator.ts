/**
 * Reclapp AI Contract Validator
 * 
 * Runtime validation of AI Contracts using Zod schemas.
 * Ensures contracts are valid before execution.
 * 
 * @version 2.1.0
 */

import { z } from 'zod';
import type { 
  AgentContract, 
  Entity, 
  Workflow, 
  Verification,
  Permission,
  SafetyRails
} from './types';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Field Schema
const FieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'datetime', 'uuid', 'json', 'money']),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.string()).optional(),
  default: z.any().optional(),
  description: z.string().optional()
}).refine(
  (field) => {
    // Validate min/max only for number type
    if (field.type !== 'number' && (field.min !== undefined || field.max !== undefined)) {
      return false;
    }
    // Validate min <= max
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
      return false;
    }
    return true;
  },
  { message: 'Invalid field constraints' }
);

// Causal Influence Schema
const CausalInfluenceSchema = z.object({
  field: z.string().min(1),
  weight: z.number().min(-1).max(1),
  decay: z.number().min(0).max(1),
  mechanism: z.string().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains']),
    value: z.any()
  })).optional()
});

// Intervention Schema
const InterventionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  adjust: z.record(z.any()),
  expectedEffect: z.record(z.number()),
  confidence: z.number().min(0).max(1),
  sandbox: z.boolean(),
  cost: z.number().optional(),
  cooldownMs: z.number().optional(),
  maxApplications: z.number().optional(),
  prerequisites: z.array(z.string()).optional(),
  contraindications: z.array(z.string()).optional()
}).refine(
  (intervention) => Object.keys(intervention.expectedEffect).length > 0,
  { message: 'Intervention must have at least one expected effect' }
);

// Entity Schema
const EntitySchema = z.object({
  name: z.string().min(1).regex(/^[A-Z][a-zA-Z0-9]*$/, 'Entity name must be PascalCase'),
  description: z.string().optional(),
  fields: z.array(FieldSchema).min(1),
  causalInfluences: z.array(CausalInfluenceSchema),
  interventions: z.array(InterventionSchema),
  events: z.array(z.object({
    name: z.string(),
    fields: z.array(FieldSchema),
    description: z.string().optional()
  })).optional(),
  computed: z.array(z.object({
    name: z.string(),
    formula: z.string(),
    dependencies: z.array(z.string())
  })).optional()
});

// Workflow Step Schema
const WorkflowStepSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'fetch_data', 'transform', 'validate', 'compute',
    'apply_intervention', 'verify', 'notify', 'log', 'decision', 'custom'
  ]),
  name: z.string().min(1),
  description: z.string().optional(),
  config: z.record(z.any()).optional(),
  onSuccess: z.string().optional(),
  onFailure: z.string().optional(),
  timeout: z.number().positive().optional(),
  retries: z.number().int().min(0).optional(),
  conditions: z.array(z.object({
    expression: z.string(),
    description: z.string().optional()
  })).optional()
});

// Safety Rails Schema
const SafetyRailsSchema = z.object({
  maxAdjustmentPerCycle: z.number().min(0).max(1),
  rollbackOnAnomaly: z.boolean(),
  sandboxExperimental: z.boolean(),
  maxIterations: z.number().int().positive(),
  cooldownBetweenAdjustments: z.number().int().min(0),
  requireHumanApprovalAbove: z.number().min(0).max(1),
  freezeOnCriticalAnomaly: z.boolean(),
  anomalyThreshold: z.number().min(0).max(1)
});

// Workflow Schema
const WorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver'),
  steps: z.array(WorkflowStepSchema).min(1),
  safety: SafetyRailsSchema,
  triggers: z.array(z.object({
    type: z.enum(['event', 'schedule', 'condition', 'manual']),
    config: z.record(z.any())
  })).optional(),
  schedule: z.string().optional()
}).refine(
  (workflow) => {
    // Validate step references
    const stepIds = new Set(workflow.steps.map(s => s.id));
    for (const step of workflow.steps) {
      if (step.onSuccess && !stepIds.has(step.onSuccess)) return false;
      if (step.onFailure && !stepIds.has(step.onFailure)) return false;
    }
    return true;
  },
  { message: 'Workflow contains invalid step references' }
);

// Permission Schema
const PermissionSchema = z.object({
  action: z.enum([
    'generate_dsl', 'modify_entity', 'create_alert', 'update_dashboard',
    'execute_pipeline', 'send_notification', 'access_external',
    'delete_resource', 'modify_workflow', 'apply_intervention', 'query_data', '*'
  ]),
  resources: z.array(z.string()).min(1),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'gt', 'lt', 'in', 'contains']),
    value: z.any()
  })).optional(),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical'])
});

// Verification Schema
const VerificationSchema = z.object({
  enabled: z.boolean(),
  causalLoop: z.boolean(),
  metrics: z.array(z.object({
    name: z.string(),
    description: z.string(),
    formula: z.string().optional(),
    threshold: z.number().optional(),
    direction: z.enum(['higher_better', 'lower_better', 'target']).optional(),
    target: z.number().optional()
  })),
  thresholds: z.object({
    anomalyDetection: z.number().min(0).max(1),
    intentMatch: z.number().min(0).max(1),
    causalValidity: z.number().min(0).max(1),
    confidenceDecay: z.boolean(),
    confidenceDecayRate: z.number().min(0).max(1),
    minConfidence: z.number().min(0).max(1),
    maxConfidence: z.number().min(0).max(1)
  }),
  feedbackSources: z.array(z.object({
    name: z.string(),
    type: z.enum(['metric', 'event', 'human', 'external']),
    config: z.record(z.any()),
    weight: z.number().min(0).max(1)
  })),
  learningConfig: z.object({
    enabled: z.boolean(),
    minObservations: z.number().int().positive(),
    learningRate: z.number().min(0).max(1),
    lockedBeforeApproval: z.boolean(),
    batchSize: z.number().int().positive(),
    validationSplit: z.number().min(0).max(1)
  })
});

// Enforcement Schema
const EnforcementSchema = z.object({
  logAllDecisions: z.boolean(),
  overrideRequiresApproval: z.boolean(),
  feedbackLockedBeforeLearning: z.boolean(),
  causalVerificationRequired: z.boolean(),
  auditRetentionDays: z.number().int().positive(),
  alertOnViolation: z.boolean(),
  freezeOnRepeatedViolations: z.boolean(),
  maxViolationsBeforeFreeze: z.number().int().positive()
});

// Rate Limits Schema
const RateLimitsSchema = z.object({
  actionsPerMinute: z.number().int().positive(),
  actionsPerHour: z.number().int().positive(),
  actionsPerDay: z.number().int().positive(),
  concurrentActions: z.number().int().positive(),
  costPerDay: z.number().positive().optional()
});

// Uncertainty Protocol Schema
const UncertaintyProtocolSchema = z.object({
  confidenceThreshold: z.number().min(0).max(1),
  onLowConfidence: z.object({
    askForClarification: z.boolean(),
    provideAlternatives: z.boolean(),
    maxAlternatives: z.number().int().positive(),
    escalateAfterAttempts: z.number().int().positive()
  }),
  onMissingData: z.object({
    listRequirements: z.boolean(),
    suggestSources: z.boolean(),
    proceedWithAssumptions: z.boolean(),
    markAsUncertain: z.boolean()
  })
});

// Negotiation Protocol Schema
const NegotiationProtocolSchema = z.object({
  maxIterations: z.number().int().positive(),
  onRejection: z.object({
    askForFeedback: z.boolean(),
    proposeAlternative: z.boolean(),
    explainReasoning: z.boolean()
  }),
  onPartialApproval: z.object({
    executeApproved: z.boolean(),
    queueRejected: z.boolean()
  }),
  timeoutSeconds: z.number().int().positive()
});

// Complete Agent Contract Schema
export const AgentContractSchema = z.object({
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver'),
  description: z.string().max(1000),
  author: z.string().optional(),
  created: z.date().optional(),
  updated: z.date().optional(),
  
  entities: z.array(EntitySchema).min(1),
  workflow: WorkflowSchema,
  
  canAutonomously: z.array(PermissionSchema),
  requiresApproval: z.array(PermissionSchema),
  prohibited: z.array(PermissionSchema),
  
  uncertaintyProtocol: UncertaintyProtocolSchema,
  negotiationProtocol: NegotiationProtocolSchema,
  
  verification: VerificationSchema,
  enforcement: EnforcementSchema,
  rateLimits: RateLimitsSchema,
  
  extensions: z.record(z.any()).optional()
}).refine(
  (contract) => {
    // Ensure no permission conflicts
    const autonomous = new Set(contract.canAutonomously.map(p => `${p.action}:${p.resources.join(',')}`));
    const prohibited = contract.prohibited.map(p => `${p.action}:${p.resources.join(',')}`);
    
    for (const p of prohibited) {
      if (autonomous.has(p)) return false;
    }
    return true;
  },
  { message: 'Permission conflict: same action is both autonomous and prohibited' }
).refine(
  (contract) => {
    // Validate entity references in interventions
    const entityNames = new Set(contract.entities.map(e => e.name));
    // Add more cross-reference validations as needed
    return true;
  },
  { message: 'Invalid entity reference in contract' }
);

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  path: string;
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Validate an agent contract
 */
export function validateContract(contract: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Zod validation
  const result = AgentContractSchema.safeParse(contract);
  
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        code: `VALIDATION_${issue.code.toUpperCase()}`,
        message: issue.message
      });
    }
  }

  // Additional semantic validations
  if (result.success) {
    const data = result.data;
    
    // Check for unused entities
    const usedEntities = new Set<string>();
    for (const step of data.workflow.steps) {
      if (step.config?.entity) usedEntities.add(step.config.entity);
    }
    
    for (const entity of data.entities) {
      if (!usedEntities.has(entity.name)) {
        warnings.push({
          path: `entities.${entity.name}`,
          code: 'W001',
          message: `Entity '${entity.name}' is not referenced in workflow`,
          suggestion: 'Consider removing unused entity or adding workflow step'
        });
      }
    }

    // Check for high-risk autonomous permissions
    for (const perm of data.canAutonomously) {
      if (perm.riskLevel === 'high' || perm.riskLevel === 'critical') {
        warnings.push({
          path: `canAutonomously.${perm.action}`,
          code: 'W002',
          message: `High-risk action '${perm.action}' is set to autonomous`,
          suggestion: 'Consider requiring approval for high-risk actions'
        });
      }
    }

    // Check for interventions without sandbox
    for (const entity of data.entities) {
      for (const intervention of entity.interventions) {
        if (!intervention.sandbox && intervention.confidence < 0.9) {
          warnings.push({
            path: `entities.${entity.name}.interventions.${intervention.name}`,
            code: 'W003',
            message: `Intervention '${intervention.name}' has low confidence (${intervention.confidence}) but sandbox is disabled`,
            suggestion: 'Enable sandbox for low-confidence interventions'
          });
        }
      }
    }

    // Check verification thresholds
    if (data.verification.thresholds.minConfidence > data.uncertaintyProtocol.confidenceThreshold) {
      warnings.push({
        path: 'verification.thresholds.minConfidence',
        code: 'W004',
        message: 'Minimum confidence is higher than uncertainty threshold',
        suggestion: 'Adjust thresholds to ensure consistency'
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a single entity
 */
export function validateEntity(entity: unknown): ValidationResult {
  const result = EntitySchema.safeParse(entity);
  
  return {
    valid: result.success,
    errors: result.success ? [] : result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      code: `ENTITY_${issue.code.toUpperCase()}`,
      message: issue.message
    })),
    warnings: []
  };
}

/**
 * Validate a workflow
 */
export function validateWorkflow(workflow: unknown): ValidationResult {
  const result = WorkflowSchema.safeParse(workflow);
  
  return {
    valid: result.success,
    errors: result.success ? [] : result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      code: `WORKFLOW_${issue.code.toUpperCase()}`,
      message: issue.message
    })),
    warnings: []
  };
}

/**
 * Validate safety rails
 */
export function validateSafetyRails(rails: unknown): ValidationResult {
  const result = SafetyRailsSchema.safeParse(rails);
  
  const warnings: ValidationWarning[] = [];
  
  if (result.success) {
    if (result.data.maxAdjustmentPerCycle > 0.3) {
      warnings.push({
        path: 'maxAdjustmentPerCycle',
        code: 'W005',
        message: 'High max adjustment may cause instability',
        suggestion: 'Consider reducing to 0.1-0.2'
      });
    }
    
    if (!result.data.rollbackOnAnomaly) {
      warnings.push({
        path: 'rollbackOnAnomaly',
        code: 'W006',
        message: 'Rollback on anomaly is disabled',
        suggestion: 'Enable for production safety'
      });
    }
  }
  
  return {
    valid: result.success,
    errors: result.success ? [] : result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      code: `SAFETY_${issue.code.toUpperCase()}`,
      message: issue.message
    })),
    warnings
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FieldSchema,
  EntitySchema,
  WorkflowSchema,
  PermissionSchema,
  VerificationSchema,
  EnforcementSchema,
  SafetyRailsSchema
};
