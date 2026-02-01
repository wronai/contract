/**
 * Reclapp AI Contract Validator
 * 
 * Runtime validation of AI Contracts using internal schema objects.
 * Ensures contracts are valid before execution.
 * 
 * @version 2.4.1
 */

import type { 
  AgentContract, 
  Entity, 
  Workflow, 
  Verification,
  Permission,
  SafetyRails
} from './types';

type Issue = {
  path: (string | number)[];
  code: string;
  message: string;
};

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: Issue[] } };

interface Schema<T> {
  safeParse(value: unknown): SafeParseResult<T>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail<T>(issues: Issue[]): SafeParseResult<T> {
  return { success: false, error: { issues } };
}

function ok<T>(data: T): SafeParseResult<T> {
  return { success: true, data };
}

function addIssue(issues: Issue[], path: (string | number)[], message: string, code: string = 'custom'): void {
  issues.push({ path, code, message });
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

type FieldRefineInput = {
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'uuid' | 'json' | 'money';
  min?: number;
  max?: number;
};

// ============================================================================
// SCHEMAS
// ============================================================================

// Field Schema
const FieldSchema: Schema<unknown> = {
  safeParse(value: unknown): SafeParseResult<unknown> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const name = asString(value.name);
    if (!name || name.length < 1) {
      addIssue(issues, ['name'], 'Expected non-empty string');
    }

    const type = asString(value.type);
    const allowedTypes = ['string', 'number', 'boolean', 'datetime', 'uuid', 'json', 'money'];
    if (!type || !allowedTypes.includes(type)) {
      addIssue(issues, ['type'], `Expected one of: ${allowedTypes.join(', ')}`);
    }

    const min = value.min !== undefined ? asNumber(value.min) : undefined;
    const max = value.max !== undefined ? asNumber(value.max) : undefined;
    if (value.min !== undefined && min === undefined) {
      addIssue(issues, ['min'], 'Expected number');
    }
    if (value.max !== undefined && max === undefined) {
      addIssue(issues, ['max'], 'Expected number');
    }

    if (type && type !== 'number' && (value.min !== undefined || value.max !== undefined)) {
      addIssue(issues, ['min'], 'min/max allowed only for number type');
    }

    if (min !== undefined && max !== undefined && min > max) {
      addIssue(issues, ['min'], 'min must be <= max');
    }

    return issues.length > 0 ? fail(issues) : ok(value);
  }
};

// Causal Influence Schema
const CausalInfluenceSchema: Schema<unknown> = {
  safeParse(value: unknown): SafeParseResult<unknown> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const field = asString(value.field);
    if (!field || field.length < 1) {
      addIssue(issues, ['field'], 'Expected non-empty string');
    }

    const weight = asNumber(value.weight);
    if (weight === undefined || weight < -1 || weight > 1) {
      addIssue(issues, ['weight'], 'Expected number between -1 and 1');
    }

    const decay = asNumber(value.decay);
    if (decay === undefined || decay < 0 || decay > 1) {
      addIssue(issues, ['decay'], 'Expected number between 0 and 1');
    }

    return issues.length > 0 ? fail(issues) : ok(value);
  }
};

// Intervention Schema
const InterventionSchema: Schema<unknown> = {
  safeParse(value: unknown): SafeParseResult<unknown> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const name = asString(value.name);
    if (!name || name.length < 1) {
      addIssue(issues, ['name'], 'Expected non-empty string');
    }

    if (!isRecord(value.adjust)) {
      addIssue(issues, ['adjust'], 'Expected object');
    }

    if (!isRecord(value.expectedEffect)) {
      addIssue(issues, ['expectedEffect'], 'Expected object');
    } else if (Object.keys(value.expectedEffect).length === 0) {
      addIssue(issues, ['expectedEffect'], 'Intervention must have at least one expected effect');
    }

    const confidence = asNumber(value.confidence);
    if (confidence === undefined || confidence < 0 || confidence > 1) {
      addIssue(issues, ['confidence'], 'Expected number between 0 and 1');
    }

    const sandbox = asBoolean(value.sandbox);
    if (sandbox === undefined) {
      addIssue(issues, ['sandbox'], 'Expected boolean');
    }

    return issues.length > 0 ? fail(issues) : ok(value);
  }
};

// Entity Schema
const EntitySchema: Schema<Entity> = {
  safeParse(value: unknown): SafeParseResult<Entity> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const name = asString(value.name);
    if (!name || name.length < 1) {
      addIssue(issues, ['name'], 'Expected non-empty string');
    } else if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      addIssue(issues, ['name'], 'Entity name must be PascalCase');
    }

    const fields = Array.isArray(value.fields) ? value.fields : undefined;
    if (!fields || fields.length < 1) {
      addIssue(issues, ['fields'], 'Expected non-empty array');
    } else {
      for (let i = 0; i < fields.length; i++) {
        const r = FieldSchema.safeParse(fields[i]);
        if (!r.success) {
          for (const issue of r.error.issues) {
            addIssue(issues, ['fields', i, ...issue.path], issue.message, issue.code);
          }
        }
      }
    }

    const causalInfluences = Array.isArray(value.causalInfluences) ? value.causalInfluences : undefined;
    if (!causalInfluences) {
      addIssue(issues, ['causalInfluences'], 'Expected array');
    }

    const interventions = Array.isArray(value.interventions) ? value.interventions : undefined;
    if (!interventions) {
      addIssue(issues, ['interventions'], 'Expected array');
    }

    if (issues.length > 0) {
      return fail(issues);
    }

    return ok(value as unknown as Entity);
  }
};

// Workflow Step Schema
const WorkflowStepSchema: Schema<unknown> = {
  safeParse(value: unknown): SafeParseResult<unknown> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const id = asString(value.id);
    if (!id || id.length < 1) {
      addIssue(issues, ['id'], 'Expected non-empty string');
    }

    const type = asString(value.type);
    const allowedTypes = [
      'fetch_data', 'transform', 'validate', 'compute',
      'apply_intervention', 'verify', 'notify', 'log', 'decision', 'custom'
    ];
    if (!type || !allowedTypes.includes(type)) {
      addIssue(issues, ['type'], `Expected one of: ${allowedTypes.join(', ')}`);
    }

    const name = asString(value.name);
    if (!name || name.length < 1) {
      addIssue(issues, ['name'], 'Expected non-empty string');
    }

    return issues.length > 0 ? fail(issues) : ok(value);
  }
};

// Safety Rails Schema
const SafetyRailsSchema: Schema<SafetyRails> = {
  safeParse(value: unknown): SafeParseResult<SafetyRails> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const maxAdjustmentPerCycle = asNumber(value.maxAdjustmentPerCycle);
    if (maxAdjustmentPerCycle === undefined || maxAdjustmentPerCycle < 0 || maxAdjustmentPerCycle > 1) {
      addIssue(issues, ['maxAdjustmentPerCycle'], 'Expected number between 0 and 1');
    }

    if (asBoolean(value.rollbackOnAnomaly) === undefined) addIssue(issues, ['rollbackOnAnomaly'], 'Expected boolean');
    if (asBoolean(value.sandboxExperimental) === undefined) addIssue(issues, ['sandboxExperimental'], 'Expected boolean');
    if (asNumber(value.maxIterations) === undefined) addIssue(issues, ['maxIterations'], 'Expected number');
    if (asNumber(value.cooldownBetweenAdjustments) === undefined) addIssue(issues, ['cooldownBetweenAdjustments'], 'Expected number');
    const requireHumanApprovalAbove = asNumber(value.requireHumanApprovalAbove);
    if (requireHumanApprovalAbove === undefined || requireHumanApprovalAbove < 0 || requireHumanApprovalAbove > 1) {
      addIssue(issues, ['requireHumanApprovalAbove'], 'Expected number between 0 and 1');
    }
    if (asBoolean(value.freezeOnCriticalAnomaly) === undefined) addIssue(issues, ['freezeOnCriticalAnomaly'], 'Expected boolean');
    const anomalyThreshold = asNumber(value.anomalyThreshold);
    if (anomalyThreshold === undefined || anomalyThreshold < 0 || anomalyThreshold > 1) {
      addIssue(issues, ['anomalyThreshold'], 'Expected number between 0 and 1');
    }

    return issues.length > 0 ? fail(issues) : ok(value as unknown as SafetyRails);
  }
};

// Workflow Schema
const WorkflowSchema: Schema<Workflow> = {
  safeParse(value: unknown): SafeParseResult<Workflow> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const name = asString(value.name);
    if (!name || name.length < 1) {
      addIssue(issues, ['name'], 'Expected non-empty string');
    }

    const version = asString(value.version);
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      addIssue(issues, ['version'], 'Version must be semver');
    }

    const steps = Array.isArray(value.steps) ? value.steps : undefined;
    if (!steps || steps.length < 1) {
      addIssue(issues, ['steps'], 'Expected non-empty array');
    } else {
      const stepIds = new Set<string>();
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const r = WorkflowStepSchema.safeParse(step);
        if (!r.success) {
          for (const issue of r.error.issues) {
            addIssue(issues, ['steps', i, ...issue.path], issue.message, issue.code);
          }
        }
        if (isRecord(step) && typeof step.id === 'string') {
          stepIds.add(step.id);
        }
      }

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!isRecord(step)) continue;
        if (typeof step.onSuccess === 'string' && !stepIds.has(step.onSuccess)) {
          addIssue(issues, ['steps', i, 'onSuccess'], 'Workflow contains invalid step references');
        }
        if (typeof step.onFailure === 'string' && !stepIds.has(step.onFailure)) {
          addIssue(issues, ['steps', i, 'onFailure'], 'Workflow contains invalid step references');
        }
      }
    }

    const safetyResult = SafetyRailsSchema.safeParse(value.safety);
    if (!safetyResult.success) {
      for (const issue of safetyResult.error.issues) {
        addIssue(issues, ['safety', ...issue.path], issue.message, issue.code);
      }
    }

    return issues.length > 0 ? fail(issues) : ok(value as unknown as Workflow);
  }
};

// Permission Schema
const PermissionSchema: Schema<Permission> = {
  safeParse(value: unknown): SafeParseResult<Permission> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const action = asString(value.action);
    const allowedActions = [
      'generate_dsl', 'modify_entity', 'create_alert', 'update_dashboard',
      'execute_pipeline', 'send_notification', 'access_external',
      'delete_resource', 'modify_workflow', 'apply_intervention', 'query_data', '*'
    ];
    if (!action || !allowedActions.includes(action)) {
      addIssue(issues, ['action'], `Expected one of: ${allowedActions.join(', ')}`);
    }

    const resources = Array.isArray(value.resources) ? value.resources : undefined;
    if (!resources || resources.length < 1 || !resources.every(r => typeof r === 'string')) {
      addIssue(issues, ['resources'], 'Expected non-empty array of strings');
    }

    const riskLevel = asString(value.riskLevel);
    const allowedRisk = ['low', 'medium', 'high', 'critical'];
    if (!riskLevel || !allowedRisk.includes(riskLevel)) {
      addIssue(issues, ['riskLevel'], `Expected one of: ${allowedRisk.join(', ')}`);
    }

    return issues.length > 0 ? fail(issues) : ok(value as unknown as Permission);
  }
};

// Verification Schema
const VerificationSchema: Schema<Verification> = {
  safeParse(value: unknown): SafeParseResult<Verification> {
    if (!isRecord(value)) {
      return fail([{ path: [], code: 'custom', message: 'Expected object' }]);
    }
    return ok(value as unknown as Verification);
  }
};

// Enforcement Schema
const EnforcementSchema: Schema<unknown> = {
  safeParse(value: unknown): SafeParseResult<unknown> {
    if (!isRecord(value)) {
      return fail([{ path: [], code: 'custom', message: 'Expected object' }]);
    }
    return ok(value);
  }
};

// Complete Agent Contract Schema
export const AgentContractSchema: Schema<AgentContract> = {
  safeParse(value: unknown): SafeParseResult<AgentContract> {
    const issues: Issue[] = [];

    if (!isRecord(value)) {
      addIssue(issues, [], 'Expected object');
      return fail(issues);
    }

    const data: Record<string, unknown> = { ...value };

    const name = asString(data.name);
    if (!name || name.length < 1 || name.length > 100) {
      addIssue(issues, ['name'], 'Expected name (1-100 chars)');
    }

    const version = asString(data.version);
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      addIssue(issues, ['version'], 'Version must be semver');
    }

    const description = asString(data.description);
    if (!description || description.length > 1000) {
      addIssue(issues, ['description'], 'Expected description (<= 1000 chars)');
    }

    const entities = Array.isArray(data.entities) ? data.entities : undefined;
    if (!entities || entities.length < 1) {
      addIssue(issues, ['entities'], 'Expected non-empty array');
    } else {
      for (let i = 0; i < entities.length; i++) {
        const r = EntitySchema.safeParse(entities[i]);
        if (!r.success) {
          for (const issue of r.error.issues) {
            addIssue(issues, ['entities', i, ...issue.path], issue.message, issue.code);
          }
        }
      }
    }

    const workflowResult = WorkflowSchema.safeParse(data.workflow);
    if (!workflowResult.success) {
      for (const issue of workflowResult.error.issues) {
        addIssue(issues, ['workflow', ...issue.path], issue.message, issue.code);
      }
    }

    if (!Array.isArray(data.canAutonomously)) data.canAutonomously = [];
    if (!Array.isArray(data.requiresApproval)) data.requiresApproval = [];
    if (!Array.isArray(data.prohibited)) data.prohibited = [];

    const canAutonomously = data.canAutonomously as unknown[];
    for (let i = 0; i < canAutonomously.length; i++) {
      const r = PermissionSchema.safeParse(canAutonomously[i]);
      if (!r.success) {
        for (const issue of r.error.issues) {
          addIssue(issues, ['canAutonomously', i, ...issue.path], issue.message, issue.code);
        }
      }
    }

    const requiresApproval = data.requiresApproval as unknown[];
    for (let i = 0; i < requiresApproval.length; i++) {
      const r = PermissionSchema.safeParse(requiresApproval[i]);
      if (!r.success) {
        for (const issue of r.error.issues) {
          addIssue(issues, ['requiresApproval', i, ...issue.path], issue.message, issue.code);
        }
      }
    }

    const prohibited = data.prohibited as unknown[];
    for (let i = 0; i < prohibited.length; i++) {
      const r = PermissionSchema.safeParse(prohibited[i]);
      if (!r.success) {
        for (const issue of r.error.issues) {
          addIssue(issues, ['prohibited', i, ...issue.path], issue.message, issue.code);
        }
      }
    }

    if (!isRecord(data.uncertaintyProtocol)) addIssue(issues, ['uncertaintyProtocol'], 'Expected object');
    if (!isRecord(data.negotiationProtocol)) addIssue(issues, ['negotiationProtocol'], 'Expected object');
    if (!isRecord(data.verification)) addIssue(issues, ['verification'], 'Expected object');
    if (!isRecord(data.enforcement)) addIssue(issues, ['enforcement'], 'Expected object');
    if (!isRecord(data.rateLimits)) addIssue(issues, ['rateLimits'], 'Expected object');

    const autonomousSet = new Set(
      (data.canAutonomously as unknown[])
        .map(p => (isRecord(p) ? `${String(p.action)}:${Array.isArray(p.resources) ? (p.resources as unknown[]).join(',') : ''}` : ''))
        .filter(Boolean)
    );
    const prohibitedSet = (data.prohibited as unknown[])
      .map(p => (isRecord(p) ? `${String(p.action)}:${Array.isArray(p.resources) ? (p.resources as unknown[]).join(',') : ''}` : ''))
      .filter(Boolean);
    for (const p of prohibitedSet) {
      if (autonomousSet.has(p)) {
        addIssue(issues, ['prohibited'], 'Permission conflict: same action is both autonomous and prohibited');
        break;
      }
    }

    return issues.length > 0 ? fail(issues) : ok(data as unknown as AgentContract);
  }
};

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
      const entity = step.config?.entity;
      if (typeof entity === 'string') usedEntities.add(entity);
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
    errors: result.success ? [] : result.error.issues.map((issue: Issue) => ({
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
    errors: result.success ? [] : result.error.issues.map((issue: Issue) => ({
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
    errors: result.success ? [] : result.error.issues.map((issue: Issue) => ({
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
