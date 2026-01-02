/**
 * ENV Configurator - Web Interface
 * 
 * Web-based configuration editor for .env files.
 * Provides forms for each variable with validation.
 * 
 * Usage: npx ts-node tools/env-configurator/server.ts
 * 
 * @version 1.0.0
 */

import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = process.env.CONFIG_PORT || 9999;
const ENV_FILE = process.env.ENV_FILE || path.join(__dirname, '../../.env');
const ENV_EXAMPLE = path.join(__dirname, '../../.env.example');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// TYPES
// ============================================================================

interface EnvVariable {
  key: string;
  value: string;
  defaultValue: string;
  description: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'secret' | 'url';
  required: boolean;
}

interface EnvCategory {
  name: string;
  description: string;
  variables: EnvVariable[];
}

// ============================================================================
// ENV PARSING
// ============================================================================

function parseEnvFile(filePath: string): Map<string, string> {
  const vars = new Map<string, string>();
  
  if (!fs.existsSync(filePath)) {
    return vars;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      vars.set(key, value);
    }
  }
  
  return vars;
}

function parseEnvExample(): EnvCategory[] {
  const categories: EnvCategory[] = [];
  let currentCategory: EnvCategory | null = null;
  
  if (!fs.existsSync(ENV_EXAMPLE)) {
    return categories;
  }
  
  const content = fs.readFileSync(ENV_EXAMPLE, 'utf-8');
  const lines = content.split('\n');
  const currentVars = parseEnvFile(ENV_FILE);
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Category header
    if (trimmed.startsWith('# ====') && trimmed.endsWith('====')) {
      continue;
    }
    
    // Category name
    if (trimmed.startsWith('# ') && !trimmed.startsWith('# ====')) {
      const categoryName = trimmed.substring(2).trim();
      if (categoryName && !categoryName.includes('=') && categoryName.length < 50) {
        currentCategory = {
          name: categoryName,
          description: '',
          variables: []
        };
        categories.push(currentCategory);
      }
      continue;
    }
    
    // Variable
    if (!trimmed.startsWith('#') && trimmed.includes('=')) {
      const eqIndex = trimmed.indexOf('=');
      const key = trimmed.substring(0, eqIndex).trim();
      const defaultValue = trimmed.substring(eqIndex + 1).trim();
      
      if (currentCategory && key) {
        const variable: EnvVariable = {
          key,
          value: currentVars.get(key) || defaultValue,
          defaultValue,
          description: getVariableDescription(key),
          category: currentCategory.name,
          type: getVariableType(key),
          required: isRequired(key)
        };
        currentCategory.variables.push(variable);
      }
    }
    
    // Commented variable (optional)
    if (trimmed.startsWith('# ') && trimmed.includes('=')) {
      const varLine = trimmed.substring(2).trim();
      const eqIndex = varLine.indexOf('=');
      if (eqIndex > 0) {
        const key = varLine.substring(0, eqIndex).trim();
        const defaultValue = varLine.substring(eqIndex + 1).trim();
        
        if (currentCategory && key) {
          const variable: EnvVariable = {
            key,
            value: currentVars.get(key) || '',
            defaultValue,
            description: getVariableDescription(key),
            category: currentCategory.name,
            type: getVariableType(key),
            required: false
          };
          currentCategory.variables.push(variable);
        }
      }
    }
  }
  
  return categories;
}

function getVariableType(key: string): EnvVariable['type'] {
  const lower = key.toLowerCase();
  if (lower.includes('secret') || lower.includes('password') || lower.includes('api_key') || lower.includes('token')) {
    return 'secret';
  }
  if (lower.includes('url') || lower.includes('host') || lower.includes('broker')) {
    return 'url';
  }
  if (lower.includes('port') || lower.includes('max') || lower.includes('limit') || lower.includes('timeout')) {
    return 'number';
  }
  if (lower.includes('enabled') || lower.includes('insecure') || lower.includes('mode')) {
    return 'boolean';
  }
  return 'string';
}

function getVariableDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'LLM_PROVIDER': 'Default LLM provider (ollama, litellm, openrouter, windsurf)',
    'OLLAMA_URL': 'URL for local Ollama server',
    'OLLAMA_MODEL': 'Default Ollama model for code generation',
    'LITELLM_URL': 'LiteLLM proxy server URL',
    'LITELLM_API_KEY': 'API key for LiteLLM',
    'OPENROUTER_API_KEY': 'API key for OpenRouter (free tier available)',
    'OPENROUTER_MODEL': 'OpenRouter model ID',
    'WINDSURF_URL': 'Windsurf API endpoint',
    'WINDSURF_MODEL': 'Windsurf model (deepseek-v3, deepseek-r1, gpt-5.1-codex, swe-1.5)',
    'WINDSURF_API_KEY': 'Windsurf API key',
    'LLM_TEMPERATURE': 'Generation temperature (0.0-1.0)',
    'LLM_MAX_TOKENS': 'Maximum tokens per request',
    'LLM_TIMEOUT_MS': 'Request timeout in milliseconds',
    'PARALLEL_MAX_CONCURRENCY': 'Max parallel LLM requests',
    'PARALLEL_RATE_LIMIT_PER_PROVIDER': 'Requests per minute per provider',
    'PARALLEL_LOAD_BALANCE_STRATEGY': 'Load balancing strategy (round-robin, least-loaded, latency, random)'
  };
  return descriptions[key] || '';
}

function isRequired(key: string): boolean {
  const required = ['NODE_ENV', 'PORT', 'LLM_PROVIDER', 'OLLAMA_URL'];
  return required.includes(key);
}

function saveEnvFile(variables: Record<string, string>): void {
  const categories = parseEnvExample();
  const lines: string[] = [];
  
  lines.push('# ============================================================================');
  lines.push('# Reclapp - Environment Configuration');
  lines.push('# Generated by ENV Configurator');
  lines.push(`# Last updated: ${new Date().toISOString()}`);
  lines.push('# ============================================================================');
  lines.push('');
  
  for (const category of categories) {
    lines.push('# ============================================================================');
    lines.push(`# ${category.name}`);
    lines.push('# ============================================================================');
    
    for (const variable of category.variables) {
      const value = variables[variable.key];
      if (value !== undefined && value !== '') {
        lines.push(`${variable.key}=${value}`);
      } else if (variable.defaultValue) {
        lines.push(`# ${variable.key}=${variable.defaultValue}`);
      }
    }
    
    lines.push('');
  }
  
  fs.writeFileSync(ENV_FILE, lines.join('\n'), 'utf-8');
}

// ============================================================================
// HTML TEMPLATE
// ============================================================================

function generateHTML(categories: EnvCategory[]): string {
  const categorySections = categories.map(cat => {
    const variables = cat.variables.map(v => {
      const inputType = v.type === 'secret' ? 'password' : 
                       v.type === 'number' ? 'number' : 
                       v.type === 'boolean' ? 'checkbox' : 'text';
      
      const checked = v.type === 'boolean' && (v.value === 'true' || v.value === '1') ? 'checked' : '';
      const required = v.required ? 'required' : '';
      const placeholder = v.defaultValue || v.description;
      
      return `
        <div class="variable">
          <label for="${v.key}">
            <span class="key">${v.key}</span>
            ${v.required ? '<span class="required">*</span>' : ''}
            ${v.type === 'secret' ? '<span class="secret">🔒</span>' : ''}
          </label>
          ${v.description ? `<p class="description">${v.description}</p>` : ''}
          ${v.type === 'boolean' 
            ? `<input type="checkbox" id="${v.key}" name="${v.key}" value="true" ${checked}>`
            : `<input type="${inputType}" id="${v.key}" name="${v.key}" value="${escapeHtml(v.value)}" placeholder="${escapeHtml(placeholder)}" ${required}>`
          }
          ${v.defaultValue ? `<span class="default">Default: ${escapeHtml(v.defaultValue)}</span>` : ''}
        </div>
      `;
    }).join('');
    
    return `
      <section class="category" id="cat-${cat.name.replace(/[^a-zA-Z0-9]/g, '-')}">
        <h2>${cat.name}</h2>
        ${variables}
      </section>
    `;
  }).join('');
  
  const navItems = categories.map(cat => 
    `<a href="#cat-${cat.name.replace(/[^a-zA-Z0-9]/g, '-')}">${cat.name}</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reclapp ENV Configurator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0d1117; color: #c9d1d9; line-height: 1.6;
    }
    .container { display: flex; min-height: 100vh; }
    
    nav { 
      width: 250px; background: #161b22; padding: 20px;
      position: fixed; height: 100vh; overflow-y: auto;
      border-right: 1px solid #30363d;
    }
    nav h1 { font-size: 1.2em; color: #58a6ff; margin-bottom: 20px; }
    nav a { 
      display: block; padding: 8px 12px; color: #8b949e; 
      text-decoration: none; border-radius: 6px; margin: 2px 0;
      font-size: 0.9em;
    }
    nav a:hover { background: #21262d; color: #c9d1d9; }
    
    main { margin-left: 250px; padding: 40px; flex: 1; max-width: 900px; }
    
    .header { margin-bottom: 30px; }
    .header h1 { color: #58a6ff; margin-bottom: 10px; }
    .header p { color: #8b949e; }
    
    .category { 
      background: #161b22; border-radius: 12px; padding: 24px;
      margin-bottom: 24px; border: 1px solid #30363d;
    }
    .category h2 { 
      color: #58a6ff; font-size: 1.1em; margin-bottom: 20px;
      padding-bottom: 10px; border-bottom: 1px solid #30363d;
    }
    
    .variable { margin-bottom: 20px; }
    .variable label { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .variable .key { font-family: monospace; color: #7ee787; font-weight: 600; }
    .variable .required { color: #f85149; }
    .variable .secret { font-size: 0.8em; }
    .variable .description { color: #8b949e; font-size: 0.85em; margin-bottom: 8px; }
    .variable .default { color: #6e7681; font-size: 0.8em; margin-left: 10px; }
    
    input[type="text"], input[type="password"], input[type="number"], input[type="url"] {
      width: 100%; padding: 10px 14px; background: #0d1117;
      border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9;
      font-family: monospace; font-size: 0.9em;
    }
    input:focus { outline: none; border-color: #58a6ff; }
    input::placeholder { color: #484f58; }
    
    input[type="checkbox"] {
      width: 20px; height: 20px; accent-color: #58a6ff;
    }
    
    .actions {
      position: fixed; bottom: 0; left: 250px; right: 0;
      background: #161b22; padding: 20px 40px;
      border-top: 1px solid #30363d; display: flex; gap: 15px;
    }
    button {
      padding: 12px 24px; border-radius: 6px; font-weight: 600;
      cursor: pointer; border: none; font-size: 0.95em;
    }
    button.primary { background: #238636; color: white; }
    button.primary:hover { background: #2ea043; }
    button.secondary { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; }
    button.secondary:hover { background: #30363d; }
    
    .status { margin-left: auto; display: flex; align-items: center; gap: 10px; color: #8b949e; }
    .status.success { color: #3fb950; }
    .status.error { color: #f85149; }
    
    .llm-test { margin-top: 20px; padding: 15px; background: #21262d; border-radius: 6px; }
    .llm-test h3 { color: #58a6ff; margin-bottom: 10px; font-size: 0.95em; }
    .llm-status { display: flex; gap: 10px; flex-wrap: wrap; }
    .provider-status { 
      padding: 6px 12px; border-radius: 4px; font-size: 0.85em;
      background: #0d1117; border: 1px solid #30363d;
    }
    .provider-status.available { border-color: #3fb950; color: #3fb950; }
    .provider-status.unavailable { border-color: #f85149; color: #f85149; }
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <h1>🔧 ENV Config</h1>
      ${navItems}
      <hr style="margin: 20px 0; border-color: #30363d;">
      <a href="#" onclick="testLLM()">🧪 Test LLM</a>
      <a href="#" onclick="resetToDefaults()">↩️ Reset Defaults</a>
    </nav>
    
    <main>
      <div class="header">
        <h1>Reclapp Environment Configurator</h1>
        <p>Configure environment variables for your Reclapp installation.</p>
      </div>
      
      <form id="envForm" method="POST" action="/save">
        ${categorySections}
        
        <div class="llm-test" id="llmTest">
          <h3>LLM Provider Status</h3>
          <p style="color: #8b949e; font-size: 0.85em; margin-bottom: 10px;">Click "Test LLM" to check provider availability.</p>
          <div class="llm-status" id="llmStatus"></div>
        </div>
      </form>
      
      <div style="height: 100px;"></div>
    </main>
    
    <div class="actions">
      <button type="submit" form="envForm" class="primary">💾 Save Configuration</button>
      <button type="button" class="secondary" onclick="testLLM()">🧪 Test LLM Providers</button>
      <div class="status" id="saveStatus"></div>
    </div>
  </div>
  
  <script>
    document.getElementById('envForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      
      // Handle unchecked checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (!cb.checked) data[cb.name] = '';
      });
      
      const status = document.getElementById('saveStatus');
      status.textContent = 'Saving...';
      status.className = 'status';
      
      try {
        const response = await fetch('/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          status.textContent = '✅ Saved successfully!';
          status.className = 'status success';
        } else {
          throw new Error('Save failed');
        }
      } catch (error) {
        status.textContent = '❌ Save failed';
        status.className = 'status error';
      }
      
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
    
    async function testLLM() {
      const statusDiv = document.getElementById('llmStatus');
      statusDiv.innerHTML = '<span style="color: #8b949e;">Testing...</span>';
      
      try {
        const response = await fetch('/test-llm');
        const data = await response.json();
        
        statusDiv.innerHTML = data.providers.map(p => 
          \`<span class="provider-status \${p.available ? 'available' : 'unavailable'}">
            \${p.available ? '✅' : '❌'} \${p.provider}\${p.latencyMs ? \` (\${p.latencyMs}ms)\` : ''}
          </span>\`
        ).join('');
      } catch (error) {
        statusDiv.innerHTML = '<span style="color: #f85149;">Test failed</span>';
      }
    }
    
    function resetToDefaults() {
      if (confirm('Reset all values to defaults?')) {
        document.querySelectorAll('input').forEach(input => {
          const defaultSpan = input.parentElement.querySelector('.default');
          if (defaultSpan) {
            const defaultValue = defaultSpan.textContent.replace('Default: ', '');
            if (input.type === 'checkbox') {
              input.checked = defaultValue === 'true' || defaultValue === '1';
            } else {
              input.value = defaultValue;
            }
          }
        });
      }
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

// ============================================================================
// ROUTES
// ============================================================================

app.get('/', (req, res) => {
  const categories = parseEnvExample();
  res.send(generateHTML(categories));
});

app.post('/save', (req, res) => {
  try {
    saveEnvFile(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get('/test-llm', async (req, res) => {
  try {
    const { createLLMManagerFromEnv } = require('../../src/core/contract-ai/llm');
    const manager = createLLMManagerFromEnv();
    const statuses = await manager.checkAvailability();
    res.json({ providers: statuses });
  } catch (error) {
    res.json({ providers: [], error: String(error) });
  }
});

app.get('/api/env', (req, res) => {
  const categories = parseEnvExample();
  res.json(categories);
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🔧 Reclapp ENV Configurator                       ║
╠════════════════════════════════════════════════════════════╣
║  Web Interface: http://localhost:${PORT}                      ║
║  ENV File:      ${ENV_FILE}
╚════════════════════════════════════════════════════════════╝
  `);
});

export { parseEnvExample, saveEnvFile };
