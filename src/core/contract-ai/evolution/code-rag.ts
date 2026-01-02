/**
 * Code RAG System
 * 
 * Provides intelligent code navigation and understanding using:
 * - AST-based semantic chunking
 * - Vector embeddings for similarity search
 * - Hierarchical indexing (repo → module → function)
 * - Call graph / dependency analysis
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { LLMClient } from '../generator/contract-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface CodeChunk {
  id: string;
  type: 'file' | 'class' | 'function' | 'method' | 'interface' | 'module';
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  code: string;
  signature: string;
  summary: string;
  language: string;
  dependencies: string[];
  exports: string[];
  parent?: string;
  children: string[];
  embedding?: number[];
}

export interface CodeIndex {
  chunks: Map<string, CodeChunk>;
  fileIndex: Map<string, string[]>;  // filePath → chunk IDs
  symbolIndex: Map<string, string[]>; // symbol name → chunk IDs
  callGraph: Map<string, string[]>;   // chunk ID → called chunk IDs
  importGraph: Map<string, string[]>; // chunk ID → imported chunk IDs
}

export interface SearchResult {
  chunk: CodeChunk;
  score: number;
  matchType: 'semantic' | 'exact' | 'fuzzy';
}

export interface HierarchicalLevel {
  level: number;
  name: string;
  chunks: CodeChunk[];
}

// ============================================================================
// AST-BASED SEMANTIC CHUNKER
// ============================================================================

export class SemanticChunker {
  private language: string;

  constructor(language: string = 'typescript') {
    this.language = language;
  }

  /**
   * Parse file and extract semantic chunks (functions, classes, etc.)
   */
  parseFile(filePath: string, content: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const ext = path.extname(filePath).toLowerCase();
    const lang = this.detectLanguage(ext);

    // File-level chunk
    const fileChunk: CodeChunk = {
      id: this.generateId(filePath, 'file', 0),
      type: 'file',
      name: path.basename(filePath),
      filePath,
      startLine: 1,
      endLine: content.split('\n').length,
      code: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      signature: filePath,
      summary: '',
      language: lang,
      dependencies: this.extractImports(content, lang),
      exports: this.extractExports(content, lang),
      children: []
    };
    chunks.push(fileChunk);

    // Extract functions, classes, interfaces based on language
    if (lang === 'typescript' || lang === 'javascript') {
      chunks.push(...this.parseTypeScript(filePath, content, fileChunk.id));
    } else if (lang === 'python') {
      chunks.push(...this.parsePython(filePath, content, fileChunk.id));
    }

    // Update file chunk children
    fileChunk.children = chunks.filter(c => c.parent === fileChunk.id).map(c => c.id);

    return chunks;
  }

  /**
   * Parse TypeScript/JavaScript file
   */
  private parseTypeScript(filePath: string, content: string, parentId: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    // Regex patterns for TS/JS constructs
    const patterns = {
      function: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)/,
      arrowFunction: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/,
      class: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/,
      interface: /^(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/,
      type: /^(?:export\s+)?type\s+(\w+)\s*(?:<[^>]*>)?\s*=/,
      method: /^\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*[^{]+)?(?:\s*\{)?/,
    };

    let currentClass: CodeChunk | null = null;
    let braceDepth = 0;
    let blockStart = 0;
    let inBlock = false;
    let blockType: string = '';
    let blockName: string = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track brace depth
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      // Check for function declaration
      let match = trimmed.match(patterns.function);
      if (match && !inBlock) {
        blockStart = i;
        blockType = 'function';
        blockName = match[1];
        inBlock = true;
        braceDepth = openBraces - closeBraces;
      }

      // Check for arrow function
      if (!match) {
        match = trimmed.match(patterns.arrowFunction);
        if (match && !inBlock) {
          blockStart = i;
          blockType = 'function';
          blockName = match[1];
          inBlock = true;
          braceDepth = openBraces - closeBraces;
        }
      }

      // Check for class
      if (!match) {
        match = trimmed.match(patterns.class);
        if (match && !inBlock) {
          blockStart = i;
          blockType = 'class';
          blockName = match[1];
          inBlock = true;
          braceDepth = openBraces - closeBraces;
        }
      }

      // Check for interface
      if (!match) {
        match = trimmed.match(patterns.interface);
        if (match && !inBlock) {
          blockStart = i;
          blockType = 'interface';
          blockName = match[1];
          inBlock = true;
          braceDepth = openBraces - closeBraces;
        }
      }

      // Update brace depth if in block
      if (inBlock && i > blockStart) {
        braceDepth += openBraces - closeBraces;
      }

      // Check if block ended
      if (inBlock && braceDepth <= 0 && i > blockStart) {
        const blockCode = lines.slice(blockStart, i + 1).join('\n');
        const chunk: CodeChunk = {
          id: this.generateId(filePath, blockType, blockStart),
          type: blockType as CodeChunk['type'],
          name: blockName,
          filePath,
          startLine: blockStart + 1,
          endLine: i + 1,
          code: blockCode,
          signature: this.extractSignature(blockCode, blockType),
          summary: '',
          language: 'typescript',
          dependencies: this.extractLocalDependencies(blockCode),
          exports: [],
          parent: currentClass?.id || parentId,
          children: []
        };
        chunks.push(chunk);

        if (blockType === 'class') {
          currentClass = chunk;
        }

        inBlock = false;
        blockType = '';
        blockName = '';
      }
    }

    return chunks;
  }

  /**
   * Parse Python file
   */
  private parsePython(filePath: string, content: string, parentId: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    const patterns = {
      function: /^def\s+(\w+)\s*\(([^)]*)\)/,
      asyncFunction: /^async\s+def\s+(\w+)\s*\(([^)]*)\)/,
      class: /^class\s+(\w+)(?:\(([^)]*)\))?:/,
      method: /^\s+def\s+(\w+)\s*\(([^)]*)\)/,
    };

    let currentIndent = 0;
    let blockStart = 0;
    let inBlock = false;
    let blockType: string = '';
    let blockName: string = '';
    let blockIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const indent = line.length - line.trimStart().length;

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check if we exited current block
      if (inBlock && indent <= blockIndent && trimmed) {
        const blockCode = lines.slice(blockStart, i).join('\n');
        const chunk: CodeChunk = {
          id: this.generateId(filePath, blockType, blockStart),
          type: blockType as CodeChunk['type'],
          name: blockName,
          filePath,
          startLine: blockStart + 1,
          endLine: i,
          code: blockCode,
          signature: this.extractSignature(blockCode, blockType),
          summary: '',
          language: 'python',
          dependencies: this.extractLocalDependencies(blockCode),
          exports: [],
          parent: parentId,
          children: []
        };
        chunks.push(chunk);
        inBlock = false;
      }

      // Check for new block
      let match = trimmed.match(patterns.function) || trimmed.match(patterns.asyncFunction);
      if (match && !inBlock) {
        blockStart = i;
        blockType = 'function';
        blockName = match[1];
        blockIndent = indent;
        inBlock = true;
        continue;
      }

      match = trimmed.match(patterns.class);
      if (match && !inBlock) {
        blockStart = i;
        blockType = 'class';
        blockName = match[1];
        blockIndent = indent;
        inBlock = true;
        continue;
      }
    }

    // Handle last block
    if (inBlock) {
      const blockCode = lines.slice(blockStart).join('\n');
      chunks.push({
        id: this.generateId(filePath, blockType, blockStart),
        type: blockType as CodeChunk['type'],
        name: blockName,
        filePath,
        startLine: blockStart + 1,
        endLine: lines.length,
        code: blockCode,
        signature: this.extractSignature(blockCode, blockType),
        summary: '',
        language: 'python',
        dependencies: this.extractLocalDependencies(blockCode),
        exports: [],
        parent: parentId,
        children: []
      });
    }

    return chunks;
  }

  private detectLanguage(ext: string): string {
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
    };
    return langMap[ext] || 'text';
  }

  private generateId(filePath: string, type: string, line: number): string {
    const hash = Buffer.from(`${filePath}:${type}:${line}`).toString('base64').substring(0, 12);
    return `${type}_${hash}`;
  }

  private extractImports(content: string, lang: string): string[] {
    const imports: string[] = [];
    
    if (lang === 'typescript' || lang === 'javascript') {
      const importMatches = content.matchAll(/import\s+(?:(?:\{[^}]+\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        imports.push(match[1]);
      }
      const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
      for (const match of requireMatches) {
        imports.push(match[1]);
      }
    } else if (lang === 'python') {
      const importMatches = content.matchAll(/(?:from\s+(\S+)\s+)?import\s+(.+)/g);
      for (const match of importMatches) {
        imports.push(match[1] || match[2].split(',')[0].trim());
      }
    }

    return [...new Set(imports)];
  }

  private extractExports(content: string, lang: string): string[] {
    const exports: string[] = [];
    
    if (lang === 'typescript' || lang === 'javascript') {
      const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g);
      for (const match of exportMatches) {
        exports.push(match[1]);
      }
    }

    return exports;
  }

  private extractSignature(code: string, type: string): string {
    const firstLine = code.split('\n')[0];
    if (type === 'function' || type === 'method') {
      const match = firstLine.match(/(?:async\s+)?(?:function\s+)?(\w+)\s*(<[^>]*>)?\s*\([^)]*\)(?:\s*:\s*[^{]+)?/);
      return match ? match[0] : firstLine.substring(0, 100);
    }
    if (type === 'class') {
      const match = firstLine.match(/class\s+\w+(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?/);
      return match ? match[0] : firstLine.substring(0, 100);
    }
    return firstLine.substring(0, 100);
  }

  private extractLocalDependencies(code: string): string[] {
    const deps: string[] = [];
    // Extract function calls
    const callMatches = code.matchAll(/(?<![.\w])(\w+)\s*\(/g);
    for (const match of callMatches) {
      if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'class'].includes(match[1])) {
        deps.push(match[1]);
      }
    }
    return [...new Set(deps)];
  }
}

// ============================================================================
// CODE INDEX
// ============================================================================

export class CodeIndexer {
  private index: CodeIndex;
  private chunker: SemanticChunker;
  private llmClient: LLMClient | null;

  constructor(llmClient?: LLMClient) {
    this.index = {
      chunks: new Map(),
      fileIndex: new Map(),
      symbolIndex: new Map(),
      callGraph: new Map(),
      importGraph: new Map()
    };
    this.chunker = new SemanticChunker();
    this.llmClient = llmClient || null;
  }

  /**
   * Index entire directory
   */
  async indexDirectory(dir: string, excludePatterns: string[] = ['node_modules', '.git', 'dist', 'build']): Promise<void> {
    const files = this.scanDirectory(dir, excludePatterns);
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const chunks = this.chunker.parseFile(file, content);
        
        for (const chunk of chunks) {
          // Generate summary if LLM available
          if (this.llmClient && chunk.type !== 'file') {
            chunk.summary = await this.generateSummary(chunk);
          }
          
          // Add to index
          this.index.chunks.set(chunk.id, chunk);
          
          // Update file index
          const fileChunks = this.index.fileIndex.get(chunk.filePath) || [];
          fileChunks.push(chunk.id);
          this.index.fileIndex.set(chunk.filePath, fileChunks);
          
          // Update symbol index
          const symbolChunks = this.index.symbolIndex.get(chunk.name) || [];
          symbolChunks.push(chunk.id);
          this.index.symbolIndex.set(chunk.name, symbolChunks);
          
          // Update call graph
          for (const dep of chunk.dependencies) {
            const depChunks = this.index.symbolIndex.get(dep);
            if (depChunks) {
              const calls = this.index.callGraph.get(chunk.id) || [];
              calls.push(...depChunks);
              this.index.callGraph.set(chunk.id, [...new Set(calls)]);
            }
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }
  }

  /**
   * Generate summary for chunk using LLM
   */
  private async generateSummary(chunk: CodeChunk): Promise<string> {
    if (!this.llmClient) return '';
    
    try {
      const response = await this.llmClient.generate({
        system: 'Generate a one-line summary of this code. Be concise.',
        user: `${chunk.type} ${chunk.name}:\n${chunk.code.substring(0, 500)}`,
        temperature: 0.2,
        maxTokens: 100
      });
      return response.trim();
    } catch {
      return '';
    }
  }

  private scanDirectory(dir: string, excludePatterns: string[]): string[] {
    const files: string[] = [];
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java'];
    
    const scan = (currentDir: string) => {
      try {
        for (const entry of fs.readdirSync(currentDir)) {
          if (excludePatterns.some(p => entry.includes(p))) continue;
          
          const fullPath = path.join(currentDir, entry);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scan(fullPath);
          } else if (codeExtensions.some(ext => entry.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch {
        // Skip inaccessible directories
      }
    };
    
    scan(dir);
    return files;
  }

  getIndex(): CodeIndex {
    return this.index;
  }

  getChunk(id: string): CodeChunk | undefined {
    return this.index.chunks.get(id);
  }

  getChunksByFile(filePath: string): CodeChunk[] {
    const ids = this.index.fileIndex.get(filePath) || [];
    return ids.map(id => this.index.chunks.get(id)!).filter(Boolean);
  }

  getChunksBySymbol(name: string): CodeChunk[] {
    const ids = this.index.symbolIndex.get(name) || [];
    return ids.map(id => this.index.chunks.get(id)!).filter(Boolean);
  }

  getCallers(chunkId: string): CodeChunk[] {
    const callers: CodeChunk[] = [];
    for (const [id, calls] of this.index.callGraph) {
      if (calls.includes(chunkId)) {
        const chunk = this.index.chunks.get(id);
        if (chunk) callers.push(chunk);
      }
    }
    return callers;
  }

  getCallees(chunkId: string): CodeChunk[] {
    const callIds = this.index.callGraph.get(chunkId) || [];
    return callIds.map(id => this.index.chunks.get(id)!).filter(Boolean);
  }
}

// ============================================================================
// HIERARCHICAL RETRIEVER
// ============================================================================

export class HierarchicalRetriever {
  private indexer: CodeIndexer;
  private llmClient: LLMClient | null;

  constructor(indexer: CodeIndexer, llmClient?: LLMClient) {
    this.indexer = indexer;
    this.llmClient = llmClient || null;
  }

  /**
   * Search code by query - hierarchical approach
   * Level 1: Find relevant files/modules
   * Level 2: Find relevant functions/classes within those
   */
  async search(query: string, topK: number = 10): Promise<SearchResult[]> {
    const index = this.indexer.getIndex();
    const results: SearchResult[] = [];

    // Level 1: File-level search (by name and imports)
    const relevantFiles = this.searchFiles(query, index);

    // Level 2: Symbol-level search within relevant files
    for (const filePath of relevantFiles.slice(0, 5)) {
      const chunks = this.indexer.getChunksByFile(filePath);
      for (const chunk of chunks) {
        if (chunk.type === 'file') continue;
        
        const score = this.scoreChunk(chunk, query);
        if (score > 0.1) {
          results.push({ chunk, score, matchType: 'fuzzy' });
        }
      }
    }

    // Sort by score and return top K
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Find relevant files for query
   */
  private searchFiles(query: string, index: CodeIndex): string[] {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    const fileScores: Map<string, number> = new Map();

    for (const [filePath, chunkIds] of index.fileIndex) {
      let score = 0;
      const fileNameLower = path.basename(filePath).toLowerCase();
      
      // File name match
      for (const word of queryWords) {
        if (fileNameLower.includes(word)) score += 2;
      }

      // Symbol match
      for (const id of chunkIds) {
        const chunk = index.chunks.get(id);
        if (chunk) {
          const nameLower = chunk.name.toLowerCase();
          for (const word of queryWords) {
            if (nameLower.includes(word)) score += 1;
          }
          // Summary match
          if (chunk.summary) {
            const summaryLower = chunk.summary.toLowerCase();
            for (const word of queryWords) {
              if (summaryLower.includes(word)) score += 0.5;
            }
          }
        }
      }

      if (score > 0) {
        fileScores.set(filePath, score);
      }
    }

    return Array.from(fileScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([path]) => path);
  }

  /**
   * Score a chunk against query
   */
  private scoreChunk(chunk: CodeChunk, query: string): number {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    let score = 0;

    // Name match (highest weight)
    const nameLower = chunk.name.toLowerCase();
    for (const word of queryWords) {
      if (nameLower === word) score += 3;
      else if (nameLower.includes(word)) score += 1.5;
    }

    // Signature match
    const sigLower = chunk.signature.toLowerCase();
    for (const word of queryWords) {
      if (sigLower.includes(word)) score += 1;
    }

    // Summary match
    if (chunk.summary) {
      const summaryLower = chunk.summary.toLowerCase();
      for (const word of queryWords) {
        if (summaryLower.includes(word)) score += 0.8;
      }
    }

    // Code match (lowest weight)
    const codeLower = chunk.code.toLowerCase();
    for (const word of queryWords) {
      if (codeLower.includes(word)) score += 0.3;
    }

    // Normalize by query length
    return score / queryWords.length;
  }

  /**
   * Trace call path between two chunks
   */
  traceCallPath(fromId: string, toId: string, maxDepth: number = 5): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[], depth: number) => {
      if (depth > maxDepth) return;
      if (current === toId) {
        paths.push([...path, current]);
        return;
      }
      if (visited.has(current)) return;
      
      visited.add(current);
      const callees = this.indexer.getCallees(current);
      for (const callee of callees) {
        dfs(callee.id, [...path, current], depth + 1);
      }
      visited.delete(current);
    };

    dfs(fromId, [], 0);
    return paths;
  }

  /**
   * Get hierarchical view of codebase
   */
  getHierarchy(): HierarchicalLevel[] {
    const index = this.indexer.getIndex();
    const levels: HierarchicalLevel[] = [];

    // Level 0: Modules/directories
    const dirMap: Map<string, CodeChunk[]> = new Map();
    for (const [filePath, ids] of index.fileIndex) {
      const dir = path.dirname(filePath);
      const chunks = ids.map(id => index.chunks.get(id)!).filter(Boolean);
      const existing = dirMap.get(dir) || [];
      dirMap.set(dir, [...existing, ...chunks]);
    }

    levels.push({
      level: 0,
      name: 'Modules',
      chunks: Array.from(dirMap.entries()).map(([dir, chunks]) => ({
        id: `dir_${Buffer.from(dir).toString('base64').substring(0, 8)}`,
        type: 'module' as const,
        name: path.basename(dir),
        filePath: dir,
        startLine: 0,
        endLine: 0,
        code: '',
        signature: dir,
        summary: `${chunks.length} items`,
        language: 'text',
        dependencies: [],
        exports: chunks.filter(c => c.type !== 'file').map(c => c.name),
        children: chunks.map(c => c.id)
      }))
    });

    // Level 1: Files
    const files: CodeChunk[] = [];
    for (const chunk of index.chunks.values()) {
      if (chunk.type === 'file') files.push(chunk);
    }
    levels.push({ level: 1, name: 'Files', chunks: files });

    // Level 2: Classes/Functions
    const symbols: CodeChunk[] = [];
    for (const chunk of index.chunks.values()) {
      if (['class', 'function', 'interface'].includes(chunk.type)) {
        symbols.push(chunk);
      }
    }
    levels.push({ level: 2, name: 'Symbols', chunks: symbols });

    return levels;
  }
}

// ============================================================================
// CODE RAG SYSTEM
// ============================================================================

export class CodeRAG {
  private indexer: CodeIndexer;
  private retriever: HierarchicalRetriever;
  private llmClient: LLMClient | null;
  private indexed: boolean = false;

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient || null;
    this.indexer = new CodeIndexer(llmClient);
    this.retriever = new HierarchicalRetriever(this.indexer, llmClient);
  }

  /**
   * Index a codebase
   */
  async index(dir: string): Promise<{ files: number; chunks: number }> {
    await this.indexer.indexDirectory(dir);
    this.indexed = true;
    
    const index = this.indexer.getIndex();
    return {
      files: index.fileIndex.size,
      chunks: index.chunks.size
    };
  }

  /**
   * Ask a question about the code
   */
  async ask(question: string): Promise<{ answer: string; sources: SearchResult[] }> {
    if (!this.indexed) {
      return { answer: 'Code not indexed. Call index() first.', sources: [] };
    }

    const results = await this.retriever.search(question, 10);
    
    if (!this.llmClient) {
      // Return just the search results without LLM
      const answer = results.length > 0
        ? `Found ${results.length} relevant code sections:\n` +
          results.slice(0, 5).map(r => 
            `- ${r.chunk.type} ${r.chunk.name} in ${r.chunk.filePath}:${r.chunk.startLine}\n  ${r.chunk.summary || r.chunk.signature}`
          ).join('\n')
        : 'No relevant code found.';
      return { answer, sources: results };
    }

    // Build context for LLM
    const context = results.slice(0, 5).map(r => 
      `## ${r.chunk.type}: ${r.chunk.name}\nFile: ${r.chunk.filePath}:${r.chunk.startLine}-${r.chunk.endLine}\n${r.chunk.summary ? `Summary: ${r.chunk.summary}\n` : ''}Signature: ${r.chunk.signature}\n\`\`\`${r.chunk.language}\n${r.chunk.code.substring(0, 800)}\n\`\`\``
    ).join('\n\n');

    const prompt = `Based on the following code context, answer the question.

## Code Context:
${context}

## Question:
${question}

Provide a clear, concise answer referencing specific functions/classes when applicable.`;

    try {
      const answer = await this.llmClient.generate({
        system: 'You are a code expert. Answer questions about code based on the provided context.',
        user: prompt,
        temperature: 0.3,
        maxTokens: 1000
      });
      return { answer, sources: results };
    } catch {
      return { 
        answer: 'LLM error. Results based on search only:\n' + 
          results.slice(0, 3).map(r => `- ${r.chunk.name}: ${r.chunk.summary || r.chunk.signature}`).join('\n'),
        sources: results 
      };
    }
  }

  /**
   * Find where a symbol is used
   */
  findUsages(symbolName: string): CodeChunk[] {
    const chunks = this.indexer.getChunksBySymbol(symbolName);
    const callers: CodeChunk[] = [];
    
    for (const chunk of chunks) {
      callers.push(...this.indexer.getCallers(chunk.id));
    }
    
    return [...chunks, ...callers];
  }

  /**
   * Get code structure overview
   */
  getStructure(): HierarchicalLevel[] {
    return this.retriever.getHierarchy();
  }

  /**
   * Export index to JSON for persistence
   */
  exportIndex(): string {
    const index = this.indexer.getIndex();
    return JSON.stringify({
      chunks: Array.from(index.chunks.entries()),
      fileIndex: Array.from(index.fileIndex.entries()),
      symbolIndex: Array.from(index.symbolIndex.entries()),
      callGraph: Array.from(index.callGraph.entries()),
      importGraph: Array.from(index.importGraph.entries())
    }, null, 2);
  }
}

export default CodeRAG;
