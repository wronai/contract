/**
 * Markdown Contract Parser (.rcl.md)
 * Parses .rcl.md files to Intermediate Representation (IR)
 */

import * as fs from 'fs';

// Types
export interface ParseResult {
  success: boolean;
  ir?: IR;
  errors?: ParseError[];
  conversation?: Message[];
}

export interface ParseError {
  line: number;
  message: string;
  block?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  timestamp: string;
  content: string;
}

export interface IR {
  app: AppInfo;
  entities: Entity[];
  enums: EnumDef[];
  events: EventDef[];
  alerts: AlertDef[];
  pipelines: PipelineDef[];
  dashboards: DashboardDef[];
  sources: SourceDef[];
  workflows: WorkflowDef[];
  api?: ApiConfig;
  deployment?: DeploymentConfig;
  env: EnvVar[];
  config: Record<string, any>;
  aiPlan?: any;
}

export interface AppInfo {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
}

export interface Entity {
  name: string;
  fields: EntityField[];
}

export interface EntityField {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  auto?: boolean;
  nullable?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface EnumDef {
  name: string;
  values: { name: string; description?: string }[];
}

export interface EventDef {
  name: string;
  fields: { name: string; type: string }[];
}

export interface AlertDef {
  name: string;
  entity?: string;
  condition: string;
  targets: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
}

export interface PipelineDef {
  name: string;
  input: string[];
  output: string;
  schedule?: string;
  transform?: string[];
}

export interface DashboardDef {
  name: string;
  entity?: string;
  metrics: string[];
  stream?: string;
  layout?: string;
}

export interface SourceDef {
  name: string;
  type: string;
  url?: string;
  auth?: string;
  cache?: string;
}

export interface WorkflowDef {
  name: string;
  trigger: string;
  steps: string[];
}

export interface ApiConfig {
  prefix: string;
  auth: string;
  rateLimit?: number;
  cors?: string;
}

export interface DeploymentConfig {
  type: string;
  database: string;
  cache?: string;
  ports?: Record<string, number>;
}

export interface EnvVar {
  name: string;
  type: string;
  required?: boolean;
  secret?: boolean;
  default?: string;
}

// Regex patterns
const PATTERNS = {
  title: /^# (.+)$/m,
  description: /^> (.+)$/m,
  metaRow: /\| (.+?) \| (.+?) \|/g,
  yamlBlock: /```yaml\n# (entity|enum|event|alert|pipeline|dashboard|api|deployment|env|source|workflow|config|ai-plan): ?(.+)?\n([\s\S]*?)```/g,
  jsonBlock: /```json:contract\.ai\.json\n([\s\S]*?)```/g,
  userMessage: /### 🧑 User \((.+?)\)\n\n([\s\S]*?)(?=\n###|\n---|\n##|$)/g,
  assistantMessage: /### 🤖 Assistant \((.+?)\)\n\n([\s\S]*?)(?=\n###|\n---|\n##|$)/g,
};

export class MarkdownParser {
  private content: string;
  private errors: ParseError[] = [];

  constructor(content: string) {
    this.content = content;
  }

  parse(): ParseResult {
    try {
      const ir = this.createEmptyIR();

      // 1. Parse header
      ir.app = this.parseHeader();

      // 2. Parse YAML blocks
      this.parseYamlBlocks(ir);

      // 2.1 Parse JSON blocks (ai-plan)
      this.parseJsonBlocks(ir);

      // 3. Parse conversation (optional)
      const conversation = this.parseConversation();

      return {
        success: this.errors.length === 0,
        ir,
        errors: this.errors.length > 0 ? this.errors : undefined,
        conversation: conversation.length > 0 ? conversation : undefined,
      };
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            line: 0,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      };
    }
  }

  private createEmptyIR(): IR {
    return {
      app: { name: '', version: '1.0.0' },
      entities: [],
      enums: [],
      events: [],
      alerts: [],
      pipelines: [],
      dashboards: [],
      sources: [],
      workflows: [],
      env: [],
      config: {},
      aiPlan: undefined,
    };
  }

  private parseHeader(): AppInfo {
    const titleMatch = this.content.match(PATTERNS.title);
    const descMatch = this.content.match(PATTERNS.description);

    const header: AppInfo = {
      name: titleMatch?.[1] || 'Unnamed',
      version: '1.0.0',
      description: descMatch?.[1],
    };

    // Parse metadata table
    let match;
    PATTERNS.metaRow.lastIndex = 0;
    while ((match = PATTERNS.metaRow.exec(this.content)) !== null) {
      const [, key, value] = match;
      const keyLower = key.toLowerCase().trim();

      if (keyLower === 'wersja' || keyLower === 'version') {
        header.version = value.trim();
      } else if (keyLower === 'autor' || keyLower === 'author') {
        header.author = value.trim();
      } else if (keyLower === 'licencja' || keyLower === 'license') {
        header.license = value.trim();
      }
    }

    return header;
  }

  private parseYamlBlocks(ir: IR): void {
    let match;
    PATTERNS.yamlBlock.lastIndex = 0;

    while ((match = PATTERNS.yamlBlock.exec(this.content)) !== null) {
      const [, type, name, body] = match;
      const lineNumber = this.getLineNumber(match.index);

      try {
        switch (type) {
          case 'entity':
            ir.entities.push(this.parseEntity(name || '', body));
            break;
          case 'enum':
            ir.enums.push(this.parseEnum(name || '', body));
            break;
          case 'event':
            ir.events.push(this.parseEvent(name || '', body));
            break;
          case 'alert':
            ir.alerts.push(this.parseAlert(name || '', body));
            break;
          case 'pipeline':
            ir.pipelines.push(this.parsePipeline(name || '', body));
            break;
          case 'dashboard':
            ir.dashboards.push(this.parseDashboard(name || '', body));
            break;
          case 'source':
            ir.sources.push(this.parseSource(name || '', body));
            break;
          case 'workflow':
            ir.workflows.push(this.parseWorkflow(name || '', body));
            break;
          case 'api':
            ir.api = this.parseApi(body);
            break;
          case 'deployment':
            ir.deployment = this.parseDeployment(body);
            break;
          case 'env':
            ir.env = this.parseEnv(body);
            break;
          case 'config':
            ir.config = this.parseConfig(name || '', body);
            break;
          case 'ai-plan':
            ir.aiPlan = JSON.parse(body);
            break;
        }
      } catch (error) {
        this.errors.push({
          line: lineNumber,
          block: type,
          message: error instanceof Error ? error.message : 'Parse error',
        });
      }
    }
  }

  private parseJsonBlocks(ir: IR): void {
    let match;
    PATTERNS.jsonBlock.lastIndex = 0;
    while ((match = PATTERNS.jsonBlock.exec(this.content)) !== null) {
      try {
        ir.aiPlan = JSON.parse(match[1]);
      } catch (error) {
        this.errors.push({
          line: this.getLineNumber(match.index),
          message: `Failed to parse JSON block: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
  }

  private parseEntity(name: string, body: string): Entity {
    const fields: EntityField[] = [];

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Format: fieldName : type # @modifiers - description
      const match = trimmed.match(/^(\w+)\s*:\s*([^#]+?)(?:\s*#\s*(.*))?$/);

      if (match) {
        const [, fieldName, typeStr, comment] = match;
        const field = this.parseField(fieldName, typeStr.trim(), comment || '');
        fields.push(field);
      }
    }

    return { name, fields };
  }

  private parseField(name: string, typeStr: string, comment: string): EntityField {
    const modifiers: string[] = [];
    const modMatch = comment.match(/@(\w+)/g);
    if (modMatch) {
      modifiers.push(...modMatch.map((m) => m.slice(1)));
    }

    const defaultMatch = comment.match(/=\s*(\S+)/);
    const defaultValue = defaultMatch?.[1];

    const descMatch = comment.match(/-\s*(.+)$/);
    const description = descMatch?.[1]?.trim();

    return {
      name,
      type: typeStr,
      required: modifiers.includes('required'),
      unique: modifiers.includes('unique'),
      auto: modifiers.includes('auto') || modifiers.includes('generated'),
      nullable: typeStr.endsWith('?'),
      defaultValue,
      description,
    };
  }

  private parseEnum(name: string, body: string): EnumDef {
    const values: { name: string; description?: string }[] = [];

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^-\s*(\w+)(?:\s*#\s*(.*))?$/);
      if (match) {
        values.push({
          name: match[1],
          description: match[2]?.trim(),
        });
      }
    }

    return { name, values };
  }

  private parseEvent(name: string, body: string): EventDef {
    const fields: { name: string; type: string }[] = [];

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^(\w+)\s*:\s*(\S+)/);
      if (match) {
        fields.push({
          name: match[1],
          type: match[2],
        });
      }
    }

    return { name, fields };
  }

  private parseAlert(name: string, body: string): AlertDef {
    const alert: AlertDef = { name, condition: '', targets: [], severity: 'medium' };

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      const entityMatch = trimmed.match(/^entity:\s*(.+)$/);
      if (entityMatch) alert.entity = entityMatch[1];

      const whenMatch = trimmed.match(/^when:\s*(.+)$/);
      if (whenMatch) alert.condition = whenMatch[1];

      const notifyMatch = trimmed.match(/^notify:\s*\[(.+)\]$/);
      if (notifyMatch) alert.targets = notifyMatch[1].split(',').map((s) => s.trim());

      const severityMatch = trimmed.match(/^severity:\s*(\w+)$/);
      if (severityMatch) alert.severity = severityMatch[1] as any;

      const msgMatch = trimmed.match(/^message:\s*"(.+)"$/);
      if (msgMatch) alert.message = msgMatch[1];
    }

    return alert;
  }

  private parsePipeline(name: string, body: string): PipelineDef {
    const pipeline: PipelineDef = { name, input: [], output: '' };

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      const inputMatch = trimmed.match(/^input:\s*\[(.+)\]$/);
      if (inputMatch) pipeline.input = inputMatch[1].split(',').map((s) => s.trim());

      const outputMatch = trimmed.match(/^output:\s*(.+)$/);
      if (outputMatch) pipeline.output = outputMatch[1];

      const scheduleMatch = trimmed.match(/^schedule:\s*"(.+)"$/);
      if (scheduleMatch) pipeline.schedule = scheduleMatch[1];

      const transformMatch = trimmed.match(/^transform:\s*\[(.+)\]$/);
      if (transformMatch) pipeline.transform = transformMatch[1].split(',').map((s) => s.trim());
    }

    return pipeline;
  }

  private parseDashboard(name: string, body: string): DashboardDef {
    const dashboard: DashboardDef = { name, metrics: [] };

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      const entityMatch = trimmed.match(/^entity:\s*(.+)$/);
      if (entityMatch) dashboard.entity = entityMatch[1];

      const metricsMatch = trimmed.match(/^metrics:\s*\[(.+)\]$/);
      if (metricsMatch) dashboard.metrics = metricsMatch[1].split(',').map((s) => s.trim());

      const streamMatch = trimmed.match(/^stream:\s*(.+)$/);
      if (streamMatch) dashboard.stream = streamMatch[1];

      const layoutMatch = trimmed.match(/^layout:\s*(.+)$/);
      if (layoutMatch) dashboard.layout = layoutMatch[1];
    }

    return dashboard;
  }

  private parseSource(name: string, body: string): SourceDef {
    const source: SourceDef = { name, type: 'rest' };

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      const typeMatch = trimmed.match(/^type:\s*(.+)$/);
      if (typeMatch) source.type = typeMatch[1];

      const urlMatch = trimmed.match(/^url:\s*"(.+)"$/);
      if (urlMatch) source.url = urlMatch[1];

      const authMatch = trimmed.match(/^auth:\s*(.+)$/);
      if (authMatch) source.auth = authMatch[1];

      const cacheMatch = trimmed.match(/^cache:\s*"(.+)"$/);
      if (cacheMatch) source.cache = cacheMatch[1];
    }

    return source;
  }

  private parseWorkflow(name: string, body: string): WorkflowDef {
    const workflow: WorkflowDef = { name, trigger: '', steps: [] };

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      const triggerMatch = trimmed.match(/^trigger:\s*(.+)$/);
      if (triggerMatch) workflow.trigger = triggerMatch[1];

      const stepsMatch = trimmed.match(/^steps:\s*\[(.+)\]$/);
      if (stepsMatch) workflow.steps = stepsMatch[1].split(',').map((s) => s.trim());
    }

    return workflow;
  }

  private parseApi(body: string): ApiConfig {
    const api: ApiConfig = { prefix: '/api/v1', auth: 'jwt' };

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      const prefixMatch = trimmed.match(/^prefix:\s*(.+)$/);
      if (prefixMatch) api.prefix = prefixMatch[1];

      const authMatch = trimmed.match(/^auth:\s*(.+)$/);
      if (authMatch) api.auth = authMatch[1];

      const rateLimitMatch = trimmed.match(/^rateLimit:\s*(\d+)$/);
      if (rateLimitMatch) api.rateLimit = parseInt(rateLimitMatch[1]);

      const corsMatch = trimmed.match(/^cors:\s*(.+)$/);
      if (corsMatch) api.cors = corsMatch[1];
    }

    return api;
  }

  private parseDeployment(body: string): DeploymentConfig {
    const deployment: DeploymentConfig = { type: 'docker', database: 'postgresql' };

    for (const line of body.split('\n')) {
      const trimmed = line.trim();

      const typeMatch = trimmed.match(/^type:\s*(.+)$/);
      if (typeMatch) deployment.type = typeMatch[1];

      const dbMatch = trimmed.match(/^database:\s*(.+)$/);
      if (dbMatch) deployment.database = dbMatch[1];

      const cacheMatch = trimmed.match(/^cache:\s*(.+)$/);
      if (cacheMatch) deployment.cache = cacheMatch[1];
    }

    return deployment;
  }

  private parseEnv(body: string): EnvVar[] {
    const envVars: EnvVar[] = [];

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^(\w+)\s*:\s*(\w+)(?:\s*#\s*(.*))?$/);
      if (match) {
        const [, name, type, comment] = match;
        const commentStr = comment || '';

        const envVar: EnvVar = {
          name,
          type,
          required: commentStr.includes('@required'),
          secret: type === 'secret',
        };

        const defaultMatch = commentStr.match(/=\s*"?([^"]+)"?/);
        if (defaultMatch) {
          envVar.default = defaultMatch[1];
        }

        envVars.push(envVar);
      }
    }

    return envVars;
  }

  private parseConfig(name: string, body: string): Record<string, any> {
    const config: Record<string, any> = {};

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
      if (match) {
        const [, key, value] = match;
        // Try to parse as number/boolean
        if (value === 'true') config[key] = true;
        else if (value === 'false') config[key] = false;
        else if (/^\d+$/.test(value)) config[key] = parseInt(value);
        else if (/^\d+\.\d+$/.test(value)) config[key] = parseFloat(value);
        else config[key] = value.replace(/^"|"$/g, '');
      }
    }

    return config;
  }

  private parseConversation(): Message[] {
    const messages: Message[] = [];

    let match;
    PATTERNS.userMessage.lastIndex = 0;
    while ((match = PATTERNS.userMessage.exec(this.content)) !== null) {
      messages.push({
        role: 'user',
        timestamp: match[1],
        content: match[2].trim(),
      });
    }

    PATTERNS.assistantMessage.lastIndex = 0;
    while ((match = PATTERNS.assistantMessage.exec(this.content)) !== null) {
      messages.push({
        role: 'assistant',
        timestamp: match[1],
        content: match[2].trim(),
      });
    }

    messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return messages;
  }

  private getLineNumber(index: number): number {
    return this.content.slice(0, index).split('\n').length;
  }
}

// Helper functions
export function parseMarkdownContract(content: string): ParseResult {
  const parser = new MarkdownParser(content);
  return parser.parse();
}

export function parseMarkdownFile(filePath: string): ParseResult {
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      errors: [{ line: 0, message: `File not found: ${filePath}` }],
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return parseMarkdownContract(content);
}

// Convert IR to contract format used by generator
export function irToContract(ir: IR): any {
  return {
    app: ir.app,
    entities: ir.entities.map((e) => ({
      name: e.name,
      fields: e.fields.map((f) => ({
        name: f.name,
        rclType: f.type,
        type: mapFieldType(f.type),
        required: f.required,
        unique: f.unique,
        auto: f.auto,
        default: f.defaultValue,
        description: f.description,
      })),
    })),
    enums: ir.enums,
    events: ir.events.map((e) => ({
      name: e.name,
      fields: e.fields,
    })),
    alerts: ir.alerts,
    pipelines: ir.pipelines,
    dashboards: ir.dashboards,
    sources: ir.sources,
    workflows: ir.workflows,
    api: ir.api,
    deployment: ir.deployment,
    env: ir.env,
    config: ir.config,
    aiPlan: ir.aiPlan,
  };
}

function mapFieldType(typeStr: string): string {
  const baseType = typeStr.replace('?', '').trim();

  const typeMap: Record<string, string> = {
    text: 'String',
    string: 'String',
    int: 'Int',
    integer: 'Int',
    float: 'Float',
    decimal: 'Float',
    bool: 'Boolean',
    boolean: 'Boolean',
    date: 'Date',
    datetime: 'DateTime',
    uuid: 'String',
    email: 'String',
    phone: 'String',
    url: 'String',
    json: 'Json',
  };

  return typeMap[baseType.toLowerCase()] || baseType;
}
