"""
OpenAI LLM Client

Mirrors: src/core/contract-ai/llm/openai-client.ts
@version 2.4.1
"""

import os
import time
from typing import Optional

import httpx
from pydantic import BaseModel

from .provider import GenerateOptions, LLMModelInfo, LLMProvider, LLMResponse


class OpenAIConfig(BaseModel):
    """OpenAI configuration"""
    api_key: str
    model: str = "gpt-4-turbo"
    base_url: str = "https://api.openai.com/v1"
    timeout: int = 120


class OpenAIClient(LLMProvider):
    """OpenAI LLM Client"""
    
    def __init__(self, config: Optional[OpenAIConfig] = None):
        if config is None:
            config = OpenAIConfig(
                api_key=os.getenv("OPENAI_API_KEY", ""),
                model=os.getenv("OPENAI_MODEL", "gpt-4-turbo"),
                base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            )
        self.config = config
        self._client = httpx.AsyncClient(timeout=self.config.timeout)

    @property
    def name(self) -> str:
        return "openai"

    @property
    def model(self) -> str:
        return self.config.model

    async def is_available(self) -> bool:
        """Check if OpenAI API key is configured"""
        return bool(self.config.api_key)

    async def list_models(self) -> list[LLMModelInfo]:
        """List available OpenAI models"""
        if not self.config.api_key:
            return []
        try:
            url = self.config.base_url.rstrip("/") + "/models"
            headers = {"Authorization": f"Bearer {self.config.api_key}"}
            resp = await self._client.get(url, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            
            models = []
            for m in data.get("data", []):
                name = m.get("id", "unknown")
                models.append(LLMModelInfo(
                    name=name,
                    is_code_model="gpt-4" in name or "gpt-3.5" in name
                ))
            return models
        except Exception:
            return []

    async def generate(self, options: GenerateOptions) -> LLMResponse:
        """Generate completion using OpenAI"""
        if not self.config.api_key:
            raise RuntimeError("OpenAI API key not configured. Set OPENAI_API_KEY")

        start_time = time.time()

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if options.system:
            messages.append({"role": "system", "content": options.system})
        messages.append({"role": "user", "content": options.user})

        payload: dict = {
            "model": self.config.model,
            "messages": messages,
            "temperature": options.temperature,
            "max_tokens": options.max_tokens,
        }

        if options.stop:
            payload["stop"] = options.stop

        if options.response_format == "json":
            payload["response_format"] = {"type": "json_object"}

        url = self.config.base_url.rstrip("/") + "/chat/completions"
        resp = await self._client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

        content = data['choices'][0]['message']['content'] or ""
        usage = data.get("usage") or {}
        tokens_used = int(usage.get("total_tokens") or 0)
        duration_ms = int((time.time() - start_time) * 1000)

        return LLMResponse(
            content=content,
            model=self.config.model,
            provider="openai",
            tokens_used=tokens_used,
            duration_ms=duration_ms,
            raw=data,
        )

    async def close(self):
        """Close HTTP client"""
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
