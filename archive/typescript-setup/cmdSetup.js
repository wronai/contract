/**
 * ARCHIVED: TypeScript Setup Command
 * 
 * This is the original TypeScript implementation of the setup command.
 * It has been replaced by the Python/Pydantic version in tools/reclapp-setup/setup.py
 * 
 * Archived on: 2026-01-02
 * Reason: Python version is 60% less code, 5x faster startup, better validation
 * 
 * Original location: bin/reclapp cmdSetup function
 */

async function cmdSetup(args, options) {
  const contractAI = require('../src/core/contract-ai');
  const { CLIRunner } = contractAI;
  const { DependencyChecker } = require('../src/core/contract-ai/setup/dependency-checker');
  const readline = require('readline');

  let outputDir = '.';
  let install = false;
  let dryRun = false;
  let interactive = !args.includes('--yes') && !args.includes('-y');
  let skipOptional = args.includes('--skip-optional');

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      outputDir = args[i + 1]; i++;
    } else if (args[i] === '--install' || args[i] === '-i') {
      install = true;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
      install = true;
    }
  }

  // Helper: ask user yes/no
  async function askUser(question) {
    if (dryRun) return true;
    if (!interactive) return true;
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
      rl.question(`${question} [Y/n] `, answer => {
        rl.close();
        const a = answer.trim().toLowerCase();
        resolve(a === '' || a === 'y' || a === 'yes');
      });
    });
  }

  // Create CLI runner with TaskQueue
  const runner = new CLIRunner({
    name: 'Reclapp Environment Setup',
    version: '1.0',
    verbose: true,
    showProgress: true,
    continueOnError: true
  });

  const checker = new DependencyChecker();
  let llmProviders = [];
  let report = null;
  let allTasks = [];

  // TASK 1: Check LLM Providers
  runner.addTask({
    id: 'check-llm',
    name: 'Check LLM providers',
    description: 'Testing connectivity to Ollama, Windsurf, OpenRouter',
    category: 'llm',
    run: async () => {
      llmProviders = [];
      // Check Ollama
      try {
        const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';
        const ollamaRes = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          const models = data.models || [];
          const codeModels = models.filter(m => 
            m.name.includes('codellama') || m.name.includes('deepseek') || m.name.includes('qwen') || m.name.includes('coder')
          );
          llmProviders.push({ name: 'ollama', status: 'available', models: models.length, codeModels: codeModels.length, url: ollamaUrl });
        } else {
          llmProviders.push({ name: 'ollama', status: 'error', error: 'API error' });
        }
      } catch (e) {
        llmProviders.push({ name: 'ollama', status: 'unavailable', error: 'Connection failed' });
      }

      // Check Windsurf
      const windsurfKey = process.env.WINDSURF_API_KEY;
      if (windsurfKey) {
        try {
          const res = await fetch(`${process.env.WINDSURF_URL || 'https://api.windsurf.ai/v1'}/models`, {
            headers: { 'Authorization': `Bearer ${windsurfKey}` },
            signal: AbortSignal.timeout(5000)
          });
          llmProviders.push({ name: 'windsurf', status: res.ok ? 'available' : 'error' });
        } catch (e) {
          llmProviders.push({ name: 'windsurf', status: 'unavailable' });
        }
      } else {
        llmProviders.push({ name: 'windsurf', status: 'not_configured', fix: 'Set WINDSURF_API_KEY' });
      }

      // Check OpenRouter
      const openrouterKey = process.env.OPENROUTER_API_KEY;
      if (openrouterKey) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${openrouterKey}` },
            signal: AbortSignal.timeout(5000)
          });
          llmProviders.push({ name: 'openrouter', status: res.ok ? 'available' : 'error' });
        } catch (e) {
          llmProviders.push({ name: 'openrouter', status: 'unavailable' });
        }
      } else {
        llmProviders.push({ name: 'openrouter', status: 'not_configured', fix: 'Set OPENROUTER_API_KEY' });
      }

      const available = llmProviders.filter(p => p.status === 'available');
      return {
        success: true,
        message: 'LLM provider check complete',
        data: { llm_providers: llmProviders, available: available.length, total: llmProviders.length }
      };
    }
  });

  // ... rest of tasks omitted for brevity
  // See full implementation in git history or tools/reclapp-setup/setup.py (Python port)

  // Run all tasks
  const result = await runner.run();

  if (!result.success) {
    process.exit(1);
  }
}

module.exports = { cmdSetup };
