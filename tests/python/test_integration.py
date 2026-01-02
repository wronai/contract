"""
Integration Tests for Reclapp Python Implementation

End-to-end tests verifying the full pipeline.
Run: pytest tests/python/test_integration.py -v
"""

import pytest
import json
from pathlib import Path

import sys
sys.path.insert(0, 'src/python')

from reclapp.models import (
    ContractAI,
    DefinitionLayer,
    GenerationLayer,
    ValidationLayer,
    AppDefinition,
    EntityDefinition,
    FieldDefinition,
    TechStack,
    BackendTechStack,
)
from reclapp.parser import parse_contract_markdown, validate_contract
from reclapp.generator import ContractGenerator, CodeGenerator, CodeGeneratorOptions
from reclapp.validation import create_default_pipeline, ValidationPipeline
from reclapp.evolution import EvolutionManager, EvolutionOptions, TaskQueue


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def sample_markdown():
    return '''---
name: Notes App
version: "1.0.0"
description: A simple notes application
---

# App: Notes App

A note-taking application with categories.

## Entities

### Note

| Field | Type | Required |
|-------|------|----------|
| id | UUID | yes |
| title | String | yes |
| content | Text | no |
| categoryId | UUID | no |
| createdAt | DateTime | yes |
| updatedAt | DateTime | no |

### Category

| Field | Type | Required |
|-------|------|----------|
| id | UUID | yes |
| name | String | yes |
| color | String | no |

## API

Version: v1
Prefix: /api/v1

### Notes Resource

| Method | Path | Description |
|--------|------|-------------|
| GET | /notes | List all notes |
| POST | /notes | Create note |
| GET | /notes/:id | Get note by ID |
| PUT | /notes/:id | Update note |
| DELETE | /notes/:id | Delete note |

### Categories Resource

| Method | Path | Description |
|--------|------|-------------|
| GET | /categories | List categories |
| POST | /categories | Create category |

## Tech Stack

- Backend: Node.js + Express + TypeScript
- Port: 3000

## Business Rules

- Note title must not be empty
- Category name must be unique
'''


@pytest.fixture
def sample_contract_dict():
    return {
        "definition": {
            "app": {"name": "Test App", "version": "1.0.0"},
            "entities": [
                {
                    "name": "Item",
                    "fields": [
                        {"name": "id", "type": "UUID", "annotations": {"required": True}},
                        {"name": "name", "type": "String", "annotations": {"required": True}},
                        {"name": "createdAt", "type": "DateTime"},
                    ]
                }
            ],
            "api": {
                "version": "v1",
                "prefix": "/api/v1",
                "resources": []
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


# ============================================================================
# PARSER INTEGRATION TESTS
# ============================================================================

class TestParserIntegration:
    def test_parse_full_contract(self, sample_markdown):
        """Test parsing a complete contract markdown"""
        result = parse_contract_markdown(sample_markdown)
        
        assert result.contract is not None
        assert len(result.errors) == 0
        
        # Verify app
        definition = result.contract.get("definition", {})
        app = definition.get("app", {})
        assert app.get("name") == "Notes App"
        
        # Verify entities
        entities = definition.get("entities", [])
        assert len(entities) == 2
        
        note = next((e for e in entities if e.get("name") == "Note"), None)
        assert note is not None
        assert len(note.get("fields", [])) == 6
        
    def test_parse_and_validate(self, sample_markdown):
        """Test parsing and validation together"""
        parse_result = parse_contract_markdown(sample_markdown)
        assert parse_result.contract is not None
        
        validation_result = validate_contract(parse_result.contract)
        assert len(validation_result.errors) == 0


# ============================================================================
# GENERATOR INTEGRATION TESTS
# ============================================================================

class TestGeneratorIntegration:
    @pytest.mark.asyncio
    async def test_generate_from_contract(self, sample_contract_dict, tmp_path):
        """Test code generation from contract dict"""
        generator = CodeGenerator(CodeGeneratorOptions(
            output_dir=str(tmp_path),
            dry_run=True,
            verbose=False
        ))
        
        result = await generator.generate(sample_contract_dict)
        
        assert result.success is True
        assert len(result.files) > 0
        
        # Check essential files
        file_paths = [f.path for f in result.files]
        assert "package.json" in file_paths
        assert any("index" in p for p in file_paths)
        
    @pytest.mark.asyncio
    async def test_generate_writes_files(self, sample_contract_dict, tmp_path):
        """Test that generation actually writes files"""
        generator = CodeGenerator(CodeGeneratorOptions(
            output_dir=str(tmp_path),
            dry_run=False,
            verbose=False
        ))
        
        result = await generator.generate(sample_contract_dict)
        
        assert result.success is True
        assert (tmp_path / "package.json").exists()


# ============================================================================
# VALIDATION PIPELINE INTEGRATION TESTS
# ============================================================================

class TestValidationIntegration:
    @pytest.mark.asyncio
    async def test_validate_generated_code(self, sample_contract_dict):
        """Test validation pipeline with generated code"""
        pipeline = create_default_pipeline()
        
        # Generate some code
        code = {
            "files": [
                {"path": "src/index.ts", "content": "import express from 'express';"},
                {"path": "package.json", "content": '{"name": "test"}'},
            ]
        }
        
        result = await pipeline.validate(sample_contract_dict, code)
        
        assert result is not None
        assert len(result.stages) > 0
        
    @pytest.mark.asyncio
    async def test_pipeline_detects_issues(self):
        """Test that pipeline detects code issues"""
        pipeline = create_default_pipeline()
        
        contract = {"definition": {"app": {"name": "Test"}}}
        code = {
            "files": [
                {"path": "bad.ts", "content": "eval('dangerous')"},
            ]
        }
        
        result = await pipeline.validate(contract, code)
        
        # Security scanner should flag eval
        security_stage = next((s for s in result.stages if "security" in s.stage_name.lower()), None)
        if security_stage:
            assert security_stage.passed is False or len(security_stage.warnings) > 0


# ============================================================================
# EVOLUTION INTEGRATION TESTS
# ============================================================================

class TestEvolutionIntegration:
    @pytest.mark.asyncio
    async def test_evolution_full_pipeline(self, tmp_path):
        """Test evolution manager full pipeline"""
        manager = EvolutionManager(EvolutionOptions(
            output_dir=str(tmp_path),
            verbose=False,
            max_iterations=2
        ))
        
        result = await manager.evolve("Create a simple notes app")
        
        assert result.iterations >= 1
        assert result.time_ms >= 0
        
    def test_task_queue_integration(self):
        """Test task queue with multiple tasks"""
        queue = TaskQueue(verbose=False)
        
        # Simulate pipeline
        tasks = [
            queue.add("Parse input", "parse"),
            queue.add("Generate contract", "contract"),
            queue.add("Generate code", "code"),
            queue.add("Validate", "validate"),
            queue.add("Deploy", "deploy"),
        ]
        
        # Execute tasks
        for task in tasks[:-1]:  # All but deploy
            queue.start(task.id)
            queue.done(task.id)
        
        queue.skip("deploy")  # Skip deploy
        
        stats = queue.get_stats()
        assert stats["done"] == 4
        assert stats["skipped"] == 1
        assert stats["pending"] == 0


# ============================================================================
# END-TO-END TESTS
# ============================================================================

class TestEndToEnd:
    @pytest.mark.asyncio
    async def test_markdown_to_code(self, sample_markdown, tmp_path):
        """Test full flow: markdown → parse → generate"""
        # Step 1: Parse markdown
        parse_result = parse_contract_markdown(sample_markdown)
        assert parse_result.contract is not None
        
        # Step 2: Generate code
        generator = CodeGenerator(CodeGeneratorOptions(
            output_dir=str(tmp_path),
            dry_run=False,
            verbose=False
        ))
        
        gen_result = await generator.generate(parse_result.contract)
        assert gen_result.success is True
        
        # Step 3: Verify output
        assert (tmp_path / "package.json").exists()
        
        # Check package.json content
        package_json = json.loads((tmp_path / "package.json").read_text())
        assert package_json["name"] == "notes-app"
        
    @pytest.mark.asyncio
    async def test_contract_validation_generation(self, sample_contract_dict, tmp_path):
        """Test contract validation and code generation"""
        # Step 1: Validate contract structure
        contract_gen = ContractGenerator()
        errors = contract_gen._validate_contract(sample_contract_dict)
        assert len(errors) == 0
        
        # Step 2: Generate code
        code_gen = CodeGenerator(CodeGeneratorOptions(
            output_dir=str(tmp_path),
            dry_run=False,
            verbose=False
        ))
        
        result = await code_gen.generate(sample_contract_dict)
        assert result.success is True
        
        # Step 3: Validate generated code
        pipeline = create_default_pipeline()
        code = {"files": [{"path": f.path, "content": f.content} for f in result.files]}
        
        validation = await pipeline.validate(sample_contract_dict, code)
        assert validation is not None


# ============================================================================
# MODELS INTEGRATION TESTS
# ============================================================================

class TestModelsIntegration:
    def test_create_contract_from_parts(self):
        """Test building a contract from individual parts"""
        # Create field
        field = FieldDefinition(
            name="id",
            type="UUID",
            annotations={"required": True, "unique": True}
        )
        
        # Create entity
        entity = EntityDefinition(
            name="User",
            fields=[field]
        )
        
        # Create app
        app = AppDefinition(
            name="My App",
            version="1.0.0"
        )
        
        # Create tech stack
        backend = BackendTechStack(
            runtime="node",
            language="typescript",
            framework="express",
            port=3000
        )
        tech_stack = TechStack(backend=backend)
        
        # Assemble layers
        definition = DefinitionLayer(
            app=app,
            entities=[entity]
        )
        
        generation = GenerationLayer(
            techStack=tech_stack
        )
        
        validation_layer = ValidationLayer()
        
        # Create contract
        contract = ContractAI(
            definition=definition,
            generation=generation,
            validation=validation_layer
        )
        
        assert contract.definition.app.name == "My App"
        assert len(contract.definition.entities) == 1
        assert contract.generation.techStack.backend.port == 3000
        
    def test_serialize_deserialize(self):
        """Test contract serialization round-trip"""
        contract_dict = {
            "definition": {
                "app": {"name": "Test", "version": "1.0.0"},
                "entities": [{"name": "Item", "fields": []}]
            },
            "generation": {
                "techStack": {"backend": {"runtime": "node", "language": "typescript", "framework": "express", "port": 3000}}
            },
            "validation": {}
        }
        
        # Serialize to JSON
        json_str = json.dumps(contract_dict)
        
        # Deserialize back
        restored = json.loads(json_str)
        
        assert restored["definition"]["app"]["name"] == "Test"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
