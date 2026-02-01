"""
Reclapp LLM Module

Multi-provider LLM support with:
- Local: Ollama
- Remote: OpenRouter, OpenAI, Anthropic, Groq, Together, LiteLLM

Unified with reclapp-llm for consistent provider support.

Mirrors: src/core/contract-ai/llm/
@version 2.4.1 - Unified with reclapp-llm
"""

from .provider import LLMProvider, LLMResponse, GenerateOptions, LLMProviderStatus, LLMModelInfo
from .ollama import OllamaClient, OllamaConfig
from .openrouter import OpenRouterClient
from .windsurf import WindsurfClient, WindsurfConfig
from .manager import LLMManager, ProviderInfo

# Re-export reclapp_llm if available
try:
    import reclapp_llm as llm
    LLMConfig = getattr(llm, "LLMConfig", None)
    get_client = getattr(llm, "get_client", None)
    list_available_providers = getattr(llm, "list_available_providers", None)
    RECOMMENDED_MODELS = getattr(llm, "RECOMMENDED_MODELS", {})
    ProviderManager = getattr(llm, "ProviderManager", None)
    reclapp_llm_generate = getattr(llm, "generate", None)
    RECLAPP_LLM_AVAILABLE = True
except ImportError:
    RECLAPP_LLM_AVAILABLE = False
    LLMConfig = None
    get_client = None
    list_available_providers = None
    RECOMMENDED_MODELS = {}
    ProviderManager = None
    reclapp_llm_generate = None

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
    "WindsurfClient",
    "WindsurfConfig",
    # Manager
    "LLMManager",
    "ProviderInfo",
    # reclapp-llm re-exports
    "RECLAPP_LLM_AVAILABLE",
    "LLMConfig",
    "get_client",
    "list_available_providers",
    "RECOMMENDED_MODELS",
    "ProviderManager",
    "reclapp_llm_generate",
]
