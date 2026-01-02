"""
LLM Manager

Multi-provider LLM management with fallback support.

Mirrors: src/core/contract-ai/llm/llm-manager.ts
"""

import os
from typing import Optional

from .provider import LLMProvider, LLMResponse, GenerateOptions, LLMProviderStatus, LLMModelInfo
from .ollama import OllamaClient, OllamaConfig


class ProviderInfo:
    """Information about a configured provider"""
    def __init__(self, name: str, status: LLMProviderStatus, provider: Optional[LLMProvider] = None):
        self.name = name
        self.status = status
        self.provider = provider
        self.models: list[LLMModelInfo] = []
        self.error: Optional[str] = None


class LLMManager:
    """
    LLM Manager with multi-provider support.
    
    Manages multiple LLM providers and provides fallback logic.
    
    Example:
        manager = LLMManager()
        await manager.initialize()
        
        if manager.is_available:
            response = await manager.generate(GenerateOptions(
                system="You are a code generator",
                user="Create a function to add two numbers"
            ))
            print(response.content)
    """
    
    def __init__(self, verbose: bool = False):
        self._providers: dict[str, LLMProvider] = {}
        self._provider_info: dict[str, ProviderInfo] = {}
        self._primary_provider: Optional[str] = None
        self._initialized = False
        self._verbose = verbose
    
    @property
    def is_available(self) -> bool:
        """Check if any provider is available"""
        return any(
            info.status == LLMProviderStatus.AVAILABLE 
            for info in self._provider_info.values()
        )
    
    def is_ready(self) -> bool:
        """Check if manager is initialized and has available provider"""
        return self._initialized and self.is_available
    
    def get_provider(self) -> Optional[LLMProvider]:
        """Get the primary available provider"""
        return self.primary_provider
    
    @property
    def primary_provider(self) -> Optional[LLMProvider]:
        """Get the primary (first available) provider"""
        if self._primary_provider and self._primary_provider in self._providers:
            return self._providers[self._primary_provider]
        return None
    
    @property
    def providers(self) -> dict[str, ProviderInfo]:
        """Get all provider info"""
        return self._provider_info
    
    async def initialize(self) -> None:
        """Initialize all configured providers"""
        if self._initialized:
            return
        
        # Initialize Ollama
        await self._init_ollama()
        
        # Initialize OpenRouter if configured
        await self._init_openrouter()
        
        # Set primary provider (first available)
        for name, info in self._provider_info.items():
            if info.status == LLMProviderStatus.AVAILABLE:
                self._primary_provider = name
                break
        
        self._initialized = True
    
    async def _init_ollama(self) -> None:
        """Initialize Ollama provider"""
        ollama = OllamaClient()
        info = ProviderInfo("ollama", LLMProviderStatus.UNAVAILABLE)
        
        try:
            if await ollama.is_available():
                models = await ollama.list_models()
                info.status = LLMProviderStatus.AVAILABLE
                info.provider = ollama
                info.models = models
                self._providers["ollama"] = ollama
            else:
                info.error = "Ollama not running"
        except Exception as e:
            info.status = LLMProviderStatus.ERROR
            info.error = str(e)
        
        self._provider_info["ollama"] = info
    
    async def _init_openrouter(self) -> None:
        """Initialize OpenRouter provider if API key is set"""
        api_key = os.getenv("OPENROUTER_API_KEY")
        
        if not api_key:
            self._provider_info["openrouter"] = ProviderInfo(
                "openrouter", 
                LLMProviderStatus.NOT_CONFIGURED
            )
            self._provider_info["openrouter"].error = "Set OPENROUTER_API_KEY"
            return
        
        # OpenRouter implementation would go here
        # For now, mark as not configured
        self._provider_info["openrouter"] = ProviderInfo(
            "openrouter",
            LLMProviderStatus.NOT_CONFIGURED
        )
    
    def add_provider(self, name: str, provider: LLMProvider) -> None:
        """Add a custom provider"""
        self._providers[name] = provider
        self._provider_info[name] = ProviderInfo(
            name, 
            LLMProviderStatus.AVAILABLE,
            provider
        )
    
    async def generate(
        self, 
        options: GenerateOptions,
        provider_name: Optional[str] = None
    ) -> LLMResponse:
        """
        Generate completion using available provider.
        
        Args:
            options: Generation options
            provider_name: Specific provider to use (optional)
            
        Returns:
            LLM response
            
        Raises:
            RuntimeError: If no provider is available
        """
        if not self._initialized:
            await self.initialize()
        
        # Use specific provider if requested
        if provider_name:
            if provider_name not in self._providers:
                raise RuntimeError(f"Provider '{provider_name}' not available")
            return await self._providers[provider_name].generate(options)
        
        # Use primary provider
        if self.primary_provider:
            return await self.primary_provider.generate(options)
        
        raise RuntimeError("No LLM provider available. Run: reclapp setup")
    
    async def generate_with_fallback(
        self, 
        options: GenerateOptions,
        providers: Optional[list[str]] = None
    ) -> LLMResponse:
        """
        Generate with fallback to other providers on failure.
        
        Args:
            options: Generation options
            providers: List of providers to try (in order)
            
        Returns:
            LLM response from first successful provider
        """
        if not self._initialized:
            await self.initialize()
        
        provider_list = providers or list(self._providers.keys())
        last_error: Optional[Exception] = None
        
        for name in provider_list:
            if name not in self._providers:
                continue
            
            try:
                return await self._providers[name].generate(options)
            except Exception as e:
                last_error = e
                continue
        
        raise RuntimeError(f"All providers failed. Last error: {last_error}")
    
    def get_status(self) -> dict:
        """Get status of all providers"""
        return {
            name: {
                "status": info.status.value,
                "models": len(info.models),
                "code_models": len([m for m in info.models if m.is_code_model]),
                "error": info.error,
            }
            for name, info in self._provider_info.items()
        }
    
    async def close(self) -> None:
        """Close all provider connections"""
        for provider in self._providers.values():
            if hasattr(provider, 'close'):
                await provider.close()
    
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, *args):
        await self.close()
