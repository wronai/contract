"""
Contract AI - Main Contract Model

Complete Contract AI specification combining all 3 layers.

Mirrors: src/core/contract-ai/types/index.ts
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .definition import DefinitionLayer
from .generation import GenerationLayer
from .validation import ValidationLayer


# ============================================================================
# CONTRACT METADATA
# ============================================================================

class ContractMetadata(BaseModel):
    """
    Contract metadata
    
    Example:
        metadata = ContractMetadata(
            version="1.0.0",
            author="John Doe",
            tags=["crm", "contacts"]
        )
    """
    version: str
    author: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.now, alias="created_at")
    updatedAt: datetime = Field(default_factory=datetime.now, alias="updated_at")
    tags: Optional[list[str]] = None
    source: Optional[Literal["llm-generated", "manual", "imported"]] = None
    sessionId: Optional[str] = Field(default=None, alias="session_id")
    
    model_config = {"populate_by_name": True}


# ============================================================================
# MAIN CONTRACT AI
# ============================================================================

class ContractAI(BaseModel):
    """
    Contract AI - complete specification for LLM code generation
    
    Contract AI is not just a data schema, but a full process specification:
    - WHAT to implement (definition)
    - HOW to generate (generation)
    - HOW to verify and WHEN ready (validation)
    
    Example:
        contract = ContractAI(
            definition=DefinitionLayer(
                app=AppDefinition(name="CRM System", version="1.0.0"),
                entities=[EntityDefinition(name="Contact", fields=[...])],
                api=ApiDefinition(version="v1", prefix="/api/v1", resources=[...])
            ),
            generation=GenerationLayer(
                instructions=[Instruction(target="api", priority=InstructionPriority.MUST, instruction="Use Express.js")],
                techStack=TechStack(backend=BackendTechStack(port=3000))
            ),
            validation=ValidationLayer(
                assertions=[Assertion(type=AssertionType.ENDPOINT_STATUS, target="/api/v1/contacts", expected=200)],
                acceptance=AcceptanceCriteria(testsPass=True, minCoverage=70)
            ),
            metadata=ContractMetadata(version="1.0.0")
        )
    """
    definition: DefinitionLayer
    generation: GenerationLayer
    validation: ValidationLayer
    metadata: Optional[ContractMetadata] = None


# ============================================================================
# TYPE GUARDS
# ============================================================================

def is_valid_contract(obj: object) -> bool:
    """
    Check if object is a valid ContractAI
    
    Args:
        obj: Object to check
        
    Returns:
        True if object is a valid ContractAI
    """
    if not isinstance(obj, dict):
        return False
    
    return (
        has_definition_layer(obj) and
        has_generation_layer(obj) and
        has_validation_layer(obj)
    )


def has_definition_layer(contract: dict) -> bool:
    """Check if contract has Definition layer"""
    definition = contract.get("definition")
    if not definition or not isinstance(definition, dict):
        return False
    
    app = definition.get("app")
    entities = definition.get("entities")
    
    # App must have name, entities must be a list
    if not isinstance(app, dict) or not isinstance(app.get("name"), str):
        return False
    if not isinstance(entities, list):
        return False
    
    return True


def has_generation_layer(contract: dict) -> bool:
    """Check if contract has Generation layer"""
    generation = contract.get("generation")
    # Empty dict {} is valid (has defaults), but None or non-dict is not
    if generation is None or not isinstance(generation, dict):
        return False
    return True


def has_validation_layer(contract: dict) -> bool:
    """Check if contract has Validation layer"""
    validation = contract.get("validation")
    # Empty dict {} is valid (has defaults), but None or non-dict is not
    if validation is None or not isinstance(validation, dict):
        return False
    return True


# ============================================================================
# FACTORY FUNCTIONS
# ============================================================================

def create_minimal_contract(
    name: str,
    version: str = "1.0.0",
    entities: Optional[list[dict]] = None
) -> ContractAI:
    """
    Create a minimal ContractAI with defaults
    
    Args:
        name: Application name
        version: Application version
        entities: List of entity definitions (dicts)
        
    Returns:
        ContractAI with minimal configuration
    """
    from .definition import AppDefinition, EntityDefinition, FieldDefinition, FieldAnnotations
    
    # Default entity if none provided
    if not entities:
        entities = [{
            "name": "Item",
            "fields": [
                {"name": "id", "type": "UUID", "annotations": {"generated": True}},
                {"name": "name", "type": "String", "annotations": {"required": True}},
                {"name": "createdAt", "type": "DateTime", "annotations": {"generated": True}},
            ]
        }]
    
    # Parse entities
    parsed_entities = []
    for e in entities:
        fields = [
            FieldDefinition(
                name=f["name"],
                type=f["type"],
                annotations=FieldAnnotations(**f.get("annotations", {})) if f.get("annotations") else None
            )
            for f in e.get("fields", [])
        ]
        parsed_entities.append(EntityDefinition(
            name=e["name"],
            description=e.get("description"),
            fields=fields
        ))
    
    return ContractAI(
        definition=DefinitionLayer(
            app=AppDefinition(name=name, version=version),
            entities=parsed_entities
        ),
        generation=GenerationLayer(),
        validation=ValidationLayer(),
        metadata=ContractMetadata(version=version)
    )
