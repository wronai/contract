"""
Anthropic LLM Client

Mirrors: src/core/contract-ai/llm/anthropic-client.ts
@version 2.4.1
"""

import os
import time
from typing import Optional

import httpx
from pydantic import BaseModel

from .provider import GenerateOptions, LLMModelInfo, LLMProvider, LLMResponse


class AnthropicConfig(BaseModel):
    """Anthropic configuration"""
    api_key: str
    model: str = "claude-3-sonnet-20240229"
    base_url: str = "https://api.anthropic.com/v1"
    timeout: int = 120


class AnthropicClient(LLMProvider):
    """Anthropic LLM Client"""
    
    def __init__(self, config: Optional[AnthropicConfig] = None):
        if config is None:
            config = AnthropicConfig(
                api_key=os.getenv("ANTHROPIC_API_KEY", ""),
                model=os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229"),
                base_url=os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1"),
            )
        self.config = config
        self._client = httpx.AsyncClient(timeout=self.config.timeout)

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def model(self) -> str:
        return self.config.model

    async def is_available(self) -> bool:
        """Check if Anthropic API key is configured"""
        return bool(self.config.api_key)

    async def list_models(self) -> list[LLMModelInfo]:
        """List available Anthropic models (hardcoded since Anthropic doesn't have a simple models list endpoint)"""
        if not self.config.api_key:
            return []
        
        # Anthropic doesn't have a public models list API like OpenAI
        return [
            LLMModelInfo(name="claude-3-opus-20240229", is_code_model=True),
            LLMModelInfo(name="claude-3-sonnet-20240229", is_code_model=True),
            LLMModelInfo(name="claude-3-haiku-20240307", is_code_model=True),
            LLMModelInfo(name="claude-2.1", is_code_model=True),
        ]

    async def generate(self, options: GenerateOptions) -> LLMResponse:
        """Generate completion using Anthropic"""
        if not self.config.api_key:
            raise RuntimeError("Anthropic API key not configured. Set ANTHROPIC_API_KEY")

        start_time = time.time()

        headers = {
            "x-api-key": self.config.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        payload: dict = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": options.user}],
            "max_tokens": options.max_tokens,
            "temperature": options.temperature,
        }

        if options.system:
            payload["system"] = options.system

        if options.stop:
            payload["stop_sequences"] = options.stop

        url = self.config.base_url.rstrip("/") + "/messages"
        resp = await self._client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

        content = data['content'][0]['text'] or ""
        usage = data.get("usage") or {}
        tokens_used = int(usage.get("output_tokens", 0) + usage.get("input_tokens", 0))
        duration_ms = int((time.time() - start_time) * 1000)

        return LLMResponse(
            content=content,
            model=self.config.model,
            provider="anthropic",
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
