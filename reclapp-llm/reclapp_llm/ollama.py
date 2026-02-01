"""
Ollama LLM Client

Local LLM provider using Ollama.

Mirrors: src/core/contract-ai/llm/ollama-client.ts
@version 2.4.1
"""

import os
import time
from typing import Optional

import httpx
from pydantic import BaseModel

from .provider import LLMProvider, LLMResponse, GenerateOptions, LLMModelInfo


class OllamaConfig(BaseModel):
    """Ollama configuration"""
    host: str = "http://localhost:11434"
    model: str = "mistral:7b-instruct"
    timeout: int = 120
    retries: int = 3


class OllamaClient(LLMProvider):
    """
    Ollama LLM Client
    
    Example:
        client = OllamaClient()
        if await client.is_available():
            response = await client.generate(GenerateOptions(
                system="You are a helpful assistant",
                user="Hello!"
            ))
            print(response.content)
    """
    
    def __init__(self, config: Optional[OllamaConfig] = None):
        self.config = config or OllamaConfig(
            host=os.getenv("OLLAMA_HOST", os.getenv("OLLAMA_URL", "http://localhost:11434")),
            model=os.getenv("OLLAMA_MODEL", "mistral:7b-instruct"),
        )
        self._client = httpx.AsyncClient(timeout=self.config.timeout)
    
    @property
    def name(self) -> str:
        return "ollama"
    
    @property
    def model(self) -> str:
        return self.config.model
    
    async def is_available(self) -> bool:
        """Check if Ollama is running"""
        try:
            response = await self._client.get(f"{self.config.host}/api/tags")
            return response.status_code == 200
        except Exception:
            return False
    
    async def list_models(self) -> list[LLMModelInfo]:
        """List available Ollama models"""
        try:
            response = await self._client.get(f"{self.config.host}/api/tags")
            if response.status_code != 200:
                return []
            
            data = response.json()
            models = []
            
            code_keywords = ["code", "coder", "codellama", "deepseek", "qwen", "starcoder"]
            
            for m in data.get("models", []):
                name = m.get("name", "")
                is_code = any(kw in name.lower() for kw in code_keywords)
                models.append(LLMModelInfo(
                    name=name,
                    size=m.get("size"),
                    modified=m.get("modified_at"),
                    is_code_model=is_code
                ))
            
            return models
        except Exception:
            return []
    
    async def has_model(self, model_name: Optional[str] = None) -> bool:
        """Check if model is available"""
        try:
            models = await self.list_models()
            target = model_name or self.config.model
            model_base = target.split(":")[0]
            has_tag = ":" in target
            
            for m in models:
                if has_tag and m.name == target:
                    return True
                if not has_tag and (m.name == model_base or m.name.startswith(f"{model_base}:")):
                    return True
            
            return False
        except Exception:
            return False
    
    async def generate(self, options: GenerateOptions) -> LLMResponse:
        """
        Generate completion using Ollama.
        
        Args:
            options: Generation options
            
        Returns:
            LLM response
            
        Raises:
            RuntimeError: If generation fails
        """
        start_time = time.time()
        last_error: Optional[Exception] = None
        
        request_data = {
            "model": self.config.model,
            "prompt": options.user,
            "system": options.system,
            "stream": False,
            "options": {
                "temperature": options.temperature,
                "num_predict": options.max_tokens,
            }
        }
        
        if options.response_format == "json":
            request_data["format"] = "json"
        
        for attempt in range(1, self.config.retries + 1):
            try:
                response = await self._client.post(
                    f"{self.config.host}/api/generate",
                    json=request_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    duration_ms = int((time.time() - start_time) * 1000)
                    
                    return LLMResponse(
                        content=data.get("response", ""),
                        model=self.config.model,
                        provider="ollama",
                        tokens_used=data.get("eval_count", 0),
                        duration_ms=duration_ms,
                        raw=data
                    )
                
                if response.status_code == 404:
                    raise RuntimeError(
                        f"Model '{self.config.model}' not found. "
                        f"Pull with: ollama pull {self.config.model}"
                    )
                
                raise RuntimeError(f"Ollama error: {response.status_code} - {response.text}")
                
            except httpx.ConnectError:
                raise RuntimeError("Ollama not running. Start with: ollama serve")
            except Exception as e:
                last_error = e
                if attempt < self.config.retries:
                    await self._sleep(attempt)
        
        raise RuntimeError(f"Ollama generation failed after {self.config.retries} attempts: {last_error}")
    
    async def _sleep(self, attempt: int):
        """Exponential backoff sleep"""
        import asyncio
        await asyncio.sleep(2 ** attempt)
    
    async def close(self):
        """Close HTTP client"""
        await self._client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, *args):
        await self.close()
