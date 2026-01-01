/**
 * Reclapp DSL TypeScript Types
 * 
 * Complete type definitions for self-sufficient DSL contracts.
 * These types enable full validation at compile-time and runtime.
 * 
 * Usage:
 *   - Define contracts in *.reclapp.ts files using these types
 *   - Runtime validates and converts other formats (yaml, reclapp) to TypeScript
 *   - All generated code derives from these validated definitions
 * 
 * @version 2.1.0
 */

// ============================================================================
// PRIMITIVE TYPES
// ============================================================================

export type FieldType = 
  | 'String' | 'Int' | 'Float' | 'Boolean' | 'DateTime' | 'Date'
  | 'UUID' | 'JSON' | 'Decimal' | 'Money' | 'Email' | 'URL';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type StreamMode = 'realtime' | 'polling' | 'hourly' | 'daily' | 'manual';
export type LayoutType = 'grid' | 'tabs' | 'flex' | 'sidebar' | 'dashboard' | 'app-shell' | 'e-commerce';
export type AuthType = 'jwt' | 'oauth2' | 'session' | 'apiKey' | 'basic' | 'bearer' | 'local';
export type DatabaseType = 'postgres' | 'mysql' | 'sqlite' | 'mongodb' | 'clickhouse';
export type CacheType = 'redis' | 'memcached' | 'memory';
export type SourceType = 'rest' | 'graphql' | 'database' | 'file' | 'kafka' | 'mqtt' | 'websocket' | 'clickhouse';

// ============================================================================
// APP METADATA
// ============================================================================

export interface AppMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
}

// ============================================================================
// DEPLOYMENT CONFIGURATION
// ============================================================================

export type DeploymentType = 'web' | 'desktop' | 'mobile' | 'api';
export type WebFramework = 'nextjs' | 'react' | 'vue' | 'svelte' | 'angular' | 'express' | 'fastify';
export type DesktopFramework = 'electron' | 'tauri';
export type MobileFramework = 'react-native' | 'flutter' | 'capacitor';
export type HostingProvider = 'vercel' | 'netlify' | 'docker' | 'kubernetes' | 'aws' | 'gcp' | 'azure';

export interface BuildConfig {
  outputDir: string;
  nodeVersion?: string;
  outputMode?: 'standalone' | 'static' | 'server';
  bundleId?: string;
  appName?: string;
  icons?: {
    win?: string;
    mac?: string;
    linux?: string;
  };
  signing?: {
    win?: string;
    mac?: string;
  };
}

export interface HostingConfig {
  provider: HostingProvider | string;
  region?: string;
  domain?: {
    primary: string;
    redirectWww?: boolean;
  };
  ssl?: {
    enabled: boolean;
    provider?: 'auto' | 'letsencrypt' | 'custom';
  };
}

export interface ScalingConfig {
  minInstances?: number;
  maxInstances?: number;
  autoScale?: boolean;
}

export interface AutoUpdateConfig {
  enabled: boolean;
  provider?: 'github' | 's3' | 'custom';
  channel?: 'stable' | 'beta' | 'alpha';
}

export interface DeploymentConfig {
  type: DeploymentType;
  framework: WebFramework | DesktopFramework | MobileFramework | string;
  platforms?: string[];
  build: BuildConfig;
  hosting?: HostingConfig;
  scaling?: ScalingConfig;
  autoUpdate?: AutoUpdateConfig;
  cdn?: {
    enabled: boolean;
    cacheStatic?: string;
    cacheApi?: string;
  };
  security?: {
    sandbox?: boolean;
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
  };
}

// ============================================================================
// BACKEND CONFIGURATION
// ============================================================================

export interface DatabaseConfig {
  type: DatabaseType;
  url: string;
  poolSize?: number;
  ssl?: boolean;
  migrations?: string;
}

export interface CacheConfig {
  type: CacheType;
  url?: string;
  ttlDefault?: number;
}

export interface AuthConfig {
  type: AuthType;
  providers?: string[];
  secret?: string;
  expiry?: string;
  sessionStrategy?: 'jwt' | 'session';
}

export interface CorsConfig {
  origins: string[];
  credentials?: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface WebhookConfig {
  [key: string]: {
    secret: string;
    events: string[];
  };
}

export interface QueueConfig {
  type: 'redis' | 'rabbitmq' | 'sqs';
  url?: string;
  concurrency?: number;
}

export interface SearchConfig {
  type: 'elasticsearch' | 'opensearch' | 'meilisearch' | 'typesense';
  url: string;
}

export interface BackendConfig {
  runtime: 'node' | 'python' | 'go' | 'rust';
  framework: string;
  port?: string | number;
  database?: DatabaseConfig;
  cache?: CacheConfig;
  auth?: AuthConfig;
  cors?: CorsConfig;
  rateLimit?: RateLimitConfig;
  webhooks?: WebhookConfig;
  queue?: QueueConfig;
  search?: SearchConfig;
}

// ============================================================================
// FRONTEND CONFIGURATION
// ============================================================================

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primary: string;
  accent?: string;
  charts?: string[];
}

export interface NavigationItem {
  icon: string;
  label: string;
  path: string;
  children?: NavigationItem[];
}

export interface LayoutConfig {
  type: LayoutType;
  sidebar?: boolean;
  header?: boolean;
  navigation: NavigationItem[];
}

export interface PagesConfig {
  public?: string[];
  protected?: string[];
}

export interface FrontendConfig {
  framework: 'react' | 'vue' | 'svelte' | 'angular';
  bundler: 'vite' | 'webpack' | 'nextjs' | 'parcel';
  style: 'tailwindcss' | 'css-modules' | 'styled-components' | 'sass';
  components?: 'shadcn' | 'material' | 'ant-design' | 'chakra';
  theme?: ThemeConfig;
  layout?: LayoutConfig;
  pages?: PagesConfig;
  ssr?: boolean;
  streaming?: boolean;
  prefetch?: boolean;
  offlineSupport?: boolean;
  pwa?: boolean;
  responsive?: boolean;
}

// ============================================================================
// DATA SOURCE CONFIGURATION
// ============================================================================

export interface DataSource {
  name: string;
  type: SourceType;
  url?: string;
  auth?: AuthType | string;
  cacheDuration?: string;
  rateLimit?: number;
  topics?: string[];
  brokers?: string;
  database?: string;
  mapping?: Record<string, string>;
}

// ============================================================================
// ENTITY DEFINITIONS
// ============================================================================

export interface FieldAnnotation {
  unique?: boolean;
  required?: boolean;
  generated?: boolean;
  index?: boolean;
  secret?: boolean;
  computed?: boolean;
  relation?: string;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: string[];
  default?: any;
}

export interface EntityField {
  name: string;
  type: FieldType | string;
  nullable?: boolean;
  array?: boolean;
  annotations?: FieldAnnotation;
}

export interface EntityIndex {
  fields: string[];
  unique?: boolean;
  name?: string;
}

export interface EntityRelation {
  name: string;
  entity: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  field?: string;
}

export interface CausalInfluence {
  field: string;
  weight: number;
  decay: number;
  mechanism?: string;
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
    value: any;
  }>;
}

export interface Intervention {
  name: string;
  description?: string;
  adjust: Record<string, any>;
  expectedEffect: Record<string, number>;
  confidence: number;
  sandbox: boolean;
  cost?: number;
  cooldownMs?: number;
  maxApplications?: number;
  prerequisites?: string[];
  contraindications?: string[];
}

export interface Entity {
  name: string;
  description?: string;
  fields: EntityField[];
  indexes?: EntityIndex[];
  relations?: EntityRelation[];
  causalInfluences?: CausalInfluence[];
  interventions?: Intervention[];
  partition?: {
    field: string;
    type: 'day' | 'week' | 'month' | 'year';
  };
}

// ============================================================================
// EVENT DEFINITIONS
// ============================================================================

export interface Event {
  name: string;
  description?: string;
  fields: EntityField[];
}

// ============================================================================
// PIPELINE DEFINITIONS
// ============================================================================

export interface Pipeline {
  name: string;
  description?: string;
  input: string | string[];
  transform: string[];
  output: string[];
  filter?: string;
  schedule?: string;
  mode?: 'batch' | 'streaming';
  parallelism?: number;
  onDemand?: boolean;
}

// ============================================================================
// ALERT DEFINITIONS
// ============================================================================

export interface Alert {
  name: string;
  entity: string;
  condition: string;
  target: string[];
  severity: Severity;
  throttle?: string;
  cooldown?: string;
}

// ============================================================================
// DASHBOARD DEFINITIONS
// ============================================================================

export interface DashboardWidget {
  type: 'stat' | 'chart' | 'table' | 'pie' | 'map' | 'funnel' | 'sankey' | 'mini-chart' | 'custom';
  title?: string;
  metric?: string;
  entity?: string;
  columns?: string[];
  chartType?: 'line' | 'bar' | 'area' | 'scatter';
  format?: 'currency' | 'percent' | 'number';
  colorCoded?: boolean;
  sparkline?: boolean;
  compare?: string;
  span?: number;
  stream?: boolean;
  limit?: number;
  sortable?: boolean;
  interactive?: boolean;
  component?: string;
  perRow?: boolean;
}

export interface DashboardFilter {
  name: string;
  type: 'date-range' | 'select' | 'multi-select' | 'search';
  default?: string;
  options?: string[];
}

export interface DashboardTab {
  name: string;
  widgets: string[];
}

export interface Dashboard {
  name: string;
  description?: string;
  entity?: string;
  metrics?: string[];
  streamMode?: StreamMode;
  layout?: LayoutType;
  refreshInterval?: string;
  widgets?: DashboardWidget[];
  filters?: DashboardFilter[];
  tabs?: DashboardTab[];
}

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

export interface WorkflowStep {
  name: string;
  action: string;
  onSuccess?: string;
  onFailure?: string;
  timeout?: string;
  config?: Record<string, any>;
}

export interface Workflow {
  name: string;
  description?: string;
  trigger: string;
  filter?: string;
  steps: WorkflowStep[];
}

// ============================================================================
// API DEFINITIONS
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiAction {
  name: string;
  method: HttpMethod;
  path: string;
  input?: Record<string, string>;
  output?: string | Record<string, string>;
  query?: Record<string, string>;
  auth?: 'required' | 'optional' | 'apiKey' | string;
  rateLimit?: number;
  cache?: string;
  websocket?: boolean;
}

export interface ApiResource {
  name: string;
  entity?: string;
  operations?: Array<'list' | 'get' | 'create' | 'update' | 'delete'>;
  auth?: 'required' | 'optional' | string;
  rateLimit?: number;
  nested?: ApiResource[];
  actions?: ApiAction[];
}

export interface ApiConfig {
  version: string;
  prefix: string;
  type?: 'rest' | 'graphql';
  resources: ApiResource[];
}

// ============================================================================
// WEBSOCKET DEFINITIONS
// ============================================================================

export interface WebSocketChannel {
  name: string;
  subscribe?: boolean;
  publish?: boolean;
  data?: string | Record<string, string>;
}

export interface WebSocketConfig {
  name: string;
  auth?: string;
  channels: WebSocketChannel[];
  heartbeat?: number;
  reconnect?: boolean;
}

// ============================================================================
// IPC DEFINITIONS (Electron)
// ============================================================================

export interface IpcChannel {
  name: string;
  direction: 'main->renderer' | 'renderer->main' | 'bidirectional';
  data?: string | Record<string, string>;
}

export interface IpcConfig {
  name: string;
  channels: IpcChannel[];
}

// ============================================================================
// TRAY DEFINITIONS (Desktop)
// ============================================================================

export interface TrayMenuItem {
  label?: string;
  type?: 'separator';
  action?: string;
  submenu?: TrayMenuItem[];
}

export interface TrayConfig {
  icon: string;
  tooltip: string;
  menu: TrayMenuItem[];
  clickAction?: string;
}

// ============================================================================
// SCHEDULER DEFINITIONS
// ============================================================================

export interface ScheduledTask {
  name: string;
  cron: string;
  pipeline?: string;
  action?: string;
}

export interface SchedulerConfig {
  tasks: ScheduledTask[];
}

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export interface EnvVar {
  name: string;
  type: 'String' | 'Int' | 'Boolean' | 'String[]';
  required?: boolean;
  secret?: boolean;
  default?: any;
}

// ============================================================================
// DOCKER CONFIGURATION
// ============================================================================

export interface DockerService {
  name: string;
  build?: string;
  image?: string;
  ports?: string[];
  envFile?: string;
  env?: Record<string, string>;
  volumes?: string[];
  dependsOn?: string[];
  command?: string;
}

export interface DockerConfig {
  services: DockerService[];
  volumes?: string[];
  networks?: string[];
}

// ============================================================================
// CONFIG SECTIONS
// ============================================================================

export interface ConfigSection {
  [key: string]: any;
}

// ============================================================================
// COMPLETE CONTRACT DEFINITION
// ============================================================================

export interface ReclappContract {
  // Metadata
  app: AppMetadata;
  
  // Deployment & Infrastructure
  deployment?: DeploymentConfig;
  backend?: BackendConfig;
  frontend?: FrontendConfig;
  docker?: DockerConfig;
  
  // Data Layer
  sources?: DataSource[];
  entities: Entity[];
  events?: Event[];
  
  // Business Logic
  pipelines?: Pipeline[];
  workflows?: Workflow[];
  alerts?: Alert[];
  
  // UI
  dashboards?: Dashboard[];
  
  // API
  api?: ApiConfig;
  websocket?: WebSocketConfig;
  
  // Desktop-specific
  ipc?: IpcConfig;
  tray?: TrayConfig;
  scheduler?: SchedulerConfig;
  
  // Environment & Config
  env?: EnvVar[];
  config?: Record<string, ConfigSection>;
}

// ============================================================================
// BUILDER FUNCTIONS
// ============================================================================

export function defineApp(name: string, version: string = '1.0.0'): AppMetadata {
  return { name, version, description: '' };
}

export function defineEntity(name: string, fields: EntityField[]): Entity {
  return { name, fields };
}

export function defineEvent(name: string, fields: EntityField[]): Event {
  return { name, fields };
}

export function definePipeline(config: Pipeline): Pipeline {
  return config;
}

export function defineAlert(config: Alert): Alert {
  return config;
}

export function defineDashboard(config: Dashboard): Dashboard {
  return config;
}

export function defineWorkflow(config: Workflow): Workflow {
  return config;
}

export function defineApi(config: ApiConfig): ApiConfig {
  return config;
}

// ============================================================================
// FIELD HELPERS
// ============================================================================

export function field(name: string, type: FieldType | string, annotations?: FieldAnnotation): EntityField {
  return { name, type, annotations };
}

export function stringField(name: string, annotations?: FieldAnnotation): EntityField {
  return field(name, 'String', annotations);
}

export function intField(name: string, annotations?: FieldAnnotation): EntityField {
  return field(name, 'Int', annotations);
}

export function boolField(name: string, annotations?: FieldAnnotation): EntityField {
  return field(name, 'Boolean', annotations);
}

export function dateTimeField(name: string, annotations?: FieldAnnotation): EntityField {
  return field(name, 'DateTime', annotations);
}

export function decimalField(name: string, annotations?: FieldAnnotation): EntityField {
  return field(name, 'Decimal', annotations);
}

export function jsonField(name: string, annotations?: FieldAnnotation): EntityField {
  return field(name, 'JSON', annotations);
}

export function uuidField(name: string, annotations?: FieldAnnotation): EntityField {
  return field(name, 'UUID', annotations);
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateContract(contract: ReclappContract): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Required fields
  if (!contract.app?.name) {
    errors.push({ path: 'app.name', message: 'App name is required', code: 'REQUIRED' });
  }
  if (!contract.app?.version) {
    errors.push({ path: 'app.version', message: 'App version is required', code: 'REQUIRED' });
  }
  if (!contract.entities || contract.entities.length === 0) {
    warnings.push({ path: 'entities', message: 'No entities defined', code: 'EMPTY' });
  }
  
  // Validate entities
  contract.entities?.forEach((entity, i) => {
    if (!entity.name) {
      errors.push({ path: `entities[${i}].name`, message: 'Entity name is required', code: 'REQUIRED' });
    }
    if (!entity.fields || entity.fields.length === 0) {
      warnings.push({ path: `entities[${i}].fields`, message: `Entity ${entity.name} has no fields`, code: 'EMPTY' });
    }
  });
  
  // Validate deployment
  if (contract.deployment) {
    if (!contract.deployment.framework) {
      errors.push({ path: 'deployment.framework', message: 'Deployment framework is required', code: 'REQUIRED' });
    }
  }
  
  // Validate API resources reference existing entities
  contract.api?.resources?.forEach((resource, i) => {
    if (resource.entity && !contract.entities?.find(e => e.name === resource.entity)) {
      errors.push({ 
        path: `api.resources[${i}].entity`, 
        message: `Entity '${resource.entity}' not found`, 
        code: 'REFERENCE' 
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ReclappContract;
