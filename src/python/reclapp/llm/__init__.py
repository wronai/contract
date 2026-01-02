"""
Reclapp LLM Module

Multi-provider LLM support with:
- Local: Ollama
- Remote: OpenRouter, LiteLLM

Mirrors: src/core/contract-ai/llm/
@version 3.0.0
"""

from .provider import LLMProvider, LLMResponse, GenerateOptions
from .ollama import OllamaClient, OllamaConfig
from .manager import LLMManager

__all__ = [
    "LLMProvider",
    "LLMResponse",
    "GenerateOptions",
    "OllamaClient",
    "OllamaConfig",
    "LLMManager",
]
