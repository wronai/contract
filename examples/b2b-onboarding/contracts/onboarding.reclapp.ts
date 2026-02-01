/**
 * B2B Customer Onboarding - Reclapp TypeScript Contract
 * 
 * Complete B2B customer onboarding workflow with KRS/CEIDG verification.
 * 
 * @version 2.4.1
 */

import type { ReclappContract, Entity, Event, Pipeline, Alert, Dashboard, Workflow, EnvVar } from '../../../contracts/dsl-types';

// ============================================================================
// ENTITIES
// ============================================================================

const Customer: Entity = {
  name: 'Customer',
  fields: [
    { name: 'name', type: 'String', annotations: { required: true } },
    { name: 'nip', type: 'String', annotations: { required: true, unique: true, pattern: '[0-9]{10}' } },
    { name: 'krs', type: 'String', annotations: { pattern: '[0-9]{10}' }, nullable: true },
    { name: 'regon', type: 'String', annotations: { pattern: '[0-9]{9,14}' }, nullable: true },
    { name: 'address', type: 'JSON', annotations: { required: true } },
    { name: 'email', type: 'Email', annotations: { required: true } },
    { name: 'phone', type: 'String', nullable: true },
    { name: 'segment', type: 'String', annotations: { enum: ['enterprise', 'sme', 'startup'], default: 'sme' } },
    { name: 'status', type: 'String', annotations: { enum: ['pending', 'verified', 'rejected', 'active', 'suspended'], default: 'pending' } },
    { name: 'registryStatus', type: 'String', nullable: true },
    { name: 'creditLimit', type: 'Money', annotations: { default: 0 } },
    { name: 'paymentTerms', type: 'Int', annotations: { default: 30 } },
    { name: 'riskScore', type: 'Int', annotations: { default: 50 } },
    { name: 'verifiedAt', type: 'DateTime', nullable: true },
    { name: 'verifiedBy', type: 'String', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
    { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const OnboardingDocument: Entity = {
  name: 'OnboardingDocument',
  fields: [
    { name: 'customerId', type: 'UUID', annotations: { required: true } },
    { name: 'documentType', type: 'String', annotations: { enum: ['registration', 'financial', 'identity', 'contract'] } },
    { name: 'fileName', type: 'String', annotations: { required: true } },
    { name: 'fileUrl', type: 'URL', nullable: true },
    { name: 'status', type: 'String', annotations: { enum: ['pending', 'approved', 'rejected'], default: 'pending' } },
    { name: 'reviewedBy', type: 'String', nullable: true },
    { name: 'reviewedAt', type: 'DateTime', nullable: true },
    { name: 'notes', type: 'String', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  { name: 'CustomerRegistered', fields: [
    { name: 'customerId', type: 'UUID' }, { name: 'name', type: 'String' },
    { name: 'nip', type: 'String' }, { name: 'email', type: 'Email' },
    { name: 'segment', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'CustomerVerified', fields: [
    { name: 'customerId', type: 'UUID' }, { name: 'verifiedBy', type: 'String' },
    { name: 'creditLimit', type: 'Money' }, { name: 'paymentTerms', type: 'Int' },
    { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'CustomerRejected', fields: [
    { name: 'customerId', type: 'UUID' }, { name: 'rejectedBy', type: 'String' },
    { name: 'reason', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'RegistryCheckCompleted', fields: [
    { name: 'customerId', type: 'UUID' }, { name: 'source', type: 'String' },
    { name: 'status', type: 'String' }, { name: 'data', type: 'JSON' },
    { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'DocumentUploaded', fields: [
    { name: 'documentId', type: 'UUID' }, { name: 'customerId', type: 'UUID' },
    { name: 'documentType', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'DocumentReviewed', fields: [
    { name: 'documentId', type: 'UUID' }, { name: 'customerId', type: 'UUID' },
    { name: 'status', type: 'String' }, { name: 'reviewedBy', type: 'String' },
    { name: 'notes', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'CreditLimitSet', fields: [
    { name: 'customerId', type: 'UUID' }, { name: 'previousLimit', type: 'Money' },
    { name: 'newLimit', type: 'Money' }, { name: 'reason', type: 'String' },
    { name: 'setBy', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]}
];

// ============================================================================
// WORKFLOWS
// ============================================================================

const workflows: Workflow[] = [
  {
    name: 'CustomerOnboarding',
    trigger: 'CustomerRegistered.event',
    steps: [
      { name: 'VerifyRegistry', action: 'checkKRS', onSuccess: 'VerifyDocuments', onFailure: 'ManualReview', timeout: '5m' },
      { name: 'VerifyDocuments', action: 'validateDocuments', onSuccess: 'CalculateRisk', onFailure: 'ManualReview', timeout: '24h' },
      { name: 'CalculateRisk', action: 'calculateRiskScore', onSuccess: 'SetCreditLimit', onFailure: 'ManualReview' },
      { name: 'SetCreditLimit', action: 'determineCreditLimit', onSuccess: 'ApproveCustomer', onFailure: 'ManualReview' },
      { name: 'ManualReview', action: 'notifyReviewer', onSuccess: 'ApproveCustomer', onFailure: 'RejectCustomer', timeout: '48h' },
      { name: 'ApproveCustomer', action: 'activateCustomer', onSuccess: 'SendWelcome' },
      { name: 'RejectCustomer', action: 'deactivateCustomer', onSuccess: 'NotifyRejection' },
      { name: 'SendWelcome', action: 'sendWelcomeEmail' },
      { name: 'NotifyRejection', action: 'sendRejectionEmail' }
    ]
  }
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  { name: 'OnboardingMetrics', input: 'Customer.events', transform: ['aggregate', 'calculate'], output: ['dashboard', 'analytics'], schedule: '*/5 * * * *' },
  { name: 'RegistrySync', input: 'customers.pending', transform: ['enrichFromKRS', 'enrichFromCEIDG'], output: ['customers.update'], schedule: '0 */6 * * *' }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  { name: 'Pending Onboarding Too Long', entity: 'Customer', condition: 'status == "pending" AND createdAt < now() - 48h', target: ['email', 'slack'], severity: 'high', throttle: '4h' },
  { name: 'High Risk Customer', entity: 'Customer', condition: 'riskScore > 80 AND status == "active"', target: ['email', 'slack'], severity: 'critical' },
  { name: 'Document Review Pending', entity: 'OnboardingDocument', condition: 'status == "pending" AND createdAt < now() - 24h', target: ['email'], severity: 'medium' }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  { name: 'Onboarding Overview', entity: 'Customer', metrics: ['totalCount', 'pendingCount', 'verifiedCount', 'rejectedCount', 'avgProcessingTime'], streamMode: 'realtime', layout: 'grid' },
  { name: 'Onboarding Funnel', entity: 'Customer', metrics: ['registeredToday', 'pendingVerification', 'documentsUploaded', 'documentsApproved', 'fullyVerified', 'conversionRate'], streamMode: 'polling' },
  { name: 'Risk Distribution', entity: 'Customer', metrics: ['riskScoreDistribution', 'riskBySegment', 'highRiskTrend'], streamMode: 'polling' }
];

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'API_PORT', type: 'Int', default: 8080 },
  { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
  { name: 'JWT_SECRET', type: 'String', required: true, secret: true },
  { name: 'KRS_API_URL', type: 'String', required: true },
  { name: 'KRS_API_KEY', type: 'String', required: true, secret: true },
  { name: 'CEIDG_API_URL', type: 'String', required: true },
  { name: 'CEIDG_API_KEY', type: 'String', required: true, secret: true },
  { name: 'SLACK_WEBHOOK_URL', type: 'String', secret: true },
  { name: 'EMAIL_API_KEY', type: 'String', secret: true }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: {
    name: 'B2B Onboarding',
    version: '2.4.1',
    description: 'B2B customer onboarding workflow with KRS/CEIDG verification',
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
    layout: {
      type: 'dashboard',
      navigation: [
        { icon: 'users', label: 'Customers', path: '/customers' },
        { icon: 'file-text', label: 'Documents', path: '/documents' },
        { icon: 'activity', label: 'Onboarding', path: '/onboarding' },
        { icon: 'alert-triangle', label: 'Alerts', path: '/alerts' },
        { icon: 'settings', label: 'Settings', path: '/settings' }
      ]
    }
  },
  
  sources: [
    { name: 'krs', type: 'rest', url: '${KRS_API_URL}', auth: 'apiKey', cacheDuration: '1h' },
    { name: 'ceidg', type: 'rest', url: '${CEIDG_API_URL}', auth: 'apiKey', cacheDuration: '1h' }
  ],
  
  entities: [Customer, OnboardingDocument],
  events,
  pipelines,
  alerts,
  dashboards,
  workflows,
  env,
  
  config: {
    onboarding: {
      defaultPaymentTerms: 30,
      maxPendingDays: 7,
      riskThresholds: { low: 30, medium: 60, high: 80 }
    }
  }
};

export default contract;
