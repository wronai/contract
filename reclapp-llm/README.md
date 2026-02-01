# reclapp-llm

Unified LLM provider manager for Reclapp.

## Features

- Support for multiple providers:
  - **Ollama** (local)
  - **OpenRouter** (unified API for 100+ models)
  - **Windsurf** (native IDE context)
  - **LiteLLM** (optional drop-in for OpenAI, Anthropic, etc.)
- Unified interface for all providers
- Robust error handling and availability checks
- Model metadata tracking (tokens, duration)

## Installation

```bash
pip install reclapp-llm
```

To enable LiteLLM support:

```bash
pip install reclapp-llm[litellm]
```

## Usage

```python
from reclapp_llm import LLMManager, GenerateOptions

manager = LLMManager()
await manager.initialize()

response = await manager.generate(GenerateOptions(
    system="You are a helpful assistant",
    user="Hello!",
    model="gpt-4o"
))

print(response.content)
```
