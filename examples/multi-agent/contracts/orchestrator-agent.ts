/**
 * Multi-Agent Orchestrator Contract
 * 
 * Kontrakt dla agenta orkiestrującego pracę innych agentów.
 * Koordynuje zadania, rozwiązuje konflikty i agreguje wyniki.
 */

import {
  AgentContract,
  Entity,
  Workflow,
  Permission,
  defineContract,
  createEntity,
  createWorkflow,
  createVerification,
  DEFAULT_SAFETY_RAILS,
  DEFAULT_ENFORCEMENT
} from '@reclapp/contracts';

// ============================================================================
// ENTITY DEFINITIONS
// ============================================================================

export const TaskEntity = createEntity({
  name: 'Task',
  description: 'Orchestration task to be distributed to agents',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'type', type: 'string', required: true },
    { name: 'priority', type: 'number', min: 1, max: 10, default: 5 },
    { name: 'status', type: 'string', enum: ['pending', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled'] },
    { name: 'assignedAgents', type: 'json', default: [] },
    { name: 'payload', type: 'json', required: true },
    { name: 'results', type: 'json' },
    { name: 'createdAt', type: 'datetime' },
    { name: 'completedAt', type: 'datetime' },
    { name: 'deadline', type: 'datetime' }
  ],
  causalInfluences: [],
  interventions: []
});

export const AgentEntity = createEntity({
  name: 'Agent',
  description: 'Registered agent in the orchestration system',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'name', type: 'string', required: true, unique: true },
    { name: 'role', type: 'string', required: true },
    { name: 'capabilities', type: 'json', default: [] },
    { name: 'status', type: 'string', enum: ['online', 'offline', 'busy', 'error'] },
    { name: 'currentLoad', type: 'number', min: 0, max: 100, default: 0 },
    { name: 'successRate', type: 'number', min: 0, max: 100, default: 100 },
    { name: 'avgResponseTime', type: 'number', default: 0 },
    { name: 'lastHeartbeat', type: 'datetime' },
    { name: 'endpoint', type: 'string', required: true }
  ],
  causalInfluences: [
    { field: 'currentLoad', weight: 0.3, decay: 0.1, mechanism: 'High load reduces response quality' },
    { field: 'successRate', weight: -0.4, decay: 0.05, mechanism: 'Success rate indicates reliability' }
  ],
  interventions: [
    {
      name: 'reduceLoad',
      description: 'Redirect tasks to other agents',
      adjust: { taskRedirection: true },
      expectedEffect: { currentLoad: -30, responseTime: -20 },
      confidence: 0.8,
      sandbox: false
    },
    {
      name: 'restartAgent',
      description: 'Restart the agent service',
      adjust: { restart: true },
      expectedEffect: { status: 'online', errorRate: -50 },
      confidence: 0.7,
      sandbox: false,
      cooldownMs: 300000
    }
  ]
});

export const ConflictEntity = createEntity({
  name: 'Conflict',
  description: 'Conflict between agent recommendations',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'taskId', type: 'uuid', required: true },
    { name: 'conflictType', type: 'string', enum: ['recommendation', 'resource', 'priority', 'data'] },
    { name: 'agents', type: 'json', required: true },
    { name: 'recommendations', type: 'json', required: true },
    { name: 'resolution', type: 'string', enum: ['pending', 'voting', 'priority', 'human', 'merged'] },
    { name: 'resolvedValue', type: 'json' },
    { name: 'resolvedBy', type: 'string' },
    { name: 'createdAt', type: 'datetime' },
    { name: 'resolvedAt', type: 'datetime' }
  ],
  causalInfluences: [],
  interventions: []
});

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export const OrchestrationWorkflow: Workflow = createWorkflow({
  name: 'TaskOrchestration',
  steps: [
    // Stage 1: Task Reception
    {
      id: 'receive_task',
      type: 'fetch_data',
      name: 'Receive Task',
      config: { source: 'api', queue: 'tasks' },
      onSuccess: 'analyze_task',
      onFailure: 'log_error',
      timeout: 5000
    },
    {
      id: 'analyze_task',
      type: 'compute',
      name: 'Analyze Task Requirements',
      config: { extractCapabilities: true, estimateComplexity: true },
      onSuccess: 'select_agents',
      onFailure: 'log_error'
    },
    
    // Stage 2: Agent Selection
    {
      id: 'select_agents',
      type: 'decision',
      name: 'Select Appropriate Agents',
      config: {
        strategy: 'capability_match',
        loadBalancing: true,
        minAgents: 1,
        maxAgents: 3
      },
      onSuccess: 'distribute_task',
      onFailure: 'queue_task'
    },
    {
      id: 'distribute_task',
      type: 'custom',
      name: 'Distribute Task to Agents',
      config: { parallel: true, timeout: 30000 },
      onSuccess: 'wait_results',
      onFailure: 'handle_distribution_error'
    },
    
    // Stage 3: Result Collection
    {
      id: 'wait_results',
      type: 'custom',
      name: 'Wait for Agent Results',
      config: { timeout: 60000, minResponses: 1 },
      onSuccess: 'check_conflicts',
      onFailure: 'handle_timeout'
    },
    {
      id: 'check_conflicts',
      type: 'decision',
      name: 'Check for Conflicts',
      conditions: [
        { expression: 'hasConflictingRecommendations', description: 'Agents disagree' }
      ],
      onSuccess: 'resolve_conflicts',
      onFailure: 'aggregate_results'
    },
    
    // Stage 4: Conflict Resolution
    {
      id: 'resolve_conflicts',
      type: 'decision',
      name: 'Resolve Conflicts',
      config: {
        strategy: 'weighted_voting',
        weights: { successRate: 0.4, confidence: 0.3, specialization: 0.3 },
        escalateThreshold: 0.5
      },
      onSuccess: 'aggregate_results',
      onFailure: 'escalate_to_human'
    },
    
    // Stage 5: Result Aggregation
    {
      id: 'aggregate_results',
      type: 'compute',
      name: 'Aggregate Results',
      config: { mergeStrategy: 'combine', deduplication: true },
      onSuccess: 'validate_result',
      onFailure: 'log_error'
    },
    {
      id: 'validate_result',
      type: 'verify',
      name: 'Validate Final Result',
      config: { schema: 'task_result', checkCompleteness: true },
      onSuccess: 'complete_task',
      onFailure: 'retry_task'
    },
    
    // Stage 6: Completion
    {
      id: 'complete_task',
      type: 'custom',
      name: 'Complete Task',
      config: { notifyRequester: true, updateMetrics: true },
      onSuccess: 'log_success'
    },
    
    // Error Handling
    {
      id: 'queue_task',
      type: 'custom',
      name: 'Queue Task for Later',
      config: { queue: 'pending_tasks', retryDelay: 60000 },
      onSuccess: 'log_queued'
    },
    {
      id: 'handle_distribution_error',
      type: 'decision',
      name: 'Handle Distribution Error',
      config: { retryCount: 3 },
      onSuccess: 'distribute_task',
      onFailure: 'escalate_to_human'
    },
    {
      id: 'handle_timeout',
      type: 'decision',
      name: 'Handle Timeout',
      config: { partialResults: true },
      onSuccess: 'aggregate_results',
      onFailure: 'escalate_to_human'
    },
    {
      id: 'retry_task',
      type: 'decision',
      name: 'Retry Task',
      config: { maxRetries: 2 },
      onSuccess: 'select_agents',
      onFailure: 'fail_task'
    },
    {
      id: 'escalate_to_human',
      type: 'notify',
      name: 'Escalate to Human',
      config: { channels: ['slack', 'email'], priority: 'high' },
      onSuccess: 'log_escalation'
    },
    {
      id: 'fail_task',
      type: 'custom',
      name: 'Mark Task as Failed',
      config: { notifyRequester: true, logReason: true },
      onSuccess: 'log_failure'
    },
    
    // Logging
    {
      id: 'log_success',
      type: 'log',
      name: 'Log Success',
      config: { level: 'info', includeMetrics: true }
    },
    {
      id: 'log_queued',
      type: 'log',
      name: 'Log Queued',
      config: { level: 'info' }
    },
    {
      id: 'log_escalation',
      type: 'log',
      name: 'Log Escalation',
      config: { level: 'warn' }
    },
    {
      id: 'log_failure',
      type: 'log',
      name: 'Log Failure',
      config: { level: 'error' }
    },
    {
      id: 'log_error',
      type: 'log',
      name: 'Log Error',
      config: { level: 'error', alertOps: true }
    }
  ],
  safety: {
    ...DEFAULT_SAFETY_RAILS,
    maxAdjustmentPerCycle: 0.1,
    rollbackOnAnomaly: true,
    maxIterations: 10
  }
});

// ============================================================================
// VERIFICATION
// ============================================================================

const OrchestratorVerification = createVerification({
  metrics: [
    { name: 'task_completion_rate', description: 'Rate of successfully completed tasks', threshold: 0.95, direction: 'higher_better' },
    { name: 'avg_task_duration', description: 'Average task completion time (ms)', threshold: 30000, direction: 'lower_better' },
    { name: 'conflict_resolution_rate', description: 'Rate of automatically resolved conflicts', threshold: 0.80, direction: 'higher_better' },
    { name: 'agent_utilization', description: 'Average agent utilization', threshold: 0.70, target: 0.75, direction: 'target' }
  ],
  thresholds: {
    anomalyDetection: 0.15,
    intentMatch: 0.80,
    causalValidity: 0.70,
    confidenceDecay: true,
    confidenceDecayRate: 0.01,
    minConfidence: 0.50,
    maxConfidence: 0.95
  },
  learningConfig: {
    enabled: true,
    minObservations: 100,
    learningRate: 0.05,
    lockedBeforeApproval: true,
    batchSize: 50,
    validationSplit: 0.2
  }
});

// ============================================================================
// PERMISSIONS
// ============================================================================

const OrchestratorPermissions: Permission[] = [
  { action: 'query_data', resources: ['tasks', 'agents', 'conflicts'], riskLevel: 'low' },
  { action: 'modify_entity', resources: ['tasks'], riskLevel: 'medium' },
  { action: 'send_notification', resources: ['agents'], riskLevel: 'low' },
  { action: 'create_alert', resources: ['*'], conditions: [{ field: 'severity', operator: 'ne', value: 'critical' }], riskLevel: 'medium' }
];

const OrchestratorApprovalRequired: Permission[] = [
  { action: 'modify_entity', resources: ['agents'], riskLevel: 'high' },
  { action: 'apply_intervention', resources: ['agents'], riskLevel: 'high' },
  { action: 'create_alert', resources: ['*'], conditions: [{ field: 'severity', operator: 'eq', value: 'critical' }], riskLevel: 'high' }
];

const OrchestratorProhibited: Permission[] = [
  { action: '*', resources: ['security_config', 'api_keys'], riskLevel: 'critical' },
  { action: 'delete_resource', resources: ['audit_logs', 'agents'], riskLevel: 'critical' }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const OrchestratorAgent: AgentContract = {
  name: 'OrchestratorAgent',
  version: '1.0.0',
  description: 'Multi-agent orchestrator that coordinates task distribution, conflict resolution, and result aggregation',
  author: 'Softreck',
  created: new Date(),
  updated: new Date(),
  
  entities: [TaskEntity, AgentEntity, ConflictEntity],
  workflow: OrchestrationWorkflow,
  
  canAutonomously: OrchestratorPermissions,
  requiresApproval: OrchestratorApprovalRequired,
  prohibited: OrchestratorProhibited,
  
  uncertaintyProtocol: {
    confidenceThreshold: 0.75,
    onLowConfidence: {
      askForClarification: true,
      provideAlternatives: true,
      maxAlternatives: 3,
      escalateAfterAttempts: 2
    },
    onMissingData: {
      listRequirements: true,
      suggestSources: true,
      proceedWithAssumptions: false,
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
    timeoutSeconds: 300
  },
  
  verification: OrchestratorVerification,
  
  enforcement: {
    ...DEFAULT_ENFORCEMENT,
    auditRetentionDays: 365,
    maxViolationsBeforeFreeze: 5
  },
  
  rateLimits: {
    actionsPerMinute: 200,
    actionsPerHour: 5000,
    actionsPerDay: 50000,
    concurrentActions: 50
  }
};

export default OrchestratorAgent;
