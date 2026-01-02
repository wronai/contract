#!/usr/bin/env npx tsx
/**
 * Code Analysis Script
 * 
 * Analyzes project structure, finds duplicates, measures complexity.
 * 
 * Usage:
 *   npx tsx scripts/analyze-code.ts [directory]
 *   npx tsx scripts/analyze-code.ts ./src
 *   npx tsx scripts/analyze-code.ts . --json
 *   npx tsx scripts/analyze-code.ts . --contract
 */

import * as fs from 'fs';
import * as path from 'path';
import { CodeAnalyzer } from '../src/core/contract-ai/analysis/code-analyzer';

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args.find(a => !a.startsWith('--')) || '.';
  const outputJson = args.includes('--json');
  const outputContract = args.includes('--contract');

  console.log(`\n📊 Analyzing: ${path.resolve(targetDir)}\n`);

  const analyzer = new CodeAnalyzer(targetDir);
  const report = await analyzer.analyze();

  if (outputJson) {
    console.log(JSON.stringify(report, (key, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }, 2));
  } else if (outputContract) {
    const contract = analyzer.toContract(report);
    console.log(JSON.stringify(contract, null, 2));
  } else {
    // Markdown output
    console.log(analyzer.toMarkdown(report));
  }

  // Save report
  const reportsDir = path.join(targetDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, `analysis-${Date.now()}.md`);
  fs.writeFileSync(reportPath, analyzer.toMarkdown(report), 'utf-8');
  console.log(`\n📝 Report saved: ${reportPath}`);

  // Summary
  console.log('\n## Quick Stats\n');
  console.log(`Files: ${report.summary.totalFiles}`);
  console.log(`Lines: ${report.summary.totalLines}`);
  console.log(`Functions: ${report.summary.totalFunctions}`);
  console.log(`Duplicates: ${report.summary.duplicates.length}`);
  console.log(`Recommendations: ${report.recommendations.length}`);
}

main().catch(console.error);
