"""
Contract Generator

Generates ContractAI from natural language prompts using LLM.

Mirrors: src/core/contract-ai/generator/contract-generator.ts
@version 2.4.1
"""

import json
import re
import time
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from ..llm import LLMProvider, GenerateOptions
from .base import BaseGenerator

# Use clickmd logger for consistent markdown output
try:
    from clickmd import Logger
    _HAS_CLICKMD = True
except ImportError:
    _HAS_CLICKMD = False
    Logger = None  # type: ignore


# ============================================================================
# TYPES
# ============================================================================

class ContractGeneratorOptions(BaseModel):
    """Contract generator options"""
    max_attempts: int = Field(default=5, alias="maxAttempts")
    temperature: float = 0.7
    model: str = "llama3"
    timeout: int = 60000
    verbose: bool = False
    
    model_config = {"populate_by_name": True}


class ContractValidationError(BaseModel):
    """Contract validation error"""
    path: str
    message: str
    severity: Literal["error", "warning"] = "error"


class ContractGenerationResult(BaseModel):
    """Result of contract generation"""
    success: bool
    contract: Optional[dict[str, Any]] = None
    attempts: int = 0
    errors: list[ContractValidationError] = Field(default_factory=list)
    tokens_used: int = Field(default=0, alias="tokensUsed")
    time_ms: int = Field(default=0, alias="timeMs")
    
    model_config = {"populate_by_name": True}


FeedbackLevel = Literal["general", "detailed", "explicit"]


# ============================================================================
# CONTRACT GENERATOR
# ============================================================================

class ContractGenerator(BaseGenerator[ContractGeneratorOptions, ContractGenerationResult]):
    """
    Contract AI generator with self-correction loop.
    
    Generates ContractAI from natural language prompts,
    with automatic validation and correction.
    
    Example:
        generator = ContractGenerator(verbose=True)
        generator.set_llm_client(ollama_client)
        
        result = await generator.generate("Create a CRM with contacts and companies")
        if result.success:
            print("Contract:", result.contract)
    """
    
    def __init__(self, options: Optional[ContractGeneratorOptions] = None):
        opts = options or ContractGeneratorOptions()
        super().__init__(opts, verbose=opts.verbose)
        self._log = Logger(verbose=opts.verbose) if _HAS_CLICKMD else None
    
    async def generate(self, user_prompt: str) -> ContractGenerationResult:
        """
        Generate a ContractAI from natural language prompt.
        
        Args:
            user_prompt: Natural language description of the application
            
        Returns:
            ContractGenerationResult with generated contract or errors
        """
        start_time = time.time()
        tokens_used = 0
        attempts = 0
        current_contract: Optional[dict] = None
        last_errors: list[ContractValidationError] = []
        
        while attempts < self.options.max_attempts:
            attempts += 1
            
            if self._log:
                self._log.attempt(attempts, self.options.max_attempts, "contract generation")
            
            try:
                # Build prompt
                if attempts == 1:
                    prompt = self._build_initial_prompt(user_prompt)
                else:
                    prompt = self._build_correction_prompt(
                        user_prompt, current_contract, last_errors, attempts
                    )
                
                # Call LLM
                response = await self._call_llm(prompt)
                tokens_used += self._estimate_tokens(response)
                
                # Parse response
                parsed_contract = self._parse_contract_from_response(response)
                
                if not parsed_contract:
                    last_errors = [ContractValidationError(
                        path="",
                        message="Failed to parse contract JSON from response"
                    )]
                    continue
                
                current_contract = parsed_contract
                
                # Validate contract
                validation_errors = self._validate_contract(current_contract)
                
                if not validation_errors:
                    # Success!
                    time_ms = int((time.time() - start_time) * 1000)
                    
                    if self._log:
                        self._log.success(f"Contract generated successfully in {attempts} attempt(s)")
                    
                    return ContractGenerationResult(
                        success=True,
                        contract=current_contract,
                        attempts=attempts,
                        errors=[],
                        tokens_used=tokens_used,
                        time_ms=time_ms
                    )
                
                last_errors = validation_errors
                
                if self._log:
                    self._log.error(f"Validation errors: {len(validation_errors)}")
                    for err in validation_errors[:3]:
                        self._log.info(f"  {err.path}: {err.message}")
                        
            except Exception as e:
                last_errors = [ContractValidationError(
                    path="",
                    message=f"Generation error: {str(e)}"
                )]
                
                if self._log:
                    self._log.exception(e)
        
        # All attempts failed
        time_ms = int((time.time() - start_time) * 1000)
        
        return ContractGenerationResult(
            success=False,
            contract=current_contract,
            attempts=attempts,
            errors=last_errors,
            tokens_used=tokens_used,
            time_ms=time_ms
        )
    
    def _build_initial_prompt(self, user_prompt: str) -> GenerateOptions:
        """Build initial generation prompt"""
        system = """You are a Contract AI generator. Generate a valid ContractAI JSON structure.

The ContractAI has 3 layers:
1. definition - WHAT to implement (app, entities, api)
2. generation - HOW to generate (instructions, techStack)
3. validation - HOW to verify (assertions, tests)

Required structure:
{
  "definition": {
    "app": { "name": "string", "version": "string" },
    "entities": [{ "name": "string", "fields": [{ "name": "string", "type": "string" }] }],
    "api": { "version": "string", "prefix": "string", "resources": [] }
  },
  "generation": {
    "instructions": [],
    "techStack": { "backend": { "runtime": "node", "language": "typescript", "framework": "express", "port": 3000 } }
  },
  "validation": {
    "assertions": [],
    "acceptance": { "testsPass": true }
  }
}

Respond ONLY with valid JSON. No markdown, no explanation."""

        user = f"""Generate a ContractAI for: {user_prompt}

Requirements:
- Include at least one entity with id, createdAt fields
- Include CRUD API endpoints for each entity
- Use Express.js with TypeScript
- Output only valid JSON"""

        return GenerateOptions(
            system=system,
            user=user,
            temperature=self.options.temperature,
            response_format="json"
        )
    
    def _build_correction_prompt(
        self,
        user_prompt: str,
        current_contract: Optional[dict],
        errors: list[ContractValidationError],
        attempt: int
    ) -> GenerateOptions:
        """Build correction prompt based on previous errors"""
        error_list = "\n".join([f"- {e.path}: {e.message}" for e in errors[:5]])
        
        system = """You are fixing a ContractAI JSON. Fix the validation errors while preserving the overall structure.
Respond ONLY with valid JSON. No markdown, no explanation."""

        user = f"""Original request: {user_prompt}

Current contract (attempt {attempt}):
{json.dumps(current_contract, indent=2) if current_contract else "{}"}

Validation errors to fix:
{error_list}

Fix these errors and return the corrected ContractAI JSON."""

        return GenerateOptions(
            system=system,
            user=user,
            temperature=max(0.3, self.options.temperature - 0.1 * attempt),
            response_format="json"
        )
    
    async def _call_llm(self, options: GenerateOptions) -> str:
        """Call LLM and get response"""
        response = await self.require_llm_client().generate(options)
        return response.content
    
    def _parse_contract_from_response(self, response: str) -> Optional[dict]:
        """Parse ContractAI JSON from LLM response"""
        # Try to extract JSON from response
        content = response.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content)
            if match:
                content = match.group(1)
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to find JSON object in response
            match = re.search(r"\{[\s\S]*\}", content)
            if match:
                try:
                    return json.loads(match.group(0))
                except json.JSONDecodeError:
                    pass
        
        return None
    
    def _validate_contract(self, contract: dict) -> list[ContractValidationError]:
        """Validate contract structure"""
        errors = []
        
        # Check required top-level keys
        if "definition" not in contract:
            errors.append(ContractValidationError(
                path="definition",
                message="Missing required 'definition' layer"
            ))
        else:
            definition = contract["definition"]
            
            # Check app
            if "app" not in definition:
                errors.append(ContractValidationError(
                    path="definition.app",
                    message="Missing required 'app' definition"
                ))
            elif not definition["app"].get("name"):
                errors.append(ContractValidationError(
                    path="definition.app.name",
                    message="App name is required"
                ))
            
            # Check entities
            if "entities" not in definition:
                errors.append(ContractValidationError(
                    path="definition.entities",
                    message="Missing required 'entities' array"
                ))
            elif not isinstance(definition["entities"], list):
                errors.append(ContractValidationError(
                    path="definition.entities",
                    message="Entities must be an array"
                ))
            elif len(definition["entities"]) == 0:
                errors.append(ContractValidationError(
                    path="definition.entities",
                    message="At least one entity is required"
                ))
            else:
                for i, entity in enumerate(definition["entities"]):
                    if not entity.get("name"):
                        errors.append(ContractValidationError(
                            path=f"definition.entities[{i}].name",
                            message="Entity name is required"
                        ))
                    if not entity.get("fields") or not isinstance(entity.get("fields"), list):
                        errors.append(ContractValidationError(
                            path=f"definition.entities[{i}].fields",
                            message="Entity fields array is required"
                        ))
        
        if "generation" not in contract:
            errors.append(ContractValidationError(
                path="generation",
                message="Missing required 'generation' layer"
            ))
        
        if "validation" not in contract:
            errors.append(ContractValidationError(
                path="validation",
                message="Missing required 'validation' layer"
            ))
        
        return errors
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation)"""
        # Roughly 4 characters per token
        return len(text) // 4
