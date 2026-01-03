"""
LLM Module - Multi-Provider Support with Priority and Rate Limiting

Supports:
- OpenRouter, OpenAI, Anthropic, Groq, Together AI, Ollama, LiteLLM
- Priority-based provider selection
- Rate limiting per provider
- Automatic failover
- Configuration via .env and litellm_config.yaml

Usage:
    from pycontracts.llm import get_client, ProviderManager, generate
    
    # Simple usage
    client = get_client('openrouter')
    response = client.generate("Explain this code")
    
    # With provider manager (automatic fallback)
    manager = ProviderManager()
    response = manager.generate("Explain this code")
    
    # Convenience function
    response = generate("Explain this code", provider='openrouter')

@version 2.3.0
"""

from .outputs import (
    GeneratedFile,
    LLMCodeOutput,
    ValidationResult,
    FeedbackItem,
    StageResult,
    PipelineResult,
)

from .config import (
    LLMConfig,
    ProviderConfig,
    LiteLLMModelConfig,
    load_env,
    get_config,
)

from .clients import (
    BaseLLMClient,
    OpenRouterClient,
    OpenAIClient,
    AnthropicClient,
    GroqClient,
    TogetherClient,
    OllamaClient,
    LiteLLMClient,
    GenerationResult,
    get_client,
    list_available_providers,
    RECOMMENDED_MODELS,
    PROVIDER_CLIENTS,
)

from .providers import (
    ProviderManager,
    LoadBalanceStrategy,
    RateLimitState,
    ProviderStats,
    get_manager,
    generate,
    chat,
)

__all__ = [
    # Output contracts
    "GeneratedFile",
    "LLMCodeOutput",
    "ValidationResult",
    "FeedbackItem",
    "StageResult",
    "PipelineResult",
    # Configuration
    "LLMConfig",
    "ProviderConfig",
    "LiteLLMModelConfig",
    "load_env",
    "get_config",
    # Clients
    "BaseLLMClient",
    "OpenRouterClient",
    "OpenAIClient",
    "AnthropicClient",
    "GroqClient",
    "TogetherClient",
    "OllamaClient",
    "LiteLLMClient",
    "GenerationResult",
    "get_client",
    "list_available_providers",
    "RECOMMENDED_MODELS",
    "PROVIDER_CLIENTS",
    # Provider Manager
    "ProviderManager",
    "LoadBalanceStrategy",
    "RateLimitState",
    "ProviderStats",
    "get_manager",
    "generate",
    "chat",
]
