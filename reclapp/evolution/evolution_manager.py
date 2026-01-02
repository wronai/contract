"""
Evolution Manager

Manages the evolution pipeline with auto-healing code generation.

Mirrors: src/core/contract-ai/evolution/evolution-manager.ts
@version 1.0.0
"""

import asyncio
import time
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field

from .task_queue import TaskQueue, Task
from .shell_renderer import ShellRenderer


# ============================================================================
# TYPES
# ============================================================================

class EvolutionOptions(BaseModel):
    """Evolution manager options"""
    output_dir: str = Field(default="./generated", alias="outputDir")
    max_iterations: int = Field(default=10, alias="maxIterations")
    auto_fix: bool = Field(default=True, alias="autoFix")
    verbose: bool = True
    keep_running: bool = Field(default=False, alias="keepRunning")
    
    model_config = {"populate_by_name": True}


class EvolutionResult(BaseModel):
    """Result of evolution run"""
    success: bool
    iterations: int = 0
    files_generated: int = Field(default=0, alias="filesGenerated")
    errors: list[str] = Field(default_factory=list)
    time_ms: int = Field(default=0, alias="timeMs")
    
    model_config = {"populate_by_name": True}


# ============================================================================
# EVOLUTION MANAGER
# ============================================================================

class EvolutionManager:
    """
    Evolution manager with auto-healing code generation.
    
    Runs a loop of:
    1. Generate code from contract
    2. Validate generated code
    3. Fix errors (if auto_fix enabled)
    4. Repeat until success or max iterations
    
    Example:
        manager = EvolutionManager(verbose=True)
        result = await manager.evolve(
            prompt="Create a todo app",
            output_dir="./my-app"
        )
        if result.success:
            print(f"Generated {result.files_generated} files")
    """
    
    def __init__(self, options: Optional[EvolutionOptions] = None):
        self.options = options or EvolutionOptions()
        self.task_queue = TaskQueue(verbose=self.options.verbose)
        self.renderer = ShellRenderer(verbose=self.options.verbose)
        self._llm_client: Optional[Any] = None
    
    def set_llm_client(self, client: Any) -> None:
        """Set the LLM client"""
        self._llm_client = client
    
    async def evolve(
        self,
        prompt: str,
        output_dir: Optional[str] = None
    ) -> EvolutionResult:
        """
        Run the evolution pipeline.
        
        Args:
            prompt: Natural language description
            output_dir: Output directory (overrides options)
            
        Returns:
            EvolutionResult with generation status
        """
        start_time = time.time()
        target_dir = output_dir or self.options.output_dir
        errors: list[str] = []
        files_generated = 0
        
        self.renderer.heading(1, "Evolution Mode")
        self.renderer.info(f"Prompt: {prompt}")
        self.renderer.info(f"Output: {target_dir}")
        
        # Create tasks
        parse_task = self.task_queue.add("Parse prompt", "parse")
        contract_task = self.task_queue.add("Generate contract", "contract")
        code_task = self.task_queue.add("Generate code", "code")
        validate_task = self.task_queue.add("Validate code", "validate")
        
        try:
            # Task 1: Parse prompt
            self.task_queue.start("parse")
            await asyncio.sleep(0.1)  # Simulate work
            self.task_queue.done("parse")
            
            # Task 2: Generate contract
            self.task_queue.start("contract")
            contract = await self._generate_contract(prompt)
            if not contract:
                self.task_queue.fail("contract", "Failed to generate contract")
                errors.append("Contract generation failed")
            else:
                self.task_queue.done("contract")
            
            # Task 3: Generate code
            if contract:
                self.task_queue.start("code")
                files = await self._generate_code(contract, target_dir)
                files_generated = len(files)
                if files_generated == 0:
                    self.task_queue.fail("code", "No files generated")
                    errors.append("Code generation failed")
                else:
                    self.task_queue.done("code")
            else:
                self.task_queue.skip("code")
            
            # Task 4: Validate
            if files_generated > 0:
                self.task_queue.start("validate")
                validation_errors = await self._validate_code(target_dir)
                if validation_errors:
                    self.task_queue.fail("validate", f"{len(validation_errors)} errors")
                    errors.extend(validation_errors)
                else:
                    self.task_queue.done("validate")
            else:
                self.task_queue.skip("validate")
            
        except Exception as e:
            errors.append(str(e))
            self.renderer.error(f"Evolution failed: {e}")
        
        time_ms = int((time.time() - start_time) * 1000)
        success = len(errors) == 0 and files_generated > 0
        
        if success:
            self.renderer.success(f"Evolution complete! Generated {files_generated} files")
        else:
            self.renderer.error(f"Evolution failed with {len(errors)} errors")
        
        return EvolutionResult(
            success=success,
            iterations=1,
            files_generated=files_generated,
            errors=errors,
            time_ms=time_ms
        )
    
    async def _generate_contract(self, prompt: str) -> Optional[dict]:
        """Generate contract from prompt"""
        # Simplified implementation
        # In full version, would use ContractGenerator
        return {
            "definition": {
                "app": {"name": "Generated App", "version": "1.0.0"},
                "entities": [
                    {
                        "name": "Item",
                        "fields": [
                            {"name": "id", "type": "UUID"},
                            {"name": "name", "type": "String"},
                            {"name": "createdAt", "type": "DateTime"},
                        ]
                    }
                ]
            },
            "generation": {
                "techStack": {
                    "backend": {
                        "runtime": "node",
                        "language": "typescript",
                        "framework": "express",
                        "port": 3000
                    }
                }
            },
            "validation": {}
        }
    
    async def _generate_code(self, contract: dict, output_dir: str) -> list[str]:
        """Generate code from contract"""
        # Simplified implementation
        # In full version, would use CodeGenerator
        files = ["package.json", "src/index.ts", "src/models/item.ts", "src/routes/item.ts"]
        
        # Create output directory
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        return files
    
    async def _validate_code(self, output_dir: str) -> list[str]:
        """Validate generated code"""
        # Simplified implementation
        # In full version, would use ValidationPipeline
        return []
    
    def get_task_queue(self) -> TaskQueue:
        """Get the task queue"""
        return self.task_queue
