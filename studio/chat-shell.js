#!/usr/bin/env node
/**
 * Reclapp Chat Shell - Studio version
 * 
 * Uses shared chat-core module
 * Simpler interface for studio
 */

const readline = require('readline');
const path = require('path');
const { ReclappChat } = require('../lib/chat-core');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function color(c, text) {
  return `${colors[c]}${text}${colors.reset}`;
}

// Projects dir for studio
const PROJECTS_DIR = path.join(__dirname, 'projects');

// Create chat instance
const chat = new ReclappChat();

async function main() {
  console.log(`
${color('cyan', '╔══════════════════════════════════════════════════════════════╗')}
${color('cyan', '║')}           ${color('bright', '🤖 RECLAPP CHAT SHELL')}                           ${color('cyan', '║')}
${color('cyan', '║')}           Interactive Contract Designer                      ${color('cyan', '║')}
${color('cyan', '╚══════════════════════════════════════════════════════════════╝')}

${color('dim', 'Model:')} ${chat.model} @ ${chat.ollamaHost}

${color('yellow', 'Commands:')}
  ${color('cyan', '/show')}           Show current contract
  ${color('cyan', '/validate')}       Validate contract
  ${color('cyan', '/save [name]')}    Save as .reclapp.rcl
  ${color('cyan', '/save-md [name]')} Save as .rcl.md (with conversation)
  ${color('cyan', '/save-all [name]')} Save all formats
  ${color('cyan', '/clear')}          Clear history
  ${color('cyan', '/name <name>')}    Set project name
  ${color('cyan', '/help')}           Show commands
  ${color('cyan', '/quit')}           Exit

${color('dim', 'Start by describing what you want to build...')}
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question(`\n${color('green', '�� You:')} `, async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        prompt();
        return;
      }

      // Handle commands
      if (trimmed.startsWith('/')) {
        const [cmd, ...args] = trimmed.slice(1).split(' ');
        const arg = args.join(' ').trim() || chat.projectName;
        
        switch (cmd.toLowerCase()) {
          case 'quit':
          case 'exit':
          case 'q':
            console.log(color('yellow', '\n👋 Goodbye!\n'));
            rl.close();
            process.exit(0);
            break;
            
          case 'help':
          case 'h':
            console.log(`
${color('yellow', 'Commands:')}
  ${color('cyan', '/show')}           Show contract
  ${color('cyan', '/validate')}       Validate
  ${color('cyan', '/save [name]')}    Save .reclapp.rcl
  ${color('cyan', '/save-md [name]')} Save .rcl.md
  ${color('cyan', '/save-all [name]')} Save all formats
  ${color('cyan', '/clear')}          Clear history
  ${color('cyan', '/name <name>')}    Set project name
  ${color('cyan', '/quit')}           Exit
`);
            break;
            
          case 'show':
            if (chat.currentContract) {
              console.log(`\n${color('cyan', '📄 Current Contract:')}\n`);
              console.log(chat.formatContract(chat.currentContract));
            } else {
              console.log(color('yellow', '⚠️ No contract yet.'));
            }
            break;
            
          case 'validate':
            const result = chat.validateContract();
            if (result.valid) {
              console.log(color('green', `✅ Valid! Entities: ${result.stats.entities}, Events: ${result.stats.events}`));
            } else {
              console.log(color('red', `❌ Issues: ${result.errors.join(', ')}`));
            }
            break;
            
          case 'save':
            if (!chat.currentContract) {
              console.log(color('red', '❌ No contract to save'));
              break;
            }
            const saveDir = path.join(PROJECTS_DIR, arg);
            const saveResult = chat.saveContract(saveDir, 'rcl');
            if (saveResult.success) {
              console.log(color('green', `✅ Saved: ${saveResult.files[0]?.path}`));
            }
            break;
            
          case 'save-md':
            if (!chat.currentContract) {
              console.log(color('red', '❌ No contract to save'));
              break;
            }
            const mdDir = path.join(PROJECTS_DIR, arg);
            const mdResult = chat.saveContract(mdDir, 'md');
            if (mdResult.success) {
              console.log(color('green', `✅ Saved: ${mdResult.files[0]?.path}`));
            }
            break;
            
          case 'save-all':
            if (!chat.currentContract) {
              console.log(color('red', '❌ No contract to save'));
              break;
            }
            const allDir = path.join(PROJECTS_DIR, arg);
            const allResult = chat.saveContract(allDir, 'all');
            if (allResult.success) {
              console.log(color('green', `✅ Saved ${allResult.files.length} files:`));
              allResult.files.forEach(f => console.log(color('dim', `   ${f.path}`)));
            }
            break;
            
          case 'name':
            if (arg && arg !== chat.projectName) {
              chat.setProjectName(arg);
              console.log(color('green', `✅ Project: ${arg}`));
            } else {
              console.log(color('cyan', `�� Project: ${chat.projectName}`));
            }
            break;
            
          case 'clear':
            chat.clear();
            console.log(color('green', '✅ Cleared'));
            break;
            
          default:
            console.log(color('yellow', `⚠️ Unknown: /${cmd}. Type /help`));
        }
        
        prompt();
        return;
      }

      // Send to LLM
      console.log(color('dim', '\n⏳ Thinking...'));
      
      const response = await chat.chat(trimmed);
      
      if (response.error) {
        console.log(color('red', `\n❌ ${response.error}`));
      } else {
        console.log(`\n${color('blue', '🤖 Assistant:')}\n`);
        console.log(response.response);
        
        if (response.contract) {
          console.log(color('green', '\n✅ Contract extracted!'));
        }
      }
      
      prompt();
    });
  };

  prompt();
}

main().catch(console.error);
