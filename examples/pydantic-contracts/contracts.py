"""
Pydantic Contract Examples
"""
try:
    from .base import (
        ContractBase, Definition, Generation, Validation,
        Entity, Field, FieldAnnotations, ApiDefinition, ApiResource,
        AppDefinition, Instruction, TechStack, TechStackBackend,
        Assertion, AssertionCheck, Acceptance
    )
except ImportError:
    from base import (
        ContractBase, Definition, Generation, Validation,
        Entity, Field, FieldAnnotations, ApiDefinition, ApiResource,
        AppDefinition, Instruction, TechStack, TechStackBackend,
        Assertion, AssertionCheck, Acceptance
    )


class NotesContract(ContractBase):
    """Simple Notes App"""
    
    @classmethod
    def create(cls, port: int = 3001) -> "NotesContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="Notes App", version="1.0.0", description="Simple notes application"),
                entities=[
                    Entity.with_timestamps("Note", [
                        Field.string("title"),
                        Field(name="content", type="Text", annotations=FieldAnnotations(required=True)),
                    ])
                ],
                api=ApiDefinition(resources=[ApiResource(name="notes", entity="Note")])
            ),
            generation=Generation(
                instructions=[
                    Instruction(target="api", priority="must", instruction="Create CRUD endpoints for notes with Express.js"),
                    Instruction(target="api", priority="must", instruction="Use in-memory storage"),
                ],
                techStack=TechStack(backend=TechStackBackend(port=port))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Server required")],
                acceptance=Acceptance()
            )
        )


class TodoContract(ContractBase):
    """Todo App with Tasks and Categories"""
    
    @classmethod
    def create(cls, port: int = 3002) -> "TodoContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="Todo App", version="1.0.0", description="Task management"),
                entities=[
                    Entity.with_timestamps("Task", [
                        Field.string("title"),
                        Field.string("status"),  # pending, in_progress, done
                        Field.string("priority"),  # low, medium, high
                        Field(name="dueDate", type="DateTime", annotations=FieldAnnotations(required=False)),
                    ]),
                    Entity.with_timestamps("Category", [
                        Field.string("name"),
                        Field(name="color", type="String", annotations=FieldAnnotations(required=False)),
                    ])
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="tasks", entity="Task"),
                    ApiResource(name="categories", entity="Category"),
                ])
            ),
            generation=Generation(
                instructions=[Instruction(target="api", priority="must", instruction="CRUD for tasks and categories")],
                techStack=TechStack(backend=TechStackBackend(port=port))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


class CRMContract(ContractBase):
    """CRM with Contacts, Companies, Deals"""
    
    @classmethod
    def create(cls, port: int = 3003) -> "CRMContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="CRM System", version="1.0.0", description="Customer Relationship Management"),
                entities=[
                    Entity.with_timestamps("Contact", [
                        Field.email(),
                        Field.string("firstName"),
                        Field.string("lastName"),
                        Field(name="phone", type="Phone", annotations=FieldAnnotations(required=False)),
                        Field(name="companyId", type="UUID", annotations=FieldAnnotations(required=False)),
                    ]),
                    Entity.with_timestamps("Company", [
                        Field.string("name"),
                        Field(name="industry", type="String", annotations=FieldAnnotations(required=False)),
                        Field(name="website", type="URL", annotations=FieldAnnotations(required=False)),
                    ]),
                    Entity.with_timestamps("Deal", [
                        Field.string("title"),
                        Field(name="value", type="Money", annotations=FieldAnnotations(required=True)),
                        Field.string("stage"),  # lead, qualified, proposal, won, lost
                        Field(name="contactId", type="UUID", annotations=FieldAnnotations(required=True)),
                    ])
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="contacts", entity="Contact"),
                    ApiResource(name="companies", entity="Company"),
                    ApiResource(name="deals", entity="Deal"),
                ])
            ),
            generation=Generation(
                instructions=[
                    Instruction(target="api", priority="must", instruction="CRUD for contacts, companies, deals"),
                    Instruction(target="api", priority="should", instruction="Validate email format"),
                ],
                techStack=TechStack(backend=TechStackBackend(port=port))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


class InventoryContract(ContractBase):
    """Inventory Management"""
    
    @classmethod
    def create(cls, port: int = 3004) -> "InventoryContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="Inventory", version="1.0.0", description="Product inventory management"),
                entities=[
                    Entity.with_timestamps("Product", [
                        Field(name="sku", type="String", annotations=FieldAnnotations(required=True, unique=True)),
                        Field.string("name"),
                        Field(name="quantity", type="Int", annotations=FieldAnnotations(required=True)),
                        Field(name="price", type="Float", annotations=FieldAnnotations(required=True)),
                    ]),
                    Entity.with_timestamps("Warehouse", [
                        Field.string("name"),
                        Field.string("location"),
                        Field(name="capacity", type="Int", annotations=FieldAnnotations(required=False)),
                    ])
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="products", entity="Product"),
                    ApiResource(name="warehouses", entity="Warehouse"),
                ])
            ),
            generation=Generation(
                instructions=[Instruction(target="api", priority="must", instruction="CRUD for products and warehouses")],
                techStack=TechStack(backend=TechStackBackend(port=port))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


class BookingContract(ContractBase):
    """Booking/Reservation System"""
    
    @classmethod
    def create(cls, port: int = 3005) -> "BookingContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="Booking System", version="1.0.0", description="Reservation management"),
                entities=[
                    Entity.with_timestamps("Resource", [
                        Field.string("name"),
                        Field.string("type"),  # room, table, service
                        Field(name="pricePerHour", type="Float", annotations=FieldAnnotations(required=True)),
                    ]),
                    Entity.with_timestamps("Booking", [
                        Field(name="resourceId", type="UUID", annotations=FieldAnnotations(required=True)),
                        Field.email("customerEmail"),
                        Field(name="startTime", type="DateTime", annotations=FieldAnnotations(required=True)),
                        Field(name="endTime", type="DateTime", annotations=FieldAnnotations(required=True)),
                        Field.string("status"),  # pending, confirmed, cancelled
                    ])
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="resources", entity="Resource"),
                    ApiResource(name="bookings", entity="Booking"),
                ])
            ),
            generation=Generation(
                instructions=[Instruction(target="api", priority="must", instruction="CRUD for resources and bookings")],
                techStack=TechStack(backend=TechStackBackend(port=port))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


# Test when run directly
if __name__ == "__main__":
    contracts = [
        ("Notes", NotesContract.create()),
        ("Todo", TodoContract.create()),
        ("CRM", CRMContract.create()),
        ("Inventory", InventoryContract.create()),
        ("Booking", BookingContract.create()),
    ]
    
    print("Pydantic Contract Examples\n")
    for name, contract in contracts:
        entities = [e.name for e in contract.definition.entities]
        port = contract.generation.techStack.backend.port
        print(f"✓ {name}: {entities} (port {port})")
    
    print("\nAll contracts valid!")
