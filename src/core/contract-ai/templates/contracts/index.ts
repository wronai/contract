/**
 * Stage Contracts Index
 * 
 * Partial contracts for each stage of the evolution pipeline.
 * These provide context and constraints for LLM generation.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StageContract {
  $schema: string;
  stage: string;
  description: string;
  focus: string[];
  requirements: Record<string, any>;
  outputFormat: Record<string, any>;
}

export function loadStageContract(stage: string): StageContract | null {
  const candidates = [
    __dirname,
    path.join(process.cwd(), 'src', 'core', 'contract-ai', 'templates', 'contracts'),
    path.join(process.cwd(), 'dist', 'src', 'core', 'contract-ai', 'templates', 'contracts'),
    path.join(process.cwd(), 'dist', 'core', 'contract-ai', 'templates', 'contracts')
  ];

  for (const dir of candidates) {
    const filePath = path.join(dir, `stage-${stage}.contract.json`);
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch {
      // Ignore errors
    }
  }
  return null;
}

export function getStageRequirements(stage: string): string {
  const contract = loadStageContract(stage);
  if (!contract) return '';
  
  const lines: string[] = [
    `## Stage: ${stage}`,
    contract.description,
    '',
    '### Requirements:'
  ];
  
  if (contract.requirements.features) {
    for (const feature of contract.requirements.features) {
      lines.push(`- ${feature}`);
    }
  }
  
  if (contract.requirements.forbidden) {
    lines.push('', '### Forbidden:');
    if (contract.requirements.forbidden.frameworks) {
      lines.push(`- Frameworks: ${contract.requirements.forbidden.frameworks.join(', ')}`);
    }
    if (contract.requirements.forbidden.imports) {
      lines.push(`- Imports: ${contract.requirements.forbidden.imports.join(', ')}`);
    }
  }
  
  return lines.join('\n');
}

export const stages = ['api', 'tests', 'frontend', 'docs'];

export default { loadStageContract, getStageRequirements, stages };
