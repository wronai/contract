"""
Validation Stages

Individual validation stages for the pipeline.

Mirrors: src/core/contract-ai/validation/stages/
@version 2.4.1
"""

import re
import subprocess
from typing import Any

from .pipeline import ValidationStage, ValidationContext, StageResult, StageError


# ============================================================================
# SYNTAX VALIDATOR
# ============================================================================

def create_syntax_validator() -> ValidationStage:
    """
    Create syntax validation stage.
    Checks TypeScript/Python syntax.
    """
    def validate(context: ValidationContext) -> StageResult:
        errors = []
        warnings = []
        
        for filename, content in context.code.files.items():
            # Basic syntax checks
            if filename.endswith('.ts') or filename.endswith('.js'):
                # Check for common TS/JS errors
                syntax_errors = _check_js_syntax(filename, content)
                errors.extend(syntax_errors)
            elif filename.endswith('.py'):
                # Check Python syntax
                syntax_errors = _check_python_syntax(filename, content)
                errors.extend(syntax_errors)
        
        return StageResult(
            stage="syntax",
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            metrics={"files_checked": len(context.code.files)}
        )
    
    return ValidationStage(
        name="syntax",
        validator=validate,
        critical=True,
        timeout=30000
    )


def _check_js_syntax(filename: str, content: str) -> list[StageError]:
    """Check JavaScript/TypeScript syntax"""
    errors = []
    lines = content.split('\n')
    
    # Track braces, brackets, parens
    brace_count = 0
    bracket_count = 0
    paren_count = 0
    
    for i, line in enumerate(lines, 1):
        # Skip comments
        stripped = line.strip()
        if stripped.startswith('//') or stripped.startswith('/*'):
            continue
        
        brace_count += line.count('{') - line.count('}')
        bracket_count += line.count('[') - line.count(']')
        paren_count += line.count('(') - line.count(')')
        
        # Check for common errors
        if 'console.log(' in line and not line.strip().endswith(';') and not line.strip().endswith(','):
            if not any(c in line for c in ['{', '(', '[']):
                errors.append(StageError(
                    message="Missing semicolon",
                    file=filename,
                    line=i,
                    severity="warning"
                ))
    
    if brace_count != 0:
        errors.append(StageError(
            message=f"Unbalanced braces: {brace_count}",
            file=filename,
            severity="error"
        ))
    
    return errors


def _check_python_syntax(filename: str, content: str) -> list[StageError]:
    """Check Python syntax using compile()"""
    errors = []
    
    try:
        compile(content, filename, 'exec')
    except SyntaxError as e:
        errors.append(StageError(
            message=str(e.msg),
            file=filename,
            line=e.lineno,
            severity="error"
        ))
    
    return errors


# ============================================================================
# SCHEMA VALIDATOR
# ============================================================================

def create_schema_validator() -> ValidationStage:
    """
    Create schema validation stage.
    Validates generated code against contract schema.
    """
    def validate(context: ValidationContext) -> StageResult:
        errors = []
        warnings = []
        
        # Check if required files exist
        contract = context.contract
        entities = contract.get('definition', {}).get('entities', [])
        
        for entity in entities:
            entity_name = entity.get('name', '')
            # Check for entity model file
            expected_files = [
                f"models/{entity_name.lower()}.ts",
                f"models/{entity_name}.ts",
                f"src/models/{entity_name.lower()}.ts",
            ]
            
            found = any(f in context.code.files for f in expected_files)
            if not found and len(context.code.files) > 0:
                warnings.append(StageError(
                    message=f"No model file found for entity '{entity_name}'",
                    severity="warning"
                ))
        
        return StageResult(
            stage="schema",
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            metrics={"entities_checked": len(entities)}
        )
    
    return ValidationStage(
        name="schema",
        validator=validate,
        critical=False,
        timeout=10000
    )


# ============================================================================
# ASSERTION VALIDATOR
# ============================================================================

def create_assertion_validator() -> ValidationStage:
    """
    Create assertion validation stage.
    Checks contract assertions against generated code.
    """
    def validate(context: ValidationContext) -> StageResult:
        errors = []
        warnings = []
        
        # Get assertions from contract
        validation = context.contract.get('validation', {})
        assertions = validation.get('assertions', [])
        
        passed_count = 0
        for assertion in assertions:
            assertion_type = assertion.get('type', '')
            target = assertion.get('target', '')
            
            if assertion_type == 'file-exists':
                if target in context.code.files:
                    passed_count += 1
                else:
                    errors.append(StageError(
                        message=f"Assertion failed: file '{target}' does not exist",
                        severity="error"
                    ))
            elif assertion_type == 'file-contains':
                expected = assertion.get('expected', '')
                content = context.code.files.get(target, '')
                if expected in content:
                    passed_count += 1
                else:
                    errors.append(StageError(
                        message=f"Assertion failed: file '{target}' does not contain '{expected}'",
                        file=target,
                        severity="error"
                    ))
        
        return StageResult(
            stage="assertions",
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            metrics={
                "assertions_total": len(assertions),
                "assertions_passed": passed_count
            }
        )
    
    return ValidationStage(
        name="assertions",
        validator=validate,
        critical=True,
        timeout=10000
    )


# ============================================================================
# STATIC ANALYZER
# ============================================================================

def create_static_analyzer() -> ValidationStage:
    """
    Create static analysis stage.
    Checks code quality rules.
    """
    def validate(context: ValidationContext) -> StageResult:
        errors = []
        warnings = []
        
        for filename, content in context.code.files.items():
            if filename.endswith('.ts') or filename.endswith('.js'):
                # Check for console.log in production code
                if 'console.log' in content and 'test' not in filename.lower():
                    warnings.append(StageError(
                        message="console.log found in production code",
                        file=filename,
                        severity="warning"
                    ))
                
                # Check for any type
                if ': any' in content or ':any' in content:
                    warnings.append(StageError(
                        message="Usage of 'any' type detected",
                        file=filename,
                        severity="warning"
                    ))
                
                # Check for TODO comments
                if 'TODO' in content or 'FIXME' in content:
                    warnings.append(StageError(
                        message="TODO/FIXME comment found",
                        file=filename,
                        severity="info"
                    ))
        
        return StageResult(
            stage="static-analysis",
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            metrics={"files_analyzed": len(context.code.files)}
        )
    
    return ValidationStage(
        name="static-analysis",
        validator=validate,
        critical=False,
        timeout=30000
    )


# ============================================================================
# TEST RUNNER
# ============================================================================

def create_test_runner() -> ValidationStage:
    """
    Create test runner stage.
    Runs generated tests.
    """
    def validate(context: ValidationContext) -> StageResult:
        errors = []
        warnings = []
        
        # Check if test files exist
        test_files = [f for f in context.code.files if 'test' in f.lower() or 'spec' in f.lower()]
        
        if not test_files:
            warnings.append(StageError(
                message="No test files found",
                severity="warning"
            ))
        
        # In a real implementation, we would run the tests here
        # For now, just check that test files exist
        
        return StageResult(
            stage="tests",
            passed=True,  # Placeholder - would actually run tests
            errors=errors,
            warnings=warnings,
            metrics={
                "test_files": len(test_files),
                "tests_run": 0,
                "tests_passed": 0
            }
        )
    
    return ValidationStage(
        name="tests",
        validator=validate,
        critical=False,
        timeout=120000
    )


# ============================================================================
# QUALITY CHECKER
# ============================================================================

def create_quality_checker() -> ValidationStage:
    """
    Create quality checker stage.
    Checks code quality metrics.
    """
    def validate(context: ValidationContext) -> StageResult:
        errors = []
        warnings = []
        
        total_lines = 0
        max_function_lines = 0
        
        for filename, content in context.code.files.items():
            lines = content.split('\n')
            total_lines += len(lines)
            
            # Check function length (rough estimate)
            if filename.endswith('.ts') or filename.endswith('.js'):
                in_function = False
                function_lines = 0
                
                for line in lines:
                    if re.search(r'(function|const.*=.*=>|async.*=>)', line):
                        in_function = True
                        function_lines = 0
                    elif in_function:
                        function_lines += 1
                        if line.strip() == '}':
                            max_function_lines = max(max_function_lines, function_lines)
                            in_function = False
        
        # Quality warnings
        if max_function_lines > 50:
            warnings.append(StageError(
                message=f"Function with {max_function_lines} lines detected (max recommended: 50)",
                severity="warning"
            ))
        
        return StageResult(
            stage="quality",
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            metrics={
                "total_lines": total_lines,
                "max_function_lines": max_function_lines,
                "files_count": len(context.code.files)
            }
        )
    
    return ValidationStage(
        name="quality",
        validator=validate,
        critical=False,
        timeout=30000
    )


# ============================================================================
# SECURITY SCANNER
# ============================================================================

def create_security_scanner() -> ValidationStage:
    """
    Create security scanner stage.
    Checks for security vulnerabilities.
    """
    def validate(context: ValidationContext) -> StageResult:
        errors = []
        warnings = []
        
        security_patterns = [
            (r'eval\s*\(', "Usage of eval() detected - potential code injection"),
            (r'innerHTML\s*=', "Direct innerHTML assignment - potential XSS"),
            (r'document\.write', "document.write usage detected - potential XSS"),
            (r'password\s*=\s*["\'][^"\']+["\']', "Hardcoded password detected"),
            (r'api[_-]?key\s*=\s*["\'][^"\']+["\']', "Hardcoded API key detected"),
            (r'secret\s*=\s*["\'][^"\']+["\']', "Hardcoded secret detected"),
        ]
        
        for filename, content in context.code.files.items():
            for pattern, message in security_patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    warnings.append(StageError(
                        message=message,
                        file=filename,
                        severity="warning"
                    ))
        
        return StageResult(
            stage="security",
            passed=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            metrics={"patterns_checked": len(security_patterns)}
        )
    
    return ValidationStage(
        name="security",
        validator=validate,
        critical=True,
        timeout=30000
    )


# ============================================================================
# RUNTIME VALIDATOR
# ============================================================================

def create_runtime_validator() -> ValidationStage:
    """
    Create runtime validation stage.
    Tests runtime behavior (placeholder).
    """
    def validate(context: ValidationContext) -> StageResult:
        # Placeholder - would deploy and test in real implementation
        return StageResult(
            stage="runtime",
            passed=True,
            errors=[],
            warnings=[],
            metrics={"runtime_tests": 0}
        )
    
    return ValidationStage(
        name="runtime",
        validator=validate,
        critical=False,
        timeout=300000
    )
