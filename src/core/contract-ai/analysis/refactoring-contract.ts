/**
 * Refactoring Contract Generator
 * 
 * Generates structured refactoring contracts from code analysis.
 * Outputs: JSON (machine), Markdown (human), TODO (actionable).
 * 
 * Based on metric-driven approach:
 * - LOC > 50 → Extract Method
 * - CC > 10 → Simplify Conditional
 * - Params > 5 → Parameter Object
 * - Nesting > 4 → Reduce Nesting
 * 
 * @version 1.0.0
 */

import { AnalysisReport, FunctionInfo, FileInfo } from './code-analyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface RefactoringIssue {
  id: number;
  file: string;
  function: string;
  line: number;
  type: RefactoringType;
  metrics: {
    loc?: number;
    complexity?: number;
    params?: number;
    nesting?: number;
    fanIn?: number;
    fanOut?: number;
    couplingScore?: number;
  };
  severity: 'critical' | 'high' | 'medium' | 'low';
  effort: number; // days
  rationale: string;
  action: string;
  // LLM-friendly context
  llmContext?: {
    focusArea: string;
    suggestedSteps: string[];
    testStrategy: string;
  };
}

export type RefactoringType = 
  | 'extract_method'
  | 'simplify_conditional'
  | 'introduce_parameter_object'
  | 'reduce_nesting'
  | 'split_class'
  | 'remove_duplication';

export interface RefactoringContract {
  version: string;
  generated: string;
  repo_url?: string;
  summary: {
    total_files: number;
    total_functions: number;
    total_issues: number;
    by_severity: Record<string, number>;
    total_effort_days: number;
  };
  issues: RefactoringIssue[];
  recommendations: string[];
}

// ============================================================================
// THRESHOLDS (Based on SonarQube, CodeScene, Academic Research)
// ============================================================================

const THRESHOLDS = {
  loc: {
    yellow: 50,
    critical: 100
  },
  complexity: {
    yellow: 10,
    critical: 20
  },
  params: {
    yellow: 5,
    critical: 8
  },
  nesting: {
    yellow: 4,
    critical: 6
  }
};

// ============================================================================
// REFACTORING CONTRACT GENERATOR
// ============================================================================

export class RefactoringContractGenerator {
  private report: AnalysisReport;
  private repoUrl?: string;

  constructor(report: AnalysisReport, repoUrl?: string) {
    this.report = report;
    this.repoUrl = repoUrl;
  }

  /**
   * Generate full refactoring contract
   */
  generate(): RefactoringContract {
    const issues = this.identifyIssues();
    const bySeverity = this.countBySeverity(issues);
    const totalEffort = issues.reduce((sum, i) => sum + i.effort, 0);

    return {
      version: '1.0.0',
      generated: new Date().toISOString(),
      repo_url: this.repoUrl,
      summary: {
        total_files: this.report.summary.totalFiles,
        total_functions: this.report.summary.totalFunctions,
        total_issues: issues.length,
        by_severity: bySeverity,
        total_effort_days: totalEffort
      },
      issues,
      recommendations: this.generateRecommendations(issues)
    };
  }

  /**
   * Identify refactoring issues based on metrics
   */
  private identifyIssues(): RefactoringIssue[] {
    const issues: RefactoringIssue[] = [];
    let id = 1;

    for (const file of this.report.files) {
      for (const fn of file.functions) {
        // Check LOC
        if (fn.lines > THRESHOLDS.loc.yellow) {
          issues.push(this.createIssue(id++, file, fn, 'extract_method', {
            loc: fn.lines
          }));
        }

        // Check Complexity
        if (fn.complexity > THRESHOLDS.complexity.yellow) {
          issues.push(this.createIssue(id++, file, fn, 'simplify_conditional', {
            complexity: fn.complexity
          }));
        }

        // Check Parameters
        if (fn.params.length > THRESHOLDS.params.yellow) {
          issues.push(this.createIssue(id++, file, fn, 'introduce_parameter_object', {
            params: fn.params.length
          }));
        }

        // Check High Coupling (fanIn * fanOut > 20 = risky central function)
        const coupling = (fn.fanIn || 0) * (fn.fanOut || 0);
        if (coupling > 20) {
          issues.push(this.createIssue(id++, file, fn, 'split_class', {
            fanIn: fn.fanIn,
            fanOut: fn.fanOut,
            couplingScore: coupling
          }));
        }
      }
    }

    // Sort by severity (critical first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
  }

  /**
   * Create a refactoring issue
   */
  private createIssue(
    id: number,
    file: FileInfo,
    fn: FunctionInfo,
    type: RefactoringType,
    metrics: RefactoringIssue['metrics']
  ): RefactoringIssue {
    const severity = this.determineSeverity(metrics);
    const effort = this.estimateEffort(type, metrics, severity);

    // Add call graph metrics
    metrics.fanIn = fn.fanIn;
    metrics.fanOut = fn.fanOut;
    metrics.couplingScore = fn.couplingScore;

    return {
      id,
      file: file.relativePath,
      function: fn.name,
      line: fn.startLine,
      type,
      metrics,
      severity,
      effort,
      rationale: this.generateRationale(type, metrics),
      action: this.getAction(type),
      llmContext: this.generateLLMContext(fn, type, metrics)
    };
  }

  /**
   * Generate LLM-friendly context for refactoring
   */
  private generateLLMContext(
    fn: FunctionInfo,
    type: RefactoringType,
    metrics: RefactoringIssue['metrics']
  ): RefactoringIssue['llmContext'] {
    const steps: string[] = [];
    let focusArea = '';
    let testStrategy = '';

    switch (type) {
      case 'extract_method':
        focusArea = `Function ${fn.name} has ${metrics.loc} lines. Identify cohesive blocks that can be extracted.`;
        steps.push('1. Identify repeated or cohesive code blocks');
        steps.push('2. Extract each block to a new private method');
        steps.push('3. Give extracted methods descriptive names');
        steps.push('4. Replace original code with method calls');
        testStrategy = 'Write unit tests for extracted methods before extraction';
        break;

      case 'simplify_conditional':
        focusArea = `Function ${fn.name} has complexity ${metrics.complexity}. Reduce branching.`;
        steps.push('1. Use guard clauses for early returns');
        steps.push('2. Extract complex conditions to named boolean methods');
        steps.push('3. Consider strategy/state pattern for switch statements');
        steps.push('4. Flatten nested if-else chains');
        testStrategy = 'Add test cases for each conditional branch before refactoring';
        break;

      case 'introduce_parameter_object':
        focusArea = `Function ${fn.name} has ${metrics.params} parameters. Group related params.`;
        steps.push('1. Identify parameters that belong together');
        steps.push('2. Create interface/type for parameter group');
        steps.push('3. Update function signature');
        steps.push('4. Update all call sites');
        testStrategy = 'Ensure existing tests cover parameter combinations';
        break;

      case 'reduce_nesting':
        focusArea = `Function ${fn.name} has deep nesting. Flatten structure.`;
        steps.push('1. Invert conditions and use early returns');
        steps.push('2. Extract nested blocks to separate methods');
        steps.push('3. Use guard clauses at function start');
        testStrategy = 'Test edge cases that trigger deep nesting paths';
        break;

      case 'split_class':
        focusArea = `Function ${fn.name} has high coupling (fanIn=${metrics.fanIn}, fanOut=${metrics.fanOut}). Central hub - risky to change.`;
        steps.push('1. Identify distinct responsibilities in this function');
        steps.push('2. Create separate modules/classes for each responsibility');
        steps.push('3. Use dependency injection to reduce coupling');
        steps.push('4. Apply facade pattern if function coordinates many operations');
        testStrategy = 'Integration tests critical - function touches many parts of system';
        break;

      default:
        focusArea = `Refactor ${fn.name} to improve maintainability`;
        steps.push('1. Analyze current structure');
        steps.push('2. Apply appropriate refactoring pattern');
        steps.push('3. Verify tests pass');
        testStrategy = 'Ensure test coverage before changes';
    }

    return { focusArea, suggestedSteps: steps, testStrategy };
  }

  /**
   * Determine severity based on metrics
   */
  private determineSeverity(metrics: RefactoringIssue['metrics']): RefactoringIssue['severity'] {
    if (metrics.loc && metrics.loc > THRESHOLDS.loc.critical) return 'critical';
    if (metrics.complexity && metrics.complexity > THRESHOLDS.complexity.critical) return 'critical';
    if (metrics.params && metrics.params > THRESHOLDS.params.critical) return 'high';
    
    if (metrics.loc && metrics.loc > THRESHOLDS.loc.yellow + 25) return 'high';
    if (metrics.complexity && metrics.complexity > THRESHOLDS.complexity.yellow + 5) return 'high';
    
    if (metrics.loc && metrics.loc > THRESHOLDS.loc.yellow) return 'medium';
    if (metrics.complexity && metrics.complexity > THRESHOLDS.complexity.yellow) return 'medium';
    
    return 'low';
  }

  /**
   * Estimate effort in days
   */
  private estimateEffort(
    type: RefactoringType,
    metrics: RefactoringIssue['metrics'],
    severity: RefactoringIssue['severity']
  ): number {
    const baseEffort: Record<RefactoringType, number> = {
      extract_method: 2,
      simplify_conditional: 2,
      introduce_parameter_object: 1,
      reduce_nesting: 1,
      split_class: 3,
      remove_duplication: 2
    };

    let effort = baseEffort[type];
    
    // Adjust based on severity
    if (severity === 'critical') effort += 1;
    if (severity === 'high') effort += 0.5;

    // Adjust based on size
    if (metrics.loc && metrics.loc > 100) effort += 1;
    if (metrics.complexity && metrics.complexity > 20) effort += 1;

    return Math.round(effort * 10) / 10;
  }

  /**
   * Generate rationale for the issue
   */
  private generateRationale(type: RefactoringType, metrics: RefactoringIssue['metrics']): string {
    switch (type) {
      case 'extract_method':
        return `Function has ${metrics.loc} lines of code (threshold: ${THRESHOLDS.loc.yellow}). Long functions are harder to test, understand, and maintain.`;
      case 'simplify_conditional':
        return `Cyclomatic complexity is ${metrics.complexity} (threshold: ${THRESHOLDS.complexity.yellow}). High complexity indicates too many execution paths and potential bugs.`;
      case 'introduce_parameter_object':
        return `Function has ${metrics.params} parameters (threshold: ${THRESHOLDS.params.yellow}). Too many parameters indicate the function is doing too much.`;
      case 'reduce_nesting':
        return `Nesting depth is ${metrics.nesting} (threshold: ${THRESHOLDS.nesting.yellow}). Deep nesting makes code hard to follow.`;
      default:
        return 'Code quality issue detected.';
    }
  }

  /**
   * Get action description
   */
  private getAction(type: RefactoringType): string {
    const actions: Record<RefactoringType, string> = {
      extract_method: 'Extract smaller, focused methods with single responsibility',
      simplify_conditional: 'Use guard clauses, extract conditionals to methods, use polymorphism',
      introduce_parameter_object: 'Create a data class/interface to group related parameters',
      reduce_nesting: 'Use early returns, extract nested logic to separate methods',
      split_class: 'Separate concerns into distinct classes with clear responsibilities',
      remove_duplication: 'Extract common code to shared functions or base class'
    };
    return actions[type];
  }

  /**
   * Count issues by severity
   */
  private countBySeverity(issues: RefactoringIssue[]): Record<string, number> {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const issue of issues) {
      counts[issue.severity]++;
    }
    return counts;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(issues: RefactoringIssue[]): string[] {
    const recs: string[] = [];
    const bySeverity = this.countBySeverity(issues);

    if (bySeverity.critical > 0) {
      recs.push(`Address ${bySeverity.critical} critical issues first - they pose highest risk`);
    }

    const extractMethods = issues.filter(i => i.type === 'extract_method').length;
    if (extractMethods > 3) {
      recs.push(`${extractMethods} functions need extraction - consider batch refactoring session`);
    }

    const complexFunctions = issues.filter(i => i.type === 'simplify_conditional').length;
    if (complexFunctions > 0) {
      recs.push(`Add tests before simplifying ${complexFunctions} complex functions`);
    }

    if (issues.length > 10) {
      recs.push('Create dedicated refactoring sprint to address accumulated debt');
    }

    recs.push('Use mend-style incremental refactoring: one small change at a time');
    recs.push('Run tests after each refactoring step');

    return recs;
  }

  // ============================================================================
  // OUTPUT GENERATORS
  // ============================================================================

  /**
   * Generate JSON output
   */
  toJSON(): string {
    return JSON.stringify(this.generate(), null, 2);
  }

  /**
   * Generate Markdown report
   */
  toMarkdown(): string {
    const contract = this.generate();
    const lines: string[] = [
      '# Refactoring Contract Report',
      '',
      `**Generated:** ${contract.generated}`,
      contract.repo_url ? `**Repository:** ${contract.repo_url}` : '',
      '',
      '## Summary',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Files | ${contract.summary.total_files} |`,
      `| Functions | ${contract.summary.total_functions} |`,
      `| Issues | ${contract.summary.total_issues} |`,
      `| Critical | ${contract.summary.by_severity.critical} |`,
      `| High | ${contract.summary.by_severity.high} |`,
      `| Medium | ${contract.summary.by_severity.medium} |`,
      `| Low | ${contract.summary.by_severity.low} |`,
      `| **Total Effort** | **${contract.summary.total_effort_days} days** |`,
      ''
    ];

    // Issues by severity
    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const severityIssues = contract.issues.filter(i => i.severity === severity);
      if (severityIssues.length > 0) {
        lines.push(`## ${severity.toUpperCase()} Issues (${severityIssues.length})`, '');
        lines.push('| Function | File | Type | Effort |');
        lines.push('|----------|------|------|--------|');
        for (const issue of severityIssues) {
          lines.push(`| ${issue.function} | ${issue.file}:${issue.line} | ${issue.type} | ${issue.effort}d |`);
        }
        lines.push('');
      }
    }

    // Recommendations
    if (contract.recommendations.length > 0) {
      lines.push('## Recommendations', '');
      for (const rec of contract.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate TODO list
   */
  toTodoList(): string {
    const contract = this.generate();
    const lines: string[] = [
      '# Refactoring TODO List',
      '',
      `Generated: ${contract.generated}`,
      `Total Effort: ${contract.summary.total_effort_days} days`,
      ''
    ];

    let priority = 1;
    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const severityIssues = contract.issues.filter(i => i.severity === severity);
      if (severityIssues.length > 0) {
        lines.push(`## Priority ${priority}: ${severity.charAt(0).toUpperCase() + severity.slice(1)}`, '');
        
        for (const issue of severityIssues) {
          lines.push(`- [ ] **[${issue.id}]** Refactor \`${issue.function}\``);
          lines.push(`      File: ${issue.file}:${issue.line}`);
          lines.push(`      Action: ${issue.action}`);
          lines.push(`      Estimated: ${issue.effort} days`);
          lines.push('');
        }
        priority++;
      }
    }

    // Workflow guide
    lines.push('---', '');
    lines.push('## Workflow (mend-style)', '');
    lines.push('```bash');
    lines.push('# For each issue:');
    lines.push('git checkout -b refactor/<id>-<function-name>');
    lines.push('# 1. Write test if missing');
    lines.push('# 2. Make ONE small change');
    lines.push('# 3. Run tests');
    lines.push('# 4. Commit with message: "refactor: <description>"');
    lines.push('# 5. Repeat until done');
    lines.push('git push && create PR');
    lines.push('```');

    return lines.join('\n');
  }
}

export default RefactoringContractGenerator;
