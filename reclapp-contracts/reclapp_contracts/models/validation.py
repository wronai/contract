"""
Contract AI - Layer 3: Validation Types (HOW TO VERIFY / WHEN READY)

Defines HOW to verify and WHEN code is ready - assertions, tests, quality gates.

Mirrors: src/core/contract-ai/types/validation.ts
"""

from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ============================================================================
# ASSERTION TYPES
# ============================================================================

class AssertionType(str, Enum):
    """Assertion types for validation"""
    FILE_EXISTS = "file-exists"
    FILE_CONTAINS = "file-contains"
    ENDPOINT_RETURNS = "endpoint-returns"
    ENDPOINT_STATUS = "endpoint-status"
    SCHEMA_VALID = "schema-valid"
    TYPE_CHECK = "type-check"
    LINT_PASS = "lint-pass"
    TEST_PASS = "test-pass"


class Assertion(BaseModel):
    """
    Validation assertion
    
    Example:
        assertion = Assertion(
            type=AssertionType.ENDPOINT_STATUS,
            target="/api/v1/contacts",
            expected=200,
            description="Contacts endpoint should return 200"
        )
    """
    type: AssertionType
    target: str
    expected: Any
    description: Optional[str] = None
    severity: Literal["error", "warning", "info"] = "error"


# ============================================================================
# TEST TYPES
# ============================================================================

class TestType(str, Enum):
    """Test types"""
    UNIT = "unit"
    INTEGRATION = "integration"
    E2E = "e2e"
    API = "api"
    CONTRACT = "contract"


class TestDefinition(BaseModel):
    """
    Test definition
    
    Example:
        test = TestDefinition(
            name="Contact CRUD",
            type=TestType.API,
            description="Test Contact CRUD operations",
            steps=[
                {"action": "POST", "endpoint": "/api/v1/contacts", "body": {"email": "test@example.com"}},
                {"action": "GET", "endpoint": "/api/v1/contacts", "expect": {"status": 200}},
            ]
        )
    """
    name: str
    type: TestType
    description: Optional[str] = None
    entity: Optional[str] = None
    steps: Optional[list[dict[str, Any]]] = None
    setup: Optional[str] = None
    teardown: Optional[str] = None


# ============================================================================
# STATIC RULES
# ============================================================================

class StaticRule(BaseModel):
    r"""
    Static analysis rule
    
    Example:
        rule = StaticRule(
            id="no-any",
            name="No any type",
            description="Disallow usage of 'any' type",
            severity="warning",
            pattern=":\\s*any\\b"
        )
    """
    id: str
    name: str
    description: Optional[str] = None
    severity: Literal["error", "warning", "info"] = "warning"
    pattern: Optional[str] = None
    fix: Optional[str] = None


# ============================================================================
# QUALITY GATES
# ============================================================================

class QualityGate(BaseModel):
    """
    Quality gate definition
    
    Example:
        gate = QualityGate(
            name="Code Coverage",
            metric="coverage",
            threshold=70,
            operator="gte"
        )
    """
    name: str
    metric: str
    threshold: float
    operator: Literal["eq", "gt", "gte", "lt", "lte"] = "gte"
    blocking: bool = True


# ============================================================================
# ACCEPTANCE CRITERIA
# ============================================================================

class AcceptanceCriteria(BaseModel):
    """
    Acceptance criteria for generated code
    
    Example:
        acceptance = AcceptanceCriteria(
            testsPass=True,
            minCoverage=70,
            noErrors=True,
            lintClean=True
        )
    """
    testsPass: bool = Field(default=True, alias="tests_pass")
    minCoverage: Optional[int] = Field(default=None, alias="min_coverage")
    noErrors: bool = Field(default=True, alias="no_errors")
    noWarnings: bool = Field(default=False, alias="no_warnings")
    lintClean: bool = Field(default=False, alias="lint_clean")
    maxComplexity: Optional[int] = Field(default=None, alias="max_complexity")
    
    model_config = {"populate_by_name": True}


# ============================================================================
# VALIDATION LAYER
# ============================================================================

class ValidationLayer(BaseModel):
    """
    Layer 3: Validation - defines HOW to verify and WHEN ready
    
    Example:
        validation = ValidationLayer(
            assertions=[
                Assertion(type=AssertionType.ENDPOINT_STATUS, target="/api/v1/contacts", expected=200),
            ],
            tests=[
                TestDefinition(name="Contact CRUD", type=TestType.API),
            ],
            staticRules=[
                StaticRule(id="no-any", name="No any type", severity="warning"),
            ],
            qualityGates=[
                QualityGate(name="Coverage", metric="coverage", threshold=70),
            ],
            acceptance=AcceptanceCriteria(testsPass=True, minCoverage=70)
        )
    """
    assertions: list[Assertion] = Field(default_factory=list)
    tests: list[TestDefinition] = Field(default_factory=list)
    staticRules: list[StaticRule] = Field(default_factory=list, alias="static_rules")
    qualityGates: list[QualityGate] = Field(default_factory=list, alias="quality_gates")
    acceptance: AcceptanceCriteria = Field(default_factory=AcceptanceCriteria)
    
    model_config = {"populate_by_name": True}
