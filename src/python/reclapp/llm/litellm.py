"""
LiteLLM Client (Universal Adapter)

Mirrors: src/core/contract-ai/llm/litellm-client.ts
@version 2.4.1
"""

import os
import time
from typing import Optional

from pydantic import BaseModel

from .provider import GenerateOptions, LLMModelInfo, LLMProvider, LLMResponse

try:
    import litellm
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False


class LiteLLMConfig(BaseModel):
    """LiteLLM configuration"""
    model: str = "gpt-4"
    api_base: Optional[str] = None
    timeout: int = 120


class LiteLLMClient(LLMProvider):
    """LiteLLM Universal Client"""
    
    def __init__(self, config: Optional[LiteLLMConfig] = None):
        if config is None:
            config = LiteLLMConfig(
                model=os.getenv("LITELLM_MODEL", "gpt-4"),
                api_base=os.getenv("LITELLM_URL"),
            )
        self.config = config

    @property
    def name(self) -> str:
        return "litellm"

    @property
    def model(self) -> str:
        return self.config.model

    async def is_available(self) -> bool:
        """Check if LiteLLM is available"""
        return LITELLM_AVAILABLE

    async def list_models(self) -> list[LLMModelInfo]:
        """LiteLLM doesn't expose a simple models list via its universal API without complex setup"""
        return [
            LLMModelInfo(name=self.config.model, is_code_model=True)
        ]

    async def generate(self, options: GenerateOptions) -> LLMResponse:
        """Generate completion using LiteLLM"""
        if not LITELLM_AVAILABLE:
            raise ImportError("litellm required: pip install litellm")

        start_time = time.time()

        messages = []
        if options.system:
            messages.append({"role": "system", "content": options.system})
        messages.append({"role": "user", "content": options.user})

        try:
            kwargs = {
                "model": self.config.model,
                "messages": messages,
                "max_tokens": options.max_tokens,
                "temperature": options.temperature,
            }
            if self.config.api_base:
                kwargs["api_base"] = self.config.api_base
            
            if options.stop:
                kwargs["stop"] = options.stop

            # Note: litellm.completion is synchronous, but we're in an async method
            # In a real async environment, we'd use acompletion
            response = litellm.completion(**kwargs)
            
            content = response.choices[0].message.content or ""
            usage = getattr(response, "usage", {})
            tokens_used = getattr(usage, "total_tokens", 0)
            duration_ms = int((time.time() - start_time) * 1000)

            return LLMResponse(
                content=content,
                model=self.config.model,
                provider="litellm",
                tokens_used=tokens_used,
                duration_ms=duration_ms,
                raw=response.to_dict() if hasattr(response, "to_dict") else str(response),
            )
        except Exception as e:
            raise RuntimeError(f"LiteLLM error: {e}")

    async def close(self):
        """No persistent connection to close for LiteLLM"""
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()
