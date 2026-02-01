"""
E2E Test Generator - Generate Playwright tests from ContractAI.

Port of: src/core/contract-ai/templates/tests/e2e-native.template.ts

Features:
- TypeScript Playwright test generation
- Python pytest-playwright test generation
- API endpoint tests
- UI component tests
- Health check tests

@version 2.4.1
"""

from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel

from ..models import ContractAI, EntityDefinition


# ============================================================================
# TYPES
# ============================================================================

class E2ETestConfig(BaseModel):
    """Configuration for E2E test generation"""
    base_url: str = "http://localhost:3000"
    output_format: Literal["typescript", "python"] = "typescript"
    include_ui_tests: bool = True
    include_api_tests: bool = True
    include_health_tests: bool = True
    timeout_ms: int = 30000
    retries: int = 2


class GeneratedTest(BaseModel):
    """A generated test file"""
    filename: str
    content: str
    test_type: Literal["api", "ui", "health", "e2e"]


class TestSuite(BaseModel):
    """Complete test suite"""
    tests: List[GeneratedTest] = []
    config_file: Optional[str] = None
    setup_file: Optional[str] = None


# ============================================================================
# E2E TEST GENERATOR
# ============================================================================

class E2ETestGenerator:
    """
    Generate Playwright E2E tests from ContractAI specification.
    
    Generates:
    - playwright.config.ts / conftest.py
    - API endpoint tests
    - UI component tests (optional)
    - Health check tests
    
    Example:
        generator = E2ETestGenerator(E2ETestConfig(base_url="http://localhost:3000"))
        suite = generator.generate(contract)
        
        for test in suite.tests:
            Path(f"tests/{test.filename}").write_text(test.content)
    """
    
    def __init__(self, config: Optional[E2ETestConfig] = None):
        self.config = config or E2ETestConfig()
    
    def generate(self, contract: ContractAI) -> TestSuite:
        """Generate complete test suite from contract"""
        tests: List[GeneratedTest] = []
        
        if self.config.output_format == "typescript":
            # Playwright config
            config_file = self._generate_playwright_config()
            
            # Health tests
            if self.config.include_health_tests:
                tests.append(self._generate_health_tests_ts())
            
            # API tests for each entity
            if self.config.include_api_tests:
                for entity in contract.definition.entities:
                    tests.append(self._generate_api_tests_ts(entity))
            
            # UI tests
            if self.config.include_ui_tests:
                tests.append(self._generate_ui_tests_ts(contract))
            
            return TestSuite(
                tests=tests,
                config_file=config_file,
                setup_file=None
            )
        else:
            # Python pytest-playwright
            setup_file = self._generate_conftest_py()
            
            # Health tests
            if self.config.include_health_tests:
                tests.append(self._generate_health_tests_py())
            
            # API tests for each entity
            if self.config.include_api_tests:
                for entity in contract.definition.entities:
                    tests.append(self._generate_api_tests_py(entity))
            
            return TestSuite(
                tests=tests,
                config_file=None,
                setup_file=setup_file
            )
    
    # ========================================================================
    # TYPESCRIPT GENERATORS
    # ========================================================================
    
    def _generate_playwright_config(self) -> str:
        """Generate playwright.config.ts"""
        return f'''import {{ defineConfig, devices }} from '@playwright/test';

export default defineConfig({{
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? {self.config.retries} : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {{
    baseURL: '{self.config.base_url}',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  }},
  
  timeout: {self.config.timeout_ms},
  
  projects: [
    {{
      name: 'chromium',
      use: {{ ...devices['Desktop Chrome'] }},
    }},
  ],
  
  webServer: {{
    command: 'npm run dev',
    url: '{self.config.base_url}',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  }},
}});
'''
    
    def _generate_health_tests_ts(self) -> GeneratedTest:
        """Generate health check tests (TypeScript)"""
        content = f'''import {{ test, expect }} from '@playwright/test';

test.describe('Health Checks', () => {{
  test('service is running', async ({{ request }}) => {{
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
  }});

  test('API returns valid response', async ({{ request }}) => {{
    const response = await request.get('/api');
    expect(response.status()).toBeLessThan(500);
  }});

  test('homepage loads', async ({{ page }}) => {{
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);
  }});
}});
'''
        return GeneratedTest(
            filename="health.spec.ts",
            content=content,
            test_type="health"
        )
    
    def _generate_api_tests_ts(self, entity: EntityDefinition) -> GeneratedTest:
        """Generate API tests for entity (TypeScript)"""
        name = entity.name
        plural = self._pluralize(name.lower())
        
        # Generate test payload
        payload = self._generate_test_payload(entity)
        update_payload = self._generate_update_payload(entity)
        
        content = f'''import {{ test, expect }} from '@playwright/test';

test.describe('{name} API', () => {{
  let createdId: string;

  const testPayload = {payload};
  const updatePayload = {update_payload};

  test('GET /api/{plural} returns list', async ({{ request }}) => {{
    const response = await request.get('/api/{plural}');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data.data || data)).toBeTruthy();
  }});

  test('POST /api/{plural} creates item', async ({{ request }}) => {{
    const response = await request.post('/api/{plural}', {{
      data: testPayload,
    }});
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.id || data.data?.id).toBeTruthy();
    createdId = data.id || data.data?.id;
  }});

  test('GET /api/{plural}/:id returns item', async ({{ request }}) => {{
    test.skip(!createdId, 'No item created');
    const response = await request.get(`/api/{plural}/${{createdId}}`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.id || data.data?.id).toBe(createdId);
  }});

  test('PUT /api/{plural}/:id updates item', async ({{ request }}) => {{
    test.skip(!createdId, 'No item created');
    const response = await request.put(`/api/{plural}/${{createdId}}`, {{
      data: {{ ...updatePayload, id: createdId }},
    }});
    expect(response.ok()).toBeTruthy();
  }});

  test('DELETE /api/{plural}/:id removes item', async ({{ request }}) => {{
    test.skip(!createdId, 'No item created');
    const response = await request.delete(`/api/{plural}/${{createdId}}`);
    expect(response.ok()).toBeTruthy();
  }});

  test('GET /api/{plural}/:id returns 404 after delete', async ({{ request }}) => {{
    test.skip(!createdId, 'No item created');
    const response = await request.get(`/api/{plural}/${{createdId}}`);
    expect(response.status()).toBe(404);
  }});
}});
'''
        return GeneratedTest(
            filename=f"{plural}.spec.ts",
            content=content,
            test_type="api"
        )
    
    def _generate_ui_tests_ts(self, contract: ContractAI) -> GeneratedTest:
        """Generate UI tests (TypeScript)"""
        app_name = contract.definition.app.name
        
        content = f'''import {{ test, expect }} from '@playwright/test';

test.describe('{app_name} UI', () => {{
  test.beforeEach(async ({{ page }}) => {{
    await page.goto('/');
  }});

  test('has correct title', async ({{ page }}) => {{
    await expect(page).toHaveTitle(/{app_name}/i);
  }});

  test('main content is visible', async ({{ page }}) => {{
    const main = page.locator('main, [role="main"], #root, #app');
    await expect(main).toBeVisible();
  }});

  test('navigation works', async ({{ page }}) => {{
    const nav = page.locator('nav, [role="navigation"]');
    if (await nav.isVisible()) {{
      const links = nav.locator('a');
      const count = await links.count();
      if (count > 0) {{
        await links.first().click();
        await page.waitForLoadState('networkidle');
      }}
    }}
  }});

  test('no console errors', async ({{ page }}) => {{
    const errors: string[] = [];
    page.on('console', msg => {{
      if (msg.type() === 'error') {{
        errors.push(msg.text());
      }}
    }});
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  }});

  test('responds to different viewports', async ({{ page }}) => {{
    await page.setViewportSize({{ width: 375, height: 667 }});
    await expect(page.locator('body')).toBeVisible();
    
    await page.setViewportSize({{ width: 1920, height: 1080 }});
    await expect(page.locator('body')).toBeVisible();
  }});
}});
'''
        return GeneratedTest(
            filename="ui.spec.ts",
            content=content,
            test_type="ui"
        )
    
    # ========================================================================
    # PYTHON GENERATORS
    # ========================================================================
    
    def _generate_conftest_py(self) -> str:
        """Generate conftest.py for pytest-playwright"""
        return f'''"""Pytest configuration for Playwright tests"""
import pytest
from playwright.sync_api import Page, APIRequestContext

BASE_URL = "{self.config.base_url}"

@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL

@pytest.fixture
def api_context(playwright) -> APIRequestContext:
    context = playwright.request.new_context(base_url=BASE_URL)
    yield context
    context.dispose()
'''
    
    def _generate_health_tests_py(self) -> GeneratedTest:
        """Generate health check tests (Python)"""
        content = f'''"""Health check tests"""
import pytest
from playwright.sync_api import Page, APIRequestContext


class TestHealth:
    def test_service_is_running(self, api_context: APIRequestContext):
        response = api_context.get("/health")
        assert response.ok
    
    def test_api_returns_valid_response(self, api_context: APIRequestContext):
        response = api_context.get("/api")
        assert response.status < 500
    
    def test_homepage_loads(self, page: Page, base_url: str):
        page.goto(base_url)
        assert page.title()
'''
        return GeneratedTest(
            filename="test_health.py",
            content=content,
            test_type="health"
        )
    
    def _generate_api_tests_py(self, entity: EntityDefinition) -> GeneratedTest:
        """Generate API tests for entity (Python)"""
        name = entity.name
        plural = self._pluralize(name.lower())
        
        # Generate test payload as Python dict
        payload = self._generate_test_payload_py(entity)
        update_payload = self._generate_update_payload_py(entity)
        
        content = f'''"""API tests for {name}"""
import pytest
from playwright.sync_api import APIRequestContext


class Test{name}API:
    created_id: str = None
    
    test_payload = {payload}
    update_payload = {update_payload}
    
    def test_get_list(self, api_context: APIRequestContext):
        response = api_context.get("/api/{plural}")
        assert response.ok
        data = response.json()
        assert isinstance(data.get("data", data), list)
    
    def test_create_item(self, api_context: APIRequestContext):
        response = api_context.post("/api/{plural}", data=self.test_payload)
        assert response.ok
        data = response.json()
        Test{name}API.created_id = data.get("id") or data.get("data", {{}}).get("id")
        assert Test{name}API.created_id
    
    def test_get_item(self, api_context: APIRequestContext):
        if not Test{name}API.created_id:
            pytest.skip("No item created")
        response = api_context.get(f"/api/{plural}/{{Test{name}API.created_id}}")
        assert response.ok
        data = response.json()
        assert data.get("id") or data.get("data", {{}}).get("id") == Test{name}API.created_id
    
    def test_update_item(self, api_context: APIRequestContext):
        if not Test{name}API.created_id:
            pytest.skip("No item created")
        payload = {{**self.update_payload, "id": Test{name}API.created_id}}
        response = api_context.put(f"/api/{plural}/{{Test{name}API.created_id}}", data=payload)
        assert response.ok
    
    def test_delete_item(self, api_context: APIRequestContext):
        if not Test{name}API.created_id:
            pytest.skip("No item created")
        response = api_context.delete(f"/api/{plural}/{{Test{name}API.created_id}}")
        assert response.ok
    
    def test_get_deleted_returns_404(self, api_context: APIRequestContext):
        if not Test{name}API.created_id:
            pytest.skip("No item created")
        response = api_context.get(f"/api/{plural}/{{Test{name}API.created_id}}")
        assert response.status == 404
'''
        return GeneratedTest(
            filename=f"test_{plural}.py",
            content=content,
            test_type="api"
        )
    
    # ========================================================================
    # HELPERS
    # ========================================================================
    
    def _generate_test_payload(self, entity: EntityDefinition) -> str:
        """Generate test payload as JSON string"""
        payload: Dict[str, Any] = {}
        
        for field in entity.fields:
            if field.annotations and field.annotations.generated:
                continue
            
            # Generate sample value based on type
            field_type = str(field.type)
            if field_type == "string":
                if "email" in field.name.lower():
                    payload[field.name] = "test@example.com"
                elif "name" in field.name.lower():
                    payload[field.name] = f"Test {entity.name}"
                else:
                    payload[field.name] = f"test_{field.name}"
            elif field_type in ("number", "integer", "float"):
                payload[field.name] = 42
            elif field_type == "boolean":
                payload[field.name] = True
            elif field_type in ("date", "datetime"):
                payload[field.name] = "2024-01-01T00:00:00Z"
        
        import json
        return json.dumps(payload, indent=2)
    
    def _generate_update_payload(self, entity: EntityDefinition) -> str:
        """Generate update payload as JSON string"""
        payload: Dict[str, Any] = {}
        
        for field in entity.fields[:2]:  # Just update first 2 fields
            if field.annotations and field.annotations.generated:
                continue
            if field.name == "id":
                continue
            
            field_type = str(field.type)
            if field_type == "string":
                payload[field.name] = f"updated_{field.name}"
            elif field_type in ("number", "integer", "float"):
                payload[field.name] = 99
        
        import json
        return json.dumps(payload, indent=2)
    
    def _generate_test_payload_py(self, entity: EntityDefinition) -> str:
        """Generate test payload as Python dict string"""
        lines = ["{"]
        
        for field in entity.fields:
            if field.annotations and field.annotations.generated:
                continue
            
            field_type = str(field.type)
            if field_type == "string":
                if "email" in field.name.lower():
                    lines.append(f'        "{field.name}": "test@example.com",')
                elif "name" in field.name.lower():
                    lines.append(f'        "{field.name}": "Test {entity.name}",')
                else:
                    lines.append(f'        "{field.name}": "test_{field.name}",')
            elif field_type in ("number", "integer", "float"):
                lines.append(f'        "{field.name}": 42,')
            elif field_type == "boolean":
                lines.append(f'        "{field.name}": True,')
        
        lines.append("    }")
        return "\n".join(lines)
    
    def _generate_update_payload_py(self, entity: EntityDefinition) -> str:
        """Generate update payload as Python dict string"""
        lines = ["{"]
        
        for field in entity.fields[:2]:
            if field.annotations and field.annotations.generated:
                continue
            if field.name == "id":
                continue
            
            field_type = str(field.type)
            if field_type == "string":
                lines.append(f'        "{field.name}": "updated_{field.name}",')
            elif field_type in ("number", "integer", "float"):
                lines.append(f'        "{field.name}": 99,')
        
        lines.append("    }")
        return "\n".join(lines)
    
    def _pluralize(self, word: str) -> str:
        """Simple pluralization"""
        if word.endswith("y"):
            return word[:-1] + "ies"
        elif word.endswith(("s", "x", "z", "ch", "sh")):
            return word + "es"
        else:
            return word + "s"
