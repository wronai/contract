"""
Example 3: Inventory Contract (Pydantic)
"""
from pydantic import BaseModel
from .notes_contract import (
    Definition, Generation, Validation, Entity, EntityField, 
    FieldAnnotations, ApiDefinition, ApiResource, AppDefinition,
    Instruction, TechStack, TechStackBackend, Assertion, AssertionCheck, Acceptance
)


class InventoryContract(BaseModel):
    definition: Definition
    generation: Generation
    validation: Validation
    
    @classmethod
    def create_default(cls) -> "InventoryContract":
        return cls(
            definition=Definition(
                app=AppDefinition(name="Inventory", version="1.0.0", description="Product inventory management"),
                entities=[
                    Entity(name="Product", fields=[
                        EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                        EntityField(name="sku", type="String", annotations=FieldAnnotations(required=True, unique=True)),
                        EntityField(name="name", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="quantity", type="Int", annotations=FieldAnnotations(required=True)),
                        EntityField(name="price", type="Float", annotations=FieldAnnotations(required=True)),
                    ]),
                    Entity(name="Warehouse", fields=[
                        EntityField(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                        EntityField(name="name", type="String", annotations=FieldAnnotations(required=True)),
                        EntityField(name="location", type="String", annotations=FieldAnnotations(required=True)),
                    ])
                ],
                api=ApiDefinition(resources=[
                    ApiResource(name="products", entity="Product"),
                    ApiResource(name="warehouses", entity="Warehouse"),
                ])
            ),
            generation=Generation(
                instructions=[Instruction(target="api", priority="must", instruction="CRUD for products and warehouses")],
                techStack=TechStack(backend=TechStackBackend(port=3003))
            ),
            validation=Validation(
                assertions=[Assertion(id="A001", check=AssertionCheck(type="file-exists", path="api/src/server.ts"), message="Required")],
                acceptance=Acceptance()
            )
        )


def create_inventory_contract() -> InventoryContract:
    return InventoryContract.create_default()
