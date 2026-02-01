#!/usr/bin/env python3
"""
Code2Logic Integration for Contract Refactoring.

This module integrates the external Code2Logic library for code analysis
and YAML generation to support contract-based refactoring workflows.

Usage:
    from code2logic_integration import (
        analyze_for_refactoring,
        generate_contract_yaml,
        RefactoringContext,
    )
    
    # Analyze project and generate YAML for contract refactoring
    context = analyze_for_refactoring("/path/to/project")
    yaml_output = generate_contract_yaml(context)
"""

import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

# Add external code2logic to path
CODE2LOGIC_PATH = Path("/home/tom/github/wronai/code2logic")
if CODE2LOGIC_PATH.exists() and str(CODE2LOGIC_PATH) not in sys.path:
    sys.path.insert(0, str(CODE2LOGIC_PATH))

# Import from external code2logic
try:
    from code2logic import (
        analyze_project,
        ProjectInfo,
        ModuleInfo,
        ClassInfo,
        FunctionInfo,
        YAMLGenerator,
        JSONGenerator,
        MarkdownGenerator,
        CompactGenerator,
        generate_file_yaml,
        generate_file_json,
        # Refactoring utilities
        find_duplicates,
        analyze_quality,
        suggest_refactoring,
        compare_codebases,
        quick_analyze,
        RefactoringReport,
        DuplicateGroup,
    )
    CODE2LOGIC_AVAILABLE = True
except ImportError as e:
    CODE2LOGIC_AVAILABLE = False
    _import_error = str(e)


@dataclass
class RefactoringContext:
    """Context for contract-based refactoring.
    
    Contains analyzed project information and metadata needed
    for generating contract-compatible YAML specifications.
    """
    project: Optional[Any] = None  # ProjectInfo
    project_path: str = ""
    total_files: int = 0
    total_lines: int = 0
    languages: Dict[str, int] = field(default_factory=dict)
    modules: List[Any] = field(default_factory=list)
    duplicates: List[Any] = field(default_factory=list)
    quality_issues: List[Any] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary."""
        return {
            "project_path": self.project_path,
            "total_files": self.total_files,
            "total_lines": self.total_lines,
            "languages": self.languages,
            "modules_count": len(self.modules),
            "duplicates_count": len(self.duplicates),
            "quality_issues_count": len(self.quality_issues),
        }


def check_code2logic_available() -> bool:
    """Check if external Code2Logic is available."""
    return CODE2LOGIC_AVAILABLE


def get_code2logic_status() -> Dict[str, Any]:
    """Get Code2Logic library status."""
    if not CODE2LOGIC_AVAILABLE:
        return {
            "available": False,
            "error": _import_error if '_import_error' in dir() else "Unknown error",
            "path": str(CODE2LOGIC_PATH),
        }
    
    try:
        from code2logic import __version__
        version = __version__
    except ImportError:
        version = "unknown"
    
    return {
        "available": True,
        "version": version,
        "path": str(CODE2LOGIC_PATH),
    }


def analyze_for_refactoring(
    project_path: str,
    include_duplicates: bool = True,
    include_quality: bool = True,
) -> RefactoringContext:
    """Analyze a project for contract-based refactoring.
    
    Args:
        project_path: Path to the project to analyze
        include_duplicates: Include duplicate detection
        include_quality: Include quality analysis
        
    Returns:
        RefactoringContext with analysis results
    """
    if not CODE2LOGIC_AVAILABLE:
        raise ImportError(
            f"Code2Logic not available. Please install from {CODE2LOGIC_PATH}"
        )
    
    # Analyze project with error handling
    try:
        project = analyze_project(project_path)
    except Exception as e:
        # Return empty context on parser errors
        import sys
        print(f"Warning: Analysis error: {e}", file=sys.stderr)
        return RefactoringContext(
            project=None,
            project_path=project_path,
        )
    
    context = RefactoringContext(
        project=project,
        project_path=project_path,
        total_files=project.total_files,
        total_lines=project.total_lines,
        languages=project.languages,
        modules=project.modules,
    )
    
    # Find duplicates
    if include_duplicates:
        try:
            context.duplicates = find_duplicates(project_path)
        except Exception:
            pass
    
    # Analyze quality
    if include_quality:
        try:
            report = analyze_quality(project_path)
            context.quality_issues = report.quality_issues
        except Exception:
            pass
    
    return context


def generate_contract_yaml(
    context: RefactoringContext,
    detail_level: str = "standard",
    include_intents: bool = True,
    include_signatures: bool = True,
) -> str:
    """Generate YAML specification for contract refactoring.
    
    This generates a YAML format optimized for LLM-based code refactoring,
    compatible with the contract system's expectations.
    
    Args:
        context: RefactoringContext from analyze_for_refactoring
        detail_level: 'minimal', 'standard', or 'full'
        include_intents: Include function intent descriptions
        include_signatures: Include full function signatures
        
    Returns:
        YAML string specification
    """
    if not CODE2LOGIC_AVAILABLE:
        raise ImportError("Code2Logic not available")
    
    if context.project is None:
        raise ValueError("No project in context - run analyze_for_refactoring first")
    
    # Use YAMLGenerator from code2logic
    generator = YAMLGenerator()
    base_yaml = generator.generate(context.project, flat=False, detail=detail_level)
    
    # Add contract-specific metadata header
    lines = [
        "# Contract Refactoring Specification",
        f"# Generated by Code2Logic Integration",
        f"# Project: {context.project_path}",
        "",
        "contract_metadata:",
        f"  version: '1.0'",
        f"  type: refactoring_spec",
        f"  total_files: {context.total_files}",
        f"  total_lines: {context.total_lines}",
        f"  languages: {list(context.languages.keys())}",
        "",
    ]
    
    # Add duplicates section if present
    if context.duplicates:
        lines.append("duplicates:")
        for dup in context.duplicates[:20]:
            lines.append(f"  - hash: {dup.hash}")
            lines.append(f"    suggestion: \"{dup.suggestion}\"")
            lines.append(f"    effort: {dup.effort}")
            lines.append("    functions:")
            for func in dup.functions[:5]:
                lines.append(f"      - \"{func}\"")
        lines.append("")
    
    # Add quality issues section if present
    if context.quality_issues:
        lines.append("quality_issues:")
        for issue in context.quality_issues[:20]:
            lines.append(f"  - type: {issue.type}")
            lines.append(f"    severity: {issue.severity}")
            lines.append(f"    location: \"{issue.location}\"")
            lines.append(f"    description: \"{issue.description[:80]}\"")
        lines.append("")
    
    # Append the base YAML from code2logic
    lines.append("# Code Structure (from Code2Logic)")
    lines.append(base_yaml)
    
    return "\n".join(lines)


def generate_file_contract_yaml(file_path: str) -> str:
    """Generate YAML specification for a single file.
    
    Args:
        file_path: Path to source file
        
    Returns:
        YAML specification string
    """
    if not CODE2LOGIC_AVAILABLE:
        raise ImportError("Code2Logic not available")
    
    return generate_file_yaml(Path(file_path))


def generate_module_yaml(module: Any, include_methods: bool = True) -> str:
    """Generate YAML for a single module.
    
    Args:
        module: ModuleInfo object
        include_methods: Include class methods
        
    Returns:
        YAML string
    """
    lines = [
        f"module:",
        f"  path: {module.path}",
        f"  language: {module.language}",
        f"  lines_code: {module.lines_code}",
        f"  lines_total: {module.lines_total}",
    ]
    
    if module.imports:
        lines.append("  imports:")
        for imp in module.imports[:15]:
            lines.append(f"    - {imp}")
    
    if module.exports:
        lines.append("  exports:")
        for exp in module.exports[:15]:
            lines.append(f"    - {exp}")
    
    if module.classes:
        lines.append("  classes:")
        for cls in module.classes:
            lines.append(f"    - name: {cls.name}")
            if cls.bases:
                lines.append(f"      bases: [{', '.join(cls.bases)}]")
            if cls.docstring:
                lines.append(f"      docstring: \"{cls.docstring[:60]}\"")
            if cls.is_abstract:
                lines.append(f"      is_abstract: true")
            if include_methods and cls.methods:
                lines.append("      methods:")
                for m in cls.methods:
                    sig = _build_signature(m)
                    lines.append(f"        - name: {m.name}")
                    lines.append(f"          signature: \"{sig}\"")
                    if m.intent:
                        lines.append(f"          intent: \"{m.intent[:50]}\"")
                    if m.is_async:
                        lines.append(f"          is_async: true")
    
    if module.functions:
        lines.append("  functions:")
        for f in module.functions:
            sig = _build_signature(f)
            lines.append(f"    - name: {f.name}")
            lines.append(f"      signature: \"{sig}\"")
            if f.intent:
                lines.append(f"      intent: \"{f.intent[:50]}\"")
            if f.is_async:
                lines.append(f"      is_async: true")
            lines.append(f"      lines: {f.lines}")
    
    return "\n".join(lines)


def _build_signature(f: Any) -> str:
    """Build function signature string."""
    params = ", ".join(f.params[:6])
    if len(f.params) > 6:
        params += f", ...+{len(f.params) - 6}"
    ret = f" -> {f.return_type}" if f.return_type else ""
    return f"({params}){ret}"


# Re-export key functions from code2logic for convenience
if CODE2LOGIC_AVAILABLE:
    __all__ = [
        # Integration API
        "analyze_for_refactoring",
        "generate_contract_yaml",
        "generate_file_contract_yaml",
        "generate_module_yaml",
        "RefactoringContext",
        "check_code2logic_available",
        "get_code2logic_status",
        # Re-exported from code2logic
        "analyze_project",
        "ProjectInfo",
        "ModuleInfo", 
        "ClassInfo",
        "FunctionInfo",
        "YAMLGenerator",
        "JSONGenerator",
        "MarkdownGenerator",
        "CompactGenerator",
        "find_duplicates",
        "analyze_quality",
        "suggest_refactoring",
        "compare_codebases",
        "quick_analyze",
        "RefactoringReport",
        "DuplicateGroup",
    ]
else:
    __all__ = [
        "check_code2logic_available",
        "get_code2logic_status",
    ]


if __name__ == "__main__":
    # Test the integration
    import argparse
    
    parser = argparse.ArgumentParser(description="Code2Logic Integration for Contract")
    parser.add_argument("path", nargs="?", help="Project path to analyze")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument("-d", "--detail", default="standard", 
                       choices=["minimal", "standard", "full"],
                       help="Detail level")
    parser.add_argument("--status", action="store_true", help="Show status")
    
    args = parser.parse_args()
    
    if args.status:
        status = get_code2logic_status()
        print(f"Code2Logic Status:")
        for k, v in status.items():
            print(f"  {k}: {v}")
        sys.exit(0)
    
    if not args.path:
        parser.print_help()
        sys.exit(1)
    
    if not check_code2logic_available():
        print(f"Error: Code2Logic not available", file=sys.stderr)
        print(f"Install from: {CODE2LOGIC_PATH}", file=sys.stderr)
        sys.exit(1)
    
    # Analyze and generate YAML
    context = analyze_for_refactoring(args.path)
    yaml_output = generate_contract_yaml(context, detail_level=args.detail)
    
    if args.output:
        Path(args.output).write_text(yaml_output)
        print(f"Output written to: {args.output}")
    else:
        print(yaml_output)
