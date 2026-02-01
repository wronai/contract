/**
 * Analytics & Reporting - Reclapp TypeScript Contract
 * 
 * Comprehensive reporting and analytics system with KPIs and trends.
 * 
 * @version 2.4.1
 */

import type { ReclappContract, Entity, Event, Pipeline, Alert, Dashboard, EnvVar } from '../../../contracts/dsl-types';

// ============================================================================
// ENTITIES
// ============================================================================

const Report: Entity = {
  name: 'Report',
  fields: [
    { name: 'name', type: 'String', annotations: { required: true } },
    { name: 'type', type: 'String', annotations: { required: true, enum: ['portfolio', 'risk', 'financial', 'trend', 'custom'] } },
    { name: 'description', type: 'String', nullable: true },
    { name: 'parameters', type: 'JSON', nullable: true },
    { name: 'schedule', type: 'String', nullable: true },
    { name: 'recipients', type: 'JSON', nullable: true },
    { name: 'format', type: 'String', annotations: { enum: ['pdf', 'xlsx', 'html', 'json'], default: 'pdf' } },
    { name: 'lastGeneratedAt', type: 'DateTime', nullable: true },
    { name: 'status', type: 'String', annotations: { enum: ['active', 'paused', 'archived'], default: 'active' } },
    { name: 'createdBy', type: 'String', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const ReportExecution: Entity = {
  name: 'ReportExecution',
  fields: [
    { name: 'reportId', type: 'UUID', annotations: { required: true } },
    { name: 'status', type: 'String', annotations: { enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' } },
    { name: 'startedAt', type: 'DateTime', nullable: true },
    { name: 'completedAt', type: 'DateTime', nullable: true },
    { name: 'duration', type: 'Int', nullable: true },
    { name: 'outputUrl', type: 'URL', nullable: true },
    { name: 'error', type: 'String', nullable: true },
    { name: 'metadata', type: 'JSON', nullable: true }
  ]
};

const KPI: Entity = {
  name: 'KPI',
  fields: [
    { name: 'name', type: 'String', annotations: { required: true, unique: true } },
    { name: 'description', type: 'String', nullable: true },
    { name: 'formula', type: 'String', annotations: { required: true } },
    { name: 'unit', type: 'String', nullable: true },
    { name: 'target', type: 'Float', nullable: true },
    { name: 'warningThreshold', type: 'Float', nullable: true },
    { name: 'criticalThreshold', type: 'Float', nullable: true },
    { name: 'category', type: 'String', nullable: true },
    { name: 'enabled', type: 'Boolean', annotations: { default: true } }
  ]
};

const KPIValue: Entity = {
  name: 'KPIValue',
  fields: [
    { name: 'kpiId', type: 'UUID', annotations: { required: true } },
    { name: 'value', type: 'Float', annotations: { required: true } },
    { name: 'period', type: 'String', annotations: { required: true } },
    { name: 'periodStart', type: 'DateTime', annotations: { required: true } },
    { name: 'periodEnd', type: 'DateTime', annotations: { required: true } },
    { name: 'trend', type: 'String', annotations: { enum: ['up', 'down', 'stable'] }, nullable: true },
    { name: 'changePercent', type: 'Float', nullable: true },
    { name: 'metadata', type: 'JSON', nullable: true },
    { name: 'calculatedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const TrendAnalysis: Entity = {
  name: 'TrendAnalysis',
  fields: [
    { name: 'entityType', type: 'String', annotations: { required: true } },
    { name: 'metricName', type: 'String', annotations: { required: true } },
    { name: 'periodType', type: 'String', annotations: { enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] } },
    { name: 'direction', type: 'String', annotations: { enum: ['increasing', 'decreasing', 'stable', 'volatile'] } },
    { name: 'strength', type: 'Float', nullable: true },
    { name: 'confidence', type: 'Float', nullable: true },
    { name: 'forecast', type: 'JSON', nullable: true },
    { name: 'insights', type: 'JSON', nullable: true },
    { name: 'calculatedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const Benchmark: Entity = {
  name: 'Benchmark',
  fields: [
    { name: 'industry', type: 'String', annotations: { required: true } },
    { name: 'metricName', type: 'String', annotations: { required: true } },
    { name: 'year', type: 'Int', annotations: { required: true } },
    { name: 'percentile25', type: 'Float', nullable: true },
    { name: 'percentile50', type: 'Float', nullable: true },
    { name: 'percentile75', type: 'Float', nullable: true },
    { name: 'percentile90', type: 'Float', nullable: true },
    { name: 'average', type: 'Float', nullable: true },
    { name: 'sampleSize', type: 'Int', nullable: true },
    { name: 'source', type: 'String', nullable: true },
    { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  { name: 'ReportGenerated', fields: [
    { name: 'reportId', type: 'UUID' }, { name: 'executionId', type: 'UUID' },
    { name: 'reportName', type: 'String' }, { name: 'format', type: 'String' },
    { name: 'outputUrl', type: 'URL' }, { name: 'duration', type: 'Int' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'ReportFailed', fields: [
    { name: 'reportId', type: 'UUID' }, { name: 'executionId', type: 'UUID' },
    { name: 'error', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'KPICalculated', fields: [
    { name: 'kpiId', type: 'UUID' }, { name: 'kpiName', type: 'String' },
    { name: 'value', type: 'Float' }, { name: 'previousValue', type: 'Float' },
    { name: 'changePercent', type: 'Float' }, { name: 'period', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'KPIThresholdBreached', fields: [
    { name: 'kpiId', type: 'UUID' }, { name: 'kpiName', type: 'String' },
    { name: 'value', type: 'Float' }, { name: 'threshold', type: 'Float' },
    { name: 'thresholdType', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]},
  { name: 'TrendDetected', fields: [
    { name: 'entityType', type: 'String' }, { name: 'metricName', type: 'String' },
    { name: 'direction', type: 'String' }, { name: 'strength', type: 'Float' },
    { name: 'insight', type: 'String' }, { name: 'timestamp', type: 'DateTime' }
  ]}
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  { name: 'DailyKPICalculation', input: ['customers', 'contractors', 'riskEvents', 'orders'], transform: ['calculateKPIs', 'compareToPrevious', 'detectThresholdBreaches'], output: ['kpiValues', 'alerts', 'dashboard'], schedule: '0 1 * * *' },
  { name: 'WeeklyTrendAnalysis', input: 'kpiValues.last90days', transform: ['analyzeTrends', 'generateForecasts', 'extractInsights'], output: ['trendAnalysis', 'reports'], schedule: '0 2 * * 1' },
  { name: 'MonthlyBenchmarking', input: ['customers', 'contractors', 'industryBenchmarks'], transform: ['calculatePercentiles', 'compareToIndustry', 'generateInsights'], output: ['benchmarkComparison', 'reports'], schedule: '0 3 1 * *' },
  { name: 'ReportGeneration', input: 'reports.scheduled', transform: ['fetchData', 'applyTemplate', 'renderOutput', 'distribute'], output: ['reportExecutions', 'notifications'] },
  { name: 'PortfolioAnalysis', input: ['customers.active', 'contractors.active'], transform: ['segmentAnalysis', 'riskDistribution', 'valueAnalysis'], output: ['portfolioReport', 'dashboard'], schedule: '0 6 * * *' }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  { name: 'KPI Critical Threshold', entity: 'KPIValue', condition: 'value > kpi.criticalThreshold', target: ['email', 'slack'], severity: 'critical' },
  { name: 'KPI Warning Threshold', entity: 'KPIValue', condition: 'value > kpi.warningThreshold', target: ['email'], severity: 'medium', throttle: '24h' },
  { name: 'Negative Trend Detected', entity: 'TrendAnalysis', condition: 'direction == "decreasing" AND strength > 0.7', target: ['email', 'slack'], severity: 'high' },
  { name: 'Report Generation Failed', entity: 'ReportExecution', condition: 'status == "failed"', target: ['email'], severity: 'high' },
  { name: 'Below Industry Benchmark', entity: 'KPIValue', condition: 'value < benchmark.percentile25', target: ['email'], severity: 'medium', throttle: '7d' }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  { name: 'Executive Summary', entity: 'KPIValue', metrics: ['revenueGrowth', 'customerAcquisition', 'customerRetention', 'contractorPerformance', 'riskExposure', 'profitMargin'], streamMode: 'polling', layout: 'grid' },
  { name: 'KPI Tracker', entity: 'KPIValue', metrics: ['allKPIs', 'trendsLast30Days', 'vsTargets', 'vsLastPeriod', 'topPerformers', 'bottomPerformers'], streamMode: 'realtime', refreshInterval: '5m' },
  { name: 'Trend Analysis', entity: 'TrendAnalysis', metrics: ['trendsByMetric', 'forecastAccuracy', 'anomalyDetection', 'seasonalPatterns'], streamMode: 'polling' },
  { name: 'Industry Comparison', entity: 'Benchmark', metrics: ['vsIndustryAvg', 'percentileRanking', 'gapAnalysis', 'improvementAreas'], streamMode: 'polling' },
  { name: 'Report Center', entity: 'Report', metrics: ['scheduledReports', 'recentExecutions', 'failureRate', 'avgGenerationTime'], streamMode: 'realtime' }
];

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'API_PORT', type: 'Int', default: 8080 },
  { name: 'DATABASE_URL', type: 'String', required: true, secret: true },
  { name: 'JWT_SECRET', type: 'String', required: true, secret: true },
  { name: 'INDUSTRY_BENCHMARKS_API_URL', type: 'String' },
  { name: 'INDUSTRY_BENCHMARKS_API_KEY', type: 'String', secret: true },
  { name: 'EXPORT_BUCKET_URL', type: 'String' },
  { name: 'EXPORT_BUCKET_KEY', type: 'String', secret: true },
  { name: 'EMAIL_API_KEY', type: 'String', secret: true },
  { name: 'SLACK_WEBHOOK_URL', type: 'String', secret: true }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: {
    name: 'Analytics & Reporting',
    version: '2.4.1',
    description: 'Comprehensive reporting and analytics system with KPIs and trends',
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
    theme: { mode: 'light', primary: '#059669' },
    layout: {
      type: 'dashboard',
      navigation: [
        { icon: 'bar-chart-2', label: 'Dashboard', path: '/' },
        { icon: 'target', label: 'KPIs', path: '/kpis' },
        { icon: 'trending-up', label: 'Trends', path: '/trends' },
        { icon: 'file-text', label: 'Reports', path: '/reports' },
        { icon: 'layers', label: 'Benchmarks', path: '/benchmarks' },
        { icon: 'settings', label: 'Settings', path: '/settings' }
      ]
    }
  },
  
  sources: [
    { name: 'industryBenchmarks', type: 'rest', url: '${INDUSTRY_BENCHMARKS_API_URL}', auth: 'apiKey', cacheDuration: '7d' },
    { name: 'marketData', type: 'rest', url: '${MARKET_DATA_API_URL}', auth: 'bearer', cacheDuration: '24h' }
  ],
  
  entities: [Report, ReportExecution, KPI, KPIValue, TrendAnalysis, Benchmark],
  events,
  pipelines,
  alerts,
  dashboards,
  env,
  
  config: {
    reporting: {
      defaultFormat: 'pdf',
      maxReportRows: 100000,
      retentionDays: 365
    },
    kpi: {
      calculationFrequency: 'daily',
      forecastHorizon: 90
    }
  }
};

export default contract;
