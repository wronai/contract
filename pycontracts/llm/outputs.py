"""
LLM Output Contracts

Defines schemas for LLM-generated code and validation results.

@version 2.3.0
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


# ============================================================================
# GENERATED CODE
# ============================================================================

class GeneratedFile(BaseModel):
    """A single generated file"""
    path: str = Field(..., min_length=1)
    content: str
    target: Literal["api", "frontend", "shared", "docker"] = "api"
    language: Optional[str] = None
    
    def get_extension(self) -> str:
        """Get file extension"""
        parts = self.path.split(".")
        return parts[-1] if len(parts) > 1 else ""


class LLMCodeOutput(BaseModel):
    """Complete LLM code generation output"""
    files: List[GeneratedFile]
    model: str = "unknown"
    tokens_used: int = Field(default=0, alias="tokensUsed", ge=0)
    generation_time_ms: int = Field(default=0, alias="generationTimeMs", ge=0)
    
    def get_file(self, path: str) -> Optional[GeneratedFile]:
        """Get file by path"""
        for f in self.files:
            if f.path == path or f.path.endswith(path):
                return f
        return None
    
    def get_files_by_target(self, target: str) -> List[GeneratedFile]:
        """Get all files for a target"""
        return [f for f in self.files if f.target == target]


# ============================================================================
# VALIDATION RESULTS
# ============================================================================

class ValidationError(BaseModel):
    """A validation error"""
    message: str
    file: Optional[str] = None
    line: Optional[int] = None
    code: Optional[str] = None


class ValidationWarning(BaseModel):
    """A validation warning"""
    message: str
    file: Optional[str] = None
    line: Optional[int] = None


class StageResult(BaseModel):
    """Result from a single validation stage"""
    stage: str
    passed: bool
    errors: List[ValidationError] = []
    warnings: List[ValidationWarning] = []
    time_ms: int = Field(default=0, alias="timeMs", ge=0)
    metrics: Dict[str, Any] = {}


class PipelineSummary(BaseModel):
    """Summary of pipeline execution"""
    total_errors: int = Field(default=0, alias="totalErrors", ge=0)
    total_warnings: int = Field(default=0, alias="totalWarnings", ge=0)
    passed_stages: int = Field(default=0, alias="passedStages", ge=0)
    failed_stages: int = Field(default=0, alias="failedStages", ge=0)
    total_time_ms: int = Field(default=0, alias="totalTimeMs", ge=0)


class PipelineResult(BaseModel):
    """Complete pipeline validation result"""
    passed: bool
    stages: List[StageResult]
    summary: PipelineSummary


# ============================================================================
# FEEDBACK
# ============================================================================

class FeedbackItem(BaseModel):
    """A single feedback item for code correction"""
    file: str
    issue: str
    severity: Literal["error", "warning", "info"] = "error"
    suggestion: Optional[str] = None
    line: Optional[int] = None
    code: Optional[str] = None
    contract_hint: Optional[str] = Field(None, alias="contractHint")


class CorrectionFeedback(BaseModel):
    """Feedback for LLM code correction"""
    issues: List[FeedbackItem]
    summary: str
    priority_files: List[str] = Field(default=[], alias="priorityFiles")
    iteration: int = 1
    max_iterations: int = Field(default=5, alias="maxIterations")


class ValidationResult(BaseModel):
    """Complete validation result with feedback"""
    pipeline: PipelineResult
    feedback: Optional[CorrectionFeedback] = None
    success: bool = False
    iterations_used: int = Field(default=1, alias="iterationsUsed")
