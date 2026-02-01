"""
Reclapp Validation Module

8-stage validation pipeline for generated code.

Stages:
1. Syntax - TypeScript/Python compile check
2. Schema - JSON schema validation
3. Assertions - Contract assertions verification
4. Static Analysis - ESLint-like rules
5. Tests - Generate & run tests
6. Quality - Coverage, complexity metrics
7. Security - Security vulnerability scan
8. Runtime - Docker deploy & test

Mirrors: src/core/contract-ai/validation/
@version 2.2.0
"""

from .pipeline import (
    ValidationPipeline,
    ValidationContext,
    ValidationStage,
    PipelineOptions,
    PipelineResult,
    StageResult,
)
from .stages import (
    create_syntax_validator,
    create_schema_validator,
    create_assertion_validator,
    create_static_analyzer,
    create_test_runner,
    create_quality_checker,
    create_security_scanner,
    create_runtime_validator,
)

__all__ = [
    "ValidationPipeline",
    "ValidationContext",
    "ValidationStage",
    "PipelineOptions",
    "PipelineResult",
    "StageResult",
    "create_syntax_validator",
    "create_schema_validator",
    "create_assertion_validator",
    "create_static_analyzer",
    "create_test_runner",
    "create_quality_checker",
    "create_security_scanner",
    "create_runtime_validator",
    "create_default_pipeline",
]


def create_default_pipeline(options: dict = None) -> "ValidationPipeline":
    """
    Create a configured validation pipeline with all stages.
    
    Args:
        options: Pipeline options
        
    Returns:
        Configured ValidationPipeline
    """
    pipeline = ValidationPipeline(**(options or {}))
    
    pipeline.register_stages([
        create_syntax_validator(),
        create_schema_validator(),
        create_assertion_validator(),
        create_static_analyzer(),
        create_test_runner(),
        create_quality_checker(),
        create_security_scanner(),
        create_runtime_validator(),
    ])
    
    return pipeline
