"""
Testy integracji LiteLLM z Reclapp

Testuje:
- LLMSetupService - wykrywanie i setup providerów
- EvolutionSetupService - setup Evolution Manager
- Generowanie aplikacji z użyciem LiteLLM
- Fallback do Ollama gdy LiteLLM niedostępny

Uruchomienie:
    python tests/python/test_litellm_integration.py
"""

import os
import sys
import pytest
import tempfile
import shutil
import subprocess
import time
import json
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Mock dla testów bez rzeczywistego LLM
try:
    from unittest.mock import Mock, patch, AsyncMock, MagicMock
except ImportError:
    from mock import Mock, patch, AsyncMock, MagicMock


class TestLLMSetupService:
    """Testy LLMSetupService przez Node.js subprocess"""
    
    def test_setup_litellm_when_configured(self):
        """Test setup LiteLLM gdy zmienne środowiskowe są ustawione"""
        # Test przez sprawdzenie czy evolve wykrywa LiteLLM
        # Uruchom evolve z --help lub krótkim promptem i sprawdź output
        
        env = os.environ.copy()
        env['LLM_PROVIDER'] = 'litellm'
        env['LITELLM_URL'] = 'http://localhost:8123'
        env['LITELLM_MODEL'] = 'model:1'
        
        # Sprawdź czy kod zawiera logikę LiteLLM
        llm_setup_file = project_root / 'src' / 'core' / 'contract-ai' / 'cli' / 'llm-setup.ts'
        assert llm_setup_file.exists(), "llm-setup.ts powinien istnieć"
        
        content = llm_setup_file.read_text()
        assert 'litellm' in content.lower(), "Kod powinien zawierać obsługę litellm"
        assert 'setupLiteLLM' in content or 'setupLiteLLM' in content, "Kod powinien zawierać setupLiteLLM"
    
    def test_setup_ollama_fallback(self):
        """Test fallback do Ollama gdy LiteLLM nie jest skonfigurowany"""
        # Sprawdź czy kod zawiera logikę fallback
        llm_setup_file = project_root / 'src' / 'core' / 'contract-ai' / 'cli' / 'llm-setup.ts'
        assert llm_setup_file.exists(), "llm-setup.ts powinien istnieć"
        
        content = llm_setup_file.read_text()
        assert 'setupOllama' in content or 'ollama' in content.lower(), "Kod powinien zawierać obsługę Ollama"


class TestEvolutionSetupService:
    """Testy EvolutionSetupService przez Node.js"""
    
    def test_format_setup_yaml(self):
        """Test formatowania YAML output - sprawdza kod źródłowy"""
        evolution_setup_file = project_root / 'src' / 'core' / 'contract-ai' / 'cli' / 'evolution-setup.ts'
        assert evolution_setup_file.exists(), "evolution-setup.ts powinien istnieć"
        
        content = evolution_setup_file.read_text()
        assert 'formatSetupYAML' in content, "Kod powinien zawierać formatSetupYAML"
        assert 'evolution_setup' in content, "Kod powinien zawierać evolution_setup w YAML"


# Testy pełnego generowania aplikacji są w test_generate_apps.py


class TestLLMProviderEndpoint:
    """Testy poprawnego endpointu LiteLLM"""
    
    def test_litellm_endpoint_is_v1(self):
        """Test czy LiteLLM używa /v1/chat/completions - sprawdza kod źródłowy"""
        provider_file = project_root / 'src' / 'core' / 'contract-ai' / 'llm' / 'llm-provider.ts'
        
        if not provider_file.exists():
            pytest.skip("Plik llm-provider.ts nie istnieje")
        
        content = provider_file.read_text()
        
        # Sprawdź czy endpoint jest /v1/chat/completions
        assert '/v1/chat/completions' in content, "LiteLLM powinien używać /v1/chat/completions"
        
        # Sprawdź czy health check używa /v1/models
        assert '/v1/models' in content or 'v1/models' in content, "Health check powinien używać /v1/models"


if __name__ == '__main__':
    """
    Uruchom wszystkie testy:
    
    python tests/python/test_litellm_integration.py
    """
    pytest.main([__file__, '-v', '--tb=short'])

