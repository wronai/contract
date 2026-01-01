"""
Base Pydantic Classes for Contract AI

Defines the foundational types and contracts used throughout the system.

@version 2.3.0
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field, EmailStr, HttpUrl, ConfigDict


# ============================================================================
# FIELD TYPES
# ============================================================================

class FieldType(str, Enum):
    """Supported field types in contracts"""
    UUID = "UUID"
    STRING = "String"
    TEXT = "Text"
    EMAIL = "Email"
    URL = "URL"
    PHONE = "Phone"
    INT = "Int"
    INTEGER = "Integer"
    FLOAT = "Float"
    DECIMAL = "Decimal"
    NUMBER = "Number"
    BOOLEAN = "Boolean"
    DATE = "Date"
    DATETIME = "DateTime"
    TIMESTAMP = "Timestamp"
    JSON = "JSON"
    ARRAY = "Array"


# ============================================================================
# BASE MODELS
# ============================================================================

class BaseEntity(BaseModel):
    """Base class for all entity models"""
    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
        extra="forbid",
    )


class BaseContract(BaseModel):
    """Base class for all contract definitions"""
    model_config = ConfigDict(
        populate_by_name=True,
        use_enum_values=True,
    )


# ============================================================================
# FIELD DEFINITIONS
# ============================================================================

class FieldAnnotations(BaseModel):
    """Annotations for entity fields"""
    required: bool = True
    unique: bool = False
    generated: bool = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    pattern: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    default: Optional[Any] = None
    description: Optional[str] = None


class EntityField(BaseModel):
    """Definition of a single entity field"""
    name: str = Field(..., min_length=1)
    type: FieldType
    annotations: Optional[FieldAnnotations] = None
    
    def to_typescript(self) -> str:
        """Convert field to TypeScript type"""
        type_map = {
            FieldType.UUID: "string",
            FieldType.STRING: "string",
            FieldType.TEXT: "string",
            FieldType.EMAIL: "string",
            FieldType.URL: "string",
            FieldType.PHONE: "string",
            FieldType.INT: "number",
            FieldType.INTEGER: "number",
            FieldType.FLOAT: "number",
            FieldType.DECIMAL: "number",
            FieldType.NUMBER: "number",
            FieldType.BOOLEAN: "boolean",
            FieldType.DATE: "string",
            FieldType.DATETIME: "string",
            FieldType.TIMESTAMP: "string",
            FieldType.JSON: "Record<string, unknown>",
            FieldType.ARRAY: "unknown[]",
        }
        return type_map.get(self.type, "unknown")


# ============================================================================
# ENTITY DEFINITION
# ============================================================================

class EntityDefinition(BaseModel):
    """Complete entity definition"""
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    fields: List[EntityField]
    
    def get_required_fields(self) -> List[EntityField]:
        """Get all required fields"""
        return [f for f in self.fields if f.annotations and f.annotations.required]
    
    def get_generated_fields(self) -> List[EntityField]:
        """Get all auto-generated fields"""
        return [f for f in self.fields if f.annotations and f.annotations.generated]


# ============================================================================
# APP DEFINITION
# ============================================================================

class AppDefinition(BaseModel):
    """Application metadata"""
    name: str = Field(..., min_length=1)
    version: str = "1.0.0"
    description: Optional[str] = None
    author: Optional[str] = None
    license: Optional[str] = None


# ============================================================================
# GENERATION LAYER
# ============================================================================

class GenerationInstruction(BaseModel):
    """Instruction for code generation"""
    target: Literal["api", "frontend", "shared", "docker"]
    template: Optional[str] = None
    description: str
    priority: int = Field(default=0, ge=0, le=100)


# ============================================================================
# VALIDATION LAYER
# ============================================================================

class AssertionCheck(BaseModel):
    """Check definition for assertions"""
    type: Literal[
        "file-exists",
        "file-contains",
        "file-not-contains",
        "exports-function",
        "exports-class",
        "has-error-handling",
        "has-validation",
    ]
    path: Optional[str] = None
    pattern: Optional[str] = None
    function_name: Optional[str] = Field(None, alias="functionName")
    class_name: Optional[str] = Field(None, alias="className")
    entity_name: Optional[str] = Field(None, alias="entityName")
    field_name: Optional[str] = Field(None, alias="fieldName")


class CodeAssertion(BaseModel):
    """Assertion for validating generated code"""
    id: str = Field(..., pattern=r"^A\d{3}$")
    description: str
    check: AssertionCheck
    severity: Literal["error", "warning"] = "error"
    error_message: str = Field(..., alias="errorMessage")


# ============================================================================
# COMPLETE CONTRACT
# ============================================================================

class DefinitionLayer(BaseModel):
    """Layer 1: What to build"""
    app: AppDefinition
    entities: List[EntityDefinition]


class GenerationLayer(BaseModel):
    """Layer 2: How to build"""
    instructions: List[GenerationInstruction] = []
    templates: Dict[str, str] = {}


class ValidationLayer(BaseModel):
    """Layer 3: How to validate"""
    assertions: List[CodeAssertion] = []
    tests: List[Dict[str, Any]] = []


class ContractMetadata(BaseModel):
    """Contract metadata"""
    version: str = "1.0.0"
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")


class ContractAI(BaseContract):
    """Complete Contract AI definition (3 layers)"""
    definition: DefinitionLayer
    generation: GenerationLayer
    validation: ValidationLayer
    metadata: Optional[ContractMetadata] = None
    
    def get_entity(self, name: str) -> Optional[EntityDefinition]:
        """Get entity by name"""
        for entity in self.definition.entities:
            if entity.name == name:
                return entity
        return None
    
    def get_all_entity_names(self) -> List[str]:
        """Get all entity names"""
        return [e.name for e in self.definition.entities]
