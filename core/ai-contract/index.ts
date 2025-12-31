/**
 * Reclapp AI Contract System
 * 
 * Formal specification of AI capabilities, permissions,
 * and negotiation protocols for autonomous operation.
 */

// ============================================================================
// CONTRACT TYPES
// ============================================================================

export interface AIContract {
  id: string;
  name: string;
  version: string;
  
  // Permission categories
  canAutonomously: Permission[];
  requiresApproval: Permission[];
  cannot: Permission[];
  
  // Protocols
  uncertaintyProtocol: UncertaintyProtocol;
  negotiationProtocol: NegotiationProtocol;
  escalationProtocol: EscalationProtocol;
  
  // Limits
  limits: ContractLimits;
  
  // Audit
  auditRequirements: AuditRequirement[];
}

export interface Permission {
  action: string;
  resource: string;
  conditions?: PermissionCondition[];
  scope?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
  value: any;
}

export interface UncertaintyProtocol {
  confidenceThreshold: number;        // Minimum confidence for autonomous action
  
  belowThreshold: {
    action: 'ask_clarification' | 'provide_alternatives' | 'escalate';
    maxAlternatives?: number;
  };
  
  missingData: {
    action: 'list_requirements' | 'suggest_sources' | 'proceed_with_assumptions';
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

export interface EscalationProtocol {
  triggers: EscalationTrigger[];
  defaultEscalationPath: string[];
  notificationChannels: string[];
}

export interface EscalationTrigger {
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  escalateTo: string;
  timeoutMinutes?: number;
}

export interface ContractLimits {
  maxActionsPerMinute: number;
  maxResourcesPerAction: number;
  maxCostPerAction?: number;
  maxConcurrentActions: number;
  dailyActionBudget?: number;
}

export interface AuditRequirement {
  action: string;
  logLevel: 'minimal' | 'standard' | 'detailed' | 'full';
  retentionDays: number;
  alertOnAnomaly: boolean;
}

// ============================================================================
// AI ACTION TYPES
// ============================================================================

export interface AIAction {
  id: string;
  type: AIActionType;
  target: string;
  parameters: Record<string, any>;
  
  // AI-provided metadata
  confidence: number;
  reasoning: string;
  alternatives?: AIAction[];
  uncertainties?: Uncertainty[];
  
  // Context
  context: ActionContext;
  timestamp: Date;
}

export type AIActionType =
  | 'generate_dsl'
  | 'modify_entity'
  | 'create_alert'
  | 'update_dashboard'
  | 'execute_pipeline'
  | 'query_data'
  | 'send_notification'
  | 'modify_workflow'
  | 'access_external'
  | 'delete_resource';

export interface Uncertainty {
  aspect: string;
  level: 'low' | 'medium' | 'high';
  reason: string;
  possibleValues?: any[];
}

export interface ActionContext {
  userId?: string;
  sessionId: string;
  previousActions: string[];
  currentState: Record<string, any>;
}

// ============================================================================
// DECISION TYPES
// ============================================================================

export interface ActionDecision {
  allowed: boolean | 'pending' | 'clarification_needed';
  reason: string;
  
  // For pending
  approvalRequest?: ApprovalRequest;
  
  // For clarification needed
  questions?: ClarificationQuestion[];
  
  // Alternatives if denied
  alternatives?: AIAction[];
  
  // Audit
  auditLog: AuditEntry;
}

export interface ApprovalRequest {
  id: string;
  action: AIAction;
  requiredApprovers: string[];
  expiresAt: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  context: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'confirmation' | 'data';
  options?: string[];
  required: boolean;
}

export interface AuditEntry {
  timestamp: Date;
  action: AIAction;
  decision: 'allowed' | 'denied' | 'pending' | 'clarification';
  reason: string;
  contractVersion: string;
  evaluationDetails: Record<string, any>;
}

// ============================================================================
// CONTRACT ENFORCER
// ============================================================================

export class AIContractEnforcer {
  private contract: AIContract;
  private auditLog: AuditEntry[] = [];
  private actionCount: Map<string, number> = new Map();
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  
  constructor(contract: AIContract) {
    this.contract = contract;
  }
  
  /**
   * Evaluate if an action is allowed under the contract
   */
  async evaluateAction(action: AIAction): Promise<ActionDecision> {
    const auditEntry: AuditEntry = {
      timestamp: new Date(),
      action,
      decision: 'allowed',
      reason: '',
      contractVersion: this.contract.version,
      evaluationDetails: {}
    };
    
    try {
      // 1. Check if action is prohibited
      if (this.isProhibited(action)) {
        auditEntry.decision = 'denied';
        auditEntry.reason = 'Action prohibited by contract';
        this.auditLog.push(auditEntry);
        
        return {
          allowed: false,
          reason: 'This action is not permitted under the current AI contract',
          alternatives: await this.suggestAlternatives(action),
          auditLog: auditEntry
        };
      }
      
      // 2. Check rate limits
      if (!this.checkRateLimits(action)) {
        auditEntry.decision = 'denied';
        auditEntry.reason = 'Rate limit exceeded';
        this.auditLog.push(auditEntry);
        
        return {
          allowed: false,
          reason: 'Rate limit exceeded. Please wait before performing more actions.',
          auditLog: auditEntry
        };
      }
      
      // 3. Check if requires approval
      if (this.requiresApproval(action)) {
        auditEntry.decision = 'pending';
        auditEntry.reason = 'Action requires human approval';
        this.auditLog.push(auditEntry);
        
        const approvalRequest = this.createApprovalRequest(action);
        this.pendingApprovals.set(approvalRequest.id, approvalRequest);
        
        return {
          allowed: 'pending',
          reason: 'This action requires human approval before execution',
          approvalRequest,
          auditLog: auditEntry
        };
      }
      
      // 4. Check confidence threshold
      if (action.confidence < this.contract.uncertaintyProtocol.confidenceThreshold) {
        auditEntry.decision = 'clarification';
        auditEntry.reason = 'Confidence below threshold';
        this.auditLog.push(auditEntry);
        
        return {
          allowed: 'clarification_needed',
          reason: `Confidence (${(action.confidence * 100).toFixed(1)}%) is below threshold (${(this.contract.uncertaintyProtocol.confidenceThreshold * 100).toFixed(1)}%)`,
          questions: await this.generateClarifyingQuestions(action),
          alternatives: action.alternatives,
          auditLog: auditEntry
        };
      }
      
      // 5. Check specific conditions
      const conditionCheck = this.checkConditions(action);
      if (!conditionCheck.passed) {
        auditEntry.decision = 'denied';
        auditEntry.reason = conditionCheck.reason;
        this.auditLog.push(auditEntry);
        
        return {
          allowed: false,
          reason: conditionCheck.reason,
          alternatives: await this.suggestAlternatives(action),
          auditLog: auditEntry
        };
      }
      
      // 6. Action is allowed
      this.incrementActionCount(action.type);
      auditEntry.decision = 'allowed';
      auditEntry.reason = 'Action permitted under contract';
      this.auditLog.push(auditEntry);
      
      return {
        allowed: true,
        reason: 'Action is permitted',
        auditLog: auditEntry
      };
      
    } catch (error: any) {
      auditEntry.decision = 'denied';
      auditEntry.reason = `Evaluation error: ${error.message}`;
      this.auditLog.push(auditEntry);
      
      return {
        allowed: false,
        reason: `Error evaluating action: ${error.message}`,
        auditLog: auditEntry
      };
    }
  }
  
  /**
   * Check if action is in the prohibited list
   */
  private isProhibited(action: AIAction): boolean {
    return this.contract.cannot.some(permission => 
      this.matchesPermission(action, permission)
    );
  }
  
  /**
   * Check if action requires approval
   */
  private requiresApproval(action: AIAction): boolean {
    return this.contract.requiresApproval.some(permission =>
      this.matchesPermission(action, permission)
    );
  }
  
  /**
   * Check if action is allowed autonomously
   */
  private isAllowedAutonomously(action: AIAction): boolean {
    return this.contract.canAutonomously.some(permission =>
      this.matchesPermission(action, permission)
    );
  }
  
  /**
   * Match action against permission
   */
  private matchesPermission(action: AIAction, permission: Permission): boolean {
    // Check action type
    if (permission.action !== '*' && permission.action !== action.type) {
      return false;
    }
    
    // Check resource
    if (permission.resource !== '*' && permission.resource !== action.target) {
      return false;
    }
    
    // Check conditions
    if (permission.conditions) {
      for (const condition of permission.conditions) {
        const value = action.parameters[condition.field];
        if (!this.evaluateCondition(value, condition)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Evaluate a permission condition
   */
  private evaluateCondition(value: any, condition: PermissionCondition): boolean {
    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gt': return value > condition.value;
      case 'lt': return value < condition.value;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      case 'contains': return String(value).includes(String(condition.value));
      default: return false;
    }
  }
  
  /**
   * Check rate limits
   */
  private checkRateLimits(action: AIAction): boolean {
    const currentMinute = Math.floor(Date.now() / 60000);
    const key = `${action.type}:${currentMinute}`;
    const count = this.actionCount.get(key) || 0;
    
    return count < this.contract.limits.maxActionsPerMinute;
  }
  
  /**
   * Check specific conditions for action
   */
  private checkConditions(action: AIAction): { passed: boolean; reason: string } {
    // Check concurrent actions limit
    const activeActions = Array.from(this.pendingApprovals.values()).length;
    if (activeActions >= this.contract.limits.maxConcurrentActions) {
      return {
        passed: false,
        reason: `Maximum concurrent actions (${this.contract.limits.maxConcurrentActions}) reached`
      };
    }
    
    return { passed: true, reason: '' };
  }
  
  /**
   * Increment action count for rate limiting
   */
  private incrementActionCount(actionType: string): void {
    const currentMinute = Math.floor(Date.now() / 60000);
    const key = `${actionType}:${currentMinute}`;
    const count = this.actionCount.get(key) || 0;
    this.actionCount.set(key, count + 1);
    
    // Clean up old entries
    for (const [k] of this.actionCount) {
      const [, minute] = k.split(':');
      if (parseInt(minute) < currentMinute - 5) {
        this.actionCount.delete(k);
      }
    }
  }
  
  /**
   * Create approval request
   */
  private createApprovalRequest(action: AIAction): ApprovalRequest {
    return {
      id: `approval_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      action,
      requiredApprovers: this.contract.escalationProtocol.defaultEscalationPath,
      expiresAt: new Date(Date.now() + this.contract.negotiationProtocol.timeoutSeconds * 1000),
      priority: this.determinePriority(action),
      context: `AI requests approval for: ${action.type} on ${action.target}`
    };
  }
  
  /**
   * Determine action priority
   */
  private determinePriority(action: AIAction): ApprovalRequest['priority'] {
    // Find matching permission to determine risk level
    const permission = this.contract.requiresApproval.find(p => 
      this.matchesPermission(action, p)
    );
    
    switch (permission?.riskLevel) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'normal';
      default: return 'low';
    }
  }
  
  /**
   * Generate clarifying questions
   */
  private async generateClarifyingQuestions(action: AIAction): Promise<ClarificationQuestion[]> {
    const questions: ClarificationQuestion[] = [];
    
    // Based on uncertainties
    for (const uncertainty of action.uncertainties || []) {
      if (uncertainty.level === 'high') {
        questions.push({
          id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          question: `Please clarify: ${uncertainty.reason}`,
          type: uncertainty.possibleValues ? 'choice' : 'text',
          options: uncertainty.possibleValues?.map(String),
          required: true
        });
      }
    }
    
    // Generic confidence question
    if (questions.length === 0) {
      questions.push({
        id: `q_${Date.now()}`,
        question: `The AI is not confident about this action. Would you like to proceed anyway?`,
        type: 'confirmation',
        required: true
      });
    }
    
    return questions;
  }
  
  /**
   * Suggest alternative actions
   */
  private async suggestAlternatives(action: AIAction): Promise<AIAction[]> {
    // If the action has alternatives, return them
    if (action.alternatives && action.alternatives.length > 0) {
      return action.alternatives.filter(alt => 
        !this.isProhibited(alt) && 
        alt.confidence >= this.contract.uncertaintyProtocol.confidenceThreshold
      );
    }
    
    // Otherwise, return empty (could implement suggestion logic)
    return [];
  }
  
  /**
   * Process approval decision
   */
  async processApproval(
    approvalId: string, 
    approved: boolean, 
    approver: string,
    comments?: string
  ): Promise<{ success: boolean; action?: AIAction }> {
    const request = this.pendingApprovals.get(approvalId);
    if (!request) {
      return { success: false };
    }
    
    this.pendingApprovals.delete(approvalId);
    
    // Log the decision
    this.auditLog.push({
      timestamp: new Date(),
      action: request.action,
      decision: approved ? 'allowed' : 'denied',
      reason: approved 
        ? `Approved by ${approver}` 
        : `Rejected by ${approver}: ${comments || 'No reason provided'}`,
      contractVersion: this.contract.version,
      evaluationDetails: { approver, comments }
    });
    
    return {
      success: true,
      action: approved ? request.action : undefined
    };
  }
  
  /**
   * Get audit log
   */
  getAuditLog(limit?: number): AuditEntry[] {
    const entries = [...this.auditLog].reverse();
    return limit ? entries.slice(0, limit) : entries;
  }
  
  /**
   * Get pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }
}

// ============================================================================
// DEFAULT CONTRACT
// ============================================================================

export const DEFAULT_AI_CONTRACT: AIContract = {
  id: 'reclapp-default-v1',
  name: 'Reclapp Default AI Contract',
  version: '1.0.0',
  
  canAutonomously: [
    { action: 'generate_dsl', resource: '*', riskLevel: 'low' },
    { action: 'query_data', resource: '*', riskLevel: 'low' },
    { action: 'update_dashboard', resource: '*', riskLevel: 'low' },
    { 
      action: 'create_alert', 
      resource: '*', 
      riskLevel: 'medium',
      conditions: [{ field: 'severity', operator: 'lt', value: 'high' }]
    }
  ],
  
  requiresApproval: [
    { action: 'modify_entity', resource: '*', riskLevel: 'medium' },
    { action: 'execute_pipeline', resource: '*', riskLevel: 'medium' },
    { action: 'send_notification', resource: '*', riskLevel: 'medium' },
    { 
      action: 'create_alert', 
      resource: '*', 
      riskLevel: 'high',
      conditions: [{ field: 'severity', operator: 'in', value: ['high', 'critical'] }]
    },
    { action: 'access_external', resource: '*', riskLevel: 'high' },
    { action: 'modify_workflow', resource: '*', riskLevel: 'high' }
  ],
  
  cannot: [
    { action: 'delete_resource', resource: 'audit_logs', riskLevel: 'critical' },
    { action: '*', resource: 'payment_systems', riskLevel: 'critical' },
    { action: '*', resource: 'security_settings', riskLevel: 'critical' }
  ],
  
  uncertaintyProtocol: {
    confidenceThreshold: 0.7,
    belowThreshold: {
      action: 'provide_alternatives',
      maxAlternatives: 3
    },
    missingData: {
      action: 'list_requirements',
      markAsUncertain: true
    }
  },
  
  negotiationProtocol: {
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
    timeoutSeconds: 3600 // 1 hour
  },
  
  escalationProtocol: {
    triggers: [
      { condition: 'criticalAnomaly', severity: 'critical', escalateTo: 'admin' },
      { condition: 'repeatedFailure', severity: 'high', escalateTo: 'supervisor', timeoutMinutes: 30 }
    ],
    defaultEscalationPath: ['supervisor', 'admin'],
    notificationChannels: ['email', 'slack']
  },
  
  limits: {
    maxActionsPerMinute: 60,
    maxResourcesPerAction: 100,
    maxConcurrentActions: 10,
    dailyActionBudget: 10000
  },
  
  auditRequirements: [
    { action: '*', logLevel: 'standard', retentionDays: 90, alertOnAnomaly: true },
    { action: 'delete_resource', logLevel: 'full', retentionDays: 365, alertOnAnomaly: true },
    { action: 'access_external', logLevel: 'detailed', retentionDays: 180, alertOnAnomaly: true }
  ]
};

// ============================================================================
// EXPORTS
// ============================================================================

export function createContractEnforcer(contract?: AIContract): AIContractEnforcer {
  return new AIContractEnforcer(contract || DEFAULT_AI_CONTRACT);
}
