/**
 * Reclapp Mini-DSL Parser (RCL)
 * 
 * Parses compact RCL format and generates JSON AST.
 * Can convert to/from standard Reclapp format.
 */

import * as peggy from 'peggy';
import * as fs from 'fs';
import * as path from 'path';

export interface MiniParseResult {
  success: boolean;
  ast?: any;
  errors?: MiniParseError[];
}

export interface MiniParseError {
  message: string;
  line: number;
  column: number;
  expected?: string[];
  found?: string;
}

let cachedMiniParser: peggy.Parser | null = null;

/**
 * Load and compile the Mini-DSL grammar
 */
export function getMiniParser(): peggy.Parser {
  if (cachedMiniParser) {
    return cachedMiniParser;
  }

  const grammarPath = path.join(__dirname, '../grammar/mini.pegjs');
  const grammar = fs.readFileSync(grammarPath, 'utf-8');

  cachedMiniParser = peggy.generate(grammar, {
    output: 'parser',
    trace: false,
    cache: true,
    allowedStartRules: ['Program']
  });

  return cachedMiniParser;
}

/**
 * Parse Mini-DSL source code into AST
 */
export function parseMini(source: string): MiniParseResult {
  const parser = getMiniParser();

  try {
    const ast = parser.parse(source);
    return { success: true, ast };
  } catch (error: any) {
    return {
      success: false,
      errors: [{
        message: error.message || 'Parse error',
        line: error.location?.start?.line || 1,
        column: error.location?.start?.column || 1,
        expected: error.expected?.map((e: any) => e.description || e.text || String(e)),
        found: error.found
      }]
    };
  }
}

/**
 * Parse Mini-DSL from file
 */
export function parseMiniFile(filePath: string): MiniParseResult {
  try {
    const source = fs.readFileSync(filePath, 'utf-8');
    return parseMini(source);
  } catch (error: any) {
    return {
      success: false,
      errors: [{
        message: `Failed to read file: ${error.message}`,
        line: 1,
        column: 1
      }]
    };
  }
}

/**
 * Convert Mini-DSL AST to standard Reclapp IR format
 */
export function miniToIR(ast: any): any {
  const ir: any = {
    app: {},
    entities: [],
    enums: [],
    events: [],
    pipelines: [],
    alerts: [],
    dashboards: [],
    sources: [],
    workflows: [],
    config: {}
  };

  for (const statement of ast.statements || []) {
    switch (statement.type) {
      case 'AppDeclaration':
        ir.app = {
          name: statement.name,
          version: statement.version,
          description: statement.description,
          author: statement.author,
          license: statement.license
        };
        break;

      case 'EntityDeclaration':
        ir.entities.push(transformEntity(statement));
        break;

      case 'EnumDeclaration':
        ir.enums.push({
          name: statement.name,
          values: statement.values
        });
        break;

      case 'EventDeclaration':
        ir.events.push({
          name: statement.name,
          fields: statement.fields.map((f: any) => ({
            name: f.name,
            type: f.fieldType,
            nullable: f.nullable
          }))
        });
        break;

      case 'PipelineDeclaration':
        ir.pipelines.push({
          name: statement.name,
          input: statement.input,
          output: statement.output,
          transform: statement.transform,
          schedule: statement.schedule,
          filter: statement.filter
        });
        break;

      case 'AlertDeclaration':
        ir.alerts.push({
          name: statement.name,
          entity: statement.entity,
          condition: statement.condition,
          targets: statement.targets,
          severity: statement.severity,
          throttle: statement.throttle
        });
        break;

      case 'DashboardDeclaration':
        ir.dashboards.push({
          name: statement.name,
          entity: statement.entity,
          metrics: statement.metrics,
          streamMode: statement.streamMode,
          layout: statement.layout,
          refreshInterval: statement.refreshInterval
        });
        break;

      case 'SourceDeclaration':
        ir.sources.push({
          name: statement.name,
          type: statement.sourceType,
          url: statement.url,
          auth: statement.auth,
          cacheDuration: statement.cacheDuration
        });
        break;

      case 'WorkflowDeclaration':
        ir.workflows.push(transformWorkflow(statement));
        break;

      case 'ConfigDeclaration':
        ir.config[statement.name] = statement.entries;
        break;
    }
  }

  return ir;
}

function transformEntity(entity: any): any {
  return {
    name: entity.name,
    fields: entity.fields.map((f: any) => ({
      name: f.name,
      type: resolveFieldType(f.fieldType),
      nullable: f.fieldType?.nullable || false,
      unique: f.modifiers?.some((m: any) => m.name === 'unique') || false,
      index: f.modifiers?.some((m: any) => m.name === 'index') || false,
      generated: f.modifiers?.some((m: any) => m.name === 'generated') || false,
      required: f.modifiers?.some((m: any) => m.name === 'required') || false,
      default: f.defaultValue
    }))
  };
}

function resolveFieldType(type: any): string {
  if (!type) return 'String';
  
  switch (type.type) {
    case 'BaseType':
      return capitalizeType(type.type || 'String');
    case 'ArrayType':
      return `${capitalizeType(type.elementType)}[]`;
    case 'RelationType':
      return `relation:${type.direction}:${type.target}`;
    case 'EnumType':
      return `enum:${type.values.join(',')}`;
    case 'MoneyType':
      return `money:${type.currency}`;
    case 'RangeType':
      return `${type.baseType}:${type.min}..${type.max}`;
    default:
      if (typeof type === 'string') return capitalizeType(type);
      return capitalizeType(type.type || 'String');
  }
}

function capitalizeType(type: string): string {
  const typeMap: Record<string, string> = {
    'text': 'String',
    'int': 'Int',
    'float': 'Float',
    'bool': 'Boolean',
    'datetime': 'DateTime',
    'date': 'Date',
    'email': 'Email',
    'url': 'URL',
    'uuid': 'UUID',
    'json': 'JSON',
    'decimal': 'Decimal',
    'money': 'Money',
    'phone': 'String'
  };
  return typeMap[type.toLowerCase()] || type;
}

function transformWorkflow(workflow: any): any {
  const steps: any[] = [];
  
  for (const [key, value] of Object.entries(workflow)) {
    if (key.startsWith('step_') && value) {
      steps.push(value);
    }
  }

  return {
    name: workflow.name,
    trigger: workflow.trigger,
    filter: workflow.filter,
    steps: steps
  };
}

/**
 * Convert IR to Mini-DSL source code
 */
export function irToMini(ir: any): string {
  const lines: string[] = [];

  // App declaration
  if (ir.app?.name) {
    lines.push(`app "${ir.app.name}" {`);
    if (ir.app.version) lines.push(`  version: "${ir.app.version}"`);
    if (ir.app.description) lines.push(`  description: "${ir.app.description}"`);
    if (ir.app.author) lines.push(`  author: "${ir.app.author}"`);
    if (ir.app.license) lines.push(`  license: "${ir.app.license}"`);
    lines.push('}', '');
  }

  // Enums
  for (const en of ir.enums || []) {
    lines.push(`enum ${en.name} { ${en.values.join(', ')} }`, '');
  }

  // Entities
  for (const entity of ir.entities || []) {
    lines.push(`entity ${entity.name} {`);
    for (const field of entity.fields || []) {
      let line = `  ${field.name} ${formatFieldType(field.type)}`;
      if (field.unique) line += ' @unique';
      if (field.index) line += ' @index';
      if (field.generated) line += ' @generated';
      if (field.required) line += ' @required';
      if (field.default !== undefined && field.default !== null) {
        line += ` = ${formatValue(field.default)}`;
      }
      lines.push(line);
    }
    lines.push('}', '');
  }

  // Events
  for (const event of ir.events || []) {
    lines.push(`event ${event.name} {`);
    for (const field of event.fields || []) {
      lines.push(`  ${field.name}: ${field.type.toLowerCase()}${field.nullable ? '?' : ''}`);
    }
    lines.push('}', '');
  }

  // Pipelines
  for (const pipeline of ir.pipelines || []) {
    lines.push(`pipeline ${pipeline.name} {`);
    if (pipeline.input) lines.push(`  input: ${formatArrayOrValue(pipeline.input)}`);
    if (pipeline.transform) lines.push(`  transform: ${formatArrayOrValue(pipeline.transform)}`);
    if (pipeline.output) lines.push(`  output: ${formatArrayOrValue(pipeline.output)}`);
    if (pipeline.schedule) lines.push(`  schedule: "${pipeline.schedule}"`);
    if (pipeline.filter) lines.push(`  filter: ${pipeline.filter}`);
    lines.push('}', '');
  }

  // Alerts
  for (const alert of ir.alerts || []) {
    lines.push(`alert "${alert.name}" {`);
    if (alert.entity) lines.push(`  entity: ${alert.entity}`);
    if (alert.condition) lines.push(`  when: ${alert.condition}`);
    if (alert.targets) lines.push(`  notify: [${alert.targets.map((t: any) => t.path || t).join(', ')}]`);
    if (alert.severity) lines.push(`  severity: ${alert.severity}`);
    if (alert.throttle) lines.push(`  throttle: "${alert.throttle}"`);
    lines.push('}', '');
  }

  // Dashboards
  for (const dashboard of ir.dashboards || []) {
    lines.push(`dashboard "${dashboard.name}" {`);
    if (dashboard.entity) lines.push(`  entity: ${dashboard.entity}`);
    if (dashboard.metrics) lines.push(`  metrics: [${dashboard.metrics.join(', ')}]`);
    if (dashboard.streamMode) lines.push(`  stream: ${dashboard.streamMode}`);
    if (dashboard.layout) lines.push(`  layout: ${dashboard.layout}`);
    if (dashboard.refreshInterval) lines.push(`  refresh: "${dashboard.refreshInterval}"`);
    lines.push('}', '');
  }

  // Sources
  for (const source of ir.sources || []) {
    lines.push(`source ${source.name} {`);
    if (source.type) lines.push(`  type: ${source.type}`);
    if (source.url) lines.push(`  url: "${source.url}"`);
    if (source.auth) lines.push(`  auth: ${source.auth}`);
    if (source.cacheDuration) lines.push(`  cache: "${source.cacheDuration}"`);
    lines.push('}', '');
  }

  // Config
  for (const [name, entries] of Object.entries(ir.config || {})) {
    lines.push(`config ${name} {`);
    for (const [key, value] of Object.entries(entries as any)) {
      lines.push(`  ${key}: ${formatValue(value)}`);
    }
    lines.push('}', '');
  }

  return lines.join('\n');
}

function formatFieldType(type: string): string {
  if (type.startsWith('relation:')) {
    const [, dir, target] = type.split(':');
    return dir === 'belongsTo' ? `-> ${target}` : `<- ${target}[]`;
  }
  if (type.startsWith('enum:')) {
    return `enum(${type.slice(5)})`;
  }
  if (type.startsWith('money:')) {
    return `money(${type.slice(6)})`;
  }
  return type.toLowerCase();
}

function formatValue(value: any): string {
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
  return String(value);
}

function formatArrayOrValue(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.join(', ')}]`;
  }
  return String(value);
}

/**
 * Validate Mini-DSL syntax
 */
export function validateMiniSyntax(source: string): { valid: boolean; errors: string[] } {
  const result = parseMini(source);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.errors?.map(e => 
    `Line ${e.line}, Column ${e.column}: ${e.message}`
  ) || ['Unknown error'];

  return { valid: false, errors };
}
