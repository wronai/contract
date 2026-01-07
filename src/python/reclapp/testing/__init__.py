"""
Reclapp Testing - E2E testing framework with Playwright support.

Features:
- Playwright-based E2E test generation
- API endpoint testing
- Contract validation tests
- Health check testing
"""

from .e2e_generator import (
    E2ETestConfig,
    E2ETestGenerator,
    GeneratedTest,
    TestSuite,
)

from .api_tester import (
    APITester,
    APITestResult,
    EndpointTest,
)

__all__ = [
    # E2E Generator
    "E2ETestConfig",
    "E2ETestGenerator",
    "GeneratedTest",
    "TestSuite",
    # API Tester
    "APITester",
    "APITestResult",
    "EndpointTest",
]
