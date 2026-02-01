"""
Tests for Pydantic Contract Examples
"""
import pytest
from contracts import (
    NotesContract, TodoContract, CRMContract,
    InventoryContract, BookingContract
)


class TestNotesContract:
    def test_create(self):
        contract = NotesContract.create()
        assert contract.definition.app.name == "Notes App"
        assert len(contract.definition.entities) == 1
        assert contract.definition.entities[0].name == "Note"
    
    def test_fields(self):
        contract = NotesContract.create()
        note = contract.definition.entities[0]
        field_names = [f.name for f in note.fields]
        assert "id" in field_names
        assert "title" in field_names
        assert "content" in field_names
        assert "createdAt" in field_names
    
    def test_to_json(self):
        contract = NotesContract.create()
        json_str = contract.to_json()
        assert "Notes App" in json_str
        assert "Note" in json_str


class TestTodoContract:
    def test_create(self):
        contract = TodoContract.create()
        assert len(contract.definition.entities) == 2
        entity_names = [e.name for e in contract.definition.entities]
        assert "Task" in entity_names
        assert "Category" in entity_names
    
    def test_custom_port(self):
        contract = TodoContract.create(port=4000)
        assert contract.generation.techStack.backend.port == 4000


class TestCRMContract:
    def test_create(self):
        contract = CRMContract.create()
        assert len(contract.definition.entities) == 3
        entity_names = [e.name for e in contract.definition.entities]
        assert "Contact" in entity_names
        assert "Company" in entity_names
        assert "Deal" in entity_names
    
    def test_api_resources(self):
        contract = CRMContract.create()
        resource_names = [r.name for r in contract.definition.api.resources]
        assert "contacts" in resource_names
        assert "companies" in resource_names
        assert "deals" in resource_names


class TestInventoryContract:
    def test_create(self):
        contract = InventoryContract.create()
        entity_names = [e.name for e in contract.definition.entities]
        assert "Product" in entity_names
        assert "Warehouse" in entity_names


class TestBookingContract:
    def test_create(self):
        contract = BookingContract.create()
        entity_names = [e.name for e in contract.definition.entities]
        assert "Resource" in entity_names
        assert "Booking" in entity_names


class TestAllContracts:
    @pytest.mark.parametrize("contract_cls", [
        NotesContract, TodoContract, CRMContract,
        InventoryContract, BookingContract
    ])
    def test_valid_structure(self, contract_cls):
        contract = contract_cls.create()
        assert contract.definition is not None
        assert contract.generation is not None
        assert contract.validation is not None
        assert len(contract.definition.entities) > 0
        assert len(contract.definition.api.resources) > 0
    
    @pytest.mark.parametrize("contract_cls", [
        NotesContract, TodoContract, CRMContract,
        InventoryContract, BookingContract
    ])
    def test_serialization(self, contract_cls):
        contract = contract_cls.create()
        # To JSON
        json_str = contract.to_json()
        assert len(json_str) > 100
        # To dict
        data = contract.to_dict()
        assert "definition" in data
        assert "generation" in data
        assert "validation" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
