"""
State Analyzer Module

Multi-level state analysis for evolution pipeline.
Tracks contract, code, and runtime state discrepancies.

Mirrors: src/core/contract-ai/evolution/state-analyzer.ts
"""

import json
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class StateLevel(str, Enum):
    """State analysis levels"""
    CONTRACT = "contract"
    CODE = "code"
    RUNTIME = "runtime"


class DiscrepancyType(str, Enum):
    """Types of state discrepancies"""
    MISSING_ENTITY = "missing_entity"
    MISSING_FIELD = "missing_field"
    TYPE_MISMATCH = "type_mismatch"
    MISSING_ENDPOINT = "missing_endpoint"
    MISSING_FILE = "missing_file"
    SCHEMA_MISMATCH = "schema_mismatch"
    RUNTIME_ERROR = "runtime_error"


@dataclass
class StateDiscrepancy:
    """A discrepancy between expected and actual state"""
    level: StateLevel
    type: DiscrepancyType
    path: str
    expected: Any
    actual: Any
    message: str
    severity: str = "error"
    
    def to_dict(self) -> dict:
        return {
            "level": self.level.value,
            "type": self.type.value,
            "path": self.path,
            "expected": self.expected,
            "actual": self.actual,
            "message": self.message,
            "severity": self.severity
        }


@dataclass
class ContractState:
    """State extracted from contract"""
    app_name: str = ""
    version: str = "1.0.0"
    entities: list[dict] = field(default_factory=list)
    endpoints: list[dict] = field(default_factory=list)
    tech_stack: dict = field(default_factory=dict)


@dataclass
class CodeState:
    """State extracted from generated code"""
    files: list[str] = field(default_factory=list)
    models: list[str] = field(default_factory=list)
    routes: list[str] = field(default_factory=list)
    has_package_json: bool = False
    has_tsconfig: bool = False


@dataclass
class RuntimeState:
    """State extracted from running service"""
    is_running: bool = False
    port: int = 0
    health_ok: bool = False
    endpoints_responding: list[str] = field(default_factory=list)


@dataclass
class MultiLevelState:
    """Combined multi-level state"""
    contract: ContractState = field(default_factory=ContractState)
    code: CodeState = field(default_factory=CodeState)
    runtime: RuntimeState = field(default_factory=RuntimeState)
    discrepancies: list[StateDiscrepancy] = field(default_factory=list)
    
    def is_consistent(self) -> bool:
        """Check if all levels are consistent"""
        return len([d for d in self.discrepancies if d.severity == "error"]) == 0
    
    def to_dict(self) -> dict:
        return {
            "contract": {
                "app_name": self.contract.app_name,
                "version": self.contract.version,
                "entities": len(self.contract.entities),
                "endpoints": len(self.contract.endpoints)
            },
            "code": {
                "files": len(self.code.files),
                "models": len(self.code.models),
                "routes": len(self.code.routes)
            },
            "runtime": {
                "is_running": self.runtime.is_running,
                "health_ok": self.runtime.health_ok
            },
            "discrepancies": [d.to_dict() for d in self.discrepancies],
            "is_consistent": self.is_consistent()
        }


class StateAnalyzer:
    """
    Analyzes state across contract, code, and runtime levels.
    
    Mirrors TypeScript StateAnalyzer for consistency checking.
    
    Example:
        analyzer = StateAnalyzer(target_dir)
        state = await analyzer.analyze(contract)
        
        if not state.is_consistent():
            for d in state.discrepancies:
                print(f"{d.level}: {d.message}")
    """
    
    def __init__(self, target_dir: str, verbose: bool = False):
        self.target_dir = Path(target_dir)
        self.verbose = verbose
    
    async def analyze(self, contract: Optional[dict] = None) -> MultiLevelState:
        """Perform full multi-level analysis"""
        state = MultiLevelState()
        
        # Analyze contract level
        if contract:
            state.contract = self._analyze_contract(contract)
        else:
            contract = self._load_contract()
            if contract:
                state.contract = self._analyze_contract(contract)
        
        # Analyze code level
        state.code = self._analyze_code()
        
        # Analyze runtime level
        state.runtime = await self._analyze_runtime()
        
        # Find discrepancies
        state.discrepancies = self._find_discrepancies(state)
        
        return state
    
    def _load_contract(self) -> Optional[dict]:
        """Load contract from file"""
        contract_path = self.target_dir / "contract" / "contract.ai.json"
        if contract_path.exists():
            try:
                return json.loads(contract_path.read_text())
            except:
                pass
        return None
    
    def _analyze_contract(self, contract: dict) -> ContractState:
        """Extract state from contract"""
        state = ContractState()
        
        definition = contract.get("definition", {})
        app = definition.get("app", {})
        
        state.app_name = app.get("name", "")
        state.version = app.get("version", "1.0.0")
        state.entities = definition.get("entities", [])
        
        # Extract endpoints from API definition
        api = definition.get("api", {})
        resources = api.get("resources", [])
        for resource in resources:
            if isinstance(resource, dict):
                state.endpoints.extend(resource.get("endpoints", []))
            elif isinstance(resource, str):
                # Generate CRUD endpoints for resource
                resource_lower = resource.lower()
                state.endpoints.extend([
                    {"method": "GET", "path": f"/api/{resource_lower}"},
                    {"method": "POST", "path": f"/api/{resource_lower}"},
                    {"method": "GET", "path": f"/api/{resource_lower}/:id"},
                    {"method": "PUT", "path": f"/api/{resource_lower}/:id"},
                    {"method": "DELETE", "path": f"/api/{resource_lower}/:id"},
                ])
        
        generation = contract.get("generation", {})
        state.tech_stack = generation.get("techStack", {})
        
        return state
    
    def _analyze_code(self) -> CodeState:
        """Extract state from generated code"""
        state = CodeState()
        
        # Find all files
        if self.target_dir.exists():
            for path in self.target_dir.rglob("*"):
                if path.is_file() and "node_modules" not in str(path):
                    rel_path = str(path.relative_to(self.target_dir))
                    state.files.append(rel_path)
                    
                    # Categorize files
                    if "/models/" in rel_path or rel_path.endswith(".model.ts"):
                        state.models.append(rel_path)
                    elif "/routes/" in rel_path or rel_path.endswith(".routes.ts"):
                        state.routes.append(rel_path)
        
        # Check for key files
        state.has_package_json = (self.target_dir / "api" / "package.json").exists() or \
                                  (self.target_dir / "package.json").exists()
        state.has_tsconfig = (self.target_dir / "api" / "tsconfig.json").exists() or \
                              (self.target_dir / "tsconfig.json").exists()
        
        return state
    
    async def _analyze_runtime(self) -> RuntimeState:
        """Extract state from running service"""
        import urllib.request
        import urllib.error
        
        state = RuntimeState()
        state.port = 3000  # Default port
        
        # Check health endpoint
        try:
            url = f"http://localhost:{state.port}/health"
            req = urllib.request.urlopen(url, timeout=2)
            if req.status == 200:
                state.is_running = True
                state.health_ok = True
        except:
            pass
        
        # Check API endpoints if service is running
        if state.is_running:
            test_endpoints = ["/api/v1", "/api"]
            for endpoint in test_endpoints:
                try:
                    url = f"http://localhost:{state.port}{endpoint}"
                    req = urllib.request.urlopen(url, timeout=2)
                    if req.status in [200, 404]:  # 404 means route exists but no data
                        state.endpoints_responding.append(endpoint)
                except:
                    pass
        
        return state
    
    def _find_discrepancies(self, state: MultiLevelState) -> list[StateDiscrepancy]:
        """Find discrepancies between state levels"""
        discrepancies = []
        
        # Check contract vs code
        for entity in state.contract.entities:
            entity_name = entity.get("name", "")
            if entity_name:
                # Check if model file exists
                model_found = any(
                    entity_name.lower() in f.lower() 
                    for f in state.code.models + state.code.files
                )
                if not model_found:
                    discrepancies.append(StateDiscrepancy(
                        level=StateLevel.CODE,
                        type=DiscrepancyType.MISSING_ENTITY,
                        path=f"models/{entity_name}",
                        expected=entity_name,
                        actual=None,
                        message=f"Entity '{entity_name}' defined in contract but no model file found",
                        severity="warning"
                    ))
        
        # Check required files
        if not state.code.has_package_json:
            discrepancies.append(StateDiscrepancy(
                level=StateLevel.CODE,
                type=DiscrepancyType.MISSING_FILE,
                path="package.json",
                expected="package.json",
                actual=None,
                message="Missing package.json file",
                severity="error"
            ))
        
        # Check runtime vs contract
        if state.contract.entities and not state.runtime.is_running:
            discrepancies.append(StateDiscrepancy(
                level=StateLevel.RUNTIME,
                type=DiscrepancyType.RUNTIME_ERROR,
                path="service",
                expected="running",
                actual="stopped",
                message="Service is not running",
                severity="warning"
            ))
        
        return discrepancies
    
    def write_state_snapshot(self, state: MultiLevelState) -> str:
        """Write state snapshot to file"""
        state_dir = self.target_dir / "state"
        state_dir.mkdir(parents=True, exist_ok=True)
        
        snapshot_path = state_dir / "multi-level-state.json"
        snapshot_path.write_text(json.dumps(state.to_dict(), indent=2))
        
        return str(snapshot_path)
