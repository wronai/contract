/**
 * Task Handlers
 * 
 * Extracted task handler functions from evolution-manager.ts
 * Each handler processes a specific task in the evolution pipeline.
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { ContractAI } from '../types';
import { ShellRenderer } from './shell-renderer';
import { TaskQueue } from './task-queue';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskContext {
  outputDir: string;
  port: number;
  verbose: boolean;
  contract: ContractAI | null;
  renderer: ShellRenderer;
  taskQueue: TaskQueue;
  stateContext: string;
  prompt: string;
}

export interface TaskResult {
  success: boolean;
  error?: string;
  data?: any;
}

export type TaskHandler = (ctx: TaskContext) => Promise<TaskResult>;

// ============================================================================
// SETUP HANDLERS
// ============================================================================

export async function handleFolders(ctx: TaskContext): Promise<TaskResult> {
  const dirs = ['api/src', 'tests/e2e', 'tests/fixtures', 'contract', 'state', 'frontend/src', 'logs'];
  
  for (const dir of dirs) {
    const fullPath = path.join(ctx.outputDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
  
  if (ctx.verbose) {
    ctx.renderer.codeblock('yaml', `# @type: folders_created\nfolders:\n${dirs.map(d => `  - "${d}"`).join('\n')}`);
  }
  
  return { success: true };
}

export async function handleStateFile(ctx: TaskContext, writeSnapshot: () => void): Promise<TaskResult> {
  writeSnapshot();
  return { success: true };
}

export async function handleContractSave(ctx: TaskContext, writeSnapshot: () => void): Promise<TaskResult> {
  writeSnapshot();
  return { success: true };
}

// ============================================================================
// VALIDATION HANDLERS
// ============================================================================

export interface PlanValidation {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

export async function handleValidatePlan(
  ctx: TaskContext, 
  validate: () => PlanValidation
): Promise<TaskResult> {
  const result = validate();
  
  if (ctx.verbose) {
    ctx.renderer.codeblock('yaml', [
      '# @type: plan_validation',
      '# @description: Ensures TODO list matches contract requirements',
      `valid: ${result.valid}`,
      result.issues.length > 0 
        ? `issues:\n${result.issues.map(i => `  - "${i}"`).join('\n')}` 
        : 'issues: []',
      result.suggestions.length > 0 
        ? `suggestions:\n${result.suggestions.map(s => `  - "${s}"`).join('\n')}` 
        : 'suggestions: []'
    ].join('\n'));
  }
  
  if (!result.valid) {
    return { success: false, error: result.issues.join('; ') };
  }
  
  return { success: true };
}

// ============================================================================
// API VALIDATION HANDLER
// ============================================================================

export async function handleValidateApi(ctx: TaskContext): Promise<TaskResult> {
  const apiDir = path.join(ctx.outputDir, 'api');
  const requiredFiles = ['src/server.ts', 'package.json', 'tsconfig.json'];
  const missing: string[] = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(apiDir, file))) {
      missing.push(file);
    }
  }
  
  if (ctx.verbose) {
    ctx.renderer.codeblock('yaml', [
      '# @type: api_validation',
      '# @description: Verifies presence of required API files',
      'api:',
      `  required: ${requiredFiles.length}`,
      `  missing: ${missing.length}`,
      ...(missing.length > 0 ? [`  missing_files:\n${missing.map(f => `    - "${f}"`).join('\n')}`] : [])
    ].join('\n'));
  }
  
  if (missing.length > 0) {
    return { success: false, error: `Missing files: ${missing.join(', ')}` };
  }
  
  return { success: true };
}

// ============================================================================
// LAYER2 VALIDATION HANDLER
// ============================================================================

export interface Layer2Result {
  satisfied: string[];
  missingTargets: string[];
}

export async function handleLayer2Validation(
  ctx: TaskContext,
  validate: () => Layer2Result
): Promise<TaskResult> {
  const result = validate();
  
  // Get must targets from contract
  const mustTargets = ctx.contract?.generation?.instructions
    ?.filter(i => i.priority === 'must')
    .map(i => i.target) || [];
  
  if (ctx.verbose) {
    ctx.renderer.codeblock('yaml', [
      '# @type: layer2_validation',
      '# @description: Checks if non-API must targets from contract are satisfied',
      'layer2:',
      `  must_targets: ${mustTargets.length}`,
      '  targets:',
      ...mustTargets.map(t => `    - "${t}"`),
      `  missing_targets: ${result.missingTargets.length}`,
      ...(result.missingTargets.length > 0 ? ['  missing:', ...result.missingTargets.map(t => `    - "${t}"`)] : [])
    ].join('\n'));
  }
  
  if (result.missingTargets.length > 0) {
    return { 
      success: false, 
      error: `Missing targets: ${result.missingTargets.join(', ')}`,
      data: result 
    };
  }
  
  return { success: true, data: result };
}

// ============================================================================
// MULTI-LEVEL ANALYSIS HANDLER
// ============================================================================

export interface MultiLevelAnalysis {
  contract: { entities: string[]; endpoints: number };
  sourcecode: { files: number; detected_endpoints: number; detected_entities: string[] };
  service: { running: boolean; health: boolean };
  logs: { errors: number; warnings: number };
  discrepancies: Array<{
    level: string;
    severity: string;
    expected: string;
    actual: string;
    suggestion: string;
  }>;
}

export async function handleMultiLevelAnalysis(
  ctx: TaskContext,
  analyze: () => Promise<MultiLevelAnalysis>
): Promise<TaskResult> {
  const analysis = await analyze();
  
  if (ctx.verbose) {
    ctx.renderer.codeblock('yaml', [
      '# @type: multi_level_analysis',
      '# @description: Compares contract, sourcecode, service, and logs for discrepancies',
      'analysis:',
      '  contract:',
      `    entities: [${analysis.contract.entities.join(', ')}]`,
      `    endpoints: ${analysis.contract.endpoints}`,
      '  sourcecode:',
      `    files: ${analysis.sourcecode.files}`,
      `    detected_endpoints: ${analysis.sourcecode.detected_endpoints}`,
      `    detected_entities: [${analysis.sourcecode.detected_entities.join(', ')}]`,
      '  service:',
      `    running: ${analysis.service.running}`,
      `    health: ${analysis.service.health}`,
      '  logs:',
      `    errors: ${analysis.logs.errors}`,
      `    warnings: ${analysis.logs.warnings}`,
      '  reconciliation:',
      `    reconciled: ${analysis.discrepancies.length === 0}`,
      `    discrepancies: ${analysis.discrepancies.length}`
    ].join('\n'));
    
    if (analysis.discrepancies.length > 0) {
      ctx.renderer.codeblock('yaml', [
        '# @type: discrepancies',
        '# @description: Found mismatches between contract and actual state',
        'discrepancies:',
        ...analysis.discrepancies.map(d => [
          `  - level: "${d.level}"`,
          `    severity: "${d.severity}"`,
          `    expected: "${d.expected}"`,
          `    actual: "${d.actual}"`,
          `    suggestion: "${d.suggestion}"`
        ].join('\n'))
      ].join('\n'));
    }
  }
  
  return { 
    success: true, 
    data: analysis 
  };
}

// ============================================================================
// INSTALL & START HANDLERS
// ============================================================================

export async function handleInstallAndStart(
  ctx: TaskContext,
  startService: () => Promise<void>
): Promise<TaskResult> {
  await startService();
  return { success: true };
}

// ============================================================================
// TEST HANDLERS
// ============================================================================

export async function handleRunTests(
  ctx: TaskContext,
  runTests: () => Promise<{ passed: boolean; error?: string }>
): Promise<TaskResult> {
  const result = await runTests();
  
  if (result.passed) {
    return { success: true };
  }
  
  return { success: false, error: result.error || 'Tests failed' };
}

// ============================================================================
// FRONTEND HANDLER
// ============================================================================

export async function handleGenerateFrontend(
  ctx: TaskContext,
  orchestrate: () => Promise<boolean>,
  generateFallback: () => Record<string, string>
): Promise<TaskResult> {
  let ok = false;
  
  try {
    ok = await orchestrate();
  } catch {
    ok = false;
  }
  
  // Fallback if LLM didn't generate frontend
  if (!ok) {
    try {
      const frontendFiles = generateFallback();
      const fs = require('fs');
      const path = require('path');
      
      for (const [filePath, content] of Object.entries(frontendFiles)) {
        const fullPath = path.join(ctx.outputDir, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf-8');
      }
      ok = true;
    } catch {
      ok = false;
    }
  }
  
  return { success: ok, error: ok ? undefined : 'Frontend generation failed' };
}

// ============================================================================
// HANDLER REGISTRY
// ============================================================================

export const taskHandlers: Record<string, TaskHandler> = {
  'folders': handleFolders,
  'validate-api': handleValidateApi,
};

export default taskHandlers;
