"""
Example 5: HR Contract (Pydantic)
"""
from pydantic import BaseModel
from .notes_contract import (
    Definition, Generation, Validation, Entity, EntityField, 
    FieldAnnotations, ApiDefinition, ApiResource, AppDefinition,
    Instruction, TechStack, TechStackBackend, Assertion, AssertionCheck, Acceptance
)


class HRContract(BaseModel):
    definition: Definition
    generation: Generation
    validation: Validation
    
    @classmethod
    def create_default(cls) -> "HRContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="HR System", version="1.0.0", description="Employee management"),
                entities=[
                    Entity(name="Employee", fields=[
                        EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                        EntityField(name="email", type="Email", annotations=FieldAnnotations(required=True, unique=True)),
                        EntityField(name="firstName", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="lastName", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="position", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="hireDate", type="DateTime", annotations=FieldAnnotations(required=True)),
                    ]),
                    Entity(name="Department", fields=[
                        EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                        EntityField(name="name", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="code", type="String", annotations=FieldAnnotations(required=True, unique=True)),
                    ])
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="employees", entity="Employee"),
                    ApiResource(name="departments", entity="Department"),
                ])
            ),
            generation=Generation(
                instructions=[Instruction(target="api", priority="must", instruction="CRUD for employees and departments")],
                techStack=TechStack(backend=TechStackBackend(port=3005))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


def create_hr_contract() -> HRContract:
    return HRContract.create_default()
