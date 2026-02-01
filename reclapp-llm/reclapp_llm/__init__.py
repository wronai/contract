"""
Reclapp LLM Module

Multi-provider LLM support with:
- Local: Ollama
- Remote: OpenRouter, OpenAI, Anthropic, Groq, Together, LiteLLM

Unified with pycontracts.llm for consistent provider support.

Mirrors: src/core/contract-ai/llm/
@version 3.1.0 - Unified with pycontracts.llm
"""

from .provider import LLMProvider, LLMResponse, GenerateOptions, LLMProviderStatus, LLMModelInfo
from .ollama import OllamaClient, OllamaConfig
from .openrouter import OpenRouterClient
from .windsurf import WindsurfClient, WindsurfConfig
from .manager import LLMManager, ProviderInfo

# Re-export pycontracts.llm if available
try:
    from pycontracts import llm
    LLMConfig = llm.LLMConfig
    get_client = llm.get_client
    list_available_providers = llm.list_available_providers
    RECOMMENDED_MODELS = llm.RECOMMENDED_MODELS
    ProviderManager = llm.ProviderManager
    pycontracts_generate = llm.generate
    PYCONTRACTS_AVAILABLE = True
except ImportError:
    PYCONTRACTS_AVAILABLE = False
    LLMConfig = None
    get_client = None
    list_available_providers = None
    RECOMMENDED_MODELS = {}
    ProviderManager = None
    pycontracts_generate = None

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
    # pycontracts.llm re-exports
    "PYCONTRACTS_AVAILABLE",
    "LLMConfig",
    "get_client",
    "list_available_providers",
    "RECOMMENDED_MODELS",
    "ProviderManager",
    "pycontracts_generate",
]
