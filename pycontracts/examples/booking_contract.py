"""
Example 4: Booking Contract (Pydantic)
"""
from pydantic import BaseModel
from .notes_contract import (
    Definition, Generation, Validation, Entity, EntityField, 
    FieldAnnotations, ApiDefinition, ApiResource, AppDefinition,
    Instruction, TechStack, TechStackBackend, Assertion, AssertionCheck, Acceptance
)


class BookingContract(BaseModel):
    definition: Definition
    generation: Generation
    validation: Validation
    
    @classmethod
    def create_default(cls) -> "BookingContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="Booking System", version="1.0.0", description="Reservation management"),
                entities=[
                    Entity(name="Resource", fields=[
                        EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                        EntityField(name="name", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="type", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="pricePerHour", type="Float", annotations=FieldAnnotations(required=True)),
                    ]),
                    Entity(name="Booking", fields=[
                        EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                        EntityField(name="resourceId", type="UUID", annotations=FieldAnnotations(required=True)),
                        EntityField(name="customerEmail", type="Email", annotations=FieldAnnotations(required=True)),
                        EntityField(name="startTime", type="DateTime", annotations=FieldAnnotations(required=True)),
                        EntityField(name="endTime", type="DateTime", annotations=FieldAnnotations(required=True)),
                        EntityField(name="status", type="String", annotations=FieldAnnotations(required=True)),
                    ])
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="resources", entity="Resource"),
                    ApiResource(name="bookings", entity="Booking"),
                ])
            ),
            generation=Generation(
                instructions=[Instruction(target="api", priority="must", instruction="CRUD for resources and bookings")],
                techStack=TechStack(backend=TechStackBackend(port=3004))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


def create_booking_contract() -> BookingContract:
    return BookingContract.create_default()
