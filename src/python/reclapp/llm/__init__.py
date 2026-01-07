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

# Re-export pycontracts.llm for unified access
try:
    import sys
    from pathlib import Path
    _pycontracts_path = Path(__file__).parent.parent.parent.parent.parent / "pycontracts"
    if str(_pycontracts_path) not in sys.path:
        sys.path.insert(0, str(_pycontracts_path))
    
    from llm import (
        LLMConfig,
        get_client,
        list_available_providers,
        RECOMMENDED_MODELS,
        ProviderManager,
        generate as pycontracts_generate,
    )
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
