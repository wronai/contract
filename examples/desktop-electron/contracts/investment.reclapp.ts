/**
 * Investment Portfolio Manager - Reclapp TypeScript Contract
 * 
 * Desktop Electron application for investment tracking and analysis.
 * 
 * @version 1.0.0
 */

import type { 
  ReclappContract, 
  Entity, 
  Event, 
  Pipeline, 
  Alert, 
  Dashboard,
  ApiConfig,
  IpcConfig,
  TrayConfig,
  SchedulerConfig,
  EnvVar 
} from '../../../contracts/dsl-types';

// ============================================================================
// ENTITIES
// ============================================================================

const Portfolio: Entity = {
  name: 'Portfolio',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'description', type: 'String', nullable: true },
    { name: 'currency', type: 'String' },
    { name: 'ownerId', type: 'String' },
    { name: 'totalValue', type: 'Decimal', annotations: { computed: true } },
    { name: 'totalCost', type: 'Decimal', annotations: { computed: true } },
    { name: 'unrealizedGain', type: 'Decimal', annotations: { computed: true } },
    { name: 'realizedGain', type: 'Decimal', annotations: { computed: true } },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } },
    { name: 'updatedAt', type: 'DateTime', annotations: { generated: true } }
  ],
  indexes: [{ fields: ['name'] }],
  relations: [{ name: 'holdings', entity: 'Holding', type: 'one-to-many' }]
};

const Holding: Entity = {
  name: 'Holding',
  fields: [
    { name: 'portfolioId', type: 'String', annotations: { relation: 'Portfolio' } },
    { name: 'symbol', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'assetType', type: 'String' },
    { name: 'quantity', type: 'Decimal' },
    { name: 'avgCost', type: 'Decimal' },
    { name: 'currentPrice', type: 'Decimal', nullable: true },
    { name: 'currency', type: 'String' },
    { name: 'sector', type: 'String', nullable: true },
    { name: 'exchange', type: 'String', nullable: true },
    { name: 'lastUpdated', type: 'DateTime', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ],
  indexes: [
    { fields: ['portfolioId', 'symbol'] },
    { fields: ['portfolioId', 'symbol'], unique: true }
  ]
};

const Transaction: Entity = {
  name: 'Transaction',
  fields: [
    { name: 'portfolioId', type: 'String', annotations: { relation: 'Portfolio' } },
    { name: 'holdingId', type: 'String', nullable: true, annotations: { relation: 'Holding' } },
    { name: 'type', type: 'String' },
    { name: 'symbol', type: 'String' },
    { name: 'quantity', type: 'Decimal' },
    { name: 'price', type: 'Decimal' },
    { name: 'fees', type: 'Decimal' },
    { name: 'currency', type: 'String' },
    { name: 'exchangeRate', type: 'Decimal' },
    { name: 'notes', type: 'String', nullable: true },
    { name: 'executedAt', type: 'DateTime' },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ],
  indexes: [{ fields: ['portfolioId', 'executedAt'] }]
};

const Watchlist: Entity = {
  name: 'Watchlist',
  fields: [
    { name: 'name', type: 'String' },
    { name: 'symbols', type: 'String', array: true },
    { name: 'ownerId', type: 'String' },
    { name: 'isDefault', type: 'Boolean' },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const PriceAlert: Entity = {
  name: 'PriceAlert',
  fields: [
    { name: 'symbol', type: 'String' },
    { name: 'condition', type: 'String' },
    { name: 'targetPrice', type: 'Decimal' },
    { name: 'isActive', type: 'Boolean' },
    { name: 'triggeredAt', type: 'DateTime', nullable: true },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

const DividendRecord: Entity = {
  name: 'DividendRecord',
  fields: [
    { name: 'holdingId', type: 'String', annotations: { relation: 'Holding' } },
    { name: 'amount', type: 'Decimal' },
    { name: 'currency', type: 'String' },
    { name: 'exDate', type: 'DateTime' },
    { name: 'payDate', type: 'DateTime' },
    { name: 'reinvested', type: 'Boolean' },
    { name: 'createdAt', type: 'DateTime', annotations: { generated: true } }
  ]
};

// ============================================================================
// EVENTS
// ============================================================================

const events: Event[] = [
  {
    name: 'TransactionExecuted',
    fields: [
      { name: 'transactionId', type: 'String' },
      { name: 'portfolioId', type: 'String' },
      { name: 'type', type: 'String' },
      { name: 'symbol', type: 'String' },
      { name: 'quantity', type: 'Decimal' },
      { name: 'totalValue', type: 'Decimal' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'PriceAlertTriggered',
    fields: [
      { name: 'alertId', type: 'String' },
      { name: 'symbol', type: 'String' },
      { name: 'currentPrice', type: 'Decimal' },
      { name: 'targetPrice', type: 'Decimal' },
      { name: 'condition', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'PortfolioRebalanced',
    fields: [
      { name: 'portfolioId', type: 'String' },
      { name: 'adjustments', type: 'JSON' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'DividendReceived',
    fields: [
      { name: 'holdingId', type: 'String' },
      { name: 'symbol', type: 'String' },
      { name: 'amount', type: 'Decimal' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  },
  {
    name: 'MarketDataUpdated',
    fields: [
      { name: 'symbols', type: 'String', array: true },
      { name: 'source', type: 'String' },
      { name: 'timestamp', type: 'DateTime' }
    ]
  }
];

// ============================================================================
// PIPELINES
// ============================================================================

const pipelines: Pipeline[] = [
  {
    name: 'PriceUpdate',
    input: 'marketDataApi.stream',
    transform: ['fetchPrices', 'updateHoldings', 'calculateValues', 'checkAlerts'],
    output: ['holdings', 'alerts'],
    schedule: '*/5 * * * *'
  },
  {
    name: 'PortfolioValuation',
    input: ['Holding.changes', 'Transaction.stream'],
    transform: ['aggregateHoldings', 'calculateMetrics', 'updatePortfolio'],
    output: ['portfolio', 'dashboard'],
    schedule: '0 * * * *'
  },
  {
    name: 'DividendTracking',
    input: 'marketDataApi.dividends',
    transform: ['matchHoldings', 'recordDividend', 'notifyUser'],
    output: ['dividends', 'notifications'],
    schedule: '0 9 * * *'
  },
  {
    name: 'PerformanceAnalysis',
    input: ['Portfolio.stream', 'Transaction.stream'],
    transform: ['calculateReturns', 'benchmarkComparison', 'riskMetrics'],
    output: ['analytics', 'reports'],
    schedule: '0 0 * * *'
  }
];

// ============================================================================
// ALERTS
// ============================================================================

const alerts: Alert[] = [
  {
    name: 'Price Target Reached',
    entity: 'PriceAlert',
    condition: 'currentPrice >= targetPrice AND condition == "above"',
    target: ['notification', 'sound'],
    severity: 'medium'
  },
  {
    name: 'Stop Loss Triggered',
    entity: 'PriceAlert',
    condition: 'currentPrice <= targetPrice AND condition == "below"',
    target: ['notification', 'sound', 'email'],
    severity: 'high'
  },
  {
    name: 'Large Portfolio Movement',
    entity: 'Portfolio',
    condition: 'abs(dailyChange) > 5',
    target: ['notification'],
    severity: 'high'
  },
  {
    name: 'Dividend Upcoming',
    entity: 'Holding',
    condition: 'daysUntilExDate <= 3',
    target: ['notification'],
    severity: 'low'
  }
];

// ============================================================================
// DASHBOARDS
// ============================================================================

const dashboards: Dashboard[] = [
  {
    name: 'Portfolio Overview',
    entity: 'Portfolio',
    metrics: ['totalValue', 'totalGain', 'totalGainPercent', 'dayChange', 'dayChangePercent', 'allocationByAsset', 'allocationBySector'],
    streamMode: 'realtime',
    layout: 'grid',
    widgets: [
      { type: 'stat', title: 'Total Value', metric: 'totalValue', format: 'currency' },
      { type: 'stat', title: 'Total Gain', metric: 'totalGain', format: 'currency', colorCoded: true },
      { type: 'chart', title: 'Performance', metric: 'valueHistory', chartType: 'line' },
      { type: 'pie', title: 'Allocation', metric: 'allocationByAsset' },
      { type: 'table', title: 'Holdings', entity: 'Holding', columns: ['symbol', 'quantity', 'currentPrice', 'value', 'gainPercent'] }
    ]
  },
  {
    name: 'Analytics',
    entity: 'Portfolio',
    metrics: ['sharpeRatio', 'volatility', 'beta', 'maxDrawdown', 'cagr', 'benchmarkComparison'],
    layout: 'tabs',
    tabs: [
      { name: 'Performance', widgets: ['returns', 'benchmarkChart'] },
      { name: 'Risk', widgets: ['volatilityChart', 'drawdownChart'] },
      { name: 'Dividends', widgets: ['dividendHistory', 'dividendYield'] }
    ]
  },
  {
    name: 'Watchlist',
    entity: 'Watchlist',
    metrics: ['symbolPrices', 'dayChanges', 'volumes'],
    streamMode: 'realtime',
    widgets: [
      { type: 'table', title: 'Watch', columns: ['symbol', 'price', 'change', 'volume'] },
      { type: 'mini-chart', perRow: true }
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
      name: 'portfolios',
      entity: 'Portfolio',
      operations: ['list', 'get', 'create', 'update', 'delete'],
      auth: 'required',
      nested: [
        { name: 'holdings', entity: 'Holding', operations: ['list', 'get', 'create', 'update', 'delete'] },
        { name: 'transactions', entity: 'Transaction', operations: ['list', 'get', 'create'] }
      ],
      actions: [
        { name: 'rebalance', method: 'POST', path: '/:id/rebalance', input: { targetAllocations: 'JSON' }, output: { adjustments: 'JSON' } },
        { name: 'export', method: 'GET', path: '/:id/export', query: { format: 'String', dateFrom: 'DateTime', dateTo: 'DateTime' }, output: 'file' }
      ]
    },
    {
      name: 'watchlists',
      entity: 'Watchlist',
      operations: ['list', 'get', 'create', 'update', 'delete'],
      auth: 'required'
    },
    {
      name: 'alerts',
      entity: 'PriceAlert',
      operations: ['list', 'get', 'create', 'update', 'delete'],
      auth: 'required'
    },
    {
      name: 'market',
      actions: [
        { name: 'quotes', method: 'GET', path: '/quotes', query: { symbols: 'String[]' }, cache: '1m' },
        { name: 'search', method: 'GET', path: '/search', query: { query: 'String', limit: 'Int' } },
        { name: 'history', method: 'GET', path: '/history/:symbol', query: { period: 'String', interval: 'String' }, cache: '5m' }
      ]
    }
  ]
};

// ============================================================================
// IPC CONFIGURATION (Electron)
// ============================================================================

const ipc: IpcConfig = {
  name: 'main_renderer',
  channels: [
    { name: 'portfolio:update', direction: 'main->renderer', data: 'Portfolio' },
    { name: 'price:update', direction: 'main->renderer', data: { symbol: 'String', price: 'Decimal' } },
    { name: 'alert:triggered', direction: 'main->renderer', data: 'PriceAlert' },
    { name: 'notification:show', direction: 'renderer->main', data: { title: 'String', body: 'String' } },
    { name: 'window:minimize-to-tray', direction: 'renderer->main' },
    { name: 'export:start', direction: 'renderer->main', data: { portfolioId: 'String', format: 'String' } },
    { name: 'export:complete', direction: 'main->renderer', data: { path: 'String' } }
  ]
};

// ============================================================================
// TRAY CONFIGURATION
// ============================================================================

const tray: TrayConfig = {
  icon: 'assets/tray-icon.png',
  tooltip: 'Investment Manager',
  menu: [
    { label: 'Open Dashboard', action: 'window:show' },
    { label: 'Quick Stats', submenu: [
      { label: 'Portfolio Value', action: 'stats:value' },
      { label: 'Day Change', action: 'stats:change' }
    ]},
    { type: 'separator' },
    { label: 'Settings', action: 'window:settings' },
    { label: 'Quit', action: 'app:quit' }
  ],
  clickAction: 'window:toggle'
};

// ============================================================================
// SCHEDULER CONFIGURATION
// ============================================================================

const scheduler: SchedulerConfig = {
  tasks: [
    { name: 'price-update', cron: '*/5 * * * *', pipeline: 'PriceUpdate' },
    { name: 'daily-report', cron: '0 18 * * 1-5', action: 'reports:daily' },
    { name: 'weekly-summary', cron: '0 9 * * 1', action: 'reports:weekly' },
    { name: 'db-backup', cron: '0 2 * * *', action: 'backup:database' }
  ]
};

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

const env: EnvVar[] = [
  { name: 'API_PORT', type: 'Int', default: 8080 },
  { name: 'MARKET_DATA_URL', type: 'String', required: true },
  { name: 'MARKET_DATA_API_KEY', type: 'String', required: true, secret: true },
  { name: 'SESSION_SECRET', type: 'String', required: true, secret: true },
  { name: 'WIN_CERT_PATH', type: 'String', secret: true },
  { name: 'MAC_CERT_ID', type: 'String', secret: true },
  { name: 'AUTO_UPDATE_ENABLED', type: 'Boolean', default: true },
  { name: 'LOG_LEVEL', type: 'String', default: 'info' }
];

// ============================================================================
// COMPLETE CONTRACT
// ============================================================================

export const contract: ReclappContract = {
  app: {
    name: 'Investment Portfolio Manager',
    version: '1.0.0',
    description: 'Desktop application for tracking investments, portfolios, and market analysis',
    author: 'Reclapp Team',
    license: 'MIT',
    repository: 'https://github.com/reclapp/investment-manager'
  },
  
  deployment: {
    type: 'desktop',
    framework: 'electron',
    platforms: ['win', 'mac', 'linux'],
    build: {
      outputDir: 'target',
      bundleId: 'com.reclapp.investment-manager',
      appName: 'Investment Manager',
      icons: {
        win: 'assets/icon.ico',
        mac: 'assets/icon.icns',
        linux: 'assets/icon.png'
      },
      signing: {
        win: '${WIN_CERT_PATH}',
        mac: '${MAC_CERT_ID}'
      }
    },
    autoUpdate: {
      enabled: true,
      provider: 'github',
      channel: 'stable'
    },
    security: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  },
  
  backend: {
    runtime: 'node',
    framework: 'express',
    port: '${API_PORT:8080}',
    database: {
      type: 'sqlite',
      url: 'data/investments.db',
      migrations: 'target/migrations'
    },
    auth: {
      type: 'local',
      secret: '${SESSION_SECRET}',
      expiry: '24h'
    },
    cors: {
      origins: ['http://localhost:*', 'app://*'],
      credentials: true
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100
    }
  },
  
  frontend: {
    framework: 'react',
    bundler: 'vite',
    style: 'tailwindcss',
    components: 'shadcn',
    theme: {
      mode: 'system',
      primary: '#3b82f6',
      accent: '#10b981'
    },
    layout: {
      type: 'sidebar',
      navigation: [
        { icon: 'home', label: 'Dashboard', path: '/' },
        { icon: 'briefcase', label: 'Portfolio', path: '/portfolio' },
        { icon: 'trending-up', label: 'Transactions', path: '/transactions' },
        { icon: 'pie-chart', label: 'Analytics', path: '/analytics' },
        { icon: 'settings', label: 'Settings', path: '/settings' }
      ]
    },
    responsive: false,
    offlineSupport: true
  },
  
  sources: [
    {
      name: 'marketDataApi',
      type: 'rest',
      url: '${MARKET_DATA_URL}',
      auth: 'apiKey',
      cacheDuration: '5m',
      rateLimit: 100
    },
    {
      name: 'currencyApi',
      type: 'rest',
      url: 'https://api.exchangerate.host',
      cacheDuration: '1h'
    }
  ],
  
  entities: [Portfolio, Holding, Transaction, Watchlist, PriceAlert, DividendRecord],
  events,
  pipelines,
  alerts,
  dashboards,
  api,
  ipc,
  tray,
  scheduler,
  env,
  
  config: {
    app: {
      defaultCurrency: 'USD',
      refreshInterval: 300000,
      maxWatchlistSize: 50,
      dataRetentionDays: 365
    },
    trading: {
      defaultExchange: 'NASDAQ',
      supportedAssetTypes: ['stock', 'etf', 'crypto', 'bond', 'mutual_fund'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'PLN', 'CHF']
    },
    notifications: {
      sound: true,
      desktop: true,
      email: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    }
  }
};

export default contract;
