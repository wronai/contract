"""
LLM Manager

Multi-provider LLM management with fallback support.

Mirrors: src/core/contract-ai/llm/llm-manager.ts
"""

import os
from pathlib import Path
from typing import Optional

from .provider import LLMProvider, LLMResponse, GenerateOptions, LLMProviderStatus, LLMModelInfo
from .ollama import OllamaClient, OllamaConfig
from .openrouter import OpenRouterClient


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

        self._load_env_file()
        
        # Initialize Ollama
        await self._init_ollama()
        
        # Initialize OpenRouter if configured
        await self._init_openrouter()

        preferred = os.getenv("LLM_PROVIDER", "auto").strip().lower() or "auto"

        if preferred not in ("", "auto"):
            info = self._provider_info.get(preferred)
            if info is not None and info.status == LLMProviderStatus.AVAILABLE:
                self._primary_provider = preferred

        if not self._primary_provider:
            if preferred == "auto":
                info = self._provider_info.get("openrouter")
                if info is not None and info.status == LLMProviderStatus.AVAILABLE:
                    self._primary_provider = "openrouter"

        if not self._primary_provider:
            for name, info in self._provider_info.items():
                if info.status == LLMProviderStatus.AVAILABLE:
                    self._primary_provider = name
                    break
        
        self._initialized = True

    def _load_env_file(self) -> None:
        candidates = [
            Path.cwd() / ".env",
            Path(__file__).resolve().parents[4] / ".env",
            Path.home() / ".reclapp" / ".env",
        ]

        for path in candidates:
            try:
                if not path.exists():
                    continue

                for line in path.read_text().splitlines():
                    line = line.strip()
                    if not line or line.startswith("#") or "=" not in line:
                        continue

                    key, value = line.split("=", 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    if key and value and not os.environ.get(key):
                        os.environ[key] = value

                return
            except Exception:
                continue
    
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

        info = ProviderInfo("openrouter", LLMProviderStatus.NOT_CONFIGURED)

        if not api_key:
            info.error = "Set OPENROUTER_API_KEY"
            self._provider_info["openrouter"] = info
            return

        try:
            client = OpenRouterClient()
            if await client.is_available():
                info.status = LLMProviderStatus.AVAILABLE
                info.provider = client
                self._providers["openrouter"] = client
            else:
                info.status = LLMProviderStatus.UNAVAILABLE
                info.error = "OpenRouter API key not configured"
        except Exception as e:
            info.status = LLMProviderStatus.ERROR
            info.error = str(e)

        self._provider_info["openrouter"] = info
    
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
