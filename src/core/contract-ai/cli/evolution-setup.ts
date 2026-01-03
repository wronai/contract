/**
 * Evolution Setup Service
 * 
 * Responsible for:
 * - Creating and configuring Evolution Manager
 * - Setting up LLM client
 * - Providing setup information
 * 
 * Separated from CLI for better testability and DI
 */

import { EvolutionManager, EvolutionOptions } from '../evolution/evolution-manager';
import { LLMSetupService, LLMSetupResult, createLLMSetupService } from './llm-setup';
import { ShellRenderer } from '../evolution/shell-renderer';

export interface EvolutionSetupConfig {
  outputDir: string;
  port: number;
  verbose?: boolean;
  maxEvolutionCycles?: number;
  autoRestart?: boolean;
}

export interface EvolutionSetupResult {
  manager: EvolutionManager;
  llmStatus: {
    available: boolean;
    model: string | null;
    source: string | null;
  };
}

/**
 * Evolution Setup Service
 */
export class EvolutionSetupService {
  private llmSetup: LLMSetupService;

  constructor(llmSetup?: LLMSetupService) {
    this.llmSetup = llmSetup || createLLMSetupService();
  }

  /**
   * Setup evolution manager with LLM
   */
  async setup(config: EvolutionSetupConfig): Promise<EvolutionSetupResult> {
    const contractAI = require('../../index');
    
    // Create evolution manager
    const evolutionManager = contractAI.createEvolutionManager({
      outputDir: config.outputDir,
      port: config.port,
      verbose: config.verbose ?? true,
      maxEvolutionCycles: config.maxEvolutionCycles ?? 10,
      autoRestart: config.autoRestart ?? true
    });

    // Setup LLM
    const llmResult = await this.llmSetup.setupLLMClient();
    
    if (llmResult.client) {
      evolutionManager.setLLMClient(llmResult.client);
    }

    return {
      manager: evolutionManager,
      llmStatus: llmResult.status
    };
  }

  /**
   * Format setup YAML for display
   */
  formatSetupYAML(prompt: string | null, contractPath: string | null, outputDir: string, port: number, llmStatus: LLMSetupResult['status']): string {
    const lines = [
      '# @type: evolution_setup',
      '# @description: Initial configuration for evolution pipeline',
      'setup:',
      `  prompt: "${prompt ? prompt.substring(0, 60) : contractPath}"`,
      `  output: "${outputDir}"`,
      `  port: ${port}`,
      '  llm:',
      `    available: ${llmStatus.available}`,
      `    model: "${llmStatus.model || 'none'}"`
    ];

    if (!llmStatus.available && llmStatus.model) {
      lines.push(`    fix: "ollama pull ${llmStatus.model}"`);
    }

    return lines.join('\n');
  }
}

/**
 * Factory function
 */
export function createEvolutionSetupService(llmSetup?: LLMSetupService): EvolutionSetupService {
  return new EvolutionSetupService(llmSetup);
}

