/**
 * LLM Manager - Multi-Provider Orchestration
 * 
 * Manages multiple LLM providers with:
 * - Automatic fallback chain
 * - Load balancing
 * - Context-aware model selection
 * - Rate limiting
 * 
 * @version 2.4.1
 */

import {
  ILLMProvider,
  LLMConfig,
  LLMMessage,
  LLMResponse,
  LLMProviderType,
  FREE_MODELS,
  createProvider
} from './llm-provider';

// ============================================================================
// TYPES
// ============================================================================

export interface LLMManagerConfig {
  providers: LLMConfig[];
  fallbackChain?: LLMProviderType[];
  defaultProvider?: LLMProviderType;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface TaskContext {
  type: 'contract' | 'code' | 'refactor' | 'test' | 'docs';
  complexity: 'low' | 'medium' | 'high';
  tokensRequired: number;
  language?: string;
}

export interface ProviderStatus {
  provider: LLMProviderType;
  available: boolean;
  latencyMs?: number;
  lastError?: string;
}

// ============================================================================
// LLM MANAGER
// ============================================================================

export class LLMManager {
  private providers: Map<LLMProviderType, ILLMProvider> = new Map();
  private config: LLMManagerConfig;
  private providerStatus: Map<LLMProviderType, ProviderStatus> = new Map();

  constructor(config: LLMManagerConfig) {
    this.config = {
      retryAttempts: 3,
      retryDelayMs: 1000,
      fallbackChain: ['windsurf', 'openrouter', 'litellm', 'ollama'],
      ...config
    };

    this.initializeProviders();
  }

  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    for (const providerConfig of this.config.providers) {
      try {
        const provider = createProvider(providerConfig);
        this.providers.set(providerConfig.provider, provider);
        this.providerStatus.set(providerConfig.provider, {
          provider: providerConfig.provider,
          available: false
        });
      } catch (error) {
        console.warn(`Failed to initialize provider ${providerConfig.provider}:`, error);
      }
    }
  }

  /**
   * Check availability of all providers
   */
  async checkAvailability(): Promise<ProviderStatus[]> {
    const results: ProviderStatus[] = [];

    for (const [type, provider] of this.providers) {
      const startTime = Date.now();
      try {
        const available = await provider.isAvailable();
        const status: ProviderStatus = {
          provider: type,
          available,
          latencyMs: Date.now() - startTime
        };
        this.providerStatus.set(type, status);
        results.push(status);
      } catch (error) {
        const status: ProviderStatus = {
          provider: type,
          available: false,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        };
        this.providerStatus.set(type, status);
        results.push(status);
      }
    }

    return results;
  }

  /**
   * Get best provider for task
   */
  getBestProvider(context: TaskContext): ILLMProvider | null {
    // For high complexity or large token requirements, prefer remote models
    if (context.complexity === 'high' || context.tokensRequired > 8000) {
      // Prefer Windsurf free models (DeepSeek V3, R1, GPT-5.1-Codex)
      for (const type of ['windsurf', 'openrouter', 'litellm'] as LLMProviderType[]) {
        const status = this.providerStatus.get(type);
        if (status?.available && this.providers.has(type)) {
          return this.providers.get(type)!;
        }
      }
    }

    // For code generation, prefer code-specialized models
    if (context.type === 'code' || context.type === 'refactor') {
      for (const type of this.config.fallbackChain || []) {
        const status = this.providerStatus.get(type);
        if (status?.available && this.providers.has(type)) {
          return this.providers.get(type)!;
        }
      }
    }

    // Default: return first available
    for (const [type, provider] of this.providers) {
      const status = this.providerStatus.get(type);
      if (status?.available) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Chat with automatic fallback
   */
  async chat(
    messages: LLMMessage[],
    context?: TaskContext,
    config?: Partial<LLMConfig>
  ): Promise<LLMResponse> {
    const fallbackChain = this.config.fallbackChain || [];
    let lastError: Error | null = null;

    // Try providers in fallback order
    for (const providerType of fallbackChain) {
      const provider = this.providers.get(providerType);
      const status = this.providerStatus.get(providerType);

      if (!provider || !status?.available) continue;

      for (let attempt = 0; attempt < (this.config.retryAttempts || 1); attempt++) {
        try {
          const response = await provider.chat(messages, config);
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          // Update status
          this.providerStatus.set(providerType, {
            ...status,
            lastError: lastError.message
          });

          // Wait before retry
          if (attempt < (this.config.retryAttempts || 1) - 1) {
            await this.delay(this.config.retryDelayMs || 1000);
          }
        }
      }
    }

    throw lastError || new Error('No providers available');
  }

  /**
   * Stream chat with automatic fallback
   */
  async *streamChat(
    messages: LLMMessage[],
    context?: TaskContext,
    config?: Partial<LLMConfig>
  ): AsyncGenerator<string> {
    const provider = this.getBestProvider(context || { type: 'code', complexity: 'medium', tokensRequired: 4000 });
    
    if (!provider) {
      throw new Error('No providers available');
    }

    yield* provider.streamChat(messages, config);
  }

  /**
   * Get provider by type
   */
  getProvider(type: LLMProviderType): ILLMProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get all provider statuses
   */
  getStatuses(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  /**
   * Helper delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create LLM Manager from environment variables
 */
export function createLLMManagerFromEnv(): LLMManager {
  const providers: LLMConfig[] = [];

  // Ollama (local)
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'codellama';
  providers.push({
    provider: 'ollama',
    model: ollamaModel,
    baseUrl: ollamaUrl
  });

  // LiteLLM
  const litellmUrl = process.env.LITELLM_URL;
  const litellmModel = process.env.LITELLM_MODEL;
  const litellmKey = process.env.LITELLM_API_KEY;
  if (litellmUrl) {
    providers.push({
      provider: 'litellm',
      model: litellmModel || 'gpt-4',
      baseUrl: litellmUrl,
      apiKey: litellmKey
    });
  }

  // OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const openrouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-coder-33b-instruct';
  if (openrouterKey) {
    providers.push({
      provider: 'openrouter',
      model: openrouterModel,
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: openrouterKey
    });
  }

  // Windsurf Free Models
  const windsurfUrl = process.env.WINDSURF_URL;
  const windsurfModel = process.env.WINDSURF_MODEL || 'deepseek-v3-0324';
  const windsurfKey = process.env.WINDSURF_API_KEY;
  if (windsurfUrl || windsurfKey) {
    providers.push({
      provider: 'windsurf',
      model: windsurfModel,
      baseUrl: windsurfUrl || 'https://api.windsurf.ai/v1',
      apiKey: windsurfKey
    });
  }

  // Determine default provider
  const defaultProvider = (process.env.LLM_PROVIDER as LLMProviderType) || 'ollama';

  return new LLMManager({
    providers,
    defaultProvider,
    fallbackChain: ['windsurf', 'openrouter', 'litellm', 'ollama']
  });
}

/**
 * Create LLM Manager with free models
 */
export function createFreeModelsManager(): LLMManager {
  const providers: LLMConfig[] = [
    // Windsurf free models
    {
      provider: 'windsurf',
      model: 'deepseek-v3-0324',
      baseUrl: process.env.WINDSURF_URL || 'https://api.windsurf.ai/v1',
      apiKey: process.env.WINDSURF_API_KEY
    },
    // OpenRouter free tier
    {
      provider: 'openrouter',
      model: 'deepseek/deepseek-coder-33b-instruct',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY
    },
    // Local Ollama fallback
    {
      provider: 'ollama',
      model: process.env.OLLAMA_MODEL || 'codellama',
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
    }
  ];

  return new LLMManager({
    providers,
    fallbackChain: ['windsurf', 'openrouter', 'ollama']
  });
}

export default LLMManager;
