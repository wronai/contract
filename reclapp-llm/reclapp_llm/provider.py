"""
LLM Provider Base Class

Abstract base for all LLM providers (Ollama, OpenRouter, etc.)

Mirrors: src/core/contract-ai/llm/llm-provider.ts
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class LLMProviderStatus(str, Enum):
    """Provider status"""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"
    ERROR = "error"


class GenerateOptions(BaseModel):
    """Options for LLM generation"""
    system: str
    user: str
    temperature: float = 0.7
    max_tokens: int = 4096
    response_format: Literal["json", "text"] = "text"
    stop: Optional[list[str]] = None


class LLMResponse(BaseModel):
    """Response from LLM generation"""
    content: str
    model: str
    provider: str
    tokens_used: int = 0
    duration_ms: int = 0
    raw: Optional[dict[str, Any]] = None


class LLMModelInfo(BaseModel):
    """Information about an available model"""
    name: str
    size: Optional[str] = None
    modified: Optional[str] = None
    is_code_model: bool = False


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    
    Implementations must provide:
    - is_available(): Check if provider is accessible
    - list_models(): List available models
    - generate(): Generate completion
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name"""
        pass
    
    @property
    @abstractmethod
    def model(self) -> str:
        """Current model name"""
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider is available"""
        pass
    
    @abstractmethod
    async def list_models(self) -> list[LLMModelInfo]:
        """List available models"""
        pass
    
    @abstractmethod
    async def generate(self, options: GenerateOptions) -> LLMResponse:
        """Generate completion"""
        pass
    
    async def has_model(self, model_name: str) -> bool:
        """Check if specific model is available"""
        models = await self.list_models()
        model_base = model_name.split(":")[0]
        return any(
            m.name == model_name or m.name.startswith(f"{model_base}:")
            for m in models
        )
    
    def get_code_models(self, models: list[LLMModelInfo]) -> list[LLMModelInfo]:
        """Filter models suitable for code generation"""
        code_keywords = ["code", "coder", "codellama", "deepseek", "qwen", "starcoder"]
        return [
            m for m in models
            if any(kw in m.name.lower() for kw in code_keywords)
        ]
