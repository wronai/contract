/**
 * Project State Generator
 * 
 * Generates and maintains state/project-state.json as source of knowledge
 * about the current project structure. Updated on every analysis.
 * 
 * Used alongside contract/contract.ai.json (source of intent) for:
 * - Tracking actual vs intended state
 * - Identifying discrepancies for refactoring
 * - Providing context for LLM-based refactoring
 * 
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { AnalysisReport, FunctionInfo, FileInfo } from './code-analyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectState {
  version: string;
  generated: string;
  rootDir: string;
  
  // High-level summary
  summary: {
    totalFiles: number;
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    languages: Record<string, number>;
    avgComplexity: number;
    avgFunctionLines: number;
  };

  // Module structure (for hierarchical RAG)
  modules: ModuleInfo[];

  // Key entities detected (classes, interfaces, types)
  entities: EntityInfo[];

  // API endpoints detected
  endpoints: EndpointInfo[];

  // Dependencies (imports/exports graph)
  dependencies: DependencyInfo[];

  // High-risk functions (for prioritized refactoring)
  hotspots: HotspotInfo[];

  // Call graph summary
  callGraph: {
    nodes: number;
    edges: number;
    hubs: string[];  // Functions with high coupling
  };
}

export interface ModuleInfo {
  name: string;
  path: string;
  files: number;
  lines: number;
  functions: number;
  classes: number;
  exports: string[];
  description?: string;  // Generated summary for RAG
}

export interface EntityInfo {
  name: string;
  type: 'class' | 'interface' | 'type' | 'enum';
  file: string;
  line: number;
  fields?: string[];
  methods?: string[];
}

export interface EndpointInfo {
  method: string;
  path: string;
  handler: string;
  file: string;
  line: number;
}

export interface DependencyInfo {
  from: string;
  to: string;
  type: 'import' | 'extends' | 'implements' | 'calls';
}

export interface HotspotInfo {
  function: string;
  file: string;
  line: number;
  metrics: {
    loc: number;
    complexity: number;
    fanIn: number;
    fanOut: number;
    couplingScore: number;
  };
  riskScore: number;  // 0-100
  reason: string;
}

// ============================================================================
// PROJECT STATE GENERATOR
// ============================================================================

export class ProjectStateGenerator {
  private report: AnalysisReport;
  private rootDir: string;

  constructor(report: AnalysisReport, rootDir: string) {
    this.report = report;
    this.rootDir = rootDir;
  }

  /**
   * Generate complete project state
   */
  generate(): ProjectState {
    const modules = this.extractModules();
    const entities = this.extractEntities();
    const endpoints = this.extractEndpoints();
    const dependencies = this.extractDependencies();
    const hotspots = this.identifyHotspots();
    const callGraph = this.summarizeCallGraph();

    // Calculate averages
    const allFunctions = this.report.files.flatMap(f => f.functions);
    const avgComplexity = allFunctions.length > 0
      ? allFunctions.reduce((sum, f) => sum + f.complexity, 0) / allFunctions.length
      : 0;
    const avgFunctionLines = allFunctions.length > 0
      ? allFunctions.reduce((sum, f) => sum + f.lines, 0) / allFunctions.length
      : 0;

    // Count languages
    const languages: Record<string, number> = {};
    for (const file of this.report.files) {
      languages[file.language] = (languages[file.language] || 0) + 1;
    }

    return {
      version: '1.0.0',
      generated: new Date().toISOString(),
      rootDir: this.rootDir,
      summary: {
        totalFiles: this.report.summary.totalFiles,
        totalLines: this.report.summary.totalLines,
        totalFunctions: this.report.summary.totalFunctions,
        totalClasses: this.report.summary.totalClasses,
        languages,
        avgComplexity: Math.round(avgComplexity * 10) / 10,
        avgFunctionLines: Math.round(avgFunctionLines * 10) / 10
      },
      modules,
      entities,
      endpoints,
      dependencies,
      hotspots,
      callGraph
    };
  }

  /**
   * Extract module structure (folders as modules)
   */
  private extractModules(): ModuleInfo[] {
    const moduleMap = new Map<string, FileInfo[]>();

    for (const file of this.report.files) {
      const dir = path.dirname(file.relativePath);
      const moduleName = dir === '.' ? 'root' : dir.split('/')[0];
      
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, []);
      }
      moduleMap.get(moduleName)!.push(file);
    }

    const modules: ModuleInfo[] = [];
    for (const [name, files] of moduleMap) {
      const allExports = files.flatMap(f => f.exports);
      modules.push({
        name,
        path: name === 'root' ? '.' : name,
        files: files.length,
        lines: files.reduce((sum, f) => sum + f.lines, 0),
        functions: files.reduce((sum, f) => sum + f.functions.length, 0),
        classes: files.reduce((sum, f) => sum + f.classes.length, 0),
        exports: [...new Set(allExports)].slice(0, 20)
      });
    }

    return modules.sort((a, b) => b.lines - a.lines);
  }

  /**
   * Extract entities (classes, interfaces)
   */
  private extractEntities(): EntityInfo[] {
    const entities: EntityInfo[] = [];

    for (const file of this.report.files) {
      for (const className of file.classes) {
        // Find methods for this class
        const methods = file.functions
          .filter(f => f.name !== className && f.name !== 'constructor')
          .map(f => f.name)
          .slice(0, 10);

        entities.push({
          name: className,
          type: 'class',
          file: file.relativePath,
          line: 1, // Would need AST for exact line
          methods
        });
      }
    }

    return entities.slice(0, 50);  // Limit for LLM context
  }

  /**
   * Extract API endpoints (heuristic detection)
   */
  private extractEndpoints(): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

    for (const file of this.report.files) {
      for (const fn of file.functions) {
        const lowerName = fn.name.toLowerCase();
        
        // Detect route handlers
        for (const method of httpMethods) {
          if (lowerName.startsWith(method) || lowerName.includes('handler') || lowerName.includes('route')) {
            // Try to extract path from function name
            const pathMatch = fn.name.match(/(?:get|post|put|delete)(\w+)/i);
            const pathGuess = pathMatch ? `/${pathMatch[1].toLowerCase()}` : '/unknown';
            
            endpoints.push({
              method: method.toUpperCase(),
              path: pathGuess,
              handler: fn.name,
              file: file.relativePath,
              line: fn.startLine
            });
            break;
          }
        }
      }
    }

    return endpoints.slice(0, 30);
  }

  /**
   * Extract dependencies (import graph)
   */
  private extractDependencies(): DependencyInfo[] {
    const deps: DependencyInfo[] = [];

    for (const file of this.report.files) {
      for (const imp of file.imports) {
        deps.push({
          from: file.relativePath,
          to: imp,
          type: 'import'
        });
      }
    }

    return deps.slice(0, 100);  // Limit for storage
  }

  /**
   * Identify hotspots (high-risk functions)
   */
  private identifyHotspots(): HotspotInfo[] {
    const hotspots: HotspotInfo[] = [];

    for (const file of this.report.files) {
      for (const fn of file.functions) {
        const riskScore = this.calculateRiskScore(fn);
        
        if (riskScore > 30) {  // Only include risky functions
          hotspots.push({
            function: fn.name,
            file: file.relativePath,
            line: fn.startLine,
            metrics: {
              loc: fn.lines,
              complexity: fn.complexity,
              fanIn: fn.fanIn || 0,
              fanOut: fn.fanOut || 0,
              couplingScore: fn.couplingScore || 0
            },
            riskScore,
            reason: this.getRiskReason(fn, riskScore)
          });
        }
      }
    }

    return hotspots
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);  // Top 20 hotspots
  }

  /**
   * Calculate risk score (0-100)
   */
  private calculateRiskScore(fn: FunctionInfo): number {
    let score = 0;

    // LOC contribution (0-30)
    if (fn.lines > 100) score += 30;
    else if (fn.lines > 50) score += 20;
    else if (fn.lines > 30) score += 10;

    // Complexity contribution (0-30)
    if (fn.complexity > 20) score += 30;
    else if (fn.complexity > 10) score += 20;
    else if (fn.complexity > 5) score += 10;

    // Coupling contribution (0-30)
    const coupling = fn.couplingScore || 0;
    if (coupling > 50) score += 30;
    else if (coupling > 20) score += 20;
    else if (coupling > 10) score += 10;

    // Parameters contribution (0-10)
    if (fn.params.length > 5) score += 10;
    else if (fn.params.length > 3) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Get human-readable risk reason
   */
  private getRiskReason(fn: FunctionInfo, score: number): string {
    const reasons: string[] = [];

    if (fn.lines > 50) reasons.push(`long (${fn.lines} LOC)`);
    if (fn.complexity > 10) reasons.push(`complex (CC=${fn.complexity})`);
    if ((fn.couplingScore || 0) > 20) reasons.push(`high coupling (${fn.couplingScore})`);
    if (fn.params.length > 5) reasons.push(`many params (${fn.params.length})`);

    return reasons.join(', ') || 'multiple factors';
  }

  /**
   * Summarize call graph
   */
  private summarizeCallGraph(): ProjectState['callGraph'] {
    const allFunctions = this.report.files.flatMap(f => f.functions);
    const edges = allFunctions.reduce((sum, f) => sum + f.calls.length, 0);
    
    // Find hub functions (high coupling)
    const hubs = allFunctions
      .filter(f => (f.couplingScore || 0) > 20)
      .sort((a, b) => (b.couplingScore || 0) - (a.couplingScore || 0))
      .slice(0, 10)
      .map(f => f.name);

    return {
      nodes: allFunctions.length,
      edges,
      hubs
    };
  }

  // ============================================================================
  // OUTPUT
  // ============================================================================

  /**
   * Generate JSON output
   */
  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Save to file
   */
  save(outputDir: string): string {
    const stateDir = path.join(outputDir, 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const statePath = path.join(stateDir, 'project-state.json');
    fs.writeFileSync(statePath, this.toJSON(), 'utf-8');
    
    return statePath;
  }

  /**
   * Generate LLM-friendly summary (for small context windows)
   */
  toLLMSummary(): string {
    const state = this.generate();
    const lines: string[] = [
      `# Project State Summary`,
      ``,
      `## Overview`,
      `- Files: ${state.summary.totalFiles}`,
      `- Lines: ${state.summary.totalLines}`,
      `- Functions: ${state.summary.totalFunctions}`,
      `- Classes: ${state.summary.totalClasses}`,
      `- Avg Complexity: ${state.summary.avgComplexity}`,
      ``,
      `## Languages`,
      ...Object.entries(state.summary.languages).map(([lang, count]) => `- ${lang}: ${count} files`),
      ``,
      `## Modules`,
      ...state.modules.slice(0, 5).map(m => `- ${m.name}: ${m.files} files, ${m.functions} functions`),
      ``,
      `## Hotspots (High Risk)`,
      ...state.hotspots.slice(0, 5).map(h => `- ${h.function} (${h.file}): ${h.reason}, risk=${h.riskScore}`),
      ``,
      `## Call Graph Hubs`,
      ...state.callGraph.hubs.slice(0, 5).map(h => `- ${h}`)
    ];

    return lines.join('\n');
  }
}

export default ProjectStateGenerator;
