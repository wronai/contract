/**
 * Contractor Monitoring - Reclapp TypeScript Contract
 * 
 * Contractor monitoring system with financial tracking and risk detection.
 * 
 * @version 2.4.1
 */

import type { ReclappContract, Entity, Event, Pipeline, Alert, Dashboard, EnvVar } from '../../../contracts/dsl-types';

// ============================================================================
// ENTITIES
// ============================================================================

const Contractor: Entity = {
  name: 'Contractor',
  fields: [
    { name: 'contractorId', type: 'String', annotations: { unique: true, generated: true } },
    { name: 'name', type: 'String', annotations: { required: true } },
    { name: 'nip', type: 'String', annotations: { required: true, unique: true, pattern: '[0-9]{10}' } },
    { name: 'krs', type: 'String', annotations: { pattern: '[0-9]{10}' }, nullable: true },
    { name: 'regon', type: 'String', annotations: { pattern: '[0-9]{9,14}' }, nullable: true },
    { name: 'address', type: 'JSON', annotations: { required: true } },
    { name: 'category', type: 'String', annotations: { required: true } },
    { name: 'status', type: 'String', annotations: { enum: ['active', 'suspended', 'liquidation', 'bankrupt', 'unknown'], default: 'active' } },
    { name: 'rating', type: 'Float', annotations: { min: 0, max: 10, default: 5.0 } },
    { name: 'riskScore', type: 'Int', annotations: { min: 0, max: 100, default: 50 } },
    { name: 'creditLimit', type: 'Money', annotations: { default: 0 } },
    { name: 'totalOrders', type: 'Int', annotations: { default: 0 } },
    { name: 'totalValue', type: 'Money', annotations: { default: 0 } },
    { name: 'lastOrderDate', type: 'DateTime', nullable: true },
    { name: 'lastCheckDate', type: 'DateTime', nullable: true },
    { name: 'financials', type: 'JSON', nullable: true },
    { name: 'board', type: 'JSON', nullable: true },
    { name: 'notes', type: 'String', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
    { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const RiskEvent: Entity = {
  name: 'RiskEvent',
  fields: [
    { name: 'contractorId', type: 'UUID', annotations: { required: true } },
    { name: 'eventType', type: 'String', annotations: { enum: ['financial_decline', 'board_change', 'legal_issue', 'payment_delay', 'credit_downgrade', 'address_change', 'status_change', 'media_negative'] } },
    { name: 'severity', type: 'String', annotations: { enum: ['low', 'medium', 'high', 'critical'], default: 'medium' } },
    { name: 'description', type: 'String', annotations: { required: true } },
    { name: 'source', type: 'String', nullable: true },
    { name: 'data', type: 'JSON', nullable: true },
    { name: 'resolved', type: 'Boolean', annotations: { default: false } },
    { name: 'resolvedBy', type: 'String', nullable: true },
    { name: 'resolvedAt', type: 'DateTime', nullable: true },
    { name: 'resolvedNotes', type: 'String', nullable: true },
    { name: 'timestamp', type: 'DateTime', annotations: { generated: true } }
  ]
};

const MonitoringRule: Entity = {
  name: 'MonitoringRule',
  fields: [
    { name: 'name', type: 'String', annotations: { required: true } },
    { name: 'description', type: 'String', nullable: true },
    { name: 'condition', type: 'String', annotations: { required: true } },
    { name: 'severity', type: 'String', annotations: { enum: ['low', 'medium', 'high', 'critical'] } },
    { name: 'enabled', type: 'Boolean', annotations: { default: true } },
    { name: 'targets', type: 'JSON', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const FinancialSnapshot: Entity = {
  name: 'FinancialSnapshot',
  fields: [
    { name: 'contractorId', type: 'UUID', annotations: { required: true } },
    { name: 'year', type: 'Int', annotations: { required: true } },
    { name: 'revenue', type: 'Money', nullable: true },
    { name: 'profit', type: 'Money', nullable: true },
    { name: 'assets', type: 'Money', nullable: true },
    { name: 'liabilities', type: 'Money', nullable: true },
    { name: 'employees', type: 'Int', nullable: true },
    { name: 'profitMargin', type: 'Float', nullable: true },
    { name: 'debtRatio', type: 'Float', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  { name: 'ContractorAdded', fields: [
    { name: 'contractorId', type: 'UUID' }, { name: 'name', type: 'String' },
    { name: 'nip', type: 'String' }, { name: 'category', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'ContractorUpdated', fields: [
    { name: 'contractorId', type: 'UUID' }, { name: 'changes', type: 'JSON' },
    { name: 'updatedBy', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'RiskEventDetected', fields: [
    { name: 'riskEventId', type: 'UUID' }, { name: 'contractorId', type: 'UUID' },
    { name: 'eventType', type: 'String' }, { name: 'severity', type: 'String' },
    { name: 'description', type: 'String' }, { name: 'source', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'RiskEventResolved', fields: [
    { name: 'riskEventId', type: 'UUID' }, { name: 'contractorId', type: 'UUID' },
    { name: 'resolvedBy', type: 'String' }, { name: 'notes', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'FinancialDataUpdated', fields: [
    { name: 'contractorId', type: 'UUID' }, { name: 'year', type: 'Int' },
    { name: 'revenue', type: 'Money' }, { name: 'profit', type: 'Money' },
    { name: 'previousRevenue', type: 'Money' }, { name: 'previousProfit', type: 'Money' },
    { name: 'changePercent', type: 'Float' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'BoardChanged', fields: [
    { name: 'contractorId', type: 'UUID' }, { name: 'changeType', type: 'String' },
    { name: 'memberName', type: 'String' }, { name: 'role', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'StatusChanged', fields: [
    { name: 'contractorId', type: 'UUID' }, { name: 'previousStatus', type: 'String' },
    { name: 'newStatus', type: 'String' }, { name: 'reason', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'RatingChanged', fields: [
    { name: 'contractorId', type: 'UUID' }, { name: 'previousRating', type: 'Float' },
    { name: 'newRating', type: 'Float' }, { name: 'reason', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]}
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  { name: 'FinancialMonitoring', input: 'contractors.active', transform: ['fetchFinancials', 'calculateMetrics', 'detectAnomalies'], output: ['riskEvents', 'dashboard'], schedule: '0 6 * * *' },
  { name: 'LegalMonitoring', input: 'contractors.active', transform: ['fetchLegalCases', 'assessRisk'], output: ['riskEvents', 'alerts'], schedule: '0 8 * * *' },
  { name: 'MediaMonitoring', input: 'contractors.active', transform: ['fetchMentions', 'sentimentAnalysis', 'filterNegative'], output: ['riskEvents', 'dashboard'], schedule: '0 */4 * * *' },
  { name: 'RiskScoreCalculation', input: 'riskEvents.unresolved', transform: ['aggregateByContractor', 'calculateScore', 'updateContractor'], output: ['contractors.update'], schedule: '*/30 * * * *' },
  { name: 'BoardChangeDetection', input: 'contractors.active', transform: ['fetchBoardData', 'compareWithPrevious', 'detectChanges'], output: ['riskEvents', 'alerts'], schedule: '0 7 * * 1' }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  { name: 'Critical Risk Detected', entity: 'RiskEvent', condition: 'severity == "critical" AND resolved == false', target: ['email', 'slack', 'sms'], severity: 'critical' },
  { name: 'Financial Decline', entity: 'Contractor', condition: 'riskScore > 70 AND financials.profitMargin < -0.1', target: ['email', 'slack'], severity: 'high', throttle: '24h' },
  { name: 'Status Change to Liquidation', entity: 'Contractor', condition: 'status == "liquidation" OR status == "bankrupt"', target: ['email', 'slack', 'sms'], severity: 'critical' },
  { name: 'Multiple Risk Events', entity: 'Contractor', condition: 'unresolvedRiskEvents > 3', target: ['email', 'slack'], severity: 'high', throttle: '12h' },
  { name: 'Board Member Resignation', entity: 'RiskEvent', condition: 'eventType == "board_change"', target: ['email'], severity: 'medium' },
  { name: 'Payment Delay Pattern', entity: 'Contractor', condition: 'paymentDelayCount > 2', target: ['email'], severity: 'medium', throttle: '7d' },
  { name: 'Credit Limit Exceeded', entity: 'Contractor', condition: 'outstandingValue > creditLimit * 0.9', target: ['email', 'slack'], severity: 'high' }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  { name: 'Contractor Overview', entity: 'Contractor', metrics: ['totalCount', 'activeCount', 'byCategory', 'byRiskLevel', 'avgRating', 'totalOrderValue'], streamMode: 'realtime', layout: 'grid' },
  { name: 'Risk Monitor', entity: 'RiskEvent', metrics: ['totalEvents', 'unresolvedCount', 'bySeverity', 'byType', 'resolutionTime', 'trendLast30Days'], streamMode: 'realtime', layout: 'grid' },
  { name: 'Financial Health', entity: 'Contractor', metrics: ['revenueDistribution', 'profitMarginAvg', 'debtRatioAvg', 'financialTrend', 'topByRevenue', 'bottomByProfit'], streamMode: 'polling' },
  { name: 'Alert Center', entity: 'RiskEvent', metrics: ['activeAlerts', 'alertsByPriority', 'responseTime', 'acknowledgedRate'], streamMode: 'realtime', refreshInterval: '30s' }
];

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'API_PORT', type: 'Int', default: 8080 },
  { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
  { name: 'JWT_SECRET', type: 'String', required: true, secret: true },
  { name: 'FINANCIAL_DATA_API_URL', type: 'String', required: true },
  { name: 'FINANCIAL_DATA_API_KEY', type: 'String', required: true, secret: true },
  { name: 'LEGAL_REGISTRY_API_URL', type: 'String' },
  { name: 'LEGAL_REGISTRY_API_KEY', type: 'String', secret: true },
  { name: 'MEDIA_MONITOR_API_URL', type: 'String' },
  { name: 'MEDIA_MONITOR_API_KEY', type: 'String', secret: true },
  { name: 'SLACK_WEBHOOK_URL', type: 'String', secret: true },
  { name: 'EMAIL_API_KEY', type: 'String', secret: true },
  { name: 'SMS_API_KEY', type: 'String', secret: true }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: {
    name: 'Contractor Monitoring',
    version: '2.4.1',
    description: 'Contractor monitoring system with financial tracking and risk detection',
    author: 'Reclapp Team',
    license: 'MIT'
  },
  
  deployment: {
    type: 'web',
    framework: 'nextjs',
    build: { outputDir: 'target', nodeVersion: '18' },
    hosting: { provider: 'docker' }
  },
  
  backend: {
    runtime: 'node',
    framework: 'express',
    port: '${API_PORT:8080}',
    database: { type: 'postgres', url: '${DATABASE_URL}' },
    auth: { type: 'jwt', secret: '${JWT_SECRET}' }
  },
  
  frontend: {
    framework: 'react',
    bundler: 'vite',
    style: 'tailwindcss',
    components: 'shadcn',
    theme: { mode: 'light', primary: '#dc2626' },
    layout: {
      type: 'dashboard',
      navigation: [
        { icon: 'building', label: 'Contractors', path: '/contractors' },
        { icon: 'alert-triangle', label: 'Risk Events', path: '/risk-events' },
        { icon: 'bar-chart', label: 'Financials', path: '/financials' },
        { icon: 'bell', label: 'Alerts', path: '/alerts' },
        { icon: 'settings', label: 'Rules', path: '/rules' }
      ]
    }
  },
  
  sources: [
    { name: 'financialData', type: 'rest', url: '${FINANCIAL_DATA_API_URL}', auth: 'bearer', cacheDuration: '24h' },
    { name: 'legalRegistry', type: 'rest', url: '${LEGAL_REGISTRY_API_URL}', auth: 'apiKey', cacheDuration: '12h' },
    { name: 'mediaMonitor', type: 'rest', url: '${MEDIA_MONITOR_API_URL}', auth: 'apiKey', cacheDuration: '1h' }
  ],
  
  entities: [Contractor, RiskEvent, MonitoringRule, FinancialSnapshot],
  events,
  pipelines,
  alerts,
  dashboards,
  env,
  
  config: {
    monitoring: {
      riskThresholds: { low: 30, medium: 60, high: 80, critical: 90 },
      checkIntervalHours: 24,
      alertCooldownHours: 12
    }
  }
};

export default contract;
