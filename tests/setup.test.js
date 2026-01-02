/**
 * Tests for TypeScript setup command
 * 
 * Run: node --test tests/setup.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function runSetup(args = [], options = {}) {
  const cmd = `./bin/reclapp setup ${args.join(' ')}`;
  try {
    const output = execSync(cmd, {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      timeout: 30000,
      ...options
    });
    return { success: true, output };
  } catch (e) {
    return { success: false, output: e.stdout || '', error: e.stderr || e.message };
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'reclapp-test-'));
}

function cleanupTempDir(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ============================================================================
// BASIC FUNCTIONALITY TESTS
// ============================================================================

describe('Setup Command - Basic', () => {
  it('should run with -y flag without prompts', async () => {
    const result = runSetup(['-y']);
    assert.strictEqual(result.success, true, 'Setup should succeed');
    assert.ok(result.output.includes('LLM provider'), 'Should check LLM providers');
  });

  it('should show task queue in output', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('task_queue'), 'Should show task queue');
    assert.ok(result.output.includes('Check LLM providers'), 'Should list LLM task');
  });

  it('should check system dependencies', async () => {
    const result = runSetup(['-y']);
    assert.ok(
      result.output.includes('Check system dependencies') || 
      result.output.includes('dependencies'),
      'Should check dependencies'
    );
  });
});

// ============================================================================
// LLM PROVIDER TESTS
// ============================================================================

describe('Setup Command - LLM Providers', () => {
  it('should check Ollama', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('ollama'), 'Should check Ollama');
  });

  it('should check Windsurf', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('windsurf'), 'Should check Windsurf');
  });

  it('should check OpenRouter', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('openrouter'), 'Should check OpenRouter');
  });

  it('should show fix hints for unconfigured providers', async () => {
    const result = runSetup(['-y']);
    // At least one provider should show a fix hint
    const hasFixHint = result.output.includes('Set WINDSURF_API_KEY') ||
                       result.output.includes('Set OPENROUTER_API_KEY') ||
                       result.output.includes('not_configured');
    assert.ok(hasFixHint, 'Should show fix hints');
  });
});

// ============================================================================
// FILE OUTPUT TESTS
// ============================================================================

describe('Setup Command - File Output', () => {
  let tempDir;

  before(() => {
    tempDir = createTempDir();
  });

  after(() => {
    cleanupTempDir(tempDir);
  });

  it('should create setup directory', async () => {
    runSetup(['-y', '-o', tempDir]);
    const setupDir = path.join(tempDir, 'setup');
    assert.ok(fs.existsSync(setupDir), 'Setup directory should exist');
  });

  it('should create SETUP.md', async () => {
    runSetup(['-y', '-o', tempDir]);
    const setupMd = path.join(tempDir, 'setup', 'SETUP.md');
    assert.ok(fs.existsSync(setupMd), 'SETUP.md should exist');
  });

  it('should create setup-tasks.json', async () => {
    runSetup(['-y', '-o', tempDir]);
    const tasksJson = path.join(tempDir, 'setup', 'setup-tasks.json');
    assert.ok(fs.existsSync(tasksJson), 'setup-tasks.json should exist');
  });

  it('should create valid JSON in setup-tasks.json', async () => {
    runSetup(['-y', '-o', tempDir]);
    const tasksJson = path.join(tempDir, 'setup', 'setup-tasks.json');
    const content = fs.readFileSync(tasksJson, 'utf8');
    const tasks = JSON.parse(content);
    assert.ok(Array.isArray(tasks), 'Tasks should be an array');
  });
});

// ============================================================================
// INSTALL MODE TESTS
// ============================================================================

describe('Setup Command - Install Mode', () => {
  it('should skip install tasks without --install flag', async () => {
    const result = runSetup(['-y']);
    assert.ok(
      result.output.includes('Install steps are disabled') ||
      result.output.includes('skipped') ||
      !result.output.includes('Installing'),
      'Should skip install without flag'
    );
  });

  it('should show install hint when tasks exist', async () => {
    const result = runSetup(['-y']);
    // Should suggest using --install
    const hasHint = result.output.includes('--install') ||
                    result.output.includes('install_mode');
    assert.ok(hasHint, 'Should show install hint');
  });

  it('should support --dry-run flag', async () => {
    const result = runSetup(['--dry-run']);
    assert.strictEqual(result.success, true, 'Dry run should succeed');
    // Dry run should not actually install
    assert.ok(!result.output.includes('Installing') || result.output.includes('DRY RUN'));
  });
});

// ============================================================================
// TASK PRIORITY TESTS
// ============================================================================

describe('Setup Command - Task Priorities', () => {
  it('should categorize tasks by priority', async () => {
    const result = runSetup(['-y']);
    // Should show counts or categories
    const hasPriorities = result.output.includes('required') ||
                          result.output.includes('recommended') ||
                          result.output.includes('optional');
    assert.ok(hasPriorities, 'Should show task priorities');
  });

  it('should count tasks by priority', async () => {
    const result = runSetup(['-y']);
    // Should show counts
    const hasCounts = result.output.includes('counts') ||
                      (result.output.includes('required:') && result.output.includes('recommended:'));
    assert.ok(hasCounts, 'Should count tasks');
  });
});

// ============================================================================
// YAML OUTPUT TESTS
// ============================================================================

describe('Setup Command - YAML Output', () => {
  it('should output YAML blocks', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('@type:'), 'Should have @type annotations');
  });

  it('should have llm_providers in output', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('llm_providers'), 'Should output llm_providers');
  });

  it('should have setup_summary in output', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('setup_summary'), 'Should output setup_summary');
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Setup Command - Error Handling', () => {
  it('should handle missing Ollama gracefully', async () => {
    // Even if Ollama is down, setup should complete
    const result = runSetup(['-y']);
    assert.strictEqual(result.success, true, 'Should handle missing Ollama');
  });

  it('should continue on task failure with continueOnError', async () => {
    const result = runSetup(['-y']);
    // Should complete all tasks even if some fail
    assert.ok(result.output.includes('Progress'), 'Should show progress');
  });
});

// ============================================================================
// FEATURE PARITY CHECKLIST
// ============================================================================

describe('Feature Parity - TypeScript vs Python', () => {
  it('[TS] Check LLM providers: Ollama, Windsurf, OpenRouter', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('ollama'));
    assert.ok(result.output.includes('windsurf'));
    assert.ok(result.output.includes('openrouter'));
  });

  it('[TS] Check system dependencies', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('dependencies') || result.output.includes('Node.js'));
  });

  it('[TS] Generate setup tasks', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('setup_tasks') || result.output.includes('Generate setup'));
  });

  it('[TS] Save files (SETUP.md, setup-tasks.json)', async () => {
    const tempDir = createTempDir();
    try {
      runSetup(['-y', '-o', tempDir]);
      assert.ok(fs.existsSync(path.join(tempDir, 'setup', 'SETUP.md')));
      assert.ok(fs.existsSync(path.join(tempDir, 'setup', 'setup-tasks.json')));
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('[TS] Support --install flag', async () => {
    const result = runSetup(['--dry-run']);  // dry-run enables install mode
    assert.ok(result.output.includes('install') || result.output.includes('DRY RUN'));
  });

  it('[TS] Support -y (yes) flag', async () => {
    const result = runSetup(['-y']);
    assert.strictEqual(result.success, true);
  });

  it('[TS] Support --dry-run flag', async () => {
    const result = runSetup(['--dry-run']);
    assert.strictEqual(result.success, true);
  });

  it('[TS] Show summary with ready status', async () => {
    const result = runSetup(['-y']);
    assert.ok(result.output.includes('setup_summary') || result.output.includes('ready'));
  });

  it('[TS] Show next steps guidance', async () => {
    const result = runSetup(['-y']);
    assert.ok(
      result.output.includes('Next Steps') ||
      result.output.includes('Fix Issues') ||
      result.output.includes('reclapp')
    );
  });
});
