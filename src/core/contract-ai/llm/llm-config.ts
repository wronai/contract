/**
 * LLM Configuration
 * 
 * Configuration for multi-provider LLM support.
 * Reads from environment variables with sensible defaults.
 * 
 * @version 2.4.1
 */

import { LLMConfig, LLMProviderType } from './llm-provider';

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export interface LLMEnvConfig {
  // Default provider
  LLM_PROVIDER: LLMProviderType;
  
  // Ollama (local)
  OLLAMA_URL: string;
  OLLAMA_MODEL: string;
  
  // LiteLLM
  LITELLM_URL?: string;
  LITELLM_MODEL?: string;
  LITELLM_API_KEY?: string;
  
  // OpenRouter
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  
  // Windsurf Free Models
  WINDSURF_URL?: string;
  WINDSURF_MODEL?: string;
  WINDSURF_API_KEY?: string;
  
  // OpenAI
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  
  // Anthropic
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  
  // Generation settings
  LLM_TEMPERATURE?: number;
  LLM_MAX_TOKENS?: number;
  LLM_TIMEOUT_MS?: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CONFIG: LLMEnvConfig = {
  LLM_PROVIDER: 'ollama',
  OLLAMA_URL: 'http://localhost:11434',
  OLLAMA_MODEL: 'codellama',
  LITELLM_MODEL: 'gpt-4',
  OPENROUTER_MODEL: 'deepseek/deepseek-coder-33b-instruct',
  WINDSURF_URL: 'https://api.windsurf.ai/v1',
  WINDSURF_MODEL: 'deepseek-v3-0324',
  OPENAI_MODEL: 'gpt-4-turbo-preview',
  ANTHROPIC_MODEL: 'claude-3-sonnet-20240229',
  LLM_TEMPERATURE: 0.7,
  LLM_MAX_TOKENS: 4096,
  LLM_TIMEOUT_MS: 60000
};

// ============================================================================
// RECOMMENDED FREE MODELS
// ============================================================================

export const RECOMMENDED_FREE_MODELS = {
  // Best for code generation (large context)
  codeGeneration: {
    provider: 'windsurf' as LLMProviderType,
    model: 'deepseek-v3-0324',
    description: 'DeepSeek V3 - Best for code generation, 64K context'
  },
  
  // Best for reasoning/planning
  reasoning: {
    provider: 'windsurf' as LLMProviderType,
    model: 'deepseek-r1-0528',
    description: 'DeepSeek R1 - Best for complex reasoning, 64K context'
  },
  
  // Best for quick tasks
  quick: {
    provider: 'windsurf' as LLMProviderType,
    model: 'gpt-5.1-codex-mini-low',
    description: 'GPT-5.1 Codex Mini - Fast, good for simple tasks'
  },
  
  // Best for software engineering tasks
  swe: {
    provider: 'windsurf' as LLMProviderType,
    model: 'swe-1.5',
    description: 'SWE-1.5 - Specialized for software engineering, 128K context'
  },
  
  // Local fallback
  local: {
    provider: 'ollama' as LLMProviderType,
    model: 'codellama',
    description: 'CodeLlama - Local model, no API needed'
  }
};

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

export function loadConfigFromEnv(): LLMEnvConfig {
  return {
    LLM_PROVIDER: (process.env.LLM_PROVIDER as LLMProviderType) || DEFAULT_CONFIG.LLM_PROVIDER,
    
    OLLAMA_URL: process.env.OLLAMA_URL || DEFAULT_CONFIG.OLLAMA_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL || DEFAULT_CONFIG.OLLAMA_MODEL,
    
    LITELLM_URL: process.env.LITELLM_URL,
    LITELLM_MODEL: process.env.LITELLM_MODEL || DEFAULT_CONFIG.LITELLM_MODEL,
    LITELLM_API_KEY: process.env.LITELLM_API_KEY,
    
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || DEFAULT_CONFIG.OPENROUTER_MODEL,
    
    WINDSURF_URL: process.env.WINDSURF_URL || DEFAULT_CONFIG.WINDSURF_URL,
    WINDSURF_MODEL: process.env.WINDSURF_MODEL || DEFAULT_CONFIG.WINDSURF_MODEL,
    WINDSURF_API_KEY: process.env.WINDSURF_API_KEY,
    
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || DEFAULT_CONFIG.OPENAI_MODEL,
    
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || DEFAULT_CONFIG.ANTHROPIC_MODEL,
    
    LLM_TEMPERATURE: parseFloat(process.env.LLM_TEMPERATURE || '') || DEFAULT_CONFIG.LLM_TEMPERATURE,
    LLM_MAX_TOKENS: parseInt(process.env.LLM_MAX_TOKENS || '') || DEFAULT_CONFIG.LLM_MAX_TOKENS,
    LLM_TIMEOUT_MS: parseInt(process.env.LLM_TIMEOUT_MS || '') || DEFAULT_CONFIG.LLM_TIMEOUT_MS
  };
}

/**
 * Build provider configs from environment
 */
export function buildProviderConfigs(envConfig: LLMEnvConfig): LLMConfig[] {
  const configs: LLMConfig[] = [];
  
  // Ollama (always available as fallback)
  configs.push({
    provider: 'ollama',
    model: envConfig.OLLAMA_MODEL,
    baseUrl: envConfig.OLLAMA_URL,
    temperature: envConfig.LLM_TEMPERATURE,
    maxTokens: envConfig.LLM_MAX_TOKENS,
    timeout: envConfig.LLM_TIMEOUT_MS
  });
  
  // Windsurf (free models)
  if (envConfig.WINDSURF_URL || envConfig.WINDSURF_API_KEY) {
    configs.push({
      provider: 'windsurf',
      model: envConfig.WINDSURF_MODEL!,
      baseUrl: envConfig.WINDSURF_URL,
      apiKey: envConfig.WINDSURF_API_KEY,
      temperature: envConfig.LLM_TEMPERATURE,
      maxTokens: envConfig.LLM_MAX_TOKENS,
      timeout: envConfig.LLM_TIMEOUT_MS
    });
  }
  
  // LiteLLM
  if (envConfig.LITELLM_URL) {
    configs.push({
      provider: 'litellm',
      model: envConfig.LITELLM_MODEL!,
      baseUrl: envConfig.LITELLM_URL,
      apiKey: envConfig.LITELLM_API_KEY,
      temperature: envConfig.LLM_TEMPERATURE,
      maxTokens: envConfig.LLM_MAX_TOKENS,
      timeout: envConfig.LLM_TIMEOUT_MS
    });
  }
  
  // OpenRouter
  if (envConfig.OPENROUTER_API_KEY) {
    configs.push({
      provider: 'openrouter',
      model: envConfig.OPENROUTER_MODEL!,
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: envConfig.OPENROUTER_API_KEY,
      temperature: envConfig.LLM_TEMPERATURE,
      maxTokens: envConfig.LLM_MAX_TOKENS,
      timeout: envConfig.LLM_TIMEOUT_MS
    });
  }
  
  return configs;
}

/**
 * Generate .env template
 */
export function generateEnvTemplate(): string {
  return `# ============================================================================
# RECLAPP LLM CONFIGURATION
# ============================================================================

# Default LLM Provider
# Options: ollama, litellm, openrouter, windsurf
LLM_PROVIDER=ollama

# ============================================================================
# OLLAMA (Local)
# ============================================================================
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=codellama

# ============================================================================
# LITELLM (OpenAI-compatible proxy)
# ============================================================================
# LITELLM_URL=http://localhost:4000
# LITELLM_MODEL=gpt-4
# LITELLM_API_KEY=

# ============================================================================
# OPENROUTER (Multi-model API)
# Free tier available at https://openrouter.ai
# ============================================================================
# OPENROUTER_API_KEY=
# OPENROUTER_MODEL=deepseek/deepseek-coder-33b-instruct

# ============================================================================
# WINDSURF FREE MODELS
# Access via Windsurf IDE or API
# Models: deepseek-v3-0324, deepseek-r1-0528, gpt-5.1-codex, swe-1.5
# ============================================================================
# WINDSURF_URL=https://api.windsurf.ai/v1
# WINDSURF_MODEL=deepseek-v3-0324
# WINDSURF_API_KEY=

# ============================================================================
# OPENAI
# ============================================================================
# OPENAI_API_KEY=
# OPENAI_MODEL=gpt-4-turbo-preview

# ============================================================================
# ANTHROPIC
# ============================================================================
# ANTHROPIC_API_KEY=
# ANTHROPIC_MODEL=claude-3-sonnet-20240229

# ============================================================================
# GENERATION SETTINGS
# ============================================================================
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4096
LLM_TIMEOUT_MS=60000

# ============================================================================
# RECOMMENDED FREE MODELS (Windsurf)
# ============================================================================
# deepseek-v3-0324     - Best for code generation (64K context)
# deepseek-r1-0528     - Best for reasoning/planning (64K context)
# gpt-5.1-codex        - Good general purpose
# gpt-5.1-codex-mini-low - Fast, simple tasks
# swe-1.5              - Software engineering specialized (128K context)
# grok-code-fast-1     - Fast code completion
`;
}

export default {
  DEFAULT_CONFIG,
  RECOMMENDED_FREE_MODELS,
  loadConfigFromEnv,
  buildProviderConfigs,
  generateEnvTemplate
};
