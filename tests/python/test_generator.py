"""
Tests for Reclapp Generator Module

Tests contract and code generation.
Run: pytest tests/python/test_generator.py -v
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
import json

import sys
sys.path.insert(0, 'src/python')

from reclapp.generator import (
    ContractGenerator,
    ContractGeneratorOptions,
    ContractGenerationResult,
    CodeGenerator,
    CodeGeneratorOptions,
    CodeGenerationResult,
    GeneratedFile,
    PromptBuilder,
    PromptTemplate,
)
from reclapp.generator.contract_generator import ContractValidationError
from reclapp.llm import LLMResponse


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def sample_contract():
    return {
        "definition": {
            "app": {"name": "Test App", "version": "1.0.0"},
            "entities": [
                {
                    "name": "User",
                    "fields": [
                        {"name": "id", "type": "UUID", "annotations": {"required": True}},
                        {"name": "email", "type": "Email", "annotations": {"required": True}},
                        {"name": "name", "type": "String"},
                        {"name": "createdAt", "type": "DateTime"},
                    ]
                }
            ],
            "api": {
                "version": "v1",
                "prefix": "/api/v1",
                "resources": [
                    {"name": "users", "entity": "User", "operations": ["list", "get", "create", "update", "delete"]}
                ]
            }
        },
        "generation": {
            "instructions": [],
            "techStack": {
                "backend": {
                    "runtime": "node",
                    "language": "typescript",
                    "framework": "express",
                    "port": 3000
                }
            }
        },
        "validation": {
            "assertions": [],
            "acceptance": {"testsPass": True}
        }
    }


@pytest.fixture
def mock_llm_client():
    client = MagicMock()
    client.generate = AsyncMock(return_value=LLMResponse(
        content=json.dumps({
            "definition": {
                "app": {"name": "Generated App", "version": "1.0.0"},
                "entities": [
                    {"name": "Item", "fields": [{"name": "id", "type": "UUID"}, {"name": "name", "type": "String"}]}
                ]
            },
            "generation": {"techStack": {"backend": {"port": 3000}}},
            "validation": {}
        }),
        model="test",
        provider="mock"
    ))
    return client


# ============================================================================
# CONTRACT GENERATOR OPTIONS TESTS
# ============================================================================

class TestContractGeneratorOptions:
    def test_default_options(self):
        options = ContractGeneratorOptions()
        assert options.max_attempts == 5
        assert options.temperature == 0.7
        assert options.verbose is False
        
    def test_custom_options(self):
        options = ContractGeneratorOptions(
            max_attempts=3,
            temperature=0.5,
            model="codellama",
            verbose=True
        )
        assert options.max_attempts == 3
        assert options.model == "codellama"


# ============================================================================
# CONTRACT VALIDATION ERROR TESTS
# ============================================================================

class TestContractValidationError:
    def test_basic_error(self):
        error = ContractValidationError(path="definition.app", message="Missing app")
        assert error.path == "definition.app"
        assert error.severity == "error"
        
    def test_warning(self):
        error = ContractValidationError(
            path="validation",
            message="No tests defined",
            severity="warning"
        )
        assert error.severity == "warning"


# ============================================================================
# CONTRACT GENERATION RESULT TESTS
# ============================================================================

class TestContractGenerationResult:
    def test_success_result(self, sample_contract):
        result = ContractGenerationResult(
            success=True,
            contract=sample_contract,
            attempts=1,
            tokens_used=500,
            time_ms=1000
        )
        assert result.success is True
        assert result.attempts == 1
        
    def test_failed_result(self):
        result = ContractGenerationResult(
            success=False,
            attempts=5,
            errors=[ContractValidationError(path="", message="Failed")]
        )
        assert result.success is False
        assert len(result.errors) == 1


# ============================================================================
# CONTRACT GENERATOR TESTS
# ============================================================================

class TestContractGenerator:
    def test_create_generator(self):
        generator = ContractGenerator()
        assert generator.options.max_attempts == 5
        
    def test_set_llm_client(self, mock_llm_client):
        generator = ContractGenerator()
        generator.set_llm_client(mock_llm_client)
        assert generator._llm_client is not None
        
    @pytest.mark.asyncio
    async def test_generate_success(self, mock_llm_client):
        generator = ContractGenerator(ContractGeneratorOptions(verbose=False))
        generator.set_llm_client(mock_llm_client)
        
        result = await generator.generate("Create a todo app")
        
        assert result.success is True
        assert result.contract is not None
        assert result.attempts >= 1
        
    @pytest.mark.asyncio
    async def test_generate_without_client(self):
        generator = ContractGenerator(ContractGeneratorOptions(max_attempts=1))
        
        result = await generator.generate("Create an app")
        # Without LLM client, generation should fail
        assert result.success is False
        assert len(result.errors) > 0
            
    def test_validate_contract_valid(self, sample_contract):
        generator = ContractGenerator()
        errors = generator._validate_contract(sample_contract)
        assert len(errors) == 0
        
    def test_validate_contract_missing_definition(self):
        generator = ContractGenerator()
        errors = generator._validate_contract({})
        assert any("definition" in e.path for e in errors)
        
    def test_validate_contract_missing_app(self):
        generator = ContractGenerator()
        errors = generator._validate_contract({
            "definition": {"entities": []},
            "generation": {},
            "validation": {}
        })
        assert any("app" in e.path for e in errors)
        
    def test_validate_contract_empty_entities(self):
        generator = ContractGenerator()
        errors = generator._validate_contract({
            "definition": {
                "app": {"name": "Test", "version": "1.0"},
                "entities": []
            },
            "generation": {},
            "validation": {}
        })
        assert any("entity" in e.message.lower() for e in errors)
        
    def test_parse_contract_from_json(self):
        generator = ContractGenerator()
        json_str = '{"definition": {"app": {"name": "Test"}}}'
        
        result = generator._parse_contract_from_response(json_str)
        assert result is not None
        assert result["definition"]["app"]["name"] == "Test"
        
    def test_parse_contract_from_markdown(self):
        generator = ContractGenerator()
        markdown = '```json\n{"definition": {"app": {"name": "Test"}}}\n```'
        
        result = generator._parse_contract_from_response(markdown)
        assert result is not None
        assert result["definition"]["app"]["name"] == "Test"


# ============================================================================
# CODE GENERATOR OPTIONS TESTS
# ============================================================================

class TestCodeGeneratorOptions:
    def test_default_options(self):
        options = CodeGeneratorOptions()
        assert options.output_dir == "./generated"
        assert options.dry_run is False
        
    def test_custom_options(self):
        options = CodeGeneratorOptions(
            output_dir="./my-app",
            verbose=True,
            dry_run=True
        )
        assert options.output_dir == "./my-app"
        assert options.dry_run is True


# ============================================================================
# GENERATED FILE TESTS
# ============================================================================

class TestGeneratedFile:
    def test_basic_file(self):
        file = GeneratedFile(
            path="src/index.ts",
            content="console.log('hello');",
            language="typescript"
        )
        assert file.path == "src/index.ts"
        assert "hello" in file.content


# ============================================================================
# CODE GENERATION RESULT TESTS
# ============================================================================

class TestCodeGenerationResult:
    def test_success_result(self):
        result = CodeGenerationResult(
            success=True,
            files=[
                GeneratedFile(path="index.ts", content="//", language="typescript")
            ],
            tokens_used=100,
            time_ms=500
        )
        assert result.success is True
        assert len(result.files) == 1


# ============================================================================
# CODE GENERATOR TESTS
# ============================================================================

class TestCodeGenerator:
    def test_create_generator(self):
        generator = CodeGenerator()
        assert generator.options.output_dir == "./generated"
        
    @pytest.mark.asyncio
    async def test_generate_files(self, sample_contract):
        generator = CodeGenerator(CodeGeneratorOptions(dry_run=True, verbose=False))
        
        result = await generator.generate(sample_contract)
        
        assert result.success is True
        assert len(result.files) > 0
        
        # Check package.json exists
        package_json = next((f for f in result.files if f.path == "package.json"), None)
        assert package_json is not None
        
    @pytest.mark.asyncio
    async def test_generate_entity_models(self, sample_contract):
        generator = CodeGenerator(CodeGeneratorOptions(dry_run=True))
        
        result = await generator.generate(sample_contract)
        
        # Check User model exists
        user_model = next((f for f in result.files if "user" in f.path.lower() and "model" in f.path.lower()), None)
        assert user_model is not None
        assert "interface User" in user_model.content
        
    @pytest.mark.asyncio
    async def test_generate_routes(self, sample_contract):
        generator = CodeGenerator(CodeGeneratorOptions(dry_run=True))
        
        result = await generator.generate(sample_contract)
        
        # Check User routes exist
        user_routes = next((f for f in result.files if "user" in f.path.lower() and "route" in f.path.lower()), None)
        assert user_routes is not None
        assert "Router" in user_routes.content
        
    def test_generate_package_json(self, sample_contract):
        generator = CodeGenerator()
        backend = sample_contract["generation"]["techStack"]["backend"]
        
        package = generator._generate_package_json("Test App", backend)
        parsed = json.loads(package)
        
        assert parsed["name"] == "test-app"
        assert "express" in parsed["dependencies"]
        
    def test_generate_entity_model(self, sample_contract):
        generator = CodeGenerator()
        entity = sample_contract["definition"]["entities"][0]
        
        model = generator._generate_entity_model(entity, "typescript")
        
        assert "interface User" in model
        assert "id" in model
        assert "email" in model
        
    def test_map_field_type(self):
        generator = CodeGenerator()
        
        assert generator._map_field_type("String") == "string"
        assert generator._map_field_type("Int") == "number"
        assert generator._map_field_type("Boolean") == "boolean"
        assert generator._map_field_type("UUID") == "string"
        assert generator._map_field_type("DateTime") == "Date"


# ============================================================================
# PROMPT BUILDER TESTS
# ============================================================================

class TestPromptBuilder:
    def test_create_builder(self):
        builder = PromptBuilder()
        assert builder.get_template("contract") is not None
        
    def test_build_contract_prompt(self):
        builder = PromptBuilder()
        prompt = builder.build_contract_prompt("Create a todo app")
        
        assert "system" in prompt
        assert "user" in prompt
        assert "todo app" in prompt["user"]
        
    def test_build_code_prompt(self):
        builder = PromptBuilder()
        prompt = builder.build_code_prompt("route", "User entity CRUD")
        
        assert "system" in prompt
        assert "route" in prompt["user"]
        
    def test_build_fix_prompt(self):
        builder = PromptBuilder()
        prompt = builder.build_fix_prompt(
            "const x = 1",
            ["Missing semicolon"]
        )
        
        assert "const x = 1" in prompt["user"]
        assert "Missing semicolon" in prompt["user"]
        
    def test_register_custom_template(self):
        builder = PromptBuilder()
        
        builder.register_template(PromptTemplate(
            name="custom",
            system="Custom system",
            user="Custom {var}",
            variables=["var"]
        ))
        
        template = builder.get_template("custom")
        assert template is not None
        assert template.system == "Custom system"
        
    def test_build_from_template(self):
        builder = PromptBuilder()
        
        builder.register_template(PromptTemplate(
            name="test",
            system="Test system",
            user="Hello {name}!",
            variables=["name"]
        ))
        
        prompt = builder.build_from_template("test", {"name": "World"})
        assert prompt["user"] == "Hello World!"
        
    def test_build_from_unknown_template(self):
        builder = PromptBuilder()
        
        with pytest.raises(ValueError, match="not found"):
            builder.build_from_template("unknown", {})


# ============================================================================
# PROMPT TEMPLATE TESTS
# ============================================================================

class TestPromptTemplate:
    def test_basic_template(self):
        template = PromptTemplate(
            name="test",
            system="System prompt",
            user="User prompt"
        )
        assert template.name == "test"
        assert template.variables == []
        
    def test_template_with_variables(self):
        template = PromptTemplate(
            name="test",
            system="System",
            user="{var1} and {var2}",
            variables=["var1", "var2"]
        )
        assert len(template.variables) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
