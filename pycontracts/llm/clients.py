"""
LLM Client implementations for various providers.

Supports:
- OpenRouter (cloud, multiple models)
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Groq (fast inference)
- Together AI (open models)
- Ollama (local)
- LiteLLM (universal interface)

Usage:
    from pycontracts.llm.clients import get_client, OpenRouterClient
    
    client = get_client('openrouter')
    response = client.generate("Explain this code")

@version 2.3.0
"""

import os
import time
from typing import Optional, List, Dict, Any
from abc import ABC, abstractmethod
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

try:
    import litellm
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False


# Recommended models by provider
RECOMMENDED_MODELS = {
    'openrouter': [
        ("qwen/qwen-2.5-coder-32b-instruct", "Best for code, 32B"),
        ("deepseek/deepseek-coder-33b-instruct", "DeepSeek Coder 33B"),
        ("meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B (free)"),
        ("nvidia/nemotron-3-nano-30b-a3b:free", "Nemotron 30B (free)"),
        ("nvidia/nemotron-nano-9b-v2:free", "Nemotron Nano 9B (free)"),
    ],
    'openai': [
        ("gpt-4-turbo", "GPT-4 Turbo - best quality"),
        ("gpt-4o", "GPT-4o - balanced"),
        ("gpt-3.5-turbo", "GPT-3.5 - fast and cheap"),
    ],
    'anthropic': [
        ("claude-3-opus-20240229", "Claude 3 Opus - highest quality"),
        ("claude-3-sonnet-20240229", "Claude 3 Sonnet - balanced"),
        ("claude-3-haiku-20240307", "Claude 3 Haiku - fast"),
    ],
    'groq': [
        ("llama-3.1-70b-versatile", "Llama 3.1 70B - best quality"),
        ("llama-3.1-8b-instant", "Llama 3.1 8B - fast"),
        ("mixtral-8x7b-32768", "Mixtral 8x7B - good balance"),
    ],
    'together': [
        ("Qwen/Qwen2.5-Coder-32B-Instruct", "Qwen 2.5 Coder 32B"),
        ("meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "Llama 3.1 70B"),
        ("mistralai/Mixtral-8x7B-Instruct-v0.1", "Mixtral 8x7B"),
    ],
    'ollama': [
        ("qwen2.5-coder:14b", "Best local code model"),
        ("qwen2.5-coder:7b", "Fast local code model"),
        ("deepseek-coder:6.7b", "DeepSeek Coder"),
        ("codellama:7b-instruct", "CodeLlama 7B"),
    ],
}


@dataclass
class GenerationResult:
    """Result from LLM generation."""
    content: str
    model: str
    provider: str
    tokens_used: int = 0
    generation_time_ms: int = 0
    finish_reason: str = "stop"
    raw_response: Optional[Dict[str, Any]] = None


class BaseLLMClient(ABC):
    """Abstract base class for LLM clients."""
    
    provider_name: str = "base"
    
    @abstractmethod
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        """Generate completion."""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """Check if client is available."""
        pass
    
    def chat(self, messages: List[Dict[str, str]], max_tokens: int = 4000) -> str:
        """Chat completion (default implementation)."""
        prompt_parts = []
        system = None
        for msg in messages:
            if msg['role'] == 'system':
                system = msg['content']
            else:
                prompt_parts.append(f"{msg['role']}: {msg['content']}")
        return self.generate('\n'.join(prompt_parts), system=system, max_tokens=max_tokens)
    
    def generate_with_metadata(self, prompt: str, system: str = None, 
                                max_tokens: int = 4000) -> GenerationResult:
        """Generate completion with full metadata."""
        start_time = time.time()
        content = self.generate(prompt, system=system, max_tokens=max_tokens)
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        return GenerationResult(
            content=content,
            model=getattr(self, 'model', 'unknown'),
            provider=self.provider_name,
            generation_time_ms=elapsed_ms,
        )


class OpenRouterClient(BaseLLMClient):
    """OpenRouter API client for cloud LLM access."""
    
    provider_name = "openrouter"
    API_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    def __init__(self, api_key: str = None, model: str = None, temperature: float = 0.2):
        """Initialize OpenRouter client.
        
        Args:
            api_key: OpenRouter API key (or set OPENROUTER_API_KEY env var)
            model: Model to use (default from OPENROUTER_MODEL)
        """
        self.api_key = api_key or os.environ.get('OPENROUTER_API_KEY')
        self.model = model or os.environ.get('OPENROUTER_MODEL', 'qwen/qwen-2.5-coder-32b-instruct')
        self.temperature = temperature
    
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        """Generate completion using OpenRouter."""
        if not HTTPX_AVAILABLE:
            raise ImportError("httpx required: pip install httpx")
        
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured. Set OPENROUTER_API_KEY.")
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/wronai/contract",
            "X-Title": "Reclapp",
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": self.temperature,
        }
        
        try:
            response = httpx.post(self.API_URL, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e, 'response') else str(e)
            raise RuntimeError(f"OpenRouter API error: {error_detail}")
        except Exception as e:
            raise RuntimeError(f"Request failed: {e}")
    
    def is_available(self) -> bool:
        """Check if OpenRouter is configured."""
        return bool(self.api_key)
    
    @staticmethod
    def list_recommended_models() -> List[tuple]:
        """List recommended models for code tasks."""
        return RECOMMENDED_MODELS['openrouter']


class OpenAIClient(BaseLLMClient):
    """OpenAI API client."""
    
    provider_name = "openai"
    API_URL = "https://api.openai.com/v1/chat/completions"
    
    def __init__(self, api_key: str = None, model: str = None, temperature: float = 0.2):
        self.api_key = api_key or os.environ.get('OPENAI_API_KEY')
        self.model = model or os.environ.get('OPENAI_MODEL', 'gpt-4-turbo')
        self.temperature = temperature
    
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        if not HTTPX_AVAILABLE:
            raise ImportError("httpx required: pip install httpx")
        
        if not self.api_key:
            raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY.")
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": self.temperature,
        }
        
        try:
            response = httpx.post(self.API_URL, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e, 'response') else str(e)
            raise RuntimeError(f"OpenAI API error: {error_detail}")
        except Exception as e:
            raise RuntimeError(f"Request failed: {e}")
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    @staticmethod
    def list_recommended_models() -> List[tuple]:
        return RECOMMENDED_MODELS['openai']


class AnthropicClient(BaseLLMClient):
    """Anthropic Claude API client."""
    
    provider_name = "anthropic"
    API_URL = "https://api.anthropic.com/v1/messages"
    
    def __init__(self, api_key: str = None, model: str = None, temperature: float = 0.2):
        self.api_key = api_key or os.environ.get('ANTHROPIC_API_KEY')
        self.model = model or os.environ.get('ANTHROPIC_MODEL', 'claude-3-sonnet-20240229')
        self.temperature = temperature
    
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        if not HTTPX_AVAILABLE:
            raise ImportError("httpx required: pip install httpx")
        
        if not self.api_key:
            raise ValueError("Anthropic API key not configured. Set ANTHROPIC_API_KEY.")
        
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }
        
        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature,
        }
        if system:
            payload["system"] = system
        
        try:
            response = httpx.post(self.API_URL, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            return data['content'][0]['text']
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e, 'response') else str(e)
            raise RuntimeError(f"Anthropic API error: {error_detail}")
        except Exception as e:
            raise RuntimeError(f"Request failed: {e}")
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    @staticmethod
    def list_recommended_models() -> List[tuple]:
        return RECOMMENDED_MODELS['anthropic']


class GroqClient(BaseLLMClient):
    """Groq API client for fast inference."""
    
    provider_name = "groq"
    API_URL = "https://api.groq.com/openai/v1/chat/completions"
    
    def __init__(self, api_key: str = None, model: str = None, temperature: float = 0.2):
        self.api_key = api_key or os.environ.get('GROQ_API_KEY')
        self.model = model or os.environ.get('GROQ_MODEL', 'llama-3.1-70b-versatile')
        self.temperature = temperature
    
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        if not HTTPX_AVAILABLE:
            raise ImportError("httpx required: pip install httpx")
        
        if not self.api_key:
            raise ValueError("Groq API key not configured. Set GROQ_API_KEY.")
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": self.temperature,
        }
        
        try:
            response = httpx.post(self.API_URL, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e, 'response') else str(e)
            raise RuntimeError(f"Groq API error: {error_detail}")
        except Exception as e:
            raise RuntimeError(f"Request failed: {e}")
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    @staticmethod
    def list_recommended_models() -> List[tuple]:
        return RECOMMENDED_MODELS['groq']


class TogetherClient(BaseLLMClient):
    """Together AI API client."""
    
    provider_name = "together"
    API_URL = "https://api.together.xyz/v1/chat/completions"
    
    def __init__(self, api_key: str = None, model: str = None, temperature: float = 0.2):
        self.api_key = api_key or os.environ.get('TOGETHER_API_KEY')
        self.model = model or os.environ.get('TOGETHER_MODEL', 'Qwen/Qwen2.5-Coder-32B-Instruct')
        self.temperature = temperature
    
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        if not HTTPX_AVAILABLE:
            raise ImportError("httpx required: pip install httpx")
        
        if not self.api_key:
            raise ValueError("Together API key not configured. Set TOGETHER_API_KEY.")
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": self.temperature,
        }
        
        try:
            response = httpx.post(self.API_URL, headers=headers, json=payload, timeout=120)
            response.raise_for_status()
            data = response.json()
            return data['choices'][0]['message']['content']
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e, 'response') else str(e)
            raise RuntimeError(f"Together API error: {error_detail}")
        except Exception as e:
            raise RuntimeError(f"Request failed: {e}")
    
    def is_available(self) -> bool:
        return bool(self.api_key)
    
    @staticmethod
    def list_recommended_models() -> List[tuple]:
        return RECOMMENDED_MODELS['together']


class OllamaClient(BaseLLMClient):
    """Ollama client for local LLM inference."""
    
    provider_name = "ollama"
    
    def __init__(self, model: str = None, host: str = None, temperature: float = 0.3):
        """Initialize Ollama client.
        
        Args:
            model: Model to use (default from OLLAMA_MODEL or qwen2.5-coder:7b)
            host: Ollama host URL (default from OLLAMA_HOST or localhost:11434)
        """
        self.model = model or os.environ.get('OLLAMA_MODEL', 'qwen2.5-coder:7b')
        self.host = host or os.environ.get('OLLAMA_HOST', 'http://localhost:11434')
        self.temperature = temperature
    
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        """Generate completion using Ollama."""
        if not HTTPX_AVAILABLE:
            raise ImportError("httpx required: pip install httpx")
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": self.temperature, "num_predict": max_tokens}
        }
        if system:
            payload["system"] = system
        
        try:
            response = httpx.post(f"{self.host}/api/generate", json=payload, timeout=120)
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            raise RuntimeError(f"Ollama error: {e}")
    
    def chat(self, messages: List[Dict[str, str]], max_tokens: int = 4000) -> str:
        """Chat completion using Ollama chat API."""
        if not HTTPX_AVAILABLE:
            raise ImportError("httpx required: pip install httpx")
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": self.temperature, "num_predict": max_tokens}
        }
        
        try:
            response = httpx.post(f"{self.host}/api/chat", json=payload, timeout=120)
            response.raise_for_status()
            return response.json().get("message", {}).get("content", "")
        except Exception as e:
            raise RuntimeError(f"Ollama chat error: {e}")
    
    def is_available(self) -> bool:
        """Check if Ollama is running."""
        if not HTTPX_AVAILABLE:
            return False
        try:
            response = httpx.get(f"{self.host}/api/tags", timeout=3)
            return response.status_code == 200
        except Exception:
            return False
    
    def list_models(self) -> List[str]:
        """List available Ollama models."""
        if not HTTPX_AVAILABLE:
            return []
        try:
            response = httpx.get(f"{self.host}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                return [m['name'] for m in data.get('models', [])]
        except Exception:
            pass
        return []
    
    @staticmethod
    def list_recommended_models() -> List[tuple]:
        """List recommended models for code tasks."""
        return RECOMMENDED_MODELS['ollama']


class LiteLLMClient(BaseLLMClient):
    """LiteLLM client for universal LLM access."""
    
    provider_name = "litellm"
    
    def __init__(self, model: str = None, api_base: str = None, temperature: float = 0.3):
        """Initialize LiteLLM client.
        
        Args:
            model: Model identifier (e.g., 'ollama/qwen2.5-coder:7b', 'gpt-4')
            api_base: Optional API base URL for proxy
        """
        self.model = model or os.environ.get('LITELLM_MODEL', 'ollama/qwen2.5-coder:7b')
        self.api_base = api_base or os.environ.get('LITELLM_URL')
        self.temperature = temperature
    
    def generate(self, prompt: str, system: str = None, max_tokens: int = 4000) -> str:
        """Generate completion using LiteLLM."""
        if not LITELLM_AVAILABLE:
            raise ImportError("litellm required: pip install litellm")
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        try:
            kwargs = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": self.temperature,
            }
            if self.api_base:
                kwargs["api_base"] = self.api_base
            
            response = litellm.completion(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            raise RuntimeError(f"LiteLLM error: {e}")
    
    def is_available(self) -> bool:
        """Check if LiteLLM is available."""
        return LITELLM_AVAILABLE


# Provider registry
PROVIDER_CLIENTS = {
    'openrouter': OpenRouterClient,
    'openai': OpenAIClient,
    'anthropic': AnthropicClient,
    'groq': GroqClient,
    'together': TogetherClient,
    'ollama': OllamaClient,
    'litellm': LiteLLMClient,
}


def get_client(provider: str = None, model: str = None, **kwargs) -> BaseLLMClient:
    """Get appropriate LLM client based on provider.
    
    Args:
        provider: 'openrouter', 'openai', 'anthropic', 'groq', 'together', 'ollama', 'litellm'
        model: Model to use
        **kwargs: Additional arguments to pass to client
    
    Returns:
        Configured LLM client
    """
    provider = provider or os.environ.get('LLM_PROVIDER', 
        os.environ.get('CODE2LOGIC_DEFAULT_PROVIDER', 'openrouter'))
    
    if provider in PROVIDER_CLIENTS:
        client_class = PROVIDER_CLIENTS[provider]
        if model:
            return client_class(model=model, **kwargs)
        return client_class(**kwargs)
    
    # Auto-detect: try providers in order of priority
    priority_order = ['ollama', 'groq', 'openrouter', 'openai', 'anthropic', 'together']
    
    for p in priority_order:
        client_class = PROVIDER_CLIENTS[p]
        client = client_class(model=model, **kwargs) if model else client_class(**kwargs)
        if client.is_available():
            return client
    
    raise RuntimeError(
        "No LLM provider available. Configure one of:\n"
        "- OLLAMA_HOST for local Ollama\n"
        "- OPENROUTER_API_KEY for OpenRouter\n"
        "- OPENAI_API_KEY for OpenAI\n"
        "- ANTHROPIC_API_KEY for Anthropic\n"
        "- GROQ_API_KEY for Groq\n"
        "- TOGETHER_API_KEY for Together AI"
    )


def list_available_providers() -> Dict[str, bool]:
    """List all providers and their availability."""
    result = {}
    for provider, client_class in PROVIDER_CLIENTS.items():
        try:
            client = client_class()
            result[provider] = client.is_available()
        except Exception:
            result[provider] = False
    return result
