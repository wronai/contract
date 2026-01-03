/**
 * LLM Provider - Multi-Provider LLM Support
 * 
 * Modular architecture supporting:
 * - Local: Ollama
 * - Remote: LiteLLM, OpenRouter, Windsurf Free Models
 * - Free Models: DeepSeek V3, DeepSeek R1, GPT-5.1-Codex, SWE-1.5
 * 
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type LLMProviderType = 'ollama' | 'litellm' | 'openrouter' | 'windsurf' | 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProviderType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs?: number;
}

export interface LLMProviderConfig {
  name: string;
  type: LLMProviderType;
  baseUrl: string;
  apiKey?: string;
  models: string[];
  free: boolean;
  maxContextTokens: number;
}

// ============================================================================
// FREE MODELS REGISTRY
// ============================================================================

export const FREE_MODELS: Record<string, LLMProviderConfig> = {
  // Windsurf Free Models (from screenshot)
  'deepseek-v3': {
    name: 'DeepSeek V3',
    type: 'windsurf',
    baseUrl: 'https://api.windsurf.ai/v1',
    models: ['deepseek-v3-0324'],
    free: true,
    maxContextTokens: 64000
  },
  'deepseek-r1': {
    name: 'DeepSeek R1',
    type: 'windsurf',
    baseUrl: 'https://api.windsurf.ai/v1',
    models: ['deepseek-r1-0528'],
    free: true,
    maxContextTokens: 64000
  },
  'gpt-5.1-codex': {
    name: 'GPT-5.1-Codex',
    type: 'windsurf',
    baseUrl: 'https://api.windsurf.ai/v1',
    models: ['gpt-5.1-codex', 'gpt-5.1-codex-mini-low'],
    free: true,
    maxContextTokens: 32000
  },
  'swe-1.5': {
    name: 'SWE-1.5',
    type: 'windsurf',
    baseUrl: 'https://api.windsurf.ai/v1',
    models: ['swe-1.5'],
    free: true,
    maxContextTokens: 128000
  },
  'grok-code-fast': {
    name: 'Grok Code Fast 1',
    type: 'windsurf',
    baseUrl: 'https://api.windsurf.ai/v1',
    models: ['grok-code-fast-1'],
    free: true,
    maxContextTokens: 32000
  },

  // OpenRouter Free Models
  'deepseek-coder': {
    name: 'DeepSeek Coder',
    type: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['deepseek/deepseek-coder-33b-instruct'],
    free: true,
    maxContextTokens: 16000
  },

  // Local Ollama
  'ollama-codellama': {
    name: 'CodeLlama (Local)',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    models: ['codellama', 'codellama:13b', 'codellama:34b'],
    free: true,
    maxContextTokens: 16000
  },
  'ollama-deepseek': {
    name: 'DeepSeek Coder (Local)',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    models: ['deepseek-coder', 'deepseek-coder:6.7b', 'deepseek-coder:33b'],
    free: true,
    maxContextTokens: 16000
  },
  'ollama-qwen': {
    name: 'Qwen Coder (Local)',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    models: ['qwen2.5-coder', 'qwen2.5-coder:7b', 'qwen2.5-coder:14b'],
    free: true,
    maxContextTokens: 32000
  }
};

// ============================================================================
// LLM PROVIDER INTERFACE
// ============================================================================

export interface ILLMProvider {
  name: string;
  type: LLMProviderType;
  isAvailable(): Promise<boolean>;
  chat(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse>;
  streamChat(messages: LLMMessage[], config?: Partial<LLMConfig>): AsyncGenerator<string>;
}

// ============================================================================
// BASE LLM PROVIDER
// ============================================================================

export abstract class BaseLLMProvider implements ILLMProvider {
  abstract name: string;
  abstract type: LLMProviderType;
  
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      timeout: 60000,
      ...config
    };
  }

  abstract isAvailable(): Promise<boolean>;
  abstract chat(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse>;
  
  async *streamChat(messages: LLMMessage[], config?: Partial<LLMConfig>): AsyncGenerator<string> {
    // Default implementation: return full response
    const response = await this.chat(messages, config);
    yield response.content;
  }

  protected async fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// ============================================================================
// OLLAMA PROVIDER
// ============================================================================

export class OllamaProvider extends BaseLLMProvider {
  name = 'Ollama';
  type: LLMProviderType = 'ollama';

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/api/tags`,
        { method: 'GET' },
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();

    const response = await this.fetchWithTimeout(
      `${mergedConfig.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: mergedConfig.model,
          messages,
          stream: false,
          options: {
            temperature: mergedConfig.temperature,
            num_predict: mergedConfig.maxTokens
          }
        })
      },
      mergedConfig.timeout || 60000
    );

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json() as { message?: { content?: string } };
    
    return {
      content: data.message?.content || '',
      model: mergedConfig.model,
      provider: 'ollama',
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// LITELLM PROVIDER (OpenAI-compatible)
// ============================================================================

export class LiteLLMProvider extends BaseLLMProvider {
  name = 'LiteLLM';
  type: LLMProviderType = 'litellm';

  async isAvailable(): Promise<boolean> {
    try {
      // Try /v1/models endpoint (LM Studio compatible)
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/v1/models`,
        { method: 'GET' },
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (mergedConfig.apiKey) {
      headers['Authorization'] = `Bearer ${mergedConfig.apiKey}`;
    }

    // LM Studio uses /v1/chat/completions endpoint
    const chatEndpoint = `${mergedConfig.baseUrl}/v1/chat/completions`;

    const response = await this.fetchWithTimeout(
      chatEndpoint,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: mergedConfig.model,
          messages,
          temperature: mergedConfig.temperature,
          max_tokens: mergedConfig.maxTokens
        })
      },
      mergedConfig.timeout || 60000
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`LiteLLM error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: mergedConfig.model,
      provider: 'litellm',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      latencyMs: Date.now() - startTime
    };
  }
}

// OpenAI-compatible response type
interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ============================================================================
// OPENROUTER PROVIDER
// ============================================================================

export class OpenRouterProvider extends BaseLLMProvider {
  name = 'OpenRouter';
  type: LLMProviderType = 'openrouter';

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  async chat(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();

    const response = await this.fetchWithTimeout(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mergedConfig.apiKey}`,
          'HTTP-Referer': 'https://reclapp.dev',
          'X-Title': 'Reclapp Contract Generator'
        },
        body: JSON.stringify({
          model: mergedConfig.model,
          messages,
          temperature: mergedConfig.temperature,
          max_tokens: mergedConfig.maxTokens
        })
      },
      mergedConfig.timeout || 120000
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: mergedConfig.model,
      provider: 'openrouter',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// WINDSURF FREE MODELS PROVIDER
// ============================================================================

export class WindsurfProvider extends BaseLLMProvider {
  name = 'Windsurf';
  type: LLMProviderType = 'windsurf';

  async isAvailable(): Promise<boolean> {
    // Windsurf models are accessed via MCP or API
    return true;
  }

  async chat(messages: LLMMessage[], config?: Partial<LLMConfig>): Promise<LLMResponse> {
    const mergedConfig = { ...this.config, ...config };
    const startTime = Date.now();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (mergedConfig.apiKey) {
      headers['Authorization'] = `Bearer ${mergedConfig.apiKey}`;
    }

    const response = await this.fetchWithTimeout(
      `${mergedConfig.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: mergedConfig.model,
          messages,
          temperature: mergedConfig.temperature,
          max_tokens: mergedConfig.maxTokens
        })
      },
      mergedConfig.timeout || 120000
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Windsurf error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      model: mergedConfig.model,
      provider: 'windsurf',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

export function createProvider(config: LLMConfig): ILLMProvider {
  switch (config.provider) {
    case 'ollama':
      return new OllamaProvider(config);
    case 'litellm':
      return new LiteLLMProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'windsurf':
      return new WindsurfProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export default {
  FREE_MODELS,
  createProvider,
  OllamaProvider,
  LiteLLMProvider,
  OpenRouterProvider,
  WindsurfProvider
};
