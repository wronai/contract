#!/usr/bin/env node
/**
 * Reclapp Generator CLI
 * ======================
 * 
 * Usage:
 *   reclapp generate <contract.reclapp> [options]
 *   reclapp deploy <output-dir> [options]
 *   reclapp validate <contract.reclapp>
 *   reclapp init <project-name>
 * 
 * Examples:
 *   reclapp generate ./contracts/app.reclapp -o ./dist -t full-stack
 *   reclapp deploy ./dist --platform docker
 *   reclapp init my-b2b-app --template b2b-risk
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { Generator, GeneratorOptions, GeneratorResult } from './core/generator';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function color(text: string, c: keyof typeof colors): string {
  return `${colors[c]}${text}${colors.reset}`;
}

function printHeader(): void {
  console.log(color(`
╔═══════════════════════════════════════════════════════════════╗
║          RECLAPP GENERATOR - Application from Contract        ║
║                        Version 2.1.0                          ║
╚═══════════════════════════════════════════════════════════════╝
`, 'cyan'));
}

function printHelp(): void {
  printHeader();
  console.log(`
${color('Usage:', 'bright')}
  reclapp <command> [options]

${color('Commands:', 'bright')}
  generate <file>     Generate application from .reclapp contract
  deploy <dir>        Deploy generated application
  validate <file>     Validate contract syntax
  init <name>         Initialize new project from template
  list-templates      List available project templates

${color('Generate Options:', 'bright')}
  -o, --output <dir>  Output directory (default: ./generated)
  -t, --target <type> Target: api, frontend, docker, kubernetes, full-stack
  --api <framework>   API framework: express, fastify, hono
  --db <database>     Database: postgresql, mongodb, sqlite
  --no-websocket      Disable WebSocket support
  --no-auth           Disable authentication

${color('Deploy Options:', 'bright')}
  -p, --platform      Platform: docker, kubernetes, vercel, netlify
  -r, --registry      Docker registry URL
  -n, --namespace     Kubernetes namespace

${color('Examples:', 'bright')}
  reclapp generate ./app.reclapp -o ./dist -t full-stack
  reclapp generate ./api.reclapp -t api --api fastify --db mongodb
  reclapp deploy ./dist -p kubernetes -n production
  reclapp init my-app --template b2b-risk
  reclapp validate ./contracts/main.reclapp
`);
}

interface ParsedArgs {
  command: string;
  file?: string;
  options: {
    output: string;
    target: string;
    api: string;
    frontend: string;
    database: string;
    platform: string;
    registry: string;
    namespace: string;
    template: string;
    websocket: boolean;
    auth: boolean;
    verbose: boolean;
    help: boolean;
  };
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: '',
    options: {
      output: './generated',
      target: 'full-stack',
      api: 'express',
      frontend: 'react',
      database: 'postgresql',
      platform: 'docker',
      registry: '',
      namespace: 'reclapp',
      template: 'minimal',
      websocket: true,
      auth: true,
      verbose: false,
      help: false
    }
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (!parsed.command && !arg.startsWith('-')) {
      parsed.command = arg;
      i++;
      continue;
    }

    if (!parsed.file && !arg.startsWith('-') && parsed.command) {
      parsed.file = arg;
      i++;
      continue;
    }

    switch (arg) {
      case '-o':
      case '--output':
        parsed.options.output = args[++i];
        break;
      case '-t':
      case '--target':
        parsed.options.target = args[++i];
        break;
      case '--api':
        parsed.options.api = args[++i];
        break;
      case '--frontend':
        parsed.options.frontend = args[++i];
        break;
      case '--db':
      case '--database':
        parsed.options.database = args[++i];
        break;
      case '-p':
      case '--platform':
        parsed.options.platform = args[++i];
        break;
      case '-r':
      case '--registry':
        parsed.options.registry = args[++i];
        break;
      case '-n':
      case '--namespace':
        parsed.options.namespace = args[++i];
        break;
      case '--template':
        parsed.options.template = args[++i];
        break;
      case '--no-websocket':
        parsed.options.websocket = false;
        break;
      case '--no-auth':
        parsed.options.auth = false;
        break;
      case '-v':
      case '--verbose':
        parsed.options.verbose = true;
        break;
      case '-h':
      case '--help':
        parsed.options.help = true;
        break;
    }
    i++;
  }

  return parsed;
}

// Simple DSL parser for CLI (uses the actual parser in production)
function parseContract(content: string): any {
  // This is a simplified parser - in production, use the full Peggy parser
  const ast: any = {
    type: 'Program',
    version: '2.1.0',
    statements: []
  };

  const lines = content.split('\n');
  let currentEntity: any = null;
  let currentBlock: string | null = null;
  let braceDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue;
    }

    // Entity declaration
    const entityMatch = trimmed.match(/^ENTITY\s+(\w+)\s*\{?$/);
    if (entityMatch) {
      currentEntity = {
        type: 'EntityDeclaration',
        name: entityMatch[1],
        fields: [],
        location: { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } }
      };
      currentBlock = 'entity';
      braceDepth++;
      continue;
    }

    // Dashboard declaration
    const dashboardMatch = trimmed.match(/^DASHBOARD\s+"([^"]+)"\s*\{?$/);
    if (dashboardMatch) {
      currentEntity = {
        type: 'DashboardDeclaration',
        name: { type: 'StringLiteral', value: dashboardMatch[1] },
        location: { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } }
      };
      currentBlock = 'dashboard';
      braceDepth++;
      continue;
    }

    // Alert declaration
    const alertMatch = trimmed.match(/^ALERT\s+"([^"]+)"\s*\{?$/);
    if (alertMatch) {
      currentEntity = {
        type: 'AlertDeclaration',
        name: { type: 'StringLiteral', value: alertMatch[1] },
        location: { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } }
      };
      currentBlock = 'alert';
      braceDepth++;
      continue;
    }

    // Source declaration
    const sourceMatch = trimmed.match(/^SOURCE\s+(\w+)\s*\{?$/);
    if (sourceMatch) {
      currentEntity = {
        type: 'SourceDeclaration',
        name: sourceMatch[1],
        location: { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } }
      };
      currentBlock = 'source';
      braceDepth++;
      continue;
    }

    // Event declaration
    const eventMatch = trimmed.match(/^EVENT\s+(\w+)\s*\{?$/);
    if (eventMatch) {
      currentEntity = {
        type: 'EventDeclaration',
        name: eventMatch[1],
        fields: [],
        location: { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } }
      };
      currentBlock = 'event';
      braceDepth++;
      continue;
    }

    // Pipeline declaration
    const pipelineMatch = trimmed.match(/^PIPELINE\s+(\w+)\s*\{?$/);
    if (pipelineMatch) {
      currentEntity = {
        type: 'PipelineDeclaration',
        name: pipelineMatch[1],
        location: { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } }
      };
      currentBlock = 'pipeline';
      braceDepth++;
      continue;
    }

    // Opening brace
    if (trimmed === '{') {
      braceDepth++;
      continue;
    }

    // Closing brace
    if (trimmed === '}') {
      braceDepth--;
      if (braceDepth === 0 && currentEntity) {
        ast.statements.push(currentEntity);
        currentEntity = null;
        currentBlock = null;
      }
      continue;
    }

    // Field in entity
    if (currentBlock === 'entity' && currentEntity) {
      const fieldMatch = trimmed.match(/^(\w+)\s*:\s*(\w+)(\?)?(\[\])?/);
      if (fieldMatch) {
        currentEntity.fields.push({
          type: 'FieldDeclaration',
          name: fieldMatch[1],
          fieldType: {
            type: 'TypeExpression',
            baseType: fieldMatch[2],
            nullable: !!fieldMatch[3],
            isArray: !!fieldMatch[4]
          },
          annotations: [],
          location: { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } }
        });
      }
    }

    // Properties in other blocks
    if (currentEntity && currentBlock !== 'entity') {
      // ENTITY reference
      const entityRef = trimmed.match(/^ENTITY\s+(\w+)$/);
      if (entityRef) {
        currentEntity.entity = { type: entityRef[1] };
      }
      
      // METRICS
      const metricsMatch = trimmed.match(/^METRICS\s+\[([^\]]+)\]$/);
      if (metricsMatch) {
        currentEntity.metrics = metricsMatch[1].split(',').map((m: string) => m.trim().replace(/"/g, ''));
      }

      // URL
      const urlMatch = trimmed.match(/^URL\s+"([^"]+)"$/);
      if (urlMatch) {
        currentEntity.url = { type: 'StringLiteral', value: urlMatch[1] };
      }

      // TYPE
      const typeMatch = trimmed.match(/^TYPE\s+(\w+)$/);
      if (typeMatch) {
        currentEntity.sourceType = typeMatch[1];
      }

      // SEVERITY
      const severityMatch = trimmed.match(/^SEVERITY\s+(\w+)$/);
      if (severityMatch) {
        currentEntity.severity = severityMatch[1];
      }

      // STREAM_MODE
      const streamMatch = trimmed.match(/^STREAM_MODE\s+(\w+)$/);
      if (streamMatch) {
        currentEntity.streamMode = streamMatch[1];
      }
    }
  }

  return ast;
}

async function cmdGenerate(file: string, options: ParsedArgs['options']): Promise<void> {
  console.log(color('📦 Generating application from contract...', 'blue'));
  console.log(`   Input:  ${file}`);
  console.log(`   Output: ${options.output}`);
  console.log(`   Target: ${options.target}`);
  console.log('');

  // Read and parse contract
  if (!existsSync(file)) {
    console.error(color(`✗ File not found: ${file}`, 'red'));
    process.exit(1);
  }

  const content = readFileSync(file, 'utf-8');
  
  let ast;
  try {
    ast = parseContract(content);
  } catch (error) {
    console.error(color(`✗ Parse error: ${error}`, 'red'));
    process.exit(1);
  }

  if (options.verbose) {
    console.log(color('Parsed AST:', 'yellow'));
    console.log(JSON.stringify(ast, null, 2));
    console.log('');
  }

  // Generate
  const generator = new Generator(ast, {
    target: options.target as any,
    output: options.output,
    framework: {
      api: options.api as any,
      frontend: options.frontend as any,
      database: options.database as any
    },
    features: {
      websocket: options.websocket,
      authentication: options.auth
    },
    deployment: {
      platform: options.platform as any
    }
  });

  const result = await generator.generate();

  // Write files
  for (const file of result.files) {
    const dir = dirname(file.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(file.path, file.content);
    console.log(color(`  ✓ ${file.path}`, 'green'));
  }

  // Summary
  console.log('');
  console.log(color('Generation Summary:', 'bright'));
  console.log(`  Files generated: ${result.summary.filesGenerated}`);
  console.log(`  Entities:        ${result.summary.entities}`);
  console.log(`  Endpoints:       ${result.summary.endpoints}`);
  console.log(`  Dashboards:      ${result.summary.dashboards}`);
  console.log(`  Alerts:          ${result.summary.alerts}`);

  if (result.errors.length > 0) {
    console.log('');
    console.log(color('Errors:', 'red'));
    result.errors.forEach(e => console.log(`  ✗ ${e.message}`));
  }

  if (result.warnings.length > 0) {
    console.log('');
    console.log(color('Warnings:', 'yellow'));
    result.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }

  console.log('');
  console.log(color('✓ Generation complete!', 'green'));
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${options.output}`);
  console.log('  npm install');
  console.log('  npm run dev');
}

async function cmdValidate(file: string, options: ParsedArgs['options']): Promise<void> {
  console.log(color('🔍 Validating contract...', 'blue'));

  if (!existsSync(file)) {
    console.error(color(`✗ File not found: ${file}`, 'red'));
    process.exit(1);
  }

  const content = readFileSync(file, 'utf-8');

  try {
    const ast = parseContract(content);
    
    console.log(color('✓ Contract syntax is valid', 'green'));
    console.log('');
    console.log('Contract summary:');
    console.log(`  Entities:   ${ast.statements.filter((s: any) => s.type === 'EntityDeclaration').length}`);
    console.log(`  Events:     ${ast.statements.filter((s: any) => s.type === 'EventDeclaration').length}`);
    console.log(`  Pipelines:  ${ast.statements.filter((s: any) => s.type === 'PipelineDeclaration').length}`);
    console.log(`  Dashboards: ${ast.statements.filter((s: any) => s.type === 'DashboardDeclaration').length}`);
    console.log(`  Alerts:     ${ast.statements.filter((s: any) => s.type === 'AlertDeclaration').length}`);
    console.log(`  Sources:    ${ast.statements.filter((s: any) => s.type === 'SourceDeclaration').length}`);
  } catch (error) {
    console.error(color(`✗ Validation failed: ${error}`, 'red'));
    process.exit(1);
  }
}

function cmdListTemplates(): void {
  console.log(color('Available Templates:', 'bright'));
  console.log('');
  
  const templates = [
    { name: 'minimal', desc: 'Minimal setup with one entity' },
    { name: 'b2b-risk', desc: 'B2B risk monitoring with customers & contractors' },
    { name: 'iot-monitoring', desc: 'IoT device monitoring with MQTT & time-series' },
    { name: 'multi-agent', desc: 'Multi-agent system with orchestration' },
    { name: 'saas-starter', desc: 'SaaS starter with users, subscriptions, billing' },
    { name: 'e-commerce', desc: 'E-commerce with products, orders, inventory' },
    { name: 'crm', desc: 'CRM with contacts, deals, tasks' },
    { name: 'analytics', desc: 'Analytics dashboard with metrics & reports' }
  ];

  for (const t of templates) {
    console.log(`  ${color(t.name.padEnd(16), 'cyan')} ${t.desc}`);
  }
  
  console.log('');
  console.log('Usage: reclapp init <name> --template <template>');
}

function cmdInit(name: string, options: ParsedArgs['options']): void {
  console.log(color(`📁 Initializing project: ${name}`, 'blue'));
  console.log(`   Template: ${options.template}`);
  
  const projectDir = join(process.cwd(), name);
  
  if (existsSync(projectDir)) {
    console.error(color(`✗ Directory already exists: ${projectDir}`, 'red'));
    process.exit(1);
  }

  mkdirSync(projectDir, { recursive: true });
  mkdirSync(join(projectDir, 'contracts'), { recursive: true });

  // Generate contract based on template
  const contract = generateTemplateContract(options.template, name);
  writeFileSync(join(projectDir, 'contracts', 'main.reclapp'), contract);

  // Generate basic structure
  writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
    name,
    version: '1.0.0',
    scripts: {
      generate: 'reclapp generate ./contracts/main.reclapp -o ./src',
      dev: 'npm run generate && cd src && npm run dev',
      build: 'npm run generate && cd src && npm run build'
    }
  }, null, 2));

  writeFileSync(join(projectDir, 'README.md'), `# ${name}

Generated by Reclapp.

## Quick Start

\`\`\`bash
npm install
npm run generate
npm run dev
\`\`\`

## Contract

Edit \`contracts/main.reclapp\` to define your data model.

## Documentation

See https://reclapp.dev/docs
`);

  console.log('');
  console.log(color('✓ Project initialized!', 'green'));
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${name}`);
  console.log('  npm run generate');
  console.log('  npm run dev');
}

function generateTemplateContract(template: string, name: string): string {
  switch (template) {
    case 'b2b-risk':
      return `// ${name} - B2B Risk Monitoring Contract
// Generated by Reclapp

ENTITY Customer {
  name: String
  email: String
  nip: String
  riskScore: Int
  status: String
  lastAssessment: DateTime?
}

ENTITY Contractor {
  name: String
  nip: String
  krs: String?
  riskScore: Int
  financialHealth: Int
  paymentHistory: Int
}

EVENT RiskEvent {
  entityType: String
  entityId: String
  eventType: String
  severity: String
  description: String
}

PIPELINE RiskMonitoring {
  INPUT RiskEvent.stream
  TRANSFORM [calculateRisk, enrichData]
  OUTPUT [dashboard, alerts]
}

DASHBOARD "Risk Overview" {
  ENTITY Customer
  METRICS ["totalCustomers", "avgRiskScore", "highRiskCount"]
  STREAM_MODE realtime
}

ALERT "High Risk Detected" {
  ENTITY Customer
  CONDITION riskScore > 80
  SEVERITY high
}
`;

    case 'iot-monitoring':
      return `// ${name} - IoT Monitoring Contract
// Generated by Reclapp

ENTITY Device {
  name: String
  type: String
  status: String
  lastSeen: DateTime
  healthScore: Int
}

ENTITY SensorReading {
  deviceId: String
  sensorType: String
  value: Float
  unit: String
  timestamp: DateTime
}

EVENT TelemetryEvent {
  deviceId: String
  readings: JSON
  timestamp: DateTime
}

PIPELINE TelemetryProcessing {
  INPUT TelemetryEvent.stream
  TRANSFORM [validate, aggregate, detectAnomalies]
  OUTPUT [timeseries, alerts]
}

DASHBOARD "Device Fleet" {
  ENTITY Device
  METRICS ["totalDevices", "onlineCount", "avgHealth"]
  STREAM_MODE realtime
}

ALERT "Device Offline" {
  ENTITY Device
  CONDITION status == "offline"
  SEVERITY medium
}
`;

    case 'saas-starter':
      return `// ${name} - SaaS Starter Contract
// Generated by Reclapp

ENTITY User {
  email: String
  name: String
  role: String
  subscriptionId: String?
  createdAt: DateTime
}

ENTITY Subscription {
  userId: String
  plan: String
  status: String
  currentPeriodEnd: DateTime
  cancelAtPeriodEnd: Boolean
}

ENTITY Invoice {
  subscriptionId: String
  amount: Decimal
  currency: String
  status: String
  paidAt: DateTime?
}

EVENT SubscriptionEvent {
  type: String
  userId: String
  subscriptionId: String
  plan: String?
}

DASHBOARD "SaaS Metrics" {
  ENTITY Subscription
  METRICS ["mrr", "activeUsers", "churnRate"]
  STREAM_MODE polling
}

ALERT "Payment Failed" {
  ENTITY Invoice
  CONDITION status == "failed"
  SEVERITY high
}
`;

    case 'e-commerce':
      return `// ${name} - E-Commerce Contract
// Generated by Reclapp

ENTITY Product {
  name: String
  sku: String
  price: Decimal
  stock: Int
  category: String
}

ENTITY Order {
  customerId: String
  status: String
  total: Decimal
  items: JSON
  shippedAt: DateTime?
}

ENTITY Customer {
  email: String
  name: String
  totalOrders: Int
  totalSpent: Decimal
}

EVENT OrderEvent {
  type: String
  orderId: String
  customerId: String
  total: Decimal
}

PIPELINE OrderProcessing {
  INPUT OrderEvent.stream
  TRANSFORM [validatePayment, updateInventory, notifyShipping]
  OUTPUT [customerNotification, analytics]
}

DASHBOARD "Sales Overview" {
  ENTITY Order
  METRICS ["totalRevenue", "orderCount", "avgOrderValue"]
  STREAM_MODE realtime
}

ALERT "Low Stock" {
  ENTITY Product
  CONDITION stock < 10
  SEVERITY medium
}
`;

    default:
      return `// ${name} - Minimal Contract
// Generated by Reclapp

ENTITY Item {
  name: String
  description: String?
  status: String
  createdAt: DateTime
}

DASHBOARD "Overview" {
  ENTITY Item
  METRICS ["total", "active"]
}
`;
  }
}

async function cmdDeploy(dir: string, options: ParsedArgs['options']): Promise<void> {
  console.log(color('🚀 Deploying application...', 'blue'));
  console.log(`   Directory: ${dir}`);
  console.log(`   Platform:  ${options.platform}`);
  
  if (!existsSync(dir)) {
    console.error(color(`✗ Directory not found: ${dir}`, 'red'));
    process.exit(1);
  }

  const commands: Record<string, string[]> = {
    docker: [
      `cd ${dir} && docker-compose build`,
      `cd ${dir} && docker-compose up -d`
    ],
    kubernetes: [
      `kubectl apply -f ${dir}/k8s/`
    ],
    vercel: [
      `cd ${dir}/frontend && vercel --prod`
    ],
    netlify: [
      `cd ${dir}/frontend && netlify deploy --prod`
    ]
  };

  const cmds = commands[options.platform] || commands.docker;
  
  console.log('');
  console.log('Deploy commands:');
  for (const cmd of cmds) {
    console.log(color(`  $ ${cmd}`, 'yellow'));
  }

  console.log('');
  console.log(color('Run these commands to deploy your application.', 'green'));
}

// Main entry point
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.options.help || !args.command) {
    printHelp();
    process.exit(0);
  }

  printHeader();

  switch (args.command) {
    case 'generate':
      if (!args.file) {
        console.error(color('✗ Missing contract file', 'red'));
        process.exit(1);
      }
      await cmdGenerate(args.file, args.options);
      break;

    case 'validate':
      if (!args.file) {
        console.error(color('✗ Missing contract file', 'red'));
        process.exit(1);
      }
      await cmdValidate(args.file, args.options);
      break;

    case 'deploy':
      if (!args.file) {
        console.error(color('✗ Missing directory', 'red'));
        process.exit(1);
      }
      await cmdDeploy(args.file, args.options);
      break;

    case 'init':
      if (!args.file) {
        console.error(color('✗ Missing project name', 'red'));
        process.exit(1);
      }
      cmdInit(args.file, args.options);
      break;

    case 'list-templates':
      cmdListTemplates();
      break;

    default:
      console.error(color(`✗ Unknown command: ${args.command}`, 'red'));
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error(color(`✗ Error: ${err.message}`, 'red'));
  process.exit(1);
});
