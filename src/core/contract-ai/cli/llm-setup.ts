/**
 * LLM Setup Service
 * 
 * Responsible for:
 * - Detecting and initializing LLM providers
 * - Creating LLM client adapters
 * - Providing LLM status information
 * 
 * Separated from CLI to enable dependency injection and testing
 */

import { LLMClient } from '../../generator/contract-generator';
import { ILLMProvider, LLMConfig, createProvider } from '../llm/llm-provider';
import { OllamaClient } from '../llm/ollama-client';

export interface LLMStatus {
  available: boolean;
  model: string | null;
  source: string | null;
  error?: string;
}

export interface LLMSetupResult {
  status: LLMStatus;
  client: LLMClient | null;
}

/**
 * LLM Setup Service
 */
export class LLMSetupService {
  /**
   * Setup LLM client based on environment configuration
   */
  async setupLLMClient(): Promise<LLMSetupResult> {
    const llmProvider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
    
    // Try LiteLLM first if configured
    if (llmProvider === 'litellm' && process.env.LITELLM_URL) {
      return await this.setupLiteLLM();
    }
    
    // Fallback to Ollama
    if (llmProvider === 'ollama' || !process.env.LITELLM_URL) {
      return await this.setupOllama();
    }
    
    // No LLM available
    return {
      status: { available: false, model: null, source: 'none' },
      client: null
    };
  }

  /**
   * Setup LiteLLM provider
   */
  private async setupLiteLLM(): Promise<LLMSetupResult> {
    const config: LLMConfig = {
      provider: 'litellm',
      model: process.env.LITELLM_MODEL || 'model:1',
      baseUrl: process.env.LITELLM_URL!,
      apiKey: process.env.LITELLM_API_KEY
    };

    try {
      const provider = createProvider(config);
      const isAvailable = await provider.isAvailable();

      if (!isAvailable) {
        return {
          status: {
            available: false,
            model: config.model,
            source: 'LITELLM_URL (unavailable)'
          },
          client: null
        };
      }

      // Create adapter for LLMClient interface
      const client = this.createLLMClientAdapter(provider);

      return {
        status: {
          available: true,
          model: config.model,
          source: 'LITELLM_URL'
        },
        client
      };
    } catch (error: any) {
      return {
        status: {
          available: false,
          model: config.model,
          source: `LITELLM_URL (error: ${error.message})`,
          error: error.message
        },
        client: null
      };
    }
  }

  /**
   * Setup Ollama provider
   */
  private async setupOllama(): Promise<LLMSetupResult> {
    try {
      // Check if Ollama is available
      const { checkOllamaAvailable, createOllamaClient } = require('../llm/ollama-client');
      const ollamaAvailable = await checkOllamaAvailable();

      if (!ollamaAvailable) {
        return {
          status: { available: false, model: null, source: 'OLLAMA (not running)' },
          client: null
        };
      }

      const selectedModel = process.env.CODE_MODEL || process.env.OLLAMA_MODEL;
      const selectedFrom = process.env.CODE_MODEL ? 'CODE_MODEL' : 'OLLAMA_MODEL';
      const ollamaClient = createOllamaClient({ model: selectedModel });
      const configuredModel = ollamaClient.getConfig().model;
      const hasModel = await ollamaClient.hasModel();

      if (!hasModel) {
        return {
          status: {
            available: false,
            model: configuredModel,
            source: selectedFrom
          },
          client: null
        };
      }

      return {
        status: {
          available: true,
          model: configuredModel,
          source: selectedFrom
        },
        client: ollamaClient
      };
    } catch (error: any) {
      return {
        status: {
          available: false,
          model: null,
          source: 'OLLAMA (error)',
          error: error.message
        },
        client: null
      };
    }
  }

  /**
   * Create LLMClient adapter from ILLMProvider
   */
  private createLLMClientAdapter(provider: ILLMProvider): LLMClient {
    return {
      generate: async (opts) => {
        const messages = [
          { role: 'system' as const, content: opts.system },
          { role: 'user' as const, content: opts.user }
        ];
        const response = await provider.chat(messages, {
          temperature: opts.temperature,
          maxTokens: opts.maxTokens
        });
        return response.content;
      }
    };
  }
}

/**
 * Factory function
 */
export function createLLMSetupService(): LLMSetupService {
  return new LLMSetupService();
}

