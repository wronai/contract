/**
 * Code Analyzer
 * 
 * Analyzes codebase structure, detects duplicates, measures complexity,
 * and prepares data for contract generation from existing code.
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface FunctionInfo {
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  lines: number;
  params: string[];
  isAsync: boolean;
  isExported: boolean;
  complexity: number;
  calls: string[];
  // Call graph metrics
  fanIn?: number;   // How many functions call this one
  fanOut?: number;  // How many functions this calls
  couplingScore?: number;  // fanIn * fanOut (high = central/risky)
}

export interface FileInfo {
  path: string;
  relativePath: string;
  language: string;
  lines: number;
  bytes: number;
  functions: FunctionInfo[];
  imports: string[];
  exports: string[];
  classes: string[];
}

export interface DuplicateGroup {
  signature: string;
  occurrences: Array<{ file: string; line: number; name: string }>;
}

export interface AnalysisReport {
  timestamp: string;
  rootDir: string;
  summary: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    avgFileLines: number;
    avgFunctionLines: number;
    largestFiles: Array<{ path: string; lines: number }>;
    largestFunctions: Array<{ name: string; file: string; lines: number }>;
    duplicates: DuplicateGroup[];
  };
  files: FileInfo[];
  callGraph: Map<string, string[]>;
  recommendations: string[];
}

// ============================================================================
// CODE ANALYZER
// ============================================================================

export class CodeAnalyzer {
  private rootDir: string;
  private extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.cs', '.cpp', '.c', '.h', '.rb', '.php'];
  private ignorePatterns = ['node_modules', 'dist', 'build', '.git', 'coverage', '__pycache__'];

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  /**
   * Analyze entire codebase
   */
  async analyze(): Promise<AnalysisReport> {
    const files = this.findSourceFiles();
    const fileInfos: FileInfo[] = [];
    const allFunctions: FunctionInfo[] = [];
    const callGraph = new Map<string, string[]>();

    for (const filePath of files) {
      const info = this.analyzeFile(filePath);
      fileInfos.push(info);
      allFunctions.push(...info.functions);
      
      // Build call graph
      for (const fn of info.functions) {
        const key = `${info.relativePath}:${fn.name}`;
        callGraph.set(key, fn.calls);
      }
    }

    // Calculate call graph metrics (fanIn, fanOut)
    this.calculateCallGraphMetrics(allFunctions, callGraph);

    // Find duplicates
    const duplicates = this.findDuplicates(allFunctions);

    // Calculate summary
    const totalLines = fileInfos.reduce((sum, f) => sum + f.lines, 0);
    const totalFunctions = allFunctions.length;
    const totalClasses = fileInfos.reduce((sum, f) => sum + f.classes.length, 0);

    const report: AnalysisReport = {
      timestamp: new Date().toISOString(),
      rootDir: this.rootDir,
      summary: {
        totalFiles: fileInfos.length,
        totalLines,
        totalFunctions,
        totalClasses,
        avgFileLines: Math.round(totalLines / fileInfos.length) || 0,
        avgFunctionLines: Math.round(allFunctions.reduce((s, f) => s + f.lines, 0) / totalFunctions) || 0,
        largestFiles: fileInfos
          .sort((a, b) => b.lines - a.lines)
          .slice(0, 10)
          .map(f => ({ path: f.relativePath, lines: f.lines })),
        largestFunctions: allFunctions
          .sort((a, b) => b.lines - a.lines)
          .slice(0, 10)
          .map(f => ({ name: f.name, file: f.file, lines: f.lines })),
        duplicates
      },
      files: fileInfos,
      callGraph,
      recommendations: this.generateRecommendations(fileInfos, allFunctions, duplicates)
    };

    return report;
  }

  /**
   * Find all source files
   */
  private findSourceFiles(): string[] {
    const files: string[] = [];
    
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!this.ignorePatterns.some(p => entry.name.includes(p))) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (this.extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    walk(this.rootDir);
    return files;
  }

  /**
   * Analyze a single file
   */
  private analyzeFile(filePath: string): FileInfo {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const ext = path.extname(filePath).toLowerCase();
    const relativePath = path.relative(this.rootDir, filePath);

    const info: FileInfo = {
      path: filePath,
      relativePath,
      language: this.detectLanguage(ext),
      lines: lines.length,
      bytes: Buffer.byteLength(content, 'utf-8'),
      functions: [],
      imports: [],
      exports: [],
      classes: []
    };

    // Parse based on language
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      this.parseTypeScript(content, lines, info);
    } else if (ext === '.py') {
      this.parsePython(content, lines, info);
    } else if (['.cs', '.java'].includes(ext)) {
      this.parseCSharpJava(content, lines, info);
    } else if (['.go'].includes(ext)) {
      this.parseGo(content, lines, info);
    } else if (['.cpp', '.c', '.h'].includes(ext)) {
      this.parseCpp(content, lines, info);
    }

    return info;
  }

  /**
   * Parse C#/Java file
   */
  private parseCSharpJava(content: string, lines: string[], info: FileInfo): void {
    // Extract imports/using
    const usingRegex = /(?:using|import)\s+([^;]+);/g;
    let match;
    while ((match = usingRegex.exec(content)) !== null) {
      info.imports.push(match[1].trim());
    }

    // Extract classes
    const classRegex = /(?:public|private|internal|protected)?\s*(?:static|abstract|sealed)?\s*class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      info.classes.push(match[1]);
    }

    // Extract methods
    const methodRegex = /(?:public|private|protected|internal)?\s*(?:static|virtual|override|async)?\s*(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)/g;
    while ((match = methodRegex.exec(content)) !== null) {
      const name = match[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'class', 'new'].includes(name)) continue;
      
      const params = match[2] ? match[2].split(',').map(p => p.trim().split(' ').pop() || '').filter(p => p) : [];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findFunctionEnd(lines, startLine - 1);

      if (!info.functions.some(f => f.name === name && f.startLine === startLine)) {
        info.functions.push({
          name,
          file: info.relativePath,
          startLine,
          endLine,
          lines: endLine - startLine + 1,
          params,
          isAsync: match[0].includes('async'),
          isExported: match[0].includes('public'),
          complexity: this.calculateComplexity(lines.slice(startLine - 1, endLine).join('\n')),
          calls: this.extractFunctionCalls(lines.slice(startLine - 1, endLine).join('\n'))
        });
      }
    }
  }

  /**
   * Parse Go file
   */
  private parseGo(content: string, lines: string[], info: FileInfo): void {
    // Extract imports
    const importRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const imports = match[1] || match[2];
      if (imports) {
        for (const imp of imports.split('\n')) {
          const cleaned = imp.replace(/["'\s]/g, '').trim();
          if (cleaned) info.imports.push(cleaned);
        }
      }
    }

    // Extract structs
    const structRegex = /type\s+(\w+)\s+struct/g;
    while ((match = structRegex.exec(content)) !== null) {
      info.classes.push(match[1]);
    }

    // Extract functions
    const funcRegex = /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(([^)]*)\)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2] ? match[2].split(',').map(p => p.trim().split(' ')[0]).filter(p => p) : [];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findFunctionEnd(lines, startLine - 1);

      info.functions.push({
        name,
        file: info.relativePath,
        startLine,
        endLine,
        lines: endLine - startLine + 1,
        params,
        isAsync: false,
        isExported: name[0] === name[0].toUpperCase(),
        complexity: this.calculateComplexity(lines.slice(startLine - 1, endLine).join('\n')),
        calls: this.extractFunctionCalls(lines.slice(startLine - 1, endLine).join('\n'))
      });
    }
  }

  /**
   * Parse C/C++ file
   */
  private parseCpp(content: string, lines: string[], info: FileInfo): void {
    // Extract includes
    const includeRegex = /#include\s*[<"]([^>"]+)[>"]/g;
    let match;
    while ((match = includeRegex.exec(content)) !== null) {
      info.imports.push(match[1]);
    }

    // Extract classes
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      info.classes.push(match[1]);
    }

    // Extract functions
    const funcRegex = /(?:\w+(?:\s*\*)?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const)?\s*{/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[1];
      if (['if', 'for', 'while', 'switch', 'catch', 'class', 'return'].includes(name)) continue;

      const params = match[2] ? match[2].split(',').map(p => p.trim().split(' ').pop() || '').filter(p => p) : [];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findFunctionEnd(lines, startLine - 1);

      if (!info.functions.some(f => f.name === name && f.startLine === startLine)) {
        info.functions.push({
          name,
          file: info.relativePath,
          startLine,
          endLine,
          lines: endLine - startLine + 1,
          params,
          isAsync: false,
          isExported: true,
          complexity: this.calculateComplexity(lines.slice(startLine - 1, endLine).join('\n')),
          calls: this.extractFunctionCalls(lines.slice(startLine - 1, endLine).join('\n'))
        });
      }
    }
  }

  /**
   * Parse TypeScript/JavaScript file
   */
  private parseTypeScript(content: string, lines: string[], info: FileInfo): void {
    // Extract imports
    const importRegex = /import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      info.imports.push(match[1]);
    }

    // Extract exports
    const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      info.exports.push(match[1]);
    }

    // Extract classes
    const classRegex = /(?:export\s+)?class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      info.classes.push(match[1]);
    }

    // Extract functions
    const functionPatterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/g,
      /(\w+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*{/g
    ];

    // Keywords that are NOT functions
    const notFunctions = new Set([
      'if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'try', 'finally',
      'return', 'throw', 'new', 'typeof', 'instanceof', 'delete', 'void',
      'import', 'export', 'from', 'as', 'default', 'class', 'extends', 'implements',
      'interface', 'type', 'enum', 'namespace', 'module', 'declare', 'abstract',
      'public', 'private', 'protected', 'static', 'readonly', 'override'
    ]);

    for (const pattern of functionPatterns) {
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        
        // Skip keywords and control flow statements
        if (notFunctions.has(name)) continue;
        
        const params = match[2] ? match[2].split(',').map(p => p.trim()).filter(p => p) : [];
        const startLine = content.substring(0, match.index).split('\n').length;
        const endLine = this.findFunctionEnd(lines, startLine - 1);
        
        // Avoid duplicates
        if (!info.functions.some(f => f.name === name && f.startLine === startLine)) {
          info.functions.push({
            name,
            file: info.relativePath,
            startLine,
            endLine,
            lines: endLine - startLine + 1,
            params,
            isAsync: match[0].includes('async'),
            isExported: match[0].includes('export'),
            complexity: this.calculateComplexity(lines.slice(startLine - 1, endLine).join('\n')),
            calls: this.extractFunctionCalls(lines.slice(startLine - 1, endLine).join('\n'))
          });
        }
      }
    }
  }

  /**
   * Parse Python file
   */
  private parsePython(content: string, lines: string[], info: FileInfo): void {
    // Extract imports
    const importRegex = /(?:from\s+(\S+)\s+)?import\s+([^#\n]+)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      info.imports.push(match[1] || match[2].trim());
    }

    // Extract classes
    const classRegex = /class\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      info.classes.push(match[1]);
    }

    // Extract functions
    const funcRegex = /(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2] ? match[2].split(',').map(p => p.trim().split(':')[0].split('=')[0].trim()).filter(p => p && p !== 'self') : [];
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = this.findPythonFunctionEnd(lines, startLine - 1);

      info.functions.push({
        name,
        file: info.relativePath,
        startLine,
        endLine,
        lines: endLine - startLine + 1,
        params,
        isAsync: match[0].includes('async'),
        isExported: !name.startsWith('_'),
        complexity: this.calculateComplexity(lines.slice(startLine - 1, endLine).join('\n')),
        calls: this.extractFunctionCalls(lines.slice(startLine - 1, endLine).join('\n'))
      });
    }
  }

  /**
   * Find function end (brace matching for JS/TS)
   */
  private findFunctionEnd(lines: string[], startIdx: number): number {
    let braceCount = 0;
    let started = false;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          started = true;
        } else if (char === '}') {
          braceCount--;
          if (started && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    return Math.min(startIdx + 50, lines.length);
  }

  /**
   * Find Python function end (indentation-based)
   */
  private findPythonFunctionEnd(lines: string[], startIdx: number): number {
    const startIndent = lines[startIdx].search(/\S/);
    
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const indent = line.search(/\S/);
      if (indent <= startIndent && line.trim() !== '') {
        return i;
      }
    }
    return lines.length;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(code: string): number {
    let complexity = 1;
    
    // Word-boundary keywords
    const wordKeywords = ['if', 'else', 'elif', 'for', 'while', 'case', 'catch', 'and', 'or'];
    for (const kw of wordKeywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) complexity += matches.length;
    }
    
    // Operators (no word boundary)
    const operators = ['&&', '\\|\\|', '\\?'];
    for (const op of operators) {
      const regex = new RegExp(op, 'g');
      const matches = code.match(regex);
      if (matches) complexity += matches.length;
    }
    
    return complexity;
  }

  /**
   * Extract function calls from code
   */
  private extractFunctionCalls(code: string): string[] {
    const calls: string[] = [];
    const callRegex = /(\w+)\s*\(/g;
    let match;
    
    while ((match = callRegex.exec(code)) !== null) {
      const name = match[1];
      if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'async'].includes(name)) {
        if (!calls.includes(name)) {
          calls.push(name);
        }
      }
    }
    
    return calls;
  }

  /**
   * Calculate call graph metrics (fanIn, fanOut, couplingScore)
   */
  private calculateCallGraphMetrics(functions: FunctionInfo[], callGraph: Map<string, string[]>): void {
    // Build function name -> FunctionInfo map
    const fnByName = new Map<string, FunctionInfo[]>();
    for (const fn of functions) {
      if (!fnByName.has(fn.name)) {
        fnByName.set(fn.name, []);
      }
      fnByName.get(fn.name)!.push(fn);
    }

    // Calculate fanOut (how many functions this calls)
    for (const fn of functions) {
      fn.fanOut = fn.calls.filter(c => fnByName.has(c)).length;
    }

    // Calculate fanIn (how many functions call this one)
    const incomingCalls = new Map<string, number>();
    for (const fn of functions) {
      for (const call of fn.calls) {
        incomingCalls.set(call, (incomingCalls.get(call) || 0) + 1);
      }
    }

    for (const fn of functions) {
      fn.fanIn = incomingCalls.get(fn.name) || 0;
      fn.couplingScore = (fn.fanIn || 0) * (fn.fanOut || 0);
    }
  }

  /**
   * Find duplicate functions
   */
  private findDuplicates(functions: FunctionInfo[]): DuplicateGroup[] {
    const signatures = new Map<string, Array<{ file: string; line: number; name: string }>>();

    for (const fn of functions) {
      // Create signature based on name + param count
      const sig = `${fn.name}(${fn.params.length})`;
      
      if (!signatures.has(sig)) {
        signatures.set(sig, []);
      }
      signatures.get(sig)!.push({
        file: fn.file,
        line: fn.startLine,
        name: fn.name
      });
    }

    // Filter to only duplicates
    const duplicates: DuplicateGroup[] = [];
    for (const [sig, occurrences] of signatures) {
      if (occurrences.length > 1) {
        duplicates.push({ signature: sig, occurrences });
      }
    }

    return duplicates.sort((a, b) => b.occurrences.length - a.occurrences.length);
  }

  /**
   * Generate refactoring recommendations
   */
  private generateRecommendations(files: FileInfo[], functions: FunctionInfo[], duplicates: DuplicateGroup[]): string[] {
    const recommendations: string[] = [];

    // Large files
    const largeFiles = files.filter(f => f.lines > 500);
    for (const f of largeFiles.slice(0, 5)) {
      recommendations.push(`Split large file: ${f.relativePath} (${f.lines} lines)`);
    }

    // Large functions
    const largeFunctions = functions.filter(f => f.lines > 50);
    for (const f of largeFunctions.slice(0, 5)) {
      recommendations.push(`Refactor large function: ${f.name} in ${f.file} (${f.lines} lines)`);
    }

    // Complex functions
    const complexFunctions = functions.filter(f => f.complexity > 10);
    for (const f of complexFunctions.slice(0, 5)) {
      recommendations.push(`Reduce complexity: ${f.name} in ${f.file} (complexity: ${f.complexity})`);
    }

    // Duplicates
    for (const dup of duplicates.slice(0, 5)) {
      recommendations.push(`Consolidate duplicate: ${dup.signature} found in ${dup.occurrences.length} places`);
    }

    return recommendations;
  }

  /**
   * Detect language from extension
   */
  private detectLanguage(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust'
    };
    return map[ext] || 'unknown';
  }

  /**
   * Generate markdown report
   */
  toMarkdown(report: AnalysisReport): string {
    const lines: string[] = [
      '# Code Analysis Report',
      '',
      `**Generated:** ${report.timestamp}`,
      `**Root:** ${report.rootDir}`,
      '',
      '## Summary',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Files | ${report.summary.totalFiles} |`,
      `| Total Lines | ${report.summary.totalLines} |`,
      `| Total Functions | ${report.summary.totalFunctions} |`,
      `| Total Classes | ${report.summary.totalClasses} |`,
      `| Avg File Lines | ${report.summary.avgFileLines} |`,
      `| Avg Function Lines | ${report.summary.avgFunctionLines} |`,
      '',
      '## Largest Files',
      '',
      '| File | Lines |',
      '|------|-------|',
      ...report.summary.largestFiles.map(f => `| ${f.path} | ${f.lines} |`),
      '',
      '## Largest Functions',
      '',
      '| Function | File | Lines |',
      '|----------|------|-------|',
      ...report.summary.largestFunctions.map(f => `| ${f.name} | ${f.file} | ${f.lines} |`),
      ''
    ];

    if (report.summary.duplicates.length > 0) {
      lines.push('## Potential Duplicates', '');
      for (const dup of report.summary.duplicates.slice(0, 10)) {
        lines.push(`### ${dup.signature}`, '');
        for (const occ of dup.occurrences) {
          lines.push(`- ${occ.file}:${occ.line}`);
        }
        lines.push('');
      }
    }

    if (report.recommendations.length > 0) {
      lines.push('## Recommendations', '');
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate contract from analysis
   */
  toContract(report: AnalysisReport): object {
    // Extract entities from class names
    const entities = [...new Set(report.files.flatMap(f => f.classes))].map(name => ({
      name,
      fields: [],
      annotations: {}
    }));

    // Extract endpoints from function names
    const endpoints = report.files
      .flatMap(f => f.functions)
      .filter(fn => fn.name.match(/^(get|post|put|delete|patch|handle)/i))
      .map(fn => ({
        method: fn.name.match(/^(get|post|put|delete|patch)/i)?.[0]?.toUpperCase() || 'GET',
        path: `/${fn.name.replace(/^(get|post|put|delete|patch|handle)/i, '').toLowerCase()}`,
        handler: fn.name
      }));

    return {
      definition: {
        app: {
          name: path.basename(report.rootDir),
          version: '1.0.0',
          description: `Generated from ${report.summary.totalFiles} files`
        },
        entities,
        endpoints
      },
      generation: {
        techStack: {
          backend: { framework: 'express', language: 'typescript' }
        }
      },
      analysis: {
        source: 'code-analyzer',
        timestamp: report.timestamp,
        metrics: report.summary
      }
    };
  }
}

export default CodeAnalyzer;
