"""
Reclapp - AI-Native Declarative Platform (Python Implementation)

LLM-driven code generation with 3-layer Contract AI specification.

## Architecture

Contract AI consists of 3 layers:
- **Layer 1: Definition** - WHAT to implement (entities, events, API)
- **Layer 2: Generation** - HOW LLM should generate code (instructions, patterns, constraints)
- **Layer 3: Validation** - HOW to verify and WHEN code is ready (assertions, tests, quality gates)

## Usage

```python
from reclapp import ContractAI, ContractGenerator

generator = ContractGenerator(verbose=True)
result = await generator.generate("Create a CRM system with contacts and companies")

if result.success:
    print("Contract generated:", result.contract)
```

@version 2.2.0-python
"""

__version__ = "2.2.0"

from .models import (
    ContractAI,
    ContractMetadata,
    DefinitionLayer,
    GenerationLayer,
    ValidationLayer,
    AppDefinition,
    EntityDefinition,
    FieldDefinition,
    FieldAnnotations,
    RelationDefinition,
    EventDefinition,
    ApiDefinition,
    ApiResourceDefinition,
    WorkflowDefinition,
)

__all__ = [
    "__version__",
    "ContractAI",
    "ContractMetadata",
    "DefinitionLayer",
    "GenerationLayer",
    "ValidationLayer",
    "AppDefinition",
    "EntityDefinition",
    "FieldDefinition",
    "FieldAnnotations",
    "RelationDefinition",
    "EventDefinition",
    "ApiDefinition",
    "ApiResourceDefinition",
    "WorkflowDefinition",
]
