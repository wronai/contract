"""
Tests for Reclapp Validation Module

Tests validation pipeline and stages.
Run: pytest tests/python/test_validation.py -v
"""

import pytest

import sys
sys.path.insert(0, 'src/python')

from reclapp.validation import (
    ValidationPipeline,
    ValidationContext,
    ValidationStage,
    PipelineOptions,
    PipelineResult,
    StageResult,
    create_syntax_validator,
    create_schema_validator,
    create_assertion_validator,
    create_static_analyzer,
    create_test_runner,
    create_quality_checker,
    create_security_scanner,
    create_runtime_validator,
    create_default_pipeline,
)
from reclapp.validation.pipeline import StageError, GeneratedCode


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
                        {"name": "id", "type": "UUID"},
                        {"name": "email", "type": "Email"},
                    ]
                }
            ]
        },
        "generation": {},
        "validation": {
            "assertions": [
                {"type": "file-exists", "target": "index.ts"},
                {"type": "file-contains", "target": "index.ts", "expected": "express"},
            ]
        }
    }


@pytest.fixture
def sample_code():
    return GeneratedCode(
        files={
            "index.ts": "import express from 'express';\nconst app = express();\napp.listen(3000);",
            "models/user.ts": "export interface User {\n  id: string;\n  email: string;\n}",
            "test/user.test.ts": "describe('User', () => {\n  it('should work', () => {});\n});",
        },
        entry_point="index.ts"
    )


# ============================================================================
# STAGE RESULT TESTS
# ============================================================================

class TestStageResult:
    def test_basic_result(self):
        result = StageResult(stage="test", passed=True)
        assert result.stage == "test"
        assert result.passed is True
        assert result.errors == []
        
    def test_result_with_errors(self):
        result = StageResult(
            stage="syntax",
            passed=False,
            errors=[
                StageError(message="Error 1", file="test.ts", line=1),
                StageError(message="Error 2"),
            ]
        )
        assert result.passed is False
        assert len(result.errors) == 2
        assert result.errors[0].file == "test.ts"


class TestStageError:
    def test_basic_error(self):
        error = StageError(message="Test error")
        assert error.message == "Test error"
        assert error.severity == "error"
        
    def test_full_error(self):
        error = StageError(
            message="Syntax error",
            file="index.ts",
            line=10,
            severity="warning",
            code="W001"
        )
        assert error.file == "index.ts"
        assert error.line == 10
        assert error.code == "W001"


# ============================================================================
# PIPELINE RESULT TESTS
# ============================================================================

class TestPipelineResult:
    def test_passed_result(self):
        result = PipelineResult(
            passed=True,
            stages=[
                StageResult(stage="syntax", passed=True),
                StageResult(stage="schema", passed=True),
            ],
            total_time_ms=100
        )
        assert result.passed is True
        assert len(result.stages) == 2
        
    def test_failed_result(self):
        result = PipelineResult(
            passed=False,
            stages=[
                StageResult(stage="syntax", passed=False, errors=[StageError(message="Error")]),
            ],
            errors_count=1
        )
        assert result.passed is False
        assert result.errors_count == 1


# ============================================================================
# VALIDATION CONTEXT TESTS
# ============================================================================

class TestValidationContext:
    def test_basic_context(self, sample_contract, sample_code):
        context = ValidationContext(
            contract=sample_contract,
            code=sample_code
        )
        assert context.contract["definition"]["app"]["name"] == "Test App"
        assert "index.ts" in context.code.files


# ============================================================================
# VALIDATION STAGE TESTS
# ============================================================================

class TestValidationStage:
    def test_stage_definition(self):
        def validator(ctx):
            return StageResult(stage="test", passed=True)
        
        stage = ValidationStage(
            name="test",
            validator=validator,
            critical=True,
            timeout=5000
        )
        assert stage.name == "test"
        assert stage.critical is True
        assert stage.timeout == 5000


# ============================================================================
# SYNTAX VALIDATOR TESTS
# ============================================================================

class TestSyntaxValidator:
    def test_create_validator(self):
        validator = create_syntax_validator()
        assert validator.name == "syntax"
        assert validator.critical is True
        
    def test_valid_syntax(self, sample_contract, sample_code):
        validator = create_syntax_validator()
        context = ValidationContext(contract=sample_contract, code=sample_code)
        
        result = validator.validator(context)
        assert result.stage == "syntax"
        # May have warnings but should pass
        
    def test_python_syntax_error(self, sample_contract):
        code = GeneratedCode(files={
            "main.py": "def foo(\n  print('hello')"  # Invalid Python
        })
        
        validator = create_syntax_validator()
        context = ValidationContext(contract=sample_contract, code=code)
        
        result = validator.validator(context)
        assert result.passed is False
        assert len(result.errors) > 0


# ============================================================================
# SCHEMA VALIDATOR TESTS
# ============================================================================

class TestSchemaValidator:
    def test_create_validator(self):
        validator = create_schema_validator()
        assert validator.name == "schema"
        assert validator.critical is False
        
    def test_schema_validation(self, sample_contract, sample_code):
        validator = create_schema_validator()
        context = ValidationContext(contract=sample_contract, code=sample_code)
        
        result = validator.validator(context)
        assert result.stage == "schema"


# ============================================================================
# ASSERTION VALIDATOR TESTS
# ============================================================================

class TestAssertionValidator:
    def test_create_validator(self):
        validator = create_assertion_validator()
        assert validator.name == "assertions"
        assert validator.critical is True
        
    def test_file_exists_assertion_pass(self, sample_contract, sample_code):
        validator = create_assertion_validator()
        context = ValidationContext(contract=sample_contract, code=sample_code)
        
        result = validator.validator(context)
        assert result.passed is True
        assert result.metrics["assertions_passed"] == 2
        
    def test_file_exists_assertion_fail(self, sample_contract):
        code = GeneratedCode(files={"other.ts": "// empty"})
        
        validator = create_assertion_validator()
        context = ValidationContext(contract=sample_contract, code=code)
        
        result = validator.validator(context)
        assert result.passed is False


# ============================================================================
# STATIC ANALYZER TESTS
# ============================================================================

class TestStaticAnalyzer:
    def test_create_analyzer(self):
        analyzer = create_static_analyzer()
        assert analyzer.name == "static-analysis"
        
    def test_detect_console_log(self, sample_contract):
        code = GeneratedCode(files={
            "index.ts": "console.log('debug');\nconst x = 1;"
        })
        
        analyzer = create_static_analyzer()
        context = ValidationContext(contract=sample_contract, code=code)
        
        result = analyzer.validator(context)
        assert len(result.warnings) > 0
        
    def test_detect_any_type(self, sample_contract):
        code = GeneratedCode(files={
            "index.ts": "const x: any = {};"
        })
        
        analyzer = create_static_analyzer()
        context = ValidationContext(contract=sample_contract, code=code)
        
        result = analyzer.validator(context)
        assert any("any" in w.message for w in result.warnings)


# ============================================================================
# TEST RUNNER TESTS
# ============================================================================

class TestTestRunner:
    def test_create_runner(self):
        runner = create_test_runner()
        assert runner.name == "tests"
        
    def test_find_test_files(self, sample_contract, sample_code):
        runner = create_test_runner()
        context = ValidationContext(contract=sample_contract, code=sample_code)
        
        result = runner.validator(context)
        assert result.metrics["test_files"] == 1


# ============================================================================
# QUALITY CHECKER TESTS
# ============================================================================

class TestQualityChecker:
    def test_create_checker(self):
        checker = create_quality_checker()
        assert checker.name == "quality"
        
    def test_count_lines(self, sample_contract, sample_code):
        checker = create_quality_checker()
        context = ValidationContext(contract=sample_contract, code=sample_code)
        
        result = checker.validator(context)
        assert result.metrics["total_lines"] > 0
        assert result.metrics["files_count"] == 3


# ============================================================================
# SECURITY SCANNER TESTS
# ============================================================================

class TestSecurityScanner:
    def test_create_scanner(self):
        scanner = create_security_scanner()
        assert scanner.name == "security"
        assert scanner.critical is True
        
    def test_detect_eval(self, sample_contract):
        code = GeneratedCode(files={
            "index.ts": "const result = eval(userInput);"
        })
        
        scanner = create_security_scanner()
        context = ValidationContext(contract=sample_contract, code=code)
        
        result = scanner.validator(context)
        assert len(result.warnings) > 0
        assert any("eval" in w.message for w in result.warnings)
        
    def test_detect_hardcoded_password(self, sample_contract):
        code = GeneratedCode(files={
            "config.ts": "const password = 'secret123';"
        })
        
        scanner = create_security_scanner()
        context = ValidationContext(contract=sample_contract, code=code)
        
        result = scanner.validator(context)
        assert any("password" in w.message.lower() for w in result.warnings)


# ============================================================================
# RUNTIME VALIDATOR TESTS
# ============================================================================

class TestRuntimeValidator:
    def test_create_validator(self):
        validator = create_runtime_validator()
        assert validator.name == "runtime"
        assert validator.critical is False
        
    def test_runtime_placeholder(self, sample_contract, sample_code):
        validator = create_runtime_validator()
        context = ValidationContext(contract=sample_contract, code=sample_code)
        
        result = validator.validator(context)
        assert result.passed is True


# ============================================================================
# PIPELINE TESTS
# ============================================================================

class TestValidationPipeline:
    def test_create_pipeline(self):
        pipeline = ValidationPipeline()
        assert pipeline.options.fail_fast is True
        assert pipeline.options.verbose is False
        
    def test_register_stage(self):
        pipeline = ValidationPipeline()
        pipeline.register_stage(create_syntax_validator())
        
        assert len(pipeline.stages) == 1
        assert pipeline.stages[0].name == "syntax"
        
    def test_register_multiple_stages(self):
        pipeline = ValidationPipeline()
        pipeline.register_stages([
            create_syntax_validator(),
            create_schema_validator(),
        ])
        
        assert len(pipeline.stages) == 2
        
    def test_get_stage_names(self):
        pipeline = ValidationPipeline()
        pipeline.register_stages([
            create_syntax_validator(),
            create_schema_validator(),
        ])
        
        names = pipeline.get_stage_names()
        assert names == ["syntax", "schema"]
        
    @pytest.mark.asyncio
    async def test_validate_all_pass(self, sample_contract, sample_code):
        pipeline = ValidationPipeline()
        pipeline.register_stages([
            create_syntax_validator(),
            create_schema_validator(),
        ])
        
        result = await pipeline.validate(sample_contract, sample_code)
        assert len(result.stages) == 2
        assert result.total_time_ms >= 0  # May be 0 if very fast
        
    @pytest.mark.asyncio
    async def test_validate_with_failure(self, sample_contract):
        code = GeneratedCode(files={
            "main.py": "def foo(\n  invalid"  # Syntax error
        })
        
        pipeline = ValidationPipeline(fail_fast=True)
        pipeline.register_stages([
            create_syntax_validator(),
            create_schema_validator(),
        ])
        
        result = await pipeline.validate(sample_contract, code)
        assert result.passed is False


# ============================================================================
# DEFAULT PIPELINE TESTS
# ============================================================================

class TestDefaultPipeline:
    def test_create_default_pipeline(self):
        pipeline = create_default_pipeline()
        
        assert len(pipeline.stages) == 8
        stage_names = pipeline.get_stage_names()
        assert "syntax" in stage_names
        assert "schema" in stage_names
        assert "assertions" in stage_names
        assert "security" in stage_names
        
    @pytest.mark.asyncio
    async def test_run_default_pipeline(self, sample_contract, sample_code):
        pipeline = create_default_pipeline({"verbose": False})
        
        result = await pipeline.validate(sample_contract, sample_code)
        assert len(result.stages) == 8


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
