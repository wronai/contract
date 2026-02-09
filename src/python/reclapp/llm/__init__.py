"""
Reclapp LLM Module

Re-exports from canonical package: reclapp-llm (reclapp_llm).

Multi-provider LLM support with:
- Local: Ollama
- Remote: OpenRouter, OpenAI, Anthropic, Groq, Together, LiteLLM

Mirrors: src/core/contract-ai/llm/
@version 2.4.1 - Unified with reclapp-llm
"""

from reclapp_llm import (
    LLMProvider,
    LLMResponse,
    GenerateOptions,
    LLMProviderStatus,
    LLMModelInfo,
    OllamaClient,
    OllamaConfig,
    OpenRouterClient,
    OpenRouterConfig,
    OpenAIClient,
    OpenAIConfig,
    AnthropicClient,
    AnthropicConfig,
    GroqClient,
    GroqConfig,
    TogetherClient,
    TogetherConfig,
    LiteLLMClient,
    LiteLLMConfig,
    LITELLM_AVAILABLE,
    WindsurfClient,
    WindsurfConfig,
    LLMManager,
    ProviderInfo,
)

__all__ = [
    # Core types
    "LLMProvider",
    "LLMResponse",
    "GenerateOptions",
    "LLMProviderStatus",
    "LLMModelInfo",
    # Clients
    "OllamaClient",
    "OllamaConfig",
    "OpenRouterClient",
    "OpenRouterConfig",
    "OpenAIClient",
    "OpenAIConfig",
    "AnthropicClient",
    "AnthropicConfig",
    "GroqClient",
    "GroqConfig",
    "TogetherClient",
    "TogetherConfig",
    "LiteLLMClient",
    "LiteLLMConfig",
    "LITELLM_AVAILABLE",
    "WindsurfClient",
    "WindsurfConfig",
    # Manager
    "LLMManager",
    "ProviderInfo",
]
