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

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
  isUnique?: boolean;
  isAuto?: boolean;
  comment?: string;
}

export interface EntityInfo {
  name: string;
  fields: EntityField[];
  comment?: string;
}

export interface EnumInfo {
  name: string;
  values: Array<{ name: string; description?: string }>;
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
  entities: EntityInfo[];
  enums: EnumInfo[];
  endpoints: Array<{ method: string; path: string }>;
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
      classes: [],
      entities: [],
      enums: [],
      endpoints: []
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

    // Extract interfaces (as potential entities)
    const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+[^{]+)?\s*{([^}]*)}/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const name = match[1];
      if (name.endsWith('Input') || name.endsWith('Response') || name.endsWith('Params')) continue;
      
      const body = match[2];
      const fields: EntityField[] = [];
      const fieldRegex = /(\w+)(\?)?\s*:\s*([^;/\n]+)(?:\s*\/\/\s*(.*))?/g;
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(body)) !== null) {
        fields.push({
          name: fieldMatch[1],
          required: !fieldMatch[2],
          type: fieldMatch[3].trim(),
          comment: fieldMatch[4]?.trim()
        });
      }
      
      info.entities.push({ name, fields });
    }

    // Extract Express.js routes
    const routeRegex = /(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((match = routeRegex.exec(content)) !== null) {
      info.endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2]
      });
    }

    // Extract enums
    const enumRegex = /(?:export\s+)?enum\s+(\w+)\s*{([^}]*)}/g;
    while ((match = enumRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const values = body.split(',')
        .map(v => v.trim())
        .filter(v => v && !v.startsWith('//'))
        .map(v => {
          const parts = v.split('=');
          const valueName = parts[0].trim().replace(/['"]/g, '');
          const description = parts[1] ? parts[1].trim() : undefined;
          return { name: valueName, description };
        });
      
      info.enums.push({ name, values });
      info.exports.push(name);
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
  toContract(report: AnalysisReport): any {
    // Try to get metadata from package.json
    let appName = path.basename(report.rootDir);
    let version = '1.0.0';
    let description = `Generated from ${report.summary.totalFiles} files`;
    let author = undefined;
    let license = undefined;

    const pkgPath = path.join(report.rootDir, 'api', 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name) appName = pkg.name;
        if (pkg.version) version = pkg.version;
        if (pkg.description) description = pkg.description;
        if (pkg.author) author = typeof pkg.author === 'string' ? pkg.author : pkg.author.name;
        if (pkg.license) license = pkg.license;
      } catch (e) {}
    }

    // Extract entities from collected entity info
    const entities = report.files.flatMap(f => f.entities).map(e => ({
      name: e.name.charAt(0).toUpperCase() + e.name.slice(1), // Normalize to Uppercase
      fields: e.fields.map(f => ({
        name: f.name,
        type: this.mapTypeToDSL(f.type, f.name),
        required: f.required,
        annotations: f.comment ? { comment: f.comment } : {}
      }))
    }));

    // Extract enums
    const enums = report.files.flatMap(f => f.enums).map(e => ({
      name: e.name,
      values: e.values.map(v => ({ name: v.name, description: v.description }))
    }));

    // Extract potential events (interfaces ending in Event or having certain names)
    const events = report.files.flatMap(f => {
      // Look for classes/interfaces that look like events
      return f.entities
        .filter(e => e.name.endsWith('Event') || e.name.match(/Registered|Started|Completed|Verified|Rejected|Changed|Uploaded$/))
        .map(e => ({
          name: e.name.charAt(0).toUpperCase() + e.name.slice(1),
          fields: e.fields.map(f => ({ name: f.name, type: this.mapTypeToDSL(f.type, f.name) }))
        }));
    });

    // Remove event-like entities from entities list if they are in events
    const eventNames = new Set(events.map(e => e.name));
    const enumNames = new Set(enums.map(e => e.name));
    
    const processedEntities = entities
      .filter(e => !eventNames.has(e.name))
      .map(e => ({
        ...e,
        fields: e.fields.map(f => {
          // Detect relationships: if name matches an entity name
          let type = f.type;
          const nameLower = f.name.toLowerCase();
          
          for (const otherEntity of entities) {
            const otherName = otherEntity.name.charAt(0).toUpperCase() + otherEntity.name.slice(1);
            const otherLower = otherName.toLowerCase();
            if (nameLower === otherLower || nameLower === otherLower + 'id') {
              type = `-> ${otherName}`;
              break;
            }
          }
          
          // Detect enums
          if (type === 'text' || type === 'json' || type === 'any') {
            for (const en of enums) {
              const enumName = en.name.charAt(0).toUpperCase() + en.name.slice(1);
              if (nameLower === enumName.toLowerCase() || f.name.endsWith(enumName)) {
                type = enumName;
                break;
              }
            }
          }

          return { ...f, type };
        })
      }));

    // Extract endpoints
    const collectedEndpoints = report.files.flatMap(f => {
      const baseName = f.relativePath.split('/').pop()?.replace(/\.(ts|js|tsx|jsx)$/, '') || '';
      // Map common route file names to entity names
      const entityName = baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/s$/, ''); 
      
      if (f.endpoints && f.endpoints.length > 0) {
        return f.endpoints.map(e => ({
          method: e.method,
          path: e.path,
          handler: `${e.method.toLowerCase()}${entityName}`
        }));
      }
      return [];
    });

    const endpoints = collectedEndpoints.length > 0 ? collectedEndpoints : report.files
      .flatMap(f => f.functions)
      .filter(fn => fn.name.match(/^(get|post|put|delete|patch|handle)/i))
      .map(fn => ({
        method: fn.name.match(/^(get|post|put|delete|patch)/i)?.[0]?.toUpperCase() || 'GET',
        path: `/${fn.name.replace(/^(get|post|put|delete|patch|handle)/i, '').toLowerCase()}s`,
        handler: fn.name
      }));

    // Try to find API config from .env or server.ts
    let apiPrefix = '/api';
    let apiPort = 8080;
    let apiAuth = undefined;

    if (endpoints.length > 0) {
      // Intelligent prefix detection: find common base path
      const paths = endpoints.map(e => e.path).filter(p => p && p.startsWith('/'));
      if (paths.length > 0) {
        // Simple heuristic: find common prefix like /api/v1
        const parts = paths[0].split('/').filter(Boolean);
        let common = '/';
        for (let i = 0; i < parts.length; i++) {
          const testPrefix = common + parts[i] + '/';
          if (paths.every(p => (p + '/').startsWith(testPrefix))) {
            common = testPrefix;
          } else {
            break;
          }
        }
        apiPrefix = common.replace(/\/$/, '') || '/api';
      }
    }

    const apiFiles = report.files.filter(f => f.relativePath.includes('server.ts') || f.relativePath.includes('app.ts'));
    for (const f of apiFiles) {
      const content = fs.readFileSync(f.path, 'utf-8');
      
      // Look for explicit prefix variable or generic app.use with a router that looks global
      const prefixMatch = content.match(/(?:prefix|apiPrefix|basePath)[:\s]+['"]([^'"]+)['"]/i);
      if (prefixMatch && prefixMatch[1] !== '/') {
        apiPrefix = prefixMatch[1];
      }
      
      const authMatch = content.match(/auth[:\s]+['"]([^'"]+)['"]/i) || 
                        content.match(/passport\.authenticate/) || 
                        content.match(/jwt/) || 
                        content.match(/session/i);
      if (authMatch) {
        if (content.includes('jwt') || content.includes('Jwt')) apiAuth = 'jwt';
        else if (content.includes('passport')) apiAuth = 'passport';
        else if (content.includes('session')) apiAuth = 'session';
      }
    }

    const envPath = path.join(report.rootDir, 'api', '.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf-8');
      const portMatch = env.match(/PORT=(\d+)/);
      if (portMatch) apiPort = parseInt(portMatch[1]);
      
      const jwtMatch = env.match(/JWT_SECRET/);
      if (jwtMatch && !apiAuth) apiAuth = 'jwt';
    }

    return {
      app: {
        name: appName,
        version,
        description,
        author,
        license
      },
      entities: processedEntities,
      enums,
      events,
      endpoints,
      api: {
        prefix: apiPrefix,
        port: apiPort,
        auth: apiAuth
      }
    };
  }

  /**
   * Merge findings from code analysis with an existing AI Plan (contract.ai.json)
   */
  mergeWithAIPlan(derivedContract: any, aiPlan: any): any {
    if (!aiPlan) return derivedContract;

    const merged = {
      ...aiPlan,
      app: {
        ...derivedContract.app,
        ...aiPlan.app, // Prefer original AI plan app info
      },
      api: {
        ...aiPlan.api,
        ...(derivedContract.api?.prefix && derivedContract.api.prefix !== '/api' ? { prefix: derivedContract.api.prefix } : {}),
        ...(derivedContract.api?.port && derivedContract.api.port !== 8080 ? { port: derivedContract.api.port } : {}),
        ...(derivedContract.api?.auth ? { auth: derivedContract.api.auth } : {})
      },
      config: {
        ...aiPlan.config,
        ...derivedContract.config
      }
    };

    // Merge entities
    const aiEntities = aiPlan.entities || [];
    const derivedEntities = derivedContract.entities || [];
    const mergedEntities = [...aiEntities];

    for (const de of derivedEntities) {
      const existingIdx = mergedEntities.findIndex(e => e.name.toLowerCase() === de.name.toLowerCase());
      if (existingIdx >= 0) {
        // Update existing entity with potentially new fields from code
        const existingFields = mergedEntities[existingIdx].fields || [];
        const mergedFields = [...existingFields];

        for (const df of de.fields) {
          const fieldIdx = mergedFields.findIndex(f => f.name === df.name);
          if (fieldIdx >= 0) {
            // Field exists, update type if it's more specific in code, but keep aiPlan specificity like int(0..100)
            const aiType = mergedFields[fieldIdx].type;
            const aiTypeLower = (aiType || '').toLowerCase();
            const genericTypes = ['string', 'number', 'boolean', 'any', 'json', 'text', 'object', ''];
            
            if (genericTypes.includes(aiTypeLower)) {
              mergedFields[fieldIdx].type = df.type;
            }
            mergedFields[fieldIdx].required = df.required;
          } else {
            // New field found in code
            mergedFields.push(df);
          }
        }
        mergedEntities[existingIdx].fields = mergedFields;
      } else {
        // Entirely new entity found in code
        mergedEntities.push(de);
      }
    }
    merged.entities = mergedEntities;

    // Restore sections that code analysis usually misses
    if (!merged.events || merged.events.length === 0) merged.events = derivedContract.events || aiPlan.events || [];
    if (!merged.alerts) merged.alerts = aiPlan.alerts || [];
    if (!merged.sources) merged.sources = aiPlan.sources || [];
    if (!merged.pipelines) merged.pipelines = aiPlan.pipelines || [];
    if (!merged.dashboards) merged.dashboards = aiPlan.dashboards || [];
    if (!merged.workflows) merged.workflows = aiPlan.workflows || [];

    return merged;
  }
  private mapTypeToDSL(type: string, fieldName?: string): string {
    const t = type.toLowerCase().trim();
    const n = fieldName?.toLowerCase() || '';

    // Specific field name matching
    if (n === 'id' || n === 'uuid' || n === 'guid') return 'uuid';
    if (n === 'email' || t.includes('email')) return 'email';
    if (n === 'phone' || n === 'tel' || n.includes('mobile')) return 'phone';
    if (n === 'url' || n === 'uri' || n === 'website' || n === 'link') return 'url';
    if (n === 'createdat' || n === 'updatedat' || n.endsWith('at') || n === 'timestamp') return 'datetime';
    
    // Fallback to suffix matching for IDs, but avoid common business IDs like taxId
    if (n.endsWith('id') && !n.match(/tax|vat|national|citizen|business/)) return 'uuid';
    
    if (t === 'string' || t === 'text') return 'text';
    if (t === 'number' || t === 'int' || t === 'integer') return 'int';
    if (t === 'boolean' || t === 'bool') return 'bool';
    if (t === 'date' || t === 'datetime' || t === 'timestamp') return 'datetime';
    if (t === 'json' || t === 'object' || t === 'any') return 'json';
    
    return type; // Keep as is if unknown (e.g. enum or another entity)
  }
}

export default CodeAnalyzer;
