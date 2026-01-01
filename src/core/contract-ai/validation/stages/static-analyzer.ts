/**
 * Stage 3: Static Analyzer
 * 
 * Uruchamia analizę statyczną kodu (ESLint-like rules).
 * 
 * @version 2.2.0
 */

import { StageResult, GeneratedFile } from '../../types';
import { ValidationContext, ValidationStage } from '../pipeline-orchestrator';

// ============================================================================
// STATIC ANALYZER STAGE
// ============================================================================

/**
 * Stage 3: Analiza statyczna kodu
 */
export class StaticAnalyzer implements ValidationStage {
  name = 'static-analysis';
  critical = false;
  timeout = 30000;

  async validator(context: ValidationContext): Promise<StageResult> {
    const errors: StageResult['errors'] = [];
    const warnings: StageResult['warnings'] = [];
    const { staticRules } = context.contract.validation;

    for (const file of context.code.files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      
      // Tylko pliki TypeScript/JavaScript
      if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
        continue;
      }

      // Uruchom reguły
      for (const rule of staticRules) {
        if (rule.severity === 'off') continue;

        const issues = this.checkRule(rule.name, file);
        
        for (const issue of issues) {
          if (rule.severity === 'error') {
            errors.push({
              message: `[${rule.name}] ${issue.message}`,
              file: file.path,
              line: issue.line,
              code: rule.name
            });
          } else {
            warnings.push({
              message: `[${rule.name}] ${issue.message}`,
              file: file.path,
              line: issue.line
            });
          }
        }
      }

      // Dodatkowe wbudowane reguły
      const builtInIssues = this.runBuiltInRules(file);
      warnings.push(...builtInIssues);
    }

    return {
      stage: this.name,
      passed: errors.length === 0,
      errors,
      warnings,
      timeMs: 0
    };
  }

  /**
   * Sprawdza pojedynczą regułę
   */
  private checkRule(
    ruleName: string,
    file: GeneratedFile
  ): Array<{ message: string; line?: number }> {
    const issues: Array<{ message: string; line?: number }> = [];
    const lines = file.content.split('\n');

    switch (ruleName) {
      case 'no-unused-vars':
        // Uproszczona wersja - szukaj zadeklarowanych ale nieużywanych zmiennych
        // W pełnej implementacji użyłoby się parsera AST
        break;

      case 'no-explicit-any':
      case 'no-any':
        lines.forEach((line, index) => {
          // Szukaj `: any` lub `as any`
          if (/:\s*any\b/.test(line) || /as\s+any\b/.test(line)) {
            // Ignoruj w error handlerach
            if (!line.includes('catch') && !line.includes('error')) {
              issues.push({
                message: 'Unexpected any type. Specify a more specific type.',
                line: index + 1
              });
            }
          }
        });
        break;

      case 'prefer-const':
        lines.forEach((line, index) => {
          // Szukaj `let` które powinno być `const`
          if (/\blet\s+\w+\s*=\s*[^;]+;?\s*$/.test(line)) {
            // Uproszczone sprawdzenie
            issues.push({
              message: 'Use const instead of let when variable is not reassigned.',
              line: index + 1
            });
          }
        });
        break;

      case 'eqeqeq':
        lines.forEach((line, index) => {
          // Szukaj == lub != (ale nie === lub !==)
          if (/[^=!]==[^=]/.test(line) || /[^!]!=[^=]/.test(line)) {
            issues.push({
              message: 'Expected === or !== instead of == or !=',
              line: index + 1
            });
          }
        });
        break;

      case 'no-console':
        lines.forEach((line, index) => {
          if (/\bconsole\.(log|warn|error|info|debug)\s*\(/.test(line)) {
            issues.push({
              message: 'Unexpected console statement.',
              line: index + 1
            });
          }
        });
        break;

      case 'no-debugger':
        lines.forEach((line, index) => {
          if (/\bdebugger\b/.test(line)) {
            issues.push({
              message: 'Unexpected debugger statement.',
              line: index + 1
            });
          }
        });
        break;
    }

    return issues;
  }

  /**
   * Uruchamia wbudowane reguły
   */
  private runBuiltInRules(file: GeneratedFile): StageResult['warnings'] {
    const warnings: StageResult['warnings'] = [];
    const lines = file.content.split('\n');

    // Sprawdź długość pliku
    if (lines.length > 300) {
      warnings.push({
        message: `File is ${lines.length} lines long. Consider splitting into smaller modules.`,
        file: file.path
      });
    }

    // Sprawdź długość linii
    lines.forEach((line, index) => {
      if (line.length > 120) {
        warnings.push({
          message: `Line exceeds 120 characters (${line.length}).`,
          file: file.path,
          line: index + 1
        });
      }
    });

    // Sprawdź TODO/FIXME
    lines.forEach((line, index) => {
      if (/\b(TODO|FIXME|XXX)\b/.test(line)) {
        warnings.push({
          message: 'Contains TODO/FIXME comment.',
          file: file.path,
          line: index + 1
        });
      }
    });

    return warnings;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createStaticAnalyzer(): StaticAnalyzer {
  return new StaticAnalyzer();
}
