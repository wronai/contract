#!/usr/bin/env python3
"""
Code2Logic v2.0 - Konwerter kodu źródłowego do kompaktowej reprezentacji logicznej dla LLM.

Generuje pojedynczy plik Markdown z hierarchiczną strukturą projektu,
sygnaturami funkcji, przepływem danych i zależnościami.

Obsługiwane języki: Python, JavaScript/TypeScript, Java, Go, Rust, C/C++, PHP, Ruby, Kotlin, Swift
"""

import ast
import os
import re
import sys
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Set, Any, Tuple
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
    complexity: int
    lines: int
    decorators: List[str]
    is_async: bool
    is_static: bool
    is_private: bool
    intent: str


@dataclass
class ClassInfo:
    name: str
    bases: List[str]
    docstring: Optional[str]
    methods: List[FunctionInfo]
    properties: List[str]
    is_interface: bool
    is_abstract: bool
    generic_params: List[str]


@dataclass
class TypeInfo:
    name: str
    kind: str  # 'type', 'interface', 'enum', 'struct', 'trait'
    definition: str


@dataclass
class ModuleInfo:
    path: str
    language: str
    imports: List[str]
    exports: List[str]
    classes: List[ClassInfo]
    functions: List[FunctionInfo]
    types: List[TypeInfo]
    constants: List[str]
    docstring: Optional[str]
    lines_total: int
    lines_code: int


@dataclass
class ProjectInfo:
    name: str
    root_path: str
    languages: Dict[str, int]
    modules: List[ModuleInfo]
    dependency_graph: Dict[str, List[str]]
    entrypoints: List[str]
    total_files: int
    total_lines: int
    generated_at: str


# ============================================================================
# INTENT GENERATOR (Language-agnostic)
# ============================================================================

class IntentGenerator:
    """Generuje intencje z nazw funkcji/metod niezależnie od języka."""

    # Wzorce czasowników -> akcje (wielojęzyczne)
    VERB_PATTERNS = {
        # CRUD
        ('get', 'fetch', 'retrieve', 'load', 'find', 'query', 'read', 'select'): 'pobiera',
        ('set', 'update', 'modify', 'change', 'edit', 'put', 'patch'): 'aktualizuje',
        ('create', 'make', 'build', 'generate', 'new', 'add', 'insert', 'post'): 'tworzy',
        ('delete', 'remove', 'clear', 'destroy', 'drop', 'erase'): 'usuwa',

        # Walidacja
        ('is', 'has', 'can', 'should', 'check', 'test'): 'sprawdza czy',
        ('validate', 'verify', 'assert', 'ensure', 'confirm'): 'waliduje',

        # Transformacja
        ('convert', 'transform', 'map', 'translate', 'cast', 'to'): 'konwertuje',
        ('parse', 'extract', 'decode', 'deserialize'): 'parsuje',
        ('format', 'render', 'serialize', 'encode', 'stringify'): 'formatuje',

        # Komunikacja
        ('send', 'emit', 'dispatch', 'publish', 'notify', 'broadcast'): 'wysyła',
        ('receive', 'listen', 'subscribe', 'on', 'handle'): 'obsługuje',

        # Przepływ
        ('init', 'initialize', 'setup', 'configure', 'bootstrap'): 'inicjalizuje',
        ('start', 'run', 'execute', 'launch', 'begin'): 'uruchamia',
        ('stop', 'end', 'finish', 'close', 'shutdown', 'terminate'): 'kończy',

        # Inne
        ('process', 'compute', 'calculate', 'evaluate'): 'przetwarza',
        ('log', 'print', 'write', 'output', 'display'): 'loguje',
        ('sort', 'order', 'arrange'): 'sortuje',
        ('filter', 'search', 'match'): 'filtruje',
        ('merge', 'combine', 'join', 'concat'): 'łączy',
        ('split', 'divide', 'separate', 'partition'): 'dzieli',
        ('register', 'bind', 'attach', 'connect'): 'rejestruje',
        ('unregister', 'unbind', 'detach', 'disconnect'): 'odłącza',
    }

    @classmethod
    def generate(cls, name: str, docstring: Optional[str] = None, context: str = "") -> str:
        """Generuje intent z nazwy funkcji."""
        if docstring:
            # Pierwsza linia docstringa
            first_line = docstring.split('\n')[0].strip()
            # Usuń typowe prefiksy
            for prefix in ('Returns', 'Return', 'Get', 'Set', 'Create'):
                if first_line.startswith(prefix):
                    first_line = first_line[len(prefix):].lstrip(': ')
            if 10 <= len(first_line) <= 80:
                return first_line

        # Parsuj nazwę funkcji
        words = cls._split_name(name)
        if not words:
            return name

        first_word = words[0].lower()
        rest = ' '.join(words[1:]).lower() if len(words) > 1 else ''

        # Szukaj pasującego wzorca
        for verbs, action in cls.VERB_PATTERNS.items():
            if first_word in verbs:
                if rest:
                    return f"{action} {rest}"
                return action

        # Fallback
        return ' '.join(words).lower()

    @classmethod
    def _split_name(cls, name: str) -> List[str]:
        """Dzieli nazwę na słowa (camelCase, snake_case, PascalCase)."""
        # Usuń prefiksy prywatne
        name = name.lstrip('_')

        # snake_case -> words
        if '_' in name:
            return [w for w in name.split('_') if w]

        # camelCase/PascalCase -> words
        words = re.sub(r'([A-Z])', r' \1', name).split()
        return [w.strip() for w in words if w.strip()]


# ============================================================================
# UNIVERSAL PARSER
# ============================================================================

class UniversalParser:
    """Uniwersalny parser dla wszystkich języków oparty na regex."""

    # Konfiguracja per-język
    LANGUAGE_CONFIG = {
        'python': {
            'comment_single': '#',
            'comment_multi': ('"""', '"""'),
            'string_quotes': ['"', "'", '"""', "'''"],
        },
        'javascript': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"', "'", '`'],
        },
        'typescript': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"', "'", '`'],
        },
        'java': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"'],
        },
        'go': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"', '`'],
        },
        'rust': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"'],
        },
        'cpp': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"', "'"],
        },
        'php': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"', "'"],
        },
        'ruby': {
            'comment_single': '#',
            'comment_multi': ('=begin', '=end'),
            'string_quotes': ['"', "'"],
        },
        'kotlin': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"', "'"],
        },
        'swift': {
            'comment_single': '//',
            'comment_multi': ('/*', '*/'),
            'string_quotes': ['"'],
        },
    }

    def __init__(self, language: str):
        self.language = language
        self.config = self.LANGUAGE_CONFIG.get(language, self.LANGUAGE_CONFIG['javascript'])

    def parse(self, filepath: str, content: str) -> Optional[ModuleInfo]:
        """Parsuje plik i zwraca ModuleInfo."""
        # Usuń komentarze i stringi dla czystszego parsowania
        clean_content = self._remove_comments_and_strings(content)

        imports = self._extract_imports(content)
        exports = self._extract_exports(content, clean_content)
        classes = self._extract_classes(content, clean_content)
        functions = self._extract_functions(content, clean_content)
        types = self._extract_types(content, clean_content)
        constants = self._extract_constants(clean_content)
        docstring = self._extract_module_docstring(content)

        lines = content.split('\n')
        lines_code = len([l for l in lines if l.strip() and not self._is_comment_line(l)])

        return ModuleInfo(
            path=filepath,
            language=self.language,
            imports=imports,
            exports=exports,
            classes=classes,
            functions=functions,
            types=types,
            constants=constants,
            docstring=docstring,
            lines_total=len(lines),
            lines_code=lines_code
        )

    def _remove_comments_and_strings(self, content: str) -> str:
        """Usuwa komentarze i stringi z kodu."""
        result = content

        # Usuń komentarze wieloliniowe
        if self.config['comment_multi']:
            start, end = self.config['comment_multi']
            start_esc = re.escape(start)
            end_esc = re.escape(end)
            result = re.sub(f'{start_esc}.*?{end_esc}', '', result, flags=re.DOTALL)

        # Usuń komentarze jednoliniowe
        comment_char = re.escape(self.config['comment_single'])
        result = re.sub(f'{comment_char}.*$', '', result, flags=re.MULTILINE)

        # Usuń stringi (zachowaj strukturę)
        for quote in self.config['string_quotes']:
            if len(quote) == 3:  # Triple quotes
                q = re.escape(quote)
                result = re.sub(f'{q}.*?{q}', '""', result, flags=re.DOTALL)
            else:
                q = re.escape(quote)
                result = re.sub(f'{q}(?:[^{q}\\\\]|\\\\.)*{q}', '""', result)

        return result

    def _is_comment_line(self, line: str) -> bool:
        """Sprawdza czy linia to komentarz."""
        stripped = line.strip()
        return stripped.startswith(self.config['comment_single'])

    def _extract_imports(self, content: str) -> List[str]:
        """Ekstrahuje importy."""
        imports = []

        if self.language == 'python':
            # import x, from x import y
            for match in re.finditer(r'^(?:from\s+([\w.]+)\s+)?import\s+(.+)$', content, re.MULTILINE):
                module = match.group(1) or ''
                names = match.group(2)
                for name in re.split(r',\s*', names):
                    name = name.split(' as ')[0].strip()
                    if name and name != '*':
                        imports.append(f"{module}.{name}" if module else name)

        elif self.language in ('javascript', 'typescript'):
            # import x from 'y', import { x } from 'y', require('y')
            for match in re.finditer(
                    r"(?:import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]|require\s*\(\s*['\"]([^'\"]+)['\"]\s*\))", content):
                module = match.group(1) or match.group(2)
                if module:
                    imports.append(module)

        elif self.language == 'java':
            for match in re.finditer(r'^import\s+([\w.]+);', content, re.MULTILINE):
                imports.append(match.group(1))

        elif self.language == 'go':
            # Single import or import block
            for match in re.finditer(r'import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")', content, re.DOTALL):
                if match.group(1):
                    for line in match.group(1).split('\n'):
                        m = re.search(r'"([^"]+)"', line)
                        if m:
                            imports.append(m.group(1))
                elif match.group(2):
                    imports.append(match.group(2))

        elif self.language == 'rust':
            for match in re.finditer(r'^use\s+([^;]+);', content, re.MULTILINE):
                imports.append(match.group(1).strip())

        return list(set(imports))[:20]  # Limit dla czytelności

    def _extract_exports(self, content: str, clean_content: str) -> List[str]:
        """Ekstrahuje eksporty."""
        exports = []

        if self.language == 'python':
            # __all__ = [...]
            match = re.search(r'__all__\s*=\s*\[([^\]]+)\]', content)
            if match:
                for name in re.findall(r"['\"](\w+)['\"]", match.group(1)):
                    exports.append(name)

        elif self.language in ('javascript', 'typescript'):
            # export { x, y }, export default, export class/function/const
            for match in re.finditer(
                    r'export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)',
                    clean_content):
                exports.append(match.group(1))
            for match in re.finditer(r'export\s*\{([^}]+)\}', clean_content):
                for name in re.split(r',\s*', match.group(1)):
                    name = name.split(' as ')[0].strip()
                    if name and not name.startswith('type '):
                        exports.append(name)

        elif self.language == 'go':
            # Eksportowane = zaczynające się z wielkiej litery
            for match in re.finditer(r'(?:func|type|var|const)\s+([A-Z]\w*)', clean_content):
                exports.append(match.group(1))

        elif self.language == 'rust':
            # pub fn, pub struct, pub enum, pub trait
            for match in re.finditer(r'pub\s+(?:fn|struct|enum|trait|type|const)\s+(\w+)', clean_content):
                exports.append(match.group(1))

        return list(set(exports))

    def _extract_classes(self, content: str, clean_content: str) -> List[ClassInfo]:
        """Ekstrahuje klasy/struktury/interfejsy."""
        classes = []

        if self.language == 'python':
            classes = self._extract_python_classes(content)
        elif self.language in ('javascript', 'typescript'):
            classes = self._extract_js_ts_classes(content, clean_content)
        elif self.language == 'java':
            classes = self._extract_java_classes(content, clean_content)
        elif self.language == 'go':
            classes = self._extract_go_types(content, clean_content)
        elif self.language == 'rust':
            classes = self._extract_rust_types(content, clean_content)

        return classes

    def _extract_python_classes(self, content: str) -> List[ClassInfo]:
        """Ekstrahuje klasy Pythonowe używając AST."""
        classes = []
        try:
            tree = ast.parse(content)
            for node in ast.iter_child_nodes(tree):
                if isinstance(node, ast.ClassDef):
                    bases = []
                    for base in node.bases:
                        if isinstance(base, ast.Name):
                            bases.append(base.id)
                        elif isinstance(base, ast.Attribute):
                            bases.append(base.attr)

                    methods = []
                    properties = []

                    for item in node.body:
                        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                            methods.append(self._parse_python_function(item))
                        elif isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                            properties.append(item.target.id)

                    classes.append(ClassInfo(
                        name=node.name,
                        bases=bases,
                        docstring=ast.get_docstring(node),
                        methods=methods,
                        properties=properties,
                        is_interface=False,
                        is_abstract='ABC' in bases or 'ABCMeta' in bases,
                        generic_params=[]
                    ))
        except SyntaxError:
            pass
        return classes

    def _extract_js_ts_classes(self, content: str, clean_content: str) -> List[ClassInfo]:
        """Ekstrahuje klasy JS/TS."""
        classes = []

        # Pattern dla klas
        class_pattern = r'''
            (?:export\s+)?
            (?:abstract\s+)?
            class\s+
            (\w+)                           # nazwa klasy
            (?:<([^>]+)>)?                  # parametry generyczne
            (?:\s+extends\s+(\w+))?         # extends
            (?:\s+implements\s+([^{]+))?    # implements
            \s*\{
        '''

        for match in re.finditer(class_pattern, clean_content, re.VERBOSE):
            class_name = match.group(1)
            generic_params = match.group(2).split(',') if match.group(2) else []
            bases = []
            if match.group(3):
                bases.append(match.group(3).strip())
            if match.group(4):
                bases.extend([x.strip() for x in match.group(4).split(',')])

            # Znajdź koniec klasy i wyekstrahuj metody
            class_start = match.end()
            class_body = self._extract_block(clean_content, class_start - 1)
            methods = self._extract_class_methods_js_ts(class_body, content)

            # Sprawdź czy abstract
            is_abstract = 'abstract class ' + class_name in clean_content

            classes.append(ClassInfo(
                name=class_name,
                bases=bases,
                docstring=self._extract_jsdoc_before(content, match.start()),
                methods=methods,
                properties=[],
                is_interface=False,
                is_abstract=is_abstract,
                generic_params=[p.strip() for p in generic_params]
            ))

        # Pattern dla interfejsów
        interface_pattern = r'''
            (?:export\s+)?
            interface\s+
            (\w+)                           # nazwa
            (?:<([^>]+)>)?                  # parametry generyczne
            (?:\s+extends\s+([^{]+))?       # extends
            \s*\{
        '''

        for match in re.finditer(interface_pattern, clean_content, re.VERBOSE):
            classes.append(ClassInfo(
                name=match.group(1),
                bases=[x.strip() for x in (match.group(3) or '').split(',') if x.strip()],
                docstring=None,
                methods=[],
                properties=[],
                is_interface=True,
                is_abstract=False,
                generic_params=[]
            ))

        return classes

    def _extract_class_methods_js_ts(self, class_body: str, full_content: str) -> List[FunctionInfo]:
        """Ekstrahuje metody z ciała klasy JS/TS."""
        methods = []

        # Pattern dla metod
        method_pattern = r'''
            (?:(?:public|private|protected|static|async|abstract|readonly)\s+)*
            (\w+)                           # nazwa metody
            (?:<[^>]+>)?                    # generyki
            \s*\(([^)]*)\)                  # parametry
            (?:\s*:\s*([^{;]+))?           # typ zwracany
            \s*[{;]
        '''

        for match in re.finditer(method_pattern, class_body, re.VERBOSE):
            name = match.group(1)

            # Pomiń constructor property definitions i gettery/settery bez ciała
            if name in ('constructor', 'get', 'set', 'if', 'for', 'while', 'switch', 'return', 'const', 'let', 'var',
                        'new', 'this', 'super', 'throw', 'catch', 'try', 'else'):
                if name == 'constructor':
                    # Zachowaj constructor
                    pass
                else:
                    continue

            params_str = match.group(2) or ''
            params = self._parse_params_js_ts(params_str)
            return_type = match.group(3).strip() if match.group(3) else None

            # Sprawdź modyfikatory
            prefix = class_body[:match.start()].split('\n')[-1]
            is_async = 'async' in prefix
            is_static = 'static' in prefix
            is_private = name.startswith('_') or 'private' in prefix

            methods.append(FunctionInfo(
                name=name,
                params=params,
                return_type=return_type,
                docstring=None,
                calls=[],
                raises=[],
                complexity=1,
                lines=1,
                decorators=[],
                is_async=is_async,
                is_static=is_static,
                is_private=is_private,
                intent=IntentGenerator.generate(name)
            ))

        return methods

    def _parse_params_js_ts(self, params_str: str) -> List[str]:
        """Parsuje parametry funkcji JS/TS."""
        if not params_str.strip():
            return []

        params = []
        depth = 0
        current = []

        for char in params_str:
            if char in '<({[':
                depth += 1
                current.append(char)
            elif char in '>)}]':
                depth -= 1
                current.append(char)
            elif char == ',' and depth == 0:
                param = ''.join(current).strip()
                if param:
                    # Uprość parametr
                    param = re.sub(r'\s*=\s*[^,]+$', '', param)  # Usuń default values
                    param = re.sub(r'\s+', '', param)  # Usuń whitespace
                    params.append(param)
                current = []
            else:
                current.append(char)

        if current:
            param = ''.join(current).strip()
            if param:
                param = re.sub(r'\s*=\s*.+$', '', param)
                param = re.sub(r'\s+', '', param)
                params.append(param)

        return params[:8]  # Limit parametrów

    def _extract_java_classes(self, content: str, clean_content: str) -> List[ClassInfo]:
        """Ekstrahuje klasy Java."""
        classes = []

        pattern = r'''
            (?:public\s+|private\s+|protected\s+)?
            (?:abstract\s+|final\s+)?
            (class|interface|enum)\s+
            (\w+)
            (?:<([^>]+)>)?
            (?:\s+extends\s+(\w+))?
            (?:\s+implements\s+([^{]+))?
        '''

        for match in re.finditer(pattern, clean_content, re.VERBOSE):
            kind = match.group(1)
            name = match.group(2)
            bases = []
            if match.group(4):
                bases.append(match.group(4))
            if match.group(5):
                bases.extend([x.strip() for x in match.group(5).split(',')])

            classes.append(ClassInfo(
                name=name,
                bases=bases,
                docstring=None,
                methods=[],
                properties=[],
                is_interface=kind == 'interface',
                is_abstract=kind == 'interface' or 'abstract ' + kind in clean_content,
                generic_params=[]
            ))

        return classes

    def _extract_go_types(self, content: str, clean_content: str) -> List[ClassInfo]:
        """Ekstrahuje typy Go (struct, interface)."""
        classes = []

        # Struct
        for match in re.finditer(r'type\s+(\w+)\s+struct\s*\{', clean_content):
            classes.append(ClassInfo(
                name=match.group(1),
                bases=[],
                docstring=None,
                methods=[],
                properties=[],
                is_interface=False,
                is_abstract=False,
                generic_params=[]
            ))

        # Interface
        for match in re.finditer(r'type\s+(\w+)\s+interface\s*\{', clean_content):
            classes.append(ClassInfo(
                name=match.group(1),
                bases=[],
                docstring=None,
                methods=[],
                properties=[],
                is_interface=True,
                is_abstract=False,
                generic_params=[]
            ))

        return classes

    def _extract_rust_types(self, content: str, clean_content: str) -> List[ClassInfo]:
        """Ekstrahuje typy Rust (struct, enum, trait)."""
        classes = []

        for kind in ['struct', 'enum', 'trait']:
            for match in re.finditer(rf'(?:pub\s+)?{kind}\s+(\w+)', clean_content):
                classes.append(ClassInfo(
                    name=match.group(1),
                    bases=[],
                    docstring=None,
                    methods=[],
                    properties=[],
                    is_interface=kind == 'trait',
                    is_abstract=kind == 'trait',
                    generic_params=[]
                ))

        return classes

    def _extract_functions(self, content: str, clean_content: str) -> List[FunctionInfo]:
        """Ekstrahuje funkcje standalone."""
        functions = []

        if self.language == 'python':
            functions = self._extract_python_functions(content)
        elif self.language in ('javascript', 'typescript'):
            functions = self._extract_js_ts_functions(content, clean_content)
        elif self.language == 'go':
            functions = self._extract_go_functions(content, clean_content)
        elif self.language == 'rust':
            functions = self._extract_rust_functions(content, clean_content)
        elif self.language == 'java':
            functions = self._extract_java_methods(content, clean_content)

        return functions

    def _extract_python_functions(self, content: str) -> List[FunctionInfo]:
        """Ekstrahuje funkcje Python używając AST."""
        functions = []
        try:
            tree = ast.parse(content)
            for node in ast.iter_child_nodes(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    functions.append(self._parse_python_function(node))
        except SyntaxError:
            pass
        return functions

    def _parse_python_function(self, node) -> FunctionInfo:
        """Parsuje funkcję Python z AST node."""
        is_async = isinstance(node, ast.AsyncFunctionDef)

        # Parametry
        params = []
        for arg in node.args.args:
            param_str = arg.arg
            if arg.annotation:
                param_str += f":{self._annotation_to_str(arg.annotation)}"
            params.append(param_str)

        # Typ zwracany
        return_type = None
        if node.returns:
            return_type = self._annotation_to_str(node.returns)

        # Dekoratory
        decorators = []
        for dec in node.decorator_list:
            if isinstance(dec, ast.Name):
                decorators.append(dec.id)
            elif isinstance(dec, ast.Call) and isinstance(dec.func, ast.Name):
                decorators.append(dec.func.id)

        # Calls
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
            if isinstance(child, ast.Raise) and child.exc:
                if isinstance(child.exc, ast.Call) and isinstance(child.exc.func, ast.Name):
                    raises.add(child.exc.func.id)
                elif isinstance(child.exc, ast.Name):
                    raises.add(child.exc.id)

        # Complexity
        complexity = 1
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.ExceptHandler,
                                  ast.With, ast.comprehension)):
                complexity += 1

        # Lines
        lines = node.end_lineno - node.lineno + 1 if hasattr(node, 'end_lineno') else 1

        docstring = ast.get_docstring(node)

        return FunctionInfo(
            name=node.name,
            params=params,
            return_type=return_type,
            docstring=docstring,
            calls=list(calls)[:10],
            raises=list(raises),
            complexity=complexity,
            lines=lines,
            decorators=decorators,
            is_async=is_async,
            is_static='staticmethod' in decorators,
            is_private=node.name.startswith('_') and not node.name.startswith('__'),
            intent=IntentGenerator.generate(node.name, docstring)
        )

    def _annotation_to_str(self, node) -> str:
        """Konwertuje annotację AST do stringa."""
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Constant):
            return str(node.value)
        elif isinstance(node, ast.Subscript):
            base = self._annotation_to_str(node.value)
            if isinstance(node.slice, ast.Tuple):
                args = ','.join(self._annotation_to_str(e) for e in node.slice.elts)
            else:
                args = self._annotation_to_str(node.slice)
            return f"{base}[{args}]"
        elif isinstance(node, ast.Attribute):
            return f"{self._annotation_to_str(node.value)}.{node.attr}"
        elif isinstance(node, ast.BinOp) and isinstance(node.op, ast.BitOr):
            return f"{self._annotation_to_str(node.left)}|{self._annotation_to_str(node.right)}"
        return "Any"

    def _extract_js_ts_functions(self, content: str, clean_content: str) -> List[FunctionInfo]:
        """Ekstrahuje funkcje JS/TS (tylko top-level, nie w klasach)."""
        functions = []

        # Pattern dla funkcji
        patterns = [
            # export function name(...) / export async function name(...)
            r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{',
            # export const name = (...) => / async (...) =>
            r'(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>',
            # export const name = function(...)
            r'(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\([^)]*\)',
        ]

        # Zbierz pozycje klas żeby je wykluczyć
        class_regions = []
        for match in re.finditer(r'class\s+\w+[^{]*\{', clean_content):
            start = match.start()
            body = self._extract_block(clean_content, match.end() - 1)
            end = match.end() + len(body)
            class_regions.append((start, end))

        def in_class_region(pos: int) -> bool:
            for start, end in class_regions:
                if start <= pos <= end:
                    return True
            return False

        seen_names = set()

        for pattern in patterns:
            for match in re.finditer(pattern, clean_content):
                # Pomiń jeśli wewnątrz klasy
                if in_class_region(match.start()):
                    continue

                name = match.group(1)

                # Pomiń jeśli już widzieliśmy
                if name in seen_names:
                    continue
                seen_names.add(name)

                # Pomiń słowa kluczowe i typowe false positives
                if name in ('if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'throw', 'typeof', 'instanceof',
                            'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'export', 'import',
                            'from', 'as', 'default', 'extends', 'implements'):
                    continue

                # Sprawdź czy async
                prefix = clean_content[max(0, match.start() - 50):match.start()]
                is_async = 'async' in prefix.split('\n')[-1]

                params = []
                return_type = None
                if match.lastindex >= 2 and match.group(2):
                    params = self._parse_params_js_ts(match.group(2))
                if match.lastindex >= 3 and match.group(3):
                    return_type = match.group(3).strip()

                functions.append(FunctionInfo(
                    name=name,
                    params=params,
                    return_type=return_type,
                    docstring=self._extract_jsdoc_before(content, match.start()),
                    calls=[],
                    raises=[],
                    complexity=1,
                    lines=1,
                    decorators=[],
                    is_async=is_async,
                    is_static=False,
                    is_private=name.startswith('_'),
                    intent=IntentGenerator.generate(name)
                ))

        return functions

    def _extract_go_functions(self, content: str, clean_content: str) -> List[FunctionInfo]:
        """Ekstrahuje funkcje Go."""
        functions = []

        # func name(...) ... lub func (receiver) name(...)
        pattern = r'func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*\(([^)]+)\)|(?:\s+(\w+)))?'

        for match in re.finditer(pattern, clean_content):
            name = match.group(1)
            params = [p.strip() for p in (match.group(2) or '').split(',') if p.strip()]
            return_type = match.group(3) or match.group(4)

            functions.append(FunctionInfo(
                name=name,
                params=params[:6],
                return_type=return_type,
                docstring=None,
                calls=[],
                raises=[],
                complexity=1,
                lines=1,
                decorators=[],
                is_async=False,
                is_static=False,
                is_private=name[0].islower() if name else True,
                intent=IntentGenerator.generate(name)
            ))

        return functions

    def _extract_rust_functions(self, content: str, clean_content: str) -> List[FunctionInfo]:
        """Ekstrahuje funkcje Rust."""
        functions = []

        pattern = r'(?:pub\s+)?(?:async\s+)?fn\s+(\w+)(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?'

        for match in re.finditer(pattern, clean_content):
            name = match.group(1)
            params = [p.strip().split(':')[0] for p in (match.group(2) or '').split(',') if p.strip()]
            return_type = match.group(3).strip() if match.group(3) else None

            prefix = clean_content[max(0, match.start() - 20):match.start()]
            is_async = 'async' in prefix
            is_pub = 'pub' in prefix

            functions.append(FunctionInfo(
                name=name,
                params=params[:6],
                return_type=return_type,
                docstring=None,
                calls=[],
                raises=[],
                complexity=1,
                lines=1,
                decorators=[],
                is_async=is_async,
                is_static=False,
                is_private=not is_pub,
                intent=IntentGenerator.generate(name)
            ))

        return functions

    def _extract_java_methods(self, content: str, clean_content: str) -> List[FunctionInfo]:
        """Ekstrahuje metody Java (top-level static, bo Java nie ma funkcji)."""
        functions = []

        pattern = r'(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:<[^>]+>\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)'

        for match in re.finditer(pattern, clean_content):
            return_type = match.group(1)
            name = match.group(2)
            params = [p.strip().split()[-1] for p in (match.group(3) or '').split(',') if p.strip()]

            if return_type in ('class', 'interface', 'enum', 'if', 'for', 'while'):
                continue

            functions.append(FunctionInfo(
                name=name,
                params=params[:6],
                return_type=return_type,
                docstring=None,
                calls=[],
                raises=[],
                complexity=1,
                lines=1,
                decorators=[],
                is_async=False,
                is_static='static' in clean_content[max(0, match.start() - 50):match.start()],
                is_private=name.startswith('_'),
                intent=IntentGenerator.generate(name)
            ))

        return functions

    def _extract_types(self, content: str, clean_content: str) -> List[TypeInfo]:
        """Ekstrahuje definicje typów."""
        types = []

        if self.language in ('typescript',):
            # type X = ...
            for match in re.finditer(r'(?:export\s+)?type\s+(\w+)(?:<[^>]+>)?\s*=\s*([^;]+);', clean_content):
                types.append(TypeInfo(
                    name=match.group(1),
                    kind='type',
                    definition=match.group(2).strip()[:100]
                ))

            # enum X { ... }
            for match in re.finditer(r'(?:export\s+)?enum\s+(\w+)\s*\{([^}]+)\}', clean_content):
                types.append(TypeInfo(
                    name=match.group(1),
                    kind='enum',
                    definition=match.group(2).strip()[:100]
                ))

        return types

    def _extract_constants(self, clean_content: str) -> List[str]:
        """Ekstrahuje stałe."""
        constants = []

        if self.language == 'python':
            # UPPERCASE = ...
            for match in re.finditer(r'^([A-Z][A-Z0-9_]+)\s*=', clean_content, re.MULTILINE):
                constants.append(match.group(1))

        elif self.language in ('javascript', 'typescript'):
            # const UPPERCASE = ...
            for match in re.finditer(r'const\s+([A-Z][A-Z0-9_]+)\s*=', clean_content):
                constants.append(match.group(1))

        return constants[:10]

    def _extract_module_docstring(self, content: str) -> Optional[str]:
        """Ekstrahuje docstring modułu."""
        if self.language == 'python':
            match = re.match(r'^[\s]*(?:"""(.+?)"""|\'\'\'(.+?)\'\'\')', content, re.DOTALL)
            if match:
                doc = match.group(1) or match.group(2)
                return doc.strip().split('\n')[0]

        elif self.language in ('javascript', 'typescript'):
            match = re.match(r'^[\s]*/\*\*(.+?)\*/', content, re.DOTALL)
            if match:
                doc = match.group(1)
                doc = re.sub(r'^\s*\*\s?', '', doc, flags=re.MULTILINE)
                return doc.strip().split('\n')[0]

        return None

    def _extract_jsdoc_before(self, content: str, pos: int) -> Optional[str]:
        """Ekstrahuje JSDoc przed daną pozycją."""
        before = content[:pos]
        match = re.search(r'/\*\*\s*\n?(.*?)\*/\s*$', before, re.DOTALL)
        if match:
            doc = match.group(1)
            doc = re.sub(r'^\s*\*\s?', '', doc, flags=re.MULTILINE)
            lines = [l.strip() for l in doc.split('\n') if l.strip() and not l.strip().startswith('@')]
            return lines[0] if lines else None
        return None

    def _extract_block(self, content: str, start_brace_pos: int) -> str:
        """Ekstrahuje blok kodu między { }."""
        if start_brace_pos >= len(content) or content[start_brace_pos] != '{':
            return ""

        depth = 0
        i = start_brace_pos
        while i < len(content):
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
                if depth == 0:
                    return content[start_brace_pos:i + 1]
            i += 1
        return content[start_brace_pos:]


# ============================================================================
# PYTHON PARSER (AST-based, more accurate)
# ============================================================================

class PythonParser(UniversalParser):
    """Specjalizowany parser dla Pythona używający AST."""

    def __init__(self):
        super().__init__('python')

    def parse(self, filepath: str, content: str) -> Optional[ModuleInfo]:
        try:
            tree = ast.parse(content)
        except SyntaxError:
            # Fallback do universal parsera
            return super().parse(filepath, content)

        imports = self._extract_python_imports(tree)
        exports = self._extract_python_exports(tree, content)
        classes = self._extract_python_classes(content)
        functions = self._extract_python_functions(content)
        constants = self._extract_python_constants(tree)
        docstring = ast.get_docstring(tree)

        lines = content.split('\n')
        lines_code = len([l for l in lines if l.strip() and not l.strip().startswith('#')])

        return ModuleInfo(
            path=filepath,
            language='python',
            imports=imports,
            exports=exports,
            classes=classes,
            functions=functions,
            types=[],
            constants=constants,
            docstring=docstring.split('\n')[0] if docstring else None,
            lines_total=len(lines),
            lines_code=lines_code
        )

    def _extract_python_imports(self, tree: ast.Module) -> List[str]:
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ''
                for alias in node.names:
                    if alias.name != '*':
                        imports.append(f"{module}.{alias.name}" if module else alias.name)
        return list(set(imports))[:15]

    def _extract_python_exports(self, tree: ast.Module, content: str) -> List[str]:
        exports = []

        # Check __all__
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == '__all__':
                        if isinstance(node.value, (ast.List, ast.Tuple)):
                            for elt in node.value.elts:
                                if isinstance(elt, ast.Constant):
                                    exports.append(elt.value)

        if not exports:
            # All public names
            for node in ast.iter_child_nodes(tree):
                if isinstance(node, ast.ClassDef) and not node.name.startswith('_'):
                    exports.append(node.name)
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and not node.name.startswith('_'):
                    exports.append(node.name)

        return exports

    def _extract_python_constants(self, tree: ast.Module) -> List[str]:
        constants = []
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id.isupper():
                        constants.append(target.id)
        return constants[:10]


# ============================================================================
# PROJECT ANALYZER
# ============================================================================

class ProjectAnalyzer:
    """Główna klasa analizująca projekt."""

    LANGUAGE_EXTENSIONS = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.c': 'cpp',
        '.cpp': 'cpp',
        '.cc': 'cpp',
        '.h': 'cpp',
        '.hpp': 'cpp',
        '.php': 'php',
        '.rb': 'ruby',
        '.kt': 'kotlin',
        '.swift': 'swift',
    }

    IGNORE_DIRS = {
        '.git', '.svn', '.hg',
        'node_modules', '__pycache__', '.venv', 'venv', 'env',
        'target', 'build', 'dist', 'out', '.next',
        '.idea', '.vscode', '.pytest_cache',
        'vendor', 'packages', '.tox', 'coverage',
        '.mypy_cache', '.ruff_cache',
    }

    IGNORE_FILES = {
        '.gitignore', '.dockerignore', 'package-lock.json', 'yarn.lock',
        'Pipfile.lock', 'poetry.lock', 'Cargo.lock', 'pnpm-lock.yaml',
    }

    def __init__(self, root_path: str):
        self.root_path = Path(root_path).resolve()
        self.python_parser = PythonParser()
        self.parsers: Dict[str, UniversalParser] = {}
        self.modules: List[ModuleInfo] = []
        self.languages: Dict[str, int] = defaultdict(int)

    def _get_parser(self, language: str) -> UniversalParser:
        if language == 'python':
            return self.python_parser
        if language not in self.parsers:
            self.parsers[language] = UniversalParser(language)
        return self.parsers[language]

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
        for filepath in self.root_path.rglob('*'):
            if not filepath.is_file():
                continue

            if any(ignored in filepath.parts for ignored in self.IGNORE_DIRS):
                continue

            if filepath.name in self.IGNORE_FILES:
                continue

            ext = filepath.suffix.lower()
            if ext not in self.LANGUAGE_EXTENSIONS:
                continue

            language = self.LANGUAGE_EXTENSIONS[ext]
            self.languages[language] += 1

            try:
                content = filepath.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue

            relative_path = str(filepath.relative_to(self.root_path))

            parser = self._get_parser(language)
            module = parser.parse(relative_path, content)

            if module:
                self.modules.append(module)

    def _build_dependency_graph(self) -> Dict[str, List[str]]:
        """Buduje graf zależności."""
        graph = {}
        module_names = {}

        for m in self.modules:
            # Różne formy nazwy modułu
            name = self._module_name(m.path)
            module_names[name] = m.path
            module_names[m.path] = m.path
            module_names[Path(m.path).stem] = m.path

        for module in self.modules:
            deps = []
            for imp in module.imports:
                # Spróbuj dopasować import do lokalnego modułu
                parts = imp.replace('/', '.').split('.')
                for i in range(len(parts), 0, -1):
                    candidate = '.'.join(parts[:i])
                    if candidate in module_names and module_names[candidate] != module.path:
                        deps.append(module_names[candidate])
                        break
            graph[module.path] = list(set(deps))

        return graph

    def _module_name(self, path: str) -> str:
        name = path.replace('/', '.').replace('\\', '.')
        for ext in self.LANGUAGE_EXTENSIONS:
            if name.endswith(ext):
                name = name[:-len(ext)]
        return name

    def _detect_entrypoints(self) -> List[str]:
        """Wykrywa punkty wejścia."""
        entrypoints = []

        # Wzorce dla głównych plików (tylko root lub specjalne lokalizacje)
        main_patterns = {
            'main.py', 'app.py', 'server.py', '__main__.py',
            'main.js', 'app.js', 'server.js',
            'main.ts', 'app.ts', 'server.ts',
            'main.go', 'main.rs', 'Main.java',
            'index.js', 'index.ts',  # tylko w root
        }

        for module in self.modules:
            filename = Path(module.path).name
            parent = str(Path(module.path).parent)

            # Główne pliki
            if filename in ('main.py', 'app.py', 'server.py', '__main__.py',
                            'main.js', 'app.js', 'server.js',
                            'main.ts', 'app.ts', 'server.ts',
                            'main.go', 'main.rs', 'Main.java'):
                entrypoints.append(module.path)

            # index tylko w root lub src
            elif filename in ('index.js', 'index.ts') and parent in ('.', 'src'):
                entrypoints.append(module.path)

            # Python z if __name__ == "__main__"
            elif module.language == 'python':
                for func in module.functions:
                    if func.name == 'main':
                        entrypoints.append(module.path)
                        break

        return list(set(entrypoints))[:10]


# ============================================================================
# OUTPUT GENERATORS
# ============================================================================

class MarkdownGenerator:
    """Generuje output w formacie Markdown."""

    def generate(self, project: ProjectInfo, detail_level: str = 'standard') -> str:
        lines = []

        # Header
        lines.append(f"# 📦 {project.name}")
        lines.append("")
        lines.append("```yaml")
        lines.append(f"generated: {project.generated_at}")
        lines.append(f"files: {project.total_files}")
        lines.append(f"lines: {project.total_lines}")
        lines.append(f"languages: {json.dumps(project.languages)}")
        if project.entrypoints:
            lines.append(f"entrypoints: {json.dumps(project.entrypoints[:5])}")
        lines.append("```")
        lines.append("")

        # Module Map
        lines.append("## 📁 Structure")
        lines.append("")
        self._generate_module_tree(lines, project)
        lines.append("")

        # Dependencies (if exist)
        deps_with_content = {k: v for k, v in project.dependency_graph.items() if v}
        if deps_with_content and detail_level != 'compact':
            lines.append("## 🔗 Dependencies")
            lines.append("")
            lines.append("```yaml")
            for module, deps in sorted(deps_with_content.items())[:30]:
                short_deps = [Path(d).stem for d in deps[:5]]
                if len(deps) > 5:
                    short_deps.append(f"+{len(deps) - 5}")
                lines.append(f"{Path(module).stem}: [{', '.join(short_deps)}]")
            lines.append("```")
            lines.append("")

        # Modules
        lines.append("## 📄 Modules")
        lines.append("")

        # Grupuj po katalogu
        modules_by_dir = defaultdict(list)
        for module in project.modules:
            dir_path = str(Path(module.path).parent)
            if dir_path == '.':
                dir_path = '(root)'
            modules_by_dir[dir_path].append(module)

        for dir_path in sorted(modules_by_dir.keys()):
            lines.append(f"### 📂 {dir_path}")
            lines.append("")

            for module in sorted(modules_by_dir[dir_path], key=lambda m: m.path):
                self._generate_module_section(lines, module, detail_level)

        return '\n'.join(lines)

    def _generate_module_tree(self, lines: List[str], project: ProjectInfo):
        tree = {}
        for module in project.modules:
            parts = Path(module.path).parts
            current = tree
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]

            # Liść z podsumowaniem
            exports = module.exports[:3]
            exports_str = ', '.join(exports)
            if len(module.exports) > 3:
                exports_str += f" +{len(module.exports) - 3}"

            current[parts[-1]] = f"[{module.language}] {exports_str}" if exports_str else f"[{module.language}]"

        lines.append("```")
        self._print_tree(lines, tree, "")
        lines.append("```")

    def _print_tree(self, lines: List[str], tree: dict, prefix: str, max_depth: int = 4, current_depth: int = 0):
        if current_depth >= max_depth:
            lines.append(f"{prefix}...")
            return

        items = sorted(tree.items())
        for i, (name, value) in enumerate(items):
            is_last = i == len(items) - 1
            connector = "└── " if is_last else "├── "

            if isinstance(value, dict):
                lines.append(f"{prefix}{connector}{name}/")
                new_prefix = prefix + ("    " if is_last else "│   ")
                self._print_tree(lines, value, new_prefix, max_depth, current_depth + 1)
            else:
                lines.append(f"{prefix}{connector}{name}: {value}")

    def _generate_module_section(self, lines: List[str], module: ModuleInfo, detail_level: str):
        filename = Path(module.path).name
        lines.append(f"#### `{filename}`")
        lines.append("")

        # Metadata
        lines.append("```yaml")
        lines.append(f"path: {module.path}")
        lines.append(f"lang: {module.language} | lines: {module.lines_code}/{module.lines_total}")

        if module.imports and detail_level != 'compact':
            display_imports = module.imports[:5]
            imports_str = ', '.join(display_imports)
            if len(module.imports) > 5:
                imports_str += f"... +{len(module.imports) - 5}"
            lines.append(f"imports: [{imports_str}]")

        if module.constants:
            lines.append(f"constants: [{', '.join(module.constants[:5])}]")

        lines.append("```")
        lines.append("")

        # Docstring
        if module.docstring:
            lines.append(f"> {module.docstring[:100]}")
            lines.append("")

        # Classes
        for cls in module.classes:
            self._generate_class_section(lines, cls, detail_level)

        # Types (TypeScript)
        if module.types and detail_level == 'detailed':
            lines.append("**Types:**")
            for t in module.types[:5]:
                lines.append(f"- `{t.kind} {t.name}` = {t.definition[:50]}...")
            lines.append("")

        # Functions
        if module.functions:
            public_funcs = [f for f in module.functions if not f.is_private]
            if public_funcs:
                if detail_level == 'compact':
                    funcs_str = ', '.join(f.name for f in public_funcs[:8])
                    if len(public_funcs) > 8:
                        funcs_str += f" +{len(public_funcs) - 8}"
                    lines.append(f"**Functions:** {funcs_str}")
                else:
                    lines.append("**Functions:**")
                    lines.append("")
                    for func in public_funcs[:15]:
                        self._generate_function_line(lines, func, detail_level)
                lines.append("")

        lines.append("---")
        lines.append("")

    def _generate_class_section(self, lines: List[str], cls: ClassInfo, detail_level: str):
        # Class header
        kind = "interface" if cls.is_interface else "abstract class" if cls.is_abstract else "class"
        bases_str = f"({', '.join(cls.bases)})" if cls.bases else ""
        generics = f"<{', '.join(cls.generic_params)}>" if cls.generic_params else ""

        lines.append(f"**{kind} `{cls.name}`{generics}{bases_str}**")
        lines.append("")

        if cls.docstring:
            lines.append(f"> {cls.docstring[:80]}")
            lines.append("")

        # Methods
        if cls.methods:
            public_methods = [m for m in cls.methods if
                              not m.is_private or m.name == 'constructor' or m.name == '__init__']

            if public_methods:
                lines.append("```yaml")
                lines.append("methods:")
                for method in public_methods[:12]:
                    sig = self._format_signature(method)
                    intent = method.intent[:40] if method.intent else ""
                    lines.append(f"  {sig}  # {intent}")
                if len(public_methods) > 12:
                    lines.append(f"  # ... +{len(public_methods) - 12} more")
                lines.append("```")

        lines.append("")

    def _generate_function_line(self, lines: List[str], func: FunctionInfo, detail_level: str):
        sig = self._format_signature(func)

        if detail_level == 'detailed':
            lines.append(f"- `{sig}`")
            lines.append(f"  - intent: {func.intent}")
            if func.calls:
                lines.append(f"  - calls: {', '.join(func.calls[:5])}")
            if func.raises:
                lines.append(f"  - raises: {', '.join(func.raises)}")
        else:
            lines.append(f"- `{sig}` — {func.intent[:50]}")

    def _format_signature(self, func: FunctionInfo) -> str:
        async_prefix = "async " if func.is_async else ""
        static_prefix = "static " if func.is_static else ""

        params = func.params[:4]
        if len(func.params) > 4:
            params.append(f"...+{len(func.params) - 4}")
        params_str = ', '.join(params)

        ret = f" -> {func.return_type}" if func.return_type else ""

        return f"{static_prefix}{async_prefix}{func.name}({params_str}){ret}"


class CompactGenerator:
    """Generuje ultra-kompaktowy output."""

    def generate(self, project: ProjectInfo) -> str:
        lines = []

        langs = '/'.join(f"{k}:{v}" for k, v in project.languages.items())
        lines.append(f"# {project.name} | {project.total_files}f {project.total_lines}L | {langs}")
        lines.append("")

        if project.entrypoints:
            lines.append(f"ENTRY: {' '.join(project.entrypoints[:3])}")
            lines.append("")

        # Modules - ultra compact
        current_dir = None
        for module in sorted(project.modules, key=lambda m: m.path):
            dir_path = str(Path(module.path).parent)
            filename = Path(module.path).name

            if dir_path != current_dir:
                if dir_path != '.':
                    lines.append(f"\n[{dir_path}]")
                current_dir = dir_path

            exports_count = len(module.exports)
            classes_str = ','.join(c.name for c in module.classes[:3])
            funcs_str = ','.join(f.name for f in module.functions[:4] if not f.is_private)

            content_parts = []
            if classes_str:
                content_parts.append(f"C:{classes_str}")
            if funcs_str:
                content_parts.append(f"F:{funcs_str}")

            content = ' | '.join(content_parts) if content_parts else '-'
            lines.append(f"  {filename} ({module.lines_code}L) {content}")

        return '\n'.join(lines)


class JSONGenerator:
    """Generuje output w formacie JSON."""

    def generate(self, project: ProjectInfo) -> str:
        def serialize(obj):
            if hasattr(obj, '__dict__'):
                return {k: serialize(v) for k, v in obj.__dict__.items()}
            elif isinstance(obj, list):
                return [serialize(i) for i in obj]
            elif isinstance(obj, dict):
                return {k: serialize(v) for k, v in obj.items()}
            return obj

        return json.dumps(serialize(project), indent=2, ensure_ascii=False)


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Code2Logic v2.0 - Konwertuje projekt do reprezentacji logicznej dla LLM',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Przykłady:
  %(prog)s /path/to/project                    # Standard Markdown
  %(prog)s /path/to/project -f compact         # Ultra-kompaktowy
  %(prog)s /path/to/project -f json            # JSON
  %(prog)s /path/to/project -d detailed        # Szczegółowa analiza
  %(prog)s /path/to/project -o analysis.md     # Zapis do pliku
        """
    )

    parser.add_argument('path', help='Ścieżka do projektu')
    parser.add_argument('-f', '--format', choices=['markdown', 'compact', 'json'],
                        default='markdown', help='Format wyjściowy')
    parser.add_argument('-d', '--detail', choices=['compact', 'standard', 'detailed'],
                        default='standard', help='Poziom szczegółowości')
    parser.add_argument('-o', '--output', help='Plik wyjściowy')

    args = parser.parse_args()

    if not os.path.isdir(args.path):
        print(f"Error: '{args.path}' is not a directory", file=sys.stderr)
        sys.exit(1)

    print(f"Analyzing project: {args.path}", file=sys.stderr)
    analyzer = ProjectAnalyzer(args.path)
    project = analyzer.analyze()
    print(f"Found {project.total_files} files, {project.total_lines} lines", file=sys.stderr)

    if args.format == 'markdown':
        generator = MarkdownGenerator()
        output = generator.generate(project, args.detail)
    elif args.format == 'compact':
        generator = CompactGenerator()
        output = generator.generate(project)
    else:
        generator = JSONGenerator()
        output = generator.generate(project)

    if args.output:
        Path(args.output).write_text(output, encoding='utf-8')
        print(f"Output written to: {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == '__main__':
    main()