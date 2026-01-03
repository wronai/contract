#!/usr/bin/env python3
"""
Test script for LLM module - can run standalone without pydantic.

Usage:
    python pycontracts/llm/test_llm.py
"""

import sys
import os

# Add parent directory to path for standalone testing
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import modules directly (bypassing pycontracts/__init__.py)
from config import LLMConfig, ProviderConfig
from clients import (
    get_client, list_available_providers, 
    OllamaClient, OpenRouterClient, RECOMMENDED_MODELS
)


def test_config():
    """Test LLM configuration."""
    print("=" * 60)
    print("Testing LLM Configuration")
    print("=" * 60)
    
    config = LLMConfig()
    
    print("\n📋 Configured Providers:")
    for provider, configured in config.list_configured_providers().items():
        status = "✅" if configured else "❌"
        print(f"  {status} {provider}")
    
    print(f"\n🎯 Default Provider: {config.get_default_provider()}")
    
    print("\n📦 Models:")
    for provider in ['openrouter', 'openai', 'anthropic', 'groq', 'together', 'ollama']:
        print(f"  {provider}: {config.get_model(provider)}")
    
    print("\n⚙️ Full Config:")
    import json
    print(json.dumps(config.to_dict(), indent=2))


def test_clients():
    """Test LLM clients."""
    print("\n" + "=" * 60)
    print("Testing LLM Clients")
    print("=" * 60)
    
    print("\n🔍 Provider Availability:")
    for provider, available in list_available_providers().items():
        status = "✅ Available" if available else "❌ Not configured"
        print(f"  {provider}: {status}")
    
    print("\n📚 Recommended Models:")
    for provider, models in RECOMMENDED_MODELS.items():
        print(f"\n  {provider}:")
        for model, desc in models[:3]:
            print(f"    - {model}: {desc}")


def test_ollama():
    """Test Ollama client if available."""
    print("\n" + "=" * 60)
    print("Testing Ollama Client")
    print("=" * 60)
    
    client = OllamaClient()
    
    if not client.is_available():
        print("❌ Ollama not running at", client.host)
        return
    
    print(f"✅ Ollama running at {client.host}")
    
    models = client.list_models()
    print(f"\n📦 Available Models ({len(models)}):")
    for model in models[:10]:
        print(f"  - {model}")
    
    # Quick generation test
    print("\n🧪 Testing generation...")
    try:
        response = client.generate("Say 'Hello' in one word.", max_tokens=10)
        print(f"✅ Response: {response.strip()}")
    except Exception as e:
        print(f"❌ Generation failed: {e}")


def test_provider_manager():
    """Test provider manager."""
    print("\n" + "=" * 60)
    print("Testing Provider Manager")
    print("=" * 60)
    
    # Import providers module with absolute path handling
    try:
        from providers import ProviderManager, LoadBalanceStrategy
    except ImportError:
        # Fallback: create a simple manager using config and clients
        print("⚠️ Provider manager not available in standalone mode")
        print("   Run with: PYTHONPATH=. python -m pycontracts.llm.test_llm")
        return
    
    manager = ProviderManager()
    
    print("\n📊 Provider Status:")
    for p in manager.list_providers():
        status = "✅" if p['is_configured'] else "❌"
        limited = "🔒" if p['is_rate_limited'] else ""
        print(f"  {status} {p['name']} (priority: {p['priority']}) {limited}")
    
    print("\n⏱️ Rate Limit Status:")
    for name, status in manager.get_rate_limit_status().items():
        print(f"  {name}: {status['current_requests']}/{status['max_requests']} requests")


if __name__ == '__main__':
    test_config()
    test_clients()
    test_ollama()
    test_provider_manager()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
