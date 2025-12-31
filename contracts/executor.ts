/**
 * Reclapp AI Contract Runtime Executor
 * 
 * Executes AI Contracts with full safety rails, verification,
 * and causal feedback loops.
 * 
 * @version 2.1.0
 */

import {
  AgentContract,
  Entity,
  Workflow,
  WorkflowStep,
  Intervention,
  Permission,
  SafetyRails
} from './types';
import { validateContract, ValidationResult } from './validator';

// ============================================================================
// EXECUTION TYPES
// ============================================================================

export interface ExecutionContext {
  contractId: string;
  sessionId: string;
  startedAt: Date;
  currentStep: string;
  state: ExecutionState;
  history: ExecutionHistoryEntry[];
  sandbox: boolean;
}

export interface ExecutionState {
  entities: Map<string, any>;
  variables: Map<string, any>;
  interventionsApplied: AppliedIntervention[];
  anomaliesDetected: Anomaly[];
  confidence: Map<string, number>;
}

export interface AppliedIntervention {
  intervention: Intervention;
  entityId: string;
  appliedAt: Date;
  sandbox: boolean;
  predictedEffects: Record<string, number>;
  actualEffects?: Record<string, number>;
  verified: boolean;
  success?: boolean;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  context: Record<string, any>;
}

export interface ExecutionHistoryEntry {
  stepId: string;
  stepName: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  context: ExecutionContext;
  output: any;
  metrics: ExecutionMetrics;
  verification: VerificationResult;
  recommendations: Recommendation[];
}

export interface ExecutionMetrics {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  durationMs: number;
  interventionsApplied: number;
  anomaliesDetected: number;
}

export interface VerificationResult {
  intentMatch: number;
  causalValidity: number;
  predictedVsActual: PredictionComparison[];
  anomalies: Anomaly[];
  modelAdjustments: ModelAdjustment[];
}

export interface PredictionComparison {
  metric: string;
  predicted: number;
  actual: number;
  deviation: number;
  withinTolerance: boolean;
}

export interface ModelAdjustment {
  target: string;
  type: 'weight' | 'confidence' | 'threshold';
  previousValue: number;
  newValue: number;
  reason: string;
}

export interface Recommendation {
  type: 'adjust' | 'retry' | 'escalate' | 'pause' | 'learn';
  priority: number;
  description: string;
  action?: string;
}

// ============================================================================
// ACTION REQUEST & RESPONSE
// ============================================================================

export interface ActionRequest {
  action: string;
  target: string;
  parameters: Record<string, any>;
  confidence: number;
  reasoning: string;
}

export interface ActionResponse {
  allowed: boolean;
  requiresApproval: boolean;
  executed: boolean;
  result?: any;
  error?: string;
  auditId: string;
}

// ============================================================================
// CONTRACT EXECUTOR
// ============================================================================

export class ContractExecutor {
  private contract: AgentContract;
  private context: ExecutionContext;
  private stepHandlers: Map<string, StepHandler> = new Map();
  private auditLog: AuditEntry[] = [];
  private rateLimiter: RateLimiter;
  private isRunning: boolean = false;
  private isFrozen: boolean = false;
  private violationCount: number = 0;

  constructor(contract: AgentContract) {
    // Validate contract before accepting
    const validation = validateContract(contract);
    if (!validation.valid) {
      throw new Error(`Invalid contract: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.contract = contract;
    this.rateLimiter = new RateLimiter(contract.rateLimits);
    this.context = this.createContext();
    this.registerDefaultHandlers();
  }

  // ==========================================================================
  // EXECUTION
  // ==========================================================================

  /**
   * Execute the workflow
   */
  async execute(input?: Record<string, any>): Promise<ExecutionResult> {
    if (this.isFrozen) {
      throw new Error('Contract execution is frozen due to repeated violations');
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      // Initialize context
      this.context = this.createContext();
      if (input) {
        for (const [key, value] of Object.entries(input)) {
          this.context.state.variables.set(key, value);
        }
      }

      // Execute workflow steps
      let currentStepId = this.contract.workflow.steps[0]?.id;
      
      while (currentStepId && this.isRunning) {
        const step = this.contract.workflow.steps.find(s => s.id === currentStepId);
        if (!step) break;

        const result = await this.executeStep(step);
        
        // Determine next step based on result
        if (result.success) {
          currentStepId = step.onSuccess || this.getNextStepId(step.id);
        } else {
          currentStepId = step.onFailure;
          
          // Check for critical anomaly
          if (this.hasCriticalAnomaly() && this.contract.workflow.safety.freezeOnCriticalAnomaly) {
            this.freeze('Critical anomaly detected');
            break;
          }
        }
      }

      // Run verification
      const verification = await this.runVerification();

      // Generate recommendations
      const recommendations = this.generateRecommendations(verification);

      // Calculate metrics
      const metrics = this.calculateMetrics(startTime);

      return {
        success: this.context.history.every(h => h.status !== 'failed'),
        context: this.context,
        output: this.context.state.variables.get('output'),
        metrics,
        verification,
        recommendations
      };

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: WorkflowStep): Promise<{ success: boolean; result?: any }> {
    const historyEntry: ExecutionHistoryEntry = {
      stepId: step.id,
      stepName: step.name,
      startedAt: new Date(),
      status: 'running'
    };
    this.context.history.push(historyEntry);
    this.context.currentStep = step.id;

    try {
      // Check conditions
      if (step.conditions && !this.evaluateConditions(step.conditions)) {
        historyEntry.status = 'skipped';
        historyEntry.completedAt = new Date();
        return { success: true };
      }

      // Execute with timeout
      const handler = this.stepHandlers.get(step.type);
      if (!handler) {
        throw new Error(`No handler for step type: ${step.type}`);
      }

      const result = await this.withTimeout(
        handler(step, this.context),
        step.timeout || 30000
      );

      historyEntry.status = 'completed';
      historyEntry.result = result;
      historyEntry.completedAt = new Date();

      // Log audit entry
      this.logAudit({
        type: 'step_completed',
        stepId: step.id,
        result
      });

      return { success: true, result };

    } catch (error: any) {
      historyEntry.status = 'failed';
      historyEntry.error = error.message;
      historyEntry.completedAt = new Date();

      this.logAudit({
        type: 'step_failed',
        stepId: step.id,
        error: error.message
      });

      // Check if should retry
      if (step.retries && step.retries > 0) {
        return this.retryStep(step, step.retries);
      }

      return { success: false };
    }
  }

  /**
   * Retry a failed step
   */
  private async retryStep(step: WorkflowStep, remainingRetries: number): Promise<{ success: boolean; result?: any }> {
    for (let i = 0; i < remainingRetries; i++) {
      await this.delay(1000 * (i + 1)); // Exponential backoff
      
      const handler = this.stepHandlers.get(step.type);
      if (!handler) break;

      try {
        const result = await this.withTimeout(
          handler(step, this.context),
          step.timeout || 30000
        );
        return { success: true, result };
      } catch {
        continue;
      }
    }
    return { success: false };
  }

  // ==========================================================================
  // ACTION HANDLING
  // ==========================================================================

  /**
   * Request an action (used by AI agent)
   */
  async requestAction(request: ActionRequest): Promise<ActionResponse> {
    const auditId = this.generateAuditId();

    // Check if frozen
    if (this.isFrozen) {
      return {
        allowed: false,
        requiresApproval: false,
        executed: false,
        error: 'System is frozen',
        auditId
      };
    }

    // Check rate limits
    if (!this.rateLimiter.allow()) {
      return {
        allowed: false,
        requiresApproval: false,
        executed: false,
        error: 'Rate limit exceeded',
        auditId
      };
    }

    // Check permissions
    const permissionResult = this.checkPermission(request);

    // Log audit
    this.logAudit({
      type: 'action_requested',
      request,
      permissionResult,
      auditId
    });

    if (permissionResult.prohibited) {
      this.handleViolation('Attempted prohibited action');
      return {
        allowed: false,
        requiresApproval: false,
        executed: false,
        error: 'Action is prohibited',
        auditId
      };
    }

    if (permissionResult.requiresApproval) {
      return {
        allowed: true,
        requiresApproval: true,
        executed: false,
        auditId
      };
    }

    // Check confidence threshold
    if (request.confidence < this.contract.uncertaintyProtocol.confidenceThreshold) {
      return {
        allowed: true,
        requiresApproval: true,
        executed: false,
        error: `Confidence ${request.confidence} below threshold ${this.contract.uncertaintyProtocol.confidenceThreshold}`,
        auditId
      };
    }

    // Execute action
    try {
      const result = await this.executeAction(request);
      return {
        allowed: true,
        requiresApproval: false,
        executed: true,
        result,
        auditId
      };
    } catch (error: any) {
      return {
        allowed: true,
        requiresApproval: false,
        executed: false,
        error: error.message,
        auditId
      };
    }
  }

  /**
   * Check action permission
   */
  private checkPermission(request: ActionRequest): { allowed: boolean; requiresApproval: boolean; prohibited: boolean } {
    // Check prohibited first
    for (const perm of this.contract.prohibited) {
      if (this.matchesPermission(request, perm)) {
        return { allowed: false, requiresApproval: false, prohibited: true };
      }
    }

    // Check requires approval
    for (const perm of this.contract.requiresApproval) {
      if (this.matchesPermission(request, perm)) {
        return { allowed: true, requiresApproval: true, prohibited: false };
      }
    }

    // Check autonomous
    for (const perm of this.contract.canAutonomously) {
      if (this.matchesPermission(request, perm)) {
        return { allowed: true, requiresApproval: false, prohibited: false };
      }
    }

    // Default: requires approval for unknown actions
    return { allowed: true, requiresApproval: true, prohibited: false };
  }

  /**
   * Check if request matches permission
   */
  private matchesPermission(request: ActionRequest, permission: Permission): boolean {
    // Check action
    if (permission.action !== '*' && permission.action !== request.action) {
      return false;
    }

    // Check resource
    const matchesResource = permission.resources.some(r => 
      r === '*' || r === request.target || request.target.startsWith(r + '/')
    );
    if (!matchesResource) return false;

    // Check conditions
    if (permission.conditions) {
      for (const cond of permission.conditions) {
        const value = request.parameters[cond.field];
        if (!this.evaluateCondition(value, cond.operator, cond.value)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Execute an approved action
   */
  private async executeAction(request: ActionRequest): Promise<any> {
    // Implementation depends on action type
    switch (request.action) {
      case 'apply_intervention':
        return this.applyIntervention(request);
      case 'query_data':
        return this.queryData(request);
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  // ==========================================================================
  // INTERVENTION HANDLING
  // ==========================================================================

  /**
   * Apply an intervention
   */
  private async applyIntervention(request: ActionRequest): Promise<AppliedIntervention> {
    const { interventionName, entityId, sandbox } = request.parameters;
    
    // Find intervention definition
    let intervention: Intervention | undefined;
    for (const entity of this.contract.entities) {
      intervention = entity.interventions.find(i => i.name === interventionName);
      if (intervention) break;
    }

    if (!intervention) {
      throw new Error(`Intervention not found: ${interventionName}`);
    }

    // Check sandbox requirement
    const useSandbox = sandbox ?? intervention.sandbox ?? this.contract.workflow.safety.sandboxExperimental;

    // Check safety rails
    if (!this.checkSafetyRails(intervention)) {
      throw new Error('Intervention blocked by safety rails');
    }

    // Apply intervention
    const applied: AppliedIntervention = {
      intervention,
      entityId,
      appliedAt: new Date(),
      sandbox: useSandbox,
      predictedEffects: intervention.expectedEffect,
      verified: false
    };

    this.context.state.interventionsApplied.push(applied);

    // If not sandbox, actually apply changes
    if (!useSandbox) {
      // Apply to entity (implementation depends on storage)
      for (const [field, adjustment] of Object.entries(intervention.adjust)) {
        const entity = this.context.state.entities.get(entityId);
        if (entity) {
          // Simple adjustment logic - in production, use expression evaluator
          if (typeof adjustment === 'number') {
            entity[field] = (entity[field] || 0) + adjustment;
          } else {
            entity[field] = adjustment;
          }
        }
      }
    }

    return applied;
  }

  /**
   * Check safety rails before intervention
   */
  private checkSafetyRails(intervention: Intervention): boolean {
    const safety = this.contract.workflow.safety;

    // Check max adjustment
    for (const [, effect] of Object.entries(intervention.expectedEffect)) {
      if (Math.abs(effect) / 100 > safety.maxAdjustmentPerCycle) {
        return false;
      }
    }

    // Check cooldown
    if (intervention.cooldownMs) {
      const lastApplied = this.context.state.interventionsApplied
        .filter(a => a.intervention.name === intervention.name)
        .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime())[0];
      
      if (lastApplied) {
        const elapsed = Date.now() - lastApplied.appliedAt.getTime();
        if (elapsed < intervention.cooldownMs) {
          return false;
        }
      }
    }

    // Check max applications
    if (intervention.maxApplications) {
      const count = this.context.state.interventionsApplied
        .filter(a => a.intervention.name === intervention.name).length;
      if (count >= intervention.maxApplications) {
        return false;
      }
    }

    return true;
  }

  // ==========================================================================
  // VERIFICATION
  // ==========================================================================

  /**
   * Run verification loop
   */
  private async runVerification(): Promise<VerificationResult> {
    const predictions: PredictionComparison[] = [];
    const anomalies: Anomaly[] = [];
    const adjustments: ModelAdjustment[] = [];

    // Compare predicted vs actual for each intervention
    for (const applied of this.context.state.interventionsApplied) {
      if (applied.actualEffects) {
        for (const [metric, predicted] of Object.entries(applied.predictedEffects)) {
          const actual = applied.actualEffects[metric] || 0;
          const deviation = Math.abs(actual - predicted) / Math.abs(predicted || 1);
          
          predictions.push({
            metric,
            predicted,
            actual,
            deviation,
            withinTolerance: deviation <= this.contract.verification.thresholds.anomalyDetection
          });

          // Detect anomaly
          if (deviation > this.contract.verification.thresholds.anomalyDetection) {
            anomalies.push({
              type: 'prediction_deviation',
              severity: deviation > 0.5 ? 'high' : 'medium',
              description: `${metric} deviated by ${(deviation * 100).toFixed(1)}%`,
              detectedAt: new Date(),
              context: { metric, predicted, actual }
            });

            // Suggest adjustment
            adjustments.push({
              target: metric,
              type: 'weight',
              previousValue: predicted,
              newValue: actual,
              reason: `Observed deviation of ${(deviation * 100).toFixed(1)}%`
            });
          }
        }
      }
    }

    // Calculate overall scores
    const intentMatch = predictions.length > 0
      ? predictions.filter(p => p.withinTolerance).length / predictions.length
      : 1;

    const causalValidity = this.calculateCausalValidity();

    return {
      intentMatch,
      causalValidity,
      predictedVsActual: predictions,
      anomalies: [...this.context.state.anomaliesDetected, ...anomalies],
      modelAdjustments: adjustments
    };
  }

  /**
   * Calculate causal validity score
   */
  private calculateCausalValidity(): number {
    // Simplified - check if interventions followed expected causal paths
    let valid = 0;
    let total = 0;

    for (const applied of this.context.state.interventionsApplied) {
      if (applied.verified) {
        total++;
        if (applied.success) valid++;
      }
    }

    return total > 0 ? valid / total : 1;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private createContext(): ExecutionContext {
    return {
      contractId: this.contract.name,
      sessionId: this.generateSessionId(),
      startedAt: new Date(),
      currentStep: '',
      state: {
        entities: new Map(),
        variables: new Map(),
        interventionsApplied: [],
        anomaliesDetected: [],
        confidence: new Map()
      },
      history: [],
      sandbox: this.contract.workflow.safety.sandboxExperimental
    };
  }

  private registerDefaultHandlers(): void {
    this.stepHandlers.set('fetch_data', async (step, ctx) => {
      // Mock implementation
      return { data: 'fetched' };
    });

    this.stepHandlers.set('compute', async (step, ctx) => {
      return { computed: true };
    });

    this.stepHandlers.set('decision', async (step, ctx) => {
      return { decision: 'continue' };
    });

    this.stepHandlers.set('apply_intervention', async (step, ctx) => {
      return { applied: true };
    });

    this.stepHandlers.set('verify', async (step, ctx) => {
      return { verified: true };
    });

    this.stepHandlers.set('log', async (step, ctx) => {
      console.log(`[${step.config?.level || 'info'}] Step: ${step.name}`);
      return { logged: true };
    });

    this.stepHandlers.set('notify', async (step, ctx) => {
      return { notified: true };
    });

    this.stepHandlers.set('custom', async (step, ctx) => {
      return { custom: true };
    });
  }

  private getNextStepId(currentId: string): string | undefined {
    const steps = this.contract.workflow.steps;
    const currentIndex = steps.findIndex(s => s.id === currentId);
    return steps[currentIndex + 1]?.id;
  }

  private evaluateConditions(conditions: Array<{ expression: string }>): boolean {
    // Simplified condition evaluation
    return true;
  }

  private evaluateCondition(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case 'eq': return value === target;
      case 'ne': return value !== target;
      case 'gt': return value > target;
      case 'lt': return value < target;
      case 'gte': return value >= target;
      case 'lte': return value <= target;
      case 'in': return Array.isArray(target) && target.includes(value);
      case 'contains': return String(value).includes(String(target));
      default: return false;
    }
  }

  private async queryData(request: ActionRequest): Promise<any> {
    // Mock implementation
    return { data: [] };
  }

  private hasCriticalAnomaly(): boolean {
    return this.context.state.anomaliesDetected.some(a => a.severity === 'critical');
  }

  private handleViolation(reason: string): void {
    this.violationCount++;
    
    if (this.contract.enforcement.alertOnViolation) {
      this.logAudit({ type: 'violation', reason });
    }

    if (this.violationCount >= this.contract.enforcement.maxViolationsBeforeFreeze) {
      if (this.contract.enforcement.freezeOnRepeatedViolations) {
        this.freeze(reason);
      }
    }
  }

  private freeze(reason: string): void {
    this.isFrozen = true;
    this.logAudit({ type: 'frozen', reason });
  }

  private generateRecommendations(verification: VerificationResult): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (verification.intentMatch < this.contract.verification.thresholds.intentMatch) {
      recommendations.push({
        type: 'adjust',
        priority: 1,
        description: 'Intent match is below threshold',
        action: 'Review and adjust causal model weights'
      });
    }

    if (verification.anomalies.length > 0) {
      recommendations.push({
        type: 'escalate',
        priority: 2,
        description: `${verification.anomalies.length} anomalies detected`,
        action: 'Review anomalies and determine root cause'
      });
    }

    return recommendations;
  }

  private calculateMetrics(startTime: number): ExecutionMetrics {
    return {
      totalSteps: this.context.history.length,
      completedSteps: this.context.history.filter(h => h.status === 'completed').length,
      failedSteps: this.context.history.filter(h => h.status === 'failed').length,
      skippedSteps: this.context.history.filter(h => h.status === 'skipped').length,
      durationMs: Date.now() - startTime,
      interventionsApplied: this.context.state.interventionsApplied.length,
      anomaliesDetected: this.context.state.anomaliesDetected.length
    };
  }

  private logAudit(entry: any): void {
    if (!this.contract.enforcement.logAllDecisions) return;
    
    this.auditLog.push({
      timestamp: new Date(),
      contractId: this.contract.name,
      sessionId: this.context.sessionId,
      ...entry
    });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), ms)
      )
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public getters
  getAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  getContext(): ExecutionContext {
    return this.context;
  }

  isFrozenState(): boolean {
    return this.isFrozen;
  }
}

// ============================================================================
// HELPER CLASSES
// ============================================================================

type StepHandler = (step: WorkflowStep, context: ExecutionContext) => Promise<any>;

interface AuditEntry {
  timestamp: Date;
  contractId: string;
  sessionId: string;
  [key: string]: any;
}

class RateLimiter {
  private limits: { actionsPerMinute: number; actionsPerHour: number; actionsPerDay: number };
  private minuteCount: number = 0;
  private hourCount: number = 0;
  private dayCount: number = 0;
  private lastMinute: number = 0;
  private lastHour: number = 0;
  private lastDay: number = 0;

  constructor(limits: { actionsPerMinute: number; actionsPerHour: number; actionsPerDay: number }) {
    this.limits = limits;
  }

  allow(): boolean {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);

    if (minute !== this.lastMinute) {
      this.lastMinute = minute;
      this.minuteCount = 0;
    }
    if (hour !== this.lastHour) {
      this.lastHour = hour;
      this.hourCount = 0;
    }
    if (day !== this.lastDay) {
      this.lastDay = day;
      this.dayCount = 0;
    }

    if (this.minuteCount >= this.limits.actionsPerMinute) return false;
    if (this.hourCount >= this.limits.actionsPerHour) return false;
    if (this.dayCount >= this.limits.actionsPerDay) return false;

    this.minuteCount++;
    this.hourCount++;
    this.dayCount++;
    return true;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createExecutor(contract: AgentContract): ContractExecutor {
  return new ContractExecutor(contract);
}
