"""
Tests for Reclapp LLM Module

Tests LLM providers and manager.
Run: pytest tests/python/test_llm.py -v
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

import sys
sys.path.insert(0, 'src/python')

from reclapp.llm import (
    LLMProvider,
    LLMResponse,
    GenerateOptions,
    OllamaClient,
    OllamaConfig,
    LLMManager,
)
from reclapp.llm.provider import LLMProviderStatus, LLMModelInfo


# ============================================================================
# GENERATE OPTIONS TESTS
# ============================================================================

class TestGenerateOptions:
    def test_default_options(self):
        opts = GenerateOptions(system="system", user="user")
        assert opts.temperature == 0.7
        assert opts.max_tokens == 4096
        assert opts.response_format == "text"
        
    def test_custom_options(self):
        opts = GenerateOptions(
            system="You are a coder",
            user="Write hello world",
            temperature=0.3,
            max_tokens=2048,
            response_format="json"
        )
        assert opts.temperature == 0.3
        assert opts.max_tokens == 2048
        assert opts.response_format == "json"


# ============================================================================
# LLM RESPONSE TESTS
# ============================================================================

class TestLLMResponse:
    def test_basic_response(self):
        response = LLMResponse(
            content="Hello!",
            model="mistral:7b",
            provider="ollama"
        )
        assert response.content == "Hello!"
        assert response.model == "mistral:7b"
        assert response.provider == "ollama"
        
    def test_full_response(self):
        response = LLMResponse(
            content="Generated code",
            model="codellama:7b",
            provider="ollama",
            tokens_used=150,
            duration_ms=2500,
            raw={"done": True}
        )
        assert response.tokens_used == 150
        assert response.duration_ms == 2500
        assert response.raw["done"] is True


# ============================================================================
# OLLAMA CONFIG TESTS
# ============================================================================

class TestOllamaConfig:
    def test_default_config(self):
        config = OllamaConfig()
        assert config.host == "http://localhost:11434"
        assert config.timeout == 120
        assert config.retries == 3
        
    def test_custom_config(self):
        config = OllamaConfig(
            host="http://ollama:11434",
            model="codellama:13b",
            timeout=60,
            retries=5
        )
        assert config.host == "http://ollama:11434"
        assert config.model == "codellama:13b"


# ============================================================================
# OLLAMA CLIENT TESTS (MOCKED)
# ============================================================================

class TestOllamaClientMocked:
    @pytest.mark.asyncio
    async def test_is_available_true(self):
        client = OllamaClient(OllamaConfig(model="test-model"))
        mock_response = MagicMock()
        mock_response.status_code = 200
        client._client.get = AsyncMock(return_value=mock_response)
        
        result = await client.is_available()
        assert result is True
        
    @pytest.mark.asyncio
    async def test_is_available_false(self):
        client = OllamaClient(OllamaConfig(model="test-model"))
        client._client.get = AsyncMock(side_effect=Exception("Connection refused"))
        
        result = await client.is_available()
        assert result is False
        
    @pytest.mark.asyncio
    async def test_list_models(self):
        client = OllamaClient(OllamaConfig(model="test-model"))
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "models": [
                {"name": "mistral:7b", "size": "4.1GB"},
                {"name": "codellama:7b", "size": "3.8GB"},
            ]
        }
        client._client.get = AsyncMock(return_value=mock_response)
        
        models = await client.list_models()
        assert len(models) == 2
        assert models[0].name == "mistral:7b"
        assert models[1].is_code_model is True  # codellama is a code model
        
    @pytest.mark.asyncio
    async def test_has_model_exact_match(self):
        client = OllamaClient(OllamaConfig(model="test-model"))
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "models": [{"name": "mistral:7b"}]
        }
        client._client.get = AsyncMock(return_value=mock_response)
        
        assert await client.has_model("mistral:7b") is True
        assert await client.has_model("llama:7b") is False
        
    @pytest.mark.asyncio
    async def test_generate_success(self):
        client = OllamaClient(OllamaConfig(model="test-model"))
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "response": "Hello, world!",
            "eval_count": 10,
            "done": True
        }
        client._client.post = AsyncMock(return_value=mock_response)
        
        response = await client.generate(GenerateOptions(
            system="You are helpful",
            user="Say hello"
        ))
        
        assert response.content == "Hello, world!"
        assert response.provider == "ollama"
        assert response.tokens_used == 10
        
    @pytest.mark.asyncio
    async def test_generate_model_not_found(self):
        client = OllamaClient(OllamaConfig(model="test-model"))
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "model not found"
        client._client.post = AsyncMock(return_value=mock_response)
        
        with pytest.raises(RuntimeError, match="not found"):
            await client.generate(GenerateOptions(
                system="test",
                user="test"
            ))


# ============================================================================
# LLM MODEL INFO TESTS
# ============================================================================

class TestLLMModelInfo:
    def test_basic_model(self):
        model = LLMModelInfo(name="mistral:7b")
        assert model.name == "mistral:7b"
        assert model.is_code_model is False
        
    def test_code_model(self):
        model = LLMModelInfo(name="codellama:7b", is_code_model=True)
        assert model.is_code_model is True


# ============================================================================
# LLM MANAGER TESTS (MOCKED)
# ============================================================================

class TestLLMManagerMocked:
    @pytest.mark.asyncio
    async def test_initialize(self):
        with patch.object(OllamaClient, 'is_available', new_callable=AsyncMock) as mock_avail:
            with patch.object(OllamaClient, 'list_models', new_callable=AsyncMock) as mock_models:
                mock_avail.return_value = True
                mock_models.return_value = [
                    LLMModelInfo(name="mistral:7b"),
                    LLMModelInfo(name="codellama:7b", is_code_model=True),
                ]
                
                manager = LLMManager()
                await manager.initialize()
                
                assert manager.is_available is True
                assert "ollama" in manager.providers
                assert manager.providers["ollama"].status == LLMProviderStatus.AVAILABLE
                
    @pytest.mark.asyncio
    async def test_initialize_ollama_unavailable(self):
        with patch.object(OllamaClient, 'is_available', new_callable=AsyncMock) as mock_avail:
            mock_avail.return_value = False
            
            manager = LLMManager()
            await manager.initialize()
            
            assert manager.providers["ollama"].status == LLMProviderStatus.UNAVAILABLE
            
    @pytest.mark.asyncio
    async def test_get_status(self):
        with patch.object(OllamaClient, 'is_available', new_callable=AsyncMock) as mock_avail:
            with patch.object(OllamaClient, 'list_models', new_callable=AsyncMock) as mock_models:
                mock_avail.return_value = True
                mock_models.return_value = [
                    LLMModelInfo(name="mistral:7b"),
                    LLMModelInfo(name="codellama:7b", is_code_model=True),
                ]
                
                manager = LLMManager()
                await manager.initialize()
                
                status = manager.get_status()
                assert "ollama" in status
                assert status["ollama"]["status"] == "available"
                assert status["ollama"]["models"] == 2
                assert status["ollama"]["code_models"] == 1
                
    @pytest.mark.asyncio
    async def test_generate_no_provider(self):
        with patch.object(OllamaClient, 'is_available', new_callable=AsyncMock) as mock_avail:
            mock_avail.return_value = False
            
            manager = LLMManager()
            await manager.initialize()
            
            with pytest.raises(RuntimeError, match="No LLM provider"):
                await manager.generate(GenerateOptions(system="test", user="test"))


# ============================================================================
# PROVIDER STATUS TESTS
# ============================================================================

class TestProviderStatus:
    def test_status_values(self):
        assert LLMProviderStatus.AVAILABLE.value == "available"
        assert LLMProviderStatus.UNAVAILABLE.value == "unavailable"
        assert LLMProviderStatus.NOT_CONFIGURED.value == "not_configured"
        assert LLMProviderStatus.ERROR.value == "error"


# ============================================================================
# INTEGRATION TESTS (OPTIONAL - REQUIRE RUNNING OLLAMA)
# ============================================================================

@pytest.mark.skipif(
    True,  # Set to False to run integration tests
    reason="Requires running Ollama instance"
)
class TestOllamaIntegration:
    @pytest.mark.asyncio
    async def test_real_ollama_connection(self):
        async with OllamaClient() as client:
            available = await client.is_available()
            if available:
                models = await client.list_models()
                assert len(models) > 0
                
    @pytest.mark.asyncio
    async def test_real_generate(self):
        async with OllamaClient(OllamaConfig(model="mistral:7b-instruct")) as client:
            if await client.is_available() and await client.has_model():
                response = await client.generate(GenerateOptions(
                    system="You are a helpful assistant. Be brief.",
                    user="Say 'Hello' and nothing else."
                ))
                assert "hello" in response.content.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
