"""
Windsurf LLM Provider - Integration with Windsurf/Codeium AI

Windsurf uses a local server that proxies to various LLM providers.
Default endpoint: http://localhost:9090/v1/chat/completions

@version 2.4.1
"""

import os
import time
from typing import Optional

import httpx
from pydantic import BaseModel

from .provider import GenerateOptions, LLMModelInfo, LLMProvider, LLMResponse


class WindsurfConfig(BaseModel):
    """Configuration for Windsurf client"""
    base_url: str = "http://localhost:9090/v1"
    model: str = "cascade"  # Windsurf's default model
    timeout: int = 180
    api_key: str = ""  # Optional, some setups require it


class WindsurfClient(LLMProvider):
    """
    Windsurf/Codeium LLM provider.
    
    Windsurf provides a local proxy server that handles authentication
    and routes requests to various LLM providers (Claude, GPT-4, etc.)
    
    Environment variables:
    - WINDSURF_BASE_URL: Server URL (default: http://localhost:9090/v1)
    - WINDSURF_MODEL: Model to use (default: cascade)
    - WINDSURF_API_KEY: Optional API key
    
    Example:
        client = WindsurfClient()
        if await client.is_available():
            response = await client.generate(GenerateOptions(
                system="You are a helpful assistant",
                user="Hello!"
            ))
            print(response.content)
    """
    
    def __init__(self, config: Optional[WindsurfConfig] = None):
        if config is None:
            config = WindsurfConfig(
                base_url=os.getenv("WINDSURF_BASE_URL", "http://localhost:9090/v1"),
                model=os.getenv("WINDSURF_MODEL", "cascade"),
                api_key=os.getenv("WINDSURF_API_KEY", ""),
            )
        self.config = config
        self._client = httpx.AsyncClient(timeout=self.config.timeout)
        self._available: Optional[bool] = None
    
    @property
    def name(self) -> str:
        return "windsurf"
    
    @property
    def model(self) -> str:
        return self.config.model
    
    async def is_available(self) -> bool:
        """Check if Windsurf server is running and accessible"""
        if self._available is not None:
            return self._available
        
        try:
            url = self.config.base_url.rstrip("/") + "/models"
            headers = self._get_headers()
            resp = await self._client.get(url, headers=headers, timeout=5)
            self._available = resp.status_code == 200
        except Exception:
            self._available = False
        
        return self._available
    
    async def list_models(self) -> list[LLMModelInfo]:
        """List available models from Windsurf"""
        try:
            url = self.config.base_url.rstrip("/") + "/models"
            headers = self._get_headers()
            resp = await self._client.get(url, headers=headers)
            
            if resp.status_code != 200:
                return []
            
            data = resp.json()
            models = []
            
            for model in data.get("data", []):
                models.append(LLMModelInfo(
                    name=model.get("id", "unknown"),
                    size=None,
                    modified=None,
                    is_code_model=True  # Windsurf is primarily for code
                ))
            
            return models
        except Exception:
            return []
    
    async def has_model(self, model_name: Optional[str] = None) -> bool:
        """Check if a specific model is available"""
        if model_name is None:
            model_name = self.config.model
        
        models = await self.list_models()
        return any(m.name == model_name for m in models)
    
    async def generate(self, options: GenerateOptions) -> LLMResponse:
        """Generate completion using Windsurf"""
        if not await self.is_available():
            raise RuntimeError(
                "Windsurf server not available. "
                "Make sure Windsurf IDE is running or start the server manually."
            )
        
        start_time = time.time()
        
        headers = self._get_headers()
        
        payload: dict = {
            "model": self.config.model,
            "messages": [
                {"role": "system", "content": options.system},
                {"role": "user", "content": options.user},
            ],
            "temperature": options.temperature,
            "max_tokens": options.max_tokens,
        }
        
        if options.response_format == "json":
            payload["response_format"] = {"type": "json_object"}
        
        if options.stop:
            payload["stop"] = options.stop
        
        url = self.config.base_url.rstrip("/") + "/chat/completions"
        
        try:
            resp = await self._client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"Windsurf API error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            raise RuntimeError(f"Windsurf request failed: {e}")
        
        # Parse response
        content = ""
        if "choices" in data and data["choices"]:
            message = data["choices"][0].get("message", {})
            content = message.get("content", "")
        
        usage = data.get("usage", {})
        tokens_used = usage.get("total_tokens", 0)
        duration_ms = int((time.time() - start_time) * 1000)
        
        return LLMResponse(
            content=content,
            model=self.config.model,
            provider="windsurf",
            tokens_used=tokens_used,
            duration_ms=duration_ms,
            raw=data,
        )
    
    def _get_headers(self) -> dict[str, str]:
        """Get request headers"""
        headers = {
            "Content-Type": "application/json",
        }
        
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        
        return headers
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, *args):
        await self.close()
