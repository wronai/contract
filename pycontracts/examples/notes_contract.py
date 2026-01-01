"""
Example 1: Notes App Contract (Pydantic)
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class FieldAnnotations(BaseModel):
    required: bool = False
    generated: bool = False
    unique: bool = False
    min: Optional[int] = None
    max: Optional[int] = None


class EntityField(BaseModel):
    name: str
    type: str
    annotations: FieldAnnotations = Field(default_factory=FieldAnnotations)


class Entity(BaseModel):
    name: str
    description: str = ""
    fields: List[EntityField]


class ApiResource(BaseModel):
    name: str
    entity: str
    operations: List[str] = ["list", "get", "create", "update", "delete"]


class ApiDefinition(BaseModel):
    version: str = "v1"
    prefix: str = "/api/v1"
    resources: List[ApiResource]


class AppDefinition(BaseModel):
    name: str
    version: str = "1.0.0"
    description: str = ""


class Definition(BaseModel):
    app: AppDefinition
    entities: List[Entity]
    api: ApiDefinition


class Instruction(BaseModel):
    target: str
    priority: str  # must, should, may
    instruction: str


class TechStackBackend(BaseModel):
    runtime: str = "node"
    language: str = "typescript"
    framework: str = "express"
    port: int = 3000


class TechStack(BaseModel):
    backend: TechStackBackend


class Generation(BaseModel):
    instructions: List[Instruction]
    patterns: List[str] = []
    constraints: List[str] = []
    techStack: TechStack


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
    assertions: List[Assertion]
    tests: List[str] = []
    staticRules: List[str] = []
    qualityGates: List[str] = []
    acceptance: Acceptance


class NotesContract(BaseModel):
    """Simple Notes App Contract"""
    
    definition: Definition
    generation: Generation
    validation: Validation
    
    @classmethod
    def create_default(cls) -> "NotesContract":
        """Create default Notes contract"""
        return cls(
            definition=Definition(
                app=AppDefinition(
                    name="Simple Notes",
                    version="1.0.0",
                    description="Minimalistyczna aplikacja do notatek"
                ),
                entities=[
                    Entity(
                        name="Note",
                        description="A simple note",
                        fields=[
                            EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                            EntityField(name="title", type="String", annotations=FieldAnnotations(required=True, min=1, max=200)),
                            EntityField(name="content", type="Text", annotations=FieldAnnotations(required=True)),
                            EntityField(name="createdAt", type="DateTime", annotations=FieldAnnotations(generated=True)),
                            EntityField(name="updatedAt", type="DateTime", annotations=FieldAnnotations(generated=True)),
                        ]
                    )
                ],
                api=ApiDefinition(
                    version="v1",
                    prefix="/api/v1",
                    resources=[
                        ApiResource(name="notes", entity="Note")
                    ]
                )
            ),
            generation=Generation(
                instructions=[
                    Instruction(target="api", priority="must", instruction="Use Express.js with TypeScript. Create CRUD endpoints for notes."),
                    Instruction(target="api", priority="must", instruction="Use in-memory storage (Map<string, Note>) for simplicity."),
                ],
                techStack=TechStack(backend=TechStackBackend(port=3001))
            ),
            validation=Validation(
                assertions=[
                    Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Server file required"),
                ],
                acceptance=Acceptance()
            )
        )


# Convenience function
def create_notes_contract() -> NotesContract:
    return NotesContract.create_default()


if __name__ == "__main__":
    contract = create_notes_contract()
    print(contract.model_dump_json(indent=2))
