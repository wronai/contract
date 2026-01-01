"""
Example 2: Todo App Contract (Pydantic)
"""
from pydantic import BaseModel
from typing import List
from .notes_contract import (
    Definition, Generation, Validation, Entity, EntityField, 
    FieldAnnotations, ApiDefinition, ApiResource, AppDefinition,
    Instruction, TechStack, TechStackBackend, Assertion, AssertionCheck, Acceptance
)


class TodoContract(BaseModel):
    """Todo App with Tasks and Categories"""
    
    definition: Definition
    generation: Generation
    validation: Validation
    
    @classmethod
    def create_default(cls) -> "TodoContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="Todo App", version="1.0.0", description="Task management"),
                entities=[
                    Entity(
                        name="Task",
                        description="A todo task",
                        fields=[
                            EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                            EntityField(name="title", type="String", annotations=FieldAnnotations(required=True)),
                            EntityField(name="status", type="String", annotations=FieldAnnotations(required=True)),
                            EntityField(name="priority", type="String", annotations=FieldAnnotations(required=True)),
                            EntityField(name="createdAt", type="DateTime", annotations=FieldAnnotations(generated=True)),
                        ]
                    ),
                    Entity(
                        name="Category",
                        description="Task category",
                        fields=[
                            EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                            EntityField(name="name", type="String", annotations=FieldAnnotations(required=True)),
                            EntityField(name="color", type="String", annotations=FieldAnnotations(required=False)),
                        ]
                    )
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="tasks", entity="Task"),
                    ApiResource(name="categories", entity="Category"),
                ])
            ),
            generation=Generation(
                instructions=[
                    Instruction(target="api", priority="must", instruction="Create CRUD for tasks and categories."),
                ],
                techStack=TechStack(backend=TechStackBackend(port=3002))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


def create_todo_contract() -> TodoContract:
    return TodoContract.create_default()
