"""
Base Pydantic models for Contract AI
"""
from pydantic import BaseModel, Field as PydanticField
from typing import List, Optional, Dict, Any
from enum import Enum


class FieldType(str, Enum):
    UUID = "UUID"
    STRING = "String"
    TEXT = "Text"
    INT = "Int"
    FLOAT = "Float"
    BOOLEAN = "Boolean"
    DATETIME = "DateTime"
    EMAIL = "Email"
    URL = "URL"
    PHONE = "Phone"
    MONEY = "Money"


class FieldAnnotations(BaseModel):
    required: bool = False
    generated: bool = False
    unique: bool = False
    min: Optional[int] = None
    max: Optional[int] = None
    default: Optional[Any] = None


class Field(BaseModel):
    name: str
    type: str
    annotations: FieldAnnotations = PydanticField(default_factory=FieldAnnotations)
    
    @classmethod
    def id(cls) -> "Field":
        return cls(name="id", type="UUID", annotations=FieldAnnotations(generated=True))
    
    @classmethod
    def created_at(cls) -> "Field":
        return cls(name="createdAt", type="DateTime", annotations=FieldAnnotations(generated=True))
    
    @classmethod
    def updated_at(cls) -> "Field":
        return cls(name="updatedAt", type="DateTime", annotations=FieldAnnotations(generated=True))
    
    @classmethod
    def string(cls, name: str, required: bool = True, **kwargs) -> "Field":
        return cls(name=name, type="String", annotations=FieldAnnotations(required=required, **kwargs))
    
    @classmethod
    def email(cls, name: str = "email", required: bool = True, unique: bool = True) -> "Field":
        return cls(name=name, type="Email", annotations=FieldAnnotations(required=required, unique=unique))


class Relation(BaseModel):
    name: str
    type: str  # ManyToOne, OneToMany, ManyToMany
    target: str
    foreignKey: Optional[str] = None


class Entity(BaseModel):
    name: str
    description: str = ""
    fields: List[Field]
    relations: List[Relation] = []
    
    @classmethod
    def with_timestamps(cls, name: str, fields: List[Field], **kwargs) -> "Entity":
        """Create entity with id, createdAt, updatedAt"""
        all_fields = [Field.id()] + fields + [Field.created_at(), Field.updated_at()]
        return cls(name=name, fields=all_fields, **kwargs)


class ApiResource(BaseModel):
    name: str
    entity: str
    operations: List[str] = ["list", "get", "create", "update", "delete"]


class ApiDefinition(BaseModel):
    version: str = "v1"
    prefix: str = "/api/v1"
    resources: List[ApiResource] = []


class AppDefinition(BaseModel):
    name: str
    version: str = "1.0.0"
    description: str = ""


class Definition(BaseModel):
    app: AppDefinition
    entities: List[Entity]
    api: ApiDefinition


class Instruction(BaseModel):
    target: str  # api, frontend, all
    priority: str  # must, should, may
    instruction: str


class TechStackBackend(BaseModel):
    runtime: str = "node"
    language: str = "typescript"
    framework: str = "express"
    port: int = 3000


class TechStack(BaseModel):
    backend: TechStackBackend = PydanticField(default_factory=TechStackBackend)


class Generation(BaseModel):
    instructions: List[Instruction] = []
    patterns: List[str] = []
    constraints: List[str] = []
    techStack: TechStack = PydanticField(default_factory=TechStack)


class AssertionCheck(BaseModel):
    type: str
    path: str


class Assertion(BaseModel):
    id: str
    check: AssertionCheck
    severity: str = "error"
    message: str


class Acceptance(BaseModel):
    testsPass: bool = True
    assertionsPass: bool = True


class Validation(BaseModel):
    assertions: List[Assertion] = []
    tests: List[str] = []
    staticRules: List[str] = []
    qualityGates: List[str] = []
    acceptance: Acceptance = PydanticField(default_factory=Acceptance)


class ContractBase(BaseModel):
    """Base Contract AI model"""
    definition: Definition
    generation: Generation = PydanticField(default_factory=Generation)
    validation: Validation = PydanticField(default_factory=Validation)
    
    def to_json(self) -> str:
        return self.model_dump_json(indent=2)
    
    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
