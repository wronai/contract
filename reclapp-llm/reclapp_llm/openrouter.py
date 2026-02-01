import os
import time
from typing import Optional

import httpx
from pydantic import BaseModel

from .provider import GenerateOptions, LLMModelInfo, LLMProvider, LLMResponse


class OpenRouterConfig(BaseModel):
    api_key: str
    base_url: str = "https://openrouter.ai/api/v1"
    model: str = "qwen/qwen-2.5-coder-32b-instruct"
    timeout: int = 120


class OpenRouterClient(LLMProvider):
    def __init__(self, config: Optional[OpenRouterConfig] = None):
        if config is None:
            api_key = os.getenv("OPENROUTER_API_KEY", "")
            model = os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-coder-32b-instruct")
            base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
            config = OpenRouterConfig(api_key=api_key, model=model, base_url=base_url)
        self.config = config
        self._client = httpx.AsyncClient(timeout=self.config.timeout)

    @property
    def name(self) -> str:
        return "openrouter"

    @property
    def model(self) -> str:
        return self.config.model

    async def is_available(self) -> bool:
        return bool(self.config.api_key)

    async def list_models(self) -> list[LLMModelInfo]:
        return []

    async def generate(self, options: GenerateOptions) -> LLMResponse:
        if not self.config.api_key:
            raise RuntimeError("OpenRouter API key not configured. Set OPENROUTER_API_KEY")

        start_time = time.time()

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/wronai/contract",
            "X-Title": "Reclapp",
        }

        payload: dict = {
            "model": self.config.model,
            "messages": [
                {"role": "system", "content": options.system},
                {"role": "user", "content": options.user},
            ],
            "temperature": options.temperature,
            "max_tokens": options.max_tokens,
        }

        if options.stop:
            payload["stop"] = options.stop

        url = self.config.base_url.rstrip("/") + "/chat/completions"
        resp = await self._client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

        content = (((data.get("choices") or [{}])[0]).get("message") or {}).get("content") or ""
        usage = data.get("usage") or {}
        tokens_used = int(usage.get("total_tokens") or 0)
        duration_ms = int((time.time() - start_time) * 1000)

        return LLMResponse(
            content=content,
            model=self.config.model,
            provider="openrouter",
            tokens_used=tokens_used,
            duration_ms=duration_ms,
            raw=data,
        )

    async def close(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
