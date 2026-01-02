"""
Tests for Reclapp Python Models

Mirrors TypeScript tests and verifies feature parity.
Run: pytest tests/python/test_models.py -v
"""

import pytest
from datetime import datetime

import sys
sys.path.insert(0, 'src/python')

from reclapp.models import (
    # Definition
    BasicFieldType,
    ExtendedFieldType,
    RelationType,
    FieldAnnotations,
    FieldDefinition,
    RelationDefinition,
    IndexDefinition,
    EntityDefinition,
    EventDefinition,
    WorkflowStepType,
    WorkflowStepDefinition,
    WorkflowDefinition,
    ApiResourceDefinition,
    ApiDefinition,
    AppDefinition,
    DefinitionLayer,
    # Generation
    InstructionPriority,
    Instruction,
    PatternType,
    Pattern,
    ConstraintType,
    Constraint,
    BackendTechStack,
    FrontendTechStack,
    DatabaseTechStack,
    TechStack,
    GenerationLayer,
    # Validation
    AssertionType,
    Assertion,
    TestType,
    TestDefinition,
    StaticRule,
    QualityGate,
    AcceptanceCriteria,
    ValidationLayer,
    # Contract
    ContractMetadata,
    ContractAI,
    is_valid_contract,
)


# ============================================================================
# DEFINITION LAYER TESTS
# ============================================================================

class TestFieldTypes:
    def test_basic_field_types(self):
        assert BasicFieldType.STRING.value == "String"
        assert BasicFieldType.INT.value == "Int"
        assert BasicFieldType.UUID.value == "UUID"
        assert BasicFieldType.DATETIME.value == "DateTime"
        
    def test_extended_field_types(self):
        assert ExtendedFieldType.EMAIL.value == "Email"
        assert ExtendedFieldType.URL.value == "URL"
        assert ExtendedFieldType.MONEY.value == "Money"
        
    def test_relation_types(self):
        assert RelationType.ONE_TO_ONE.value == "OneToOne"
        assert RelationType.ONE_TO_MANY.value == "OneToMany"
        assert RelationType.MANY_TO_ONE.value == "ManyToOne"
        assert RelationType.MANY_TO_MANY.value == "ManyToMany"


class TestFieldAnnotations:
    def test_empty_annotations(self):
        annotations = FieldAnnotations()
        assert annotations.required is None
        assert annotations.unique is None
        
    def test_full_annotations(self):
        annotations = FieldAnnotations(
            required=True,
            unique=True,
            min=1,
            max=100,
            pattern=r"^[a-z]+$",
            enum=["a", "b", "c"],
            description="Test field"
        )
        assert annotations.required is True
        assert annotations.unique is True
        assert annotations.min == 1
        assert annotations.max == 100
        assert annotations.pattern == r"^[a-z]+$"
        assert annotations.enum == ["a", "b", "c"]


class TestFieldDefinition:
    def test_simple_field(self):
        field = FieldDefinition(name="email", type="Email")
        assert field.name == "email"
        assert field.type == "Email"
        assert field.annotations is None
        
    def test_field_with_annotations(self):
        field = FieldDefinition(
            name="email",
            type="Email",
            annotations=FieldAnnotations(required=True, unique=True)
        )
        assert field.annotations.required is True
        assert field.annotations.unique is True


class TestRelationDefinition:
    def test_simple_relation(self):
        relation = RelationDefinition(
            name="company",
            type=RelationType.MANY_TO_ONE,
            target="Company"
        )
        assert relation.name == "company"
        assert relation.type == RelationType.MANY_TO_ONE
        assert relation.target == "Company"
        
    def test_relation_with_foreign_key(self):
        relation = RelationDefinition(
            name="company",
            type=RelationType.MANY_TO_ONE,
            target="Company",
            foreignKey="companyId",
            onDelete="CASCADE"
        )
        assert relation.foreignKey == "companyId"
        assert relation.onDelete == "CASCADE"


class TestEntityDefinition:
    def test_simple_entity(self):
        entity = EntityDefinition(
            name="Contact",
            fields=[
                FieldDefinition(name="id", type="UUID"),
                FieldDefinition(name="email", type="Email"),
            ]
        )
        assert entity.name == "Contact"
        assert len(entity.fields) == 2
        
    def test_entity_with_relations(self):
        entity = EntityDefinition(
            name="Contact",
            description="Customer contact",
            fields=[
                FieldDefinition(name="id", type="UUID"),
            ],
            relations=[
                RelationDefinition(name="company", type=RelationType.MANY_TO_ONE, target="Company")
            ],
            tags=["crm", "customer"]
        )
        assert entity.description == "Customer contact"
        assert len(entity.relations) == 1
        assert entity.tags == ["crm", "customer"]


class TestEventDefinition:
    def test_simple_event(self):
        event = EventDefinition(
            name="ContactCreated",
            fields=[
                FieldDefinition(name="contactId", type="UUID"),
            ]
        )
        assert event.name == "ContactCreated"
        assert len(event.fields) == 1
        
    def test_event_with_triggers(self):
        event = EventDefinition(
            name="ContactCreated",
            description="Emitted when contact is created",
            fields=[
                FieldDefinition(name="contactId", type="UUID"),
            ],
            triggers=["api.contact.create"],
            sourceEntity="Contact"
        )
        assert event.triggers == ["api.contact.create"]
        assert event.sourceEntity == "Contact"


class TestWorkflowDefinition:
    def test_simple_workflow(self):
        workflow = WorkflowDefinition(
            name="Onboarding",
            steps=[
                WorkflowStepDefinition(id="step1", type=WorkflowStepType.ACTION, name="Step 1"),
            ]
        )
        assert workflow.name == "Onboarding"
        assert len(workflow.steps) == 1
        
    def test_workflow_with_trigger(self):
        workflow = WorkflowDefinition(
            name="Onboarding",
            trigger="ContactCreated",
            steps=[
                WorkflowStepDefinition(id="verify", type=WorkflowStepType.ACTION, name="Verify", next="welcome"),
                WorkflowStepDefinition(id="welcome", type=WorkflowStepType.NOTIFY, name="Welcome"),
            ]
        )
        assert workflow.trigger == "ContactCreated"
        assert workflow.steps[0].next == "welcome"


class TestApiDefinition:
    def test_simple_api(self):
        api = ApiDefinition(
            version="v1",
            prefix="/api/v1",
            resources=[
                ApiResourceDefinition(name="contacts", entity="Contact", operations=["list", "get", "create"])
            ]
        )
        assert api.version == "v1"
        assert api.prefix == "/api/v1"
        assert len(api.resources) == 1
        assert "create" in api.resources[0].operations


class TestAppDefinition:
    def test_simple_app(self):
        app = AppDefinition(name="CRM", version="1.0.0")
        assert app.name == "CRM"
        assert app.version == "1.0.0"
        
    def test_full_app(self):
        app = AppDefinition(
            name="CRM System",
            version="1.0.0",
            description="Customer Relationship Management",
            author="John Doe",
            license="MIT"
        )
        assert app.description == "Customer Relationship Management"
        assert app.author == "John Doe"


class TestDefinitionLayer:
    def test_minimal_definition(self):
        definition = DefinitionLayer(
            app=AppDefinition(name="App", version="1.0.0"),
            entities=[
                EntityDefinition(name="Item", fields=[FieldDefinition(name="id", type="UUID")])
            ]
        )
        assert definition.app.name == "App"
        assert len(definition.entities) == 1
        
    def test_full_definition(self):
        definition = DefinitionLayer(
            app=AppDefinition(name="CRM", version="1.0.0"),
            entities=[
                EntityDefinition(name="Contact", fields=[FieldDefinition(name="id", type="UUID")])
            ],
            events=[
                EventDefinition(name="ContactCreated", fields=[FieldDefinition(name="id", type="UUID")])
            ],
            api=ApiDefinition(
                version="v1",
                prefix="/api/v1",
                resources=[ApiResourceDefinition(name="contacts", entity="Contact", operations=["list"])]
            )
        )
        assert len(definition.events) == 1
        assert definition.api is not None


# ============================================================================
# GENERATION LAYER TESTS
# ============================================================================

class TestInstruction:
    def test_instruction(self):
        instruction = Instruction(
            target="api",
            priority=InstructionPriority.MUST,
            instruction="Use Express.js with TypeScript"
        )
        assert instruction.target == "api"
        assert instruction.priority == InstructionPriority.MUST
        
    def test_instruction_priorities(self):
        assert InstructionPriority.MUST.value == "must"
        assert InstructionPriority.SHOULD.value == "should"
        assert InstructionPriority.MAY.value == "may"
        assert InstructionPriority.MUST_NOT.value == "must-not"


class TestPattern:
    def test_pattern(self):
        pattern = Pattern(
            name="Repository",
            type=PatternType.REPOSITORY,
            description="Data access layer"
        )
        assert pattern.name == "Repository"
        assert pattern.type == PatternType.REPOSITORY


class TestConstraint:
    def test_constraint(self):
        constraint = Constraint(
            type=ConstraintType.SECURITY,
            name="Input Validation",
            description="Validate all inputs"
        )
        assert constraint.type == ConstraintType.SECURITY
        assert constraint.enforcement == "required"


class TestTechStack:
    def test_default_tech_stack(self):
        tech = TechStack()
        assert tech.backend.runtime == "node"
        assert tech.backend.language == "typescript"
        assert tech.backend.framework == "express"
        assert tech.backend.port == 3000
        
    def test_custom_tech_stack(self):
        tech = TechStack(
            backend=BackendTechStack(runtime="python", language="python", framework="fastapi", port=8000),
            frontend=FrontendTechStack(framework="vue", language="typescript"),
            database=DatabaseTechStack(type="postgresql")
        )
        assert tech.backend.runtime == "python"
        assert tech.frontend.framework == "vue"
        assert tech.database.type == "postgresql"


class TestGenerationLayer:
    def test_empty_generation(self):
        generation = GenerationLayer()
        assert generation.instructions == []
        assert generation.patterns == []
        assert generation.constraints == []
        
    def test_full_generation(self):
        generation = GenerationLayer(
            instructions=[
                Instruction(target="api", priority=InstructionPriority.MUST, instruction="Use Express")
            ],
            patterns=[
                Pattern(name="Repository", type=PatternType.REPOSITORY)
            ],
            techStack=TechStack(backend=BackendTechStack(port=4000))
        )
        assert len(generation.instructions) == 1
        assert generation.techStack.backend.port == 4000


# ============================================================================
# VALIDATION LAYER TESTS
# ============================================================================

class TestAssertion:
    def test_assertion(self):
        assertion = Assertion(
            type=AssertionType.ENDPOINT_STATUS,
            target="/api/v1/contacts",
            expected=200
        )
        assert assertion.type == AssertionType.ENDPOINT_STATUS
        assert assertion.expected == 200
        assert assertion.severity == "error"


class TestTestDefinition:
    def test_test_definition(self):
        test = TestDefinition(
            name="Contact CRUD",
            type=TestType.API,
            entity="Contact"
        )
        assert test.name == "Contact CRUD"
        assert test.type == TestType.API


class TestQualityGate:
    def test_quality_gate(self):
        gate = QualityGate(
            name="Coverage",
            metric="coverage",
            threshold=70
        )
        assert gate.name == "Coverage"
        assert gate.threshold == 70
        assert gate.operator == "gte"


class TestAcceptanceCriteria:
    def test_default_acceptance(self):
        acceptance = AcceptanceCriteria()
        assert acceptance.testsPass is True
        assert acceptance.noErrors is True
        
    def test_custom_acceptance(self):
        acceptance = AcceptanceCriteria(
            testsPass=True,
            minCoverage=80,
            lintClean=True
        )
        assert acceptance.minCoverage == 80
        assert acceptance.lintClean is True


class TestValidationLayer:
    def test_empty_validation(self):
        validation = ValidationLayer()
        assert validation.assertions == []
        assert validation.tests == []
        
    def test_full_validation(self):
        validation = ValidationLayer(
            assertions=[
                Assertion(type=AssertionType.ENDPOINT_STATUS, target="/api", expected=200)
            ],
            tests=[
                TestDefinition(name="Test", type=TestType.API)
            ],
            qualityGates=[
                QualityGate(name="Coverage", metric="coverage", threshold=70)
            ],
            acceptance=AcceptanceCriteria(minCoverage=70)
        )
        assert len(validation.assertions) == 1
        assert validation.acceptance.minCoverage == 70


# ============================================================================
# CONTRACT AI TESTS
# ============================================================================

class TestContractMetadata:
    def test_metadata(self):
        metadata = ContractMetadata(version="1.0.0")
        assert metadata.version == "1.0.0"
        assert isinstance(metadata.createdAt, datetime)
        
    def test_full_metadata(self):
        metadata = ContractMetadata(
            version="1.0.0",
            author="John Doe",
            tags=["crm"],
            source="manual"
        )
        assert metadata.author == "John Doe"
        assert metadata.source == "manual"


class TestContractAI:
    def test_minimal_contract(self):
        contract = ContractAI(
            definition=DefinitionLayer(
                app=AppDefinition(name="App", version="1.0.0"),
                entities=[EntityDefinition(name="Item", fields=[FieldDefinition(name="id", type="UUID")])]
            ),
            generation=GenerationLayer(),
            validation=ValidationLayer()
        )
        assert contract.definition.app.name == "App"
        assert contract.metadata is None
        
    def test_full_contract(self):
        contract = ContractAI(
            definition=DefinitionLayer(
                app=AppDefinition(name="CRM", version="1.0.0", description="CRM System"),
                entities=[
                    EntityDefinition(
                        name="Contact",
                        fields=[
                            FieldDefinition(name="id", type="UUID", annotations=FieldAnnotations(generated=True)),
                            FieldDefinition(name="email", type="Email", annotations=FieldAnnotations(required=True)),
                        ]
                    )
                ],
                api=ApiDefinition(
                    version="v1",
                    prefix="/api/v1",
                    resources=[ApiResourceDefinition(name="contacts", entity="Contact", operations=["list", "get", "create"])]
                )
            ),
            generation=GenerationLayer(
                instructions=[Instruction(target="api", priority=InstructionPriority.MUST, instruction="Use Express.js")],
                techStack=TechStack(backend=BackendTechStack(port=3000))
            ),
            validation=ValidationLayer(
                assertions=[Assertion(type=AssertionType.ENDPOINT_STATUS, target="/api/v1/contacts", expected=200)],
                acceptance=AcceptanceCriteria(testsPass=True, minCoverage=70)
            ),
            metadata=ContractMetadata(version="1.0.0", author="Test")
        )
        
        assert contract.definition.app.name == "CRM"
        assert len(contract.definition.entities) == 1
        assert contract.definition.entities[0].name == "Contact"
        assert len(contract.definition.entities[0].fields) == 2
        assert contract.generation.techStack.backend.port == 3000
        assert contract.validation.acceptance.minCoverage == 70
        assert contract.metadata.author == "Test"


class TestIsValidContract:
    def test_valid_contract_dict(self):
        contract_dict = {
            "definition": {
                "app": {"name": "App", "version": "1.0.0"},
                "entities": [{"name": "Item", "fields": []}]
            },
            "generation": {},
            "validation": {}
        }
        assert is_valid_contract(contract_dict) is True
        
    def test_invalid_contract_missing_definition(self):
        contract_dict = {
            "generation": {},
            "validation": {}
        }
        assert is_valid_contract(contract_dict) is False
        
    def test_invalid_contract_missing_app(self):
        contract_dict = {
            "definition": {
                "entities": []
            },
            "generation": {},
            "validation": {}
        }
        assert is_valid_contract(contract_dict) is False
        
    def test_invalid_not_dict(self):
        assert is_valid_contract("not a dict") is False
        assert is_valid_contract(None) is False


# ============================================================================
# SERIALIZATION TESTS
# ============================================================================

class TestSerialization:
    def test_contract_to_dict(self):
        contract = ContractAI(
            definition=DefinitionLayer(
                app=AppDefinition(name="App", version="1.0.0"),
                entities=[EntityDefinition(name="Item", fields=[FieldDefinition(name="id", type="UUID")])]
            ),
            generation=GenerationLayer(),
            validation=ValidationLayer()
        )
        
        data = contract.model_dump()
        assert data["definition"]["app"]["name"] == "App"
        assert data["definition"]["entities"][0]["name"] == "Item"
        
    def test_contract_to_json(self):
        contract = ContractAI(
            definition=DefinitionLayer(
                app=AppDefinition(name="App", version="1.0.0"),
                entities=[EntityDefinition(name="Item", fields=[FieldDefinition(name="id", type="UUID")])]
            ),
            generation=GenerationLayer(),
            validation=ValidationLayer()
        )
        
        json_str = contract.model_dump_json()
        assert '"name":"App"' in json_str or '"name": "App"' in json_str
        
    def test_contract_from_dict(self):
        data = {
            "definition": {
                "app": {"name": "App", "version": "1.0.0"},
                "entities": [{"name": "Item", "fields": [{"name": "id", "type": "UUID"}]}]
            },
            "generation": {},
            "validation": {}
        }
        
        contract = ContractAI.model_validate(data)
        assert contract.definition.app.name == "App"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
