"""
Contract Markdown Parser

Parses .contract.md files into ContractMarkdown structure.

Mirrors: src/core/contract-ai/parser/markdown-parser.ts
@version 3.0.0
"""

import json
import re
from typing import Any, Literal, Optional

import yaml
from pydantic import BaseModel, Field


# ============================================================================
# TYPES
# ============================================================================

FieldType = Literal["uuid", "string", "text", "number", "boolean", "datetime", "date", "enum", "json"]


class EntityField(BaseModel):
    """Entity field from markdown table"""
    name: str
    type: FieldType = "string"
    required: bool = False
    auto: bool = False
    description: Optional[str] = None


class MarkdownEntityDefinition(BaseModel):
    """Entity definition parsed from markdown"""
    name: str
    description: Optional[str] = None
    fields: list[EntityField] = Field(default_factory=list)
    typescript: Optional[str] = None
    example: Optional[dict[str, Any]] = None


class ApiEndpoint(BaseModel):
    """API endpoint definition"""
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    path: str
    description: Optional[str] = None
    requestBody: Optional[str] = Field(default=None, alias="request_body")
    responseBody: Optional[str] = Field(default=None, alias="response_body")
    
    model_config = {"populate_by_name": True}


class MarkdownAssertion(BaseModel):
    """Business rule assertion"""
    name: str
    condition: str
    severity: Literal["error", "warning"] = "error"


class TestCase(BaseModel):
    """API test case"""
    name: str
    method: str
    path: str
    body: Optional[dict[str, Any]] = None
    expect: Optional[dict[str, Any]] = None


class AcceptanceScenario(BaseModel):
    """Gherkin scenario"""
    name: str
    steps: list[str] = Field(default_factory=list)


class AcceptanceTest(BaseModel):
    """Gherkin feature with scenarios"""
    feature: str
    scenarios: list[AcceptanceScenario] = Field(default_factory=list)


class ContractFrontmatter(BaseModel):
    """YAML frontmatter from contract.md"""
    contract: Optional[dict[str, Any]] = None
    generation: Optional[dict[str, Any]] = None
    runtime: Optional[dict[str, Any]] = None
    tech: Optional[dict[str, Any]] = None


class BackendTech(BaseModel):
    """Backend technology configuration"""
    framework: str = "express"
    language: str = "typescript"
    runtime: str = "node >= 18"
    features: list[str] = Field(default_factory=lambda: ["cors"])
    validation: str = "zod"


class FrontendTech(BaseModel):
    """Frontend technology configuration"""
    framework: str = "react"
    bundler: str = "vite"
    styling: str = "tailwind"
    state: str = "useState"
    features: list[str] = Field(default_factory=list)


class DatabaseTech(BaseModel):
    """Database configuration"""
    type: str = "json-file"


class TechStack(BaseModel):
    """Complete tech stack"""
    backend: BackendTech = Field(default_factory=BackendTech)
    frontend: Optional[FrontendTech] = None
    database: DatabaseTech = Field(default_factory=DatabaseTech)


class AppDefinition(BaseModel):
    """App definition from markdown"""
    domain: str = "General"
    type: str = "Application"
    users: list[str] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)


class ApiDefinition(BaseModel):
    """API definition from markdown"""
    baseUrl: str = Field(default="http://localhost:3000/api/v1", alias="base_url")
    endpoints: list[ApiEndpoint] = Field(default_factory=list)
    
    model_config = {"populate_by_name": True}


class RulesDefinition(BaseModel):
    """Business rules definition"""
    validations: list[str] = Field(default_factory=list)
    assertions: list[MarkdownAssertion] = Field(default_factory=list)


class TestsDefinition(BaseModel):
    """Tests definition"""
    acceptance: list[AcceptanceTest] = Field(default_factory=list)
    api: list[TestCase] = Field(default_factory=list)


class ContractMarkdown(BaseModel):
    """Complete parsed contract markdown"""
    frontmatter: ContractFrontmatter
    app: AppDefinition = Field(default_factory=AppDefinition)
    entities: list[MarkdownEntityDefinition] = Field(default_factory=list)
    api: ApiDefinition = Field(default_factory=ApiDefinition)
    rules: RulesDefinition = Field(default_factory=RulesDefinition)
    tech: TechStack = Field(default_factory=TechStack)
    tests: TestsDefinition = Field(default_factory=TestsDefinition)
    raw: str = ""


class ContractValidationResult(BaseModel):
    """Validation result"""
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ============================================================================
# MAIN PARSER
# ============================================================================

def parse_contract_markdown(content: str) -> ContractMarkdown:
    """
    Parse contract markdown content into ContractMarkdown structure.
    
    Args:
        content: Raw markdown content
        
    Returns:
        Parsed ContractMarkdown
        
    Raises:
        ValueError: If frontmatter is missing or invalid
    """
    frontmatter, body = _extract_frontmatter(content)
    
    return ContractMarkdown(
        frontmatter=frontmatter,
        app=_parse_app_section(body),
        entities=_parse_entities_section(body),
        api=_parse_api_section(body),
        rules=_parse_rules_section(body),
        tech=_parse_tech_section(body, frontmatter),
        tests=_parse_tests_section(body),
        raw=content
    )


# ============================================================================
# FRONTMATTER EXTRACTION
# ============================================================================

def _extract_frontmatter(content: str) -> tuple[ContractFrontmatter, str]:
    """Extract YAML frontmatter from content"""
    frontmatter_regex = r"^---\n([\s\S]*?)\n---"
    match = re.match(frontmatter_regex, content)
    
    if not match:
        raise ValueError("Contract must have YAML frontmatter between --- markers")
    
    # Remove comments from YAML
    yaml_content = "\n".join(
        line for line in match.group(1).split("\n")
        if not line.strip().startswith("#")
    )
    
    frontmatter_data = yaml.safe_load(yaml_content) or {}
    frontmatter = ContractFrontmatter(**frontmatter_data)
    
    # Set defaults
    if not frontmatter.generation:
        frontmatter.generation = {"mode": "full-stack", "output": "./generated"}
    if not frontmatter.runtime:
        frontmatter.runtime = {"port": 3000, "healthCheck": "/health"}
    
    body = content[match.end():].strip()
    return frontmatter, body


# ============================================================================
# SECTION PARSERS
# ============================================================================

def _parse_app_section(body: str) -> AppDefinition:
    """Parse ## App Definition section"""
    section = _extract_section(body, "## App Definition")
    
    domain = _extract_field(section, "Domain") or "General"
    app_type = _extract_field(section, "Type") or "Application"
    users = _extract_list_from_field(section, "Users")
    features = _extract_checkbox_list(section)
    
    return AppDefinition(domain=domain, type=app_type, users=users, features=features)


def _parse_entities_section(body: str) -> list[MarkdownEntityDefinition]:
    """Parse ## Entities section"""
    section = _extract_section(body, "## Entities")
    entities: list[MarkdownEntityDefinition] = []
    
    # Find all ### Entity subsections
    entity_regex = r"### (\w+)\n([\s\S]*?)(?=###|\n## |$)"
    
    for match in re.finditer(entity_regex, section):
        name = match.group(1)
        content = match.group(2)
        entities.append(_parse_entity_content(name, content))
    
    return entities


def _parse_entity_content(name: str, content: str) -> MarkdownEntityDefinition:
    """Parse entity content from markdown"""
    # Extract description (first paragraph before table)
    desc_match = re.match(r"^([^\n|#]+)\n", content)
    description = desc_match.group(1).strip() if desc_match else None
    
    # Parse markdown table
    fields = _parse_markdown_table(content)
    
    # Extract TypeScript definition
    ts_match = re.search(r"```typescript\n([\s\S]*?)\n```", content)
    typescript = ts_match.group(1) if ts_match else None
    
    # Extract example JSON
    json_match = re.search(r"```json\n([\s\S]*?)\n```", content)
    example = None
    if json_match:
        try:
            example = json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass
    
    return MarkdownEntityDefinition(
        name=name,
        description=description,
        fields=fields,
        typescript=typescript,
        example=example
    )


def _parse_markdown_table(content: str) -> list[EntityField]:
    """Parse markdown table into EntityField list"""
    # Match table with header and separator
    table_regex = r"\|([^\n]+)\|\n\|[-:| ]+\|\n((?:\|[^\n]+\|\n?)+)"
    match = re.search(table_regex, content)
    
    if not match:
        return []
    
    headers = [h.strip().lower() for h in match.group(1).split("|")]
    rows = match.group(2).strip().split("\n")
    
    field_idx = headers.index("field") if "field" in headers else -1
    type_idx = headers.index("type") if "type" in headers else -1
    required_idx = headers.index("required") if "required" in headers else -1
    desc_idx = headers.index("description") if "description" in headers else -1
    
    fields = []
    for row in rows:
        cells = [c.strip() for c in row.split("|") if c.strip()]
        if len(cells) < 2:
            continue
            
        required_value = cells[required_idx].lower() if required_idx >= 0 and required_idx < len(cells) else ""
        
        field = EntityField(
            name=cells[field_idx].replace("`", "") if field_idx >= 0 and field_idx < len(cells) else "",
            type=_parse_field_type(cells[type_idx] if type_idx >= 0 and type_idx < len(cells) else "string"),
            required=required_value in ("yes", "true"),
            auto=required_value == "auto",
            description=cells[desc_idx] if desc_idx >= 0 and desc_idx < len(cells) else None
        )
        
        if field.name:
            fields.append(field)
    
    return fields


def _parse_field_type(type_str: str) -> FieldType:
    """Parse field type string to FieldType"""
    normalized = type_str.lower().strip()
    
    type_map: dict[str, FieldType] = {
        "uuid": "uuid",
        "string": "string",
        "text": "text",
        "number": "number",
        "integer": "number",
        "boolean": "boolean",
        "bool": "boolean",
        "datetime": "datetime",
        "date": "date",
        "enum": "enum",
        "json": "json",
        "object": "json"
    }
    
    return type_map.get(normalized, "string")


def _parse_api_section(body: str) -> ApiDefinition:
    """Parse ## API section"""
    section = _extract_section(body, "## API")
    
    # Extract base URL
    base_url_match = re.search(r"```\n(http[^\n]+)\n```", section)
    base_url = base_url_match.group(1) if base_url_match else "http://localhost:3000/api/v1"
    
    # Parse endpoint tables
    endpoints = _parse_endpoint_tables(section)
    
    return ApiDefinition(baseUrl=base_url, endpoints=endpoints)


def _parse_endpoint_tables(section: str) -> list[ApiEndpoint]:
    """Parse API endpoint tables"""
    endpoints: list[ApiEndpoint] = []
    
    # Match tables that have Method column
    table_regex = r"\|\s*Method\s*\|[^\n]+\n\|[-:| ]+\n((?:\|[^\n]+\n?)+)"
    
    for match in re.finditer(table_regex, section, re.IGNORECASE):
        rows = match.group(1).strip().split("\n")
        
        for row in rows:
            cells = [c.strip() for c in row.split("|") if c.strip()]
            if len(cells) >= 3 and cells[0].upper() in ("GET", "POST", "PUT", "PATCH", "DELETE"):
                endpoints.append(ApiEndpoint(
                    method=cells[0].upper(),  # type: ignore
                    path=cells[1].replace("`", ""),
                    description=cells[2] if len(cells) > 2 else None,
                    requestBody=cells[3] if len(cells) > 3 else None,
                    responseBody=cells[4] if len(cells) > 4 else None
                ))
    
    return endpoints


def _parse_rules_section(body: str) -> RulesDefinition:
    """Parse ## Business Rules section"""
    section = _extract_section(body, "## Business Rules")
    
    # Parse assertions from YAML block
    yaml_match = re.search(r"```yaml\n([\s\S]*?)\n```", section)
    assertions: list[MarkdownAssertion] = []
    
    if yaml_match:
        try:
            parsed = yaml.safe_load(yaml_match.group(1))
            if parsed and "assertions" in parsed:
                assertions = [MarkdownAssertion(**a) for a in parsed["assertions"]]
        except yaml.YAMLError:
            pass
    
    return RulesDefinition(validations=[], assertions=assertions)


def _parse_tech_section(body: str, frontmatter: ContractFrontmatter) -> TechStack:
    """Parse ## Tech Stack section"""
    section = _extract_section(body, "## Tech Stack")
    
    # Parse YAML blocks in the section
    backend_match = re.search(r"### Backend[\s\S]*?```yaml\n([\s\S]*?)\n```", section)
    frontend_match = re.search(r"### Frontend[\s\S]*?```yaml\n([\s\S]*?)\n```", section)
    database_match = re.search(r"### Database[\s\S]*?```yaml\n([\s\S]*?)\n```", section)
    
    backend = BackendTech()
    
    if backend_match:
        try:
            parsed = yaml.safe_load(backend_match.group(1))
            if parsed:
                data = parsed.get("backend", parsed)
                backend = BackendTech(**{k: v for k, v in data.items() if k in BackendTech.model_fields})
        except yaml.YAMLError:
            pass
    elif frontmatter.tech and frontmatter.tech.get("backend"):
        parts = frontmatter.tech["backend"].split("-")
        backend.framework = parts[0] if parts else "express"
        backend.language = parts[1] if len(parts) > 1 else "typescript"
    
    frontend = None
    if frontend_match:
        try:
            parsed = yaml.safe_load(frontend_match.group(1))
            if parsed:
                data = parsed.get("frontend", parsed)
                frontend = FrontendTech(**{k: v for k, v in data.items() if k in FrontendTech.model_fields})
        except yaml.YAMLError:
            pass
    elif frontmatter.tech and frontmatter.tech.get("frontend"):
        parts = frontmatter.tech["frontend"].split("-")
        frontend = FrontendTech(
            framework=parts[0] if parts else "react",
            bundler=parts[1] if len(parts) > 1 else "vite"
        )
    
    database = DatabaseTech()
    if database_match:
        try:
            parsed = yaml.safe_load(database_match.group(1))
            if parsed:
                data = parsed.get("database", parsed)
                database = DatabaseTech(**{k: v for k, v in data.items() if k in DatabaseTech.model_fields})
        except yaml.YAMLError:
            pass
    elif frontmatter.tech and frontmatter.tech.get("database"):
        database.type = frontmatter.tech["database"]
    
    return TechStack(backend=backend, frontend=frontend, database=database)


def _parse_tests_section(body: str) -> TestsDefinition:
    """Parse ## Tests section"""
    section = _extract_section(body, "## Tests")
    
    # Parse Gherkin acceptance tests
    gherkin_match = re.search(r"```gherkin\n([\s\S]*?)\n```", section)
    acceptance = _parse_gherkin(gherkin_match.group(1)) if gherkin_match else []
    
    # Parse API tests from YAML
    tests_match = re.search(r"### API Tests[\s\S]*?```yaml\n([\s\S]*?)\n```", section)
    api_tests: list[TestCase] = []
    
    if tests_match:
        try:
            parsed = yaml.safe_load(tests_match.group(1))
            if parsed and "tests" in parsed:
                api_tests = [TestCase(**t) for t in parsed["tests"]]
        except yaml.YAMLError:
            pass
    
    return TestsDefinition(acceptance=acceptance, api=api_tests)


def _parse_gherkin(content: str) -> list[AcceptanceTest]:
    """Parse Gherkin format tests"""
    features: list[AcceptanceTest] = []
    
    feature_match = re.search(r"Feature:\s*(.+)", content)
    if not feature_match:
        return features
    
    feature = feature_match.group(1).strip()
    scenarios: list[AcceptanceScenario] = []
    
    scenario_regex = r"Scenario:\s*(.+)\n([\s\S]*?)(?=\s*Scenario:|$)"
    
    for match in re.finditer(scenario_regex, content):
        name = match.group(1).strip()
        steps_content = match.group(2)
        steps = [
            s.strip() for s in steps_content.split("\n")
            if re.match(r"^(Given|When|Then|And)\s", s.strip())
        ]
        scenarios.append(AcceptanceScenario(name=name, steps=steps))
    
    features.append(AcceptanceTest(feature=feature, scenarios=scenarios))
    return features


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def _extract_section(body: str, header: str) -> str:
    """Extract content under a markdown header"""
    escaped_header = re.escape(header)
    regex = rf"{escaped_header}\n([\s\S]*?)(?=\n## |$)"
    match = re.search(regex, body)
    return match.group(1) if match else ""


def _extract_field(section: str, label: str) -> str:
    """Extract **Label:** value from section"""
    regex = rf"\*\*{label}:\*\*\s*(.+)"
    match = re.search(regex, section)
    return match.group(1).strip() if match else ""


def _extract_list_from_field(section: str, label: str) -> list[str]:
    """Extract comma-separated list from field"""
    value = _extract_field(section, label)
    if not value:
        return []
    return [s.strip() for s in value.split(",")]


def _extract_checkbox_list(section: str) -> list[str]:
    """Extract checkbox list items"""
    items: list[str] = []
    checkbox_regex = r"- \[[x ]\] (.+)"
    
    for match in re.finditer(checkbox_regex, section, re.IGNORECASE):
        items.append(match.group(1).strip())
    
    return items


# ============================================================================
# VALIDATION
# ============================================================================

def validate_contract(contract: ContractMarkdown) -> ContractValidationResult:
    """
    Validate parsed contract.
    
    Args:
        contract: Parsed ContractMarkdown
        
    Returns:
        Validation result with errors and warnings
    """
    errors: list[str] = []
    warnings: list[str] = []
    
    # Required fields
    if not contract.frontmatter.contract or not contract.frontmatter.contract.get("name"):
        errors.append("Contract name is required in frontmatter")
    
    if not contract.frontmatter.contract or not contract.frontmatter.contract.get("version"):
        warnings.append("Contract version is recommended")
    
    if len(contract.entities) == 0:
        errors.append("At least one entity is required")
    
    # Entity validation
    for entity in contract.entities:
        if not any(f.name == "id" for f in entity.fields):
            warnings.append(f'Entity "{entity.name}" has no \'id\' field')
        
        if len(entity.fields) == 0:
            errors.append(f'Entity "{entity.name}" has no fields defined')
    
    # API validation
    if len(contract.api.endpoints) == 0:
        warnings.append("No API endpoints defined")
    
    return ContractValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )
