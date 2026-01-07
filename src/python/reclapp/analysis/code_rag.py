"""
Code RAG System - Intelligent code navigation and understanding.

Port of: src/core/contract-ai/evolution/code-rag.ts (712 lines)

Features:
- AST-based semantic chunking
- Vector embeddings for similarity search (optional)
- Hierarchical indexing (repo → module → function)
- Call graph / dependency analysis

@version 1.0.0
"""

import base64
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Set, Tuple

from pydantic import BaseModel


# ============================================================================
# TYPES
# ============================================================================

class CodeChunk(BaseModel):
    """A semantic unit of code (file, class, function, etc.)"""
    id: str
    type: Literal["file", "class", "function", "method", "interface", "module"]
    name: str
    file_path: str
    start_line: int
    end_line: int
    code: str
    signature: str
    summary: str = ""
    language: str
    dependencies: List[str] = []
    exports: List[str] = []
    parent: Optional[str] = None
    children: List[str] = []
    embedding: Optional[List[float]] = None


class SearchResult(BaseModel):
    """Search result with score"""
    chunk: CodeChunk
    score: float
    match_type: Literal["semantic", "exact", "fuzzy"]


class HierarchicalLevel(BaseModel):
    """Level in code hierarchy"""
    level: int
    name: str
    chunks: List[CodeChunk]


@dataclass
class CodeIndex:
    """Index structure for code chunks"""
    chunks: Dict[str, CodeChunk] = field(default_factory=dict)
    file_index: Dict[str, List[str]] = field(default_factory=dict)  # filePath → chunk IDs
    symbol_index: Dict[str, List[str]] = field(default_factory=dict)  # symbol name → chunk IDs
    call_graph: Dict[str, List[str]] = field(default_factory=dict)  # chunk ID → called chunk IDs
    import_graph: Dict[str, List[str]] = field(default_factory=dict)  # chunk ID → imported chunk IDs


# ============================================================================
# AST-BASED SEMANTIC CHUNKER
# ============================================================================

class SemanticChunker:
    """
    Parse files and extract semantic chunks (functions, classes, etc.)
    
    Supports:
    - TypeScript/JavaScript
    - Python
    """
    
    def __init__(self, language: str = "python"):
        self.language = language
    
    def parse_file(self, file_path: str, content: str) -> List[CodeChunk]:
        """Parse file and extract semantic chunks"""
        chunks: List[CodeChunk] = []
        ext = Path(file_path).suffix.lower()
        lang = self._detect_language(ext)
        
        lines = content.split("\n")
        
        # File-level chunk
        file_chunk = CodeChunk(
            id=self._generate_id(file_path, "file", 0),
            type="file",
            name=Path(file_path).name,
            file_path=file_path,
            start_line=1,
            end_line=len(lines),
            code=content[:500] + ("..." if len(content) > 500 else ""),
            signature=file_path,
            summary="",
            language=lang,
            dependencies=self._extract_imports(content, lang),
            exports=self._extract_exports(content, lang),
            children=[]
        )
        chunks.append(file_chunk)
        
        # Extract functions, classes based on language
        if lang in ("typescript", "javascript"):
            chunks.extend(self._parse_typescript(file_path, content, file_chunk.id))
        elif lang == "python":
            chunks.extend(self._parse_python(file_path, content, file_chunk.id))
        
        # Update file chunk children
        file_chunk.children = [c.id for c in chunks if c.parent == file_chunk.id]
        
        return chunks
    
    def _parse_python(self, file_path: str, content: str, parent_id: str) -> List[CodeChunk]:
        """Parse Python file for functions and classes"""
        chunks: List[CodeChunk] = []
        lines = content.split("\n")
        
        patterns = {
            "function": re.compile(r"^def\s+(\w+)\s*\(([^)]*)\)"),
            "async_function": re.compile(r"^async\s+def\s+(\w+)\s*\(([^)]*)\)"),
            "class": re.compile(r"^class\s+(\w+)(?:\(([^)]*)\))?:"),
            "method": re.compile(r"^\s+def\s+(\w+)\s*\(([^)]*)\)"),
        }
        
        block_start = 0
        in_block = False
        block_type = ""
        block_name = ""
        block_indent = 0
        
        for i, line in enumerate(lines):
            trimmed = line.strip()
            if not trimmed or trimmed.startswith("#"):
                continue
            
            indent = len(line) - len(line.lstrip())
            
            # Check if we exited current block
            if in_block and indent <= block_indent and trimmed:
                block_code = "\n".join(lines[block_start:i])
                chunk = CodeChunk(
                    id=self._generate_id(file_path, block_type, block_start),
                    type=block_type,  # type: ignore
                    name=block_name,
                    file_path=file_path,
                    start_line=block_start + 1,
                    end_line=i,
                    code=block_code,
                    signature=self._extract_signature(block_code, block_type),
                    summary="",
                    language="python",
                    dependencies=self._extract_local_dependencies(block_code),
                    exports=[],
                    parent=parent_id,
                    children=[]
                )
                chunks.append(chunk)
                in_block = False
            
            # Check for new block
            for pattern_type, pattern in patterns.items():
                if pattern_type == "method":
                    continue  # Skip methods for now, handle at class level
                
                match = pattern.match(trimmed)
                if match and not in_block:
                    block_start = i
                    block_type = "function" if "function" in pattern_type else "class"
                    block_name = match.group(1)
                    block_indent = indent
                    in_block = True
                    break
        
        # Handle last block
        if in_block:
            block_code = "\n".join(lines[block_start:])
            chunks.append(CodeChunk(
                id=self._generate_id(file_path, block_type, block_start),
                type=block_type,  # type: ignore
                name=block_name,
                file_path=file_path,
                start_line=block_start + 1,
                end_line=len(lines),
                code=block_code,
                signature=self._extract_signature(block_code, block_type),
                summary="",
                language="python",
                dependencies=self._extract_local_dependencies(block_code),
                exports=[],
                parent=parent_id,
                children=[]
            ))
        
        return chunks
    
    def _parse_typescript(self, file_path: str, content: str, parent_id: str) -> List[CodeChunk]:
        """Parse TypeScript/JavaScript file"""
        chunks: List[CodeChunk] = []
        lines = content.split("\n")
        
        patterns = {
            "function": re.compile(r"^(?:export\s+)?(?:async\s+)?function\s+(\w+)"),
            "arrow_function": re.compile(r"^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::[^=]+)?\s*=>"),
            "class": re.compile(r"^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)"),
            "interface": re.compile(r"^(?:export\s+)?interface\s+(\w+)"),
        }
        
        brace_depth = 0
        block_start = 0
        in_block = False
        block_type = ""
        block_name = ""
        
        for i, line in enumerate(lines):
            trimmed = line.strip()
            
            # Track brace depth
            open_braces = line.count("{")
            close_braces = line.count("}")
            
            # Check for new block start
            if not in_block:
                for ptype, pattern in patterns.items():
                    match = pattern.match(trimmed)
                    if match:
                        block_start = i
                        block_type = "function" if ptype in ("function", "arrow_function") else ptype
                        if block_type == "interface":
                            block_type = "interface"
                        block_name = match.group(1)
                        in_block = True
                        brace_depth = open_braces - close_braces
                        break
            elif in_block:
                brace_depth += open_braces - close_braces
                
                # Check if block ended
                if brace_depth <= 0 and i > block_start:
                    block_code = "\n".join(lines[block_start:i + 1])
                    chunk = CodeChunk(
                        id=self._generate_id(file_path, block_type, block_start),
                        type=block_type if block_type != "interface" else "interface",  # type: ignore
                        name=block_name,
                        file_path=file_path,
                        start_line=block_start + 1,
                        end_line=i + 1,
                        code=block_code,
                        signature=self._extract_signature(block_code, block_type),
                        summary="",
                        language="typescript",
                        dependencies=self._extract_local_dependencies(block_code),
                        exports=[],
                        parent=parent_id,
                        children=[]
                    )
                    chunks.append(chunk)
                    in_block = False
                    block_type = ""
                    block_name = ""
        
        return chunks
    
    def _detect_language(self, ext: str) -> str:
        """Detect language from file extension"""
        lang_map = {
            ".ts": "typescript",
            ".tsx": "typescript",
            ".js": "javascript",
            ".jsx": "javascript",
            ".py": "python",
            ".go": "go",
            ".rs": "rust",
            ".java": "java",
            ".cpp": "cpp",
            ".c": "c",
            ".cs": "csharp",
            ".rb": "ruby",
            ".php": "php",
        }
        return lang_map.get(ext, "text")
    
    def _generate_id(self, file_path: str, chunk_type: str, line: int) -> str:
        """Generate unique ID for chunk"""
        data = f"{file_path}:{chunk_type}:{line}"
        hash_str = base64.b64encode(data.encode()).decode()[:12]
        return f"{chunk_type}_{hash_str}"
    
    def _extract_imports(self, content: str, lang: str) -> List[str]:
        """Extract import statements"""
        imports: Set[str] = set()
        
        if lang in ("typescript", "javascript"):
            # ES6 imports
            for match in re.finditer(r"import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['\"]([^'\"]+)['\"]", content):
                imports.add(match.group(1))
            # require
            for match in re.finditer(r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)", content):
                imports.add(match.group(1))
        elif lang == "python":
            # Python imports
            for match in re.finditer(r"(?:from\s+(\S+)\s+)?import\s+(.+)", content):
                if match.group(1):
                    imports.add(match.group(1))
                else:
                    imports.add(match.group(2).split(",")[0].strip().split()[0])
        
        return list(imports)
    
    def _extract_exports(self, content: str, lang: str) -> List[str]:
        """Extract exported symbols"""
        exports: Set[str] = set()
        
        if lang in ("typescript", "javascript"):
            for match in re.finditer(r"export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)", content):
                exports.add(match.group(1))
        
        return list(exports)
    
    def _extract_signature(self, code: str, chunk_type: str) -> str:
        """Extract function/class signature"""
        first_line = code.split("\n")[0]
        
        if chunk_type in ("function", "method"):
            # Python
            match = re.match(r"(?:async\s+)?def\s+(\w+)\s*\([^)]*\)(?:\s*->\s*[^:]+)?", first_line)
            if match:
                return match.group(0)
            # TypeScript
            match = re.match(r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)(?:\s*:\s*[^{]+)?", first_line)
            if match:
                return match.group(0)
        elif chunk_type == "class":
            match = re.match(r"class\s+\w+(?:\([^)]*\))?(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{:]+)?", first_line)
            if match:
                return match.group(0)
        
        return first_line[:100]
    
    def _extract_local_dependencies(self, code: str) -> List[str]:
        """Extract function calls as dependencies"""
        deps: Set[str] = set()
        keywords = {"if", "for", "while", "switch", "catch", "function", "class", "def", "async", "await", "return", "import", "from"}
        
        for match in re.finditer(r"(?<![.\w])(\w+)\s*\(", code):
            name = match.group(1)
            if name not in keywords:
                deps.add(name)
        
        return list(deps)


# ============================================================================
# CODE INDEXER
# ============================================================================

class CodeIndexer:
    """
    Index codebase for search and navigation.
    
    Example:
        indexer = CodeIndexer()
        await indexer.index_directory("/path/to/project")
        chunks = indexer.get_chunks_by_symbol("MyClass")
    """
    
    def __init__(self, llm_client: Optional[Any] = None):
        self.index = CodeIndex()
        self.chunker = SemanticChunker()
        self.llm_client = llm_client
    
    async def index_directory(
        self, 
        directory: str, 
        exclude_patterns: Optional[List[str]] = None
    ) -> None:
        """Index entire directory"""
        if exclude_patterns is None:
            exclude_patterns = ["node_modules", ".git", "dist", "build", "__pycache__", ".venv", "venv"]
        
        files = self._scan_directory(directory, exclude_patterns)
        
        for file_path in files:
            try:
                content = Path(file_path).read_text(encoding="utf-8", errors="ignore")
                chunks = self.chunker.parse_file(file_path, content)
                
                for chunk in chunks:
                    # Generate summary if LLM available
                    if self.llm_client and chunk.type != "file":
                        chunk.summary = await self._generate_summary(chunk)
                    
                    # Add to index
                    self.index.chunks[chunk.id] = chunk
                    
                    # Update file index
                    if chunk.file_path not in self.index.file_index:
                        self.index.file_index[chunk.file_path] = []
                    self.index.file_index[chunk.file_path].append(chunk.id)
                    
                    # Update symbol index
                    if chunk.name not in self.index.symbol_index:
                        self.index.symbol_index[chunk.name] = []
                    self.index.symbol_index[chunk.name].append(chunk.id)
                    
                    # Update call graph
                    for dep in chunk.dependencies:
                        if dep in self.index.symbol_index:
                            if chunk.id not in self.index.call_graph:
                                self.index.call_graph[chunk.id] = []
                            self.index.call_graph[chunk.id].extend(self.index.symbol_index[dep])
            except Exception:
                pass  # Skip unreadable files
    
    async def _generate_summary(self, chunk: CodeChunk) -> str:
        """Generate summary using LLM"""
        if not self.llm_client:
            return ""
        
        try:
            from ..llm import GenerateOptions
            response = await self.llm_client.generate(GenerateOptions(
                system="Generate a one-line summary of this code. Be concise.",
                user=f"{chunk.type} {chunk.name}:\n{chunk.code[:500]}",
                temperature=0.2,
                max_tokens=100
            ))
            return response.content.strip()
        except Exception:
            return ""
    
    def _scan_directory(self, directory: str, exclude_patterns: List[str]) -> List[str]:
        """Scan directory for code files"""
        files: List[str] = []
        code_extensions = {".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"}
        
        for root, dirs, filenames in os.walk(directory):
            # Filter excluded directories
            dirs[:] = [d for d in dirs if not any(p in d for p in exclude_patterns)]
            
            for filename in filenames:
                if Path(filename).suffix in code_extensions:
                    files.append(os.path.join(root, filename))
        
        return files
    
    def get_index(self) -> CodeIndex:
        return self.index
    
    def get_chunk(self, chunk_id: str) -> Optional[CodeChunk]:
        return self.index.chunks.get(chunk_id)
    
    def get_chunks_by_file(self, file_path: str) -> List[CodeChunk]:
        ids = self.index.file_index.get(file_path, [])
        return [self.index.chunks[id] for id in ids if id in self.index.chunks]
    
    def get_chunks_by_symbol(self, name: str) -> List[CodeChunk]:
        ids = self.index.symbol_index.get(name, [])
        return [self.index.chunks[id] for id in ids if id in self.index.chunks]
    
    def get_callers(self, chunk_id: str) -> List[CodeChunk]:
        """Get chunks that call this chunk"""
        callers: List[CodeChunk] = []
        for id, calls in self.index.call_graph.items():
            if chunk_id in calls:
                chunk = self.index.chunks.get(id)
                if chunk:
                    callers.append(chunk)
        return callers
    
    def get_callees(self, chunk_id: str) -> List[CodeChunk]:
        """Get chunks that this chunk calls"""
        call_ids = self.index.call_graph.get(chunk_id, [])
        return [self.index.chunks[id] for id in call_ids if id in self.index.chunks]


# ============================================================================
# HIERARCHICAL RETRIEVER
# ============================================================================

class HierarchicalRetriever:
    """
    Search code hierarchically:
    - Level 1: Find relevant files/modules
    - Level 2: Find relevant functions/classes within those
    """
    
    def __init__(self, indexer: CodeIndexer, llm_client: Optional[Any] = None):
        self.indexer = indexer
        self.llm_client = llm_client
    
    async def search(self, query: str, top_k: int = 10) -> List[SearchResult]:
        """Search code by query - hierarchical approach"""
        index = self.indexer.get_index()
        results: List[SearchResult] = []
        
        # Level 1: File-level search
        relevant_files = self._search_files(query, index)
        
        # Level 2: Symbol-level search within relevant files
        for file_path in relevant_files[:5]:
            chunks = self.indexer.get_chunks_by_file(file_path)
            for chunk in chunks:
                if chunk.type == "file":
                    continue
                
                score = self._score_chunk(chunk, query)
                if score > 0.1:
                    results.append(SearchResult(
                        chunk=chunk,
                        score=score,
                        match_type="fuzzy"
                    ))
        
        # Sort by score and return top K
        results.sort(key=lambda r: r.score, reverse=True)
        return results[:top_k]
    
    def _search_files(self, query: str, index: CodeIndex) -> List[str]:
        """Find relevant files for query"""
        query_lower = query.lower()
        query_words = query_lower.split()
        file_scores: Dict[str, float] = {}
        
        for file_path, chunk_ids in index.file_index.items():
            score = 0.0
            file_name_lower = Path(file_path).name.lower()
            
            # File name match
            for word in query_words:
                if word in file_name_lower:
                    score += 2
            
            # Symbol match
            for chunk_id in chunk_ids:
                chunk = index.chunks.get(chunk_id)
                if chunk:
                    name_lower = chunk.name.lower()
                    for word in query_words:
                        if word in name_lower:
                            score += 1
                        # Summary match
                        if chunk.summary and word in chunk.summary.lower():
                            score += 0.5
            
            if score > 0:
                file_scores[file_path] = score
        
        return sorted(file_scores.keys(), key=lambda p: file_scores[p], reverse=True)
    
    def _score_chunk(self, chunk: CodeChunk, query: str) -> float:
        """Score a chunk against query"""
        query_lower = query.lower()
        query_words = query_lower.split()
        score = 0.0
        
        # Name match (highest weight)
        name_lower = chunk.name.lower()
        for word in query_words:
            if name_lower == word:
                score += 3
            elif word in name_lower:
                score += 1.5
        
        # Signature match
        sig_lower = chunk.signature.lower()
        for word in query_words:
            if word in sig_lower:
                score += 1
        
        # Summary match
        if chunk.summary:
            summary_lower = chunk.summary.lower()
            for word in query_words:
                if word in summary_lower:
                    score += 0.8
        
        # Code match (lowest weight)
        code_lower = chunk.code.lower()
        for word in query_words:
            if word in code_lower:
                score += 0.3
        
        # Normalize by query length
        return score / max(len(query_words), 1)
    
    def trace_call_path(
        self, 
        from_id: str, 
        to_id: str, 
        max_depth: int = 5
    ) -> List[List[str]]:
        """Trace call path between two chunks"""
        paths: List[List[str]] = []
        visited: Set[str] = set()
        
        def dfs(current: str, path: List[str], depth: int) -> None:
            if depth > max_depth:
                return
            if current == to_id:
                paths.append(path + [current])
                return
            if current in visited:
                return
            
            visited.add(current)
            callees = self.indexer.get_callees(current)
            for callee in callees:
                dfs(callee.id, path + [current], depth + 1)
            visited.discard(current)
        
        dfs(from_id, [], 0)
        return paths
    
    def get_hierarchy(self) -> List[HierarchicalLevel]:
        """Get hierarchical view of codebase"""
        index = self.indexer.get_index()
        levels: List[HierarchicalLevel] = []
        
        # Level 0: Modules/directories
        dir_map: Dict[str, List[CodeChunk]] = {}
        for file_path, ids in index.file_index.items():
            dir_path = str(Path(file_path).parent)
            chunks = [index.chunks[id] for id in ids if id in index.chunks]
            if dir_path not in dir_map:
                dir_map[dir_path] = []
            dir_map[dir_path].extend(chunks)
        
        module_chunks = []
        for dir_path, chunks in dir_map.items():
            module_chunks.append(CodeChunk(
                id=f"dir_{base64.b64encode(dir_path.encode()).decode()[:8]}",
                type="module",
                name=Path(dir_path).name,
                file_path=dir_path,
                start_line=0,
                end_line=0,
                code="",
                signature=dir_path,
                summary=f"{len(chunks)} items",
                language="text",
                dependencies=[],
                exports=[c.name for c in chunks if c.type != "file"],
                children=[c.id for c in chunks]
            ))
        
        levels.append(HierarchicalLevel(level=0, name="Modules", chunks=module_chunks))
        
        # Level 1: Files
        files = [c for c in index.chunks.values() if c.type == "file"]
        levels.append(HierarchicalLevel(level=1, name="Files", chunks=files))
        
        # Level 2: Classes/Functions
        symbols = [c for c in index.chunks.values() 
                   if c.type in ("class", "function", "interface")]
        levels.append(HierarchicalLevel(level=2, name="Symbols", chunks=symbols))
        
        return levels


# ============================================================================
# CODE RAG SYSTEM
# ============================================================================

class CodeRAG:
    """
    Complete Code RAG system for intelligent code navigation.
    
    Example:
        rag = CodeRAG(llm_client)
        stats = await rag.index("/path/to/project")
        print(f"Indexed {stats['files']} files, {stats['chunks']} chunks")
        
        result = await rag.ask("How does authentication work?")
        print(result.answer)
        for source in result.sources[:3]:
            print(f"  - {source.chunk.name} in {source.chunk.file_path}")
    """
    
    def __init__(self, llm_client: Optional[Any] = None):
        self.llm_client = llm_client
        self.indexer = CodeIndexer(llm_client)
        self.retriever = HierarchicalRetriever(self.indexer, llm_client)
        self.indexed = False
    
    async def index(self, directory: str) -> Dict[str, int]:
        """Index a codebase"""
        await self.indexer.index_directory(directory)
        self.indexed = True
        
        index = self.indexer.get_index()
        return {
            "files": len(index.file_index),
            "chunks": len(index.chunks)
        }
    
    async def ask(self, question: str) -> Dict[str, Any]:
        """Ask a question about the code"""
        if not self.indexed:
            return {"answer": "Code not indexed. Call index() first.", "sources": []}
        
        results = await self.retriever.search(question, 10)
        
        if not self.llm_client:
            # Return just search results without LLM
            if results:
                answer = f"Found {len(results)} relevant code sections:\n"
                for r in results[:5]:
                    answer += f"- {r.chunk.type} {r.chunk.name} in {r.chunk.file_path}:{r.chunk.start_line}\n"
                    if r.chunk.summary:
                        answer += f"  {r.chunk.summary}\n"
            else:
                answer = "No relevant code found."
            return {"answer": answer, "sources": results}
        
        # Build context for LLM
        context_parts = []
        for r in results[:5]:
            ctx = f"## {r.chunk.type}: {r.chunk.name}\n"
            ctx += f"File: {r.chunk.file_path}:{r.chunk.start_line}-{r.chunk.end_line}\n"
            if r.chunk.summary:
                ctx += f"Summary: {r.chunk.summary}\n"
            ctx += f"Signature: {r.chunk.signature}\n"
            ctx += f"```{r.chunk.language}\n{r.chunk.code[:800]}\n```"
            context_parts.append(ctx)
        
        context = "\n\n".join(context_parts)
        
        prompt = f"""Based on the following code context, answer the question.

## Code Context:
{context}

## Question:
{question}

Provide a clear, concise answer referencing specific functions/classes when applicable."""
        
        try:
            from ..llm import GenerateOptions
            response = await self.llm_client.generate(GenerateOptions(
                system="You are a code expert. Answer questions about code based on the provided context.",
                user=prompt,
                temperature=0.3,
                max_tokens=1000
            ))
            return {"answer": response.content, "sources": results}
        except Exception as e:
            answer = f"LLM error: {e}\nResults based on search only:\n"
            for r in results[:3]:
                answer += f"- {r.chunk.name}: {r.chunk.summary or r.chunk.signature}\n"
            return {"answer": answer, "sources": results}
    
    def find_usages(self, symbol_name: str) -> List[CodeChunk]:
        """Find where a symbol is used"""
        chunks = self.indexer.get_chunks_by_symbol(symbol_name)
        callers: List[CodeChunk] = []
        
        for chunk in chunks:
            callers.extend(self.indexer.get_callers(chunk.id))
        
        return list({c.id: c for c in chunks + callers}.values())
    
    def get_structure(self) -> List[HierarchicalLevel]:
        """Get code structure overview"""
        return self.retriever.get_hierarchy()
    
    def export_index(self) -> str:
        """Export index to JSON for persistence"""
        import json
        index = self.indexer.get_index()
        return json.dumps({
            "chunks": {k: v.model_dump() for k, v in index.chunks.items()},
            "file_index": index.file_index,
            "symbol_index": index.symbol_index,
            "call_graph": index.call_graph,
            "import_graph": index.import_graph
        }, indent=2)
