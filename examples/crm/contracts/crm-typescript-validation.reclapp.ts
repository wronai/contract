/**
 * CRM System - Reclapp TypeScript Contract
 * 
 * Customer Relationship Management with contacts, deals, and activities.
 * This TypeScript definition is the validated source of truth.
 * 
 * @version 2.4.1
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

const Contact: Entity = {
  name: 'Contact',
  fields: [
    { name: 'email', type: 'String', annotations: { unique: true } },
    { name: 'firstName', type: 'String' },
    { name: 'lastName', type: 'String' },
    { name: 'phone', type: 'String', nullable: true },
    { name: 'company', type: 'String', nullable: true },
    { name: 'jobTitle', type: 'String', nullable: true },
    { name: 'linkedInUrl', type: 'String', nullable: true },
    { name: 'source', type: 'String' },
    { name: 'status', type: 'String' },
    { name: 'ownerId', type: 'String' },
    { name: 'tags', type: 'String', array: true, nullable: true },
    { name: 'customFields', type: 'JSON', nullable: true },
    { name: 'lastContactedAt', type: 'DateTime', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Company: Entity = {
  name: 'Company',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'domain', type: 'String', nullable: true, annotations: { unique: true } },
    { name: 'industry', type: 'String', nullable: true },
    { name: 'size', type: 'String', nullable: true },
    { name: 'revenue', type: 'String', nullable: true },
    { name: 'website', type: 'String', nullable: true },
    { name: 'phone', type: 'String', nullable: true },
    { name: 'address', type: 'JSON', nullable: true },
    { name: 'ownerId', type: 'String' },
    { name: 'status', type: 'String' },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Deal: Entity = {
  name: 'Deal',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'companyId', type: 'String', nullable: true },
    { name: 'contactId', type: 'String', nullable: true },
    { name: 'ownerId', type: 'String' },
    { name: 'stage', type: 'String' },
    { name: 'amount', type: 'Decimal' },
    { name: 'currency', type: 'String' },
    { name: 'probability', type: 'Int' },
    { name: 'expectedCloseDate', type: 'DateTime', nullable: true },
    { name: 'actualCloseDate', type: 'DateTime', nullable: true },
    { name: 'lostReason', type: 'String', nullable: true },
    { name: 'notes', type: 'String', nullable: true },
    { name: 'customFields', type: 'JSON', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Activity: Entity = {
  name: 'Activity',
  fields: [
    { name: 'type', type: 'String' },
    { name: 'subject', type: 'String' },
    { name: 'description', type: 'String', nullable: true },
    { name: 'contactId', type: 'String', nullable: true },
    { name: 'companyId', type: 'String', nullable: true },
    { name: 'dealId', type: 'String', nullable: true },
    { name: 'ownerId', type: 'String' },
    { name: 'dueDate', type: 'DateTime', nullable: true },
    { name: 'completedAt', type: 'DateTime', nullable: true },
    { name: 'outcome', type: 'String', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Task: Entity = {
  name: 'Task',
  fields: [
    { name: 'title', type: 'String' },
    { name: 'description', type: 'String', nullable: true },
    { name: 'contactId', type: 'String', nullable: true },
    { name: 'dealId', type: 'String', nullable: true },
    { name: 'assignedTo', type: 'String' },
    { name: 'dueDate', type: 'DateTime' },
    { name: 'priority', type: 'String' },
    { name: 'status', type: 'String' },
    { name: 'completedAt', type: 'DateTime', nullable: true }
  ]
};

const Pipeline: Entity = {
  name: 'Pipeline',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'stages', type: 'JSON' },
    { name: 'defaultStage', type: 'String' },
    { name: 'isDefault', type: 'Boolean' },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  {
    name: 'ContactCreated',
    fields: [
      { name: 'contactId', type: 'String' },
      { name: 'source', type: 'String' },
      { name: 'ownerId', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'DealStageChanged',
    fields: [
      { name: 'dealId', type: 'String' },
      { name: 'previousStage', type: 'String' },
      { name: 'newStage', type: 'String' },
      { name: 'ownerId', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'DealWon',
    fields: [
      { name: 'dealId', type: 'String' },
      { name: 'amount', type: 'Decimal' },
      { name: 'ownerId', type: 'String' },
      { name: 'daysInPipeline', type: 'Int' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'DealLost',
    fields: [
      { name: 'dealId', type: 'String' },
      { name: 'amount', type: 'Decimal' },
      { name: 'reason', type: 'String' },
      { name: 'ownerId', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'TaskCompleted',
    fields: [
      { name: 'taskId', type: 'String' },
      { name: 'assignedTo', type: 'String' },
      { name: 'dealId', type: 'String', nullable: true },
      { name: 'timestamp', type: 'DateTime' }
    ]
  }
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  {
    name: 'LeadScoring',
    input: ['ContactCreated.stream', 'Activity.stream', 'Email.stream'],
    transform: ['calculateEngagement', 'scoreLeads', 'rankContacts'],
    output: ['dashboard', 'recommendations'],
    schedule: '0 * * * *'
  },
  {
    name: 'DealForecasting',
    input: ['Deal.changes', 'DealStageChanged.stream'],
    transform: ['analyzeHistory', 'predictOutcome', 'updateForecast'],
    output: ['dashboard', 'reports'],
    schedule: '0 0 * * *'
  },
  {
    name: 'ActivityTracking',
    input: ['Email.stream', 'Meeting.stream', 'Activity.stream'],
    transform: ['aggregate', 'enrichContact', 'updateTimeline'],
    output: ['contactProfile', 'analytics']
  }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  {
    name: 'Deal Stalled',
    entity: 'Deal',
    condition: 'daysInStage > 14 AND stage != "Closed Won" AND stage != "Closed Lost"',
    target: ['email', 'slack'],
    severity: 'medium'
  },
  {
    name: 'High Value Deal at Risk',
    entity: 'Deal',
    condition: 'amount > 50000 AND probability < 30',
    target: ['slack', 'email'],
    severity: 'high'
  },
  {
    name: 'No Activity Warning',
    entity: 'Contact',
    condition: 'daysSinceLastContact > 30 AND status == "active"',
    target: ['email'],
    severity: 'low'
  },
  {
    name: 'Task Overdue',
    entity: 'Task',
    condition: 'dueDate < now() AND status != "completed"',
    target: ['email', 'push'],
    severity: 'medium'
  }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  {
    name: 'Sales Pipeline',
    entity: 'Deal',
    metrics: ['totalPipelineValue', 'dealsByStage', 'avgDealSize', 'winRate', 'avgSalesCycle'],
    streamMode: 'realtime',
    layout: 'grid'
  },
  {
    name: 'Sales Forecast',
    entity: 'Deal',
    metrics: ['forecastedRevenue', 'bestCase', 'worstCase', 'committed', 'upside'],
    layout: 'grid'
  },
  {
    name: 'Team Performance',
    entity: 'Team',
    metrics: ['revenueByRep', 'activitiesByRep', 'quotaAttainment', 'leaderboard'],
    layout: 'tabs'
  },
  {
    name: 'Contact Insights',
    entity: 'Contact',
    metrics: ['totalContacts', 'leadsBySource', 'conversionRate', 'topLeads'],
    layout: 'grid'
  }
];

// ============================================================================
// WORKFLOWS
// ============================================================================

const workflows: Workflow[] = [
  {
    name: 'LeadNurturing',
    trigger: 'ContactCreated.event',
    steps: [
      { name: 'assignOwner', action: 'roundRobinAssign', onSuccess: 'sendWelcome' },
      { name: 'sendWelcome', action: 'sendEmail', onSuccess: 'scheduleFollowUp' },
      { name: 'scheduleFollowUp', action: 'createTask', onSuccess: 'monitorEngagement' },
      { name: 'monitorEngagement', action: 'trackActivity', onSuccess: 'qualifyLead', onFailure: 'sendReengagement', timeout: '7d' }
    ]
  },
  {
    name: 'DealClosing',
    trigger: 'Deal.stageChanged',
    filter: 'newStage == "Negotiation"',
    steps: [
      { name: 'prepareProposal', action: 'generateProposal', onSuccess: 'sendProposal' },
      { name: 'sendProposal', action: 'sendEmail', onSuccess: 'trackProposal' },
      { name: 'followUp', action: 'scheduleCall', onSuccess: 'closeOrLose', timeout: '3d' }
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
      name: 'contacts',
      entity: 'Contact',
      operations: ['list', 'get', 'create', 'update', 'delete'],
      auth: 'required'
    },
    {
      name: 'companies',
      entity: 'Company',
      operations: ['list', 'get', 'create', 'update', 'delete'],
      auth: 'required'
    },
    {
      name: 'deals',
      entity: 'Deal',
      operations: ['list', 'get', 'create', 'update', 'delete'],
      auth: 'required',
      actions: [
        { name: 'changeStage', method: 'PATCH', path: '/:id/stage', input: { stage: 'String' } }
      ]
    },
    {
      name: 'activities',
      entity: 'Activity',
      operations: ['list', 'get', 'create', 'update'],
      auth: 'required'
    },
    {
      name: 'tasks',
      entity: 'Task',
      operations: ['list', 'get', 'create', 'update'],
      auth: 'required',
      actions: [
        { name: 'complete', method: 'PATCH', path: '/:id/complete' }
      ]
    },
    {
      name: 'metrics',
      actions: [
        { name: 'dashboard', method: 'GET', path: '/' },
        { name: 'forecast', method: 'GET', path: '/forecast' }
      ]
    }
  ]
};

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'API_PORT', type: 'Int', default: 8080 },
  { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
  { name: 'JWT_SECRET', type: 'String', required: true, secret: true },
  { name: 'EMAIL_API_URL', type: 'String' },
  { name: 'EMAIL_API_KEY', type: 'String', secret: true },
  { name: 'FRONTEND_URL', type: 'String', default: 'http://localhost:3000' },
  { name: 'APP_DOMAIN', type: 'String', default: 'localhost' },
  { name: 'HOSTING_PROVIDER', type: 'String', default: 'docker' }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: {
    name: 'CRM System',
    version: '2.4.1',
    description: 'Customer Relationship Management with contacts, deals, and activities',
    author: 'Reclapp Team',
    license: 'MIT'
  },
  
  deployment: {
    type: 'web',
    framework: 'nextjs',
    build: {
      outputDir: 'target',
      nodeVersion: '18'
    },
    hosting: {
      provider: 'docker',
      domain: { primary: '${APP_DOMAIN}' }
    }
  },
  
  backend: {
    runtime: 'node',
    framework: 'express',
    port: '${API_PORT:8080}',
    database: {
      type: 'postgres',
      url: '${DATABASE_URL}',
      poolSize: 10
    },
    auth: {
      type: 'jwt',
      secret: '${JWT_SECRET}',
      expiry: '24h'
    },
    cors: {
      origins: ['${FRONTEND_URL}'],
      credentials: true
    }
  },
  
  frontend: {
    framework: 'react',
    bundler: 'vite',
    style: 'tailwindcss',
    components: 'shadcn',
    theme: {
      mode: 'light',
      primary: '#3b82f6'
    },
    layout: {
      type: 'sidebar',
      navigation: [
        { icon: 'home', label: 'Dashboard', path: '/' },
        { icon: 'users', label: 'Contacts', path: '/contacts' },
        { icon: 'building', label: 'Companies', path: '/companies' },
        { icon: 'dollar-sign', label: 'Deals', path: '/deals' },
        { icon: 'calendar', label: 'Activities', path: '/activities' },
        { icon: 'check-square', label: 'Tasks', path: '/tasks' },
        { icon: 'bar-chart', label: 'Reports', path: '/reports' }
      ]
    }
  },
  
  sources: [
    {
      name: 'linkedInApi',
      type: 'rest',
      url: 'https://api.linkedin.com/v2',
      auth: 'oauth2',
      cacheDuration: '1h'
    },
    {
      name: 'emailProvider',
      type: 'rest',
      url: '${EMAIL_API_URL}',
      auth: 'apiKey'
    }
  ],
  
  entities: [Contact, Company, Deal, Activity, Task, Pipeline],
  events,
  pipelines,
  alerts,
  dashboards,
  workflows,
  api,
  env,
  
  docker: {
    services: [
      { name: 'api', build: './backend', ports: ['8080:8080'], envFile: '.env', dependsOn: ['postgres'] },
      { name: 'dashboard', build: './frontend', ports: ['3000:3000'], dependsOn: ['api'] },
      { name: 'postgres', image: 'postgres:15-alpine', volumes: ['postgres_data:/var/lib/postgresql/data'], env: { POSTGRES_DB: 'crm', POSTGRES_USER: 'crm', POSTGRES_PASSWORD: '${DB_PASSWORD}' } }
    ],
    volumes: ['postgres_data']
  },
  
  config: {
    sales: {
      defaultCurrency: 'USD',
      fiscalYearStart: '01-01',
      quotaPeriod: 'monthly'
    },
    pipeline: {
      defaultStages: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      staleDealDays: 14,
      autoArchiveDays: 90
    },
    scoring: {
      emailOpenWeight: 5,
      emailClickWeight: 10,
      meetingWeight: 20,
      callWeight: 15,
      websiteVisitWeight: 3
    }
  }
};

export default contract;
