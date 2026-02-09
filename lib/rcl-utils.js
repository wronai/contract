/**
 * RCL Utilities - Shared functions for contract extraction and conversion
 *
 * Used by:
 * - lib/chat-core.js (ReclappChat class)
 * - studio/server.js
 * - bin/reclapp-chat
 *
 * @version 2.4.1 - Extracted from chat-core.js / studio/server.js (R04)
 */

const http = require('http');

/**
 * Call Ollama API
 * @param {Array} messages - Chat messages
 * @param {string} host - Ollama host URL
 * @param {string} model - Model name
 * @returns {Promise<string>} Response content
 */
function callOllama(messages, host, model) {
  return new Promise((resolve, reject) => {
    const url = new URL(host);
    const postData = JSON.stringify({
      model: model,
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
          reject(new Error('Failed to parse Ollama response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(120000, () => reject(new Error('Request timeout')));
    req.write(postData);
    req.end();
  });
}

/**
 * Coerce a value (string or object with rcl/source/text) into an RCL string
 */
function coerceToRclString(value) {
  if (typeof value === 'string') {
    return value.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
  if (!value || typeof value !== 'object') return null;
  if (typeof value.rcl === 'string') return coerceToRclString(value.rcl);
  if (typeof value.source === 'string') return coerceToRclString(value.source);
  if (typeof value.text === 'string') return coerceToRclString(value.text);
  return null;
}

/**
 * Check if a string looks like RCL (not JSON)
 */
function isLikelyRcl(contract) {
  const s = String(contract || '').trim();
  if (!s) return false;
  if (s.startsWith('{') || s.startsWith('[')) return false;
  if (/^\s*"contract"\s*:/m.test(s)) return false;
  return /^(app|entity|enum|event|alert|dashboard|pipeline|source|config)\b/m.test(s);
}

/**
 * Convert a legacy JSON contract object to RCL string
 */
function convertLegacyJsonContractToRcl(obj) {
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

/**
 * Extract contract from LLM response text
 */
function extractContract(response) {
  // Try JSON format first
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed && parsed.contract !== undefined) {
        const contractStr =
          coerceToRclString(parsed.contract) ||
          convertLegacyJsonContractToRcl(parsed.contract);
        if (contractStr && isLikelyRcl(contractStr)) {
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
    if ((inBlock && (!blockLang || blockLang === 'rcl')) || /^(app|entity|enum|event|alert|dashboard|pipeline)\s/.test(trimmed)) {
      lines.push(line);
    } else if (lines.length && (trimmed.startsWith('{') || trimmed.startsWith('}') || trimmed.includes(':'))) {
      lines.push(line);
    }
  }
  const candidate = lines.join('\n').trim() || null;
  return candidate && isLikelyRcl(candidate) ? candidate : null;
}

module.exports = {
  callOllama,
  coerceToRclString,
  isLikelyRcl,
  convertLegacyJsonContractToRcl,
  extractContract,
};
