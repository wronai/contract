#!/usr/bin/env python3
"""
Code2Logic - Konwerter kodu źródłowego do kompaktowej reprezentacji logicznej dla LLM.

Generuje pojedynczy plik Markdown z hierarchiczną strukturą projektu,
sygnaturami funkcji, przepływem danych i zależnościami.

Obsługiwane języki: Python, JavaScript/TypeScript, Java, Go, Rust, C/C++
"""

import ast
import os
import re
import sys
import json
import hashlib
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Set, Any
from collections import defaultdict
from datetime import datetime
import argparse


# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class FunctionInfo:
    name: str
    params: List[str]
    return_type: Optional[str]
    docstring: Optional[str]
    calls: List[str]
    raises: List[str]
    complexity: int  # cyclomatic complexity estimate
    lines: int
    decorators: List[str]
    is_async: bool
    intent: str  # wygenerowany opis intencji


@dataclass
class ClassInfo:
    name: str
    bases: List[str]
    docstring: Optional[str]
    methods: List[FunctionInfo]
    attributes: List[str]
    class_vars: List[str]


@dataclass
class ModuleInfo:
    path: str
    language: str
    imports: List[str]
    exports: List[str]
    classes: List[ClassInfo]
    functions: List[FunctionInfo]
    constants: List[str]
    docstring: Optional[str]
    lines_total: int
    lines_code: int


@dataclass
class ProjectInfo:
    name: str
    root_path: str
    languages: Dict[str, int]  # language -> file count
    modules: List[ModuleInfo]
    dependency_graph: Dict[str, List[str]]  # module -> [dependencies]
    entrypoints: List[str]
    total_files: int
    total_lines: int
    generated_at: str


# ============================================================================
# LANGUAGE PARSERS
# ============================================================================

class PythonParser:
    """Parser dla kodu Python używający wbudowanego modułu ast."""

    def parse_file(self, filepath: str, content: str) -> Optional[ModuleInfo]:
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            return None

        imports = []
        classes = []
        functions = []
        constants = []
        exports = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    imports.append(f"{module}.{alias.name}")

        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ClassDef):
                classes.append(self._parse_class(node))
            elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                functions.append(self._parse_function(node))
            elif isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id.isupper():
                        constants.append(target.id)

        # Detect exports (__all__)
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "__all__":
                        if isinstance(node.value, (ast.List, ast.Tuple)):
                            for elt in node.value.elts:
                                if isinstance(elt, ast.Constant):
                                    exports.append(elt.value)

        if not exports:
            exports = [c.name for c in classes] + [f.name for f in functions if not f.name.startswith("_")]

        lines = content.split("\n")
        lines_code = len([l for l in lines if l.strip() and not l.strip().startswith("#")])

        docstring = ast.get_docstring(tree)

        return ModuleInfo(
            path=filepath,
            language="python",
            imports=imports,
            exports=exports,
            classes=classes,
            functions=functions,
            constants=constants,
            docstring=docstring,
            lines_total=len(lines),
            lines_code=lines_code
        )

    def _parse_class(self, node: ast.ClassDef) -> ClassInfo:
        bases = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                bases.append(base.id)
            elif isinstance(base, ast.Attribute):
                bases.append(f"{self._get_attr_chain(base)}")

        methods = []
        attributes = []
        class_vars = []

        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                methods.append(self._parse_function(item))
            elif isinstance(item, ast.AnnAssign):
                if isinstance(item.target, ast.Name):
                    class_vars.append(item.target.id)
            elif isinstance(item, ast.Assign):
                for target in item.targets:
                    if isinstance(target, ast.Name):
                        class_vars.append(target.id)

        # Extract instance attributes from __init__
        for method in methods:
            if method.name == "__init__":
                # Parse self.x = ... patterns
                pass  # Simplified for now

        return ClassInfo(
            name=node.name,
            bases=bases,
            docstring=ast.get_docstring(node),
            methods=methods,
            attributes=attributes,
            class_vars=class_vars
        )

    def _parse_function(self, node) -> FunctionInfo:
        is_async = isinstance(node, ast.AsyncFunctionDef)

        # Parameters
        params = []
        for arg in node.args.args:
            param_str = arg.arg
            if arg.annotation:
                param_str += f":{self._annotation_to_str(arg.annotation)}"
            params.append(param_str)

        # Return type
        return_type = None
        if node.returns:
            return_type = self._annotation_to_str(node.returns)

        # Decorators
        decorators = []
        for dec in node.decorator_list:
            if isinstance(dec, ast.Name):
                decorators.append(dec.id)
            elif isinstance(dec, ast.Call):
                if isinstance(dec.func, ast.Name):
                    decorators.append(dec.func.id)

        # Function calls
        calls = set()
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name):
                    calls.add(child.func.id)
                elif isinstance(child.func, ast.Attribute):
                    calls.add(child.func.attr)

        # Raises
        raises = set()
        for child in ast.walk(node):
            if isinstance(child, ast.Raise):
                if child.exc:
                    if isinstance(child.exc, ast.Call):
                        if isinstance(child.exc.func, ast.Name):
                            raises.add(child.exc.func.id)
                    elif isinstance(child.exc, ast.Name):
                        raises.add(child.exc.id)

        # Complexity estimate (simplified)
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.ExceptHandler,
                                  ast.With, ast.Assert, ast.comprehension)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1

        # Lines
        lines = node.end_lineno - node.lineno + 1 if hasattr(node, 'end_lineno') else 1

        # Generate intent from docstring or function name
        docstring = ast.get_docstring(node)
        intent = self._generate_intent(node.name, docstring, list(calls))

        return FunctionInfo(
            name=node.name,
            params=params,
            return_type=return_type,
            docstring=docstring,
            calls=list(calls),
            raises=list(raises),
            complexity=complexity,
            lines=lines,
            decorators=decorators,
            is_async=is_async,
            intent=intent
        )

    def _annotation_to_str(self, node) -> str:
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Constant):
            return str(node.value)
        elif isinstance(node, ast.Subscript):
            base = self._annotation_to_str(node.value)
            if isinstance(node.slice, ast.Tuple):
                args = ",".join(self._annotation_to_str(e) for e in node.slice.elts)
            else:
                args = self._annotation_to_str(node.slice)
            return f"{base}[{args}]"
        elif isinstance(node, ast.Attribute):
            return self._get_attr_chain(node)
        elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
            left = self._annotation_to_str(node.left)
            right = self._annotation_to_str(node.right)
            return f"{left}|{right}"
        return "Any"

    def _get_attr_chain(self, node: ast.Attribute) -> str:
        parts = []
        current = node
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if isinstance(current, ast.Name):
            parts.append(current.id)
        return ".".join(reversed(parts))

    def _generate_intent(self, name: str, docstring: Optional[str], calls: List[str]) -> str:
        if docstring:
            # First sentence of docstring
            first_line = docstring.split("\n")[0].strip()
            if len(first_line) <= 100:
                return first_line
            return first_line[:97] + "..."

        # Generate from name
        words = re.sub(r'([A-Z])', r' \1', name).replace("_", " ").lower().split()

        # Common patterns
        if words[0] in ("get", "fetch", "retrieve", "load"):
            return f"pobiera {' '.join(words[1:])}"
        elif words[0] in ("set", "update", "save", "store"):
            return f"zapisuje {' '.join(words[1:])}"
        elif words[0] in ("create", "make", "build", "generate"):
            return f"tworzy {' '.join(words[1:])}"
        elif words[0] in ("delete", "remove", "clear"):
            return f"usuwa {' '.join(words[1:])}"
        elif words[0] in ("is", "has", "can", "should"):
            return f"sprawdza czy {' '.join(words[1:])}"
        elif words[0] in ("validate", "check", "verify"):
            return f"waliduje {' '.join(words[1:])}"
        elif words[0] == "process":
            return f"przetwarza {' '.join(words[1:])}"
        elif words[0] == "handle":
            return f"obsługuje {' '.join(words[1:])}"
        elif words[0] == "convert" or words[0] == "transform":
            return f"konwertuje {' '.join(words[1:])}"
        elif words[0] == "parse":
            return f"parsuje {' '.join(words[1:])}"
        elif words[0] == "render":
            return f"renderuje {' '.join(words[1:])}"
        elif words[0] == "send":
            return f"wysyła {' '.join(words[1:])}"
        elif words[0] == "receive":
            return f"odbiera {' '.join(words[1:])}"

        return " ".join(words)


class GenericParser:
    """Prosty parser dla języków bez dedykowanego parsera AST."""

    # Wzorce dla różnych języków
    PATTERNS = {
        "javascript": {
            "function": r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)",
            "arrow": r"(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>",
            "class": r"(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?",
            "method": r"(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*{",
            "import": r"import\s+.*?from\s+['\"]([^'\"]+)['\"]",
        },
        "typescript": {
            "function": r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?",
            "arrow": r"(?:export\s+)?(?:const|let)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>",
            "class": r"(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?",
            "interface": r"(?:export\s+)?interface\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+([^{]+))?",
            "type": r"(?:export\s+)?type\s+(\w+)(?:<[^>]+>)?\s*=",
            "import": r"import\s+.*?from\s+['\"]([^'\"]+)['\"]",
        },
        "java": {
            "class": r"(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?",
            "interface": r"(?:public\s+)?interface\s+(\w+)(?:<[^>]+>)?(?:\s+extends\s+([^{]+))?",
            "method": r"(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:<[^>]+>\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)",
            "import": r"import\s+([^;]+);",
        },
        "go": {
            "function": r"func\s+(\w+)\s*\(([^)]*)\)\s*(?:\(([^)]+)\)|(\w+))?",
            "method": r"func\s+\((\w+)\s+\*?(\w+)\)\s+(\w+)\s*\(([^)]*)\)",
            "struct": r"type\s+(\w+)\s+struct\s*{",
            "interface": r"type\s+(\w+)\s+interface\s*{",
            "import": r"import\s+(?:\(\s*([^)]+)\s*\)|\"([^\"]+)\")",
        },
        "rust": {
            "function": r"(?:pub\s+)?(?:async\s+)?fn\s+(\w+)(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?",
            "struct": r"(?:pub\s+)?struct\s+(\w+)(?:<[^>]+>)?",
            "enum": r"(?:pub\s+)?enum\s+(\w+)(?:<[^>]+>)?",
            "trait": r"(?:pub\s+)?trait\s+(\w+)(?:<[^>]+>)?",
            "impl": r"impl(?:<[^>]+>)?\s+(?:(\w+)\s+for\s+)?(\w+)",
            "use": r"use\s+([^;]+);",
        },
        "cpp": {
            "class": r"class\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+(\w+))?",
            "struct": r"struct\s+(\w+)",
            "function": r"(?:virtual\s+)?(?:static\s+)?(?:inline\s+)?(?:[\w:]+(?:<[^>]+>)?[*&]?\s+)+(\w+)\s*\(([^)]*)\)",
            "namespace": r"namespace\s+(\w+)",
            "include": r"#include\s*[<\"]([^>\"]+)[>\"]",
        },
    }

    def parse_file(self, filepath: str, content: str, language: str) -> Optional[ModuleInfo]:
        patterns = self.PATTERNS.get(language)
        if not patterns:
            return None

        imports = []
        classes = []
        functions = []

        lines = content.split("\n")

        # Extract imports
        import_pattern = patterns.get("import") or patterns.get("include") or patterns.get("use")
        if import_pattern:
            for match in re.finditer(import_pattern, content):
                imports.append(match.group(1).strip())

        # Extract classes/structs/interfaces
        for key in ["class", "struct", "interface", "trait", "enum"]:
            if key in patterns:
                for match in re.finditer(patterns[key], content):
                    classes.append(ClassInfo(
                        name=match.group(1),
                        bases=[match.group(2)] if match.lastindex >= 2 and match.group(2) else [],
                        docstring=None,
                        methods=[],
                        attributes=[],
                        class_vars=[]
                    ))

        # Extract functions
        for key in ["function", "method", "arrow"]:
            if key in patterns:
                for match in re.finditer(patterns[key], content):
                    name = match.group(1)
                    params_str = match.group(2) if match.lastindex >= 2 else ""
                    params = [p.strip() for p in params_str.split(",") if p.strip()]
                    return_type = match.group(3) if match.lastindex >= 3 else None

                    functions.append(FunctionInfo(
                        name=name,
                        params=params,
                        return_type=return_type.strip() if return_type else None,
                        docstring=None,
                        calls=[],
                        raises=[],
                        complexity=1,
                        lines=1,
                        decorators=[],
                        is_async="async" in content[:match.start()].split("\n")[-1],
                        intent=self._generate_intent_simple(name)
                    ))

        lines_code = len([l for l in lines if l.strip() and not l.strip().startswith(("//", "#", "/*", "*"))])

        return ModuleInfo(
            path=filepath,
            language=language,
            imports=imports,
            exports=[f.name for f in functions] + [c.name for c in classes],
            classes=classes,
            functions=functions,
            constants=[],
            docstring=None,
            lines_total=len(lines),
            lines_code=lines_code
        )

    def _generate_intent_simple(self, name: str) -> str:
        words = re.sub(r'([A-Z])', r' \1', name).replace("_", " ").lower().split()
        return " ".join(words)


# ============================================================================
# PROJECT ANALYZER
# ============================================================================

class ProjectAnalyzer:
    """Główna klasa analizująca projekt i generująca reprezentację."""

    LANGUAGE_EXTENSIONS = {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".java": "java",
        ".go": "go",
        ".rs": "rust",
        ".c": "cpp",
        ".cpp": "cpp",
        ".cc": "cpp",
        ".h": "cpp",
        ".hpp": "cpp",
    }

    IGNORE_DIRS = {
        ".git", ".svn", ".hg",
        "node_modules", "__pycache__", ".venv", "venv", "env",
        "target", "build", "dist", "out",
        ".idea", ".vscode", ".pytest_cache",
        "vendor", "packages", ".tox",
    }

    IGNORE_FILES = {
        ".gitignore", ".dockerignore", "package-lock.json", "yarn.lock",
        "Pipfile.lock", "poetry.lock", "Cargo.lock",
    }

    def __init__(self, root_path: str):
        self.root_path = Path(root_path).resolve()
        self.python_parser = PythonParser()
        self.generic_parser = GenericParser()
        self.modules: List[ModuleInfo] = []
        self.languages: Dict[str, int] = defaultdict(int)

    def analyze(self) -> ProjectInfo:
        """Analizuje cały projekt."""
        self._scan_files()
        dependency_graph = self._build_dependency_graph()
        entrypoints = self._detect_entrypoints()

        return ProjectInfo(
            name=self.root_path.name,
            root_path=str(self.root_path),
            languages=dict(self.languages),
            modules=self.modules,
            dependency_graph=dependency_graph,
            entrypoints=entrypoints,
            total_files=len(self.modules),
            total_lines=sum(m.lines_total for m in self.modules),
            generated_at=datetime.now().isoformat()
        )

    def _scan_files(self):
        """Skanuje pliki w projekcie."""
        for filepath in self.root_path.rglob("*"):
            if not filepath.is_file():
                continue

            # Skip ignored directories
            if any(ignored in filepath.parts for ignored in self.IGNORE_DIRS):
                continue

            # Skip ignored files
            if filepath.name in self.IGNORE_FILES:
                continue

            # Check extension
            ext = filepath.suffix.lower()
            if ext not in self.LANGUAGE_EXTENSIONS:
                continue

            language = self.LANGUAGE_EXTENSIONS[ext]
            self.languages[language] += 1

            try:
                content = filepath.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            relative_path = str(filepath.relative_to(self.root_path))

            module = None
            if language == "python":
                module = self.python_parser.parse_file(relative_path, content)
            else:
                module = self.generic_parser.parse_file(relative_path, content, language)

            if module:
                self.modules.append(module)

    def _build_dependency_graph(self) -> Dict[str, List[str]]:
        """Buduje graf zależności między modułami."""
        graph = {}
        module_names = {self._module_name(m.path): m.path for m in self.modules}

        for module in self.modules:
            deps = []
            for imp in module.imports:
                # Try to resolve import to local module
                parts = imp.split(".")
                for i in range(len(parts), 0, -1):
                    candidate = ".".join(parts[:i])
                    if candidate in module_names:
                        deps.append(module_names[candidate])
                        break
            graph[module.path] = list(set(deps))

        return graph

    def _module_name(self, path: str) -> str:
        """Konwertuje ścieżkę pliku na nazwę modułu."""
        name = path.replace("/", ".").replace("\\", ".")
        for ext in self.LANGUAGE_EXTENSIONS:
            if name.endswith(ext):
                name = name[:-len(ext)]
        return name

    def _detect_entrypoints(self) -> List[str]:
        """Wykrywa punkty wejścia aplikacji."""
        entrypoints = []
        patterns = [
            "main.py", "app.py", "server.py", "index.py",
            "main.js", "index.js", "server.js", "app.js",
            "main.ts", "index.ts", "server.ts", "app.ts",
            "main.go", "main.rs", "Main.java",
        ]

        for module in self.modules:
            filename = Path(module.path).name
            if filename in patterns:
                entrypoints.append(module.path)
            # Check for if __name__ == "__main__" pattern in Python
            if module.language == "python":
                for func in module.functions:
                    if func.name == "main":
                        if module.path not in entrypoints:
                            entrypoints.append(module.path)

        return entrypoints


# ============================================================================
# OUTPUT GENERATORS
# ============================================================================

class MarkdownGenerator:
    """Generuje output w formacie Markdown z blokami YAML."""

    def generate(self, project: ProjectInfo, detail_level: str = "standard") -> str:
        lines = []

        # Header
        lines.append(f"# 📦 {project.name}")
        lines.append("")
        lines.append("```yaml")
        lines.append("# Project Metadata")
        lines.append(f"generated: {project.generated_at}")
        lines.append(f"root: {project.root_path}")
        lines.append(f"files: {project.total_files}")
        lines.append(f"lines: {project.total_lines}")
        lines.append(f"languages: {json.dumps(project.languages)}")
        if project.entrypoints:
            lines.append(f"entrypoints: {json.dumps(project.entrypoints)}")
        lines.append("```")
        lines.append("")

        # Table of Contents - Module Map
        lines.append("## 📁 Module Map")
        lines.append("")
        self._generate_module_tree(lines, project)
        lines.append("")

        # Dependency Graph
        if any(deps for deps in project.dependency_graph.values()):
            lines.append("## 🔗 Dependencies")
            lines.append("")
            lines.append("```yaml")
            for module, deps in sorted(project.dependency_graph.items()):
                if deps:
                    lines.append(f"{module}: [{', '.join(deps)}]")
            lines.append("```")
            lines.append("")

        # Modules Detail
        lines.append("## 📄 Modules")
        lines.append("")

        # Group by directory
        modules_by_dir = defaultdict(list)
        for module in project.modules:
            dir_path = str(Path(module.path).parent)
            if dir_path == ".":
                dir_path = "(root)"
            modules_by_dir[dir_path].append(module)

        for dir_path in sorted(modules_by_dir.keys()):
            lines.append(f"### 📂 {dir_path}")
            lines.append("")

            for module in sorted(modules_by_dir[dir_path], key=lambda m: m.path):
                self._generate_module_section(lines, module, detail_level)

        return "\n".join(lines)

    def _generate_module_tree(self, lines: List[str], project: ProjectInfo):
        """Generuje drzewo modułów."""
        tree = {}
        for module in project.modules:
            parts = Path(module.path).parts
            current = tree
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]

            # Leaf node with summary
            exports = module.exports[:3]
            exports_str = ", ".join(exports)
            if len(module.exports) > 3:
                exports_str += f" +{len(module.exports) - 3}"

            current[parts[-1]] = f"[{module.language}] {exports_str}"

        lines.append("```")
        self._print_tree(lines, tree, "")
        lines.append("```")

    def _print_tree(self, lines: List[str], tree: dict, prefix: str):
        items = sorted(tree.items())
        for i, (name, value) in enumerate(items):
            is_last = i == len(items) - 1
            connector = "└── " if is_last else "├── "

            if isinstance(value, dict):
                lines.append(f"{prefix}{connector}{name}/")
                new_prefix = prefix + ("    " if is_last else "│   ")
                self._print_tree(lines, value, new_prefix)
            else:
                lines.append(f"{prefix}{connector}{name}: {value}")

    def _generate_module_section(self, lines: List[str], module: ModuleInfo, detail_level: str):
        """Generuje sekcję dla pojedynczego modułu."""
        filename = Path(module.path).name
        lines.append(f"#### `{filename}`")
        lines.append("")

        # Module metadata
        lines.append("```yaml")
        lines.append(f"path: {module.path}")
        lines.append(f"language: {module.language}")
        lines.append(f"lines: {module.lines_code}/{module.lines_total}")

        if module.imports:
            # Compress imports
            if len(module.imports) <= 5:
                lines.append(f"imports: [{', '.join(module.imports)}]")
            else:
                lines.append(f"imports: [{', '.join(module.imports[:3])}... +{len(module.imports) - 3}]")

        if module.constants:
            lines.append(f"constants: [{', '.join(module.constants)}]")

        lines.append("```")
        lines.append("")

        # Docstring
        if module.docstring and detail_level in ("standard", "detailed"):
            lines.append(f"> {module.docstring.split(chr(10))[0]}")
            lines.append("")

        # Classes
        for cls in module.classes:
            self._generate_class_section(lines, cls, detail_level)

        # Standalone functions
        if module.functions:
            if detail_level == "compact":
                # Jedna linia na funkcję
                lines.append("**Functions:**")
                lines.append("```")
                for func in module.functions:
                    sig = self._format_signature_compact(func)
                    lines.append(f"  {sig}")
                lines.append("```")
                lines.append("")
            else:
                lines.append("**Functions:**")
                lines.append("")
                for func in module.functions:
                    self._generate_function_section(lines, func, detail_level)

        lines.append("---")
        lines.append("")

    def _generate_class_section(self, lines: List[str], cls: ClassInfo, detail_level: str):
        """Generuje sekcję dla klasy."""
        bases_str = f"({', '.join(cls.bases)})" if cls.bases else ""
        lines.append(f"**class `{cls.name}`{bases_str}**")
        lines.append("")

        if cls.docstring and detail_level in ("standard", "detailed"):
            lines.append(f"> {cls.docstring.split(chr(10))[0]}")
            lines.append("")

        if cls.class_vars and detail_level == "detailed":
            lines.append(f"- Attributes: `{', '.join(cls.class_vars)}`")

        if cls.methods:
            lines.append("```yaml")
            lines.append("methods:")
            for method in cls.methods:
                sig = self._format_signature_compact(method)
                intent = method.intent if method.intent else ""
                if detail_level == "compact":
                    lines.append(f"  {sig}")
                else:
                    lines.append(f"  {sig}  # {intent}")
            lines.append("```")

        lines.append("")

    def _generate_function_section(self, lines: List[str], func: FunctionInfo, detail_level: str):
        """Generuje sekcję dla funkcji."""
        sig = self._format_signature_compact(func)

        if detail_level == "detailed":
            lines.append("```yaml")
            lines.append(f"{sig}:")
            lines.append(f"  intent: {func.intent}")
            if func.calls:
                lines.append(f"  calls: [{', '.join(func.calls[:5])}{'...' if len(func.calls) > 5 else ''}]")
            if func.raises:
                lines.append(f"  raises: [{', '.join(func.raises)}]")
            lines.append(f"  complexity: {func.complexity}")
            lines.append(f"  lines: {func.lines}")
            lines.append("```")
        else:
            lines.append(f"- `{sig}` — {func.intent}")

        lines.append("")

    def _format_signature_compact(self, func: FunctionInfo) -> str:
        """Formatuje sygnaturę funkcji w kompaktowej formie."""
        async_prefix = "async " if func.is_async else ""

        # Skróć parametry
        params = []
        for p in func.params[:4]:
            # Usuń domyślne wartości
            p = p.split("=")[0].strip()
            params.append(p)

        if len(func.params) > 4:
            params.append(f"...+{len(func.params) - 4}")

        params_str = ", ".join(params)

        ret = ""
        if func.return_type:
            ret = f" -> {func.return_type}"

        return f"{async_prefix}{func.name}({params_str}){ret}"


class CompactGenerator:
    """Generuje ultra-kompaktowy output (minimalna ilość bajtów)."""

    def generate(self, project: ProjectInfo) -> str:
        lines = []

        # Header - jedna linia
        langs = "/".join(f"{k}:{v}" for k, v in project.languages.items())
        lines.append(f"# {project.name} | {project.total_files}f {project.total_lines}L | {langs}")
        lines.append("")

        # Entrypoints
        if project.entrypoints:
            lines.append(f"ENTRY: {' '.join(project.entrypoints)}")
            lines.append("")

        # Dependencies - tylko jeśli istnieją
        deps_lines = []
        for module, deps in project.dependency_graph.items():
            if deps:
                short_path = self._shorten_path(module)
                short_deps = [self._shorten_path(d) for d in deps]
                deps_lines.append(f"{short_path}→{','.join(short_deps)}")

        if deps_lines:
            lines.append("DEPS: " + " | ".join(deps_lines))
            lines.append("")

        # Modules - ultra compact
        current_dir = None
        for module in sorted(project.modules, key=lambda m: m.path):
            dir_path = str(Path(module.path).parent)
            filename = Path(module.path).name

            if dir_path != current_dir:
                if dir_path != ".":
                    lines.append(f"\n[{dir_path}]")
                current_dir = dir_path

            # File header
            exports_count = len(module.exports)
            lines.append(f"{filename} ({module.lines_code}L, {exports_count}exp)")

            # Classes - one line each
            for cls in module.classes:
                bases = f"<{','.join(cls.bases)}" if cls.bases else ""
                methods = ",".join(m.name for m in cls.methods[:5])
                if len(cls.methods) > 5:
                    methods += f"+{len(cls.methods) - 5}"
                lines.append(f"  C:{cls.name}{bases} [{methods}]")

            # Functions - compressed
            funcs = []
            for func in module.functions:
                ret = f"→{func.return_type}" if func.return_type else ""
                params_count = len(func.params)
                funcs.append(f"{func.name}({params_count}){ret}")

            if funcs:
                # Grupuj po 4 na linię
                for i in range(0, len(funcs), 4):
                    chunk = funcs[i:i + 4]
                    lines.append(f"  F: {' | '.join(chunk)}")

        return "\n".join(lines)

    def _shorten_path(self, path: str) -> str:
        """Skraca ścieżkę do nazwy pliku bez rozszerzenia."""
        return Path(path).stem


class JSONGenerator:
    """Generuje output w formacie JSON (do dalszego przetwarzania)."""

    def generate(self, project: ProjectInfo) -> str:
        def serialize(obj):
            if hasattr(obj, "__dict__"):
                return {k: serialize(v) for k, v in obj.__dict__.items()}
            elif isinstance(obj, list):
                return [serialize(i) for i in obj]
            elif isinstance(obj, dict):
                return {k: serialize(v) for k, v in obj.items()}
            else:
                return obj

        return json.dumps(serialize(project), indent=2, ensure_ascii=False)


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Code2Logic - Konwertuje projekt do reprezentacji logicznej dla LLM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Przykłady użycia:
  %(prog)s /path/to/project                    # Standard Markdown
  %(prog)s /path/to/project -f compact         # Ultra-kompaktowy format
  %(prog)s /path/to/project -f json            # JSON do przetwarzania
  %(prog)s /path/to/project -d detailed        # Szczegółowa analiza
  %(prog)s /path/to/project -o analysis.md     # Zapis do pliku
        """
    )

    parser.add_argument("path", help="Ścieżka do projektu")
    parser.add_argument("-f", "--format", choices=["markdown", "compact", "json"],
                        default="markdown", help="Format wyjściowy (default: markdown)")
    parser.add_argument("-d", "--detail", choices=["compact", "standard", "detailed"],
                        default="standard", help="Poziom szczegółowości (default: standard)")
    parser.add_argument("-o", "--output", help="Plik wyjściowy (default: stdout)")
    parser.add_argument("--no-deps", action="store_true", help="Pomiń graf zależności")

    args = parser.parse_args()

    if not os.path.isdir(args.path):
        print(f"Error: '{args.path}' is not a directory", file=sys.stderr)
        sys.exit(1)

    # Analyze project
    print(f"Analyzing project: {args.path}", file=sys.stderr)
    analyzer = ProjectAnalyzer(args.path)
    project = analyzer.analyze()
    print(f"Found {project.total_files} files, {project.total_lines} lines", file=sys.stderr)

    # Generate output
    if args.format == "markdown":
        generator = MarkdownGenerator()
        output = generator.generate(project, args.detail)
    elif args.format == "compact":
        generator = CompactGenerator()
        output = generator.generate(project)
    else:
        generator = JSONGenerator()
        output = generator.generate(project)

    # Write output
    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Output written to: {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()