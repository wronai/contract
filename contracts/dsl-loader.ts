/**
 * Reclapp DSL Loader & Converter
 * 
 * Loads contracts from various formats (.reclapp, .yaml, .json, .ts)
 * and converts them to validated TypeScript contracts.
 * 
 * Runtime flow:
 *   1. Load source file (any format)
 *   2. Parse/convert to TypeScript contract
 *   3. Validate contract structure
 *   4. Return validated contract or errors
 * 
 * @version 2.1.0
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ReclappContract, ValidationResult, ValidationError } from './dsl-types';
import { validateContract } from './dsl-types';

// ============================================================================
// TYPES
// ============================================================================

export type ContractFormat = 'reclapp' | 'yaml' | 'json' | 'typescript';

export interface LoadOptions {
  format?: ContractFormat;
  validate?: boolean;
  autoFix?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface LoadResult {
  contract: ReclappContract | null;
  validation: ValidationResult;
  format: ContractFormat;
  sourcePath: string;
  errors: string[];
  warnings: string[];
  fixed: string[];
}

export interface ConversionResult {
  success: boolean;
  typescript: string;
  errors: string[];
}

// ============================================================================
// LOGGER
// ============================================================================

class Logger {
  private level: 'debug' | 'info' | 'warn' | 'error';
  
  constructor(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.level = level;
  }
  
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
  
  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) console.log(`[DEBUG] ${message}`, ...args);
  }
  
  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) console.log(`[INFO] ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) console.warn(`[WARN] ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) console.error(`[ERROR] ${message}`, ...args);
  }
}

// ============================================================================
// FORMAT DETECTION
// ============================================================================

export function detectFormat(filePath: string): ContractFormat {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.ts':
      return 'typescript';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.json':
      return 'json';
    case '.reclapp':
    default:
      return 'reclapp';
  }
}

// ============================================================================
// RECLAPP DSL PARSER
// ============================================================================

interface ParsedSection {
  type: string;
  name: string;
  content: Record<string, any>;
}

class ReclappParser {
  private logger: Logger;
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;
  
  constructor(source: string, logger: Logger) {
    this.source = source;
    this.logger = logger;
  }
  
  parse(): Partial<ReclappContract> {
    const contract: Partial<ReclappContract> = {
      entities: [],
      events: [],
      pipelines: [],
      alerts: [],
      dashboards: [],
      workflows: [],
      sources: [],
      env: []
    };
    
    this.skipWhitespaceAndComments();
    
    while (this.pos < this.source.length) {
      const section = this.parseSection();
      if (section) {
        this.addSectionToContract(contract, section);
      }
      this.skipWhitespaceAndComments();
    }
    
    return contract;
  }
  
  private parseSection(): ParsedSection | null {
    const keyword = this.parseKeyword();
    if (!keyword) return null;
    
    this.skipWhitespace();
    
    let name = '';
    if (this.peek() === '"') {
      name = this.parseString();
    } else {
      name = this.parseIdentifier();
    }
    
    this.skipWhitespace();
    
    const content = this.parseBlock();
    
    return { type: keyword, name, content };
  }
  
  private parseKeyword(): string | null {
    const keywords = [
      'APP', 'DEPLOYMENT', 'BACKEND', 'FRONTEND', 'SOURCE', 'ENTITY', 'EVENT',
      'PIPELINE', 'ALERT', 'DASHBOARD', 'WORKFLOW', 'API', 'WEBSOCKET', 'IPC',
      'TRAY', 'SCHEDULER', 'ENV', 'CONFIG', 'DOCKER'
    ];
    
    for (const kw of keywords) {
      if (this.source.slice(this.pos, this.pos + kw.length) === kw) {
        const nextChar = this.source[this.pos + kw.length];
        if (!nextChar || /\s/.test(nextChar) || nextChar === '{' || nextChar === '"') {
          this.pos += kw.length;
          return kw;
        }
      }
    }
    
    // Skip unknown content until next keyword or EOF
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      for (const kw of keywords) {
        if (this.source.slice(this.pos, this.pos + kw.length) === kw) {
          return null;
        }
      }
      this.pos++;
    }
    
    return null;
  }
  
  private parseBlock(): Record<string, any> {
    const result: Record<string, any> = {};
    
    if (this.peek() !== '{') {
      return result;
    }
    
    this.pos++; // skip '{'
    this.skipWhitespaceAndComments();
    
    while (this.peek() !== '}' && this.pos < this.source.length) {
      const key = this.parseIdentifier();
      if (!key) {
        this.pos++;
        continue;
      }
      
      this.skipWhitespace();
      
      // Check for : or = separator, or direct value/block
      if (this.peek() === ':' || this.peek() === '=') {
        this.pos++;
      }
      
      this.skipWhitespace();
      
      const value = this.parseValue();
      result[key] = value;
      
      this.skipWhitespaceAndComments();
    }
    
    if (this.peek() === '}') {
      this.pos++;
    }
    
    return result;
  }
  
  private parseValue(): any {
    this.skipWhitespace();
    
    const c = this.peek();
    
    if (c === '{') {
      return this.parseBlock();
    }
    
    if (c === '[') {
      return this.parseArray();
    }
    
    if (c === '"') {
      return this.parseString();
    }
    
    if (c === '$') {
      return this.parseEnvVar();
    }
    
    // Try to parse number, boolean, or identifier
    return this.parseLiteral();
  }
  
  private parseArray(): any[] {
    const result: any[] = [];
    
    this.pos++; // skip '['
    this.skipWhitespaceAndComments();
    
    while (this.peek() !== ']' && this.pos < this.source.length) {
      const value = this.parseValue();
      result.push(value);
      
      this.skipWhitespaceAndComments();
      
      if (this.peek() === ',') {
        this.pos++;
      }
      
      this.skipWhitespaceAndComments();
    }
    
    if (this.peek() === ']') {
      this.pos++;
    }
    
    return result;
  }
  
  private parseString(): string {
    if (this.peek() !== '"') return '';
    
    this.pos++; // skip opening quote
    let result = '';
    
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.pos++;
        const escaped = this.peek();
        switch (escaped) {
          case 'n': result += '\n'; break;
          case 't': result += '\t'; break;
          case 'r': result += '\r'; break;
          default: result += escaped;
        }
      } else {
        result += this.peek();
      }
      this.pos++;
    }
    
    if (this.peek() === '"') {
      this.pos++;
    }
    
    return result;
  }
  
  private parseEnvVar(): string {
    let result = '';
    while (this.pos < this.source.length && /[a-zA-Z0-9_${}:]/.test(this.peek())) {
      result += this.peek();
      this.pos++;
    }
    return result;
  }
  
  private parseLiteral(): any {
    let value = '';
    
    while (this.pos < this.source.length) {
      const c = this.peek();
      if (/[\s{}\[\],;]/.test(c)) break;
      value += c;
      this.pos++;
    }
    
    // Try to parse as number
    if (/^-?\d+\.?\d*$/.test(value)) {
      return parseFloat(value);
    }
    
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    
    return value;
  }
  
  private parseIdentifier(): string {
    let result = '';
    while (this.pos < this.source.length && /[a-zA-Z0-9_@]/.test(this.peek())) {
      result += this.peek();
      this.pos++;
    }
    return result;
  }
  
  private peek(): string {
    return this.source[this.pos] || '';
  }
  
  private skipWhitespace() {
    while (this.pos < this.source.length && /\s/.test(this.peek())) {
      if (this.peek() === '\n') {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }
      this.pos++;
    }
  }
  
  private skipWhitespaceAndComments() {
    while (this.pos < this.source.length) {
      this.skipWhitespace();
      
      // Single-line comment
      if (this.source.slice(this.pos, this.pos + 2) === '//') {
        while (this.pos < this.source.length && this.peek() !== '\n') {
          this.pos++;
        }
        continue;
      }
      
      // Multi-line comment
      if (this.source.slice(this.pos, this.pos + 2) === '/*') {
        this.pos += 2;
        while (this.pos < this.source.length && this.source.slice(this.pos, this.pos + 2) !== '*/') {
          this.pos++;
        }
        this.pos += 2;
        continue;
      }
      
      // # comment
      if (this.peek() === '#') {
        while (this.pos < this.source.length && this.peek() !== '\n') {
          this.pos++;
        }
        continue;
      }
      
      break;
    }
  }
  
  private addSectionToContract(contract: Partial<ReclappContract>, section: ParsedSection) {
    switch (section.type) {
      case 'APP':
        contract.app = {
          name: section.name || section.content.name || '',
          version: section.content.VERSION || section.content.version || '1.0.0',
          description: section.content.DESCRIPTION || section.content.description || '',
          author: section.content.AUTHOR || section.content.author,
          license: section.content.LICENSE || section.content.license
        };
        break;
        
      case 'ENTITY':
        contract.entities!.push({
          name: section.name,
          fields: this.parseFields(section.content)
        });
        break;
        
      case 'EVENT':
        contract.events!.push({
          name: section.name,
          fields: this.parseFields(section.content)
        });
        break;
        
      case 'PIPELINE':
        contract.pipelines!.push({
          name: section.name,
          input: section.content.INPUT || section.content.input || [],
          transform: section.content.TRANSFORM || section.content.transform || [],
          output: section.content.OUTPUT || section.content.output || [],
          schedule: section.content.SCHEDULE || section.content.schedule
        });
        break;
        
      case 'ALERT':
        contract.alerts!.push({
          name: section.name,
          entity: section.content.ENTITY || section.content.entity || '',
          condition: section.content.CONDITION || section.content.condition || '',
          target: section.content.TARGET || section.content.target || [],
          severity: section.content.SEVERITY || section.content.severity || 'medium',
          throttle: section.content.THROTTLE || section.content.throttle
        });
        break;
        
      case 'DASHBOARD':
        contract.dashboards!.push({
          name: section.name,
          entity: section.content.ENTITY || section.content.entity,
          metrics: section.content.METRICS || section.content.metrics || [],
          streamMode: section.content.STREAM_MODE || section.content.streamMode || 'polling',
          layout: section.content.LAYOUT || section.content.layout || 'grid'
        });
        break;
        
      case 'SOURCE':
        contract.sources!.push({
          name: section.name,
          type: section.content.TYPE || section.content.type || 'rest',
          url: section.content.URL || section.content.url,
          auth: section.content.AUTH || section.content.auth,
          cacheDuration: section.content.CACHE_DURATION || section.content.cacheDuration
        });
        break;
        
      case 'DEPLOYMENT':
        contract.deployment = {
          type: section.name as any || 'web',
          framework: section.content.FRAMEWORK || section.content.framework || '',
          platforms: section.content.PLATFORMS || section.content.platforms,
          build: section.content.BUILD || section.content.build || { outputDir: 'target' },
          hosting: section.content.HOSTING || section.content.hosting
        };
        break;
        
      case 'BACKEND':
        contract.backend = {
          runtime: section.content.RUNTIME || section.content.runtime || 'node',
          framework: section.content.FRAMEWORK || section.content.framework || 'express',
          port: section.content.PORT || section.content.port,
          database: section.content.DATABASE || section.content.database,
          cache: section.content.CACHE || section.content.cache,
          auth: section.content.AUTH || section.content.auth
        };
        break;
        
      case 'FRONTEND':
        contract.frontend = {
          framework: section.content.FRAMEWORK || section.content.framework || 'react',
          bundler: section.content.BUNDLER || section.content.bundler || 'vite',
          style: section.content.STYLE || section.content.style || 'tailwindcss',
          components: section.content.COMPONENTS || section.content.components,
          theme: section.content.THEME || section.content.theme,
          layout: section.content.LAYOUT || section.content.layout
        };
        break;
        
      case 'ENV':
        // Parse ENV block into array of EnvVar
        for (const [key, value] of Object.entries(section.content)) {
          contract.env!.push({
            name: key,
            type: typeof value === 'object' ? (value as any).type || 'String' : 'String',
            default: typeof value === 'object' ? (value as any).default : value,
            required: typeof value === 'object' ? (value as any).required : false,
            secret: typeof value === 'object' ? (value as any).secret : false
          });
        }
        break;
        
      case 'CONFIG':
        if (!contract.config) contract.config = {};
        contract.config[section.name] = section.content;
        break;
        
      default:
        this.logger.warn(`Unknown section type: ${section.type}`);
    }
  }
  
  private parseFields(content: Record<string, any>): any[] {
    const fields: any[] = [];
    
    for (const [name, value] of Object.entries(content)) {
      if (typeof value === 'string') {
        // Simple field: name: Type
        const [type, ...annotations] = value.split(/\s+@/);
        fields.push({
          name,
          type: type.replace('?', '').replace('[]', ''),
          nullable: type.includes('?'),
          array: type.includes('[]'),
          annotations: this.parseAnnotations(annotations)
        });
      } else if (typeof value === 'object') {
        // Complex field definition
        fields.push({
          name,
          ...value
        });
      }
    }
    
    return fields;
  }
  
  private parseAnnotations(annotations: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const ann of annotations) {
      if (ann === 'unique') result.unique = true;
      else if (ann === 'required') result.required = true;
      else if (ann === 'generated') result.generated = true;
      else if (ann === 'index') result.index = true;
      else if (ann === 'secret') result.secret = true;
      else if (ann === 'computed') result.computed = true;
      else if (ann.startsWith('relation(')) {
        result.relation = ann.match(/relation\(([^)]+)\)/)?.[1];
      }
      else if (ann.startsWith('default(')) {
        result.default = ann.match(/default\(([^)]+)\)/)?.[1];
      }
    }
    
    return result;
  }
}

// ============================================================================
// YAML PARSER (simplified)
// ============================================================================

function parseYaml(source: string): Partial<ReclappContract> {
  // For full YAML support, use js-yaml library
  // This is a simplified parser for basic YAML
  try {
    // Try to use dynamic import for js-yaml if available
    const yaml = require('js-yaml');
    return yaml.load(source) as Partial<ReclappContract>;
  } catch {
    // Fallback: very basic YAML-like parsing
    const lines = source.split('\n');
    const result: any = {};
    let currentKey = '';
    let indent = 0;
    
    for (const line of lines) {
      if (line.trim().startsWith('#') || !line.trim()) continue;
      
      const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
      if (match) {
        const [, spaces, key, value] = match;
        if (value) {
          result[key] = value.trim();
        } else {
          currentKey = key;
          result[key] = {};
        }
      }
    }
    
    return result;
  }
}

// ============================================================================
// MAIN LOADER
// ============================================================================

export async function loadContract(
  filePath: string,
  options: LoadOptions = {}
): Promise<LoadResult> {
  const logger = new Logger(options.logLevel || 'info');
  const format = options.format || detectFormat(filePath);
  
  const result: LoadResult = {
    contract: null,
    validation: { valid: false, errors: [], warnings: [] },
    format,
    sourcePath: filePath,
    errors: [],
    warnings: [],
    fixed: []
  };
  
  logger.info(`Loading contract from ${filePath} (format: ${format})`);
  
  // Check file exists
  if (!fs.existsSync(filePath)) {
    result.errors.push(`File not found: ${filePath}`);
    logger.error(`File not found: ${filePath}`);
    return result;
  }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  
  try {
    let contract: Partial<ReclappContract>;
    
    switch (format) {
      case 'typescript':
        // For TypeScript, we need to import the module
        const tsPath = path.resolve(filePath);
        delete require.cache[tsPath]; // Clear cache for hot reload
        const module = require(tsPath);
        contract = module.contract || module.default || module;
        break;
        
      case 'json':
        contract = JSON.parse(source);
        break;
        
      case 'yaml':
        contract = parseYaml(source);
        break;
        
      case 'reclapp':
      default:
        const parser = new ReclappParser(source, logger);
        contract = parser.parse();
        break;
    }
    
    // Validate if requested
    if (options.validate !== false) {
      result.validation = validateContract(contract as ReclappContract);
      
      if (!result.validation.valid) {
        for (const err of result.validation.errors) {
          result.errors.push(`${err.path}: ${err.message}`);
          logger.error(`Validation error at ${err.path}: ${err.message}`);
        }
        
        // Try auto-fix if enabled
        if (options.autoFix) {
          const fixed = autoFixContract(contract, result.validation.errors, logger);
          result.fixed = fixed;
          
          // Re-validate after fixes
          result.validation = validateContract(contract as ReclappContract);
        }
      }
      
      for (const warn of result.validation.warnings) {
        result.warnings.push(`${warn.path}: ${warn.message}`);
        logger.warn(`Validation warning at ${warn.path}: ${warn.message}`);
      }
    }
    
    result.contract = contract as ReclappContract;
    
    if (result.validation.valid) {
      logger.info(`Contract loaded successfully`);
    } else {
      logger.warn(`Contract loaded with ${result.errors.length} errors`);
    }
    
  } catch (error: any) {
    result.errors.push(`Parse error: ${error.message}`);
    logger.error(`Failed to parse contract: ${error.message}`);
  }
  
  return result;
}

// ============================================================================
// AUTO-FIX
// ============================================================================

function autoFixContract(
  contract: Partial<ReclappContract>,
  errors: ValidationError[],
  logger: Logger
): string[] {
  const fixed: string[] = [];
  
  for (const error of errors) {
    switch (error.code) {
      case 'REQUIRED':
        if (error.path === 'app.name' && !contract.app?.name) {
          if (!contract.app) contract.app = { name: '', version: '', description: '' };
          contract.app.name = 'Unnamed Contract';
          fixed.push(`Set default app.name to 'Unnamed Contract'`);
          logger.info(`Auto-fixed: ${error.path}`);
        }
        if (error.path === 'app.version' && !contract.app?.version) {
          if (!contract.app) contract.app = { name: '', version: '', description: '' };
          contract.app.version = '1.0.0';
          fixed.push(`Set default app.version to '1.0.0'`);
          logger.info(`Auto-fixed: ${error.path}`);
        }
        break;
    }
  }
  
  return fixed;
}

// ============================================================================
// CONVERTER TO TYPESCRIPT
// ============================================================================

export function convertToTypeScript(contract: ReclappContract): ConversionResult {
  const errors: string[] = [];
  
  try {
    const lines: string[] = [
      '/**',
      ` * ${contract.app.name} - Reclapp TypeScript Contract`,
      ' *',
      ` * ${contract.app.description}`,
      ' *',
      ` * @version ${contract.app.version}`,
      ' */',
      '',
      "import type { ReclappContract } from '@reclapp/contracts/dsl-types';",
      '',
      'export const contract: ReclappContract = ' + JSON.stringify(contract, null, 2) + ';',
      '',
      'export default contract;'
    ];
    
    return {
      success: true,
      typescript: lines.join('\n'),
      errors: []
    };
  } catch (error: any) {
    return {
      success: false,
      typescript: '',
      errors: [`Conversion error: ${error.message}`]
    };
  }
}

// ============================================================================
// CLI SUPPORT
// ============================================================================

export async function main(args: string[]) {
  const [command, inputPath, ...rest] = args;
  
  if (!command || command === 'help' || command === '--help') {
    console.log(`
Reclapp DSL Loader

Usage:
  reclapp-loader load <file>           Load and validate a contract
  reclapp-loader convert <file>        Convert to TypeScript
  reclapp-loader validate <file>       Validate a contract

Options:
  --format=<format>   Force format (reclapp, yaml, json, typescript)
  --auto-fix          Attempt to auto-fix validation errors
  --output=<file>     Output file for conversion
`);
    return;
  }
  
  const options: LoadOptions = {
    autoFix: rest.includes('--auto-fix'),
    logLevel: 'info'
  };
  
  const formatArg = rest.find(a => a.startsWith('--format='));
  if (formatArg) {
    options.format = formatArg.split('=')[1] as ContractFormat;
  }
  
  switch (command) {
    case 'load':
    case 'validate':
      const result = await loadContract(inputPath, options);
      console.log('\nValidation Result:');
      console.log(`  Valid: ${result.validation.valid}`);
      console.log(`  Errors: ${result.errors.length}`);
      console.log(`  Warnings: ${result.warnings.length}`);
      if (result.fixed.length > 0) {
        console.log(`  Auto-fixed: ${result.fixed.length}`);
      }
      break;
      
    case 'convert':
      const loadResult = await loadContract(inputPath, options);
      if (loadResult.contract) {
        const conversion = convertToTypeScript(loadResult.contract);
        if (conversion.success) {
          const outputArg = rest.find(a => a.startsWith('--output='));
          if (outputArg) {
            const outputPath = outputArg.split('=')[1];
            fs.writeFileSync(outputPath, conversion.typescript);
            console.log(`Converted to ${outputPath}`);
          } else {
            console.log(conversion.typescript);
          }
        } else {
          console.error('Conversion failed:', conversion.errors);
        }
      }
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
  }
}

// Run if called directly
if (require.main === module) {
  main(process.argv.slice(2));
}
