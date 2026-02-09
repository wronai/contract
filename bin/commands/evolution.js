/**
 * Evolution Command - Extracted from bin/reclapp (R02)
 * @version 2.4.1
 */

const path = require('path');
const fs = require('fs');

async function cmdEvolution(args, options) {
  const readline = require('readline');

  const maxBackticks = (s) => {
    let max = 0;
    let cur = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '`') {
        cur++;
        if (cur > max) max = cur;
      } else {
        cur = 0;
      }
    }
    return max;
  };

  const getFence = (content) => '`'.repeat(Math.max(3, maxBackticks(content) + 1));

  const printFencedBlock = (content, lang) => {
    const safe = (content ?? '').toString().replace(/\s+$/, '');
    const fence = getFence(safe);
    console.log(`${fence}${lang ? lang : ''}`);
    console.log(safe);
    console.log(fence);
  };

  const fencedBlockString = (content, lang) => {
    const safe = (content ?? '').toString().replace(/\s+$/, '');
    const fence = getFence(safe);
    return `${fence}${lang ? lang : ''}\n${safe}\n${fence}\n`;
  };

  const renderMarkdownWithFences = (renderer, markdownText) => {
    const lines = (markdownText ?? '').toString().split('\n');
    let inFence = false;
    let fence = '```';
    let lang = 'text';
    let buf = [];

    const flush = () => {
      if (!inFence) return;
      const langNormalized = (lang || 'text').split(':')[0].trim() || 'text';
      renderer.codeblock(langNormalized, buf.join('\n'));
      inFence = false;
      fence = '```';
      lang = 'text';
      buf = [];
    };

    for (const line of lines) {
      const trimmed = line.trimEnd();
      const m = trimmed.match(/^(`{3,})(.*)$/);
      if (!inFence) {
        if (m) {
          inFence = true;
          fence = m[1];
          lang = (m[2] || '').trim();
          buf = [];
        } else {
          console.log(line);
        }
      } else {
        if (trimmed.trim() === fence) {
          flush();
        } else {
          buf.push(line);
        }
      }
    }

    flush();
  };

  // Parse evolution-specific options
  let prompt = null;
  let contractPath = null;
  let outputDir = options.output || './generated';
  let port = 3000;
  let keepRunning = false;
  let noMenu = false;
  let logFile = null;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--prompt' || args[i] === '-p') && args[i + 1]) {
      prompt = args[i + 1]; i++;
    } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      outputDir = args[i + 1]; i++;
    } else if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1]); i++;
    } else if (args[i] === '--keep-running' || args[i] === '-k') {
      keepRunning = true;
    } else if (args[i] === '--no-menu') {
      noMenu = true;
    } else if (args[i] === '--log-file' && args[i + 1]) {
      logFile = args[i + 1]; i++;
    } else if (!args[i].startsWith('-')) {
      contractPath = args[i];
    }
  }

  if (!prompt && !contractPath) {
    console.error('❌ Usage: reclapp evolve --prompt "..." [-o <dir>] [--no-menu] [--log-file <path>]');
    console.error('           reclapp evolve <contract.ts> [-o <dir>] [--no-menu] [--log-file <path>]');
    process.exit(1);
  }

  console.log('\n## Reclapp Evolution v2.4.1\n');

  try {
    const contractAI = require('../src/core/contract-ai');
    const verbose = true;
    const extraVerbose = !!(options && options.verbose === true);
    const startupTimeoutMs = parseInt(process.env.RECLAPP_EVOLVE_STARTUP_TIMEOUT_MS || '2000', 10);
    const llmTimeoutMs = parseInt(process.env.RECLAPP_LLM_TIMEOUT_MS || '60000', 10);
    const llmHeartbeatMs = parseInt(process.env.RECLAPP_LLM_HEARTBEAT_MS || '2000', 10);

    let logStream = null;
    let restoreStdout = null;
    let restoreStderr = null;
    const cleanupLogging = () => {
      if (restoreStdout) {
        try { restoreStdout(); } catch (e) {}
        restoreStdout = null;
      }
      if (restoreStderr) {
        try { restoreStderr(); } catch (e) {}
        restoreStderr = null;
      }
      if (logStream) {
        try { logStream.end(); } catch (e) {}
        logStream = null;
      }
    };

    process.on('exit', cleanupLogging);

    if (logFile) {
      try {
        const logPath = path.resolve(logFile);
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        logStream = fs.createWriteStream(logPath, { flags: 'a' });

        const stripAnsi = (s) => (s || '').replace(/\x1b\[[0-9;]*m/g, '');

        const origStdoutWrite = process.stdout.write.bind(process.stdout);
        const origStderrWrite = process.stderr.write.bind(process.stderr);

        process.stdout.write = (chunk, encoding, cb) => {
          try {
            const text = Buffer.isBuffer(chunk) ? chunk.toString(typeof encoding === 'string' ? encoding : 'utf8') : String(chunk);
            logStream.write(stripAnsi(text));
          } catch (e) {}
          return origStdoutWrite(chunk, encoding, cb);
        };

        process.stderr.write = (chunk, encoding, cb) => {
          try {
            const text = Buffer.isBuffer(chunk) ? chunk.toString(typeof encoding === 'string' ? encoding : 'utf8') : String(chunk);
            logStream.write(stripAnsi(text));
          } catch (e) {}
          return origStderrWrite(chunk, encoding, cb);
        };

        restoreStdout = () => { process.stdout.write = origStdoutWrite; };
        restoreStderr = () => { process.stderr.write = origStderrWrite; };
      } catch (e) {
        logFile = null;
        cleanupLogging();
      }
    }

    const { ShellRenderer } = contractAI;
    const cliRenderer = new ShellRenderer(true);
    
    // Create evolution manager
    const evolutionManager = contractAI.createEvolutionManager({
      outputDir,
      port,
      verbose,
      maxEvolutionCycles: 10,
      autoRestart: true
    });

    // Setup LLM routing for evolution (multi-provider)
    let llmStatus = { available: false, provider: null, model: null };
    let llmDebugLines = [];
    try {
      const { createLLMManagerFromEnv } = contractAI;
      const llmManager = createLLMManagerFromEnv();
      const statuses = await llmManager.checkAvailability();
      if (Array.isArray(statuses)) {
        llmDebugLines = statuses.map(s => `- ${s.provider}: available=${s.available} model=${s.model || 'n/a'} latencyMs=${s.latencyMs || 'n/a'}`);
      }
      const best = llmManager.getBestProvider({ type: 'code', complexity: 'high', tokensRequired: 12000 });

      if (best) {
        // Adapter from multi-provider API (ILLMProvider/LLMManager) to legacy LLMClient interface
        const llmClient = {
          generate: async ({ system, user, temperature, maxTokens }) => {
            const callId = `llm_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
            const startedAt = Date.now();
            let heartbeatTimer = null;
            let timeoutTimer = null;

            try {
              cliRenderer.codeblock('log', `→ LLM call started (${callId}) provider=${llmStatus.provider || 'auto'} model=${llmStatus.model || 'default'} timeoutMs=${llmTimeoutMs}`);

              if (extraVerbose) {
                cliRenderer.codeblock('yaml', [
                  '# @type: llm_call_start',
                  '# @description: LLM call started',
                  'llm_call:',
                  `  id: "${callId}"`,
                  `  provider_env: "${process.env.LLM_PROVIDER || 'auto'}"`,
                  `  resolved_provider: "${llmStatus.provider || 'unknown'}"`,
                  `  resolved_model: "${llmStatus.model || 'unknown'}"`,
                  `  timeout_ms: ${llmTimeoutMs}`,
                  `  heartbeat_ms: ${llmHeartbeatMs}`
                ].join('\n'));

                heartbeatTimer = setInterval(() => {
                  const elapsedMs = Date.now() - startedAt;
                  cliRenderer.codeblock('log', `… waiting for LLM (${callId}) elapsed=${Math.round(elapsedMs / 1000)}s`);
                }, llmHeartbeatMs);
              }

              const timeoutPromise = new Promise((_, reject) => {
                timeoutTimer = setTimeout(() => {
                  reject(new Error(`LLM request timeout after ${llmTimeoutMs}ms (${callId})`));
                }, llmTimeoutMs);
              });

              const chatPromise = llmManager.chat(
                [
                  { role: 'system', content: system },
                  { role: 'user', content: user }
                ],
                { type: 'code', complexity: 'high', tokensRequired: 12000 },
                {
                  temperature,
                  maxTokens,
                  timeout: llmTimeoutMs
                }
              );

              const response = await Promise.race([chatPromise, timeoutPromise]);

              if (extraVerbose) {
                const elapsedMs = Date.now() - startedAt;
                cliRenderer.codeblock('yaml', [
                  '# @type: llm_call_done',
                  '# @description: LLM call finished',
                  'llm_call:',
                  `  id: "${callId}"`,
                  `  status: "ok"`,
                  `  provider: "${response.provider}"`,
                  `  model: "${response.model}"`,
                  `  latency_ms: ${response.latencyMs || 'n/a'}`,
                  `  elapsed_ms: ${elapsedMs}`
                ].join('\n'));
              }

              return response.content;
            } catch (e) {
              if (extraVerbose) {
                const elapsedMs = Date.now() - startedAt;
                cliRenderer.codeblock('yaml', [
                  '# @type: llm_call_error',
                  '# @description: LLM call failed',
                  'llm_call:',
                  `  id: "${callId}"`,
                  `  status: "error"`,
                  `  elapsed_ms: ${elapsedMs}`,
                  `  error: "${(e && e.message) ? String(e.message).replace(/\n/g, ' ') : 'unknown'}"`
                ].join('\n'));
              }
              throw e;
            } finally {
              if (heartbeatTimer) {
                try { clearInterval(heartbeatTimer); } catch (e) {}
              }
              if (timeoutTimer) {
                try { clearTimeout(timeoutTimer); } catch (e) {}
              }
            }
          }
        };

        evolutionManager.setLLMClient(llmClient);

        // Determine a friendly status line (use env model for provider)
        const selectedProvider = process.env.LLM_PROVIDER || 'auto';
        const providerForStatus = (selectedProvider === 'auto') ? best.type : selectedProvider;
        const modelForStatus =
          (providerForStatus === 'openrouter') ? (process.env.OPENROUTER_MODEL || 'openrouter') :
          (providerForStatus === 'litellm') ? (process.env.LITELLM_MODEL || 'litellm') :
          (providerForStatus === 'windsurf') ? (process.env.WINDSURF_MODEL || 'windsurf') :
          (providerForStatus === 'ollama') ? (process.env.OLLAMA_MODEL || 'ollama') :
          null;

        llmStatus = { available: true, provider: providerForStatus, model: modelForStatus };
      } else {
        // Capture availability info for debugging
        const anyAvailable = Array.isArray(statuses) && statuses.some(s => s.available);
        llmStatus = { available: anyAvailable, provider: null, model: null };
      }
    } catch (e) {
      llmStatus = { available: false, provider: null, model: null };
    }
    
    const autostartYaml = [
      '# @type: evolution_autostart',
      '# @description: Autostart + diagnostics (printed before evolution begins)',
      'autostart:',
      `  ts_cli: true`,
      `  cwd: "${process.cwd()}"`,
      `  output: "${outputDir}"`,
      `  port: ${port}`,
      `  keep_running: ${keepRunning}`,
      `  interactive_menu: ${!noMenu && !keepRunning && process.stdin.isTTY}`,
      `  startup_timeout_ms: ${startupTimeoutMs}`,
      `  verbose: ${extraVerbose}`,
      `  log_file: "${logFile || 'none'}"`,
      `  llm_timeout_ms: ${llmTimeoutMs}`,
      '  llm:',
      `    provider_env: "${process.env.LLM_PROVIDER || 'auto'}"`,
      `    openrouter_model_env: "${process.env.OPENROUTER_MODEL || 'unset'}"`,
      `    openrouter_key_set: ${!!process.env.OPENROUTER_API_KEY}`,
      `    resolved_provider: "${llmStatus.provider || 'none'}"`,
      `    resolved_model: "${llmStatus.model || 'none'}"`
    ].join('\n');
    cliRenderer.codeblock('yaml', autostartYaml);
    if (llmDebugLines.length) {
      cliRenderer.codeblock('markdown', ['# LLM availability (debug)', ...llmDebugLines].join('\n'));
    }
    
    const setupYaml = [
      '# @type: evolution_setup',
      '# @description: Initial configuration for evolution pipeline',
      'setup:',
      `  prompt: "${prompt ? prompt.substring(0, 60) : contractPath}"`,
      `  output: "${outputDir}"`,
      `  port: ${port}`,
      '  llm:',
      `    available: ${llmStatus.available}`,
      `    provider: "${llmStatus.provider || 'none'}"`,
      `    model: "${llmStatus.model || 'none'}"`
    ].join('\n');
    cliRenderer.codeblock('yaml', setupYaml);
    console.log('');

    let progressTimer = null;
    progressTimer = setTimeout(() => {
      try {
        cliRenderer.codeblock('markdown', [
          '# evolve: startup timeout',
          '',
          'No further progress logs were printed quickly. This usually means one of:',
          '- waiting on a first LLM request (network/API key/model)',
          '- waiting on dependency install or project scaffolding',
          '- interactive menu waiting for input (use --no-menu)',
          '',
          '## quick checks',
          `- LLM_PROVIDER=${process.env.LLM_PROVIDER || 'auto'}`,
          `- OPENROUTER_API_KEY set: ${!!process.env.OPENROUTER_API_KEY}`,
          `- OPENROUTER_MODEL=${process.env.OPENROUTER_MODEL || 'unset'}`,
          `- outputDir=${outputDir}`,
          '',
          'Tip: rerun with `-v` and/or set `RECLAPP_EVOLVE_STARTUP_TIMEOUT_MS=10000`'
        ].join('\n'));
      } catch (e) {}
    }, startupTimeoutMs);

    // Start evolution lifecycle (iterative mode by default)
    if (prompt) {
      console.log(`💬 Starting iterative evolution from prompt: "${prompt}"\n`);
      await evolutionManager.evolveIteratively(prompt, 5);
      try {
        const st = evolutionManager.getStatus();
        if (st && typeof st.port === 'number') {
          port = st.port;
        }
      } catch (e) {}
    } else if (contractPath) {
      const fullPath = path.resolve(contractPath);
      if (fullPath.endsWith('.rcl.md')) {
        const result = parseMarkdownFile(fullPath);
        if (result.success && result.ir.aiPlan) {
          console.log(`📄 Found embedded AI Plan in: ${contractPath}`);
          await evolutionManager.start(result.ir.aiPlan);
        } else if (result.success) {
          const contract = irToContract(result.ir);
          console.log(`📄 Starting evolution from contract: ${contractPath}`);
          await evolutionManager.start(contract);
        } else {
          console.error(`❌ Failed to parse Markdown contract: ${result.errors[0]?.message}`);
          process.exit(1);
        }
      } else {
        const contract = require(path.resolve(contractPath)).default || require(path.resolve(contractPath));
        await evolutionManager.start(contract);
      }
      try {
        const st = evolutionManager.getStatus();
        if (st && typeof st.port === 'number') {
          port = st.port;
        }
      } catch (e) {}
    }

    if (progressTimer) {
      clearTimeout(progressTimer);
      progressTimer = null;
    }

    if (keepRunning) {
      console.log('\n📡 Evolution mode active. Monitoring for issues...');
      console.log('   Press Ctrl+C to stop\n');

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down evolution manager...');
        await evolutionManager.shutdown();
        process.exit(0);
      });

      // Keep process alive
      await new Promise(() => {}); // Never resolves
    } else {
      if (noMenu) {
        await evolutionManager.shutdown();
        cleanupLogging();
        return;
      }

      // Interactive mode - ask user what to do next
      console.log('\n✅ Evolution complete\n');

      cliRenderer.heading(2, 'Actions');
      cliRenderer.codeblock('yaml', [
        'commands:',
        '  k: "keep running - monitor for issues"',
        '  r: "restart - regenerate service"',
        '  f: "fix - create ticket for LLM"',
        '  s: "support - create interactive ticket (type freely)"',
        '  c: "contract - show contract/contract.ai.json"',
        '  e: "state - show state/evolution-state.json"',
        '  l: "logs - view service logs"',
        '  S: "tasks - show task queue"',
        '  t: "test - run API health check"',
        `  o: "open - browser http://localhost:${port}"`,
        '  q: "quit - stop and exit"'
      ].join('\n'));

      console.log('> Tip: Use `--keep-running` (`-k`) to skip this menu\n');

      // Enable raw mode for single keypress detection
      if (!keepRunning && process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();

        let menuInputActive = false;

        function disableMenuInput() {
          if (!menuInputActive) return;
          process.stdin.removeListener('data', handleKeypress);
          menuInputActive = false;
        }

        function enableMenuInput() {
          if (menuInputActive) return;
          process.stdin.on('data', handleKeypress);
          menuInputActive = true;
        }

        async function handleKeypress(chunk) {
          const key = chunk.toString();
          // Ctrl+C
          if (key === '\u0003') {
            console.log('\n🛑 Shutting down...');
            await evolutionManager.shutdown();
            process.exit(0);
          }

          const trimmed = key.trim();

          // Uppercase shortcuts (Shift+key)
          if (trimmed === 'S') {
            evolutionManager.printTasks();
            process.stdout.write('> Press key: ');
            return;
          }

          const k = trimmed.toLowerCase();

          switch (k) {
            case 'k':
              console.log('\n📡 Switching to keep-running mode...');
              console.log('   Monitoring service for issues. Press Ctrl+C to stop.\n');
              // Don't shutdown, keep monitoring
              return;

            case 'c':
              cliRenderer.heading(2, 'Contract');
              try {
                const contractPath = path.join(outputDir, 'contract', 'contract.ai.json');
                if (!fs.existsSync(contractPath)) {
                  cliRenderer.codeblock('log', `⚠️ Contract not found: ${contractPath}`);
                } else {
                  const json = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
                  cliRenderer.codeblock('json', JSON.stringify(json, null, 2));
                }
              } catch (e) {
                cliRenderer.codeblock('log', `⚠️ Failed to load contract: ${e.message || e}`);
              }
              process.stdout.write('> Press key: ');
              return;

            case 'e':
              cliRenderer.heading(2, 'Evolution State');
              try {
                const statePath = path.join(outputDir, 'state', 'evolution-state.json');
                if (!fs.existsSync(statePath)) {
                  cliRenderer.codeblock('log', `⚠️ State not found: ${statePath}`);
                } else {
                  const json = JSON.parse(fs.readFileSync(statePath, 'utf8'));
                  cliRenderer.codeblock('json', JSON.stringify(json, null, 2));
                }
              } catch (e) {
                cliRenderer.codeblock('log', `⚠️ Failed to load state: ${e.message || e}`);
              }
              process.stdout.write('> Press key: ');
              return;

            case 'r':
              console.log('\n🔄 Restarting evolution...');
              await evolutionManager.shutdown();
              await evolutionManager.startFromPrompt(prompt);
              console.log('\n✅ Restart complete');
              disableMenuInput();
              process.stdin.setRawMode(false);
              await cmdEvolution(args, options); // Recursive call
              return;

            case 'f':
              // Switch to line mode for ticket input (disable menu shortcuts)
              disableMenuInput();
              process.stdin.setRawMode(false);
              cliRenderer.codeblock('markdown', [
                '## 🎫 Create Fix Ticket for LLM',
                'Describe the issue you want the LLM to fix.',
                '',
                'Examples:',
                '- "Add pagination to the /api/v1/tasks endpoint"',
                '- "Fix the 500 error when creating a task without title"',
                '- "Add validation for email field in User entity"'
              ].join('\n'));
              
              const ticketRl = readline.createInterface({ 
                input: process.stdin, 
                output: process.stdout,
                terminal: true
              });
              ticketRl.on('SIGINT', () => {
                cliRenderer.codeblock('log', '⚠️ Ticket input canceled. Returning to menu.');
                ticketRl.close();
                process.stdin.setRawMode(true);
                enableMenuInput();
                process.stdout.write('> Press key: ');
              });
              
              ticketRl.question('🎫 Issue description: ', async (issueDescription) => {
                ticketRl.close();
                
                if (!issueDescription.trim()) {
                  cliRenderer.codeblock('log', '⚠️ No issue description provided. Returning to menu.');
                  process.stdin.setRawMode(true);
                  enableMenuInput();
                  process.stdout.write('> Press key: ');
                  return;
                }
                
                cliRenderer.codeblock('log', [
                  '📝 Creating ticket...',
                  `Issue: "${issueDescription}"`
                ].join('\n'));

                // Save ticket to file
                const ticketDir = path.join(outputDir, 'tickets');
                if (!fs.existsSync(ticketDir)) {
                  fs.mkdirSync(ticketDir, { recursive: true });
                }
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const ticketPath = path.join(ticketDir, `ticket_${timestamp}.md`);

                const recentLogs = (() => {
                  try {
                    const logsDir = path.join(outputDir, 'logs');
                    const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.rcl.md'));
                    if (logFiles.length > 0) {
                      const latestLog = path.join(logsDir, logFiles[logFiles.length - 1]);
                      return fs.readFileSync(latestLog, 'utf8').substring(0, 4000);
                    }
                  } catch (e) {}
                  return 'No logs available';
                })();

                const recentLogsBlock = fencedBlockString(recentLogs, 'markdown');
                
                const ticketContent = `# Fix Ticket

## Issue
${issueDescription}

## Context
- **Created**: ${new Date().toISOString()}
- **Service Port**: ${port}
- **Output Dir**: ${outputDir}
- **Original Prompt**: ${prompt}

## Status
- [ ] Pending LLM analysis
- [ ] Code changes generated
- [ ] Tests passing
- [ ] Deployed

## LLM Instructions
Please analyze this issue and generate the necessary code changes to fix it.
Consider:
1. What files need to be modified?
2. What is the root cause?
3. How can we add tests to prevent regression?

## Recent Logs
${recentLogsBlock}
`;
                
                fs.writeFileSync(ticketPath, ticketContent);
                cliRenderer.codeblock('log', `✅ Ticket saved: ${ticketPath}`);
                
                // Try to fix with LLM if available
                cliRenderer.codeblock('log', '🤖 Attempting to fix with LLM...');
                
                try {
                  const contractAI = require('../src/core/contract-ai');
                  const ollamaAvailable = await contractAI.checkOllamaAvailable();
                  
                  if (ollamaAvailable) {
                    cliRenderer.codeblock('log', 'Analyzing issue and generating fix...');
                    
                    // Trigger evolution with the issue as context
                    await evolutionManager.evolveWithFeedback(issueDescription);
                    
                    cliRenderer.codeblock('log', [
                      '✅ LLM fix applied!',
                      'Restarting service to apply changes...'
                    ].join('\n'));
                    
                    // Update ticket status
                    const updatedTicket = ticketContent
                      .replace('- [ ] Pending LLM analysis', '- [x] Pending LLM analysis')
                      .replace('- [ ] Code changes generated', '- [x] Code changes generated');
                    fs.writeFileSync(ticketPath, updatedTicket);
                    
                  } else {
                    cliRenderer.codeblock('log', [
                      '⚠️ Ollama not available. Ticket saved for manual review.',
                      '💡 Start Ollama: ollama serve && ollama pull llama3'
                    ].join('\n'));
                  }
                } catch (e) {
                  cliRenderer.codeblock('log', [
                    `⚠️ Auto-fix failed: ${e.message}`,
                    'Ticket saved for manual review.'
                  ].join('\n'));
                }
                
                cliRenderer.codeblock('markdown', [
                  '## 📋 Ticket',
                  `Path: \`${ticketPath}\``,
                  '',
                  'You can manually edit the ticket and re-run evolution.'
                ].join('\n'));
                
                // Return to raw mode for menu
                process.stdin.setRawMode(true);
                enableMenuInput();
                process.stdout.write('> Press key: ');
              });
              return;

            case 's':
              // Switch to line mode for ticket input (disable menu shortcuts)
              disableMenuInput();
              process.stdin.setRawMode(false);
              cliRenderer.codeblock('markdown', [
                '## 🎫 Create Ticket',
                'Type freely — shortcuts are disabled while you write.',
                '',
                'Press Enter to submit, Ctrl+C to cancel.'
              ].join('\n'));

              const supportRl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: true
              });
              supportRl.on('SIGINT', () => {
                cliRenderer.codeblock('log', '⚠️ Ticket input canceled. Returning to menu.');
                supportRl.close();
                process.stdin.setRawMode(true);
                enableMenuInput();
                process.stdout.write('> Press key: ');
              });

              supportRl.question('🎫 Ticket: ', async (issueDescription) => {
                supportRl.close();

                if (!issueDescription.trim()) {
                  cliRenderer.codeblock('log', '⚠️ Empty ticket. Returning to menu.');
                  process.stdin.setRawMode(true);
                  enableMenuInput();
                  process.stdout.write('> Press key: ');
                  return;
                }

                // Reuse the same behavior as fix ticket: save + attempt evolveWithFeedback
                cliRenderer.codeblock('log', [
                  '📝 Creating ticket...',
                  `Issue: "${issueDescription}"`
                ].join('\n'));

                const ticketDir = path.join(outputDir, 'tickets');
                if (!fs.existsSync(ticketDir)) {
                  fs.mkdirSync(ticketDir, { recursive: true });
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const ticketPath = path.join(ticketDir, `ticket_${timestamp}.md`);

                const recentLogs = (() => {
                  try {
                    const logsDir = path.join(outputDir, 'logs');
                    const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.rcl.md'));
                    if (logFiles.length > 0) {
                      const latestLog = path.join(logsDir, logFiles[logFiles.length - 1]);
                      return fs.readFileSync(latestLog, 'utf8').substring(0, 4000);
                    }
                  } catch (e) {}
                  return 'No logs available';
                })();

                const recentLogsBlock = fencedBlockString(recentLogs, 'markdown');

                const ticketContent = `# Ticket

## Issue
${issueDescription}

## Context
- **Created**: ${new Date().toISOString()}
- **Service Port**: ${port}
- **Output Dir**: ${outputDir}
- **Original Prompt**: ${prompt}

## Status
- [ ] Pending LLM analysis
- [ ] Code changes generated
- [ ] Tests passing
- [ ] Deployed

## LLM Instructions
Please analyze this issue and generate the necessary code changes to fix it.

## Recent Logs
${recentLogsBlock}
`;

                fs.writeFileSync(ticketPath, ticketContent);
                cliRenderer.codeblock('log', `✅ Ticket saved: ${ticketPath}`);

                cliRenderer.codeblock('log', '🤖 Attempting to fix with LLM...');
                try {
                  const contractAI = require('../src/core/contract-ai');
                  const ollamaAvailable = await contractAI.checkOllamaAvailable();

                  if (ollamaAvailable) {
                    cliRenderer.codeblock('log', 'Analyzing issue and generating fix...');
                    await evolutionManager.evolveWithFeedback(issueDescription);

                    cliRenderer.codeblock('log', '✅ LLM fix applied!');

                    const updatedTicket = ticketContent
                      .replace('- [ ] Pending LLM analysis', '- [x] Pending LLM analysis')
                      .replace('- [ ] Code changes generated', '- [x] Code changes generated');
                    fs.writeFileSync(ticketPath, updatedTicket);
                  } else {
                    cliRenderer.codeblock('log', '⚠️ Ollama not available. Ticket saved for manual review.');
                  }
                } catch (e) {
                  cliRenderer.codeblock('log', [
                    `⚠️ Auto-fix failed: ${e.message}`,
                    'Ticket saved for manual review.'
                  ].join('\n'));
                }

                cliRenderer.codeblock('markdown', [
                  '## 📋 Ticket',
                  `Path: \`${ticketPath}\``
                ].join('\n'));

                process.stdin.setRawMode(true);
                enableMenuInput();
                process.stdout.write('> Press key: ');
              });
              return;

            case 'l':
              cliRenderer.heading(2, 'Logs');
              try {
                const logsDir = path.join(outputDir, 'logs');
                const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.rcl.md'));
                if (logFiles.length > 0) {
                  const latestLog = path.join(logsDir, logFiles[logFiles.length - 1]);
                  const content = fs.readFileSync(latestLog, 'utf8');
                  const tailLines = 80;
                  const lines = content.split('\n');
                  const tail = lines.slice(-tailLines).join('\n');
                  cliRenderer.codeblock('yaml', `# @type: log_view\nlog:\n  file: "${latestLog}"\n  tail_lines: ${tailLines}`);
                  console.log('');
                  renderMarkdownWithFences(cliRenderer, tail);
                  console.log(`\n> Full log: \`${latestLog}\``);
                }
              } catch (e) {
                console.log('> No logs available yet.');
              }
              process.stdout.write('> Press key: ');
              return;

            case 't':
              cliRenderer.heading(2, 'Health Check');
              try {
                const url = `http://localhost:${port}/health`;
                const res = await fetch(url);
                const text = await res.text();
                let jsonOut = text.trim();
                try {
                  jsonOut = JSON.stringify(JSON.parse(text), null, 2);
                } catch (e) {}
                cliRenderer.codeblock('json', jsonOut);
                console.log('');
                cliRenderer.codeblock('yaml', `# @type: health_result\nresult: ${res.ok ? 'passed' : 'failed'}\nstatus: ${res.status}`);
              } catch (e) {
                const msg = (e && e.message) ? e.message : String(e);
                cliRenderer.codeblock('yaml', `# @type: health_result\nresult: failed\nerror: "${msg.replace(/\"/g, '\\\"').substring(0, 180)}"`);
              }
              process.stdout.write('> Press key: ');
              return;

            case 'o':
              let openUrl = `http://localhost:${port}/`;
              try {
                const res = await fetch(openUrl);
                if (!res.ok) {
                  openUrl = `http://localhost:${port}/health`;
                }
              } catch (e) {
                openUrl = `http://localhost:${port}/health`;
              }

              console.log(`\n🌐 Opening ${openUrl} in browser...`);
              try {
                const { exec } = require('child_process');
                exec(`xdg-open ${openUrl} 2>/dev/null || open ${openUrl} 2>/dev/null`);
              } catch (e) {}
              process.stdout.write('> Press key: ');
              return;

            case 'q':
              console.log('\n🛑 Shutting down service...');
              await evolutionManager.shutdown();
              console.log('👋 Goodbye!\n');
              process.exit(0);

            default:
              // Ignore other keys, show hint
              process.stdout.write('\r> Press key: ');
          }
        }

        enableMenuInput();

        // Keep process alive for interactive mode
        await new Promise(() => {});
      } else {
        // Non-TTY mode (piped input) - just shutdown
        console.log('💡 Tip: Run with --keep-running (-k) to keep the service alive');
        console.log('   Service exited (non-interactive mode)\n');
        await evolutionManager.shutdown();
      }
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    console.error('## Troubleshooting\n');
    console.error('```yaml');
    console.error('error:');
    console.error(`  message: "${error.message.substring(0, 80)}"`);
    
    // Context-specific error hints
    if (error.message.includes('EADDRINUSE') || error.message.includes('port')) {
      console.error('  type: "port_in_use"');
      console.error('  fix:');
      console.error('    - "--port 3001  # use different port"');
      console.error('    - "pkill -f node.*server  # kill existing"');
    } else if (error.message.includes('npm') || error.message.includes('install')) {
      console.error('  type: "npm_install_failed"');
      console.error('  fix:');
      console.error('    - "cd <output>/api && npm install"');
      console.error('    - "node --version  # requires 18+"');
    } else if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      console.error('  type: "file_not_found"');
      console.error('  fix:');
      console.error('    - "check output directory exists"');
      console.error('    - "verify contract file path"');
    } else if (error.message.includes('Ollama') || error.message.includes('LLM')) {
      console.error('  type: "llm_connection_failed"');
      console.error('  fix:');
      console.error('    - "ollama serve  # start server"');
      console.error('    - "ollama pull mistral:7b-instruct"');
    } else {
      console.error('  type: "unknown"');
      console.error('  fix:');
      console.error('    - "--verbose  # more details"');
      console.error('    - "cat <output>/logs/*.rcl.md"');
    }
    console.error('```\n');
    console.error('> Docs: `./docs/30-evolution-system.md`');
    console.error('> Issues: https://github.com/wronai/contract/issues\n');
    
    if (options.verbose) console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { cmdEvolution };
