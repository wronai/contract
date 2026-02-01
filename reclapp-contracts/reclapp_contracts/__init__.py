"""
Reclapp Contracts Module

Data models, parsers, and validation logic for Reclapp Contract AI.
"""

__version__ = "2.4.1"

from .models import (
    ContractAI,
    ContractMetadata,
    DefinitionLayer,
    GenerationLayer,
    ValidationLayer,
    AppDefinition,
    EntityDefinition,
    FieldDefinition,
    RelationDefinition,
    EventDefinition,
    ApiDefinition,
    ApiResourceDefinition,
    WorkflowDefinition,
)

__all__ = [
    "ContractAI",
    "ContractMetadata",
    "DefinitionLayer",
    "GenerationLayer",
    "ValidationLayer",
    "AppDefinition",
    "EntityDefinition",
    "FieldDefinition",
    "RelationDefinition",
    "EventDefinition",
    "ApiDefinition",
    "ApiResourceDefinition",
    "WorkflowDefinition",
    "__version__",
]
