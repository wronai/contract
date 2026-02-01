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
from .openrouter import OpenRouterClient, OpenRouterConfig
from .openai import OpenAIClient, OpenAIConfig
from .anthropic import AnthropicClient, AnthropicConfig
from .groq import GroqClient, GroqConfig
from .together import TogetherClient, TogetherConfig
from .litellm import LiteLLMClient, LiteLLMConfig, LITELLM_AVAILABLE
from .windsurf import WindsurfClient, WindsurfConfig
from .manager import LLMManager, ProviderInfo

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
