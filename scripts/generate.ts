#!/usr/bin/env npx ts-node
/**
 * Reclapp Generator Script
 * 
 * Simplified script that uses shared generator modules.
 * For full CLI functionality, use bin/reclapp instead.
 * 
 * Usage:
 *   npx ts-node scripts/generate.ts <contract-path> [output-dir]
 * 
 * Examples:
 *   npx ts-node scripts/generate.ts examples/crm/contracts/main.reclapp.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { SimpleGenerator, generateFromContract } from '../generator/core/simple-generator';
import type { ReclappContract } from '../contracts/dsl-types';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Reclapp Generator Script

Usage:
  npx ts-node scripts/generate.ts <contract-path> [output-dir]

Note: For full CLI with run/test/deploy, use ./bin/reclapp instead.

Examples:
  npx ts-node scripts/generate.ts examples/crm/contracts/main.reclapp.ts
`);
    process.exit(0);
  }

  const contractPath = path.resolve(args[0]);
  const outputDir = args[1] 
    ? path.resolve(args[1]) 
    : path.join(path.dirname(contractPath), '..', 'target');

  if (!fs.existsSync(contractPath)) {
    console.error(`Error: Contract file not found: ${contractPath}`);
    process.exit(1);
  }

  console.log(`Loading contract: ${contractPath}`);

  // Import contract
  const module = require(contractPath);
  const contract: ReclappContract = module.contract || module.default || module;

  if (!contract.app?.name) {
    console.error('Error: Invalid contract - missing app.name');
    process.exit(1);
  }

  // Generate using shared SimpleGenerator
  const generator = new SimpleGenerator(contract, outputDir);
  generator.generate();
  const written = generator.writeFiles(true);

  console.log(`\n✅ Generated ${written} files to ${outputDir}`);
  console.log(`
Next steps:
  cd ${path.relative(process.cwd(), outputDir)}/api && npm install && npm run dev
  cd ${path.relative(process.cwd(), outputDir)}/frontend && npm install && npm run dev

Or use the full CLI:
  ./bin/reclapp run ${args[0]}
`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
