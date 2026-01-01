"""
LLM Output Contract Tests

Tests for Pydantic LLM output contracts.

@version 2.3.0
"""

import pytest
from pydantic import ValidationError

import sys
sys.path.insert(0, '.')

from pycontracts.llm import (
    GeneratedFile,
    LLMCodeOutput,
    ValidationResult,
    PipelineResult,
    StageResult,
)
from pycontracts.llm.outputs import (
    ValidationError as VError,
    ValidationWarning,
    PipelineSummary,
    FeedbackItem,
    CorrectionFeedback,
)


class TestGeneratedFile:
    """Tests for GeneratedFile"""
    
    def test_valid_file(self):
        file = GeneratedFile(
            path="api/src/server.ts",
            content="console.log('hello');"
        )
        assert file.path == "api/src/server.ts"
        assert file.target == "api"
    
    def test_get_extension(self):
        file = GeneratedFile(path="test.ts", content="")
        assert file.get_extension() == "ts"
        
        file2 = GeneratedFile(path="Dockerfile", content="")
        assert file2.get_extension() == "Dockerfile"
    
    def test_empty_path(self):
        with pytest.raises(ValidationError):
            GeneratedFile(path="", content="test")


class TestLLMCodeOutput:
    """Tests for LLMCodeOutput"""
    
    def test_valid_output(self):
        output = LLMCodeOutput(
            files=[
                GeneratedFile(path="server.ts", content="// server"),
                GeneratedFile(path="types.ts", content="// types")
            ],
            model="llama3"
        )
        assert len(output.files) == 2
        assert output.model == "llama3"
    
    def test_get_file(self):
        output = LLMCodeOutput(
            files=[
                GeneratedFile(path="api/server.ts", content="server"),
                GeneratedFile(path="api/types.ts", content="types")
            ]
        )
        file = output.get_file("server.ts")
        assert file is not None
        assert file.content == "server"
    
    def test_get_files_by_target(self):
        output = LLMCodeOutput(
            files=[
                GeneratedFile(path="s.ts", content="", target="api"),
                GeneratedFile(path="c.tsx", content="", target="frontend"),
                GeneratedFile(path="t.ts", content="", target="api")
            ]
        )
        api_files = output.get_files_by_target("api")
        assert len(api_files) == 2


class TestStageResult:
    """Tests for StageResult"""
    
    def test_passed_stage(self):
        result = StageResult(
            stage="syntax",
            passed=True,
            timeMs=50
        )
        assert result.passed
        assert result.time_ms == 50
    
    def test_failed_stage(self):
        result = StageResult(
            stage="security",
            passed=False,
            errors=[
                VError(message="SQL injection risk", file="db.ts", line=10)
            ]
        )
        assert not result.passed
        assert len(result.errors) == 1


class TestPipelineResult:
    """Tests for PipelineResult"""
    
    def test_passed_pipeline(self):
        result = PipelineResult(
            passed=True,
            stages=[
                StageResult(stage="syntax", passed=True),
                StageResult(stage="security", passed=True)
            ],
            summary=PipelineSummary(
                totalErrors=0,
                totalWarnings=0,
                passedStages=2,
                failedStages=0,
                totalTimeMs=100
            )
        )
        assert result.passed
        assert result.summary.passed_stages == 2
    
    def test_failed_pipeline(self):
        result = PipelineResult(
            passed=False,
            stages=[
                StageResult(stage="syntax", passed=False, errors=[
                    VError(message="error")
                ])
            ],
            summary=PipelineSummary(
                totalErrors=1,
                failedStages=1
            )
        )
        assert not result.passed


class TestFeedbackItem:
    """Tests for FeedbackItem"""
    
    def test_valid_feedback(self):
        item = FeedbackItem(
            file="server.ts",
            issue="Missing error handling",
            severity="warning",
            suggestion="Add try-catch block"
        )
        assert item.severity == "warning"
        assert item.suggestion is not None


class TestCorrectionFeedback:
    """Tests for CorrectionFeedback"""
    
    def test_valid_feedback(self):
        feedback = CorrectionFeedback(
            issues=[
                FeedbackItem(file="a.ts", issue="Error 1"),
                FeedbackItem(file="b.ts", issue="Error 2")
            ],
            summary="2 issues found",
            priorityFiles=["a.ts"]
        )
        assert len(feedback.issues) == 2
        assert feedback.priority_files == ["a.ts"]


class TestValidationResult:
    """Tests for ValidationResult"""
    
    def test_successful_validation(self):
        result = ValidationResult(
            pipeline=PipelineResult(
                passed=True,
                stages=[],
                summary=PipelineSummary()
            ),
            success=True,
            iterationsUsed=1
        )
        assert result.success
        assert result.iterations_used == 1
    
    def test_failed_with_feedback(self):
        result = ValidationResult(
            pipeline=PipelineResult(
                passed=False,
                stages=[],
                summary=PipelineSummary(totalErrors=3)
            ),
            feedback=CorrectionFeedback(
                issues=[FeedbackItem(file="x.ts", issue="Error")],
                summary="1 error"
            ),
            success=False,
            iterationsUsed=5
        )
        assert not result.success
        assert result.feedback is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
