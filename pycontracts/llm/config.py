"""
LLM Configuration management for multi-provider support.

Supports loading API keys and settings from:
1. Environment variables
2. .env file
3. litellm_config.yaml
4. ~/.reclapp/config.json

Usage:
    from pycontracts.llm.config import LLMConfig
    
    config = LLMConfig()
    api_key = config.get_api_key('openrouter')
    model = config.get_model('openrouter')

@version 2.3.0
"""

import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


@dataclass
class ProviderConfig:
    """Configuration for a single LLM provider."""
    name: str
    api_key: Optional[str] = None
    model: str = ""
    base_url: Optional[str] = None
    priority: int = 100  # Lower = higher priority
    rate_limit: int = 60  # Requests per minute
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 120
    enabled: bool = True
    
    def is_configured(self) -> bool:
        """Check if provider is properly configured."""
        if self.name == 'ollama':
            return bool(self.base_url)
        return bool(self.api_key)


@dataclass 
class LiteLLMModelConfig:
    """Configuration for a LiteLLM model entry."""
    model_name: str
    litellm_model: str
    api_base: Optional[str] = None
    api_key: Optional[str] = None
    priority: int = 100
    rate_limit: int = 60


class LLMConfig:
    """Configuration manager for LLM providers."""
    
    # Default models for each provider (optimized for code tasks)
    DEFAULT_MODELS = {
        'openrouter': 'qwen/qwen-2.5-coder-32b-instruct',
        'openai': 'gpt-4-turbo',
        'anthropic': 'claude-3-sonnet-20240229',
        'groq': 'llama-3.1-70b-versatile',
        'together': 'Qwen/Qwen2.5-Coder-32B-Instruct',
        'ollama': 'qwen2.5-coder:14b',
        'litellm': 'gpt-4',
    }
    
    # API key environment variable names
    API_KEY_VARS = {
        'openrouter': 'OPENROUTER_API_KEY',
        'openai': 'OPENAI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'groq': 'GROQ_API_KEY',
        'together': 'TOGETHER_API_KEY',
        'litellm': 'LITELLM_API_KEY',
    }
    
    # Model environment variable names
    MODEL_VARS = {
        'openrouter': 'OPENROUTER_MODEL',
        'openai': 'OPENAI_MODEL',
        'anthropic': 'ANTHROPIC_MODEL',
        'groq': 'GROQ_MODEL',
        'together': 'TOGETHER_MODEL',
        'ollama': 'OLLAMA_MODEL',
        'litellm': 'LITELLM_MODEL',
    }
    
    # Base URL environment variable names
    BASE_URL_VARS = {
        'ollama': 'OLLAMA_HOST',
        'litellm': 'LITELLM_URL',
        'openrouter': 'OPENROUTER_BASE_URL',
    }
    
    # Default base URLs
    DEFAULT_BASE_URLS = {
        'ollama': 'http://localhost:11434',
        'openrouter': 'https://openrouter.ai/api/v1',
        'openai': 'https://api.openai.com/v1',
        'anthropic': 'https://api.anthropic.com/v1',
        'groq': 'https://api.groq.com/openai/v1',
        'together': 'https://api.together.xyz/v1',
    }
    
    # Default priorities (lower = higher priority)
    DEFAULT_PRIORITIES = {
        'ollama': 10,      # Local first
        'groq': 20,        # Fast cloud
        'together': 30,    # Good for code
        'openrouter': 40,  # Multi-model
        'openai': 50,      # Reliable
        'anthropic': 60,   # High quality
        'litellm': 70,     # Proxy fallback
    }
    
    def __init__(self, env_file: str = None, litellm_config: str = None):
        """Initialize configuration.
        
        Args:
            env_file: Path to .env file (default: .env in current dir or project root)
            litellm_config: Path to litellm_config.yaml
        """
        self._providers: Dict[str, ProviderConfig] = {}
        self._litellm_models: List[LiteLLMModelConfig] = []
        self._config: Dict[str, Any] = {}
        
        self._load_env_file(env_file)
        self._load_litellm_config(litellm_config)
        self._load_config_file()
        self._init_providers()
    
    def _load_env_file(self, env_file: str = None):
        """Load environment variables from .env file."""
        env_paths = [
            env_file,
            Path.cwd() / '.env',
            Path(__file__).parent.parent.parent / '.env',
            Path.home() / '.reclapp' / '.env',
        ]
        
        for env_path in env_paths:
            if env_path and Path(env_path).exists():
                self._parse_env_file(Path(env_path))
                break
    
    def _parse_env_file(self, path: Path):
        """Parse .env file and set environment variables."""
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        if key and value and not os.environ.get(key):
                            os.environ[key] = value
        except Exception:
            pass
    
    def _load_litellm_config(self, config_path: str = None):
        """Load LiteLLM configuration from YAML file."""
        if not YAML_AVAILABLE:
            return
        
        yaml_paths = [
            config_path,
            Path.cwd() / 'litellm_config.yaml',
            Path(__file__).parent.parent.parent / 'litellm_config.yaml',
            Path.home() / '.reclapp' / 'litellm_config.yaml',
        ]
        
        for yaml_path in yaml_paths:
            if yaml_path and Path(yaml_path).exists():
                try:
                    with open(yaml_path) as f:
                        data = yaml.safe_load(f)
                        self._parse_litellm_config(data)
                        break
                except Exception:
                    pass
    
    def _parse_litellm_config(self, data: Dict[str, Any]):
        """Parse LiteLLM configuration data."""
        if not data:
            return
        
        # Parse model list
        model_list = data.get('model_list', [])
        for model_entry in model_list:
            model_name = model_entry.get('model_name', '')
            litellm_params = model_entry.get('litellm_params', {})
            
            config = LiteLLMModelConfig(
                model_name=model_name,
                litellm_model=litellm_params.get('model', ''),
                api_base=litellm_params.get('api_base'),
                api_key=litellm_params.get('api_key'),
                priority=model_entry.get('priority', 100),
                rate_limit=model_entry.get('rate_limit', 60),
            )
            self._litellm_models.append(config)
        
        # Parse router settings
        router_settings = data.get('router_settings', {})
        self._config['routing_strategy'] = router_settings.get('routing_strategy', 'simple-shuffle')
        self._config['num_retries'] = router_settings.get('num_retries', 3)
        self._config['timeout'] = router_settings.get('timeout', 120)
        
        # Parse general settings
        general_settings = data.get('general_settings', {})
        self._config['master_key'] = general_settings.get('master_key')
    
    def _load_config_file(self):
        """Load configuration from JSON file."""
        config_paths = [
            Path.home() / '.reclapp' / 'llm_config.json',
            Path.cwd() / 'llm_config.json',
        ]
        
        for config_path in config_paths:
            if config_path.exists():
                try:
                    with open(config_path) as f:
                        self._config.update(json.load(f))
                        break
                except Exception:
                    pass
    
    def _init_providers(self):
        """Initialize provider configurations from environment."""
        for provider in self.DEFAULT_MODELS:
            api_key = self.get_api_key(provider)
            model = self.get_model(provider)
            base_url = self.get_base_url(provider)
            priority = self._config.get('priorities', {}).get(
                provider, self.DEFAULT_PRIORITIES.get(provider, 100)
            )
            
            self._providers[provider] = ProviderConfig(
                name=provider,
                api_key=api_key,
                model=model,
                base_url=base_url,
                priority=priority,
                rate_limit=self._get_rate_limit(provider),
                max_tokens=int(os.environ.get('LLM_MAX_TOKENS', 4096)),
                temperature=float(os.environ.get('LLM_TEMPERATURE', 0.7)),
                timeout=int(os.environ.get('LLM_TIMEOUT_MS', 60000)) // 1000,
                enabled=self._is_provider_enabled(provider),
            )
    
    def _get_rate_limit(self, provider: str) -> int:
        """Get rate limit for provider."""
        env_key = f'{provider.upper()}_RATE_LIMIT'
        return int(os.environ.get(env_key, 
            os.environ.get('PARALLEL_RATE_LIMIT_PER_PROVIDER', 60)))
    
    def _is_provider_enabled(self, provider: str) -> bool:
        """Check if provider is enabled."""
        env_key = f'{provider.upper()}_ENABLED'
        value = os.environ.get(env_key, 'true').lower()
        return value in ('true', '1', 'yes')
    
    def get_api_key(self, provider: str) -> Optional[str]:
        """Get API key for a provider."""
        var_name = self.API_KEY_VARS.get(provider)
        if var_name:
            return os.environ.get(var_name)
        return None
    
    def get_model(self, provider: str) -> str:
        """Get model for a provider."""
        # Check environment variable first
        var_name = self.MODEL_VARS.get(provider)
        if var_name:
            env_model = os.environ.get(var_name)
            if env_model:
                return env_model
        
        # Check config file
        if provider in self._config.get('models', {}):
            return self._config['models'][provider]
        
        # Return default
        return self.DEFAULT_MODELS.get(provider, 'gpt-4')
    
    def get_base_url(self, provider: str) -> Optional[str]:
        """Get base URL for a provider."""
        var_name = self.BASE_URL_VARS.get(provider)
        if var_name:
            env_url = os.environ.get(var_name)
            if env_url:
                return env_url
        return self.DEFAULT_BASE_URLS.get(provider)
    
    def get_default_provider(self) -> str:
        """Get default LLM provider."""
        return os.environ.get('LLM_PROVIDER', 
            os.environ.get('CODE2LOGIC_DEFAULT_PROVIDER', 'ollama'))
    
    def get_provider_config(self, provider: str) -> Optional[ProviderConfig]:
        """Get configuration for a specific provider."""
        return self._providers.get(provider)
    
    def get_configured_providers(self) -> List[ProviderConfig]:
        """Get list of configured and enabled providers, sorted by priority."""
        providers = [
            p for p in self._providers.values() 
            if p.enabled and p.is_configured()
        ]
        return sorted(providers, key=lambda p: p.priority)
    
    def get_litellm_models(self) -> List[LiteLLMModelConfig]:
        """Get list of configured LiteLLM models."""
        return self._litellm_models
    
    def is_verbose(self) -> bool:
        """Check if verbose mode is enabled."""
        return os.environ.get('CODE2LOGIC_VERBOSE', 
            os.environ.get('LLM_VERBOSE', '')).lower() in ('true', '1', 'yes')
    
    def get_cache_dir(self) -> Path:
        """Get cache directory path."""
        cache_dir = os.environ.get('CODE2LOGIC_CACHE_DIR', 
            os.environ.get('RECLAPP_CACHE_DIR', '~/.reclapp/cache'))
        return Path(cache_dir).expanduser()
    
    def list_configured_providers(self) -> Dict[str, bool]:
        """List all providers and their configuration status."""
        return {
            provider: config.is_configured() 
            for provider, config in self._providers.items()
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Export configuration as dictionary."""
        return {
            'providers': self.list_configured_providers(),
            'default_provider': self.get_default_provider(),
            'models': {p: self.get_model(p) for p in self.DEFAULT_MODELS},
            'priorities': {p: c.priority for p, c in self._providers.items()},
            'rate_limits': {p: c.rate_limit for p, c in self._providers.items()},
            'verbose': self.is_verbose(),
            'cache_dir': str(self.get_cache_dir()),
            'litellm_models': [
                {'name': m.model_name, 'model': m.litellm_model}
                for m in self._litellm_models
            ],
        }


def load_env():
    """Load environment variables from .env file."""
    LLMConfig()


def get_config() -> LLMConfig:
    """Get global configuration instance."""
    return LLMConfig()
