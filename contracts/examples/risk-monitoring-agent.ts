/**
 * Risk Monitoring Agent - AI Contract Example
 * 
 * This is a complete, production-ready AI Contract for a B2B risk
 * monitoring agent. It demonstrates all features of the TypeScript DSL:
 * - Entity definitions with causal influences
 * - Interventions with confidence and sandbox
 * - Workflow with safety rails
 * - Verification and learning configuration
 * - Permissions and enforcement
 * 
 * @version 1.0.0
 */

import {
  AgentContract,
  Entity,
  Workflow,
  Verification,
  Permission,
  SafetyRails,
  createEntity,
  createWorkflow,
  createVerification,
  defineContract,
  DEFAULT_SAFETY_RAILS,
  DEFAULT_ENFORCEMENT,
  DEFAULT_RATE_LIMITS,
  DEFAULT_UNCERTAINTY_PROTOCOL,
  DEFAULT_NEGOTIATION_PROTOCOL
} from './types';

// ============================================================================
// ENTITY DEFINITIONS
// ============================================================================

const CustomerEntity: Entity = createEntity({
  name: 'Customer',
  description: 'B2B customer with risk scoring and credit management',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'name', type: 'string', required: true },
    { name: 'nip', type: 'string', required: true, unique: true, pattern: '[0-9]{10}' },
    { name: 'segment', type: 'string', enum: ['enterprise', 'sme', 'startup'] },
    { name: 'riskScore', type: 'number', min: 0, max: 100, default: 50 },
    { name: 'creditLimit', type: 'money', min: 0 },
    { name: 'status', type: 'string', enum: ['pending', 'active', 'suspended', 'churned'] }
  ],
  causalInfluences: [
    {
      field: 'financialHealth.profitMargin',
      weight: -0.3,
      decay: 0.01,
      mechanism: 'Higher profit margin indicates financial stability, reducing risk'
    },
    {
      field: 'paymentHistory.avgDelayDays',
      weight: 0.4,
      decay: 0.02,
      mechanism: 'Payment delays are strong indicators of cash flow problems'
    },
    {
      field: 'marketConditions.sectorRisk',
      weight: 0.2,
      decay: 0.005,
      mechanism: 'Industry-wide risk affects all entities in sector'
    },
    {
      field: 'legalStatus.activeCases',
      weight: 0.35,
      decay: 0.03,
      mechanism: 'Legal issues indicate operational or financial problems'
    },
    {
      field: 'boardStability.recentChanges',
      weight: 0.15,
      decay: 0.02,
      mechanism: 'Management instability can signal internal issues',
      conditions: [{ field: 'segment', operator: 'eq', value: 'enterprise' }]
    }
  ],
  interventions: [
    {
      name: 'improvePaymentTerms',
      description: 'Shorten payment terms to reduce exposure',
      adjust: { paymentTerms: 14 },
      expectedEffect: { riskScore: -10 },
      confidence: 0.75,
      sandbox: true,
      cost: 100,
      cooldownMs: 86400000, // 24 hours
      prerequisites: ['status == "active"'],
      contraindications: ['creditLimit < 10000']
    },
    {
      name: 'requireBankGuarantee',
      description: 'Request bank guarantee for high-risk customers',
      adjust: { requiresGuarantee: true, guaranteeAmount: 'creditLimit * 0.3' },
      expectedEffect: { riskScore: -25 },
      confidence: 0.9,
      sandbox: false, // High confidence, no sandbox needed
      cost: 500,
      prerequisites: ['riskScore > 60'],
      contraindications: ['segment == "startup"']
    },
    {
      name: 'reduceCreditLimit',
      description: 'Reduce credit limit to limit exposure',
      adjust: { creditLimit: 'creditLimit * 0.7' },
      expectedEffect: { riskScore: -15, customerSatisfaction: -10 },
      confidence: 0.85,
      sandbox: true,
      cooldownMs: 604800000, // 7 days
      maxApplications: 3
    },
    {
      name: 'increasedMonitoring',
      description: 'Enable more frequent risk assessment',
      adjust: { monitoringFrequency: 'daily', alertThreshold: 70 },
      expectedEffect: { riskScore: -5, detectionSpeed: 20 },
      confidence: 0.95,
      sandbox: false,
      cost: 50
    }
  ]
});

const ContractorEntity: Entity = createEntity({
  name: 'Contractor',
  description: 'Supplier/vendor with performance and risk tracking',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'name', type: 'string', required: true },
    { name: 'category', type: 'string' },
    { name: 'rating', type: 'number', min: 0, max: 10 },
    { name: 'riskScore', type: 'number', min: 0, max: 100, default: 50 },
    { name: 'totalOrderValue', type: 'money' },
    { name: 'status', type: 'string', enum: ['active', 'suspended', 'blacklisted'] }
  ],
  causalInfluences: [
    { field: 'financialHealth.revenue', weight: -0.25, decay: 0.01 },
    { field: 'deliveryPerformance.onTimeRate', weight: -0.3, decay: 0.015 },
    { field: 'qualityMetrics.defectRate', weight: 0.35, decay: 0.02 }
  ],
  interventions: [
    {
      name: 'reduceOrderVolume',
      description: 'Gradually reduce order volume from risky supplier',
      adjust: { maxOrderVolume: 'totalOrderValue * 0.5' },
      expectedEffect: { riskScore: -20, supplyChainRisk: 10 },
      confidence: 0.7,
      sandbox: true
    }
  ]
});

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

const RiskMonitoringWorkflow: Workflow = createWorkflow({
  name: 'MonitorRisk',
  steps: [
    {
      id: 'fetch_data',
      type: 'fetch_data',
      name: 'Fetch External Data',
      description: 'Retrieve financial and legal data from external sources',
      config: {
        sources: ['krs_api', 'ceidg_api', 'financial_data_provider'],
        timeout: 30000
      },
      onSuccess: 'compute_risk',
      onFailure: 'log_error',
      timeout: 60000,
      retries: 3
    },
    {
      id: 'compute_risk',
      type: 'compute',
      name: 'Compute Risk Score',
      description: 'Calculate risk score based on causal model',
      config: {
        algorithm: 'causal_weighted_sum',
        applyDecay: true
      },
      onSuccess: 'evaluate_interventions',
      onFailure: 'log_error'
    },
    {
      id: 'evaluate_interventions',
      type: 'decision',
      name: 'Evaluate Interventions',
      description: 'Determine if interventions are needed',
      config: {
        thresholds: {
          high_risk: 80,
          medium_risk: 60,
          low_risk: 40
        }
      },
      conditions: [
        { expression: 'riskScore > 60', description: 'Trigger intervention evaluation for medium+ risk' }
      ],
      onSuccess: 'apply_intervention',
      onFailure: 'log_and_continue'
    },
    {
      id: 'apply_intervention',
      type: 'apply_intervention',
      name: 'Apply Intervention',
      description: 'Execute selected intervention (sandbox or production)',
      config: {
        preferSandbox: true,
        requireVerification: true
      },
      onSuccess: 'verify_outcome',
      onFailure: 'rollback'
    },
    {
      id: 'verify_outcome',
      type: 'verify',
      name: 'Verify Outcome',
      description: 'Compare predicted vs actual effects',
      config: {
        waitPeriod: 86400000, // 24 hours
        metrics: ['riskScore', 'financialHealth']
      },
      onSuccess: 'log_success',
      onFailure: 'flag_anomaly'
    },
    {
      id: 'log_success',
      type: 'log',
      name: 'Log Success',
      config: { level: 'info', includeMetrics: true }
    },
    {
      id: 'log_error',
      type: 'log',
      name: 'Log Error',
      config: { level: 'error', alertTeam: true }
    },
    {
      id: 'log_and_continue',
      type: 'log',
      name: 'Log and Continue',
      config: { level: 'warn' },
      onSuccess: 'log_success'
    },
    {
      id: 'rollback',
      type: 'custom',
      name: 'Rollback Changes',
      config: { action: 'rollback_last_intervention' },
      onSuccess: 'log_error'
    },
    {
      id: 'flag_anomaly',
      type: 'notify',
      name: 'Flag Anomaly',
      config: {
        channels: ['slack', 'email'],
        priority: 'high',
        escalate: true
      },
      onSuccess: 'log_error'
    }
  ],
  safety: {
    ...DEFAULT_SAFETY_RAILS,
    maxAdjustmentPerCycle: 0.1,
    rollbackOnAnomaly: true,
    sandboxExperimental: true,
    anomalyThreshold: 0.3,
    freezeOnCriticalAnomaly: true
  },
  schedule: '0 6 * * *' // Daily at 6 AM
});

// ============================================================================
// VERIFICATION CONFIGURATION
// ============================================================================

const RiskVerification: Verification = createVerification({
  metrics: [
    {
      name: 'riskScore_accuracy',
      description: 'Predicted vs actual risk score deviation',
      formula: 'abs(predicted_riskScore - actual_riskScore) / predicted_riskScore',
      threshold: 0.1,
      direction: 'lower_better'
    },
    {
      name: 'intervention_effectiveness',
      description: 'Success rate of interventions',
      formula: 'successful_interventions / total_interventions',
      threshold: 0.7,
      direction: 'higher_better'
    },
    {
      name: 'false_positive_rate',
      description: 'Rate of incorrect high-risk classifications',
      formula: 'false_positives / (false_positives + true_negatives)',
      threshold: 0.1,
      direction: 'lower_better'
    },
    {
      name: 'detection_speed',
      description: 'Average days to detect risk increase',
      formula: 'avg(detection_delay_days)',
      threshold: 7,
      target: 3,
      direction: 'lower_better'
    }
  ],
  thresholds: {
    anomalyDetection: 0.05,
    intentMatch: 0.7,
    causalValidity: 0.6,
    confidenceDecay: true,
    confidenceDecayRate: 0.01,
    minConfidence: 0.3,
    maxConfidence: 0.95
  },
  learningConfig: {
    enabled: true,
    minObservations: 50,
    learningRate: 0.05,
    lockedBeforeApproval: true,
    batchSize: 100,
    validationSplit: 0.2
  }
});

// ============================================================================
// PERMISSIONS
// ============================================================================

const AutonomousPermissions: Permission[] = [
  {
    action: 'query_data',
    resources: ['customers', 'contractors', 'riskEvents', 'financialData'],
    riskLevel: 'low'
  },
  {
    action: 'generate_dsl',
    resources: ['*'],
    riskLevel: 'low'
  },
  {
    action: 'update_dashboard',
    resources: ['risk_dashboard', 'monitoring_dashboard'],
    riskLevel: 'low'
  },
  {
    action: 'create_alert',
    resources: ['*'],
    conditions: [{ field: 'severity', operator: 'in', value: ['low', 'medium'] }],
    riskLevel: 'medium'
  },
  {
    action: 'apply_intervention',
    resources: ['*'],
    conditions: [
      { field: 'sandbox', operator: 'eq', value: true },
      { field: 'confidence', operator: 'gte', value: 0.8 }
    ],
    riskLevel: 'medium'
  }
];

const ApprovalRequiredPermissions: Permission[] = [
  {
    action: 'modify_entity',
    resources: ['customers', 'contractors'],
    riskLevel: 'high'
  },
  {
    action: 'apply_intervention',
    resources: ['*'],
    conditions: [{ field: 'sandbox', operator: 'eq', value: false }],
    riskLevel: 'high'
  },
  {
    action: 'create_alert',
    resources: ['*'],
    conditions: [{ field: 'severity', operator: 'in', value: ['high', 'critical'] }],
    riskLevel: 'high'
  },
  {
    action: 'send_notification',
    resources: ['*'],
    riskLevel: 'medium'
  },
  {
    action: 'access_external',
    resources: ['*'],
    riskLevel: 'high'
  }
];

const ProhibitedPermissions: Permission[] = [
  {
    action: '*',
    resources: ['payment_systems', 'banking_api'],
    riskLevel: 'critical'
  },
  {
    action: '*',
    resources: ['security_settings', 'user_credentials'],
    riskLevel: 'critical'
  },
  {
    action: 'delete_resource',
    resources: ['audit_logs', 'compliance_records'],
    riskLevel: 'critical'
  }
];

// ============================================================================
// COMPLETE CONTRACT DEFINITION
// ============================================================================

export const RiskMonitoringAgent: AgentContract = {
  // Metadata
  name: 'RiskMonitoringAgent',
  version: '1.0.0',
  description: 'Autonomous B2B risk monitoring agent with causal reasoning, safety rails, and continuous learning',
  author: 'Softreck',
  created: new Date('2024-12-31'),
  updated: new Date('2024-12-31'),

  // Domain Model
  entities: [CustomerEntity, ContractorEntity],

  // Execution
  workflow: RiskMonitoringWorkflow,

  // Permissions
  canAutonomously: AutonomousPermissions,
  requiresApproval: ApprovalRequiredPermissions,
  prohibited: ProhibitedPermissions,

  // Protocols
  uncertaintyProtocol: {
    ...DEFAULT_UNCERTAINTY_PROTOCOL,
    confidenceThreshold: 0.7,
    onLowConfidence: {
      askForClarification: true,
      provideAlternatives: true,
      maxAlternatives: 3,
      escalateAfterAttempts: 2
    }
  },
  negotiationProtocol: {
    ...DEFAULT_NEGOTIATION_PROTOCOL,
    maxIterations: 3,
    timeoutSeconds: 3600
  },

  // Verification & Learning
  verification: RiskVerification,

  // Enforcement & Safety
  enforcement: {
    ...DEFAULT_ENFORCEMENT,
    logAllDecisions: true,
    overrideRequiresApproval: true,
    feedbackLockedBeforeLearning: true,
    causalVerificationRequired: true,
    auditRetentionDays: 365,
    alertOnViolation: true,
    freezeOnRepeatedViolations: true,
    maxViolationsBeforeFreeze: 3
  },
  rateLimits: {
    ...DEFAULT_RATE_LIMITS,
    actionsPerMinute: 30,
    actionsPerHour: 500,
    concurrentActions: 5
  }
};

// ============================================================================
// ALTERNATIVE: FLUENT BUILDER SYNTAX
// ============================================================================

export const RiskMonitoringAgentFluent = defineContract('RiskMonitoringAgentFluent', '1.0.0')
  .description('Fluent API example of risk monitoring agent')
  .author('Softreck')
  .addEntity(CustomerEntity)
  .addEntity(ContractorEntity)
  .workflow(RiskMonitoringWorkflow)
  .verification(RiskVerification)
  .canDo({ action: 'query_data', resources: ['*'], riskLevel: 'low' })
  .canDo({ action: 'update_dashboard', resources: ['*'], riskLevel: 'low' })
  .needsApproval({ action: 'modify_entity', resources: ['*'], riskLevel: 'high' })
  .cannotDo({ action: '*', resources: ['payment_systems'], riskLevel: 'critical' })
  .safetyRails({ maxAdjustmentPerCycle: 0.1, rollbackOnAnomaly: true })
  .enforcement({ logAllDecisions: true, causalVerificationRequired: true })
  .rateLimits({ actionsPerMinute: 30 })
  .build();

// ============================================================================
// EXPORTS
// ============================================================================

export default RiskMonitoringAgent;

// Re-export entities for testing
export { CustomerEntity, ContractorEntity, RiskMonitoringWorkflow, RiskVerification };
