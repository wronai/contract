"""
API Tester - Runtime API testing without Playwright.

Provides lightweight API endpoint testing using httpx.

@version 2.4.1
"""

import asyncio
import time
from typing import Any, Dict, List, Literal, Optional

import httpx
from pydantic import BaseModel


class EndpointTest(BaseModel):
    """Definition of an endpoint test"""
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    path: str
    body: Optional[Dict[str, Any]] = None
    expected_status: int = 200
    expected_body: Optional[Dict[str, Any]] = None
    name: str = ""


class APITestResult(BaseModel):
    """Result of an API test"""
    test_name: str
    method: str
    path: str
    passed: bool
    status_code: int
    expected_status: int
    duration_ms: int
    error: Optional[str] = None
    response_body: Optional[Any] = None


class APITester:
    """
    Lightweight API tester using httpx.
    
    Example:
        tester = APITester("http://localhost:3000")
        
        tests = [
            EndpointTest(method="GET", path="/health", name="Health Check"),
            EndpointTest(method="GET", path="/api/users", name="List Users"),
        ]
        
        results = await tester.run_tests(tests)
        for result in results:
            status = "✅" if result.passed else "❌"
            print(f"{status} {result.test_name}: {result.duration_ms}ms")
    """
    
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
    
    async def run_test(self, test: EndpointTest) -> APITestResult:
        """Run a single endpoint test"""
        client = await self._get_client()
        url = f"{self.base_url}{test.path}"
        
        start_time = time.time()
        error: Optional[str] = None
        status_code = 0
        response_body: Any = None
        
        try:
            if test.method == "GET":
                response = await client.get(url)
            elif test.method == "POST":
                response = await client.post(url, json=test.body)
            elif test.method == "PUT":
                response = await client.put(url, json=test.body)
            elif test.method == "PATCH":
                response = await client.patch(url, json=test.body)
            elif test.method == "DELETE":
                response = await client.delete(url)
            else:
                raise ValueError(f"Unknown method: {test.method}")
            
            status_code = response.status_code
            
            try:
                response_body = response.json()
            except Exception:
                response_body = response.text[:500]
            
            # Check expected body if provided
            if test.expected_body:
                for key, value in test.expected_body.items():
                    if isinstance(response_body, dict):
                        if response_body.get(key) != value:
                            error = f"Expected {key}={value}, got {response_body.get(key)}"
                            break
        
        except httpx.TimeoutException:
            error = "Request timed out"
        except httpx.ConnectError:
            error = "Connection failed"
        except Exception as e:
            error = str(e)
        
        duration_ms = int((time.time() - start_time) * 1000)
        passed = (
            error is None and 
            status_code == test.expected_status
        )
        
        return APITestResult(
            test_name=test.name or f"{test.method} {test.path}",
            method=test.method,
            path=test.path,
            passed=passed,
            status_code=status_code,
            expected_status=test.expected_status,
            duration_ms=duration_ms,
            error=error,
            response_body=response_body
        )
    
    async def run_tests(self, tests: List[EndpointTest]) -> List[APITestResult]:
        """Run multiple endpoint tests"""
        results = []
        for test in tests:
            result = await self.run_test(test)
            results.append(result)
        return results
    
    async def health_check(self, path: str = "/health") -> bool:
        """Quick health check"""
        test = EndpointTest(method="GET", path=path, name="Health Check")
        result = await self.run_test(test)
        return result.passed
    
    async def probe_endpoints(
        self, 
        endpoints: List[str]
    ) -> Dict[str, bool]:
        """Probe multiple endpoints for availability"""
        results = {}
        for endpoint in endpoints:
            test = EndpointTest(method="GET", path=endpoint)
            result = await self.run_test(test)
            results[endpoint] = result.passed
        return results
    
    def generate_crud_tests(
        self, 
        entity_name: str,
        base_path: str,
        create_payload: Dict[str, Any]
    ) -> List[EndpointTest]:
        """Generate standard CRUD tests for an entity"""
        return [
            EndpointTest(
                method="GET",
                path=base_path,
                name=f"List {entity_name}s"
            ),
            EndpointTest(
                method="POST",
                path=base_path,
                body=create_payload,
                expected_status=201,
                name=f"Create {entity_name}"
            ),
            EndpointTest(
                method="GET",
                path=f"{base_path}/1",
                name=f"Get {entity_name}"
            ),
            EndpointTest(
                method="PUT",
                path=f"{base_path}/1",
                body=create_payload,
                name=f"Update {entity_name}"
            ),
            EndpointTest(
                method="DELETE",
                path=f"{base_path}/1",
                expected_status=204,
                name=f"Delete {entity_name}"
            ),
        ]
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, *args):
        await self.close()
