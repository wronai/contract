/**
 * Reclapp Studio E2E Tests
 * 
 * Tests for:
 * - Web UI API endpoints
 * - Chat functionality
 * - Contract generation and validation
 * - Project management
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { execSync, spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as path from 'path';

const STUDIO_PORT = process.env.STUDIO_PORT || '7861';
const STUDIO_URL = `http://localhost:${STUDIO_PORT}`;
const TIMEOUT = 30000;

// Helper to make HTTP requests
async function request(
  method: string,
  path: string,
  body?: object
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, STUDIO_URL);
    const options: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TIMEOUT, () => reject(new Error('Request timeout')));
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Check if studio is running
async function isStudioRunning(): Promise<boolean> {
  try {
    const { status } = await request('GET', '/api/health');
    return status === 200;
  } catch {
    return false;
  }
}

describe('Reclapp Studio E2E Tests', () => {
  let studioProcess: ChildProcess | null = null;
  let wasAlreadyRunning = false;

  beforeAll(async () => {
    // Check if studio is already running
    wasAlreadyRunning = await isStudioRunning();
    
    if (!wasAlreadyRunning) {
      console.log('Starting Reclapp Studio for tests...');
      const studioDir = path.join(__dirname, '../../studio');
      studioProcess = spawn('node', ['server.js'], {
        cwd: studioDir,
        stdio: 'pipe',
        detached: true,
      });
      
      // Wait for studio to start
      let attempts = 0;
      while (attempts < 15) {
        await new Promise((r) => setTimeout(r, 1000));
        if (await isStudioRunning()) break;
        attempts++;
      }
      
      if (!(await isStudioRunning())) {
        throw new Error('Failed to start Reclapp Studio');
      }
    }
  }, 60000);

  afterAll(async () => {
    if (studioProcess && !wasAlreadyRunning) {
      console.log('Stopping Reclapp Studio...');
      process.kill(-studioProcess.pid!, 'SIGTERM');
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const { status, data } = await request('GET', '/api/health');
      
      expect(status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.model).toBeDefined();
      expect(data.ollama).toBeDefined();
    });
  });

  describe('Projects API', () => {
    it('should list projects', async () => {
      const { status, data } = await request('GET', '/api/projects');
      
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.projects)).toBe(true);
    });

    it('should have apps and examples sources', async () => {
      const { data } = await request('GET', '/api/projects');
      
      const sources = new Set(data.projects.map((p: any) => p.source));
      // At least one source should exist
      expect(sources.size).toBeGreaterThan(0);
    });
  });

  describe('Contract Validation', () => {
    it('should validate a correct contract', async () => {
      const validContract = `app "Test" {
  version: "1.0.0"
}

entity User {
  id uuid @unique @generated
  name text @required
}`;

      const { status, data } = await request('POST', '/api/validate', {
        contract: validContract,
      });

      expect(status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.stats.entities).toBe(1);
    });

    it('should detect invalid contract - missing app', async () => {
      const invalidContract = `entity User {
  id uuid
}`;

      const { status, data } = await request('POST', '/api/validate', {
        contract: invalidContract,
      });

      expect(status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.errors).toContain('Missing app declaration');
    });

    it('should detect unbalanced braces', async () => {
      const invalidContract = `app "Test" {
  version: "1.0.0"

entity User {
  id uuid
}`;

      const { status, data } = await request('POST', '/api/validate', {
        contract: invalidContract,
      });

      expect(status).toBe(200);
      expect(data.valid).toBe(false);
      expect(data.errors.some((e: string) => e.includes('braces'))).toBe(true);
    });
  });

  describe('Contract Save', () => {
    it('should save contract in RCL format', async () => {
      const contract = `app "SaveTest" {
  version: "1.0.0"
}

entity Item {
  id uuid @unique @generated
  name text @required
}`;

      const { status, data } = await request('POST', '/api/save', {
        name: 'test-save',
        contract,
        format: 'rcl',
      });

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.path).toContain('test-save');
    });

    it('should save contract with conversation in MD format', async () => {
      const contract = `app "MdTest" {
  version: "1.0.0"
}`;
      const history = [
        { role: 'user', content: 'Create a test app' },
        { role: 'assistant', content: 'Here is your app...' },
      ];

      const { status, data } = await request('POST', '/api/save', {
        name: 'test-md',
        contract,
        format: 'md',
        history,
      });

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.files.some((f: any) => f.ext === 'md')).toBe(true);
    });
  });

  describe('Auto-Generate Formats', () => {
    it('should auto-generate missing formats', async () => {
      // First save a contract
      const contract = `app "AutoGen" {
  version: "1.0.0"
}

entity Product {
  id uuid @unique
  name text @required
}`;

      await request('POST', '/api/save', {
        name: 'test-autogen',
        contract,
        format: 'rcl',
      });

      // Then auto-generate
      const { status, data } = await request('POST', '/api/auto-generate', {
        source: 'projects',
        name: 'test-autogen',
      });

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Web UI Static Files', () => {
    it('should serve index.html', async () => {
      const { status } = await request('GET', '/');
      expect(status).toBe(200);
    });
  });
});

describe('Chat Core Module', () => {
  // Import the chat core module for direct testing
  const chatCorePath = path.join(__dirname, '../../lib/chat-core.js');
  let ReclappChat: any;

  beforeAll(() => {
    ReclappChat = require(chatCorePath).ReclappChat;
  });

  it('should create chat instance', () => {
    const chat = new ReclappChat();
    expect(chat).toBeDefined();
    expect(chat.model).toBeDefined();
    expect(chat.history).toEqual([]);
  });

  it('should format contract', () => {
    const chat = new ReclappChat();
    const input = `app "Test" { version: "1.0.0" } entity User { id uuid name text }`;
    const formatted = chat.formatContract(input);
    
    expect(formatted).toContain('app "Test"');
    expect(formatted.split('\n').length).toBeGreaterThan(1);
  });

  it('should validate contract', () => {
    const chat = new ReclappChat();
    chat.currentContract = `app "Test" { version: "1.0.0" } entity User { id uuid }`;
    
    const result = chat.validateContract();
    expect(result.valid).toBe(true);
    expect(result.stats.entities).toBe(1);
  });

  it('should detect invalid contract', () => {
    const chat = new ReclappChat();
    chat.currentContract = `entity User { id uuid }`;
    
    const result = chat.validateContract();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing app declaration');
  });

  it('should generate TypeScript', () => {
    const chat = new ReclappChat();
    chat.currentContract = `app "Test" { version: "1.0.0" }
entity User {
  id uuid @unique
  name text @required
}`;
    
    const ts = chat.toTypeScript();
    expect(ts).toContain('export interface User');
    expect(ts).toContain('ReclappContract');
  });

  it('should generate Markdown with conversation', () => {
    const chat = new ReclappChat();
    chat.currentContract = `app "Test" { version: "1.0.0" }`;
    chat.history = [
      { role: 'user', content: 'Create app' },
      { role: 'assistant', content: 'Done!' },
    ];
    
    const md = chat.toMarkdown();
    expect(md).toContain('# Test');
    expect(md).toContain('## 💬 Conversation');
    expect(md).toContain('🧑 User');
    expect(md).toContain('🤖 Assistant');
  });

  it('should extract contract from JSON response', () => {
    const chat = new ReclappChat();
    const response = `Here's your contract:
\`\`\`json
{
  "thinking": "Creating a simple app",
  "contract": "app \\"Simple\\" { version: \\"1.0.0\\" }",
  "summary": {"entities": []}
}
\`\`\``;
    
    const contract = chat.extractContract(response);
    expect(contract).toContain('app "Simple"');
  });

  it('should extract contract from RCL code block', () => {
    const chat = new ReclappChat();
    const response = `Here's your contract:
\`\`\`rcl
app "Simple" { version: "1.0.0" }
entity User { id uuid }
\`\`\``;
    
    const contract = chat.extractContract(response);
    expect(contract).toContain('app "Simple"');
    expect(contract).toContain('entity User');
  });

  it('should set project name', () => {
    const chat = new ReclappChat();
    chat.setProjectName('my-project');
    expect(chat.projectName).toBe('my-project');
  });

  it('should clear history', () => {
    const chat = new ReclappChat();
    chat.history = [{ role: 'user', content: 'test' }];
    chat.currentContract = 'test';
    
    chat.clear();
    expect(chat.history).toEqual([]);
    expect(chat.currentContract).toBe('');
  });
});
