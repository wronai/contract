/**
 * B2B Risk Monitoring Agent Contract
 * 
 * Kompletny kontrakt dla autonomicznego agenta monitorującego ryzyko
 * kontrahentów B2B z integracją causal reasoning i safety rails.
 */

import {
  AgentContract,
  Entity,
  Workflow,
  Verification,
  Permission,
  defineContract,
  createEntity,
  createWorkflow,
  createVerification,
  DEFAULT_SAFETY_RAILS,
  DEFAULT_ENFORCEMENT,
  DEFAULT_UNCERTAINTY_PROTOCOL,
  DEFAULT_NEGOTIATION_PROTOCOL
} from '@reclapp/contracts';

// ============================================================================
// ENTITY DEFINITIONS
// ============================================================================

export const CustomerEntity: Entity = createEntity({
  name: 'Customer',
  description: 'B2B customer with risk scoring and credit management',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'nip', type: 'string', required: true, unique: true, pattern: '^[0-9]{10}$' },
    { name: 'name', type: 'string', required: true },
    { name: 'segment', type: 'string', enum: ['enterprise', 'sme', 'startup', 'micro'] },
    { name: 'riskScore', type: 'number', min: 0, max: 100, default: 50 },
    { name: 'creditLimit', type: 'money', min: 0 },
    { name: 'paymentTerms', type: 'number', min: 7, max: 90, default: 30 },
    { name: 'status', type: 'string', enum: ['pending', 'active', 'suspended', 'churned'] },
    { name: 'monitoringLevel', type: 'string', enum: ['standard', 'enhanced', 'intensive'], default: 'standard' },
    { name: 'lastAssessment', type: 'datetime' }
  ],
  causalInfluences: [
    {
      field: 'financialHealth.profitMargin',
      weight: -0.30,
      decay: 0.01,
      mechanism: 'Higher profit margin indicates financial stability, reducing risk'
    },
    {
      field: 'financialHealth.currentRatio',
      weight: -0.20,
      decay: 0.01,
      mechanism: 'Higher current ratio indicates better liquidity'
    },
    {
      field: 'paymentHistory.avgDelayDays',
      weight: 0.40,
      decay: 0.02,
      mechanism: 'Payment delays are strong indicators of cash flow problems'
    },
    {
      field: 'paymentHistory.overdueCount',
      weight: 0.25,
      decay: 0.015,
      mechanism: 'Number of overdue invoices correlates with risk'
    },
    {
      field: 'marketConditions.sectorRisk',
      weight: 0.15,
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
      weight: 0.10,
      decay: 0.02,
      mechanism: 'Management instability can signal internal issues',
      conditions: [{ field: 'segment', operator: 'in', value: ['enterprise', 'sme'] }]
    },
    {
      field: 'externalRating.score',
      weight: -0.25,
      decay: 0.01,
      mechanism: 'External credit ratings provide independent assessment'
    }
  ],
  interventions: [
    {
      name: 'shortenPaymentTerms',
      description: 'Reduce payment terms to decrease exposure time',
      adjust: { paymentTerms: 14 },
      expectedEffect: { riskScore: -8, exposureRisk: -15 },
      confidence: 0.80,
      sandbox: true,
      cooldownMs: 604800000, // 7 days
      prerequisites: ['status == "active"', 'paymentTerms > 14'],
      contraindications: ['segment == "enterprise"']
    },
    {
      name: 'reduceCreditLimit',
      description: 'Lower credit limit to reduce potential loss',
      adjust: { creditLimitReduction: 0.3 },
      expectedEffect: { riskScore: -12, maxExposure: -30 },
      confidence: 0.85,
      sandbox: true,
      cooldownMs: 2592000000, // 30 days
      maxApplications: 3,
      prerequisites: ['riskScore > 50']
    },
    {
      name: 'requireBankGuarantee',
      description: 'Request bank guarantee for high-risk customers',
      adjust: { requiresGuarantee: true, guaranteePercentage: 30 },
      expectedEffect: { riskScore: -20, securedExposure: 30 },
      confidence: 0.90,
      sandbox: false,
      cost: 500,
      prerequisites: ['riskScore > 65', 'creditLimit > 50000']
    },
    {
      name: 'enableEnhancedMonitoring',
      description: 'Switch to more frequent monitoring',
      adjust: { monitoringLevel: 'enhanced', assessmentFrequency: 'weekly' },
      expectedEffect: { riskScore: -3, detectionSpeed: 50 },
      confidence: 0.95,
      sandbox: false,
      cost: 100
    },
    {
      name: 'enableIntensiveMonitoring',
      description: 'Maximum monitoring for critical cases',
      adjust: { monitoringLevel: 'intensive', assessmentFrequency: 'daily' },
      expectedEffect: { riskScore: -5, detectionSpeed: 80 },
      confidence: 0.95,
      sandbox: false,
      cost: 300,
      prerequisites: ['riskScore > 75']
    },
    {
      name: 'suspendAccount',
      description: 'Temporarily suspend account for review',
      adjust: { status: 'suspended' },
      expectedEffect: { newExposure: -100 },
      confidence: 0.99,
      sandbox: false,
      prerequisites: ['riskScore > 85']
    }
  ]
});

export const ContractorEntity: Entity = createEntity({
  name: 'Contractor',
  description: 'Supplier/vendor with performance tracking',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'name', type: 'string', required: true },
    { name: 'category', type: 'string' },
    { name: 'riskScore', type: 'number', min: 0, max: 100, default: 50 },
    { name: 'performanceRating', type: 'number', min: 0, max: 10 },
    { name: 'totalOrderValue', type: 'money' },
    { name: 'status', type: 'string', enum: ['active', 'probation', 'suspended', 'blacklisted'] }
  ],
  causalInfluences: [
    { field: 'financialHealth.revenue', weight: -0.25, decay: 0.01 },
    { field: 'deliveryPerformance.onTimeRate', weight: -0.35, decay: 0.015 },
    { field: 'qualityMetrics.defectRate', weight: 0.40, decay: 0.02 }
  ],
  interventions: [
    {
      name: 'reduceOrderVolume',
      description: 'Gradually reduce orders from risky supplier',
      adjust: { maxOrderReduction: 0.5 },
      expectedEffect: { riskScore: -15, supplyChainRisk: 5 },
      confidence: 0.75,
      sandbox: true
    }
  ]
});

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export const RiskMonitoringWorkflow: Workflow = createWorkflow({
  name: 'DailyRiskMonitoring',
  steps: [
    // Stage 1: Data Collection
    {
      id: 'fetch_financial',
      type: 'fetch_data',
      name: 'Fetch Financial Data',
      description: 'Retrieve financial data from external providers',
      config: {
        sources: ['krs_api', 'financial_data_provider', 'credit_bureau'],
        timeout: 30000,
        retryPolicy: 'exponential'
      },
      onSuccess: 'fetch_payment_history',
      onFailure: 'handle_fetch_error',
      timeout: 60000,
      retries: 3
    },
    {
      id: 'fetch_payment_history',
      type: 'fetch_data',
      name: 'Fetch Payment History',
      config: { source: 'internal_erp', lookbackDays: 365 },
      onSuccess: 'fetch_legal_status',
      onFailure: 'handle_fetch_error'
    },
    {
      id: 'fetch_legal_status',
      type: 'fetch_data',
      name: 'Fetch Legal Status',
      config: { source: 'krs_msig', checkTypes: ['bankruptcy', 'restructuring', 'litigation'] },
      onSuccess: 'compute_risk',
      onFailure: 'handle_fetch_error'
    },
    
    // Stage 2: Risk Computation
    {
      id: 'compute_risk',
      type: 'compute',
      name: 'Compute Risk Score',
      description: 'Calculate risk using causal model with decay',
      config: {
        algorithm: 'causal_weighted_sum',
        applyDecay: true,
        normalizeWeights: true
      },
      onSuccess: 'classify_risk',
      onFailure: 'log_error'
    },
    {
      id: 'classify_risk',
      type: 'decision',
      name: 'Classify Risk Level',
      config: {
        thresholds: {
          critical: 85,
          high: 70,
          medium: 50,
          low: 30
        }
      },
      conditions: [
        { expression: 'riskScore >= 85', description: 'Critical risk' },
        { expression: 'riskScore >= 70', description: 'High risk' },
        { expression: 'riskScore >= 50', description: 'Medium risk' }
      ],
      onSuccess: 'evaluate_interventions',
      onFailure: 'log_low_risk'
    },
    
    // Stage 3: Intervention Selection
    {
      id: 'evaluate_interventions',
      type: 'decision',
      name: 'Evaluate Possible Interventions',
      description: 'Select optimal intervention based on risk level and context',
      config: {
        strategy: 'cost_benefit_analysis',
        preferSandbox: true,
        maxInterventions: 2
      },
      onSuccess: 'apply_intervention',
      onFailure: 'escalate_to_human'
    },
    {
      id: 'apply_intervention',
      type: 'apply_intervention',
      name: 'Apply Selected Intervention',
      config: {
        requireVerification: true,
        notifyStakeholders: true
      },
      onSuccess: 'schedule_verification',
      onFailure: 'rollback_intervention'
    },
    
    // Stage 4: Verification Scheduling
    {
      id: 'schedule_verification',
      type: 'custom',
      name: 'Schedule Outcome Verification',
      config: {
        verificationDelay: 86400000, // 24h
        metrics: ['riskScore', 'paymentBehavior', 'exposureLevel']
      },
      onSuccess: 'send_notifications'
    },
    
    // Stage 5: Notifications
    {
      id: 'send_notifications',
      type: 'notify',
      name: 'Send Notifications',
      config: {
        channels: ['email', 'slack', 'dashboard'],
        template: 'risk_assessment_complete'
      },
      onSuccess: 'log_success'
    },
    
    // Error Handling
    {
      id: 'handle_fetch_error',
      type: 'decision',
      name: 'Handle Fetch Error',
      config: { useLastKnownData: true, maxAge: 7 },
      onSuccess: 'compute_risk',
      onFailure: 'log_error'
    },
    {
      id: 'rollback_intervention',
      type: 'custom',
      name: 'Rollback Failed Intervention',
      config: { action: 'rollback_last' },
      onSuccess: 'escalate_to_human'
    },
    {
      id: 'escalate_to_human',
      type: 'notify',
      name: 'Escalate to Human',
      config: {
        channels: ['email', 'slack'],
        priority: 'high',
        recipients: ['risk-team@company.com']
      },
      onSuccess: 'log_escalation'
    },
    
    // Logging
    {
      id: 'log_success',
      type: 'log',
      name: 'Log Success',
      config: { level: 'info', includeMetrics: true }
    },
    {
      id: 'log_low_risk',
      type: 'log',
      name: 'Log Low Risk',
      config: { level: 'debug' },
      onSuccess: 'log_success'
    },
    {
      id: 'log_error',
      type: 'log',
      name: 'Log Error',
      config: { level: 'error', alertTeam: true }
    },
    {
      id: 'log_escalation',
      type: 'log',
      name: 'Log Escalation',
      config: { level: 'warn' }
    }
  ],
  safety: {
    ...DEFAULT_SAFETY_RAILS,
    maxAdjustmentPerCycle: 0.15,
    rollbackOnAnomaly: true,
    sandboxExperimental: true,
    maxIterations: 50,
    freezeOnCriticalAnomaly: true,
    anomalyThreshold: 0.25,
    cooldownBetweenAdjustments: 3600000, // 1 hour
    requireHumanApprovalAbove: 0.4
  },
  schedule: '0 6 * * *' // Daily at 6 AM
});

// ============================================================================
// VERIFICATION CONFIGURATION
// ============================================================================

export const RiskVerification: Verification = createVerification({
  metrics: [
    {
      name: 'risk_prediction_accuracy',
      description: 'Accuracy of risk score predictions',
      formula: '1 - abs(predicted_risk - actual_risk) / 100',
      threshold: 0.80,
      direction: 'higher_better'
    },
    {
      name: 'intervention_effectiveness',
      description: 'Rate of successful interventions',
      formula: 'successful_interventions / total_interventions',
      threshold: 0.70,
      direction: 'higher_better'
    },
    {
      name: 'false_positive_rate',
      description: 'Rate of incorrect high-risk classifications',
      formula: 'false_positives / (false_positives + true_negatives)',
      threshold: 0.15,
      direction: 'lower_better'
    },
    {
      name: 'detection_latency',
      description: 'Average days to detect risk increase',
      formula: 'avg(detection_delay_days)',
      threshold: 5,
      target: 2,
      direction: 'lower_better'
    },
    {
      name: 'loss_prevention_rate',
      description: 'Percentage of potential losses prevented',
      formula: 'prevented_losses / (prevented_losses + actual_losses)',
      threshold: 0.60,
      direction: 'higher_better'
    }
  ],
  thresholds: {
    anomalyDetection: 0.10,
    intentMatch: 0.75,
    causalValidity: 0.65,
    confidenceDecay: true,
    confidenceDecayRate: 0.01,
    minConfidence: 0.35,
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

const AutonomousPermissions: Permission[] = [
  { action: 'query_data', resources: ['customers', 'contractors', 'financials', 'payments'], riskLevel: 'low' },
  { action: 'generate_dsl', resources: ['*'], riskLevel: 'low' },
  { action: 'update_dashboard', resources: ['risk_dashboard', 'monitoring_dashboard'], riskLevel: 'low' },
  { action: 'create_alert', resources: ['*'], conditions: [{ field: 'severity', operator: 'in', value: ['low', 'medium'] }], riskLevel: 'medium' },
  { action: 'apply_intervention', resources: ['*'], conditions: [{ field: 'sandbox', operator: 'eq', value: true }, { field: 'confidence', operator: 'gte', value: 0.85 }], riskLevel: 'medium' }
];

const ApprovalRequiredPermissions: Permission[] = [
  { action: 'modify_entity', resources: ['customers', 'contractors'], riskLevel: 'high' },
  { action: 'apply_intervention', resources: ['*'], conditions: [{ field: 'sandbox', operator: 'eq', value: false }], riskLevel: 'high' },
  { action: 'create_alert', resources: ['*'], conditions: [{ field: 'severity', operator: 'in', value: ['high', 'critical'] }], riskLevel: 'high' },
  { action: 'send_notification', resources: ['external'], riskLevel: 'medium' },
  { action: 'access_external', resources: ['credit_bureau', 'krs_api'], riskLevel: 'high' }
];

const ProhibitedPermissions: Permission[] = [
  { action: '*', resources: ['payment_systems', 'banking_api'], riskLevel: 'critical' },
  { action: '*', resources: ['security_settings', 'user_credentials', 'api_keys'], riskLevel: 'critical' },
  { action: 'delete_resource', resources: ['audit_logs', 'compliance_records', 'event_store'], riskLevel: 'critical' },
  { action: 'modify_entity', resources: ['contracts', 'legal_documents'], riskLevel: 'critical' }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const RiskMonitoringAgent: AgentContract = defineContract('RiskMonitoringAgent', '1.0.0')
  .description('Autonomous B2B risk monitoring agent with causal reasoning and safety rails')
  .author('Softreck')
  .addEntity(CustomerEntity)
  .addEntity(ContractorEntity)
  .workflow(RiskMonitoringWorkflow)
  .verification(RiskVerification)
  .build();

// Add permissions manually (builder doesn't support arrays)
RiskMonitoringAgent.canAutonomously = AutonomousPermissions;
RiskMonitoringAgent.requiresApproval = ApprovalRequiredPermissions;
RiskMonitoringAgent.prohibited = ProhibitedPermissions;

// Override protocols
RiskMonitoringAgent.uncertaintyProtocol = {
  ...DEFAULT_UNCERTAINTY_PROTOCOL,
  confidenceThreshold: 0.75,
  onLowConfidence: {
    askForClarification: true,
    provideAlternatives: true,
    maxAlternatives: 3,
    escalateAfterAttempts: 2
  }
};

RiskMonitoringAgent.negotiationProtocol = {
  ...DEFAULT_NEGOTIATION_PROTOCOL,
  maxIterations: 3,
  timeoutSeconds: 7200
};

RiskMonitoringAgent.enforcement = {
  ...DEFAULT_ENFORCEMENT,
  auditRetentionDays: 730, // 2 years for compliance
  maxViolationsBeforeFreeze: 3
};

RiskMonitoringAgent.rateLimits = {
  actionsPerMinute: 30,
  actionsPerHour: 500,
  actionsPerDay: 5000,
  concurrentActions: 5
};

export default RiskMonitoringAgent;
