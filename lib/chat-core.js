#!/usr/bin/env node
/**
 * Reclapp Chat Core - Shared chat functionality
 * 
 * Used by:
 * - bin/reclapp-chat
 * - studio/chat-shell.js
 * - studio/server.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';
const DEFAULT_MODEL = 'deepseek-coder:6.7b';

function normalizeMiniRclSource(source) {
  if (!source || typeof source !== 'string') return source;

  let s = source.replace(/\r\n/g, '\n');

  // Ensure app name is quoted (Mini-DSL expects StringLiteral)
  s = s.replace(/^(\s*app)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/m, '$1 "$2" {');

  // Split multiple top-level statements that appear on one line
  s = s
    .replace(/}\s*(entity|enum|event|alert|dashboard|pipeline|source|config)\b/g, '}' + '\n\n' + '$1')
    .replace(/}\s*(app)\b/g, '}' + '\n\n' + '$1');

  const lines = s.split('\n');
  const out = [];
  let ctx = null;

  for (let raw of lines) {
    let line = raw;
    const trimmed = line.trim();

    // Track block context
    const start = trimmed.match(/^(app|entity|enum|event|alert|dashboard|pipeline|source|config)\b/);
    if (start && trimmed.includes('{')) ctx = start[1];

    // Remove trailing commas at end of lines (common LLM mistake)
    // IMPORTANT: keep commas in enum value lists
    if (ctx !== 'enum') {
      line = line.replace(/,\s*$/, '');
    }

    // Normalize money(PLN)
    line = line.replace(/\bmoney\s+([A-Z]{3})\b/g, 'money($1)');

    // Normalize common modifier aliases
    line = line.replace(/@indexed\b/g, '@index');

    if (ctx === 'entity') {
      const indent = line.match(/^\s*/)?.[0] || '';

      // Many LLMs separate fields with commas on a single line.
      // The Mini-DSL grammar expects one field per line.
      line = line.replace(/,\s*/g, `\n${indent}`);

      // Entity fields must NOT use ':'
      line = line.replace(/^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:\s*/, '$1$2 ');

      // Normalize relation modifiers into relation arrows
      line = line.replace(
        /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?\s+@belongs_to\b(.*)$/,
        '$1$2 -> $3$4$5'
      );
      line = line.replace(
        /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?\s+@has_many\b(.*)$/,
        '$1$2 <- $3$4$5'
      );
      line = line.replace(/@belongs_to\b/g, '');
      line = line.replace(/@has_many\b/g, '');

      // Remove legacy relation hints
      line = line.replace(/\(\s*(belongs_to|has_many)\s*\)/g, '');

      // Fix relation syntax where arrow is placed after the target type
      // e.g. "contact: Contact ->" or "seller: User ->" => "contact -> Contact"
      line = line.replace(
        /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?\s*(->|<-)\s*$/,
        '$1$2 $5 $3$4'
      );

      // e.g. "reviews: Review[] <- (has_many)" => "reviews <- Review[]"
      line = line.replace(
        /^(\s*)([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(\[\])?\s*(->|<-)\s+/,
        '$1$2 $5 $3$4 '
      );
    }

    if (ctx === 'alert') {
      // alert.entity expects single Identifier (avoid "A or B")
      line = line.replace(/^(\s*entity\s*:\s*)([A-Za-z_][A-Za-z0-9_]*).*/, '$1$2');
    }

    // Close block
    if (trimmed === '}' || trimmed === '},') {
      ctx = null;
      line = line.replace(/,\s*$/, '');
    }

    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// System prompt for contract generation
const SYSTEM_PROMPT = `You are a contract designer for Reclapp. Generate application contracts in Reclapp Mini-DSL (RCL) format.

## OUTPUT FORMAT
Respond with RCL code in a code block:
\`\`\`rcl
app "AppName" { version: "1.0.0" }

entity EntityName {
  id uuid @unique @generated
  fieldName type @modifiers
}
\`\`\`

## RCL SYNTAX

### App (required first)
app "Name" { version: "1.0.0" }

### Entity
entity EntityName {
  id          uuid      @unique @generated
  fieldName   type      @modifiers
  relation    -> Other?
  createdAt   datetime  @generated
}

Types: text, email, phone, url, int, float, decimal, bool, date, datetime, uuid, json, money(PLN)
Modifiers: @unique, @required, @generated, @index, @default(value)
Relations: -> OtherEntity (belongs_to), <- OtherEntity[] (has_many)

### Enum
enum Status { Active, Pending, Archived }

### Event
event EventName { fieldName: type }

## EXAMPLE
User: "Create a task manager"

\`\`\`rcl
app "Task Manager" { version: "1.0.0" }

enum TaskStatus { Todo, InProgress, Done }

entity User {
  id uuid @unique @generated
  email email @unique @required
  name text @required
}

entity Task {
  id uuid @unique @generated
  title text @required
  status TaskStatus @default(Todo)
  assignee -> User?
  createdAt datetime @generated
}
\`\`\`

Always output valid RCL code. Start with app declaration.`;

/**
 * ReclappChat - Core chat class
 */
class ReclappChat {
  constructor(options = {}) {
    this.ollamaHost = options.ollamaHost || process.env.OLLAMA_HOST || DEFAULT_OLLAMA_HOST;
    this.model = options.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL;
    this.history = [];
    this.currentContract = '';
    this.projectName = options.projectName || 'my-app';
    this.systemPrompt = options.systemPrompt || SYSTEM_PROMPT;
  }

  /**
   * Send message to LLM and get response
   */
  async chat(message) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.history,
      { role: 'user', content: message }
    ];

    try {
      const response = await this.callOllama(messages);
      this.history.push({ role: 'user', content: message });
      this.history.push({ role: 'assistant', content: response });
      
      // Extract contract from response
      const contract = this.extractContract(response);
      if (contract) {
        this.currentContract = normalizeMiniRclSource(contract);
      }
      
      return { response, contract, history: this.history };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Call Ollama API
   */
  async callOllama(messages) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.ollamaHost);
      const postData = JSON.stringify({
        model: this.model,
        messages: messages,
        stream: false,
        options: { temperature: 0.7 }
      });

      const options = {
        hostname: url.hostname,
        port: url.port || 11434,
        path: '/api/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.message?.content || 'No response');
          } catch (e) {
            reject(new Error('Failed to parse response'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(120000, () => reject(new Error('Timeout')));
      req.write(postData);
      req.end();
    });
  }

  /**
   * Extract contract from LLM response
   */
  coerceToRclString(value) {
    if (typeof value === 'string') {
      return value.replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    if (!value || typeof value !== 'object') return null;
    if (typeof value.rcl === 'string') return this.coerceToRclString(value.rcl);
    if (typeof value.source === 'string') return this.coerceToRclString(value.source);
    if (typeof value.text === 'string') return this.coerceToRclString(value.text);
    return null;
  }

  isLikelyRcl(contract) {
    const s = String(contract || '').trim();
    if (!s) return false;
    if (s.startsWith('{') || s.startsWith('[')) return false;
    if (/^\s*"contract"\s*:/m.test(s)) return false;
    return /^(app|entity|enum|event|alert|dashboard|pipeline|source|config)\b/m.test(s);
  }

  convertLegacyJsonContractToRcl(obj) {
    if (!obj || typeof obj !== 'object') return null;

    const enums = new Map();
    const entities = [];
    const events = [];
    const other = [];

    const addEnum = (name, values) => {
      const enumName = String(name || '').trim();
      if (!enumName) return;
      const vals = Array.isArray(values)
        ? values.map(v => String(v).trim()).filter(Boolean)
        : String(values || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
      if (!vals.length) return;
      if (!enums.has(enumName)) {
        enums.set(enumName, `enum ${enumName} { ${vals.join(', ')} }`);
      }
    };

    const appStr = typeof obj.app === 'string' ? obj.app.trim() : '';
    if (appStr) {
      const m = appStr.match(/^\s*([^{}]+?)\s*\{\s*version\s*:\s*['"]([^'"]+)['"][^}]*\}\s*$/);
      if (m) {
        other.push(`app "${m[1].trim()}" { version: "${m[2].trim()}" }`);
      } else if (/^\s*app\b/.test(appStr)) {
        other.push(appStr);
      }
    }

    const asList = v => (Array.isArray(v) ? v : []);
    const entityBlocks = asList(obj.entities).length ? obj.entities : obj.entity;
    for (const raw of asList(entityBlocks)) {
      const s = String(raw || '').trim();
      if (!s) continue;

      const enumLike = s.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*([^:{}@]+?)\s*\}\s*$/);
      if (enumLike && enumLike[2].includes(',')) {
        addEnum(enumLike[1], enumLike[2]);
        continue;
      }

      const m = s.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*)\}\s*$/);
      if (!m) continue;

      const name = m[1];
      let body = m[2].trim();
      body = body.replace(/,\s*/g, '\n');
      const lines = body
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .map(l => l.replace(/:\s*/g, ' '))
        .map(l => {
          const em = l.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+enum\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*([^}]+)\s*\}\s*$/);
          if (em) {
            addEnum(em[2], em[3]);
            return `${em[1]} ${em[2]}`;
          }
          return l;
        });

      entities.push(`entity ${name} {\n${lines.map(l => `  ${l}`).join('\n')}\n}`);
    }

    const eventBlocks = asList(obj.events).length ? obj.events : obj.event;
    for (const raw of asList(eventBlocks)) {
      const s = String(raw || '').trim();
      if (!s) continue;
      const m = s.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\{([\s\S]*)\}\s*$/);
      if (!m) continue;
      const name = m[1];
      let body = m[2].trim();
      body = body.replace(/,\s*/g, '\n');
      const lines = body
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
      events.push(`event ${name} {\n${lines.map(l => `  ${l}`).join('\n')}\n}`);
    }

    const parts = [];
    parts.push(...other);
    parts.push(...Array.from(enums.values()));
    parts.push(...entities);
    parts.push(...events);

    const out = parts.join('\n\n').trim();
    return out || null;
  }

  extractContract(response) {
    // Try JSON format first
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed && parsed.contract !== undefined) {
          const contractStr =
            this.coerceToRclString(parsed.contract) ||
            this.convertLegacyJsonContractToRcl(parsed.contract);
          if (contractStr && this.isLikelyRcl(contractStr)) {
            return contractStr;
          }
        }
      } catch (e) { /* fallback below */ }
    }

    // Try RCL code block
    const rclMatch = response.match(/```rcl\s*([\s\S]*?)\s*```/);
    if (rclMatch) {
      return rclMatch[1].trim();
    }

    // Fallback - extract RCL keywords
    const lines = [];
    let inBlock = false;
    let blockLang = '';
    for (const line of response.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inBlock = !inBlock;
        if (inBlock) {
          const m = trimmed.match(/^```\s*([A-Za-z0-9_-]+)?/);
          blockLang = (m && m[1] ? m[1] : '').toLowerCase();
        } else {
          blockLang = '';
        }
        continue;
      }
      if ((inBlock && (!blockLang || blockLang === 'rcl')) || /^(app|entity|enum|event|alert|dashboard)\s/.test(trimmed)) {
        lines.push(line);
      }
    }
    const candidate = lines.join('\n').trim() || null;
    return candidate && this.isLikelyRcl(candidate) ? candidate : null;
  }

  /**
   * Format contract with proper indentation
   */
  formatContract(contract) {
    if (!contract) return '';
    const lines = [];
    let indent = 0;
    for (const line of contract.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('}')) indent = Math.max(0, indent - 1);
      lines.push('  '.repeat(indent) + trimmed);
      if (trimmed.endsWith('{')) indent++;
    }
    return lines.join('\n');
  }

  /**
   * Validate contract syntax
   */
  validateContract(contract = this.currentContract) {
    const errors = [];
    
    if (!contract) {
      return { valid: false, errors: ['No contract'], stats: { entities: 0, events: 0, enums: 0 } };
    }
    
    if (!contract.match(/app\s+["']/)) {
      errors.push('Missing app declaration');
    }
    
    const openBraces = (contract.match(/\{/g) || []).length;
    const closeBraces = (contract.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    if (/:\s*string\b/i.test(contract)) {
      errors.push("Use 'text' instead of 'string'");
    }
    
    const entities = (contract.match(/entity\s+\w+/g) || []).length;
    const events = (contract.match(/event\s+\w+/g) || []).length;
    const enums = (contract.match(/enum\s+\w+/g) || []).length;
    
    return { valid: errors.length === 0, errors, stats: { entities, events, enums } };
  }

  /**
   * Save contract to files
   */
  saveContract(outputDir, format = 'all') {
    if (!this.currentContract) {
      return { success: false, error: 'No contract to save', files: [] };
    }

    const contractsDir = path.join(outputDir, 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });

    const formatted = this.formatContract(normalizeMiniRclSource(this.currentContract));
    const saved = [];

    // Save .reclapp.rcl (minimized, for storage/generation)
    if (format === 'all' || format === 'rcl') {
      const rclPath = path.join(contractsDir, 'main.reclapp.rcl');
      fs.writeFileSync(rclPath, formatted);
      saved.push({ path: rclPath, format: 'rcl' });
    }

    // Save .rcl.md (readable, with conversation)
    if (format === 'all' || format === 'md') {
      const mdPath = path.join(contractsDir, 'main.rcl.md');
      const mdContent = this.toMarkdown(formatted);
      fs.writeFileSync(mdPath, mdContent);
      saved.push({ path: mdPath, format: 'md' });
    }

    // Save .reclapp.ts (executable, validatable)
    if (format === 'all' || format === 'ts') {
      const tsPath = path.join(contractsDir, 'main.reclapp.ts');
      const tsContent = this.toTypeScript(formatted);
      fs.writeFileSync(tsPath, tsContent);
      saved.push({ path: tsPath, format: 'ts' });
    }

    return { success: true, files: saved };
  }

  /**
   * Convert contract to Markdown with conversation history
   */
  toMarkdown(contract = this.currentContract) {
    const formatted = typeof contract === 'string' ? contract : this.formatContract(contract);
    
    // Extract app info
    const appMatch = formatted.match(/app\s+["']([^"']+)["']\s*\{([^}]*)\}/);
    const appName = appMatch ? appMatch[1] : this.projectName;
    const versionMatch = formatted.match(/version:\s*["']([^"']+)["']/);
    const version = versionMatch ? versionMatch[1] : '1.0.0';

    // Count elements
    const entities = (formatted.match(/entity\s+\w+/g) || []).length;
    const events = (formatted.match(/event\s+\w+/g) || []).length;
    const enums = (formatted.match(/enum\s+\w+/g) || []).length;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];

    let md = `# ${appName}

> Generated by Reclapp

## Metadata

| Property | Value |
|----------|-------|
| Version | ${version} |
| Project | ${this.projectName} |
| Created | ${dateStr} |
| Time | ${timeStr} |
| Messages | ${this.history.length} |
| Entities | ${entities} |
| Events | ${events} |
| Enums | ${enums} |

---

`;

    // Add conversation history if present
    if (this.history && this.history.length > 0) {
      md += `## 💬 Conversation

<!-- reclapp:conversation -->

`;
      this.history.forEach((msg) => {
        const role = msg.role === 'user' ? '🧑 User' : '🤖 Assistant';
        md += `### ${role}

${msg.content}

`;
      });
      md += `---

`;
    }

    md += `## 📦 Contract (RCL)

\`\`\`rcl
${formatted}
\`\`\`

---

*Generated by Reclapp*
`;
    return md;
  }

  /**
   * Convert contract to TypeScript
   */
  toTypeScript(contract = this.currentContract) {
    const formatted = typeof contract === 'string' ? contract : this.formatContract(contract);
    
    // Parse contract
    const appMatch = formatted.match(/app\s+["']([^"']+)["']\s*\{([^}]*)\}/);
    const appName = appMatch ? appMatch[1] : 'App';
    const versionMatch = formatted.match(/version:\s*["']([^"']+)["']/);
    const version = versionMatch ? versionMatch[1] : '1.0.0';

    // Extract entities
    const entityRegex = /entity\s+(\w+)\s*\{([^}]*)\}/g;
    const entities = [];
    let match;
    while ((match = entityRegex.exec(formatted)) !== null) {
      const [, name, body] = match;
      const fields = this.parseFields(body);
      entities.push({ name, fields });
    }

    // Extract enums
    const enumRegex = /enum\s+(\w+)\s*\{([^}]*)\}/g;
    const enums = [];
    while ((match = enumRegex.exec(formatted)) !== null) {
      const [, name, values] = match;
      enums.push({ name, values: values.split(',').map(v => v.trim()).filter(Boolean) });
    }

    // Build TypeScript
    let ts = `/**
 * ${appName} - Reclapp Contract
 * Version: ${version}
 * Generated: ${new Date().toISOString()}
 */

import type { ReclappContract, Entity } from '@reclapp/contracts';

`;

    // Enums
    enums.forEach(e => {
      ts += `export enum ${e.name} {\n`;
      e.values.forEach(v => {
        ts += `  ${v} = '${v}',\n`;
      });
      ts += `}\n\n`;
    });

    // Interfaces
    entities.forEach(e => {
      ts += `export interface ${e.name} {\n`;
      e.fields.forEach(f => {
        const tsType = this.rclToTsType(f.type);
        const optional = f.optional ? '?' : '';
        ts += `  ${f.name}${optional}: ${tsType};\n`;
      });
      ts += `}\n\n`;
    });

    // Contract export
    ts += `export const contract: ReclappContract = {
  app: { name: '${appName}', version: '${version}' },
  entities: [${entities.map(e => `'${e.name}'`).join(', ')}],
  enums: [${enums.map(e => `'${e.name}'`).join(', ')}]
};

export default contract;
`;
    return ts;
  }

  /**
   * Parse fields from entity body
   */
  parseFields(body) {
    const fields = [];
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    
    for (const line of lines) {
      const match = line.match(/^(\w+)\s+([\w\[\]<>?-]+)\s*(.*)$/);
      if (match) {
        const [, name, type, modifiers] = match;
        fields.push({
          name,
          type: type.replace(/[?]$/, ''),
          optional: type.endsWith('?') || modifiers.includes('?'),
          modifiers: modifiers.split(/\s+/).filter(m => m.startsWith('@'))
        });
      }
    }
    return fields;
  }

  /**
   * Convert RCL type to TypeScript type
   */
  rclToTsType(rclType) {
    const typeMap = {
      'uuid': 'string',
      'text': 'string',
      'email': 'string',
      'phone': 'string',
      'url': 'string',
      'int': 'number',
      'float': 'number',
      'decimal': 'number',
      'bool': 'boolean',
      'date': 'Date',
      'datetime': 'Date',
      'json': 'Record<string, unknown>'
    };
    
    // Handle arrays
    if (rclType.endsWith('[]')) {
      const baseType = rclType.slice(0, -2);
      return `${typeMap[baseType] || baseType}[]`;
    }
    
    // Handle relations
    if (rclType.startsWith('->') || rclType.startsWith('<-')) {
      return rclType.replace(/^[-<>]+\s*/, '').replace('?', '') + ' | null';
    }
    
    return typeMap[rclType] || rclType;
  }

  /**
   * Clear conversation history
   */
  clear() {
    this.history = [];
    this.currentContract = '';
  }

  /**
   * Set project name
   */
  setProjectName(name) {
    this.projectName = name;
  }

  /**
   * Set model
   */
  setModel(model) {
    this.model = model;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      model: this.model,
      ollamaHost: this.ollamaHost,
      projectName: this.projectName,
      historyLength: this.history.length,
      hasContract: !!this.currentContract
    };
  }
}

// Export
module.exports = {
  ReclappChat,
  SYSTEM_PROMPT,
  DEFAULT_OLLAMA_HOST,
  DEFAULT_MODEL,
  normalizeMiniRclSource
};
