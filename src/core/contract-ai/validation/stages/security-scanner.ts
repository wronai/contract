/**
 * Stage 6: Security Scanner
 * 
 * Skanuje kod pod kątem problemów bezpieczeństwa.
 * 
 * @version 2.4.1
 */

import { StageResult, GeneratedFile, SecurityCheck } from '../../types';
import { ValidationContext, ValidationStage } from '../pipeline-orchestrator';

// ============================================================================
// SECURITY SCANNER STAGE
// ============================================================================

/**
 * Stage 6: Skanowanie bezpieczeństwa
 */
export class SecurityScanner implements ValidationStage {
  name = 'security';
  critical = true;
  timeout = 30000;

  async validator(context: ValidationContext): Promise<StageResult> {
    const errors: StageResult['errors'] = [];
    const warnings: StageResult['warnings'] = [];
    const { securityChecks } = context.contract.validation.acceptance;

    for (const file of context.code.files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      
      // Sprawdź pliki kodu i konfiguracji
      if (!['ts', 'tsx', 'js', 'jsx', 'json', 'env'].includes(ext || '')) {
        continue;
      }

      // Uruchom zdefiniowane sprawdzenia
      for (const check of securityChecks) {
        const issues = this.runSecurityCheck(check, file);
        
        for (const issue of issues) {
          if (check.severity === 'error') {
            errors.push({
              message: `[SECURITY] ${issue.message}`,
              file: file.path,
              line: issue.line,
              code: check.type
            });
          } else {
            warnings.push({
              message: `[SECURITY] ${issue.message}`,
              file: file.path,
              line: issue.line
            });
          }
        }
      }

      // Wbudowane sprawdzenia bezpieczeństwa
      const builtInIssues = this.runBuiltInChecks(file);
      errors.push(...builtInIssues);
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
   * Uruchamia sprawdzenie bezpieczeństwa
   */
  private runSecurityCheck(
    check: SecurityCheck,
    file: GeneratedFile
  ): Array<{ message: string; line?: number }> {
    const issues: Array<{ message: string; line?: number }> = [];
    const lines = file.content.split('\n');

    switch (check.type) {
      case 'no-hardcoded-secrets':
        issues.push(...this.checkHardcodedSecrets(lines, file.path));
        break;

      case 'no-sql-injection':
        issues.push(...this.checkSqlInjection(lines));
        break;

      case 'no-xss':
        issues.push(...this.checkXss(lines));
        break;

      case 'input-validation':
        issues.push(...this.checkInputValidation(file));
        break;

      case 'https-only':
        issues.push(...this.checkHttpsOnly(lines));
        break;
    }

    return issues;
  }

  /**
   * Sprawdza hardkodowane sekrety
   */
  private checkHardcodedSecrets(
    lines: string[],
    filePath: string
  ): Array<{ message: string; line?: number }> {
    const issues: Array<{ message: string; line?: number }> = [];

    // Wzorce sekretów
    const secretPatterns = [
      { pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"][^'"]{10,}['"]/i, name: 'API key' },
      { pattern: /(?:secret|password|passwd|pwd)\s*[=:]\s*['"][^'"]{6,}['"]/i, name: 'Password/Secret' },
      { pattern: /(?:token|auth)\s*[=:]\s*['"][^'"]{20,}['"]/i, name: 'Token' },
      { pattern: /(?:private[_-]?key)\s*[=:]\s*['"][^'"]+['"]/i, name: 'Private key' },
      { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/, name: 'Private key block' },
      { pattern: /(?:aws[_-]?(?:access|secret))[_-]?(?:key)?[_-]?(?:id)?\s*[=:]\s*['"][^'"]+['"]/i, name: 'AWS credential' },
      { pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@/i, name: 'MongoDB connection string' },
      { pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@/i, name: 'PostgreSQL connection string' }
    ];

    lines.forEach((line, index) => {
      // Pomiń komentarze i przykłady
      if (line.trim().startsWith('//') || 
          line.includes('example') || 
          line.includes('placeholder') ||
          line.includes('process.env')) {
        return;
      }

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(line)) {
          issues.push({
            message: `Possible hardcoded ${name} detected`,
            line: index + 1
          });
        }
      }
    });

    return issues;
  }

  /**
   * Sprawdza podatność na SQL injection
   */
  private checkSqlInjection(
    lines: string[]
  ): Array<{ message: string; line?: number }> {
    const issues: Array<{ message: string; line?: number }> = [];

    lines.forEach((line, index) => {
      // Szukaj konkatenacji stringów w zapytaniach SQL
      const sqlConcatPatterns = [
        /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*\+\s*(?:req|request|params|query|body)\./i,
        /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*\$\{.*(?:req|request|params|query|body)\./i,
        /query\s*\(\s*['"`].*\+/i
      ];

      for (const pattern of sqlConcatPatterns) {
        if (pattern.test(line)) {
          issues.push({
            message: 'Possible SQL injection vulnerability. Use parameterized queries.',
            line: index + 1
          });
        }
      }
    });

    return issues;
  }

  /**
   * Sprawdza podatność na XSS
   */
  private checkXss(
    lines: string[]
  ): Array<{ message: string; line?: number }> {
    const issues: Array<{ message: string; line?: number }> = [];

    lines.forEach((line, index) => {
      // Szukaj dangerouslySetInnerHTML lub bezpośredniego innerHTML
      if (/dangerouslySetInnerHTML/.test(line)) {
        issues.push({
          message: 'dangerouslySetInnerHTML can lead to XSS. Ensure content is sanitized.',
          line: index + 1
        });
      }

      if (/\.innerHTML\s*=/.test(line)) {
        issues.push({
          message: 'Direct innerHTML assignment can lead to XSS. Use textContent or sanitize.',
          line: index + 1
        });
      }

      // eval() i podobne
      if (/\beval\s*\(/.test(line)) {
        issues.push({
          message: 'eval() is dangerous and can lead to code injection.',
          line: index + 1
        });
      }
    });

    return issues;
  }

  /**
   * Sprawdza czy jest walidacja inputów
   */
  private checkInputValidation(
    file: GeneratedFile
  ): Array<{ message: string; line?: number }> {
    const issues: Array<{ message: string; line?: number }> = [];

    // Sprawdź pliki routes
    if (file.path.includes('route') || file.path.includes('controller')) {
      const hasValidation = 
        /validate/.test(file.content) ||
        /\.body\s*\(/.test(file.content) ||
        /zod|yup|joi/i.test(file.content) ||
        /if\s*\(\s*!.*req\.body/.test(file.content);

      if (!hasValidation) {
        issues.push({
          message: 'Route handler may lack input validation. Consider validating request data.'
        });
      }
    }

    return issues;
  }

  /**
   * Sprawdza użycie HTTP zamiast HTTPS
   */
  private checkHttpsOnly(
    lines: string[]
  ): Array<{ message: string; line?: number }> {
    const issues: Array<{ message: string; line?: number }> = [];

    lines.forEach((line, index) => {
      // Szukaj http:// (z wyjątkiem localhost)
      if (/http:\/\/(?!localhost|127\.0\.0\.1)/.test(line)) {
        issues.push({
          message: 'HTTP URL detected. Use HTTPS for secure communication.',
          line: index + 1
        });
      }
    });

    return issues;
  }

  /**
   * Wbudowane sprawdzenia bezpieczeństwa
   */
  private runBuiltInChecks(file: GeneratedFile): StageResult['errors'] {
    const errors: StageResult['errors'] = [];
    const lines = file.content.split('\n');

    // Sprawdź eval
    lines.forEach((line, index) => {
      if (/\beval\s*\(/.test(line) && !line.trim().startsWith('//')) {
        errors.push({
          message: '[SECURITY] eval() usage detected - potential code injection risk',
          file: file.path,
          line: index + 1,
          code: 'EVAL_USAGE'
        });
      }

      // Function constructor
      if (/new\s+Function\s*\(/.test(line)) {
        errors.push({
          message: '[SECURITY] new Function() usage detected - potential code injection risk',
          file: file.path,
          line: index + 1,
          code: 'FUNCTION_CONSTRUCTOR'
        });
      }
    });

    return errors;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createSecurityScanner(): SecurityScanner {
  return new SecurityScanner();
}
