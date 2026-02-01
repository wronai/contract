/**
 * Stage 5: Quality Checker
 * 
 * Sprawdza bramki jakości (quality gates).
 * 
 * @version 2.4.1
 */

import { StageResult, GeneratedFile, QualityMetric } from '../../types';
import { ValidationContext, ValidationStage } from '../pipeline-orchestrator';

// ============================================================================
// QUALITY CHECKER STAGE
// ============================================================================

/**
 * Stage 5: Sprawdzenie bramek jakości
 */
export class QualityChecker implements ValidationStage {
  name = 'quality';
  critical = false;
  timeout = 30000;

  async validator(context: ValidationContext): Promise<StageResult> {
    const errors: StageResult['errors'] = [];
    const warnings: StageResult['warnings'] = [];
    const metrics: Record<string, number> = {};
    const { qualityGates } = context.contract.validation;

    // Oblicz metryki
    metrics['lines-of-code'] = this.calculateLinesOfCode(context.code.files);
    metrics['cyclomatic-complexity'] = this.calculateAverageComplexity(context.code.files);
    metrics['duplication-ratio'] = this.calculateDuplicationRatio(context.code.files);
    metrics['type-coverage'] = this.calculateTypeCoverage(context.code.files);
    
    // Test coverage wymaga uruchomienia testów - na razie placeholder
    metrics['test-coverage'] = 0;

    // Sprawdź każdą bramkę
    for (const gate of qualityGates) {
      // Skip test-coverage gate when tests haven't been run
      if (gate.metric === 'test-coverage' && metrics['test-coverage'] === 0) {
        warnings.push({
          message: `Quality gate skipped: ${gate.name} (no tests executed yet)`
        });
        continue;
      }

      const value = metrics[gate.metric] ?? 0;
      const passed = this.checkThreshold(value, gate.threshold, gate.operator);

      if (!passed) {
        errors.push({
          message: `Quality gate failed: ${gate.name}. ${gate.metric} is ${value}, expected ${gate.operator} ${gate.threshold}`,
          code: `QUALITY_${gate.metric.toUpperCase().replace(/-/g, '_')}`
        });
      }
    }

    return {
      stage: this.name,
      passed: errors.length === 0,
      errors,
      warnings,
      metrics,
      timeMs: 0
    };
  }

  /**
   * Sprawdza próg
   */
  private checkThreshold(
    value: number,
    threshold: number,
    operator: string
  ): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '>=': return value >= threshold;
      case '<': return value < threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      default: return true;
    }
  }

  /**
   * Oblicza łączną liczbę linii kodu
   */
  private calculateLinesOfCode(files: GeneratedFile[]): number {
    return files.reduce((total, file) => {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
        // Licz linie bez pustych i komentarzy
        const lines = file.content.split('\n').filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && 
                 !trimmed.startsWith('//') && 
                 !trimmed.startsWith('/*') &&
                 !trimmed.startsWith('*');
        });
        return total + lines.length;
      }
      return total;
    }, 0);
  }

  /**
   * Oblicza średnią złożoność cyklomatyczną
   */
  private calculateAverageComplexity(files: GeneratedFile[]): number {
    let totalComplexity = 0;
    let functionCount = 0;

    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) continue;

      // Licz punkty decyzyjne
      const content = file.content;
      
      // if, else if, while, for, case, catch, &&, ||, ?:
      const patterns = [
        /\bif\s*\(/g,
        /\belse\s+if\s*\(/g,
        /\bwhile\s*\(/g,
        /\bfor\s*\(/g,
        /\bcase\s+/g,
        /\bcatch\s*\(/g,
        /&&/g,
        /\|\|/g,
        /\?\s*[^:]+\s*:/g // ternary
      ];

      let fileComplexity = 1; // Base complexity
      for (const pattern of patterns) {
        const matches = content.match(pattern);
        if (matches) {
          fileComplexity += matches.length;
        }
      }

      // Licz funkcje
      const functionMatches = content.match(/\b(function|const\s+\w+\s*=\s*(?:async\s*)?\(|=>\s*{)/g);
      const fileFunctions = functionMatches ? functionMatches.length : 1;

      totalComplexity += fileComplexity;
      functionCount += fileFunctions;
    }

    return functionCount > 0 ? Math.round(totalComplexity / functionCount) : 0;
  }

  /**
   * Oblicza współczynnik duplikacji kodu
   */
  private calculateDuplicationRatio(files: GeneratedFile[]): number {
    const codeLines: string[] = [];
    
    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) continue;

      const lines = file.content.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 10); // Tylko znaczące linie
      
      codeLines.push(...lines);
    }

    if (codeLines.length === 0) return 0;

    // Prosta heurystyka: licz powtórzenia
    const lineCounts = new Map<string, number>();
    for (const line of codeLines) {
      lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
    }

    let duplicatedLines = 0;
    for (const [, count] of lineCounts) {
      if (count > 1) {
        duplicatedLines += count - 1;
      }
    }

    return Math.round((duplicatedLines / codeLines.length) * 100);
  }

  /**
   * Oblicza pokrycie typami
   */
  private calculateTypeCoverage(files: GeneratedFile[]): number {
    let typedDeclarations = 0;
    let totalDeclarations = 0;

    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!['ts', 'tsx'].includes(ext || '')) continue;

      const content = file.content;
      
      // Licz deklaracje z typami
      const typedPatterns = [
        /:\s*\w+[\[\]<>]*\s*[=;,)]/g,  // : Type
        /:\s*\{[^}]+\}/g,               // : { ... }
        /:\s*\([^)]*\)\s*=>/g           // : () => 
      ];

      for (const pattern of typedPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          typedDeclarations += matches.length;
        }
      }

      // Licz wszystkie deklaracje (uproszczone)
      const declPatterns = [
        /\b(const|let|var)\s+\w+/g,
        /\bfunction\s+\w+/g,
        /\(\s*\w+\s*[,)]/g
      ];

      for (const pattern of declPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          totalDeclarations += matches.length;
        }
      }
    }

    return totalDeclarations > 0 
      ? Math.round((typedDeclarations / totalDeclarations) * 100)
      : 100;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createQualityChecker(): QualityChecker {
  return new QualityChecker();
}
