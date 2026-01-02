"""
Validation Pipeline Orchestrator

Manages 8-stage validation pipeline for generated code.

Mirrors: src/core/contract-ai/validation/pipeline-orchestrator.ts
@version 2.2.0
"""

import asyncio
import time
from typing import Any, Callable, Optional

from pydantic import BaseModel, Field


# ============================================================================
# TYPES
# ============================================================================

class StageError(BaseModel):
    """Error from a validation stage"""
    message: str
    file: Optional[str] = None
    line: Optional[int] = None
    severity: str = "error"
    code: Optional[str] = None


class StageResult(BaseModel):
    """Result from a single validation stage"""
    stage: str
    passed: bool
    time_ms: int = Field(default=0, alias="timeMs")
    errors: list[StageError] = Field(default_factory=list)
    warnings: list[StageError] = Field(default_factory=list)
    metrics: dict[str, Any] = Field(default_factory=dict)
    
    model_config = {"populate_by_name": True}


class PipelineResult(BaseModel):
    """Result from the complete validation pipeline"""
    passed: bool
    stages: list[StageResult] = Field(default_factory=list)
    total_time_ms: int = Field(default=0, alias="totalTimeMs")
    errors_count: int = Field(default=0, alias="errorsCount")
    warnings_count: int = Field(default=0, alias="warningsCount")
    
    model_config = {"populate_by_name": True}


class GeneratedCode(BaseModel):
    """Generated code structure"""
    files: dict[str, str] = Field(default_factory=dict)
    entry_point: Optional[str] = Field(default=None, alias="entryPoint")
    
    model_config = {"populate_by_name": True}


class ValidationContext(BaseModel):
    """Context passed between validation stages"""
    contract: dict[str, Any]
    code: GeneratedCode
    work_dir: str = Field(default="/tmp/reclapp-validation", alias="workDir")
    previous_results: dict[str, StageResult] = Field(default_factory=dict, alias="previousResults")
    
    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class ValidationStage(BaseModel):
    """Validation stage definition"""
    name: str
    validator: Callable[[ValidationContext], StageResult]
    critical: bool = False
    timeout: int = 60000
    
    model_config = {"arbitrary_types_allowed": True}


class PipelineOptions(BaseModel):
    """Pipeline configuration options"""
    fail_fast: bool = Field(default=True, alias="failFast")
    timeout: int = 60000
    verbose: bool = False
    work_dir: str = Field(default="/tmp/reclapp-validation", alias="workDir")
    
    model_config = {"populate_by_name": True}


# ============================================================================
# CRITICAL STAGES
# ============================================================================

CRITICAL_STAGES = {"syntax", "assertions", "security"}


# ============================================================================
# PIPELINE ORCHESTRATOR
# ============================================================================

class ValidationPipeline:
    """
    8-stage validation pipeline orchestrator.
    
    Example:
        pipeline = ValidationPipeline(verbose=True)
        pipeline.register_stages([
            create_syntax_validator(),
            create_schema_validator(),
        ])
        
        result = await pipeline.validate(contract, code)
        if result.passed:
            print("All validations passed!")
    """
    
    def __init__(
        self,
        fail_fast: bool = True,
        timeout: int = 60000,
        verbose: bool = False,
        work_dir: str = "/tmp/reclapp-validation"
    ):
        self.options = PipelineOptions(
            fail_fast=fail_fast,
            timeout=timeout,
            verbose=verbose,
            work_dir=work_dir
        )
        self.stages: list[ValidationStage] = []
    
    def register_stage(self, stage: ValidationStage) -> None:
        """Register a validation stage"""
        self.stages.append(stage)
    
    def register_stages(self, stages: list[ValidationStage]) -> None:
        """Register multiple validation stages"""
        self.stages.extend(stages)
    
    async def validate(
        self,
        contract: dict[str, Any],
        code: GeneratedCode
    ) -> PipelineResult:
        """
        Run the validation pipeline.
        
        Args:
            contract: Contract definition
            code: Generated code
            
        Returns:
            Pipeline result with all stage results
        """
        start_time = time.time()
        results: list[StageResult] = []
        previous_results: dict[str, StageResult] = {}
        
        context = ValidationContext(
            contract=contract,
            code=code,
            work_dir=self.options.work_dir,
            previous_results=previous_results
        )
        
        if self.options.verbose:
            print(f"\n🔍 Starting validation pipeline with {len(self.stages)} stages")
        
        for stage in self.stages:
            if self.options.verbose:
                print(f"\n   Running stage: {stage.name}...")
            
            stage_result = await self._run_stage(stage, context)
            results.append(stage_result)
            previous_results[stage.name] = stage_result
            context.previous_results = previous_results
            
            if self.options.verbose:
                icon = "✅" if stage_result.passed else "❌"
                print(f"   {icon} {stage.name}: {'PASSED' if stage_result.passed else 'FAILED'} ({stage_result.time_ms}ms)")
                
                if not stage_result.passed:
                    for error in stage_result.errors[:3]:
                        print(f"      - {error.message}")
            
            # Fail fast on critical stage failure
            if not stage_result.passed and stage.critical and self.options.fail_fast:
                if self.options.verbose:
                    print(f"\n⚠️ Critical stage '{stage.name}' failed, stopping pipeline")
                break
        
        total_time_ms = int((time.time() - start_time) * 1000)
        errors_count = sum(len(r.errors) for r in results)
        warnings_count = sum(len(r.warnings) for r in results)
        all_passed = all(r.passed for r in results)
        
        if self.options.verbose:
            icon = "✅" if all_passed else "❌"
            print(f"\n{icon} Pipeline {'PASSED' if all_passed else 'FAILED'} in {total_time_ms}ms")
        
        return PipelineResult(
            passed=all_passed,
            stages=results,
            total_time_ms=total_time_ms,
            errors_count=errors_count,
            warnings_count=warnings_count
        )
    
    async def _run_stage(
        self,
        stage: ValidationStage,
        context: ValidationContext
    ) -> StageResult:
        """Run a single validation stage with timeout"""
        start_time = time.time()
        
        try:
            # Run with timeout
            timeout_sec = (stage.timeout or self.options.timeout) / 1000
            
            if asyncio.iscoroutinefunction(stage.validator):
                result = await asyncio.wait_for(
                    stage.validator(context),
                    timeout=timeout_sec
                )
            else:
                # Sync validator
                result = stage.validator(context)
            
            result.time_ms = int((time.time() - start_time) * 1000)
            return result
            
        except asyncio.TimeoutError:
            return StageResult(
                stage=stage.name,
                passed=False,
                time_ms=int((time.time() - start_time) * 1000),
                errors=[StageError(
                    message=f"Stage '{stage.name}' timed out after {stage.timeout}ms"
                )]
            )
        except Exception as e:
            return StageResult(
                stage=stage.name,
                passed=False,
                time_ms=int((time.time() - start_time) * 1000),
                errors=[StageError(
                    message=f"Stage '{stage.name}' error: {str(e)}"
                )]
            )
    
    def get_stage_names(self) -> list[str]:
        """Get list of registered stage names"""
        return [s.name for s in self.stages]
