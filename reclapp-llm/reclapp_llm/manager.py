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
from .openrouter import OpenRouterClient, OpenRouterConfig
from .openai import OpenAIClient, OpenAIConfig
from .anthropic import AnthropicClient, AnthropicConfig
from .groq import GroqClient, GroqConfig
from .together import TogetherClient, TogetherConfig
from .litellm import LITELLM_AVAILABLE, LiteLLMClient, LiteLLMConfig
from .windsurf import WindsurfClient, WindsurfConfig


class ProviderInfo:
    """Information about a configured provider"""
    def __init__(self, name: str, status: LLMProviderStatus, provider: Optional[LLMProvider] = None):
        self.name = name
        self.status = status
        self.provider = provider
        self.models: list[LLMModelInfo] = []
        self.error: Optional[str] = None
        self.priority: int = 100


class LLMManager:
    """
    LLM Manager with multi-provider support.
    
    Manages multiple LLM providers and provides fallback logic.
    """
    
    DEFAULT_MODELS = {
        "openrouter": "qwen/qwen-2.5-coder-32b-instruct",
        "openai": "gpt-4-turbo",
        "anthropic": "claude-3-sonnet-20240229",
        "groq": "llama-3.1-70b-versatile",
        "together": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "ollama": "qwen2.5-coder:14b",
        "litellm": "gpt-4",
    }

    DEFAULT_PRIORITIES = {
        "ollama": 10,      # Local first
        "groq": 20,        # Fast cloud
        "together": 30,    # Good for code
        "openrouter": 40,  # Multi-model
        "openai": 50,      # Reliable
        "anthropic": 60,   # High quality
        "litellm": 70,     # Proxy fallback
        "windsurf": 5,     # IDE internal (highest priority if available)
    }

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
        
        # Initialize all known providers
        await self._init_windsurf()
        await self._init_ollama()
        await self._init_groq()
        await self._init_together()
        await self._init_openrouter()
        await self._init_openai()
        await self._init_anthropic()
        await self._init_litellm()

        # Determine primary provider based on priority and availability
        preferred = os.getenv("LLM_PROVIDER", "auto").strip().lower() or "auto"

        if preferred not in ("", "auto"):
            info = self._provider_info.get(preferred)
            if info is not None and info.status == LLMProviderStatus.AVAILABLE:
                self._primary_provider = preferred

        if not self._primary_provider:
            # Sort available providers by priority
            available = [
                name for name, info in self._provider_info.items() 
                if info.status == LLMProviderStatus.AVAILABLE
            ]
            if available:
                available.sort(key=lambda x: self.DEFAULT_PRIORITIES.get(x, 100))
                self._primary_provider = available[0]
        
        self._initialized = True

    def _load_env_file(self) -> None:
        candidates = [
            Path.cwd() / ".env",
            Path(__file__).resolve().parents[2] / ".env",  # reclapp-llm root
            Path(__file__).resolve().parents[4] / ".env",  # project root
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
        model = os.getenv("OLLAMA_MODEL", self.DEFAULT_MODELS["ollama"])
        host = os.getenv("OLLAMA_HOST", os.getenv("OLLAMA_URL", "http://localhost:11434"))
        
        ollama = OllamaClient(OllamaConfig(host=host, model=model))
        info = ProviderInfo("ollama", LLMProviderStatus.UNAVAILABLE)
        info.priority = self.DEFAULT_PRIORITIES["ollama"]
        
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
        model = os.getenv("OPENROUTER_MODEL", self.DEFAULT_MODELS["openrouter"])
        base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

        info = ProviderInfo("openrouter", LLMProviderStatus.NOT_CONFIGURED)
        info.priority = self.DEFAULT_PRIORITIES["openrouter"]

        if not api_key:
            info.error = "Set OPENROUTER_API_KEY"
            self._provider_info["openrouter"] = info
            return

        try:
            client = OpenRouterClient(OpenRouterConfig(api_key=api_key, model=model, base_url=base_url))
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

    async def _init_openai(self) -> None:
        """Initialize OpenAI provider"""
        api_key = os.getenv("OPENAI_API_KEY")
        model = os.getenv("OPENAI_MODEL", self.DEFAULT_MODELS["openai"])
        
        info = ProviderInfo("openai", LLMProviderStatus.NOT_CONFIGURED)
        info.priority = self.DEFAULT_PRIORITIES["openai"]
        
        if not api_key:
            info.error = "Set OPENAI_API_KEY"
            self._provider_info["openai"] = info
            return

        try:
            client = OpenAIClient(OpenAIConfig(api_key=api_key, model=model))
            if await client.is_available():
                info.status = LLMProviderStatus.AVAILABLE
                info.provider = client
                self._providers["openai"] = client
            else:
                info.status = LLMProviderStatus.UNAVAILABLE
        except Exception as e:
            info.status = LLMProviderStatus.ERROR
            info.error = str(e)
        self._provider_info["openai"] = info

    async def _init_anthropic(self) -> None:
        """Initialize Anthropic provider"""
        api_key = os.getenv("ANTHROPIC_API_KEY")
        model = os.getenv("ANTHROPIC_MODEL", self.DEFAULT_MODELS["anthropic"])
        
        info = ProviderInfo("anthropic", LLMProviderStatus.NOT_CONFIGURED)
        info.priority = self.DEFAULT_PRIORITIES["anthropic"]
        
        if not api_key:
            info.error = "Set ANTHROPIC_API_KEY"
            self._provider_info["anthropic"] = info
            return

        try:
            client = AnthropicClient(AnthropicConfig(api_key=api_key, model=model))
            if await client.is_available():
                info.status = LLMProviderStatus.AVAILABLE
                info.provider = client
                self._providers["anthropic"] = client
            else:
                info.status = LLMProviderStatus.UNAVAILABLE
        except Exception as e:
            info.status = LLMProviderStatus.ERROR
            info.error = str(e)
        self._provider_info["anthropic"] = info

    async def _init_groq(self) -> None:
        """Initialize Groq provider"""
        api_key = os.getenv("GROQ_API_KEY")
        model = os.getenv("GROQ_MODEL", self.DEFAULT_MODELS["groq"])
        
        info = ProviderInfo("groq", LLMProviderStatus.NOT_CONFIGURED)
        info.priority = self.DEFAULT_PRIORITIES["groq"]
        
        if not api_key:
            info.error = "Set GROQ_API_KEY"
            self._provider_info["groq"] = info
            return

        try:
            client = GroqClient(GroqConfig(api_key=api_key, model=model))
            if await client.is_available():
                info.status = LLMProviderStatus.AVAILABLE
                info.provider = client
                self._providers["groq"] = client
            else:
                info.status = LLMProviderStatus.UNAVAILABLE
        except Exception as e:
            info.status = LLMProviderStatus.ERROR
            info.error = str(e)
        self._provider_info["groq"] = info

    async def _init_together(self) -> None:
        """Initialize Together AI provider"""
        api_key = os.getenv("TOGETHER_API_KEY")
        model = os.getenv("TOGETHER_MODEL", self.DEFAULT_MODELS["together"])
        
        info = ProviderInfo("together", LLMProviderStatus.NOT_CONFIGURED)
        info.priority = self.DEFAULT_PRIORITIES["together"]
        
        if not api_key:
            info.error = "Set TOGETHER_API_KEY"
            self._provider_info["together"] = info
            return

        try:
            client = TogetherClient(TogetherConfig(api_key=api_key, model=model))
            if await client.is_available():
                info.status = LLMProviderStatus.AVAILABLE
                info.provider = client
                self._providers["together"] = client
            else:
                info.status = LLMProviderStatus.UNAVAILABLE
        except Exception as e:
            info.status = LLMProviderStatus.ERROR
            info.error = str(e)
        self._provider_info["together"] = info

    async def _init_litellm(self) -> None:
        """Initialize LiteLLM provider"""
        if not LITELLM_AVAILABLE:
            self._provider_info["litellm"] = ProviderInfo("litellm", LLMProviderStatus.UNAVAILABLE)
            return

        model = os.getenv("LITELLM_MODEL", self.DEFAULT_MODELS["litellm"])
        api_base = os.getenv("LITELLM_URL")
        
        info = ProviderInfo("litellm", LLMProviderStatus.AVAILABLE)
        info.priority = self.DEFAULT_PRIORITIES["litellm"]
        client = LiteLLMClient(LiteLLMConfig(model=model, api_base=api_base))
        info.provider = client
        self._providers["litellm"] = client
        self._provider_info["litellm"] = info
    
    async def _init_windsurf(self) -> None:
        """Initialize Windsurf provider"""
        client = WindsurfClient()
        info = ProviderInfo("windsurf", LLMProviderStatus.UNAVAILABLE)
        info.priority = self.DEFAULT_PRIORITIES["windsurf"]
        
        try:
            if await client.is_available():
                models = await client.list_models()
                info.status = LLMProviderStatus.AVAILABLE
                info.provider = client
                info.models = models
                self._providers["windsurf"] = client
            else:
                info.error = "Windsurf server not running"
        except Exception as e:
            info.status = LLMProviderStatus.ERROR
            info.error = str(e)
        
        self._provider_info["windsurf"] = info

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
