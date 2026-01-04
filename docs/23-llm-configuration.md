# LLM Configuration & Multi-Provider Routing

- **[Docs Index](README.md)**
- **[CLI Reference](cli-reference.md)**

This project supports **multiple LLM providers** with:

- configuration via `.env`
- advanced routing via `litellm_config.yaml`
- CLI helpers via `reclapp llm ...`

The goal is to allow:

- local-first development (Ollama)
- cloud fallback (OpenRouter / Groq / Together / OpenAI / Anthropic)
- explicit control over **which models are used** and in what **priority order**

## Quick Start

### 1) Install Python dependencies

```bash
pip install -e .
# optional (recommended for YAML + proxy support)
pip install -e ".[llm]"
```

### 2) Create or update `.env`

You can either edit `.env` manually or use the CLI (recommended).

#### Set default provider

```bash
reclapp llm set-provider ollama
```

You can also enable automatic fallback selection:

```bash
reclapp llm set-provider auto
```

When `LLM_PROVIDER=auto`, `reclapp` will try providers in priority order and pick the first one that is available.

#### Set model for a provider

```bash
reclapp llm set-model ollama qwen2.5-coder:14b
reclapp llm set-model openrouter nvidia/nemotron-3-nano-30b-a3b:free
```

These commands will **create `.env` automatically** if it does not exist.

### 3) Check current status

```bash
reclapp llm status
```

Status meanings:

- `✓ Available`
  provider is configured and the client reports it is usable
- `✗ Not configured`
  missing required config (usually API key for cloud providers)
- `⚠ Configured but unreachable`
  configuration exists, but the backend cannot be reached (e.g. Ollama not running)

Priority shown by `reclapp llm status`:

- If `litellm_config.yaml` contains `model_list` entries with `priority`, the CLI uses the minimum `priority` per provider.
- Otherwise it falls back to provider-level priority.

### 4) (Optional) Test generation

```bash
reclapp llm test -p ollama
```

## `.env` Variables

### Where to store API keys (secrets)

Do **not** store API keys in `litellm_config.yaml`.

Recommended options:

- Use `.env` in the repo (local development).
- Use environment variables in your shell/CI (production).
- Use a secret manager (GitHub Actions secrets, Vault, AWS/GCP/Azure secrets) and inject env vars at runtime.

In this project, `.env` is the recommended place for keys, while `litellm_config.yaml` is for routing.

### Global

- `LLM_PROVIDER`
  default provider (`ollama`, `openrouter`, `groq`, `together`, `openai`, `anthropic`, `litellm`)
- `LLM_TEMPERATURE`
- `LLM_MAX_TOKENS`
- `LLM_TIMEOUT_MS`

### Ollama

- `OLLAMA_HOST` (default `http://localhost:11434`)
- `OLLAMA_MODEL` (e.g. `qwen2.5-coder:14b`)

### OpenRouter

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
  e.g. `nvidia/nemotron-3-nano-30b-a3b:free`

### Groq

- `GROQ_API_KEY`
- `GROQ_MODEL`

### Together

- `TOGETHER_API_KEY`
- `TOGETHER_MODEL`

### OpenAI

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

### Anthropic

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

### LiteLLM (Proxy)

- `LITELLM_URL`
- `LITELLM_API_KEY`
- `LITELLM_MODEL`

### Managing API keys via CLI

You can set/unset provider API keys via `reclapp` (this edits `.env`):

```bash
reclapp llm key set openrouter <OPENROUTER_API_KEY>
reclapp llm key unset openrouter
```

Supported providers: `openrouter`, `openai`, `anthropic`, `groq`, `together`, `litellm`.

## `litellm_config.yaml` (Priorities, Limits, Fallbacks)

The file `litellm_config.yaml` controls advanced routing:

- which **model entries** exist (`model_list`)
- ordering by `priority` (lower = earlier)
- per-entry rate limiting (`rate_limit`)
- global router behavior (`router_settings`)

### Model entries

Each entry looks like:

```yaml
- model_name: code-analyzer
  litellm_params:
    model: ollama/qwen2.5-coder:14b
    api_base: http://localhost:11434
  priority: 10
  rate_limit: 120
```

Recommendation: always use fully-qualified provider/model strings in `litellm_params.model`, e.g.:

- `ollama/qwen2.5-coder:14b`
- `openrouter/nvidia/nemotron-3-nano-30b-a3b:free`

### Changing priority order (real task execution)

To make OpenRouter tried first and Ollama second:

```bash
reclapp llm priority set-provider openrouter 10
reclapp llm priority set-provider ollama 20
```

Then set:

```bash
reclapp llm set-provider auto
```

This combination ensures that during tasks, `reclapp` will fall back in the desired order.

- `openrouter/nvidia/nemotron-3-nano-30b-a3b:free`
- `groq/llama-3.1-8b-instant`
- `openai/gpt-4-turbo`
- `anthropic/claude-3-sonnet-20240229`

### Fallbacks

Fallback order is defined in:

```yaml
router_settings:
  fallbacks:
    - code-analyzer
    - openrouter-free
    - groq-llama
```

## Managing Priorities via CLI

### Provider-level priority (ollama/groq/openrouter…)

This updates **all entries** in `model_list` whose `litellm_params.model` prefix matches the provider.

```bash
reclapp llm priority set-provider groq 5 --preserve-order --step 10
```

- `--preserve-order` keeps the relative ordering of models within the provider
- `--step` controls spacing between priorities

### Model entry priority (`model_name`)

```bash
reclapp llm priority set-model code-analyzer 1
```

## Adding/Removing `model_list` entries via CLI

Important naming:

- **provider**
  e.g. `groq`, `openrouter`, `ollama` (derived from `litellm_params.model` prefix)
- **model_name**
  e.g. `groq-llama`, `openrouter-free` (the key used inside `litellm_config.yaml`)
- **litellm model string**
  e.g. `groq/llama-3.1-70b-versatile`, `openrouter/nvidia/nemotron-3-nano-30b-a3b:free`

`reclapp llm model remove` expects a **model_name**, not a provider and not a raw model string.

### Add

```bash
reclapp llm model add \
  --model-name my-local-fast \
  --litellm-model ollama/qwen2.5-coder:7b \
  --api-base http://localhost:11434 \
  --priority 12 \
  --rate-limit 120
```

### Remove

```bash
reclapp llm model remove my-local-fast
```

### List model_name values

Use this to discover the correct `model_name` values:

```bash
reclapp llm config list
reclapp llm config list -p groq
```

`reclapp llm model list` is kept as a legacy alias for `reclapp llm config list`.

### Remove all models for a provider

```bash
reclapp llm model remove-provider groq
```

## Managing Fallbacks via CLI

```bash
reclapp llm fallbacks list
reclapp llm fallbacks add groq-llama
reclapp llm fallbacks remove groq-llama
```

## Notes / Troubleshooting

### Different Python environments

If you get errors like:

- `No module named 'reclapp'`

ensure you are running the installed CLI (`pip install -e .`) or run with:

```bash
PYTHONPATH=. python3 -m reclapp.cli llm status
```
