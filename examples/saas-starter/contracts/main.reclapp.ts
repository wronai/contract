/**
 * SaaS Starter - Reclapp TypeScript Contract
 * 
 * Multi-tenant SaaS application with subscriptions, billing, and user management.
 * 
 * @version 2.1.0
 */

import type { 
  ReclappContract, 
  Entity, 
  Event, 
  Pipeline, 
  Alert, 
  Dashboard,
  Workflow,
  ApiConfig,
  EnvVar 
} from '../../../contracts/dsl-types';

// ============================================================================
// ENTITIES
// ============================================================================

const Organization: Entity = {
  name: 'Organization',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'slug', type: 'String', annotations: { unique: true } },
    { name: 'plan', type: 'String' },
    { name: 'status', type: 'String' },
    { name: 'ownerId', type: 'String' },
    { name: 'settings', type: 'JSON', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const User: Entity = {
  name: 'User',
  fields: [
    { name: 'email', type: 'String', annotations: { unique: true } },
    { name: 'name', type: 'String' },
    { name: 'role', type: 'String' },
    { name: 'organizationId', type: 'String' },
    { name: 'avatarUrl', type: 'String', nullable: true },
    { name: 'lastLoginAt', type: 'DateTime', nullable: true },
    { name: 'isActive', type: 'Boolean' },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Subscription: Entity = {
  name: 'Subscription',
  fields: [
    { name: 'organizationId', type: 'String' },
    { name: 'stripeSubscriptionId', type: 'String', annotations: { unique: true } },
    { name: 'plan', type: 'String' },
    { name: 'status', type: 'String' },
    { name: 'currentPeriodStart', type: 'DateTime' },
    { name: 'currentPeriodEnd', type: 'DateTime' },
    { name: 'cancelAtPeriodEnd', type: 'Boolean' },
    { name: 'quantity', type: 'Int' }
  ]
};

const Invoice: Entity = {
  name: 'Invoice',
  fields: [
    { name: 'organizationId', type: 'String' },
    { name: 'stripeInvoiceId', type: 'String', annotations: { unique: true } },
    { name: 'subscriptionId', type: 'String', nullable: true },
    { name: 'amount', type: 'Decimal' },
    { name: 'currency', type: 'String' },
    { name: 'status', type: 'String' },
    { name: 'paidAt', type: 'DateTime', nullable: true },
    { name: 'dueDate', type: 'DateTime' },
    { name: 'invoiceUrl', type: 'String', nullable: true }
  ]
};

const Usage: Entity = {
  name: 'Usage',
  fields: [
    { name: 'organizationId', type: 'String' },
    { name: 'metric', type: 'String' },
    { name: 'value', type: 'Int' },
    { name: 'period', type: 'String' },
    { name: 'recordedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const AuditLog: Entity = {
  name: 'AuditLog',
  fields: [
    { name: 'organizationId', type: 'String' },
    { name: 'userId', type: 'String' },
    { name: 'action', type: 'String' },
    { name: 'resource', type: 'String' },
    { name: 'resourceId', type: 'String', nullable: true },
    { name: 'metadata', type: 'JSON', nullable: true },
    { name: 'ipAddress', type: 'String', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  {
    name: 'UserSignedUp',
    fields: [
      { name: 'userId', type: 'String' },
      { name: 'email', type: 'String' },
      { name: 'organizationId', type: 'String' },
      { name: 'source', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'SubscriptionChanged',
    fields: [
      { name: 'organizationId', type: 'String' },
      { name: 'subscriptionId', type: 'String' },
      { name: 'previousPlan', type: 'String', nullable: true },
      { name: 'newPlan', type: 'String' },
      { name: 'changeType', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'PaymentReceived',
    fields: [
      { name: 'organizationId', type: 'String' },
      { name: 'invoiceId', type: 'String' },
      { name: 'amount', type: 'Decimal' },
      { name: 'currency', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'PaymentFailed',
    fields: [
      { name: 'organizationId', type: 'String' },
      { name: 'invoiceId', type: 'String' },
      { name: 'amount', type: 'Decimal' },
      { name: 'reason', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  }
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  {
    name: 'OnboardingFlow',
    input: 'UserSignedUp.stream',
    transform: ['createOrganization', 'setupDefaults', 'sendWelcomeEmail'],
    output: ['dashboard', 'notifications'],
    schedule: 'immediate'
  },
  {
    name: 'BillingSync',
    input: 'stripeApi.webhooks',
    transform: ['validateEvent', 'processPayment', 'updateSubscription'],
    output: ['invoices', 'notifications']
  },
  {
    name: 'UsageTracking',
    input: 'Usage.stream',
    transform: ['aggregate', 'checkLimits'],
    output: ['metrics', 'alerts'],
    schedule: '*/5 * * * *'
  },
  {
    name: 'ChurnPrediction',
    input: ['Subscription.changes', 'Usage.stream', 'AuditLog.stream'],
    transform: ['analyzeEngagement', 'calculateChurnRisk'],
    output: ['dashboard', 'alerts'],
    schedule: '0 0 * * *'
  }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  {
    name: 'Payment Failed',
    entity: 'Invoice',
    condition: 'status == "failed"',
    target: ['email', 'slack'],
    severity: 'critical',
    throttle: '1h'
  },
  {
    name: 'Subscription Cancelled',
    entity: 'Subscription',
    condition: 'cancelAtPeriodEnd == true',
    target: ['email', 'slack'],
    severity: 'high'
  },
  {
    name: 'Usage Limit 80%',
    entity: 'Usage',
    condition: 'value > (limit * 0.8)',
    target: ['email', 'dashboard'],
    severity: 'medium'
  },
  {
    name: 'Trial Expiring',
    entity: 'Subscription',
    condition: 'plan == "trial" AND daysUntilEnd < 3',
    target: ['email'],
    severity: 'medium'
  }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  {
    name: 'SaaS Metrics',
    entity: 'Organization',
    metrics: ['mrr', 'arr', 'activeOrganizations', 'trialConversions', 'churnRate', 'ltv', 'cac'],
    layout: 'grid',
    refreshInterval: '1m'
  },
  {
    name: 'Revenue Analytics',
    entity: 'Invoice',
    metrics: ['totalRevenue', 'revenueByPlan', 'paymentSuccessRate', 'avgRevenuePerUser'],
    streamMode: 'polling',
    layout: 'tabs'
  },
  {
    name: 'User Activity',
    entity: 'AuditLog',
    metrics: ['dailyActiveUsers', 'weeklyActiveUsers', 'monthlyActiveUsers', 'topActions'],
    streamMode: 'realtime'
  }
];

// ============================================================================
// WORKFLOWS
// ============================================================================

const workflows: Workflow[] = [
  {
    name: 'TrialToSubscription',
    trigger: 'Subscription.trialEnding',
    steps: [
      { name: 'sendReminder', action: 'sendEmail', onSuccess: 'waitForResponse', onFailure: 'logFailure' },
      { name: 'checkConversion', action: 'checkSubscriptionStatus', onSuccess: 'activateSubscription', onFailure: 'sendFinalReminder' },
      { name: 'activateSubscription', action: 'updateStatus', onSuccess: 'sendWelcome' }
    ]
  },
  {
    name: 'DunningFlow',
    trigger: 'PaymentFailed.event',
    steps: [
      { name: 'retryPayment', action: 'chargeCard', onSuccess: 'confirmPayment', onFailure: 'sendPaymentReminder', timeout: '24h' },
      { name: 'sendPaymentReminder', action: 'sendEmail', onSuccess: 'waitForPayment', onFailure: 'escalate' },
      { name: 'escalate', action: 'suspendAccount', onSuccess: 'notifyAdmin' }
    ]
  }
];

// ============================================================================
// API CONFIGURATION
// ============================================================================

const api: ApiConfig = {
  version: 'v1',
  prefix: '/api/v1',
  resources: [
    {
      name: 'organizations',
      entity: 'Organization',
      operations: ['list', 'get', 'create', 'update'],
      auth: 'required'
    },
    {
      name: 'users',
      entity: 'User',
      operations: ['list', 'get', 'update'],
      auth: 'required'
    },
    {
      name: 'subscriptions',
      entity: 'Subscription',
      actions: [
        { name: 'create', method: 'POST', path: '/', input: { planId: 'String', paymentMethodId: 'String' } },
        { name: 'cancel', method: 'POST', path: '/:id/cancel' },
        { name: 'upgrade', method: 'POST', path: '/:id/upgrade', input: { planId: 'String' } }
      ]
    },
    {
      name: 'invoices',
      entity: 'Invoice',
      operations: ['list', 'get'],
      auth: 'required'
    },
    {
      name: 'usage',
      entity: 'Usage',
      actions: [
        { name: 'track', method: 'POST', path: '/track', input: { metric: 'String', value: 'Int' } },
        { name: 'summary', method: 'GET', path: '/summary' }
      ]
    },
    {
      name: 'webhooks',
      actions: [
        { name: 'stripe', method: 'POST', path: '/stripe', auth: 'stripe_signature' }
      ]
    }
  ]
};

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
  { name: 'REDIS_URL', type: 'String', required: true, secret: true },
  { name: 'JWT_SECRET', type: 'String', required: true, secret: true },
  { name: 'STRIPE_SECRET_KEY', type: 'String', required: true, secret: true },
  { name: 'STRIPE_WEBHOOK_SECRET', type: 'String', required: true, secret: true },
  { name: 'STRIPE_PUBLISHABLE_KEY', type: 'String', required: true },
  { name: 'APP_DOMAIN', type: 'String', required: true },
  { name: 'HOSTING_PROVIDER', type: 'String', default: 'vercel' },
  { name: 'DEPLOY_REGION', type: 'String', default: 'eu-central-1' },
  { name: 'GOOGLE_CLIENT_ID', type: 'String', secret: true },
  { name: 'GOOGLE_CLIENT_SECRET', type: 'String', secret: true },
  { name: 'GITHUB_CLIENT_ID', type: 'String', secret: true },
  { name: 'GITHUB_CLIENT_SECRET', type: 'String', secret: true }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: {
    name: 'SaaS Starter',
    version: '2.1.0',
    description: 'Multi-tenant SaaS platform with subscriptions and billing',
    author: 'Reclapp Team',
    license: 'MIT'
  },
  
  deployment: {
    type: 'web',
    framework: 'nextjs',
    build: {
      outputDir: 'target',
      nodeVersion: '18',
      outputMode: 'standalone'
    },
    hosting: {
      provider: 'vercel',
      region: 'eu-central-1',
      domain: { primary: '${APP_DOMAIN}', redirectWww: true },
      ssl: { enabled: true, provider: 'auto' }
    },
    scaling: {
      minInstances: 1,
      maxInstances: 10,
      autoScale: true
    }
  },
  
  backend: {
    runtime: 'node',
    framework: 'nextjs-api-routes',
    database: {
      type: 'postgres',
      url: '${DATABASE_URL}',
      poolSize: 10,
      ssl: true
    },
    cache: {
      type: 'redis',
      url: '${REDIS_URL}',
      ttlDefault: 300
    },
    auth: {
      type: 'oauth2',
      providers: ['google', 'github', 'email'],
      sessionStrategy: 'jwt',
      secret: '${JWT_SECRET}'
    },
    webhooks: {
      stripe: {
        secret: '${STRIPE_WEBHOOK_SECRET}',
        events: ['invoice.paid', 'invoice.payment_failed', 'customer.subscription.*']
      }
    }
  },
  
  frontend: {
    framework: 'react',
    bundler: 'nextjs',
    style: 'tailwindcss',
    components: 'shadcn',
    theme: {
      mode: 'system',
      primary: '#6366f1',
      accent: '#22c55e'
    },
    layout: {
      type: 'app-shell',
      navigation: [
        { icon: 'layout-dashboard', label: 'Dashboard', path: '/dashboard' },
        { icon: 'users', label: 'Team', path: '/team' },
        { icon: 'credit-card', label: 'Billing', path: '/billing' },
        { icon: 'settings', label: 'Settings', path: '/settings' }
      ]
    },
    pages: {
      public: ['/', '/login', '/signup', '/pricing'],
      protected: ['/dashboard/*', '/team/*', '/billing/*', '/settings/*']
    }
  },
  
  sources: [
    {
      name: 'stripeApi',
      type: 'rest',
      url: 'https://api.stripe.com/v1',
      auth: 'bearer',
      cacheDuration: '5m'
    },
    {
      name: 'authProvider',
      type: 'rest',
      url: '${AUTH_PROVIDER_URL}',
      auth: 'oauth2'
    }
  ],
  
  entities: [Organization, User, Subscription, Invoice, Usage, AuditLog],
  events,
  pipelines,
  alerts,
  dashboards,
  workflows,
  api,
  env,
  
  docker: {
    services: [
      { name: 'app', build: '.', ports: ['3000:3000'], envFile: '.env', dependsOn: ['postgres', 'redis'] },
      { name: 'postgres', image: 'postgres:15-alpine', volumes: ['postgres_data:/var/lib/postgresql/data'], env: { POSTGRES_DB: 'saas', POSTGRES_USER: 'saas', POSTGRES_PASSWORD: '${DB_PASSWORD}' } },
      { name: 'redis', image: 'redis:7-alpine', volumes: ['redis_data:/data'] }
    ],
    volumes: ['postgres_data', 'redis_data']
  },
  
  config: {
    billing: {
      currency: 'USD',
      trialDays: 14,
      gracePeriodDays: 3,
      dunningRetries: 3
    },
    limits: {
      free_apiCalls: 1000,
      starter_apiCalls: 10000,
      pro_apiCalls: 100000,
      enterprise_apiCalls: -1
    }
  }
};

export default contract;
