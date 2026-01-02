"""
Reclapp Models - Pydantic models for Contract AI

Replaces TypeScript types from src/core/contract-ai/types/
"""

from .definition import (
    FieldType,
    BasicFieldType,
    ExtendedFieldType,
    RelationType,
    FieldAnnotations,
    FieldDefinition,
    RelationDefinition,
    IndexDefinition,
    EntityDefinition,
    EventDefinition,
    WorkflowStepType,
    WorkflowStepDefinition,
    WorkflowDefinition,
    ApiOperation,
    ApiResourceDefinition,
    ApiEndpointDefinition,
    ApiDefinition,
    AppDefinition,
    DefinitionLayer,
)

from .generation import (
    InstructionPriority,
    Instruction,
    PatternType,
    Pattern,
    ConstraintType,
    Constraint,
    BackendTechStack,
    FrontendTechStack,
    DatabaseTechStack,
    TechStack,
    GenerationLayer,
)

from .validation import (
    AssertionType,
    Assertion,
    TestType,
    TestDefinition,
    StaticRule,
    QualityGate,
    AcceptanceCriteria,
    ValidationLayer,
)

from .contract import (
    ContractMetadata,
    ContractAI,
    is_valid_contract,
)

__all__ = [
    # Definition types
    "FieldType",
    "BasicFieldType", 
    "ExtendedFieldType",
    "RelationType",
    "FieldAnnotations",
    "FieldDefinition",
    "RelationDefinition",
    "IndexDefinition",
    "EntityDefinition",
    "EventDefinition",
    "WorkflowStepType",
    "WorkflowStepDefinition",
    "WorkflowDefinition",
    "ApiOperation",
    "ApiResourceDefinition",
    "ApiEndpointDefinition",
    "ApiDefinition",
    "AppDefinition",
    "DefinitionLayer",
    # Generation types
    "InstructionPriority",
    "Instruction",
    "PatternType",
    "Pattern",
    "ConstraintType",
    "Constraint",
    "BackendTechStack",
    "FrontendTechStack",
    "DatabaseTechStack",
    "TechStack",
    "GenerationLayer",
    # Validation types
    "AssertionType",
    "Assertion",
    "TestType",
    "TestDefinition",
    "StaticRule",
    "QualityGate",
    "AcceptanceCriteria",
    "ValidationLayer",
    # Contract
    "ContractMetadata",
    "ContractAI",
    "is_valid_contract",
]
