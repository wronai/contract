/**
 * Analytics Dashboard - Reclapp TypeScript Contract
 * 
 * Web-based real-time analytics dashboard.
 * 
 * @version 1.0.0
 */

import type { ReclappContract, Entity, Event, Pipeline, Alert, Dashboard, ApiConfig, WebSocketConfig, EnvVar } from '../../../contracts/dsl-types';

// ============================================================================
// ENTITIES
// ============================================================================

const Project: Entity = {
  name: 'Project',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'apiKey', type: 'String', annotations: { unique: true, generated: true } },
    { name: 'domain', type: 'String', array: true },
    { name: 'ownerId', type: 'String' },
    { name: 'settings', type: 'JSON', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const AnalyticsEvent: Entity = {
  name: 'Event',
  fields: [
    { name: 'projectId', type: 'String', annotations: { relation: 'Project' } },
    { name: 'name', type: 'String' },
    { name: 'properties', type: 'JSON', nullable: true },
    { name: 'userId', type: 'String', nullable: true },
    { name: 'sessionId', type: 'String' },
    { name: 'timestamp', type: 'DateTime' }
  ],
  indexes: [{ fields: ['projectId', 'name', 'timestamp'] }],
  partition: { field: 'timestamp', type: 'day' }
};

const PageView: Entity = {
  name: 'PageView',
  fields: [
    { name: 'projectId', type: 'String', annotations: { relation: 'Project' } },
    { name: 'path', type: 'String' },
    { name: 'referrer', type: 'String', nullable: true },
    { name: 'userId', type: 'String', nullable: true },
    { name: 'sessionId', type: 'String' },
    { name: 'duration', type: 'Int', nullable: true },
    { name: 'timestamp', type: 'DateTime' }
  ],
  indexes: [{ fields: ['projectId', 'path', 'timestamp'] }],
  partition: { field: 'timestamp', type: 'day' }
};

const User: Entity = {
  name: 'User',
  fields: [
    { name: 'projectId', type: 'String', annotations: { relation: 'Project' } },
    { name: 'externalId', type: 'String' },
    { name: 'properties', type: 'JSON', nullable: true },
    { name: 'firstSeen', type: 'DateTime' },
    { name: 'lastSeen', type: 'DateTime' },
    { name: 'sessionCount', type: 'Int' },
    { name: 'eventCount', type: 'Int' }
  ],
  indexes: [{ fields: ['projectId', 'externalId'], unique: true }]
};

const Session: Entity = {
  name: 'Session',
  fields: [
    { name: 'projectId', type: 'String', annotations: { relation: 'Project' } },
    { name: 'userId', type: 'String', nullable: true },
    { name: 'startTime', type: 'DateTime' },
    { name: 'endTime', type: 'DateTime', nullable: true },
    { name: 'pageViews', type: 'Int' },
    { name: 'events', type: 'Int' },
    { name: 'device', type: 'JSON', nullable: true },
    { name: 'location', type: 'JSON', nullable: true }
  ],
  indexes: [{ fields: ['projectId', 'startTime'] }]
};

const Funnel: Entity = {
  name: 'Funnel',
  fields: [
    { name: 'projectId', type: 'String', annotations: { relation: 'Project' } },
    { name: 'name', type: 'String' },
    { name: 'steps', type: 'JSON' },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Report: Entity = {
  name: 'Report',
  fields: [
    { name: 'projectId', type: 'String', annotations: { relation: 'Project' } },
    { name: 'name', type: 'String' },
    { name: 'type', type: 'String' },
    { name: 'config', type: 'JSON' },
    { name: 'schedule', type: 'String', nullable: true },
    { name: 'lastRun', type: 'DateTime', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const AlertRule: Entity = {
  name: 'AlertRule',
  fields: [
    { name: 'projectId', type: 'String', annotations: { relation: 'Project' } },
    { name: 'name', type: 'String' },
    { name: 'metric', type: 'String' },
    { name: 'condition', type: 'String' },
    { name: 'threshold', type: 'Decimal' },
    { name: 'windowMinutes', type: 'Int' },
    { name: 'channels', type: 'String', array: true },
    { name: 'isActive', type: 'Boolean' },
    { name: 'lastTriggered', type: 'DateTime', nullable: true }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  { name: 'EventReceived', fields: [
    { name: 'projectId', type: 'String' }, { name: 'eventName', type: 'String' },
    { name: 'userId', type: 'String', nullable: true }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'ThresholdBreached', fields: [
    { name: 'alertRuleId', type: 'String' }, { name: 'metric', type: 'String' },
    { name: 'currentValue', type: 'Decimal' }, { name: 'threshold', type: 'Decimal' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'ReportGenerated', fields: [
    { name: 'reportId', type: 'String' }, { name: 'projectId', type: 'String' },
    { name: 'downloadUrl', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]}
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  { name: 'EventIngestion', input: 'eventStream.events', transform: ['validate', 'enrich', 'deduplicate', 'store'], output: ['clickhouseDb', 'realtimeMetrics'], mode: 'streaming', parallelism: 4 },
  { name: 'MetricsAggregation', input: ['Event.stream', 'PageView.stream'], transform: ['aggregate', 'rollup', 'materialize'], output: ['metricsStore', 'dashboard'], schedule: '*/1 * * * *' },
  { name: 'FunnelAnalysis', input: 'Funnel.definition', transform: ['querySteps', 'calculateConversion', 'generateInsights'], output: ['funnelResults', 'recommendations'], onDemand: true },
  { name: 'ReportGeneration', input: 'Report.scheduled', transform: ['fetchData', 'aggregate', 'format', 'export'], output: ['reports', 'notifications'], schedule: '0 8 * * *' },
  { name: 'AlertEvaluation', input: ['metricsStore', 'AlertRule.active'], transform: ['evaluateConditions', 'checkCooldown', 'notify'], output: ['alerts', 'notifications'], schedule: '*/5 * * * *' }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  { name: 'Traffic Spike', entity: 'PageView', condition: 'rate(5m) > avgRate(1h) * 2', target: ['slack', 'email'], severity: 'high', cooldown: '15m' },
  { name: 'Error Rate High', entity: 'Event', condition: 'name == "error" AND rate(5m) > 10', target: ['slack', 'pagerduty'], severity: 'critical', cooldown: '10m' },
  { name: 'Conversion Drop', entity: 'Funnel', condition: 'conversionRate(24h) < conversionRate(7d) * 0.8', target: ['email'], severity: 'medium' }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  {
    name: 'Overview',
    metrics: ['activeUsers', 'pageViews', 'events', 'sessions', 'avgSessionDuration', 'bounceRate'],
    streamMode: 'realtime',
    layout: 'grid',
    widgets: [
      { type: 'stat', title: 'Active Users', metric: 'activeUsers', sparkline: true, compare: 'yesterday' },
      { type: 'stat', title: 'Page Views', metric: 'pageViews', sparkline: true, compare: 'yesterday' },
      { type: 'stat', title: 'Events', metric: 'events', sparkline: true },
      { type: 'stat', title: 'Bounce Rate', metric: 'bounceRate', format: 'percent', colorCoded: true },
      { type: 'chart', title: 'Traffic', metric: 'trafficOverTime', chartType: 'area', span: 2 },
      { type: 'chart', title: 'Top Pages', metric: 'topPages', chartType: 'bar' },
      { type: 'map', title: 'Users by Location', metric: 'usersByCountry' },
      { type: 'table', title: 'Live Feed', entity: 'Event', stream: true, limit: 10 }
    ],
    filters: [
      { name: 'dateRange', type: 'date-range', default: 'last7days' },
      { name: 'device', type: 'select', options: ['all', 'desktop', 'mobile', 'tablet'] }
    ]
  },
  { name: 'Users', entity: 'User', metrics: ['totalUsers', 'newUsers', 'returningUsers', 'userRetention', 'cohortAnalysis'], layout: 'tabs',
    tabs: [{ name: 'Overview', widgets: ['userGrowth', 'userStats'] }, { name: 'Retention', widgets: ['retentionChart', 'cohortTable'] }, { name: 'Segments', widgets: ['userSegments', 'segmentComparison'] }] },
  { name: 'Events', entity: 'Event', metrics: ['totalEvents', 'uniqueEvents', 'eventsByName', 'eventTrend'], streamMode: 'realtime',
    widgets: [{ type: 'chart', title: 'Events Over Time', metric: 'eventTrend', chartType: 'line' }, { type: 'table', title: 'Event Breakdown', metric: 'eventsByName', sortable: true }, { type: 'sankey', title: 'Event Flow', metric: 'eventSequence' }] },
  { name: 'Funnels', entity: 'Funnel', widgets: [{ type: 'funnel', title: 'Conversion Funnel', interactive: true }, { type: 'table', title: 'Step Breakdown', columns: ['step', 'users', 'conversion', 'dropoff'] }] }
];

// ============================================================================
// API
// ============================================================================

const api: ApiConfig = {
  version: 'v1',
  prefix: '/api/v1',
  resources: [
    { name: 'projects', entity: 'Project', operations: ['list', 'get', 'create', 'update', 'delete'], auth: 'required', rateLimit: 100 },
    { name: 'events', entity: 'Event', actions: [
      { name: 'track', method: 'POST', path: '/track', auth: 'apiKey', rateLimit: 10000, input: { name: 'String', properties: 'JSON', userId: 'String', timestamp: 'DateTime' } },
      { name: 'batch', method: 'POST', path: '/batch', auth: 'apiKey', rateLimit: 1000, input: { events: 'Event[]' } },
      { name: 'query', method: 'POST', path: '/query', auth: 'required', input: { query: 'String', params: 'JSON', format: 'String' } }
    ]},
    { name: 'metrics', actions: [
      { name: 'realtime', method: 'GET', path: '/realtime', auth: 'required', websocket: true },
      { name: 'aggregate', method: 'POST', path: '/aggregate', auth: 'required', input: { metrics: 'String[]', groupBy: 'String[]', filters: 'JSON', dateRange: 'JSON' } }
    ]},
    { name: 'funnels', entity: 'Funnel', operations: ['list', 'get', 'create', 'update', 'delete'], auth: 'required', actions: [{ name: 'analyze', method: 'POST', path: '/:id/analyze', input: { dateRange: 'JSON', filters: 'JSON' } }] },
    { name: 'reports', entity: 'Report', operations: ['list', 'get', 'create', 'update', 'delete'], auth: 'required', actions: [{ name: 'generate', method: 'POST', path: '/:id/generate' }, { name: 'download', method: 'GET', path: '/:id/download', output: 'file' }] },
    { name: 'alerts', entity: 'AlertRule', operations: ['list', 'get', 'create', 'update', 'delete'], auth: 'required' }
  ]
};

// ============================================================================
// WEBSOCKET
// ============================================================================

const websocket: WebSocketConfig = {
  name: 'realtime',
  auth: 'apiKey',
  channels: [
    { name: 'metrics', subscribe: true, publish: false, data: { metric: 'String', value: 'Decimal', timestamp: 'DateTime' } },
    { name: 'events', subscribe: true, publish: false, data: 'Event' },
    { name: 'alerts', subscribe: true, publish: false, data: 'ThresholdBreached' }
  ],
  heartbeat: 30000,
  reconnect: true
};

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
  { name: 'REDIS_URL', type: 'String', required: true, secret: true },
  { name: 'CLICKHOUSE_URL', type: 'String', required: true, secret: true },
  { name: 'KAFKA_BROKERS', type: 'String', required: true },
  { name: 'JWT_SECRET', type: 'String', required: true, secret: true },
  { name: 'APP_DOMAIN', type: 'String', required: true },
  { name: 'HOSTING_PROVIDER', type: 'String', default: 'vercel' },
  { name: 'DEPLOY_REGION', type: 'String', default: 'eu-central-1' },
  { name: 'EXTERNAL_API_URL', type: 'String' }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: { name: 'Analytics Dashboard', version: '1.0.0', description: 'Real-time analytics dashboard for business metrics', author: 'Reclapp Team', license: 'MIT' },
  
  deployment: {
    type: 'web', framework: 'nextjs',
    build: { outputDir: 'target', nodeVersion: '18', outputMode: 'standalone' },
    hosting: { provider: 'vercel', region: 'eu-central-1', domain: { primary: '${APP_DOMAIN}', redirectWww: true }, ssl: { enabled: true, provider: 'auto' } },
    scaling: { minInstances: 1, maxInstances: 10, autoScale: true },
    cdn: { enabled: true, cacheStatic: '31536000', cacheApi: '0' }
  },
  
  backend: {
    runtime: 'node', framework: 'nextjs-api-routes',
    database: { type: 'postgres', url: '${DATABASE_URL}', poolSize: 10, ssl: true },
    cache: { type: 'redis', url: '${REDIS_URL}', ttlDefault: 300 },
    auth: { type: 'oauth2', providers: ['google', 'github'], sessionStrategy: 'jwt', secret: '${JWT_SECRET}' },
    queue: { type: 'redis', concurrency: 5 }
  },
  
  frontend: {
    framework: 'react', bundler: 'nextjs', style: 'tailwindcss', components: 'shadcn',
    theme: { mode: 'dark', primary: '#6366f1', accent: '#22c55e', charts: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'] },
    layout: { type: 'dashboard', sidebar: true, header: true, navigation: [
      { icon: 'layout-dashboard', label: 'Overview', path: '/' },
      { icon: 'users', label: 'Users', path: '/users' },
      { icon: 'activity', label: 'Events', path: '/events' },
      { icon: 'bar-chart-3', label: 'Reports', path: '/reports' },
      { icon: 'bell', label: 'Alerts', path: '/alerts' },
      { icon: 'settings', label: 'Settings', path: '/settings' }
    ]},
    ssr: true, streaming: true, prefetch: true
  },
  
  sources: [
    { name: 'clickhouseDb', type: 'clickhouse', url: '${CLICKHOUSE_URL}', database: 'analytics' },
    { name: 'eventStream', type: 'kafka', brokers: '${KAFKA_BROKERS}', topics: ['events', 'page_views', 'conversions'] },
    { name: 'externalApi', type: 'rest', url: '${EXTERNAL_API_URL}', auth: 'bearer', cacheDuration: '5m' }
  ],
  
  entities: [Project, AnalyticsEvent, PageView, User, Session, Funnel, Report, AlertRule],
  events, pipelines, alerts, dashboards, api, websocket, env,
  
  docker: {
    services: [
      { name: 'app', build: '.', ports: ['3000:3000'], envFile: '.env', dependsOn: ['postgres', 'redis'] },
      { name: 'postgres', image: 'postgres:15-alpine', volumes: ['postgres_data:/var/lib/postgresql/data'], env: { POSTGRES_DB: 'analytics', POSTGRES_USER: 'app', POSTGRES_PASSWORD: '${DB_PASSWORD}' } },
      { name: 'redis', image: 'redis:7-alpine', volumes: ['redis_data:/data'] },
      { name: 'clickhouse', image: 'clickhouse/clickhouse-server:latest', ports: ['8123:8123'], volumes: ['clickhouse_data:/var/lib/clickhouse'] }
    ],
    volumes: ['postgres_data', 'redis_data', 'clickhouse_data']
  },
  
  config: {
    analytics: { retentionDays: 365, sampleRate: 1.0, sessionTimeout: 1800000, maxEventsPerSecond: 10000 },
    export: { formats: ['csv', 'json', 'pdf'], maxRows: 1000000, compression: true }
  }
};

export default contract;
