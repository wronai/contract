"""
LLM Provider Manager with priority-based routing and rate limiting.

Supports:
- Multi-provider fallback with priorities
- Rate limiting per provider
- Automatic failover
- Load balancing strategies

Usage:
    from pycontracts.llm.providers import ProviderManager
    
    manager = ProviderManager()
    response = manager.generate("Explain this code")

@version 2.3.0
"""

import os
import time
import threading
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum

from .config import LLMConfig, ProviderConfig
from .clients import (
    BaseLLMClient,
    get_client,
    PROVIDER_CLIENTS,
    GenerationResult,
)


class LoadBalanceStrategy(Enum):
    """Load balancing strategies."""
    PRIORITY = "priority"           # Use highest priority available
    ROUND_ROBIN = "round-robin"     # Rotate through providers
    LEAST_LOADED = "least-loaded"   # Use provider with lowest recent usage
    RANDOM = "random"               # Random selection


@dataclass
class RateLimitState:
    """Track rate limit state for a provider."""
    requests: List[float] = field(default_factory=list)
    window_seconds: int = 60
    max_requests: int = 60
    
    def is_limited(self) -> bool:
        """Check if rate limit is exceeded."""
        now = time.time()
        # Remove old requests outside the window
        self.requests = [t for t in self.requests if now - t < self.window_seconds]
        return len(self.requests) >= self.max_requests
    
    def record_request(self):
        """Record a new request."""
        self.requests.append(time.time())
    
    def time_until_available(self) -> float:
        """Get seconds until next request is allowed."""
        if not self.is_limited():
            return 0
        now = time.time()
        oldest = min(self.requests)
        return max(0, self.window_seconds - (now - oldest))


@dataclass
class ProviderStats:
    """Statistics for a provider."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    total_tokens: int = 0
    total_time_ms: int = 0
    last_error: Optional[str] = None
    last_error_time: Optional[float] = None
    
    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 1.0
        return self.successful_requests / self.total_requests
    
    @property
    def avg_response_time_ms(self) -> float:
        if self.successful_requests == 0:
            return 0
        return self.total_time_ms / self.successful_requests


class ProviderManager:
    """Manages multiple LLM providers with priorities and rate limiting."""
    
    def __init__(self, config: LLMConfig = None, 
                 strategy: LoadBalanceStrategy = LoadBalanceStrategy.PRIORITY):
        """Initialize provider manager.
        
        Args:
            config: LLM configuration (will be loaded if not provided)
            strategy: Load balancing strategy
        """
        self.config = config or LLMConfig()
        self.strategy = strategy
        
        # Rate limiting state per provider
        self._rate_limits: Dict[str, RateLimitState] = {}
        
        # Statistics per provider
        self._stats: Dict[str, ProviderStats] = defaultdict(ProviderStats)
        
        # Round-robin index
        self._rr_index = 0
        self._lock = threading.Lock()
        
        # Initialize rate limits from config
        for provider_config in self.config.get_configured_providers():
            self._rate_limits[provider_config.name] = RateLimitState(
                max_requests=provider_config.rate_limit,
                window_seconds=int(os.environ.get('PARALLEL_RATE_LIMIT_WINDOW_MS', 60000)) // 1000,
            )
        
        # Callback for events
        self._on_provider_switch: Optional[Callable[[str, str, str], None]] = None
        self._on_rate_limit: Optional[Callable[[str], None]] = None
    
    def set_callbacks(self, 
                      on_provider_switch: Callable[[str, str, str], None] = None,
                      on_rate_limit: Callable[[str], None] = None):
        """Set event callbacks.
        
        Args:
            on_provider_switch: Called when switching providers (from, to, reason)
            on_rate_limit: Called when rate limited (provider)
        """
        self._on_provider_switch = on_provider_switch
        self._on_rate_limit = on_rate_limit
    
    def _get_available_providers(self) -> List[ProviderConfig]:
        """Get list of available providers that aren't rate limited."""
        available = []
        for provider_config in self.config.get_configured_providers():
            rate_state = self._rate_limits.get(provider_config.name)
            if rate_state and rate_state.is_limited():
                if self._on_rate_limit:
                    self._on_rate_limit(provider_config.name)
                continue
            available.append(provider_config)
        return available
    
    def _select_provider(self, available: List[ProviderConfig]) -> Optional[ProviderConfig]:
        """Select a provider based on strategy."""
        if not available:
            return None
        
        if self.strategy == LoadBalanceStrategy.PRIORITY:
            # Already sorted by priority
            return available[0]
        
        elif self.strategy == LoadBalanceStrategy.ROUND_ROBIN:
            with self._lock:
                idx = self._rr_index % len(available)
                self._rr_index += 1
                return available[idx]
        
        elif self.strategy == LoadBalanceStrategy.LEAST_LOADED:
            # Select provider with fewest recent requests
            def recent_load(p: ProviderConfig) -> int:
                state = self._rate_limits.get(p.name)
                return len(state.requests) if state else 0
            return min(available, key=recent_load)
        
        elif self.strategy == LoadBalanceStrategy.RANDOM:
            import random
            return random.choice(available)
        
        return available[0]
    
    def _create_client(self, provider_config: ProviderConfig) -> BaseLLMClient:
        """Create a client for the given provider config."""
        client_class = PROVIDER_CLIENTS.get(provider_config.name)
        if not client_class:
            raise ValueError(f"Unknown provider: {provider_config.name}")
        
        kwargs = {
            'model': provider_config.model,
            'temperature': provider_config.temperature,
        }
        
        if provider_config.name == 'ollama':
            kwargs['host'] = provider_config.base_url
        elif provider_config.api_key:
            kwargs['api_key'] = provider_config.api_key
        
        return client_class(**kwargs)
    
    def generate(self, prompt: str, system: str = None, 
                 max_tokens: int = 4000,
                 preferred_provider: str = None) -> str:
        """Generate completion using best available provider.
        
        Args:
            prompt: The prompt to send
            system: Optional system message
            max_tokens: Maximum tokens to generate
            preferred_provider: Optional preferred provider name
        
        Returns:
            Generated text
        
        Raises:
            RuntimeError: If no providers are available
        """
        result = self.generate_with_metadata(
            prompt, system, max_tokens, preferred_provider
        )
        return result.content
    
    def generate_with_metadata(self, prompt: str, system: str = None,
                                max_tokens: int = 4000,
                                preferred_provider: str = None) -> GenerationResult:
        """Generate completion with full metadata.
        
        Args:
            prompt: The prompt to send
            system: Optional system message
            max_tokens: Maximum tokens to generate
            preferred_provider: Optional preferred provider name
        
        Returns:
            GenerationResult with content and metadata
        """
        available = self._get_available_providers()
        
        # Handle preferred provider
        if preferred_provider:
            preferred = [p for p in available if p.name == preferred_provider]
            if preferred:
                available = preferred + [p for p in available if p.name != preferred_provider]
        
        if not available:
            # Check if all providers are rate limited
            all_providers = self.config.get_configured_providers()
            if all_providers:
                # Find minimum wait time
                min_wait = float('inf')
                for p in all_providers:
                    state = self._rate_limits.get(p.name)
                    if state:
                        wait = state.time_until_available()
                        min_wait = min(min_wait, wait)
                raise RuntimeError(
                    f"All providers rate limited. Try again in {min_wait:.1f}s"
                )
            raise RuntimeError("No LLM providers configured")
        
        errors = []
        last_provider = None
        
        for provider_config in available:
            try:
                # Record rate limit
                rate_state = self._rate_limits.get(provider_config.name)
                if rate_state:
                    rate_state.record_request()
                
                # Create client and generate
                client = self._create_client(provider_config)
                
                if last_provider and self._on_provider_switch:
                    self._on_provider_switch(
                        last_provider, provider_config.name, 
                        errors[-1] if errors else "fallback"
                    )
                
                start_time = time.time()
                content = client.generate(prompt, system=system, max_tokens=max_tokens)
                elapsed_ms = int((time.time() - start_time) * 1000)
                
                # Update stats
                stats = self._stats[provider_config.name]
                stats.total_requests += 1
                stats.successful_requests += 1
                stats.total_time_ms += elapsed_ms
                
                return GenerationResult(
                    content=content,
                    model=provider_config.model,
                    provider=provider_config.name,
                    generation_time_ms=elapsed_ms,
                )
                
            except Exception as e:
                error_msg = str(e)
                errors.append(f"{provider_config.name}: {error_msg}")
                
                # Update stats
                stats = self._stats[provider_config.name]
                stats.total_requests += 1
                stats.failed_requests += 1
                stats.last_error = error_msg
                stats.last_error_time = time.time()
                
                last_provider = provider_config.name
                continue
        
        # All providers failed
        raise RuntimeError(
            f"All providers failed:\n" + "\n".join(f"  - {e}" for e in errors)
        )
    
    def chat(self, messages: List[Dict[str, str]], 
             max_tokens: int = 4000,
             preferred_provider: str = None) -> str:
        """Chat completion using best available provider."""
        # Extract system message if present
        system = None
        user_messages = []
        for msg in messages:
            if msg['role'] == 'system':
                system = msg['content']
            else:
                user_messages.append(f"{msg['role']}: {msg['content']}")
        
        prompt = '\n'.join(user_messages)
        return self.generate(prompt, system=system, max_tokens=max_tokens,
                           preferred_provider=preferred_provider)
    
    def get_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all providers."""
        return {
            name: {
                'total_requests': stats.total_requests,
                'successful_requests': stats.successful_requests,
                'failed_requests': stats.failed_requests,
                'success_rate': stats.success_rate,
                'avg_response_time_ms': stats.avg_response_time_ms,
                'last_error': stats.last_error,
            }
            for name, stats in self._stats.items()
        }
    
    def get_rate_limit_status(self) -> Dict[str, Dict[str, Any]]:
        """Get rate limit status for all providers."""
        return {
            name: {
                'current_requests': len(state.requests),
                'max_requests': state.max_requests,
                'window_seconds': state.window_seconds,
                'is_limited': state.is_limited(),
                'time_until_available': state.time_until_available(),
            }
            for name, state in self._rate_limits.items()
        }
    
    def list_providers(self) -> List[Dict[str, Any]]:
        """List all configured providers with their status."""
        result = []
        for provider_config in self.config.get_configured_providers():
            rate_state = self._rate_limits.get(provider_config.name)
            stats = self._stats.get(provider_config.name, ProviderStats())
            
            result.append({
                'name': provider_config.name,
                'model': provider_config.model,
                'priority': provider_config.priority,
                'enabled': provider_config.enabled,
                'is_configured': provider_config.is_configured(),
                'is_rate_limited': rate_state.is_limited() if rate_state else False,
                'success_rate': stats.success_rate,
                'avg_response_time_ms': stats.avg_response_time_ms,
            })
        
        return result


# Global manager instance
_global_manager: Optional[ProviderManager] = None


def get_manager(config: LLMConfig = None) -> ProviderManager:
    """Get or create global provider manager."""
    global _global_manager
    if _global_manager is None or config is not None:
        _global_manager = ProviderManager(config=config)
    return _global_manager


def generate(prompt: str, system: str = None, max_tokens: int = 4000,
             provider: str = None) -> str:
    """Generate completion using global manager.
    
    Args:
        prompt: The prompt to send
        system: Optional system message
        max_tokens: Maximum tokens to generate
        provider: Optional preferred provider
    
    Returns:
        Generated text
    """
    return get_manager().generate(prompt, system=system, max_tokens=max_tokens,
                                  preferred_provider=provider)


def chat(messages: List[Dict[str, str]], max_tokens: int = 4000,
         provider: str = None) -> str:
    """Chat completion using global manager."""
    return get_manager().chat(messages, max_tokens=max_tokens,
                             preferred_provider=provider)
