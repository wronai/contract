#!/usr/bin/env node
/**
 * CLI Command: generate-ai
 * 
 * Generuje kod z Contract AI używając LLM.
 * 
 * Usage:
 *   reclapp generate-ai <contract-file> [options]
 *   reclapp generate-ai --prompt "Create a CRM system" [options]
 * 
 * Options:
 *   --prompt, -p       Natural language prompt (zamiast pliku)
 *   --output, -o       Output directory (default: ./generated)
 *   --max-iterations   Max validation iterations (default: 10)
 *   --verbose, -v      Verbose output
 *   --dry-run          Generate contract only, no code
 *   --model            LLM model to use (default: llama3)
 * 
 * @version 2.4.1
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface GenerateAIOptions {
  contractFile?: string;
  prompt?: string;
  output: string;
  maxIterations: number;
  verbose: boolean;
  dryRun: boolean;
  model: string;
}

// ============================================================================
// ARGUMENT PARSER
// ============================================================================

function parseArgs(args: string[]): GenerateAIOptions {
  const options: GenerateAIOptions = {
    output: './generated',
    maxIterations: 10,
    verbose: false,
    dryRun: false,
    model: 'llama3'
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    switch (arg) {
      case '--prompt':
      case '-p':
        options.prompt = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--max-iterations':
        options.maxIterations = parseInt(args[++i], 10);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-') && !options.contractFile) {
          options.contractFile = arg;
        }
        break;
    }
    i++;
  }

  return options;
}

function printHelp(): void {
  console.log(`
🤖 Reclapp Contract AI Generator

Usage:
  reclapp generate-ai <contract-file> [options]
  reclapp generate-ai --prompt "Create a CRM system" [options]

Options:
  --prompt, -p       Natural language prompt (instead of file)
  --output, -o       Output directory (default: ./generated)
  --max-iterations   Max validation iterations (default: 10)
  --verbose, -v      Verbose output
  --dry-run          Generate contract only, no code
  --model            LLM model to use (default: llama3)
  --help, -h         Show this help

Examples:
  # Generate from contract file
  reclapp generate-ai examples/crm-contract.ts

  # Generate from natural language
  reclapp generate-ai -p "Create a task management API with users and tasks"

  # Generate with options
  reclapp generate-ai -p "CRM system" -o ./my-crm -v --max-iterations 5
`);
}

// ============================================================================
// MAIN COMMAND
// ============================================================================

async function generateAI(options: GenerateAIOptions): Promise<void> {
  console.log('\n🤖 Reclapp Contract AI Generator v2.4.1\n');

  // Validate input
  if (!options.contractFile && !options.prompt) {
    console.error('❌ Error: Provide either a contract file or --prompt');
    printHelp();
    process.exit(1);
  }

  try {
    // Dynamic import of contract-ai module
    const contractAI = await import('../../core/contract-ai');

    let contract: any;

    // Load or generate contract
    if (options.contractFile) {
      console.log(`📄 Loading contract from: ${options.contractFile}`);
      contract = await loadContract(options.contractFile);
    } else if (options.prompt) {
      console.log(`💬 Generating contract from prompt: "${options.prompt}"`);
      
      const generator = contractAI.createContractGenerator({
        verbose: options.verbose,
        model: options.model
      });

      const result = await generator.generate(options.prompt);
      
      if (!result.success) {
        console.error('❌ Failed to generate contract');
        result.errors.forEach(e => console.error(`   - ${e.message}`));
        process.exit(1);
      }

      contract = result.contract;
      console.log(`✅ Contract generated in ${result.attempts} attempt(s)`);
    }

    // Validate contract
    const validator = contractAI.createContractValidator();
    const validationResult = validator.validate(contract);

    if (!validationResult.valid) {
      console.error('❌ Contract validation failed:');
      validationResult.errors.forEach(e => 
        console.error(`   - [${e.code}] ${e.path}: ${e.message}`)
      );
      process.exit(1);
    }

    console.log('✅ Contract validated successfully');

    // Dry run - stop here
    if (options.dryRun) {
      console.log('\n📋 Contract (dry-run):');
      console.log(JSON.stringify(contract, null, 2));
      return;
    }

    // Generate code
    console.log('\n🔨 Generating code...');
    
    const codeGenerator = contractAI.createLLMCodeGenerator({
      verbose: options.verbose,
      model: options.model
    });

    const generatedCode = await codeGenerator.generate(contract);
    
    console.log(`✅ Generated ${generatedCode.files.length} files`);

    // Run validation pipeline
    console.log('\n🔍 Running validation pipeline...');
    
    const pipeline = contractAI.createDefaultValidationPipeline();
    const pipelineResult = await pipeline.validate(contract, generatedCode);

    if (pipelineResult.passed) {
      console.log('✅ All validation stages passed');
    } else {
      console.log(`⚠️ Validation: ${pipelineResult.summary.passedStages}/${pipelineResult.stages.length} stages passed`);
      console.log(`   Errors: ${pipelineResult.summary.totalErrors}, Warnings: ${pipelineResult.summary.totalWarnings}`);
    }

    // Write output files
    console.log(`\n📁 Writing files to: ${options.output}`);
    await writeGeneratedFiles(generatedCode.files, options.output);

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('✨ Generation complete!');
    console.log('═'.repeat(50));
    console.log(`   Files generated: ${generatedCode.files.length}`);
    console.log(`   Output directory: ${options.output}`);
    console.log(`   Time: ${generatedCode.metadata.timeMs}ms`);
    
    if (generatedCode.files.length > 0) {
      console.log('\n   Files:');
      generatedCode.files.slice(0, 10).forEach(f => {
        console.log(`   - ${f.path}`);
      });
      if (generatedCode.files.length > 10) {
        console.log(`   ... and ${generatedCode.files.length - 10} more`);
      }
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function loadContract(filePath: string): Promise<any> {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Contract file not found: ${absolutePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    return JSON.parse(content);
  }

  if (ext === '.ts' || ext === '.js') {
    // Dynamic import for TypeScript/JavaScript files
    const module = await import(absolutePath);
    return module.default || module.contract || module;
  }

  throw new Error(`Unsupported contract file type: ${ext}`);
}

async function writeGeneratedFiles(
  files: Array<{ path: string; content: string }>,
  outputDir: string
): Promise<void> {
  const absoluteOutput = path.resolve(outputDir);

  for (const file of files) {
    const filePath = path.join(absoluteOutput, file.path);
    const fileDir = path.dirname(filePath);

    // Create directory if needed
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

// Check if running directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  generateAI(options).catch(console.error);
}

export { generateAI, parseArgs, GenerateAIOptions };
