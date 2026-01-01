"""
Pydantic Contracts - Single Source of Truth

This package defines all contract schemas using Pydantic v2.
These schemas are used to:
1. Validate LLM outputs
2. Generate JSON Schemas
3. Generate TypeScript types
4. Ensure type safety across the entire pipeline

@version 2.3.0
"""

from .base import (
    BaseEntity,
    BaseContract,
    FieldType,
    FieldAnnotations,
    EntityField,
    EntityDefinition,
    AppDefinition,
    GenerationInstruction,
    CodeAssertion,
    AssertionCheck,
)

from .entities import (
    Contact,
    Company,
    Deal,
    User,
    Task,
    Project,
)

from .llm import (
    LLMCodeOutput,
    GeneratedFile,
    ValidationResult,
    FeedbackItem,
)

__version__ = "2.3.0"
__all__ = [
    # Base
    "BaseEntity",
    "BaseContract",
    "FieldType",
    "FieldAnnotations",
    "EntityField",
    "EntityDefinition",
    "AppDefinition",
    "GenerationInstruction",
    "CodeAssertion",
    "AssertionCheck",
    # Entities
    "Contact",
    "Company",
    "Deal",
    "User",
    "Task",
    "Project",
    # LLM
    "LLMCodeOutput",
    "GeneratedFile",
    "ValidationResult",
    "FeedbackItem",
]
