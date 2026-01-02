"""
Tests for Reclapp Parser Module

Mirrors TypeScript tests and verifies feature parity.
Run: pytest tests/python/test_parser.py -v
"""

import pytest

import sys
sys.path.insert(0, 'src/python')

from reclapp.parser import (
    parse_contract_markdown,
    validate_contract,
    ContractMarkdown,
    ContractFrontmatter,
    MarkdownEntityDefinition,
)
from reclapp.parser.markdown_parser import (
    EntityField,
    ApiEndpoint,
    _extract_section,
    _extract_field,
    _parse_field_type,
    _parse_markdown_table,
)


# ============================================================================
# SAMPLE CONTRACT
# ============================================================================

SAMPLE_CONTRACT = """---
contract:
  name: Notes App
  version: 1.0.0
generation:
  mode: full-stack
  output: ./generated
runtime:
  port: 3000
  healthCheck: /health
tech:
  backend: express-typescript
  database: json-file
---

## App Definition

**Domain:** Productivity
**Type:** Web Application
**Users:** Individuals, Teams

### Features
- [x] Create notes
- [x] Edit notes
- [x] Delete notes
- [ ] Share notes

## Entities

### Note
A simple note with title and content.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Auto | Unique identifier |
| `title` | String | Yes | Note title |
| `content` | Text | No | Note content |
| `createdAt` | DateTime | Auto | Creation timestamp |

```typescript
interface Note {
  id: string;
  title: string;
  content?: string;
  createdAt: Date;
}
```

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My Note",
  "content": "Note content here",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## API

```
http://localhost:3000/api/v1
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notes` | List all notes |
| GET | `/notes/:id` | Get note by ID |
| POST | `/notes` | Create note |
| PUT | `/notes/:id` | Update note |
| DELETE | `/notes/:id` | Delete note |

## Business Rules

```yaml
assertions:
  - name: title_required
    condition: note.title.length > 0
    severity: error
  - name: content_limit
    condition: note.content.length < 10000
    severity: warning
```

## Tech Stack

### Backend

```yaml
backend:
  framework: express
  language: typescript
  runtime: node >= 18
  features:
    - cors
    - helmet
  validation: zod
```

### Database

```yaml
database:
  type: json-file
  path: ./data/notes.json
```

## Tests

```gherkin
Feature: Notes Management
  Scenario: Create a note
    Given I am on the notes page
    When I click "New Note"
    And I enter "My Title" as title
    Then I should see the note created
    
  Scenario: Delete a note
    Given I have a note with id "123"
    When I delete the note
    Then the note should be removed
```

### API Tests

```yaml
tests:
  - name: List notes
    method: GET
    path: /notes
    expect:
      status: 200
  - name: Create note
    method: POST
    path: /notes
    body:
      title: Test Note
    expect:
      status: 201
```
"""


# ============================================================================
# FRONTMATTER TESTS
# ============================================================================

class TestFrontmatter:
    def test_parse_frontmatter(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        assert contract.frontmatter.contract is not None
        assert contract.frontmatter.contract["name"] == "Notes App"
        assert contract.frontmatter.contract["version"] == "1.0.0"
        
    def test_generation_config(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        assert contract.frontmatter.generation is not None
        assert contract.frontmatter.generation["mode"] == "full-stack"
        assert contract.frontmatter.generation["output"] == "./generated"
        
    def test_runtime_config(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        assert contract.frontmatter.runtime is not None
        assert contract.frontmatter.runtime["port"] == 3000
        
    def test_missing_frontmatter_raises(self):
        with pytest.raises(ValueError, match="frontmatter"):
            parse_contract_markdown("# No frontmatter here")


# ============================================================================
# APP DEFINITION TESTS
# ============================================================================

class TestAppDefinition:
    def test_parse_domain(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.app.domain == "Productivity"
        
    def test_parse_type(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.app.type == "Web Application"
        
    def test_parse_users(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert "Individuals" in contract.app.users
        assert "Teams" in contract.app.users
        
    def test_parse_features(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert "Create notes" in contract.app.features
        assert "Edit notes" in contract.app.features


# ============================================================================
# ENTITY TESTS
# ============================================================================

class TestEntityParsing:
    def test_parse_entity_count(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert len(contract.entities) == 1
        
    def test_parse_entity_name(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.entities[0].name == "Note"
        
    def test_parse_entity_description(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert "simple note" in contract.entities[0].description.lower()
        
    def test_parse_entity_fields(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        entity = contract.entities[0]
        
        assert len(entity.fields) == 4
        
        field_names = [f.name for f in entity.fields]
        assert "id" in field_names
        assert "title" in field_names
        assert "content" in field_names
        assert "createdAt" in field_names
        
    def test_parse_field_types(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        entity = contract.entities[0]
        
        id_field = next(f for f in entity.fields if f.name == "id")
        assert id_field.type == "uuid"
        
        title_field = next(f for f in entity.fields if f.name == "title")
        assert title_field.type == "string"
        
        content_field = next(f for f in entity.fields if f.name == "content")
        assert content_field.type == "text"
        
    def test_parse_field_required(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        entity = contract.entities[0]
        
        title_field = next(f for f in entity.fields if f.name == "title")
        assert title_field.required is True
        
        content_field = next(f for f in entity.fields if f.name == "content")
        assert content_field.required is False
        
    def test_parse_field_auto(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        entity = contract.entities[0]
        
        id_field = next(f for f in entity.fields if f.name == "id")
        assert id_field.auto is True
        
    def test_parse_typescript_definition(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        entity = contract.entities[0]
        
        assert entity.typescript is not None
        assert "interface Note" in entity.typescript
        
    def test_parse_example_json(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        entity = contract.entities[0]
        
        assert entity.example is not None
        assert entity.example["title"] == "My Note"


# ============================================================================
# API TESTS
# ============================================================================

class TestApiParsing:
    def test_parse_base_url(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.api.baseUrl == "http://localhost:3000/api/v1"
        
    def test_parse_endpoints_count(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert len(contract.api.endpoints) == 5
        
    def test_parse_endpoint_methods(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        methods = [e.method for e in contract.api.endpoints]
        assert "GET" in methods
        assert "POST" in methods
        assert "PUT" in methods
        assert "DELETE" in methods
        
    def test_parse_endpoint_paths(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        paths = [e.path for e in contract.api.endpoints]
        assert "/notes" in paths
        assert "/notes/:id" in paths


# ============================================================================
# BUSINESS RULES TESTS
# ============================================================================

class TestRulesParsing:
    def test_parse_assertions(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert len(contract.rules.assertions) == 2
        
    def test_assertion_name(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        names = [a.name for a in contract.rules.assertions]
        assert "title_required" in names
        
    def test_assertion_severity(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        title_assertion = next(a for a in contract.rules.assertions if a.name == "title_required")
        assert title_assertion.severity == "error"
        
        content_assertion = next(a for a in contract.rules.assertions if a.name == "content_limit")
        assert content_assertion.severity == "warning"


# ============================================================================
# TECH STACK TESTS
# ============================================================================

class TestTechStackParsing:
    def test_parse_backend_framework(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.tech.backend.framework == "express"
        
    def test_parse_backend_language(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.tech.backend.language == "typescript"
        
    def test_parse_backend_features(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert "cors" in contract.tech.backend.features
        assert "helmet" in contract.tech.backend.features
        
    def test_parse_database_type(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.tech.database.type == "json-file"


# ============================================================================
# TESTS SECTION TESTS
# ============================================================================

class TestTestsParsing:
    def test_parse_acceptance_tests(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert len(contract.tests.acceptance) == 1
        
    def test_parse_feature_name(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert contract.tests.acceptance[0].feature == "Notes Management"
        
    def test_parse_scenarios(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        scenarios = contract.tests.acceptance[0].scenarios
        
        assert len(scenarios) == 2
        assert scenarios[0].name == "Create a note"
        assert scenarios[1].name == "Delete a note"
        
    def test_parse_scenario_steps(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        scenario = contract.tests.acceptance[0].scenarios[0]
        
        assert len(scenario.steps) >= 3
        assert any("Given" in s for s in scenario.steps)
        assert any("When" in s for s in scenario.steps)
        assert any("Then" in s for s in scenario.steps)
        
    def test_parse_api_tests(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        assert len(contract.tests.api) == 2
        
    def test_api_test_content(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        
        list_test = contract.tests.api[0]
        assert list_test.name == "List notes"
        assert list_test.method == "GET"
        assert list_test.path == "/notes"


# ============================================================================
# VALIDATION TESTS
# ============================================================================

class TestValidation:
    def test_valid_contract(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        result = validate_contract(contract)
        
        assert result.valid is True
        assert len(result.errors) == 0
        
    def test_missing_name_error(self):
        minimal = """---
contract:
  version: 1.0.0
---

## Entities

### Item

| Field | Type | Required |
|-------|------|----------|
| `id` | UUID | Auto |
"""
        contract = parse_contract_markdown(minimal)
        result = validate_contract(contract)
        
        assert result.valid is False
        assert any("name" in e.lower() for e in result.errors)
        
    def test_no_entities_error(self):
        minimal = """---
contract:
  name: Test
  version: 1.0.0
---

## App Definition

**Domain:** Test
"""
        contract = parse_contract_markdown(minimal)
        result = validate_contract(contract)
        
        assert result.valid is False
        assert any("entity" in e.lower() for e in result.errors)
        
    def test_missing_id_warning(self):
        minimal = """---
contract:
  name: Test
  version: 1.0.0
---

## Entities

### Item

| Field | Type | Required |
|-------|------|----------|
| `name` | String | Yes |
"""
        contract = parse_contract_markdown(minimal)
        result = validate_contract(contract)
        
        assert any("id" in w.lower() for w in result.warnings)


# ============================================================================
# UTILITY FUNCTION TESTS
# ============================================================================

class TestUtilityFunctions:
    def test_extract_section(self):
        body = """## Section One

Content here.

## Section Two

More content.
"""
        section = _extract_section(body, "## Section One")
        assert "Content here" in section
        assert "Section Two" not in section
        
    def test_extract_field(self):
        section = "**Domain:** Test Domain\n**Type:** App"
        assert _extract_field(section, "Domain") == "Test Domain"
        assert _extract_field(section, "Type") == "App"
        
    def test_parse_field_type(self):
        assert _parse_field_type("UUID") == "uuid"
        assert _parse_field_type("string") == "string"
        assert _parse_field_type("INTEGER") == "number"
        assert _parse_field_type("bool") == "boolean"
        assert _parse_field_type("unknown") == "string"


# ============================================================================
# SERIALIZATION TESTS
# ============================================================================

class TestSerialization:
    def test_contract_to_dict(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        data = contract.model_dump()
        
        assert "frontmatter" in data
        assert "entities" in data
        assert data["entities"][0]["name"] == "Note"
        
    def test_contract_to_json(self):
        contract = parse_contract_markdown(SAMPLE_CONTRACT)
        json_str = contract.model_dump_json()
        
        assert "Notes App" in json_str or "Notes App" in json_str


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
