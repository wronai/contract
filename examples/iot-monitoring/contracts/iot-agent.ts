/**
 * IoT Device Monitoring Agent Contract
 * 
 * Kontrakt dla autonomicznego agenta monitorującego urządzenia IoT
 * z anomaly detection i predictive maintenance.
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
  DEFAULT_ENFORCEMENT
} from '@reclapp/contracts';

// ============================================================================
// ENTITY DEFINITIONS
// ============================================================================

export const DeviceEntity: Entity = createEntity({
  name: 'Device',
  description: 'IoT device with sensors and metrics',
  fields: [
    { name: 'id', type: 'uuid', required: true, unique: true },
    { name: 'deviceId', type: 'string', required: true, unique: true },
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'string', enum: ['sensor', 'actuator', 'gateway', 'controller'] },
    { name: 'location', type: 'string' },
    { name: 'status', type: 'string', enum: ['online', 'offline', 'error', 'maintenance'], default: 'offline' },
    { name: 'temperature', type: 'number' },
    { name: 'humidity', type: 'number', min: 0, max: 100 },
    { name: 'batteryLevel', type: 'number', min: 0, max: 100 },
    { name: 'signalStrength', type: 'number', min: -100, max: 0 },
    { name: 'healthScore', type: 'number', min: 0, max: 100, default: 100 },
    { name: 'lastSeen', type: 'datetime' },
    { name: 'firmwareVersion', type: 'string' }
  ],
  causalInfluences: [
    {
      field: 'temperature',
      weight: 0.3,
      decay: 0.05,
      mechanism: 'High temperature may indicate hardware stress or environmental issues'
    },
    {
      field: 'batteryLevel',
      weight: -0.25,
      decay: 0.02,
      mechanism: 'Low battery affects device reliability'
    },
    {
      field: 'signalStrength',
      weight: -0.2,
      decay: 0.03,
      mechanism: 'Poor signal causes connectivity issues'
    },
    {
      field: 'uptimeHours',
      weight: 0.15,
      decay: 0.01,
      mechanism: 'Long uptime without restart may cause memory leaks'
    },
    {
      field: 'errorRate',
      weight: 0.4,
      decay: 0.04,
      mechanism: 'High error rate indicates potential failure'
    }
  ],
  interventions: [
    {
      name: 'rebootDevice',
      description: 'Remote reboot to clear memory and reset state',
      adjust: { command: 'reboot', uptime: 0 },
      expectedEffect: { healthScore: 15, errorRate: -50 },
      confidence: 0.85,
      sandbox: false,
      cooldownMs: 3600000, // 1 hour
      prerequisites: ['status == "online"']
    },
    {
      name: 'updateFirmware',
      description: 'Push firmware update to device',
      adjust: { command: 'update_firmware' },
      expectedEffect: { healthScore: 10, vulnerabilityScore: -30 },
      confidence: 0.75,
      sandbox: true,
      cooldownMs: 86400000 // 24 hours
    },
    {
      name: 'adjustSamplingRate',
      description: 'Reduce sampling rate to save battery',
      adjust: { samplingInterval: 60000 },
      expectedEffect: { batteryDrain: -40 },
      confidence: 0.9,
      sandbox: false,
      prerequisites: ['batteryLevel < 30']
    },
    {
      name: 'scheduleMaintenanceVisit',
      description: 'Schedule physical maintenance',
      adjust: { maintenanceRequired: true },
      expectedEffect: { healthScore: 30 },
      confidence: 0.95,
      sandbox: false,
      prerequisites: ['healthScore < 50']
    },
    {
      name: 'isolateDevice',
      description: 'Isolate device from network for security',
      adjust: { networkIsolated: true },
      expectedEffect: { securityRisk: -80 },
      confidence: 0.95,
      sandbox: false,
      prerequisites: ['securityThreatDetected == true']
    }
  ]
});

export const SensorReadingEntity: Entity = createEntity({
  name: 'SensorReading',
  description: 'Individual sensor reading with anomaly detection',
  fields: [
    { name: 'id', type: 'uuid', required: true },
    { name: 'deviceId', type: 'string', required: true },
    { name: 'sensorType', type: 'string', enum: ['temperature', 'humidity', 'pressure', 'motion', 'light'] },
    { name: 'value', type: 'number', required: true },
    { name: 'unit', type: 'string' },
    { name: 'timestamp', type: 'datetime', required: true },
    { name: 'isAnomaly', type: 'boolean', default: false },
    { name: 'anomalyScore', type: 'number', min: 0, max: 1 }
  ],
  causalInfluences: [],
  interventions: []
});

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

export const IoTMonitoringWorkflow: Workflow = createWorkflow({
  name: 'RealtimeDeviceMonitoring',
  steps: [
    // Stage 1: Data Ingestion
    {
      id: 'receive_mqtt',
      type: 'fetch_data',
      name: 'Receive MQTT Message',
      config: {
        source: 'mqtt',
        topics: ['devices/+/telemetry', 'devices/+/status', 'devices/+/alerts']
      },
      onSuccess: 'parse_payload',
      onFailure: 'log_mqtt_error',
      timeout: 5000
    },
    {
      id: 'parse_payload',
      type: 'transform',
      name: 'Parse Payload',
      config: { format: 'json', validate: true },
      onSuccess: 'detect_anomaly',
      onFailure: 'log_parse_error'
    },
    
    // Stage 2: Anomaly Detection
    {
      id: 'detect_anomaly',
      type: 'compute',
      name: 'Detect Anomaly',
      config: {
        algorithm: 'isolation_forest',
        threshold: 0.7,
        windowSize: 100
      },
      onSuccess: 'evaluate_health',
      onFailure: 'store_raw'
    },
    {
      id: 'evaluate_health',
      type: 'compute',
      name: 'Evaluate Device Health',
      config: {
        algorithm: 'causal_weighted_sum',
        applyDecay: true
      },
      onSuccess: 'classify_status',
      onFailure: 'log_error'
    },
    {
      id: 'classify_status',
      type: 'decision',
      name: 'Classify Device Status',
      config: {
        thresholds: {
          critical: 30,
          warning: 60,
          healthy: 80
        }
      },
      conditions: [
        { expression: 'healthScore < 30', description: 'Critical health' },
        { expression: 'healthScore < 60', description: 'Warning health' }
      ],
      onSuccess: 'select_intervention',
      onFailure: 'store_metrics'
    },
    
    // Stage 3: Intervention
    {
      id: 'select_intervention',
      type: 'decision',
      name: 'Select Intervention',
      config: { strategy: 'priority_based', maxInterventions: 1 },
      onSuccess: 'apply_intervention',
      onFailure: 'create_alert'
    },
    {
      id: 'apply_intervention',
      type: 'apply_intervention',
      name: 'Apply Intervention',
      config: { method: 'mqtt_command', requireAck: true },
      onSuccess: 'schedule_verification',
      onFailure: 'escalate'
    },
    
    // Stage 4: Storage & Alerts
    {
      id: 'store_metrics',
      type: 'custom',
      name: 'Store to InfluxDB',
      config: { target: 'influxdb', measurement: 'device_metrics' },
      onSuccess: 'check_alerts'
    },
    {
      id: 'store_raw',
      type: 'custom',
      name: 'Store Raw Data',
      config: { target: 'influxdb', measurement: 'raw_readings' },
      onSuccess: 'log_success'
    },
    {
      id: 'check_alerts',
      type: 'decision',
      name: 'Check Alert Conditions',
      conditions: [
        { expression: 'temperature > 80', description: 'High temperature' },
        { expression: 'batteryLevel < 10', description: 'Critical battery' },
        { expression: 'isAnomaly == true', description: 'Anomaly detected' }
      ],
      onSuccess: 'create_alert',
      onFailure: 'log_success'
    },
    {
      id: 'create_alert',
      type: 'notify',
      name: 'Create Alert',
      config: {
        channels: ['slack', 'email', 'dashboard'],
        template: 'device_alert'
      },
      onSuccess: 'log_success'
    },
    
    // Stage 5: Verification & Logging
    {
      id: 'schedule_verification',
      type: 'custom',
      name: 'Schedule Verification',
      config: { delay: 300000 }, // 5 minutes
      onSuccess: 'log_success'
    },
    {
      id: 'escalate',
      type: 'notify',
      name: 'Escalate to Human',
      config: { channels: ['sms', 'call'], priority: 'critical' },
      onSuccess: 'log_escalation'
    },
    
    // Logging
    {
      id: 'log_success',
      type: 'log',
      name: 'Log Success',
      config: { level: 'debug' }
    },
    {
      id: 'log_mqtt_error',
      type: 'log',
      name: 'Log MQTT Error',
      config: { level: 'error' }
    },
    {
      id: 'log_parse_error',
      type: 'log',
      name: 'Log Parse Error',
      config: { level: 'warn' }
    },
    {
      id: 'log_error',
      type: 'log',
      name: 'Log Error',
      config: { level: 'error', alertOps: true }
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
    maxAdjustmentPerCycle: 0.2,
    rollbackOnAnomaly: true,
    sandboxExperimental: true,
    maxIterations: 100,
    cooldownBetweenAdjustments: 60000 // 1 minute
  }
});

// ============================================================================
// VERIFICATION
// ============================================================================

export const IoTVerification: Verification = createVerification({
  metrics: [
    {
      name: 'anomaly_detection_accuracy',
      description: 'Accuracy of anomaly detection',
      threshold: 0.85,
      direction: 'higher_better'
    },
    {
      name: 'intervention_success_rate',
      description: 'Rate of successful interventions',
      threshold: 0.80,
      direction: 'higher_better'
    },
    {
      name: 'false_alert_rate',
      description: 'Rate of false positive alerts',
      threshold: 0.10,
      direction: 'lower_better'
    },
    {
      name: 'mean_time_to_detect',
      description: 'Average time to detect issues (seconds)',
      threshold: 60,
      direction: 'lower_better'
    }
  ],
  thresholds: {
    anomalyDetection: 0.15,
    intentMatch: 0.70,
    causalValidity: 0.60,
    confidenceDecay: true,
    confidenceDecayRate: 0.02,
    minConfidence: 0.40,
    maxConfidence: 0.95
  },
  learningConfig: {
    enabled: true,
    minObservations: 1000,
    learningRate: 0.02,
    lockedBeforeApproval: true,
    batchSize: 100,
    validationSplit: 0.2
  }
});

// ============================================================================
// PERMISSIONS
// ============================================================================

const AutonomousPermissions: Permission[] = [
  { action: 'query_data', resources: ['devices', 'readings', 'metrics'], riskLevel: 'low' },
  { action: 'update_dashboard', resources: ['*'], riskLevel: 'low' },
  { action: 'create_alert', resources: ['*'], conditions: [{ field: 'severity', operator: 'in', value: ['low', 'medium'] }], riskLevel: 'medium' },
  { action: 'apply_intervention', resources: ['devices'], conditions: [{ field: 'intervention', operator: 'in', value: ['adjustSamplingRate'] }], riskLevel: 'low' }
];

const ApprovalRequiredPermissions: Permission[] = [
  { action: 'apply_intervention', resources: ['devices'], conditions: [{ field: 'intervention', operator: 'in', value: ['rebootDevice', 'updateFirmware'] }], riskLevel: 'high' },
  { action: 'create_alert', resources: ['*'], conditions: [{ field: 'severity', operator: 'eq', value: 'critical' }], riskLevel: 'high' },
  { action: 'modify_entity', resources: ['devices'], riskLevel: 'high' }
];

const ProhibitedPermissions: Permission[] = [
  { action: '*', resources: ['firmware_signing_keys'], riskLevel: 'critical' },
  { action: 'delete_resource', resources: ['audit_logs', 'device_certificates'], riskLevel: 'critical' },
  { action: 'apply_intervention', resources: ['*'], conditions: [{ field: 'intervention', operator: 'eq', value: 'factoryReset' }], riskLevel: 'critical' }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const IoTMonitoringAgent: AgentContract = {
  name: 'IoTMonitoringAgent',
  version: '1.0.0',
  description: 'Autonomous IoT device monitoring agent with anomaly detection and predictive maintenance',
  author: 'Softreck',
  created: new Date(),
  updated: new Date(),
  
  entities: [DeviceEntity, SensorReadingEntity],
  workflow: IoTMonitoringWorkflow,
  
  canAutonomously: AutonomousPermissions,
  requiresApproval: ApprovalRequiredPermissions,
  prohibited: ProhibitedPermissions,
  
  uncertaintyProtocol: {
    confidenceThreshold: 0.70,
    onLowConfidence: {
      askForClarification: false,
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
    maxIterations: 2,
    onRejection: {
      askForFeedback: true,
      proposeAlternative: true,
      explainReasoning: true
    },
    onPartialApproval: {
      executeApproved: true,
      queueRejected: false
    },
    timeoutSeconds: 300
  },
  
  verification: IoTVerification,
  
  enforcement: {
    ...DEFAULT_ENFORCEMENT,
    auditRetentionDays: 90,
    maxViolationsBeforeFreeze: 5
  },
  
  rateLimits: {
    actionsPerMinute: 100,
    actionsPerHour: 3000,
    actionsPerDay: 50000,
    concurrentActions: 20
  }
};

export default IoTMonitoringAgent;
