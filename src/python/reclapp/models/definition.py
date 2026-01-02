"""
Contract AI - Layer 1: Definition Types (CO)

Defines the STRUCTURE of the application - entities, events, workflow, API.

Mirrors: src/core/contract-ai/types/definition.ts
"""

from enum import Enum
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field


# ============================================================================
# FIELD TYPES
# ============================================================================

class BasicFieldType(str, Enum):
    """Basic field types supported by Contract AI"""
    STRING = "String"
    INT = "Int"
    FLOAT = "Float"
    BOOLEAN = "Boolean"
    UUID = "UUID"
    DATETIME = "DateTime"


class ExtendedFieldType(str, Enum):
    """Extended field types with validation"""
    EMAIL = "Email"
    URL = "URL"
    PHONE = "Phone"
    MONEY = "Money"
    JSON = "JSON"
    TEXT = "Text"


# All supported field types
FieldType = Union[BasicFieldType, ExtendedFieldType, str]


class RelationType(str, Enum):
    """Relation types between entities"""
    ONE_TO_ONE = "OneToOne"
    ONE_TO_MANY = "OneToMany"
    MANY_TO_ONE = "ManyToOne"
    MANY_TO_MANY = "ManyToMany"


# ============================================================================
# FIELD ANNOTATIONS
# ============================================================================

class FieldAnnotations(BaseModel):
    """
    Field annotations defining validation and behavior
    
    Example:
        annotations = FieldAnnotations(
            required=True,
            unique=True,
            pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        )
    """
    required: Optional[bool] = None
    unique: Optional[bool] = None
    generated: Optional[bool] = None
    default: Optional[Any] = None
    min: Optional[int] = None
    max: Optional[int] = None
    pattern: Optional[str] = None
    enum: Optional[list[str]] = None
    relation: Optional[str] = None
    description: Optional[str] = None


# ============================================================================
# FIELD DEFINITION
# ============================================================================

class FieldDefinition(BaseModel):
    """
    Entity field definition
    
    Example:
        field = FieldDefinition(
            name="email",
            type="Email",
            annotations=FieldAnnotations(required=True, unique=True)
        )
    """
    name: str
    type: str  # FieldType
    annotations: Optional[FieldAnnotations] = None


# ============================================================================
# RELATION DEFINITION
# ============================================================================

class RelationDefinition(BaseModel):
    """
    Relation definition between entities
    
    Example:
        relation = RelationDefinition(
            name="company",
            type=RelationType.MANY_TO_ONE,
            target="Company",
            foreignKey="companyId",
            onDelete="SET NULL"
        )
    """
    name: str
    type: RelationType
    target: str
    foreignKey: Optional[str] = Field(default=None, alias="foreign_key")
    onDelete: Optional[Literal["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"]] = Field(
        default=None, alias="on_delete"
    )
    onUpdate: Optional[Literal["CASCADE", "SET NULL", "RESTRICT", "NO ACTION"]] = Field(
        default=None, alias="on_update"
    )
    
    model_config = {"populate_by_name": True}


# ============================================================================
# INDEX DEFINITION
# ============================================================================

class IndexDefinition(BaseModel):
    """Database index definition"""
    name: str
    fields: list[str]
    unique: Optional[bool] = None


# ============================================================================
# ENTITY DEFINITION
# ============================================================================

class EntityDefinition(BaseModel):
    """
    Domain entity definition
    
    Example:
        entity = EntityDefinition(
            name="Contact",
            description="Customer contact information",
            fields=[
                FieldDefinition(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                FieldDefinition(name="email", type="Email", annotations=FieldAnnotations(required=True, unique=True)),
            ],
            relations=[
                RelationDefinition(name="company", type=RelationType.MANY_TO_ONE, target="Company")
            ]
        )
    """
    name: str
    description: Optional[str] = None
    fields: list[FieldDefinition]
    relations: Optional[list[RelationDefinition]] = None
    indexes: Optional[list[IndexDefinition]] = None
    tags: Optional[list[str]] = None


# ============================================================================
# EVENT DEFINITION
# ============================================================================

class EventDefinition(BaseModel):
    """
    Domain event definition
    
    Example:
        event = EventDefinition(
            name="ContactCreated",
            description="Emitted when a new contact is created",
            fields=[
                FieldDefinition(name="contactId", type="UUID", annotations=FieldAnnotations(required=True)),
            ],
            triggers=["api.contact.create", "import.contact"]
        )
    """
    name: str
    description: Optional[str] = None
    fields: list[FieldDefinition]
    triggers: Optional[list[str]] = None
    sourceEntity: Optional[str] = Field(default=None, alias="source_entity")
    
    model_config = {"populate_by_name": True}


# ============================================================================
# WORKFLOW DEFINITION
# ============================================================================

class WorkflowStepType(str, Enum):
    """Workflow step types"""
    ACTION = "action"
    CONDITION = "condition"
    PARALLEL = "parallel"
    LOOP = "loop"
    WAIT = "wait"
    NOTIFY = "notify"
    TRANSFORM = "transform"
    VALIDATE = "validate"


class WorkflowStepDefinition(BaseModel):
    """Workflow step definition"""
    id: str
    type: WorkflowStepType
    name: str
    description: Optional[str] = None
    config: Optional[dict[str, Any]] = None
    next: Optional[str] = None
    onError: Optional[str] = Field(default=None, alias="on_error")
    condition: Optional[str] = None
    
    model_config = {"populate_by_name": True}


class WorkflowDefinition(BaseModel):
    """
    Workflow definition
    
    Example:
        workflow = WorkflowDefinition(
            name="CustomerOnboarding",
            description="New customer onboarding process",
            trigger="ContactCreated",
            steps=[
                WorkflowStepDefinition(id="verify", type=WorkflowStepType.ACTION, name="Verify Email", next="welcome"),
                WorkflowStepDefinition(id="welcome", type=WorkflowStepType.NOTIFY, name="Send Welcome Email"),
            ]
        )
    """
    name: str
    description: Optional[str] = None
    version: Optional[str] = None
    trigger: Optional[str] = None
    schedule: Optional[str] = None
    steps: list[WorkflowStepDefinition]


# ============================================================================
# API DEFINITION
# ============================================================================

ApiOperation = Literal["list", "get", "create", "update", "delete"]


class ApiEndpointDefinition(BaseModel):
    """Custom endpoint definition"""
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    path: str
    description: Optional[str] = None
    requestBody: Optional[dict[str, Any]] = Field(default=None, alias="request_body")
    response: Optional[dict[str, Any]] = None
    
    model_config = {"populate_by_name": True}


class ApiResourceDefinition(BaseModel):
    """API resource definition"""
    name: str
    entity: str
    operations: list[ApiOperation]
    customEndpoints: Optional[list[ApiEndpointDefinition]] = Field(
        default=None, alias="custom_endpoints"
    )
    
    model_config = {"populate_by_name": True}


class ApiAuthentication(BaseModel):
    """API authentication configuration"""
    type: Literal["jwt", "api-key", "oauth2", "none"]
    config: Optional[dict[str, Any]] = None


class ApiDefinition(BaseModel):
    """
    API definition
    
    Example:
        api = ApiDefinition(
            version="v1",
            prefix="/api/v1",
            resources=[
                ApiResourceDefinition(name="contacts", entity="Contact", operations=["list", "get", "create", "update", "delete"]),
            ]
        )
    """
    version: str
    prefix: str
    resources: list[ApiResourceDefinition]
    authentication: Optional[ApiAuthentication] = None


# ============================================================================
# APP DEFINITION
# ============================================================================

class AppDefinition(BaseModel):
    """
    Application definition
    
    Example:
        app = AppDefinition(
            name="CRM System",
            version="1.0.0",
            description="Customer Relationship Management System"
        )
    """
    name: str
    version: str
    description: Optional[str] = None
    author: Optional[str] = None
    license: Optional[str] = None


# ============================================================================
# DEFINITION LAYER
# ============================================================================

class DefinitionLayer(BaseModel):
    """
    Layer 1: Definition - defines WHAT to implement
    
    Example:
        definition = DefinitionLayer(
            app=AppDefinition(name="CRM System", version="1.0.0"),
            entities=[
                EntityDefinition(name="Contact", fields=[...]),
            ],
            api=ApiDefinition(version="v1", prefix="/api/v1", resources=[...])
        )
    """
    app: AppDefinition
    entities: list[EntityDefinition]
    events: Optional[list[EventDefinition]] = None
    workflows: Optional[list[WorkflowDefinition]] = None
    api: Optional[ApiDefinition] = None
